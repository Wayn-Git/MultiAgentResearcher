from groq import Groq
from dotenv import load_dotenv
import os
import pprint
import json
import re

from utils import extract_json

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")

task_agent = Groq()

BASE_PATH = os.path.join(os.path.dirname(__file__), "model_output_data")

def task_agent(user_input, research_context):
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
    completion = task_agent.chat.completions.create(
        model='llama-3.1-8b-instant',
        message=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        
        ]
    )
