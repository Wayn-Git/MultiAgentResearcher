import time
import re
import groq

def call_with_retry(client, model, messages, temperature=0.7, max_tokens=1500, stream=False, max_retries=3):
    """
    Wrapper for Groq chat completions with automatic retry on 429 Rate Limit errors.
    """
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=stream
            )
        except groq.RateLimitError as e:
            if attempt == max_retries - 1:
                raise e
            
            # Try to extract wait time from error message
            # Typical Groq error: "Please try again in 1.23s."
            wait_time = 2.0  # Default wait
            match = re.search(r"try again in ([\d.]+)s", str(e))
            if match:
                wait_time = float(match.group(1)) + 0.1  # Add a small buffer
            
            print(f"[llm_utils] Rate limit hit. Retrying in {wait_time:.2f}s... (Attempt {attempt+1}/{max_retries})")
            time.sleep(wait_time)
        except Exception as e:
            # For other errors, we might still want a small retry or just raise
            if attempt == max_retries - 1:
                raise e
            print(f"[llm_utils] Error encountered: {e}. Retrying in 2s...")
            time.sleep(2)
    
    return None # Should not reach here
