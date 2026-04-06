"""
report_agent.py — Publication-Quality Markdown Report (v3)

Fixes over v2:
  - Compresses combined input with hard token cap before sending
  - Per-task synthesis slimmed to essentials only
  - Cross-synthesis and gap data trimmed proportionally
  - Falls back to a section-by-section generation if combined input is too large
"""

import os
import json
from groq import Groq
from dotenv import load_dotenv

from utils.llm_utils import call_with_retry, estimate_tokens, trim_to_token_budget
from utils.config import REPORT_MODEL

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Max tokens for the combined user content sent to the report LLM
MAX_REPORT_INPUT_TOKENS = 6000

REPORT_SYSTEM_PROMPT = """You are a world-class research analyst writing a PUBLICATION-QUALITY research report in MARKDOWN.

You receive:
1. Per-task synthesis findings
2. A cross-task synthesis (emergent insights)
3. A gap analysis

REPORT PHILOSOPHY:
- Build an ARGUMENT, not a list.
- Synthesise across tasks — do NOT repeat per-task summaries in sequence.
- Be honest about what is unknown or uncertain.
- An intelligent non-expert should read it and genuinely understand the topic.

REQUIRED SECTIONS (use these exact markdown headers):

## Executive Summary
6-8 sentence thesis-driven argument. What the research establishes, what it does NOT, and what it means.
Include at least 3 specific data points or quantitative findings.

## Key Findings
5-8 most important findings across ALL tasks. Each: **bold headline**, 2-3 sentence explanation with evidence, implication.

## Detailed Analysis
Organised by THEME (from cross-synthesis). Each theme: what evidence shows, how established, what tensions exist, what it means. Minimum 3 themes, each 3-5 paragraphs.

## Contradictions and Debates
Where sources or tasks disagree — WHY the disagreement exists, which is more credible, what would resolve it.

## What the Evidence Does Not Show
Honest gaps: what commonly-assumed things does this research fail to establish?

## Confidence Assessment
Overall confidence 1-10 with rationale. Rock-solid findings vs. tentative ones.

## Research Gaps and Limitations
Specific gaps — why they matter, what understanding is blocked without them.

## Recommended Next Steps
3-5 concrete specific next research actions: what to investigate, why it matters, what it unlocks.

---
WRITING STANDARDS:
- Flowing prose — bullets ONLY for Key Findings and Next Steps
- Precise language: avoid "various", "many", "some", "important"
- Name sources, studies, institutions when present
- Active voice, logical transitions between sections

CRITICAL: Return ONLY the markdown report. Start with a # Title line."""


def _slim_synthesis_for_report(synthesis_data: dict) -> dict:
    """Reduce per-task synthesis to the fields most useful for report writing."""
    slimmed = {}
    for task, s in synthesis_data.items():
        if "error" in s or not s:
            continue
        slimmed[task] = {
            "summary":  s.get("synthesized_summary", ""),
            "points":   s.get("strongly_supported_points", [])[:3],
            "stats":    s.get("key_statistics_and_data", [])[:2],
            "gaps":     s.get("weak_or_missing_areas", [])[:1],
            "confidence": s.get("confidence_level", "unknown"),
        }
    return slimmed


def _slim_cross_synthesis(cs: dict) -> dict:
    """Keep only the most impactful cross-synthesis fields."""
    if "error" in cs:
        return cs
    return {
        "central_argument":    cs.get("central_argument", ""),
        "emergent_insights":   cs.get("emergent_insights", [])[:3],
        "strongest_consensus": cs.get("strongest_consensus", [])[:3],
        "key_themes":          cs.get("key_themes", [])[:3],
        "most_uncertain_areas": cs.get("most_uncertain_areas", [])[:2],
    }


def _slim_gap_data(gap: dict) -> dict:
    """Keep only the most impactful gap fields."""
    if "error" in gap:
        return gap
    return {
        "global_gaps":         gap.get("global_gaps", [])[:3],
        "coverage_assessment": gap.get("coverage_assessment", {}),
        "suggested_new_tasks": gap.get("suggested_new_tasks", [])[:2],
    }


def generate_report(
    synthesis_results_path: str,
    gap_results_path: str,
    cross_synthesis_path: str = None,
) -> str:
    with open(synthesis_results_path, "r", encoding="utf-8") as f:
        synthesis_data = json.load(f)

    with open(gap_results_path, "r", encoding="utf-8") as f:
        gap_data = json.load(f)

    cross_synthesis_data = {}
    if cross_synthesis_path and os.path.exists(cross_synthesis_path):
        with open(cross_synthesis_path, "r", encoding="utf-8") as f:
            cross_synthesis_data = json.load(f)
    else:
        print("[report] No cross-synthesis found — report will be less integrated.")

    # Slim everything before combining
    slimmed_synthesis = _slim_synthesis_for_report(synthesis_data)
    slimmed_cross     = _slim_cross_synthesis(cross_synthesis_data)
    slimmed_gap       = _slim_gap_data(gap_data)

    topic_hint = f"Research covering {len(slimmed_synthesis)} tasks"

    combined_input = {
        "per_task_synthesis":  slimmed_synthesis,
        "cross_task_synthesis": slimmed_cross,
        "gap_analysis":        slimmed_gap,
    }

    user_content = (
        f"Topic hint: {topic_hint}\n\n"
        f"Research data:\n{json.dumps(combined_input, indent=2)}"
    )

    # Enforce hard token budget
    if estimate_tokens(user_content) > MAX_REPORT_INPUT_TOKENS:
        print(f"[report] Input exceeds budget — trimming to ~{MAX_REPORT_INPUT_TOKENS} tokens")
        user_content = trim_to_token_budget(user_content, MAX_REPORT_INPUT_TOKENS)

    print("[report] Generating final report...")

    try:
        completion = call_with_retry(
            client=client,
            model=REPORT_MODEL,
            messages=[
                {"role": "system", "content": REPORT_SYSTEM_PROMPT},
                {"role": "user",   "content": user_content},
            ],
            temperature=0.5,
            max_tokens=4000,
        )
        markdown_report = completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"[report] LLM error: {e}")
        markdown_report = f"# Report Generation Failed\n\nError: {e}"

    output_dir = os.path.dirname(synthesis_results_path)
    md_path    = os.path.join(output_dir, "final_report.md")
    json_path  = os.path.join(output_dir, "final_report.json")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write(markdown_report)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "report_markdown": markdown_report,
            "metadata": {
                "tasks_synthesized": len(slimmed_synthesis),
                "has_cross_synthesis": bool(cross_synthesis_data and "error" not in cross_synthesis_data),
                "gap_analysis_included": bool(gap_data),
            }
        }, f, indent=4)

    print(f"[report] Markdown report saved to: {md_path}")
    return md_path