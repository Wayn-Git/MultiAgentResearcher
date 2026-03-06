"""
synthesis_agent.py — Evidence-Based Synthesis (v2)

Improved over v1 with:
  - Mechanism-level prompting (not just "what" but "how" and "why")
  - Chain-of-density approach: builds up from facts to implications
  - Stronger instructions against vague list-making
  - Better structured output that the critic agent can work with

The critic_agent.py then takes this output and runs a refinement pass.
"""

import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYNTHESIS_MODEL = "llama-3.3-70b-versatile"

SYNTHESIS_SYSTEM_PROMPT = """You are a senior research analyst specialising in evidence-based synthesis.

You will receive multiple web sources for a single research task. Your job is to produce a DEEP analytical synthesis — NOT a summary of individual sources, and NOT a bullet-point list of facts.

WHAT GOOD SYNTHESIS LOOKS LIKE:
- It builds an ARGUMENT, not a list.
- It explains MECHANISMS — not just that X happens, but HOW and WHY X happens.
- It integrates multiple sources into a coherent picture, noting where they agree and where they conflict.
- It names specific studies, institutions, figures, dates, and statistics — not vague generalities.
- It is honest about what the evidence does NOT show.
- A domain expert reading it would find it substantive, not shallow.

WHAT BAD SYNTHESIS LOOKS LIKE (avoid all of this):
- "X is an important factor in Y." (So what? Why? How much? Prove it.)
- "Many studies show..." (Which studies? What did they find?)
- "Experts agree that..." (Which experts? What specifically?)
- "There are challenges in X." (What challenges? What causes them? What are the consequences?)
- Lists of noun phrases with no analysis connecting them.

SYNTHESIS PROCESS — follow these steps mentally before writing:
1. What is the SINGLE most important thing these sources collectively establish?
2. What is the MECHANISM behind the main finding — the causal chain, the process, the reason?
3. Where do sources DISAGREE — and what does that tension reveal about the topic?
4. What QUANTITATIVE evidence exists (numbers, rates, timelines, magnitudes)?
5. What EDGE CASES or EXCEPTIONS are documented?
6. What do these sources collectively FAIL to address or explain?

OUTPUT STANDARDS:
- synthesized_summary: MINIMUM 5-6 sentences. Must include: the main finding + the mechanism + specific evidence + at least one counterpoint or limitation + the implication.
- strongly_supported_points: Each point must be ONE COMPLETE SENTENCE containing: the finding + the evidence (named source, statistic, or study) + the implication. No vague noun phrases.
- key_statistics_and_data: Be precise. "~40%" is better than "a large proportion". Named studies beat unnamed ones.
- confidence_rationale: Be honest and specific — what makes you confident or uncertain?

CRITICAL: Return ONLY valid JSON inside <answer> tags. No trailing commas. No text outside.

<answer>
{
  "task": "the task description verbatim",
  "synthesized_summary": "5-6 sentence analytical synthesis: main finding + mechanism + specific evidence + counterpoint + implication",
  "core_concepts": [
    "Specific concept with a one-sentence explanation of its role"
  ],
  "strongly_supported_points": [
    "Complete sentence: [Finding] — supported by [named evidence] — meaning [implication]"
  ],
  "conflicting_or_debated_points": [
    "Source A argues X while Source B argues Y — this tension likely exists because [reason] — resolution: [which is more credible and why]"
  ],
  "key_statistics_and_data": [
    "Specific number/percentage/date: what it measures, its value, and what it means for the topic"
  ],
  "causal_mechanisms": [
    "X causes Y because [mechanism] — evidenced by [source/study/data]"
  ],
  "weak_or_missing_areas": [
    "Specific gap in what these sources cover — why this gap matters"
  ],
  "confidence_level": "high | medium | low",
  "confidence_rationale": "Source quality, agreement level, recency, and any bias concerns"
}
</answer>"""


def synthesize(retrieval_results_path: str) -> str:
    """
    Synthesize retrieval results per task.
    Writes synthesis_results.json and returns its path.
    """
    with open(retrieval_results_path, "r", encoding="utf-8") as f:
        retrieval_data = json.load(f)

    synthesized_results = {}

    for task_description, task_sources in retrieval_data.items():
        print(f"\n[synthesis] Processing: {task_description[:80]}...")

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
                "confidence_rationale": "No retrieval results."
            }
            continue

        user_content = (
            f"Task: {task_description}\n\n"
            f"Number of sources: {len(task_sources)}\n\n"
            f"Sources:\n{json.dumps(task_sources, indent=2)}"
        )

        completion = client.chat.completions.create(
            model=SYNTHESIS_MODEL,
            messages=[
                {"role": "system", "content": SYNTHESIS_SYSTEM_PROMPT},
                {"role": "user",   "content": user_content}
            ],
            temperature=0.4,
            max_tokens=2500,
            stream=False
        )

        reply = completion.choices[0].message.content
        start = reply.find("<answer>") + len("<answer>")
        end   = reply.find("</answer>")
        json_text = reply[start:end].strip()

        try:
            result = json.loads(json_text)
        except json.JSONDecodeError:
            result = {"error": "parse_failed", "raw": json_text, "task": task_description}

        synthesized_results[task_description] = result
        print(f"  → Done. Confidence: {result.get('confidence_level', '?')}")

    output_path = os.path.join(os.path.dirname(retrieval_results_path), "synthesis_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(synthesized_results, f, indent=4)

    print(f"\n[synthesis] Synthesis saved to: {output_path}")
    return output_path