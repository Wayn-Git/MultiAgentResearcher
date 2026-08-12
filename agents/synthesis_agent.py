"""
synthesis_agent.py — Evidence-Based Synthesis (v3)

Fixes over v2:
  - Compresses source JSON before sending (removes low-relevance sources,
    trims key_points to top 3, enforces hard token budget on user content)
  - Adds inter-task delay to avoid TPM spikes on the 70B model
  - Falls back gracefully if input is still too large after trimming
"""

import os
import json
import time
from groq import Groq
from dotenv import load_dotenv

from utils.llm_utils import call_with_retry, estimate_tokens, trim_to_token_budget
from utils.config import SYNTHESIS_MODEL

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MAX_SYNTHESIS_INPUT_TOKENS = 4500   # user content limit before trimming kicks in
MAX_SOURCES_PER_TASK       = 3      # keep only the top-scoring sources
INTER_TASK_DELAY           = 4.0   # seconds between 70B calls

SYNTHESIS_SYSTEM_PROMPT = """You are a senior research analyst specialising in evidence-based synthesis.

You will receive web sources for a single research task. Produce a DEEP analytical synthesis — not a summary of individual sources and not a bullet list.

GOOD SYNTHESIS:
- Builds an argument, explains mechanisms (HOW and WHY, not just WHAT)
- Integrates sources into a coherent picture, noting agreement and conflict
- Names specific studies, institutions, dates, statistics — not vague generalities
- Honest about what the evidence does NOT show

BAD SYNTHESIS (avoid):
- "X is important." / "Many studies show..." / "Experts agree..."
- Lists of noun phrases with no connecting analysis

SYNTHESIS PROCESS (follow mentally before writing):
1. What is the SINGLE most important thing these sources collectively establish?
2. What is the MECHANISM behind the main finding?
3. Where do sources DISAGREE — and what does that reveal?
4. What QUANTITATIVE evidence exists?
5. What do sources FAIL to address?

OUTPUT STANDARDS:
- synthesized_summary: 5-6 sentences — main finding + mechanism + specific evidence + counterpoint + implication
- strongly_supported_points: finding + named evidence + implication in one sentence
- key_statistics_and_data: precise values with context
- confidence_rationale: honest and specific

CRITICAL: Return ONLY valid JSON inside <answer> tags.

<answer>
{
  "task": "the task description verbatim",
  "synthesized_summary": "5-6 sentence analytical synthesis",
  "core_concepts": ["Specific concept: one-sentence role explanation"],
  "strongly_supported_points": ["Finding — supported by [evidence] — meaning [implication]"],
  "conflicting_or_debated_points": ["Source A argues X while B argues Y — tension exists because [reason]"],
  "key_statistics_and_data": ["Specific value: what it measures and what it means"],
  "causal_mechanisms": ["X causes Y because [mechanism] — evidenced by [source]"],
  "weak_or_missing_areas": ["Specific gap — why it matters"],
  "confidence_level": "high | medium | low",
  "confidence_rationale": "Source quality, agreement level, recency, bias concerns"
}
</answer>"""


def _compress_sources(sources: list) -> list:
    """
    Keep only the top MAX_SOURCES_PER_TASK sources by relevance_score
    and trim key_points to 3 per source to cut token usage.
    """
    if not sources:
        return []

    sorted_sources = sorted(sources, key=lambda s: s.get("relevance_score", 0), reverse=True)
    top = sorted_sources[:MAX_SOURCES_PER_TASK]

    compressed = []
    for s in top:
        compressed.append({
            "source":  s.get("source", ""),
            "title":   s.get("title", ""),
            "summary": s.get("summary", ""),
            "key_points": s.get("key_points", [])[:3],
            "relevance_score": s.get("relevance_score", 0),
        })
    return compressed


def synthesize(retrieval_results_path: str) -> str:
    with open(retrieval_results_path, "r", encoding="utf-8") as f:
        retrieval_data = json.load(f)

    synthesized_results = {}
    task_items = list(retrieval_data.items())

    for i, (task_description, task_sources) in enumerate(task_items):
        print(f"\n[synthesis] Task {i+1}/{len(task_items)}: {task_description[:70]}...")

        if not task_sources:
            synthesized_results[task_description] = {
                "task": task_description,
                "synthesized_summary": "No sources were retrieved for this task.",
                "core_concepts": [],
                "strongly_supported_points": [],
                "conflicting_or_debated_points": [],
                "key_statistics_and_data": [],
                "causal_mechanisms": [],
                "weak_or_missing_areas": ["No sources available — task may need different search terms."],
                "confidence_level": "low",
                "confidence_rationale": "No retrieval results.",
            }
            continue

        # Compress sources before sending
        compressed = _compress_sources(task_sources)

        user_content = (
            f"Task: {task_description}\n\n"
            f"Sources ({len(compressed)}):\n{json.dumps(compressed, indent=2)}"
        )

        # Enforce token budget
        if estimate_tokens(user_content) > MAX_SYNTHESIS_INPUT_TOKENS:
            user_content = trim_to_token_budget(user_content, MAX_SYNTHESIS_INPUT_TOKENS)
            print(f"  [synthesis] Input trimmed to ~{MAX_SYNTHESIS_INPUT_TOKENS} tokens")

        try:
            completion = call_with_retry(
                client=client,
                model=SYNTHESIS_MODEL,
                messages=[
                    {"role": "system", "content": SYNTHESIS_SYSTEM_PROMPT},
                    {"role": "user",   "content": user_content},
                ],
                temperature=0.4,
                max_tokens=2000,
            )
            reply = completion.choices[0].message.content
        except Exception as e:
            print(f"  [synthesis] LLM error: {e}")
            synthesized_results[task_description] = {"error": str(e), "task": task_description}
            time.sleep(INTER_TASK_DELAY)
            continue

        start = reply.find("<answer>") + len("<answer>")
        end   = reply.find("</answer>")
        json_text = reply[start:end].strip()

        try:
            result = json.loads(json_text)
        except json.JSONDecodeError:
            result = {"error": "parse_failed", "raw": json_text[:500], "task": task_description}

        synthesized_results[task_description] = result
        print(f"  → Done. Confidence: {result.get('confidence_level', '?')}")

        # Throttle between tasks (70B model)
        if i < len(task_items) - 1:
            print(f"  [synthesis] Pausing {INTER_TASK_DELAY}s...")
            time.sleep(INTER_TASK_DELAY)

    output_path = os.path.join(os.path.dirname(retrieval_results_path), "synthesis_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(synthesized_results, f, indent=4)

    print(f"\n[synthesis] Saved to: {output_path}")
    return output_path