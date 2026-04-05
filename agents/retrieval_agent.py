from groq import Groq
from dotenv import load_dotenv
import os
import json
from tavily import TavilyClient

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
tavily = TavilyClient(api_key=os.getenv("TAVILY_SEARCH_API"))

from utils.llm_utils import call_with_retry

# 8b-instant is fine here — we make many calls (one per task) and the job
# is extraction, not reasoning. Speed matters more than depth here.
RETRIEVAL_MODEL = "llama-3.1-8b-instant"


def fetch_search_results(query):
    """Fetch rich search results from Tavily."""
    response = tavily.search(
        query=query,
        search_depth="advanced",
        max_results=4,          # reduced from 6
        include_answer=True,    # Tavily's own answer for extra context
    )

    structured = []
    for r in response.get("results", []):
        structured.append({
            "title":   r.get("title", ""),
            "url":     r.get("url", ""),
            "source":  r.get("url", "").split("/")[2] if r.get("url") else "",
            "snippet": r.get("content", "")[:1000],   # reduced from 2000
            "score":   round(r.get("score", 0), 3),
        })

    # Include Tavily's synthesised answer if present
    tavily_answer = response.get("answer", "")
    return structured, tavily_answer


def retrieve(tasks_file_path):
    with open(tasks_file_path, "r", encoding="utf-8") as f:
        tasks = json.load(f)

    system_prompt_template = """You are a precision research extraction agent.

Task you are extracting information for:
"{task_description}"

You are given raw web search results (title, URL, snippet, relevance score) plus an optional direct answer.

Your job:
1. Extract ONLY information directly relevant to the task above.
2. For each source, produce a clear TITLE, the SOURCE domain, a 2-4 sentence SUMMARY of what the source says about the task, and 3-6 specific KEY POINTS as bullet facts.
3. Prefer high-score sources. Discard irrelevant content.
4. Pull out specific numbers, dates, names, statistics and technical details — these make findings useful.
5. Do NOT paraphrase vaguely. Specific > general always.
6. If the Tavily answer adds useful facts, incorporate them into the most relevant source entry or a separate "Direct Answer" entry.

CRITICAL: Output ONLY valid JSON inside <answer> tags. No trailing commas. No text outside tags.

<answer>
[
  {{
    "source": "domain.com",
    "title": "Full title of the article or page",
    "url": "https://...",
    "summary": "2-4 sentence factual summary of what this source says about the task",
    "key_points": [
      "Specific factual point with numbers/names where available",
      "Another specific point",
      "..."
    ],
    "relevance_score": 0.95
  }}
]
</answer>"""

    all_results = {}

    for task in tasks:
        task_description = task["description"]

        search_results, tavily_answer = fetch_search_results(task_description)

        formatted_prompt = system_prompt_template.format(
            task_description=task_description
        )

        user_content = f"Tavily Direct Answer:\n{tavily_answer}\n\nSearch Results:\n{json.dumps(search_results, indent=2)}"

        messages = [
            {"role": "system", "content": formatted_prompt},
            {"role": "user",   "content": user_content}
        ]

        completion = call_with_retry(
            client=client,
            model=RETRIEVAL_MODEL,
            messages=messages,
            temperature=0.1,    # near-deterministic for factual extraction
            max_tokens=1500,
        )

        reply = completion.choices[0].message.content

        start = reply.find("<answer>") + len("<answer>")
        end   = reply.find("</answer>")

        if start < len("<answer>") or end == -1:
            print(f"[retrieval] Missing tags for: {task_description}")
            all_results[task_description] = []
            continue

        json_text = reply[start:end].strip()

        try:
            task_results = json.loads(json_text)
        except json.JSONDecodeError as e:
            print(f"[retrieval] Parse failed for '{task_description}': {e}")
            task_results = []

        all_results[task_description] = task_results

    output_path = os.path.join(os.path.dirname(tasks_file_path), "retrieval_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=4)

    print("Retrieval saved to:", output_path)
    return output_path