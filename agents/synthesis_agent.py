import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=groq_api_key)


def synthesize(retrieval_results_path):

    synthesis_system_prompt = """ 
You are a research synthesis agent.

You are given:
1. A research task description.
2. Structured retrieval results in JSON format.

Your job is to synthesize the retrieved evidence.

Strict requirements:

- Combine overlapping ideas across sources.
- Identify recurring themes.
- Do NOT summarize each source individually.
- Do NOT invent new information.
- Only use facts present in the retrieval data.
- If evidence is weak or repetitive, state that clearly.
- If retrieval results are empty, mark insufficient evidence.

Return ONLY structured JSON inside <answer> tags.

Output format:

<answer>
{
  "task": "{task_description}",
  "synthesized_summary": "...",
  "core_concepts": ["...", "..."],
  "strongly_supported_points": ["...", "..."],
  "weak_or_missing_areas": ["..."]
}
</answer>

No explanation outside the <answer> block.
Be analytical, concise, and structured.
"""

    with open(retrieval_results_path, "r") as f:
        retrieval_data = json.load(f)

    synthesized_results = {}

    for task_description, task_sources in retrieval_data.items():

        formatted_prompt = synthesis_system_prompt.replace(
            "{task_description}", task_description
        )

        messages = [
            {"role": "system", "content": formatted_prompt},
            {"role": "user", "content": json.dumps(task_sources, indent=2)}
        ]

        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            stream=False
        )

        reply = completion.choices[0].message.content

        start = reply.find("<answer>") + len("<answer>")
        end = reply.find("</answer>")
        json_text = reply[start:end].strip()

        try:
            search_result = json.loads(json_text)
        except json.JSONDecodeError:
            search_result = {"error": "parse_failed", "raw": json_text}

        synthesized_results[task_description] = search_result

    output_folder = os.path.dirname(retrieval_results_path)
    output_path = os.path.join(output_folder, "synthesis_results.json")

    with open(output_path, "w") as f:
        json.dump(synthesized_results, f, indent=4)

    return output_path