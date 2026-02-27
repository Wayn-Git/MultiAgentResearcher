import os
import json
import re
from dotenv import load_dotenv
from groq import Groq
from tavily import TavilyClient

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_SEARCH_API")

groq = Groq()
tavily = TavilyClient(api_key=TAVILY_API_KEY)

BASE_PATH = os.path.join(os.path.dirname(__file__), "model_output_data")
MAX_ITERATIONS = 3


# -----------------------------
# Utility
# -----------------------------

def extract_json(reply):
    import re
    import json

    match = re.search(r"<answer>(.*?)</answer>", reply, re.DOTALL)

    if not match:
        raise ValueError("No <answer> block found")

    json_text = match.group(1).strip()

    # Remove invalid control characters
    json_text = re.sub(r"[\x00-\x1f\x7f]", "", json_text)

    try:
        return json.loads(json_text)
    except json.JSONDecodeError as e:
        print("JSON parse failed. Cleaned output below:")
        print(json_text)
        raise e


def clean_folder_name(text):
    text = text.lower()
    text = re.sub(r"[^a-zA-Z0-9\s]+", "", text)
    return re.sub(r"\s+", "_", text)


# -----------------------------
# Task Agent
# -----------------------------

def generate_tasks(user_query, folder):
    system_prompt = f"""
Create 3–5 research tasks for: "{user_query}"

Return ONLY JSON inside <answer> tags.

<answer>
[
  {{"description": "...", "priority": 5, "type": "research"}}
]
</answer>
"""

    completion = groq.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query}
        ]
    )

    tasks = extract_json(completion.choices[0].message.content)

    with open(os.path.join(folder, "tasks.json"), "w") as f:
        json.dump(tasks, f, indent=4)

    return tasks


# -----------------------------
# Retriever
# -----------------------------

def retrieve(task_description):
    search = tavily.search(query=task_description, max_results=5)

    structured = []
    for r in search["results"]:
        structured.append({
            "source": r["url"],
            "title": r["title"],
            "summary": r["content"][:400]
        })

    return structured


# -----------------------------
# Synthesis
# -----------------------------

def synthesize(task, sources):

    system_prompt = f"""
Synthesize research for task: {task}

Return JSON inside <answer> tags.

<answer>
{{
  "task": "{task}",
  "summary": "...",
  "key_points": []
}}
</answer>
"""

    completion = groq.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(sources)}
        ]
    )

    return extract_json(completion.choices[0].message.content)


# -----------------------------
# Gap Agent
# -----------------------------

def detect_gaps(synthesis_data):

    system_prompt = """
Analyze synthesis results.
Suggest new research tasks if needed.

Return JSON inside <answer> tags.

<answer>
{
  "suggested_new_tasks": []
}
</answer>
"""

    completion = groq.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(synthesis_data)}
        ]
    )

    return extract_json(completion.choices[0].message.content)


# -----------------------------
# Report Agent
# -----------------------------

def generate_report(synthesis_data):

    system_prompt = """
Generate final research report.

Return JSON inside <answer> tags.

<answer>
{
  "executive_summary": "",
  "sections": []
}
</answer>
"""

    completion = groq.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(synthesis_data)}
        ]
    )

    return extract_json(completion.choices[0].message.content)


# -----------------------------
# Master Orchestrator
# -----------------------------

def run_research(user_query):

    folder_name = clean_folder_name(user_query)
    folder_path = os.path.join(BASE_PATH, folder_name)
    os.makedirs(folder_path, exist_ok=True)

    tasks = generate_tasks(user_query, folder_path)

    all_synthesis = {}

    for iteration in range(MAX_ITERATIONS):

        print(f"Iteration {iteration+1}")

        retrieval_results = {}

        for task in tasks:
            desc = task["description"]

            if desc in all_synthesis:
                continue

            sources = retrieve(desc)
            retrieval_results[desc] = sources

            synthesis = synthesize(desc, sources)
            all_synthesis[desc] = synthesis

        gap_result = detect_gaps(all_synthesis)

        new_tasks = gap_result.get("suggested_new_tasks", [])

        if not new_tasks:
            break

        existing = [t["description"] for t in tasks]

        for t in new_tasks:
            if not isinstance(t, dict):
                continue
            desc = t.get("description")
            if not desc:
                continue
            if desc not in existing:
                tasks.append({
                    "description": desc,
                    "priority": t.get("priority", 5),
                    "type": "research"
                    })

    final_report = generate_report(all_synthesis)

    with open(os.path.join(folder_path, "final_report.json"), "w") as f:
        json.dump(final_report, f, indent=4)

    print("Research complete.")


# -----------------------------
# Entry
# -----------------------------

if __name__ == "__main__":
    query = input("Enter research topic: ")
    run_research(query)