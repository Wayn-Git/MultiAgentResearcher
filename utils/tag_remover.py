import json
import os

def tag_remover(text, complete_data_path_query):
    start = text.find("<answer>") + len("<answer>")
    end = text.find("</answer>")

    json_text = text[start:end].strip()

    tasks = json.loads(json_text)

    with open(os.path.join(complete_data_path_query, "tasks.json"), "w") as f:
        json.dump(tasks, f, indent=4)

    print(tasks)