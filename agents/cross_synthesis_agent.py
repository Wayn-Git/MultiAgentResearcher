"""
cross_synthesis_agent.py — Cross-Task Synthesis (inspired by STORM, Shao et al., 2024)

After individual tasks are synthesized, this agent performs a SECOND-ORDER synthesis:
  - Finds emergent themes that span multiple tasks
  - Surfaces contradictions between tasks
  - Identifies causal chains that only appear when tasks are read together
  - Produces the "so what?" — what the full body of evidence means together

Without this step, the report is just 5 summaries stapled together.
With this step, the report has a coherent argument.

Reference: "Assisting in Writing Wikipedia-like Articles From Scratch with Large Language Models"
           Shao et al. 2024 — https://arxiv.org/abs/2402.14207
"""

import os
import json
from groq import Groq
from dotenv import load_dotenv
from utils.llm_utils import call_with_retry
from utils.config import CROSS_SYNTHESIS_MODEL

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Keep 70B for high-level integration
# CROSS_SYNTHESIS_MODEL = "llama-3.3-70b-versatile" # Legacy

CROSS_SYNTHESIS_PROMPT = """You are a senior research director performing a CROSS-TASK SYNTHESIS.

You have received synthesized findings from multiple research tasks on the same topic. Your job is NOT to summarize each task again — that has already been done.

Your job is to think ACROSS tasks and answer:
1. What patterns, mechanisms, or conclusions ONLY become visible when you look at all tasks together?
2. Where do tasks CONTRADICT each other — and what does that tension reveal?
3. What CAUSAL CHAINS emerge across tasks? (Task A's finding explains Task B's anomaly, etc.)
4. What is the SINGLE MOST IMPORTANT insight from the full body of evidence?
5. What does all this evidence mean for the BIG PICTURE question — what should a reader actually DO or BELIEVE differently after reading this?

ANALYTICAL STANDARDS:
- Do NOT repeat per-task summaries. Reference tasks by their finding, not their name.
- Each cross-task insight must name at least 2 specific tasks/findings it draws from.
- Contradictions must be explained — why do they exist? Which is more credible and why?
- The "central argument" should be a 2-3 sentence thesis that captures the essential truth of all the research.
- "Emergent insights" are insights that NO SINGLE TASK could produce alone.
- Be willing to say what the research FAILS to establish, even if the tasks covered a lot of ground.

CRITICAL: Return ONLY valid JSON inside <answer> tags. No trailing commas.

<answer>
{
  "central_argument": "2-3 sentence thesis: the core truth the full body of evidence establishes",
  "emergent_insights": [
    {
      "insight": "An insight only visible by combining multiple task findings",
      "draws_from": ["task description 1", "task description 2"],
      "mechanism": "Why/how these findings combine to produce this insight",
      "implication": "What a reader should think or do differently because of this"
    }
  ],
  "cross_task_contradictions": [
    {
      "finding_a": "What task X found",
      "finding_b": "What task Y found (contradicting finding A)",
      "why_contradiction_exists": "Possible explanations for the discrepancy",
      "resolution": "Which is more credible and why, or if it remains genuinely unresolved"
    }
  ],
  "causal_chains": [
    {
      "chain": "Finding A → causes/explains → Finding B → which leads to → Finding C",
      "tasks_involved": ["task description 1", "task description 2"],
      "confidence": "high | medium | low"
    }
  ],
  "strongest_consensus": [
    "A claim that multiple tasks independently support — state it as a confident conclusion with evidence from multiple tasks"
  ],
  "most_uncertain_areas": [
    "Where tasks collectively fail to give a clear picture — and why this uncertainty persists"
  ],
  "what_the_evidence_does_not_establish": [
    "Claims that might seem supported but the evidence actually cannot sustain"
  ],
  "key_themes": [
    {
      "theme": "Overarching theme name",
      "explanation": "How this theme manifests across the different tasks with specific examples",
      "tasks_exhibiting_theme": ["task 1", "task 2"]
    }
  ],
  "overall_confidence": "high | medium | low",
  "confidence_rationale": "Why the overall body of evidence does or doesn't support strong conclusions"
}
</answer>"""


def run_cross_synthesis(synthesis_results_path: str) -> str:
    """
    Reads the (optionally refined) synthesis results and produces a cross-task synthesis.
    Returns path to cross_synthesis.json.
    """
    with open(synthesis_results_path, "r", encoding="utf-8") as f:
        synthesis_data = json.load(f)

    # Build a clean, flattened view of all task findings to feed the model
    all_findings = []
    for task_desc, synthesis in synthesis_data.items():
        if "error" in synthesis:
            continue
        all_findings.append({
            "task": task_desc,
            "summary": synthesis.get("synthesized_summary", ""),
            "strongly_supported_points": synthesis.get("strongly_supported_points", []),
            "conflicting_or_debated_points": synthesis.get("conflicting_or_debated_points", []),
            "key_statistics_and_data": synthesis.get("key_statistics_and_data", []),
            "confidence_level": synthesis.get("confidence_level", "unknown"),
        })

    if len(all_findings) < 2:
        print("[cross_synthesis] Not enough tasks to synthesize across. Skipping.")
        return synthesis_results_path

    print(f"[cross_synthesis] Running cross-synthesis over {len(all_findings)} tasks...")

    user_content = (
        f"Number of tasks: {len(all_findings)}\n\n"
        f"All task syntheses:\n{json.dumps(all_findings, indent=2)}"
    )

    completion = call_with_retry(
        client=client,
        model=CROSS_SYNTHESIS_MODEL,
        messages=[
            {"role": "system", "content": CROSS_SYNTHESIS_PROMPT},
            {"role": "user",   "content": user_content}
        ],
        temperature=0.45,
        max_tokens=3000,
    )

    reply = completion.choices[0].message.content
    start = reply.find("<answer>") + len("<answer>")
    end   = reply.find("</answer>")

    if start < len("<answer>") or end == -1:
        print("[cross_synthesis] WARNING: Could not parse output. Raw reply saved.")
        cross_synthesis = {"error": "parse_failed", "raw": reply}
    else:
        json_text = reply[start:end].strip()
        try:
            cross_synthesis = json.loads(json_text)
        except json.JSONDecodeError as e:
            print(f"[cross_synthesis] JSON parse failed: {e}")
            cross_synthesis = {"error": "json_failed", "raw": json_text}

    output_dir  = os.path.dirname(synthesis_results_path)
    output_path = os.path.join(output_dir, "cross_synthesis.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cross_synthesis, f, indent=4)

    print(f"[cross_synthesis] Cross-synthesis saved to: {output_path}")
    return output_path