"""
critic_agent.py — Self-Refine Critic (Madaan et al., 2023)

Implements a critique-then-refine loop over synthesis outputs.
For each task synthesis, the critic identifies:
  - Vague/unsupported claims
  - Missing mechanisms ("why/how" questions)
  - Missing quantification
  - Logical leaps
  - Surface-level vs. insight-level findings

The synthesis agent then gets a second pass with the critique embedded,
producing a materially deeper output.

Reference: "Self-Refine: Iterative Refinement with Self-Feedback"
           Madaan et al. 2023 — https://arxiv.org/abs/2303.17651
"""

import os
import json
from groq import Groq
from dotenv import load_dotenv
from utils.llm_utils import call_with_retry
from utils.config import CRITIC_MODEL, REFINE_MODEL

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Use 8B for critique, 70B for refinement
# CRITIC_MODEL = "llama-3.3-70b-versatile" # Legacy
# REFINE_MODEL = "llama-3.3-70b-versatile" # Legacy


CRITIC_SYSTEM_PROMPT = """You are a rigorous intellectual critic and research quality evaluator.

You will be given a synthesis of web research on a specific task. Your job is to BRUTALLY and HONESTLY assess its quality and identify exactly what is shallow, missing, or vague.

You are NOT trying to be encouraging. You are trying to force a better second draft.

CRITIQUE DIMENSIONS:

1. VAGUE CLAIMS — Find any statement that could be true of almost any topic ("X is important", "Y plays a key role"). These are worthless. Flag them with what specific evidence or mechanism is missing.

2. UNSUPPORTED ASSERTIONS — Claims stated as fact without a named source, study, statistic, or mechanism. Flag each one.

3. MISSING MECHANISMS — The synthesis says X causes Y but doesn't explain HOW or WHY. Flag these.

4. MISSING QUANTIFICATION — Anywhere that numbers, percentages, timescales, or magnitudes would make the finding concrete but aren't present.

5. SURFACE-LEVEL PATTERNS — Where the synthesis just describes what exists rather than explaining what it means, why it matters, or what its implications are.

6. LOGICAL LEAPS — Where the conclusion doesn't follow from the evidence given.

7. MISSING COUNTERARGUMENTS — Strong analytical synthesis always engages with dissenting views, limitations, or edge cases. Flag if absent.

8. WHAT A DOMAIN EXPERT WOULD SAY — What would a senior researcher in this field find embarrassingly shallow or missing in this synthesis?

OUTPUT FORMAT — Be precise and actionable. Each critique item must say:
  - WHAT is wrong
  - WHERE (quote or paraphrase the weak sentence)
  - WHAT SPECIFICALLY would fix it

CRITICAL: Return ONLY valid JSON inside <critique> tags.

<critique>
{
  "overall_quality_score": 5,
  "overall_assessment": "One honest paragraph about the synthesis quality",
  "vague_claims": [
    {
      "claim": "The vague sentence from the synthesis",
      "problem": "Why this is too vague",
      "fix": "What specific information would make it concrete"
    }
  ],
  "unsupported_assertions": [
    {
      "assertion": "The claim made without evidence",
      "fix": "What source, study, or data would support this"
    }
  ],
  "missing_mechanisms": [
    {
      "what_is_stated": "X causes Y",
      "what_is_missing": "The HOW or WHY mechanism is not explained"
    }
  ],
  "missing_quantification": [
    "Where a number, percentage, or magnitude is needed but absent"
  ],
  "missing_counterarguments": [
    "Dissenting view or limitation that should be addressed"
  ],
  "expert_critique": "What a domain expert would find embarrassingly shallow",
  "priority_fixes": [
    "The top 3 most important things to fix in the next draft — be very specific"
  ]
}
</critique>"""


REFINE_SYSTEM_PROMPT = """You are a senior research analyst producing a REVISED, IMPROVED synthesis based on critical feedback.

You will receive:
1. The original synthesis of a research task
2. A structured critique identifying specific weaknesses

Your job: Produce a SIGNIFICANTLY IMPROVED version that directly addresses every critique point.

REVISION REQUIREMENTS:
- Every "vague claim" identified must be replaced with a specific, evidence-backed statement
- Every "missing mechanism" must have an explanation of HOW/WHY added
- Every "missing quantification" must have a number, range, or magnitude added (even approximate)
- Every "missing counterargument" must be acknowledged and addressed
- The synthesized_summary must be AT LEAST 6-8 dense sentences — richer than the original
- strongly_supported_points must each include: the finding + the evidence + the mechanism + the implication
- Do NOT repeat the same vague language as the original draft

QUALITY BAR: If a domain expert read this, they should find it substantive and insightful — not a Wikipedia summary.

CRITICAL: Return ONLY valid JSON inside <answer> tags.

<answer>
{
  "task": "the task description",
  "synthesized_summary": "Minimum 6-8 sentence analytical synthesis — specific, mechanistic, evidence-backed",
  "core_concepts": ["specific concept with brief explanation"],
  "strongly_supported_points": [
    "Finding + evidence source + mechanism explaining why/how + implication for the broader topic"
  ],
  "conflicting_or_debated_points": [
    "Specific tension between sources or perspectives, with explanation of why it exists"
  ],
  "key_statistics_and_data": [
    "Specific quantitative finding: what it measures, the value, and what it means"
  ],
  "weak_or_missing_areas": [
    "Genuine gap in what the sources cover — be honest and specific"
  ],
  "confidence_level": "high | medium | low",
  "confidence_rationale": "Evidence base quality, source agreement level, recency",
  "critique_addressed": "Brief statement of what was improved in this revision vs. the original"
}
</answer>"""


