from groq import Groq
from dotenv import load_dotenv
import os
import json
import re
from utils.llm_utils import call_with_retry
from utils.config import TASK_MODEL

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Use 8B for initial planning to save 70B TPD
# TASK_MODEL = "llama-3.3-70b-versatile" # Legacy


def generate_tasks(user_input, research_context):
    task_data_path = "model_output_data/"

    lower_user_input = user_input.lower()
    cleaned_text = re.sub(r'[^a-zA-Z0-9\s]+', '', lower_user_input)
    folder_name_for_query = re.sub(r"\s+", "_", cleaned_text)

    complete_data_path_query = os.path.join(task_data_path, folder_name_for_query)
    os.makedirs(complete_data_path_query, exist_ok=True)

    system_prompt = f"""You are an expert research strategist and planner.

You are given a research topic: "{user_input}"
Research Context: {research_context if research_context else "Starting fresh research"}

Your goal is to decompose this topic into 3-4 highly focused, non-overlapping research tasks that together provide thorough and comprehensive coverage of the topic.

REQUIREMENTS FOR EACH TASK:
1. Be SPECIFIC — avoid vague tasks like "research X". Every task should be answerable with concrete evidence.
2. Be DIVERSE — cover different angles: historical context, current state, key players, technical details, challenges, future outlook.
3. Be INDEPENDENT — each task should produce standalone findings.
4. Be ACTIONABLE — tasks should guide a focused web search query.

PRIORITY SCALE:
- 9-10: Critical foundational knowledge — must know first
- 7-8: Core analytical depth — important for understanding
- 5-6: Supporting context — helpful for completeness
- 3-4: Optional depth — nice to have

CRITICAL: Return ONLY valid JSON inside <answer> tags. No preamble, no explanation.

<answer>
[
  {{
    "description": "Clear, specific, answerable research task",
    "priority": 8,
    "type": "research",
    "search_angle": "What specific aspect of the topic this task targets"
  }}
]
</answer>
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": f"Research topic: {user_input}"}
    ]

    completion = call_with_retry(
        client=client,
        model=TASK_MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=1500,
    )

    assistant_output = completion.choices[0].message.content

    start = assistant_output.find("<answer>") + len("<answer>")
    end   = assistant_output.find("</answer>")

    json_text = assistant_output[start:end].strip()
    tasks = json.loads(json_text)

    tasks_file_path = os.path.join(complete_data_path_query, "tasks.json")
    with open(tasks_file_path, "w", encoding="utf-8") as f:
        json.dump(tasks, f, indent=4)

    print("Tasks saved to:", tasks_file_path)
    return tasks_file_path