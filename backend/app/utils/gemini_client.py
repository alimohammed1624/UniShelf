"""
Google Gemini client for AI tag suggestions.

Singleton HTTP client, like minio_client.py. One deliberate difference from that
module: every failure here returns None instead of raising HTTPException(502).
A failed MinIO download means the user's requested action failed; a failed Gemini
call only means a garnish is missing, and the caller has a popularity fallback
that is far better UX than an error. Please keep it that way.
"""

import json
import logging
import time
from typing import Any, Optional

import httpx

from app.config import settings
from app.utils.metrics import GEMINI_DURATION, GEMINI_REQUESTS

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────

GEMINI_MODEL = "gemini-flash-latest"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)

# Short by design: a user is waiting on a page load. We do not retry — the
# fallback path is better than making them wait through a second round trip.
GEMINI_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

# ── Singleton client ──────────────────────────────────────────

_client: Optional[httpx.Client] = None

# Guard so a missing key logs once at first use, not on every page load.
_warned_unconfigured = False


def get_gemini_client() -> httpx.Client:
    """
    Return a module-level singleton HTTP client for the Gemini API.
    """
    global _client
    if _client is None:
        _client = httpx.Client(timeout=GEMINI_TIMEOUT)
    return _client


def is_configured() -> bool:
    """
    Whether a Gemini API key is available. Callers should check this and skip
    straight to their fallback rather than paying for a request that will 401.
    """
    return bool(settings.GEMINI_API_KEY)


def generate_json(prompt: str, response_schema: dict) -> Optional[Any]:
    """
    Send a prompt to Gemini and return the parsed JSON response.

    Returns None on every failure path (unset key, timeout, transport error,
    non-2xx, blocked/truncated response, unparseable body). Never raises.
    """
    global _warned_unconfigured

    if not is_configured():
        if not _warned_unconfigured:
            logger.warning(
                "GEMINI_API_KEY is not set — AI tag suggestions will fall back to popular tags"
            )
            _warned_unconfigured = True
        GEMINI_REQUESTS.labels(status="disabled").inc()
        return None

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 512,
            # Forces a bare JSON body — without this the model wraps output in
            # markdown fences, which is the main source of parse failures.
            "responseMimeType": "application/json",
            "responseSchema": response_schema,
            # gemini-flash-latest currently resolves to gemini-3.6-flash, which
            # thinks by default. "low" removes the thinking tokens entirely.
            # Note this is thinkingLevel, not the 2.5-era thinkingBudget — that
            # field is rejected with a 400 by the 3.x models.
            "thinkingConfig": {"thinkingLevel": "low"},
        },
    }

    headers = {
        "Content-Type": "application/json",
        # Header, never a query param — URLs end up in access logs.
        "X-goog-api-key": settings.GEMINI_API_KEY,
    }

    started = time.monotonic()
    try:
        response = get_gemini_client().post(GEMINI_URL, json=payload, headers=headers)
    except httpx.TimeoutException:
        logger.warning(f"Gemini request timed out after {GEMINI_TIMEOUT.read}s")
        GEMINI_REQUESTS.labels(status="timeout").inc()
        return None
    except httpx.HTTPError as e:
        logger.error(f"Gemini request failed: {e}")
        GEMINI_REQUESTS.labels(status="http_error").inc()
        return None
    finally:
        GEMINI_DURATION.observe(time.monotonic() - started)

    if response.status_code != 200:
        logger.error(f"Gemini returned {response.status_code}: {response.text[:300]}")
        GEMINI_REQUESTS.labels(status="http_error").inc()
        return None

    try:
        body = response.json()
        candidate = body["candidates"][0]
        text = candidate["content"]["parts"][0]["text"]
    except (KeyError, IndexError, ValueError):
        # Missing content usually means the response was blocked or truncated;
        # finishReason says which.
        finish_reason = "unknown"
        try:
            finish_reason = body["candidates"][0].get("finishReason", "unknown")
        except (KeyError, IndexError, NameError, TypeError):
            pass
        logger.error(
            f"Gemini response had no usable content (finishReason={finish_reason}): "
            f"{response.text[:300]}"
        )
        GEMINI_REQUESTS.labels(status="parse_error").inc()
        return None

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        logger.error(f"Gemini returned non-JSON content: {text[:300]}")
        GEMINI_REQUESTS.labels(status="parse_error").inc()
        return None

    GEMINI_REQUESTS.labels(status="success").inc()
    return parsed
