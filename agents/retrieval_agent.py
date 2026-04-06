"""
retrieval_agent.py — Web retrieval with rate-limit-safe sequential processing

Fixes over v1:
  - Per-task delay between API calls (prevents TPM spikes)
  - Source snippet hard-capped at 600 chars (was 1000)
  - Max sources per task capped at 3 (was 4) — still enough signal
  - Token budget pre-check before sending to LLM
"""

import os
import json
import time
from groq import Groq
from tavily import TavilyClient
from dotenv import load_dotenv

from utils.llm_utils import call_with_retry, estimate_tokens, trim_to_token_budget
from utils.config import RETRIEVAL_MODEL

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
tavily = TavilyClient(api_key=os.getenv("TAVILY_SEARCH_API"))

# Max tokens we're willing to send as user content to the retrieval LLM
MAX_RETRIEVAL_INPUT_TOKENS = 3000
SNIPPET_MAX_CHARS = 600
MAX_RESULTS = 3
INTER_TASK_DELAY = 3.0  # seconds between tasks (prevents Tavily + Groq burst)


def fetch_search_results(query: str):
    """Fetch and slim search results from Tavily."""
    response = tavily.search(
        query=query,
        search_depth="advanced",
        max_results=MAX_RESULTS,
        include_answer=True,
    )

    structured = []
    for r in response.get("results", []):
        snippet = r.get("content", "")[:SNIPPET_MAX_CHARS]
        structured.append({
            "title":   r.get("title", ""),
            "url":     r.get("url", ""),
            "source":  r.get("url", "").split("/")[2] if r.get("url") else "",
            "snippet": snippet,
            "score":   round(r.get("score", 0), 3),
        })

    tavily_answer = response.get("answer", "")[:400]  # cap the direct answer too
    return structured, tavily_answer


EXTRACTION_SYSTEM = """You are a precision research extraction agent.

Task: "{task_description}"

Given web search results (title, URL, snippet, score) and an optional direct answer:
1. Extract ONLY content directly relevant to the task above.
2. For each source: title, source domain, 2-3 sentence summary, 3-5 specific key points.
3. Prefer high-score sources. Discard irrelevant ones.
4. Pull specific numbers, dates, names, statistics — these make findings useful.
5. If the direct answer adds useful facts, incorporate them.

CRITICAL: Return ONLY valid JSON inside <answer> tags.

<answer>
[
  {{
    "source": "domain.com",
    "title": "Article title",
    "url": "https://...",
    "summary": "2-3 sentence factual summary relevant to the task",
    "key_points": [
      "Specific point with numbers/names where available"
    ],
    "relevance_score": 0.95
  }}
]
</answer>"""


def retrieve(tasks_file_path: str) -> str:
    with open(tasks_file_path, "r", encoding="utf-8") as f:
        tasks = json.load(f)

    all_results = {}

    for i, task in enumerate(tasks):
        task_description = task["description"]
        print(f"\n[retrieval] Task {i+1}/{len(tasks)}: {task_description[:70]}...")

        # --- Web search ---
        try:
            search_results, tavily_answer = fetch_search_results(task_description)
        except Exception as e:
            print(f"[retrieval] Tavily error: {e}")
            all_results[task_description] = []
            time.sleep(INTER_TASK_DELAY)
            continue

        # --- Build user content and enforce token budget ---
        system_prompt = EXTRACTION_SYSTEM.format(task_description=task_description)
        raw_user_content = (
            f"Direct answer:\n{tavily_answer}\n\n"
            f"Search results:\n{json.dumps(search_results, indent=2)}"
        )

        # Trim if needed to stay within budget
        if estimate_tokens(raw_user_content) > MAX_RETRIEVAL_INPUT_TOKENS:
            raw_user_content = trim_to_token_budget(raw_user_content, MAX_RETRIEVAL_INPUT_TOKENS)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": raw_user_content},
        ]

        # --- LLM extraction ---
        try:
            completion = call_with_retry(
                client=client,
                model=RETRIEVAL_MODEL,
                messages=messages,
                temperature=0.1,
                max_tokens=1200,
            )
            reply = completion.choices[0].message.content
        except Exception as e:
            print(f"[retrieval] LLM error for '{task_description[:50]}': {e}")
            all_results[task_description] = []
            time.sleep(INTER_TASK_DELAY)
            continue

        # --- Parse ---
        start = reply.find("<answer>") + len("<answer>")
        end   = reply.find("</answer>")

        if start < len("<answer>") or end == -1:
            print(f"[retrieval] Missing tags, skipping task.")
            all_results[task_description] = []
        else:
            try:
                all_results[task_description] = json.loads(reply[start:end].strip())
            except json.JSONDecodeError as e:
                print(f"[retrieval] JSON parse failed: {e}")
                all_results[task_description] = []

        # Throttle between tasks (Tavily + Groq both have rate limits)
        if i < len(tasks) - 1:
            print(f"[retrieval] Pausing {INTER_TASK_DELAY}s before next task...")
            time.sleep(INTER_TASK_DELAY)

    output_path = os.path.join(os.path.dirname(tasks_file_path), "retrieval_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=4)

    print(f"\n[retrieval] Saved to: {output_path}")
    return output_path