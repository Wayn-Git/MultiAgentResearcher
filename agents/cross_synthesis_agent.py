"""
cross_synthesis_agent.py — Cross-Task Synthesis (v2)

Fixes over v1:
  - Strips all non-essential fields before sending to LLM (hard token cap)
  - Limits per-task content to summary + top 2 supported points + confidence
  - Adds explicit token budget guard
"""

import os
import json
from groq import Groq
from dotenv import load_dotenv

from utils.llm_utils import call_with_retry, estimate_tokens, trim_to_token_budget
from utils.config import CROSS_SYNTHESIS_MODEL

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MAX_CROSS_INPUT_TOKENS = 5000   # cap on the combined task summaries sent to the LLM

CROSS_SYNTHESIS_PROMPT = """You are a senior research director performing a CROSS-TASK SYNTHESIS.

You have synthesised findings from multiple research tasks on the same topic.
Your job is NOT to re-summarise each task — do that work ONCE then look ACROSS tasks.

Answer these analytically:
1. What patterns or conclusions are ONLY visible across tasks together?
2. Where do tasks CONTRADICT each other — what does the tension reveal?
3. What CAUSAL CHAINS emerge across tasks?
4. What is the SINGLE MOST IMPORTANT insight from the full evidence?
5. What should a reader believe or do DIFFERENTLY after reading all this?

STANDARDS:
- Each cross-task insight must name at least 2 specific tasks/findings.
- Contradictions must explain WHY they exist and which is more credible.
- The central_argument must be 2-3 tight sentences — the core truth of all the research.
- Be willing to say what the research FAILS to establish.

CRITICAL: Return ONLY valid JSON inside <answer> tags. No trailing commas.

<answer>
{
  "central_argument": "2-3 sentence thesis: the core truth the full body of evidence establishes",
  "emergent_insights": [
    {
      "insight": "Insight visible only by combining multiple task findings",
      "draws_from": ["task description 1", "task description 2"],
      "mechanism": "Why/how these findings combine to produce this insight",
      "implication": "What a reader should think or do differently"
    }
  ],
  "cross_task_contradictions": [
    {
      "finding_a": "What task X found",
      "finding_b": "What task Y found (contradicting A)",
      "why_contradiction_exists": "Possible explanations",
      "resolution": "Which is more credible and why, or genuinely unresolved"
    }
  ],
  "causal_chains": [
    {
      "chain": "Finding A → causes → Finding B → leads to → Finding C",
      "tasks_involved": ["task 1", "task 2"],
      "confidence": "high | medium | low"
    }
  ],
  "strongest_consensus": [
    "Claim multiple tasks independently support — stated confidently with multi-task evidence"
  ],
  "most_uncertain_areas": [
    "Where tasks collectively fail to give a clear picture — and why"
  ],
  "key_themes": [
    {
      "theme": "Overarching theme name",
      "explanation": "How this theme manifests across tasks with specific examples",
      "tasks_exhibiting_theme": ["task 1", "task 2"]
    }
  ],
  "overall_confidence": "high | medium | low",
  "confidence_rationale": "Why the overall body of evidence does or doesn't support strong conclusions"
}
</answer>"""


def _slim_synthesis(task_desc: str, synthesis: dict) -> dict:
    """Return only the fields needed for cross-task reasoning — drops raw data."""
    return {
        "task": task_desc,
        "summary": synthesis.get("synthesized_summary", ""),
        "top_points": synthesis.get("strongly_supported_points", [])[:2],
        "conflicts": synthesis.get("conflicting_or_debated_points", [])[:1],
        "confidence": synthesis.get("confidence_level", "unknown"),
    }


def run_cross_synthesis(synthesis_results_path: str) -> str:
    with open(synthesis_results_path, "r", encoding="utf-8") as f:
        synthesis_data = json.load(f)

    slimmed = []
    for task_desc, synthesis in synthesis_data.items():
        if "error" in synthesis or not synthesis:
            continue
        slimmed.append(_slim_synthesis(task_desc, synthesis))

    if len(slimmed) < 2:
        print("[cross_synthesis] Not enough tasks to synthesize across. Skipping.")
        return synthesis_results_path

    print(f"[cross_synthesis] Running cross-synthesis over {len(slimmed)} tasks...")

    user_content = (
        f"Number of tasks: {len(slimmed)}\n\n"
        f"Task summaries:\n{json.dumps(slimmed, indent=2)}"
    )

    # Enforce token cap
    if estimate_tokens(user_content) > MAX_CROSS_INPUT_TOKENS:
        user_content = trim_to_token_budget(user_content, MAX_CROSS_INPUT_TOKENS)
        print(f"[cross_synthesis] Input trimmed to ~{MAX_CROSS_INPUT_TOKENS} tokens")

    try:
        completion = call_with_retry(
            client=client,
            model=CROSS_SYNTHESIS_MODEL,
            messages=[
                {"role": "system", "content": CROSS_SYNTHESIS_PROMPT},
                {"role": "user",   "content": user_content},
            ],
            temperature=0.45,
            max_tokens=2500,
        )
        reply = completion.choices[0].message.content
    except Exception as e:
        print(f"[cross_synthesis] LLM error: {e}")
        cross_synthesis = {"error": str(e)}
        reply = ""

    if reply:
        start = reply.find("<answer>") + len("<answer>")
        end   = reply.find("</answer>")
        if start < len("<answer>") or end == -1:
            cross_synthesis = {"error": "parse_failed", "raw": reply[:500]}
        else:
            try:
                cross_synthesis = json.loads(reply[start:end].strip())
            except json.JSONDecodeError as e:
                cross_synthesis = {"error": "json_failed", "detail": str(e)}

    output_dir  = os.path.dirname(synthesis_results_path)
    output_path = os.path.join(output_dir, "cross_synthesis.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cross_synthesis, f, indent=4)

    print(f"[cross_synthesis] Saved to: {output_path}")
    return output_path