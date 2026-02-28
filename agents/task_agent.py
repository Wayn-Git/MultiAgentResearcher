from groq import Groq
from dotenv import load_dotenv
import os
import json
import re

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=groq_api_key)

def generate_tasks(user_input, research_context):

    task_data_path = "model_output_data/"

    lower_user_input = user_input.lower()
    cleaned_text = re.sub(r'[^a-zA-Z0-9\s]+', '', lower_user_input)
    folder_name_for_query = re.sub(r"\s+", "_", cleaned_text)

    complete_data_path_query = os.path.join(task_data_path, folder_name_for_query)

    if not os.path.exists(complete_data_path_query):
        os.makedirs(complete_data_path_query, exist_ok=True)

    system_prompt = f"""
You are creating an initial research plan for the topic: "{user_input}"
Initial Query: "{user_input}"
Research Context: {research_context if research_context else "Starting fresh research"}
Decompose this query into 3–5 actionable research tasks. Return a JSON array with each task having:
• "description": Clear, actionable task (string)
• "priority": 1–10 (integer, higher = more important, default=5)
• "type": "research" (always "research")

STRICTLY CREATE ONLY 3-5 ACTIONABLE RESEARCH TASKS

Focus on: understanding the topic, gathering information, identifying key aspects, and building foundational knowledge.
Example for "Impacts of Generative AI on Scientific Research":
<answer>
[
{{"description": "Survey major applications of generative AI in scientific discovery", "priority": 8, "type": "research"}},
{{"description": "Identify key papers and institutions leading AI-assisted science research", "priority": 7, "type": "research"}},
{{"description": "Examine methodological advances enabled by generative models in ...", "priority": 6, "type": "research"}},
{{"description": "Assess challenges and ethical considerations of AI-generated scientific results", "priority": 5, "type": "research"}}
]
</answer>
CRITICAL: Wrap JSON in <answer>tags.
Output ONLY valid JSON.
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        stream=False
    )

    assistant_output = completion.choices[0].message.content

    start = assistant_output.find("<answer>") + len("<answer>")
    end = assistant_output.find("</answer>")

    json_text = assistant_output[start:end].strip()
    tasks = json.loads(json_text)

    tasks_file_path = os.path.join(complete_data_path_query, "tasks.json")

    with open(tasks_file_path, "w") as f:
        json.dump(tasks, f, indent=4)

    print("Saved to:", tasks_file_path)

    return tasks_file_path