#!/usr/bin/env python3
"""Complete test for talk mode functionality"""

import requests
import json
import os

BASE_PATH = os.path.join(os.path.dirname(__file__), "model_output_data")


def test_complete_talk_mode():
    """Test the complete talk mode flow"""

    # Find a research folder with report
    folders = [
        f for f in os.listdir(BASE_PATH) if os.path.isdir(os.path.join(BASE_PATH, f))
    ]

    for folder in folders:
        folder_path = os.path.join(BASE_PATH, folder)
        report_path = os.path.join(folder_path, "final_report.json")

        if os.path.exists(report_path):
            print(f"\n=== Testing with: {folder} ===")
            break
    else:
        print("No research folders with reports found!")
        return

    # Test 1: Check history endpoint
    print("\n1. Testing /api/history...")
    response = requests.get("http://localhost:8000/api/history")
    if response.status_code == 200:
        data = response.json()
        print(f"   Found {len(data['sessions'])} sessions")
        if data["sessions"]:
            print(f"   Sample session: {data['sessions'][0]['title']}")
    else:
        print(f"   Error: {response.status_code}")
        return

    # Test 2: Check specific session
    print(f"\n2. Testing /api/history/{folder}...")
    response = requests.get(f"http://localhost:8000/api/history/{folder}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Session title: {data['title']}")
        print(f"   Has report: {data.get('has_report', False)}")
    else:
        print(f"   Error: {response.status_code}")
        return

    # Test 3: Chat about research
    print(f"\n3. Testing /api/chat with research questions...")

    questions = [
        "What was this research about?",
        "What are the main findings?",
        "What was the methodology used?",
    ]

    for i, question in enumerate(questions, 1):
        print(f"\n   Question {i}: {question}")
        response = requests.post(
            "http://localhost:8000/api/chat",
            json={"message": question, "folder_id": folder, "history": []},
        )

        if response.status_code == 200:
            data = response.json()
            response_text = data.get("response", "No response")
            print(f"   Answer: {response_text[:150]}...")
            print(f"   Used context: {data.get('used_context', False)}")
        else:
            print(f"   Error {response.status_code}: {response.text}")

    print("\n=== Talk Mode Test Complete! ===")


if __name__ == "__main__":
    test_complete_talk_mode()
