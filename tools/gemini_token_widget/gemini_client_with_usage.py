import os
import json
import datetime as dt
from pathlib import Path
from dotenv import load_dotenv
from google import genai

"""
gemini_client_with_usage.py

Wrapper around Google Gemini that logs token usage per call into a local JSONL file.
The floating widget reads that file to display daily token usage.
"""

# Load GOOGLE_API_KEY from .env or environment variables
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY not set in environment or .env file")

# Gemini client
client = genai.Client(api_key=GOOGLE_API_KEY)

# Path where we log usage locally (same folder as this script by default)
USAGE_LOG_PATH = Path(__file__).resolve().parent / "gemini_usage_log.jsonl"


def _log_usage(model: str, input_tokens: int, output_tokens: int) -> None:
    """
    Append a usage record to the local JSONL file.

    Each line is a JSON object with:
      - timestamp_utc: ISO8601 timestamp in UTC
      - model: model name
      - input_tokens: prompt tokens
      - output_tokens: completion tokens
      - total_tokens: sum of input + output
    """
    record = {
        "timestamp_utc": dt.datetime.utcnow().isoformat(),
        "model": model,
        "input_tokens": int(input_tokens),
        "output_tokens": int(output_tokens),
        "total_tokens": int(input_tokens + output_tokens),
    }

    # Ensure directory exists
    USAGE_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Append as JSONL (one JSON per line)
    with USAGE_LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")


def generate_text_with_usage(model: str, prompt: str, **kwargs):
    """
    Call Gemini's generate_content API and log token usage.

    Args:
        model: model name, e.g. "gemini-2.0-flash"
        prompt: user prompt (string)
        **kwargs: any extra args for generate_content, e.g. generation_config

    Returns:
        response: the normal Gemini response object
    """
    response = client.models.generate_content(
        model=model,
        contents=[{"role": "user", "parts": [{"text": prompt}]}],
        **kwargs,
    )

    # usage_metadata should contain token counts for this call
    usage = getattr(response, "usage_metadata", None)
    if usage:
        # attribute names per Gemini Python client
        input_tokens = getattr(usage, "prompt_token_count", 0)
        output_tokens = getattr(usage, "candidates_token_count", 0)
        _log_usage(model, input_tokens, output_tokens)

    return response


def generate_stream_with_usage(model: str, prompt: str, **kwargs):
    """
    Streaming variant that logs usage after the stream finishes.

    Yields:
        chunks: streaming response chunks, same as generate_content_stream
    """
    stream = client.models.generate_content_stream(
        model=model,
        contents=[{"role": "user", "parts": [{"text": prompt}]}],
        **kwargs,
    )

    final_usage = None

    # Yield chunks as they arrive
    for chunk in stream:
        if getattr(chunk, "usage_metadata", None):
            final_usage = chunk.usage_metadata
        yield chunk

    # After stream ends, log usage if available
    if final_usage:
        input_tokens = getattr(final_usage, "prompt_token_count", 0)
        output_tokens = getattr(final_usage, "candidates_token_count", 0)
        _log_usage(model, input_tokens, output_tokens)


if __name__ == "__main__":
    # Simple manual test (only run if you execute this file directly)
    model_name = "gemini-2.0-flash"
    test_prompt = "Say hello and tell me one fun fact."

    print(f"Calling Gemini model '{model_name}'...")
    resp = generate_text_with_usage(model_name, test_prompt)
    print("Response:")
    # response.text exists on normal text generations
    print(getattr(resp, "text", resp))
    print(f"\nUsage logged to: {USAGE_LOG_PATH}")
