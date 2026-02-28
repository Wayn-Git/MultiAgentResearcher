import os
import json
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=groq_api_key)


def generate_report(synthesis_results_path, gap_results_path):

    report_system_prompt = """
You are a research report generation agent.

You are given:
1. Synthesized research outputs.
2. Gap analysis results.

Your job:

- Produce a structured research report.
- Organize findings by task.
- Integrate identified gaps.
- Provide clear recommendations.
- Do NOT invent new information.
- Stay grounded strictly in provided data.

STRICT RULES:
- Output MUST be valid JSON.
- Use double quotes for all property names.
- No trailing commas.
- No explanation outside <answer> block.

Return ONLY this structure inside <answer> tags:

<answer>
{
  "executive_summary": "",
  "research_sections": [
    {
      "task": "",
      "summary": "",
      "key_findings": []
    }
  ],
  "overall_assessment": {
    "strengths": [],
    "limitations": []
  },
  "identified_gaps": [],
  "recommended_next_steps": []
}
</answer>
"""

    with open(synthesis_results_path, "r") as f:
        synthesized_data = json.load(f)

    with open(gap_results_path, "r") as f:
        gap_data = json.load(f)

    combined_input = {
        "synthesized_results": synthesized_data,
        "gap_analysis": gap_data
    }

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": report_system_prompt},
            {"role": "user", "content": json.dumps(combined_input, indent=2)}
        ],
        stream=False
    )

    reply = completion.choices[0].message.content

    match = re.search(r"<answer>(.*?)</answer>", reply, re.DOTALL)

    if not match:
        raise ValueError("No structured report returned")

    json_text = match.group(1).strip()

    try:
        report_results = json.loads(json_text)
    except json.JSONDecodeError:
        report_results = {"error": "parse_failed", "raw": json_text}

    output_folder = os.path.dirname(synthesis_results_path)
    output_path = os.path.join(output_folder, "final_report.json")

    with open(output_path, "w") as f:
        json.dump(report_results, f, indent=4)

    return output_path