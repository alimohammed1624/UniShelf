"""
AI tag suggestions: context gathering, prompt building, response validation
and caching for POST /tags/suggestions.

Kept out of router.py so the route handler stays readable, the same way
controllers/resources/ splits its helpers out.
"""

import logging
import time
from collections import OrderedDict
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import Resource, Tag, User
from app.models.associations import resource_tags, user_bookmarks
from app.utils import gemini_client

logger = logging.getLogger(__name__)

# ── Tuning constants ──────────────────────────────────────────

# Vocabulary sent to the model. ~15 tokens per tag, so 150 is ~2.5k input
# tokens — cheap on flash and well inside limits.
VOCAB_LIMIT = 150
# Per-signal caps so a heavy user can't blow up the prompt.
SIGNAL_LIMIT = 40
HIERARCHY_LIMIT = 10
REASON_MAX_LEN = 120

CACHE_TTL_SECONDS = 900  # 15 minutes
CACHE_MAX_ENTRIES = 512
# Minimum gap between *LLM* calls for one user. Cache hits are exempt.
USER_COOLDOWN_SECONDS = 2.0
COOLDOWN_MAX_ENTRIES = 1000

# Response shape we ask Gemini for. Deliberately no "enum" on tag: it would
# duplicate the whole vocabulary into the request for a merely probabilistic
# constraint, while parse_and_validate() below is an absolute one for free.
SUGGESTION_SCHEMA: Dict[str, Any] = {
    "type": "ARRAY",
    "items": {
        "type": "OBJECT",
        "properties": {
            "tag": {"type": "STRING"},
            "reason": {"type": "STRING"},
        },
        "required": ["tag", "reason"],
    },
}

# ── In-process cache ──────────────────────────────────────────
#
# Safe as a plain dict because entrypoint.sh runs the backend single-process
# (`fastapi dev --reload` or `fastapi run --workers 1`). If the worker count is
# ever raised, this still stays correct — the hit rate just drops to ~1/N and
# Gemini spend rises accordingly.
#
# The cache key includes user_id, and that is what keeps one user's personalised
# suggestions from being served to another. Do not remove it.

_cache: "OrderedDict[Tuple, Tuple[float, List[Tuple[Tag, str]]]]" = OrderedDict()
_last_llm_call: Dict[int, float] = {}


def _cache_get(key: Tuple) -> Optional[List[Tuple[Tag, str]]]:
    """Read through the cache, expiring stale entries lazily on access."""
    entry = _cache.get(key)
    if entry is None:
        return None

    stored_at, value = entry
    if time.monotonic() - stored_at > CACHE_TTL_SECONDS:
        del _cache[key]
        return None

    _cache.move_to_end(key)
    return value


def _cache_put(key: Tuple, value: List[Tuple[Tag, str]]) -> None:
    _cache[key] = (time.monotonic(), value)
    _cache.move_to_end(key)
    while len(_cache) > CACHE_MAX_ENTRIES:
        _cache.popitem(last=False)


def _cooldown_active(user_id: int) -> bool:
    """
    Whether this user called the LLM too recently. Backstop for a scripted
    client that varies the query enough to miss the cache every time.
    """
    now = time.monotonic()
    last = _last_llm_call.get(user_id)
    if last is not None and now - last < USER_COOLDOWN_SECONDS:
        return True

    # No scheduler in this stack, so prune opportunistically (same lazy
    # approach as clear_expired_ban).
    if len(_last_llm_call) > COOLDOWN_MAX_ENTRIES:
        cutoff = now - USER_COOLDOWN_SECONDS
        for uid in [uid for uid, ts in _last_llm_call.items() if ts < cutoff]:
            del _last_llm_call[uid]

    _last_llm_call[user_id] = now
    return False


# ── Context gathering ─────────────────────────────────────────


def _tag_names_on_bookmarks(db: Session, user_id: int) -> List[str]:
    rows = (
        db.query(Tag.name)
        .join(resource_tags, resource_tags.c.tag_id == Tag.id)
        .join(user_bookmarks, user_bookmarks.c.resource_id == resource_tags.c.resource_id)
        .filter(user_bookmarks.c.user_id == user_id)
        .distinct()
        .limit(SIGNAL_LIMIT)
        .all()
    )
    return [name for (name,) in rows]


