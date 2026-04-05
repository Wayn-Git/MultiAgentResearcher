import os
import json
from groq import Groq
from dotenv import load_dotenv
from utils.llm_utils import call_with_retry

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

GAP_MODEL = "llama-3.3-70b-versatile"


def detect_gaps(synthesis_results_path):
    system_prompt = """You are a critical research evaluation expert.

You are given synthesized research outputs from multiple tasks covering a single research topic.

Your mission: Conduct a deep, honest assessment of the research coverage and identify what is MISSING, WEAK, or UNDERDEVELOPED.

EVALUATION CRITERIA:

1. GLOBAL GAPS — What major dimensions of the topic are completely missing?
   e.g. No economic analysis, no geographic diversity, no expert dissent

2. CROSS-TASK WEAKNESSES — Where do multiple tasks suffer from the same limitation?
   e.g. Over-reliance on US-centric sources, no primary research cited

3. COVERAGE QUALITY — Assess breadth (how many angles are covered), depth (how well each is covered), and balance (is coverage proportionate to importance?)

4. LOW-CONFIDENCE AREAS — Which synthesis results have low confidence or weak evidence?

5. CONTRADICTIONS UNRESOLVED — Are there conflicting findings that were not reconciled?

6. SUGGESTED RESEARCH TASKS — Propose 2-4 concrete, specific follow-up tasks that would meaningfully address the biggest gaps. Be as specific as possible — name the exact question to investigate.

IMPORTANT:
- Be direct and critical. Don't say "the research is comprehensive" — find real gaps.
- Each global_gap must explain WHY it matters, not just what it is.
- suggested_new_tasks must be genuinely useful, not filler.
- importance_score for gaps: 1-10 (10 = critical to understanding the topic)

CRITICAL: Output ONLY valid JSON inside <answer> tags. No trailing commas, no text outside.

<answer>
{
  "global_gaps": [
    {
      "gap": "Description of the missing coverage",
      "why_it_matters": "Why this gap limits the research quality",
      "importance_score": 8
    }
  ],
  "cross_task_weaknesses": [
    "Recurring weakness across multiple tasks"
  ],
  "low_confidence_areas": [
    "Task or area where evidence was weak or contradictory"
  ],
  "unresolved_contradictions": [
    "Where conflicting findings exist that need reconciliation"
  ],
  "coverage_assessment": {
    "breadth": "Assessment of how many angles are covered (be specific)",
    "depth": "Assessment of analytical depth per topic (be specific)",
    "balance": "Assessment of proportionate coverage (be specific)",
    "overall_quality_score": 7
  },
  "suggested_new_tasks": [
    {
      "description": "Specific, focused research question to address a key gap",
      "addresses_gap": "Which global gap or weakness this resolves",
      "priority": 8,
      "type": "research"
    }
  ]
}
</answer>"""

    with open(synthesis_results_path, "r", encoding="utf-8") as f:
        synthesized_data = json.load(f)

    completion = call_with_retry(
        client=client,
        model=GAP_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": json.dumps(synthesized_data, indent=2)}
        ],
        temperature=0.4,
        max_tokens=2048,
    )

    reply = completion.choices[0].message.content

    start = reply.find("<answer>") + len("<answer>")
    end   = reply.find("</answer>")
    json_text = reply[start:end].strip()

    try:
        gap_results = json.loads(json_text)
    except json.JSONDecodeError:
        gap_results = {"error": "parse_failed", "raw": json_text}

    output_path = os.path.join(os.path.dirname(synthesis_results_path), "gap_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(gap_results, f, indent=4)

    print("Gap analysis saved to:", output_path)
    return output_path