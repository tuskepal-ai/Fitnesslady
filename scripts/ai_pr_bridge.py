import time
import random

def call_openai(prompt: str) -> str:
    url = "https://api.openai.com/v1/responses"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {"model": AI_MODEL, "input": prompt}

    # Retry on 429/5xx with exponential backoff
    for attempt in range(1, 7):
        r = requests.post(url, headers=headers, json=payload, timeout=120)

        if r.status_code in (429, 500, 502, 503, 504):
            # Backoff: 1s, 2s, 4s, 8s, 16s, 32s (+ jitter)
            sleep_s = min(2 ** (attempt - 1), 32) + random.uniform(0, 0.5)
            print(f"OpenAI transient error {r.status_code}. Retry {attempt}/6 in {sleep_s:.1f}s")
            time.sleep(sleep_s)
            continue

        # If not transient, raise with response text to see real cause
        if not r.ok:
            print("OpenAI error response:", r.text[:2000])
            r.raise_for_status()

        data = r.json()
        out = ""
        for item in data.get("output", []):
            for c in item.get("content", []):
                if c.get("type") == "output_text":
                    out += c.get("text", "")
        return out.strip()

    # If we exhausted retries
    raise RuntimeError("OpenAI API: too many transient errors (429/5xx) after retries")