def _tag_names_on_uploads(db: Session, user_id: int) -> List[str]:
    rows = (
        db.query(Tag.name)
        .join(resource_tags, resource_tags.c.tag_id == Tag.id)
        .join(Resource, Resource.id == resource_tags.c.resource_id)
        .filter(
            or_(Resource.owner_id == user_id, Resource.uploader_id == user_id),
            Resource.is_archived.is_(False),
        )
        .distinct()
        .limit(SIGNAL_LIMIT)
        .all()
    )
    return [name for (name,) in rows]


def _bookmark_hierarchies(db: Session, user_id: int) -> List[str]:
    """Topic paths (ltree) from the user's bookmarks — cheap, strong signal."""
    rows = (
        db.query(Resource.hierarchy)
        .join(user_bookmarks, user_bookmarks.c.resource_id == Resource.id)
        .filter(user_bookmarks.c.user_id == user_id)
        .distinct()
        .limit(HIERARCHY_LIMIT * 2)
        .all()
    )
    # Filter blanks in Python rather than in SQL — comparing an ltree column
    # against '' needs a cast and buys nothing at this row count.
    paths = [str(h) for (h,) in rows if h and str(h).strip()]
    return paths[:HIERARCHY_LIMIT]


def build_vocabulary(db: Session, signal_names: List[str]) -> List[Tag]:
    """
    Candidate tags for the model: the most-used tags, plus any of the user's own
    signal tags that fall outside that cut so a niche interest stays visible.
    """
    usage = func.count(resource_tags.c.resource_id).label("usage")
    popular = [
        row[0]
        for row in (
            db.query(Tag, usage)
            # outerjoin so brand-new zero-usage tags stay in the vocabulary
            .outerjoin(resource_tags, resource_tags.c.tag_id == Tag.id)
            .group_by(Tag.id)
            # name tiebreak keeps the ordering deterministic — it feeds the cache key
            .order_by(usage.desc(), Tag.name.asc())
            .limit(VOCAB_LIMIT)
            .all()
        )
    ]

    known = {tag.name.lower() for tag in popular}
    missing = [name for name in signal_names if name.lower() not in known]
    if missing:
        extra = db.query(Tag).filter(Tag.name.in_(missing)).all()
        popular.extend(extra)

    return popular


def vocabulary_version(db: Session) -> Tuple:
    """
    Cheap fingerprint of the tag table. Any tag added or deleted changes it, so
    cached suggestions invalidate themselves without a manual bust. A pure
    rename slips through, which is acceptable.
    """
    count, max_id = db.query(func.count(Tag.id), func.max(Tag.id)).one()
    return (count or 0, max_id or 0)


# ── Prompt ────────────────────────────────────────────────────


def build_prompt(
    vocabulary: List[Tag],
    interest_names: List[str],
    bookmark_names: List[str],
    upload_names: List[str],
    hierarchies: List[str],
    query: str,
    selected: List[str],
    limit: int,
) -> str:
    """
    Build the suggestion prompt. Vocabulary goes first: it is the binding
    constraint, and leading context anchors best.
    """
    vocab_lines = []
    for tag in vocabulary:
        parts = [tag.name, tag.category or "", (tag.description or "")[:80]]
        vocab_lines.append(" | ".join(p for p in parts if p))

    sections = [
        "You are helping a university student filter an academic resource library.",
        "",
        "AVAILABLE TAGS (you may ONLY choose from this list, copy names exactly):",
        "\n".join(vocab_lines),
        "",
        "STUDENT PROFILE",
    ]

    profile = [
        ("Stated interests", interest_names),
        ("Tags on resources they bookmarked", bookmark_names),
        ("Tags on resources they uploaded", upload_names),
        ("Topic paths they browse", hierarchies),
    ]
    for label, values in profile:
        if values:
            sections.append(f"{label}: {', '.join(values)}")
    if not any(values for _, values in profile):
        sections.append("(no activity yet — this is a new student)")

    if query:
        sections.append("")
        sections.append(f'CURRENT SEARCH QUERY: "{query}"')
    if selected:
        sections.append(f"ALREADY-SELECTED FILTERS (do NOT suggest these): {', '.join(selected)}")

    sections.extend(
        [
            "",
            f"Return the {limit} tags from AVAILABLE TAGS this student is most likely to",
            "want as a filter right now. Rules:",
            '- Every "tag" value MUST appear verbatim in AVAILABLE TAGS. Never invent a tag.',
            "- Never return a tag listed under ALREADY-SELECTED FILTERS.",
            "- When a CURRENT SEARCH QUERY is present, weight it above the profile.",
            '- "reason" is at most 8 words, addressed to the student.',
            f"- Return fewer than {limit} rather than padding with irrelevant tags.",
        ]
    )

    return "\n".join(sections)