def critique_synthesis(task_description: str, synthesis: dict) -> dict:
    """Run a single critique pass on a synthesis dict."""
    user_content = f"Task: {task_description}\n\nSynthesis to critique:\n{json.dumps(synthesis, indent=2)}"

    completion = call_with_retry(
        client=client,
        model=CRITIC_MODEL,
        messages=[
            {"role": "system", "content": CRITIC_SYSTEM_PROMPT},
            {"role": "user",   "content": user_content}
        ],
        temperature=0.3,
        max_tokens=2048,
    )

    reply = completion.choices[0].message.content
    start = reply.find("<critique>") + len("<critique>")
    end   = reply.find("</critique>")

    if start < len("<critique>") or end == -1:
        return {"error": "critique_parse_failed", "raw": reply}

    json_text = reply[start:end].strip()
    try:
        return json.loads(json_text)
    except json.JSONDecodeError as e:
        return {"error": "critique_json_failed", "raw": json_text, "detail": str(e)}


def refine_synthesis(task_description: str, original_synthesis: dict, critique: dict) -> dict:
    """Produce a refined synthesis given the original + critique."""
    user_content = (
        f"Task: {task_description}\n\n"
        f"Original synthesis:\n{json.dumps(original_synthesis, indent=2)}\n\n"
        f"Critique to address:\n{json.dumps(critique, indent=2)}"
    )

    completion = call_with_retry(
        client=client,
        model=REFINE_MODEL,
        messages=[
            {"role": "system", "content": REFINE_SYSTEM_PROMPT},
            {"role": "user",   "content": user_content}
        ],
        temperature=0.4,
        max_tokens=3000,
    )

    reply = completion.choices[0].message.content
    start = reply.find("<answer>") + len("<answer>")
    end   = reply.find("</answer>")

    if start < len("<answer>") or end == -1:
        return {"error": "refine_parse_failed", "raw": reply}

    json_text = reply[start:end].strip()
    try:
        return json.loads(json_text)
    except json.JSONDecodeError as e:
        return {"error": "refine_json_failed", "raw": json_text, "detail": str(e)}


def run_critic_refinement(synthesis_results_path: str) -> str:
    """
    Main entry point. Reads synthesis_results.json, runs critique + refine
    for each task, writes refined_synthesis_results.json.

    Returns the path to the refined synthesis file.
    """
    with open(synthesis_results_path, "r", encoding="utf-8") as f:
        synthesis_data = json.load(f)

    refined_results = {}
    critique_log    = {}

    for task_description, synthesis in synthesis_data.items():
        print(f"\n[critic] Critiquing: {task_description[:80]}...")

        # Skip tasks that already failed synthesis
        if not synthesis or "error" in synthesis:
            refined_results[task_description] = synthesis
            continue

        # Step 1: Critique
        critique = critique_synthesis(task_description, synthesis)
        critique_log[task_description] = critique

        quality_score = critique.get("overall_quality_score", 5)
        print(f"  → Quality score: {quality_score}/10")

        # Only refine if quality is below threshold (always refine if < 8)
        if isinstance(quality_score, (int, float)) and quality_score >= 9:
            print("  → High quality, keeping original synthesis.")
            refined_results[task_description] = synthesis
        else:
            print("  → Refining synthesis based on critique...")
            refined = refine_synthesis(task_description, synthesis, critique)

            if "error" in refined:
                print(f"  → Refinement failed, keeping original. Error: {refined.get('error')}")
                refined_results[task_description] = synthesis
            else:
                refined_results[task_description] = refined
                print("  → Refinement complete.")

    # Save refined synthesis
    output_dir = os.path.dirname(synthesis_results_path)

    refined_path = os.path.join(output_dir, "refined_synthesis_results.json")
    with open(refined_path, "w", encoding="utf-8") as f:
        json.dump(refined_results, f, indent=4)

    # Save critique log for transparency
    critique_log_path = os.path.join(output_dir, "critique_log.json")
    with open(critique_log_path, "w", encoding="utf-8") as f:
        json.dump(critique_log, f, indent=4)

    print(f"\n[critic] Refined synthesis saved to: {refined_path}")
    print(f"[critic] Critique log saved to: {critique_log_path}")
    return refined_path