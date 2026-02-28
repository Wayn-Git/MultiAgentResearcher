import os
import json
import re
from dotenv import load_dotenv
from agents.task_agent import generate_tasks
from agents.retrieval_agent import retrieve
from agents.synthesis_agent import synthesize
from agents.gap_agent import detect_gaps
from agents.report_agent import generate_report

load_dotenv()

BASE_PATH = os.path.join(os.path.dirname(__file__), "model_output_data")
MAX_ITERATIONS = 2
MAX_TOTAL_TASKS = 8
MAX_NEW_TASKS_PER_ITER = 2
BLOCKED_KEYWORDS = [
    "comprehensive",
    "assessment",
    "future prospects",
    "impact analysis",
    "conduct",
    "broad analysis"
]


def clean_folder_name(text):
    text = text.lower()
    text = re.sub(r"[^a-zA-Z0-9\s]+", "", text)
    text = re.sub(r"\s+", "_", text).strip("_")
    return text[:80]  # Prevent excessively long folder names


def is_similar(new_desc, existing_tasks):
    new_words = set(new_desc.lower().split())
    for task in existing_tasks:
        existing_words = set(task.lower().split())
        overlap = len(new_words & existing_words)
        if overlap >= 4:
            return True
    return False


def is_blocked(desc):
    desc_lower = desc.lower()
    return any(word in desc_lower for word in BLOCKED_KEYWORDS)


def run_research(user_query):
    if not user_query or not user_query.strip():
        print("Error: Query cannot be empty.")
        return

    folder_name = clean_folder_name(user_query)
    if not folder_name:
        print("Error: Could not generate a valid folder name from query.")
        return

    folder_path = os.path.join(BASE_PATH, folder_name)
    os.makedirs(folder_path, exist_ok=True)

    tasks = generate_tasks(user_query, folder_path)

    if not tasks:
        print("No tasks generated. Exiting.")
        return

    all_synthesis = {}

    for iteration in range(MAX_ITERATIONS):
        print(f"\nIteration {iteration + 1}")

        for task in tasks:
            desc = task.get("description", "").strip()
            if not desc or desc in all_synthesis:
                continue

            try:
                print("Retrieving:", desc)
                sources = retrieve(desc)

                print("Synthesizing:", desc)
                synthesis = synthesize(desc, sources)
                all_synthesis[desc] = synthesis

            except Exception as e:
                print(f"Error processing task '{desc}': {e}")
                continue

        if not all_synthesis:
            print("No synthesis data available. Stopping.")
            break

        print("Detecting gaps...")
        try:
            gap_result = detect_gaps(all_synthesis)
        except Exception as e:
            print(f"Gap detection failed: {e}")
            break

        new_tasks = gap_result.get("suggested_new_tasks", [])
        if not new_tasks:
            print("No new tasks suggested.")
            break

        existing_descriptions = [t["description"] for t in tasks]
        appended_count = 0

        for t in new_tasks:
            if appended_count >= MAX_NEW_TASKS_PER_ITER:
                break

            desc = t.get("description", "").strip()
            if not desc:
                continue
            if len(tasks) >= MAX_TOTAL_TASKS:
                print("Task limit reached.")
                break
            if is_blocked(desc):
                continue
            if is_similar(desc, existing_descriptions):
                continue

            tasks.append({
                "description": desc,
                "priority": int(round(t.get("priority", 5))),
                "type": "research"
            })
            existing_descriptions.append(desc)
            appended_count += 1

        if appended_count == 0:
            print("No valid new tasks appended.")
            break

    if not all_synthesis:
        print("Nothing to report. Exiting.")
        return

    print("\nGenerating final report...")
    try:
        final_report = generate_report(all_synthesis)
    except Exception as e:
        print(f"Report generation failed: {e}")
        return

    report_path = os.path.join(folder_path, "final_report.json")
    with open(report_path, "w") as f:
        json.dump(final_report, f, indent=4)

    print("Research complete.")
    print("Saved to:", folder_path)


if __name__ == "__main__":
    query = input("Enter research topic: ").strip()
    run_research(query)