import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=groq_api_key)


def detect_gaps(synthesis_results_path):

    gap_system_prompt = """
You are a research gap detection agent.

You are given synthesized research outputs across multiple tasks in JSON format.

Your job:

- Analyze all task syntheses together.
- Identify recurring weaknesses.
- Detect missing dimensions across the overall research.
- Evaluate coverage breadth and depth.
- Suggest new high-value research tasks.

STRICT RULES:
- Output MUST be valid JSON.
- Use double quotes for all property names.
- No trailing commas.
- No comments.
- No explanation outside the <answer> block.
- If uncertain, return empty arrays instead of guessing.

Return ONLY this structure inside <answer> tags:

<answer>
{
  "global_gaps": [],
  "cross_task_weaknesses": [],
  "coverage_assessment": {
    "breadth": "",
    "depth": "",
    "balance": ""
  },
  "suggested_new_tasks": [
    {
      "description": "",
      "priority": 5,
      "type": "research"
    }
  ]
}
</answer>
"""

    with open(synthesis_results_path, "r") as f:
        synthesized_data = json.load(f)

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": gap_system_prompt},
            {"role": "user", "content": json.dumps(synthesized_data, indent=2)}
        ],
        stream=False
    )

    reply = completion.choices[0].message.content

    start = reply.find("<answer>") + len("<answer>")
    end = reply.find("</answer>")
    json_text = reply[start:end].strip()

    try:
        gap_results = json.loads(json_text)
    except json.JSONDecodeError:
        gap_results = {"error": "parse_failed", "raw": json_text}

    output_folder = os.path.dirname(synthesis_results_path)
    output_path = os.path.join(output_folder, "gap_results.json")

    with open(output_path, "w") as f:
        json.dump(gap_results, f, indent=4)

    return output_path