# ── Validation ────────────────────────────────────────────────


def parse_and_validate(
    raw: Any,
    valid_by_name: Dict[str, Tag],
    excluded: set,
    limit: int,
) -> List[Tuple[Tag, str]]:
    """
    Turn a raw model response into (Tag, reason) pairs.

    This is a security control, not just a quality filter: the search query is
    free-form user text that lands in the prompt, so the model's output is
    untrusted. Matching every returned name against the real tag table is what
    guarantees a crafted query can never cause a tag to be invented, created or
    leaked — the worst it can do is produce bad suggestions. Do not relax it.
    """
    if isinstance(raw, dict):
        # The model occasionally wraps the array in a single-key object despite
        # the response schema.
        values = [v for v in raw.values() if isinstance(v, list)]
        raw = values[0] if len(values) == 1 else None

    if not isinstance(raw, list):
        logger.error(f"Gemini suggestions were not a list: {type(raw).__name__}")
        return []

    results: List[Tuple[Tag, str]] = []
    seen = set()
    dropped: List[str] = []

    for item in raw:
        if not isinstance(item, dict):
            continue

        name = str(item.get("tag", "")).strip().lower()
        if not name:
            continue
        if name not in valid_by_name:
            dropped.append(name)  # hallucinated tag names die here
            continue
        if name in excluded or name in seen:
            continue

        seen.add(name)
        reason = str(item.get("reason", "")).strip()[:REASON_MAX_LEN]
        results.append((valid_by_name[name], reason))

        if len(results) >= limit:
            break

    if dropped:
        logger.info(f"Dropped {len(dropped)} hallucinated tag suggestion(s)")
        logger.debug(f"Dropped suggestions: {dropped}")

    return results


# ── Entry point ───────────────────────────────────────────────


def get_suggestions(
    db: Session,
    user: User,
    query: str,
    selected_tags: List[str],
    limit: int,
) -> Tuple[List[Tuple[Tag, str]], str]:
    """
    Return (suggestions, source) where source is one of
    llm / cache / popular / fallback / disabled.

    Never raises for upstream problems — the caller always gets something
    renderable.
    """
    excluded = {name.lower() for name in selected_tags}

    interest_names = [tag.name for tag in user.interest_tags]
    bookmark_names = _tag_names_on_bookmarks(db, user.id)
    upload_names = _tag_names_on_uploads(db, user.id)
    signal_names = list(dict.fromkeys(interest_names + bookmark_names + upload_names))

    vocabulary = build_vocabulary(db, signal_names)
    valid_by_name = {tag.name.lower(): tag for tag in vocabulary}

    def popular_fallback() -> List[Tuple[Tag, str]]:
        # vocabulary is already usage-ordered
        return [(tag, "") for tag in vocabulary if tag.name.lower() not in excluded][:limit]

    # Nothing to personalise on and nothing to search for — a paid call would
    # add no signal, so serve popular tags instead.
    if not signal_names and not query:
        return popular_fallback(), "popular"

    if not gemini_client.is_configured():
        return popular_fallback(), "disabled"

    cache_key = (
        user.id,  # keeps personalised results from crossing users — keep this
        query.lower(),
        tuple(sorted(excluded)),
        limit,
        vocabulary_version(db),
    )
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached, "cache"

    if _cooldown_active(user.id):
        return popular_fallback(), "fallback"

    hierarchies = _bookmark_hierarchies(db, user.id)
    prompt = build_prompt(
        vocabulary,
        interest_names,
        bookmark_names,
        upload_names,
        hierarchies,
        query,
        sorted(excluded),
        limit,
    )

    raw = gemini_client.generate_json(prompt, SUGGESTION_SCHEMA)
    if raw is None:
        return popular_fallback(), "fallback"

    suggestions = parse_and_validate(raw, valid_by_name, excluded, limit)
    if not suggestions:
        # An empty AI section is worse than a useful non-AI one.
        return popular_fallback(), "fallback"

    _cache_put(cache_key, suggestions)
    return suggestions, "llm"
