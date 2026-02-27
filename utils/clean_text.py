import re

def clean_folder_name(text):
    text = text.lower()
    text = re.sub(r"[^a-zA-Z0-9\s]+", "", text)
    return re.sub(r"\s+", "_", text)