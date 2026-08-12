"""
run_pipeline.py — Orchestration pipeline (v2)

Fixes over v1:
  - Now calls critic_agent and cross_synthesis_agent (previously dead code)
  - Adds explicit inter-stage delays to avoid TPM spikes between pipeline steps
  - Passes cross_synthesis_path to generate_report (was missing)
  - Better error handling and early-exit messages
"""

import os
import json
import re
import time
from dotenv import load_dotenv

from agents.task_agent             import generate_tasks
from agents.retrieval_agent        import retrieve
from agents.synthesis_agent        import synthesize
from agents.gap_agent              import detect_gaps
from agents.critic_agent           import run_critic_refinement
from agents.cross_synthesis_agent  import run_cross_synthesis
from agents.report_agent           import generate_report

load_dotenv()

BASE_PATH            = os.path.join(os.path.dirname(__file__), "model_output_data")
MAX_ITERATIONS       = 2
MAX_TOTAL_TASKS      = 8
MAX_NEW_TASKS_PER_ITER = 2
INTER_STAGE_DELAY    = 5.0   # seconds between major pipeline stages

BLOCKED_KEYWORDS = [
    "comprehensive",
    "assessment",
    "future prospects",
    "impact analysis",
    "conduct",
    "broad analysis",
]


def clean_folder_name(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-zA-Z0-9\s]+", "", text)
    text = re.sub(r"\s+", "_", text).strip("_")
    return text[:80]


def is_similar(new_desc: str, existing_tasks: list) -> bool:
    new_words = set(new_desc.lower().split())
    for task in existing_tasks:
        existing_words = set(task.lower().split())
        if len(new_words & existing_words) >= 4:
            return True
    return False


def is_blocked(desc: str) -> bool:
    desc_lower = desc.lower()
    return any(word in desc_lower for word in BLOCKED_KEYWORDS)


def _stage_pause(label: str):
    print(f"\n[pipeline] --- {label} --- (pausing {INTER_STAGE_DELAY}s to avoid rate limits)")
    time.sleep(INTER_STAGE_DELAY)


def run_research(user_query: str):
    if not user_query or not user_query.strip():
        print("Error: Query cannot be empty.")
        return

    folder_name = clean_folder_name(user_query)
    if not folder_name:
        print("Error: Could not generate a valid folder name from query.")
        return

    folder_path = os.path.join(BASE_PATH, folder_name)
    os.makedirs(folder_path, exist_ok=True)

    # ── Stage 1: Generate tasks ──────────────────────────────────────────────
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

    working_folder = os.path.dirname(tasks_file_path)

    # Track last valid paths across iterations
    synthesis_path      = None
    gap_path            = None
    refined_synth_path  = None

    for iteration in range(MAX_ITERATIONS):
        print(f"\n{'='*60}")
        print(f"ITERATION {iteration + 1} of {MAX_ITERATIONS}")
        print(f"{'='*60}")

        # ── Stage 2: Retrieve ────────────────────────────────────────────────
        _stage_pause("Retrieval")
        print("Retrieving sources...")
        retrieval_path = retrieve(tasks_file_path)
        if not retrieval_path or not os.path.exists(retrieval_path):
            print("Retrieval failed. Stopping.")
            break

        # ── Stage 3: Synthesize ──────────────────────────────────────────────
        _stage_pause("Synthesis")
        print("Synthesizing findings...")
        synthesis_path = synthesize(retrieval_path)
        if not synthesis_path or not os.path.exists(synthesis_path):
            print("Synthesis failed. Stopping.")
            break

        # ── Stage 4: Critic refinement ───────────────────────────────────────
        _stage_pause("Critic refinement")
        print("Running critic refinement pass...")
        try:
            refined_synth_path = run_critic_refinement(synthesis_path)
        except Exception as e:
            print(f"[pipeline] Critic agent error: {e}. Using raw synthesis.")
            refined_synth_path = synthesis_path

        # ── Stage 5: Gap detection ───────────────────────────────────────────
        _stage_pause("Gap detection")
        print("Detecting gaps...")
        gap_path = detect_gaps(refined_synth_path)
        if not gap_path or not os.path.exists(gap_path):
            print("Gap detection failed. Stopping.")
            break

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
            if not desc or is_blocked(desc) or is_similar(desc, existing_descriptions):
                if desc:
                    print(f"Skipped task: {desc[:60]}")
                continue

            tasks.append({
                "description": desc,
                "priority":    int(round(t.get("priority", 5))),
                "type":        "research",
            })
            existing_descriptions.append(desc)
            appended_count += 1
            print(f"New task added: {desc[:70]}")

        if appended_count == 0:
            print("No valid new tasks appended. Stopping iterations.")
            break

        with open(tasks_file_path, "w") as f:
            json.dump(tasks, f, indent=4)

    # ── Stage 6: Cross-task synthesis ───────────────────────────────────────
    final_synth = refined_synth_path or synthesis_path
    cross_synthesis_path = None

    if final_synth and os.path.exists(final_synth):
        _stage_pause("Cross-synthesis")
        print("Running cross-task synthesis...")
        try:
            cross_synthesis_path = run_cross_synthesis(final_synth)
        except Exception as e:
            print(f"[pipeline] Cross-synthesis error: {e}. Skipping.")
    else:
        print("No synthesis available for cross-synthesis.")

    # ── Stage 7: Final report ────────────────────────────────────────────────
    # Resolve paths from last successful iteration
    if not final_synth:
        final_synth = os.path.join(working_folder, "refined_synthesis_results.json")
        if not os.path.exists(final_synth):
            final_synth = os.path.join(working_folder, "synthesis_results.json")

    if not gap_path:
        gap_path = os.path.join(working_folder, "gap_results.json")

    if not os.path.exists(final_synth) or not os.path.exists(gap_path):
        print("Missing synthesis or gap files. Cannot generate report.")
        return

    _stage_pause("Report generation")
    print("Generating final report...")
    report_path = generate_report(final_synth, gap_path, cross_synthesis_path)

    if report_path and os.path.exists(report_path):
        print("\n✓ Research complete.")
        print(f"✓ Report saved to: {report_path}")
    else:
        print("Report generation failed.")


if __name__ == "__main__":
    query = input("Enter research topic: ").strip()
    run_research(query)