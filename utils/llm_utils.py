"""
llm_utils.py — Rate-limit-safe Groq wrapper

Fixes over v1:
  - Exponential backoff with jitter (prevents thundering herd on burst retries)
  - Minimum inter-call delay to stay under TPM limits
  - Token budget estimation so callers can pre-trim inputs
  - Structured RateLimitError parsing for precise wait times
"""

import time
import re
import random
import groq

# ── Global throttle ─────────────────────────────────────────────────────────
# Groq free tier: ~30 req/min for 70B, ~60 req/min for 8B.
# These delays are applied AFTER every successful call to avoid burst spikes.
THROTTLE_DELAYS = {
    "70b":     2.5,   # seconds between 70B calls
    "8b":      1.2,   # seconds between 8B calls
    "default": 2.0,
}

def _throttle_delay(model: str) -> float:
    if "70b" in model or "70B" in model:
        return THROTTLE_DELAYS["70b"]
    if "8b" in model or "8B" in model:
        return THROTTLE_DELAYS["8b"]
    return THROTTLE_DELAYS["default"]


def estimate_tokens(text: str) -> int:
    """
    Rough token estimate: ~4 chars per token for English/JSON.
    Use this to pre-check inputs before sending to the API.
    """
    return max(1, len(text) // 4)


def trim_to_token_budget(text: str, max_tokens: int) -> str:
    """
    Truncate text to approximately max_tokens tokens.
    Tries to cut at a sentence boundary.
    """
    char_limit = max_tokens * 4
    if len(text) <= char_limit:
        return text

    truncated = text[:char_limit]
    # Try to end at the last complete sentence
    last_period = truncated.rfind(". ")
    if last_period > char_limit * 0.7:
        truncated = truncated[: last_period + 1]

    return truncated + "\n[... truncated to fit context limit ...]"


def call_with_retry(
    client,
    model: str,
    messages: list,
    temperature: float = 0.7,
    max_tokens: int = 1500,
    stream: bool = False,
    max_retries: int = 5,
    apply_throttle: bool = True,
) -> object:
    """
    Groq chat completion with:
      - Exponential backoff + jitter on RateLimitError
      - Automatic wait-time parsing from Groq error messages
      - Post-call throttle to stay within TPM limits
    """
    base_wait = 2.0

    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=stream,
            )

            # Apply inter-call throttle AFTER a successful response
            if apply_throttle:
                delay = _throttle_delay(model)
                time.sleep(delay)

            return response

        except groq.RateLimitError as e:
            if attempt == max_retries - 1:
                raise

            # Parse Groq's "Please try again in X.XXs" message
            wait_time = base_wait * (2 ** attempt)          # exponential base
            match = re.search(r"try again in ([\d.]+)s", str(e), re.IGNORECASE)
            if match:
                wait_time = max(float(match.group(1)) + 0.5, wait_time)

            # Add jitter to avoid thundering herd when multiple tasks retry
            jitter = random.uniform(0.1, 1.0)
            total_wait = wait_time + jitter

            print(
                f"[llm_utils] Rate limit hit (attempt {attempt + 1}/{max_retries}). "
                f"Waiting {total_wait:.2f}s before retry..."
            )
            time.sleep(total_wait)

        except groq.BadRequestError as e:
            # Context-window overflow — caller should trim and retry
            raise ContextWindowError(str(e)) from e

        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait = base_wait + random.uniform(0, 1)
            print(f"[llm_utils] Unexpected error: {e}. Retrying in {wait:.1f}s...")
            time.sleep(wait)

    return None  # unreachable


class ContextWindowError(Exception):
    """Raised when Groq returns a 400 context-window-exceeded error."""
    pass