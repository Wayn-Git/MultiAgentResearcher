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
    return text[:80]


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

    # --- Step 1: Generate tasks ---
    # generate_tasks() returns a file path to tasks.json
    print("Generating tasks...")
    tasks_file_path = generate_tasks(user_query, research_context="Starting fresh research")

    if not tasks_file_path or not os.path.exists(tasks_file_path):
        print("No tasks generated. Exiting.")
        return

    with open(tasks_file_path, "r") as f:
        tasks = json.load(f)

    if not tasks:
        print("Task list is empty. Exiting.")
        return

    # Track the working folder (derived from tasks_file_path)
    working_folder = os.path.dirname(tasks_file_path)

    for iteration in range(MAX_ITERATIONS):
        print(f"\n--- Iteration {iteration + 1} ---")

        # --- Step 2: Retrieve ---
        print("Retrieving sources...")
        retrieval_path = retrieve(tasks_file_path)

        if not retrieval_path or not os.path.exists(retrieval_path):
            print("Retrieval failed. Stopping.")
            break

        # --- Step 3: Synthesize ---
        print("Synthesizing findings...")
        synthesis_path = synthesize(retrieval_path)

        if not synthesis_path or not os.path.exists(synthesis_path):
            print("Synthesis failed. Stopping.")
            break

        # --- Step 4: Detect gaps ---
        print("Detecting gaps...")
        gap_path = detect_gaps(synthesis_path)

        if not gap_path or not os.path.exists(gap_path):
            print("Gap detection failed. Stopping.")
            break

        # Load gap results to check for new tasks
        with open(gap_path, "r") as f:
            gap_result = json.load(f)

        new_tasks_suggested = gap_result.get("suggested_new_tasks", [])

        if not new_tasks_suggested:
            print("No new tasks suggested. Stopping iterations.")
            break

        # Filter and append valid new tasks
        existing_descriptions = [t["description"] for t in tasks]
        appended_count = 0

        for t in new_tasks_suggested:
            if appended_count >= MAX_NEW_TASKS_PER_ITER:
                break
            if len(tasks) >= MAX_TOTAL_TASKS:
                print("Task limit reached.")
                break

            desc = t.get("description", "").strip()
            if not desc:
                continue
            if is_blocked(desc):
                print(f"Blocked task: {desc}")
                continue
            if is_similar(desc, existing_descriptions):
                print(f"Similar task skipped: {desc}")
                continue

            tasks.append({
                "description": desc,
                "priority": int(round(t.get("priority", 5))),
                "type": "research"
            })
            existing_descriptions.append(desc)
            appended_count += 1
            print(f"New task added: {desc}")

        if appended_count == 0:
            print("No valid new tasks appended. Stopping iterations.")
            break

        # Save updated tasks.json for next iteration
        with open(tasks_file_path, "w") as f:
            json.dump(tasks, f, indent=4)

    # --- Step 5: Generate final report ---
    # Ensure synthesis and gap files exist from the last iteration
    synthesis_path = os.path.join(working_folder, "synthesis_results.json")
    gap_path = os.path.join(working_folder, "gap_results.json")

    if not os.path.exists(synthesis_path) or not os.path.exists(gap_path):
        print("Missing synthesis or gap files. Cannot generate report.")
        return

    print("\nGenerating final report...")
    report_path = generate_report(synthesis_path, gap_path)

    if report_path and os.path.exists(report_path):
        print("Research complete.")
        print("Report saved to:", report_path)
    else:
        print("Report generation failed.")


if __name__ == "__main__":
    query = input("Enter research topic: ").strip()
    run_research(query)