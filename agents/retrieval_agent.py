from groq import Groq
from dotenv import load_dotenv
import os
import json
from tavily import TavilyClient

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")
search_api_key = os.getenv("TAVILY_SEARCH_API")

client = Groq(api_key=groq_api_key)
tavily = TavilyClient(api_key=search_api_key)


def fetch_search_results(query):
    response = tavily.search(
        query=query,
        search_depth="advanced",
        max_results=5
    )

    structured_results = []

    for result in response["results"]:
        structured_results.append({
            "title": result["title"],
            "url": result["url"],
            "snippet": result["content"][:1200]
        })

    return structured_results


def retrieve(tasks_file_path):

    with open(tasks_file_path, "r") as f:
        tasks = json.load(f)

    retriever_system_prompt_template = """You are a research retrieval agent. Your job: Extract accurate facts from the provided search results for the following task:
Task: {task_description}
Rules:
- Use ONLY the given search results
- Do NOT invent information
- Keep summaries concise and factual
- Include the source URL for every item
- If results are insufficient, return an empty list

IMPORTANT: Your response must contain ONLY the <answer> block below. No extra text, no explanation, no preamble.

<answer>
[
  {{
    "source": "...",
    "title": "...",
    "summary": "...",
    "key_points": ["...", "..."]
  }}
]
</answer>

Do not write anything before or after the <answer> tags."""

    all_results = {}

    for task in tasks:
        task_description = task["description"]

        formatted_prompt = retriever_system_prompt_template.format(
            task_description=task_description
        )

        search_results = fetch_search_results(task_description)

        messages = [
            {"role": "system", "content": formatted_prompt},
            {
                "role": "user",
                "content": "Here are the search results:\n\n" +
                           json.dumps(search_results, indent=2)
            }
        ]

        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            stream=False
        )

        reply = completion.choices[0].message.content

        start = reply.find("<answer>") + len("<answer>")
        end = reply.find("</answer>")

        if start == -1 or end == -1:
            print(f"Missing <answer> tags for task '{task_description}'")
            all_results[task_description] = []
            continue

        json_text = reply[start:end].strip()

        try:
            task_results = json.loads(json_text)
        except json.JSONDecodeError as e:
            print(f"Parse failed for task '{task_description}': {e}")
            print("Raw output:", json_text)
            task_results = []

        all_results[task_description] = task_results

    base_folder = os.path.dirname(tasks_file_path)
    output_path = os.path.join(base_folder, "retrieval_results.json")

    with open(output_path, "w") as f:
        json.dump(all_results, f, indent=4)

    print("Saved to:", output_path)

    return output_path