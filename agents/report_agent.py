"""
report_agent.py — Publication-Quality Markdown Report (v2)

Major changes from v1:
  - Now reads cross_synthesis.json in addition to synthesis and gap data
  - Outputs a MARKDOWN REPORT (readable) alongside the JSON
  - Prompts push for narrative argumentation, not bullet dumps
  - Executive summary is a proper thesis-driven argument
  - Report structure follows academic briefing format:
      Context → Evidence → Analysis → Implications → Gaps → Next Steps
"""

import os
import json
import re
from groq import Groq
from dotenv import load_dotenv
from utils.llm_utils import call_with_retry
from utils.config import REPORT_MODEL

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Keep 70B for high-quality reports
# REPORT_MODEL = "llama-3.3-70b-versatile" # Legacy

REPORT_SYSTEM_PROMPT = """You are a world-class research analyst writing a PUBLICATION-QUALITY research report.

You will receive:
1. Individual task syntheses (the per-task research findings)
2. A cross-task synthesis (emergent insights from looking at all tasks together)
3. A gap analysis identifying weaknesses

Your job: Write a COMPREHENSIVE, INSIGHTFUL research report in MARKDOWN FORMAT.

REPORT PHILOSOPHY:
- This report should teach a reader something they could not get from skimming the sources.
- It builds an ARGUMENT, not a list of findings.
- It synthesizes across tasks — it does NOT repeat per-task summaries in sequence.
- It is honest about what is unknown, contested, or uncertain.
- An intelligent non-expert should be able to read it and genuinely understand the topic.

REQUIRED SECTIONS (use these exact markdown headers):

## Executive Summary
- 6-8 sentence thesis-driven argument
- State what the research establishes, what it does NOT establish, and what it means
- Include at least 3 specific data points, named entities, or quantitative findings
- End with a sentence on implications or recommended action

## Key Findings
- 5-8 most important findings across ALL tasks
- Each finding: bold headline, 2-3 sentence explanation with evidence, implication
- Order by importance/impact, not by task order

## Detailed Analysis
- Organized by THEME, not by task (themes come from the cross-synthesis)
- Each theme section: what the evidence shows, how it was established, what tensions exist, what it means
- Minimum 3 themes, each 3-5 paragraphs

## Contradictions and Debates
- Where sources or tasks disagree — explain WHY the disagreement exists
- Which position is more credible and why
- What would resolve the disagreement

## What the Evidence Does Not Show
- Be honest: what commonly assumed things does this research fail to establish?
- What would a skeptic legitimately challenge?

## Confidence Assessment
- Overall confidence score (1-10) with clear rationale
- Which findings are rock-solid vs. which are tentative

## Research Gaps and Limitations
- Specific gaps with explanation of why they matter
- What understanding is blocked without this knowledge

## Recommended Next Steps
- 3-5 concrete, specific next research actions
- For each: what to investigate, why it matters, what it would unlock

---

WRITING STANDARDS:
- Write in flowing prose, not bullet lists (use bullets ONLY for Key Findings and Next Steps)
- Use precise language: avoid "various", "many", "some", "important", "significant"
- Name sources, studies, institutions, and experts when they appear in the evidence
- Prefer active voice
- Sections should flow logically — use transitions between them

CRITICAL: Return ONLY the markdown report. No JSON, no wrapper tags. Start with a # Title line."""


def generate_report(synthesis_results_path: str, gap_results_path: str, cross_synthesis_path: str = None) -> str:
    """
    Generates a full research report.
    Writes final_report.md and final_report.json.
    Returns path to the markdown report.
    """
    with open(synthesis_results_path, "r", encoding="utf-8") as f:
        synthesized_data = json.load(f)

    with open(gap_results_path, "r", encoding="utf-8") as f:
        gap_data = json.load(f)

    cross_synthesis_data = {}
    if cross_synthesis_path and os.path.exists(cross_synthesis_path):
        with open(cross_synthesis_path, "r", encoding="utf-8") as f:
            cross_synthesis_data = json.load(f)
    else:
        print("[report] Warning: No cross-synthesis found. Report will be less integrated.")

    combined_input = {
        "per_task_synthesis": synthesized_data,
        "cross_task_synthesis": cross_synthesis_data,
        "gap_analysis": gap_data
    }

    # Determine topic from task keys for the title hint
    task_keys = list(synthesized_data.keys())
    topic_hint = f"Research topic inferred from {len(task_keys)} tasks"

    print("[report] Generating final report...")

    completion = call_with_retry(
        client=client,
        model=REPORT_MODEL,
        messages=[
            {"role": "system", "content": REPORT_SYSTEM_PROMPT},
            {"role": "user",   "content": (
                f"Topic hint: {topic_hint}\n\n"
                f"Research data:\n{json.dumps(combined_input, indent=2)}"
            )}
        ],
        temperature=0.5,
        max_tokens=5000,
    )

    markdown_report = completion.choices[0].message.content.strip()

    # Save as markdown
    output_dir   = os.path.dirname(synthesis_results_path)
    md_path      = os.path.join(output_dir, "final_report.md")
    json_path    = os.path.join(output_dir, "final_report.json")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write(markdown_report)

    # Also save as JSON for backward compatibility with any downstream tooling
    report_as_json = {
        "report_markdown": markdown_report,
        "metadata": {
            "tasks_synthesized": len(synthesized_data),
            "has_cross_synthesis": bool(cross_synthesis_data),
            "gap_analysis_included": bool(gap_data)
        }
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_as_json, f, indent=4)

    print(f"[report] Markdown report saved to: {md_path}")
    print(f"[report] JSON report saved to: {json_path}")
    return md_path