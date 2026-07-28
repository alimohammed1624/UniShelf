"""
Centralised Prometheus metric definitions for UniShelf.

Import individual metrics where needed rather than scattering
prometheus_client imports across every module.
"""

from prometheus_client import Counter, Histogram

# ── Upload metrics ────────────────────────────────────────────

UPLOAD_COUNT = Counter(
    "unishelf_uploads_total",
    "Total file uploads",
    ["status"],  # success / failure
)

UPLOAD_SIZE = Histogram(
    "unishelf_upload_size_bytes",
    "Uploaded file size in bytes",
    buckets=[1e4, 1e5, 5e5, 1e6, 5e6, 1e7, 2e7],  # 10KB → 20MB
)

# ── Download metrics ──────────────────────────────────────────

DOWNLOAD_COUNT = Counter(
    "unishelf_downloads_total",
    "Total file downloads",
)

# ── Auth metrics ──────────────────────────────────────────────

AUTH_ATTEMPTS = Counter(
    "unishelf_auth_attempts_total",
    "Authentication and registration attempts",
    ["method", "status"],  # method: login/register, status: success/failure
)

# ── MinIO operation metrics ───────────────────────────────────

MINIO_OP_DURATION = Histogram(
    "unishelf_minio_operation_seconds",
    "MinIO operation latency",
    ["operation"],  # upload / download / delete
)

# ── Gemini / AI suggestion metrics ────────────────────────────

GEMINI_REQUESTS = Counter(
    "unishelf_gemini_requests_total",
    "Calls to the Gemini API",
    ["status"],  # success / timeout / http_error / parse_error / disabled
)

GEMINI_DURATION = Histogram(
    "unishelf_gemini_request_seconds",
    "Gemini API latency",
)

TAG_SUGGESTIONS = Counter(
    "unishelf_tag_suggestions_total",
    "Tag suggestion requests by how they were served",
    ["source"],  # llm / cache / popular / fallback / disabled
)
