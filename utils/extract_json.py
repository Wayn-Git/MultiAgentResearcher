def extract_json(reply):
    import re
    import json

    match = re.search(r"<answer>(.*?)</answer>", reply, re.DOTALL)

    if not match:
        raise ValueError("No <answer> block found")

    json_text = match.group(1).strip()

    # Remove invalid control characters
    json_text = re.sub(r"[\x00-\x1f\x7f]", "", json_text)

    try:
        return json.loads(json_text)
    except json.JSONDecodeError as e:
        print("JSON parse failed. Cleaned output below:")
        print(json_text)
        raise e