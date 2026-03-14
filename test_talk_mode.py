#!/usr/bin/env python3
"""Test script for the talk mode functionality"""

import requests
import json
import os
import sys

# Find a research folder with data
BASE_PATH = os.path.join(os.path.dirname(__file__), "model_output_data")


def test_talk_mode():
    if not os.path.exists(BASE_PATH):
        print("Error: No research data found at", BASE_PATH)
        return

    # Find first research folder
    folders = [
        f for f in os.listdir(BASE_PATH) if os.path.isdir(os.path.join(BASE_PATH, f))
    ]

    if not folders:
        print("Error: No research folders found in", BASE_PATH)
        return

    test_folder = folders[0]
    print(f"Testing with research folder: {test_folder}")

    # Check if folder has research data
    folder_path = os.path.join(BASE_PATH, test_folder)
    required_files = ["tasks.json", "synthesis_results.json", "final_report.md"]
    has_files = all(
        os.path.exists(os.path.join(folder_path, f)) for f in required_files
    )

    if not has_files:
        print(f"Warning: Folder {test_folder} doesn't have all required files")
        print(f"Files found: {os.listdir(folder_path)}")

    # Test the chat endpoint
    url = "http://localhost:8000/api/chat"

    test_messages = [
        {"role": "user", "content": "What was this research about?"},
        {"role": "user", "content": "What were the main findings?"},
        {"role": "user", "content": "What sources were used?"},
    ]

    for i, test_msg in enumerate(test_messages, 1):
        print(f"\nTest {i}: {test_msg['content']}")

        try:
            response = requests.post(
                url,
                json={
                    "message": test_msg["content"],
                    "folder_id": test_folder,
                    "history": test_messages[: i - 1],
                },
            )

            if response.status_code == 200:
                data = response.json()
                print(f"Response: {data.get('response', 'No response')[:200]}...")
                print(f"Used context: {data.get('used_context', False)}")
            else:
                print(f"Error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Exception: {e}")

    print("\nTest completed!")


if __name__ == "__main__":
    test_talk_mode()
