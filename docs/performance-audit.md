# UniShelf Performance Audit

**Date:** 2026-08-05
**Method:** Live browser profiling of every page via Chrome DevTools (network request logs, HTTP cache inspection, load trace) against the running compose stack, combined with a code audit of the frontend fetch layer and backend query paths.

**Caveats on the numbers:** the stack runs in dev mode (Next.js dev server, React StrictMode, unminified bundles) and the seed DB has ~22 resources / 7 users. Absolute timings are therefore not representative — every API call answers in 3–12 ms today. What matters is the *shape* of each issue: requests or queries that scale with row count, request count, or tree depth. Each finding notes how it scales.

A note on StrictMode: in dev, React mounts → unmounts → remounts every component, so **every** fetch-on-mount appears twice in the network log. This is dev-only and disappears in production builds. Findings below already exclude StrictMode doubling unless stated.

---

## Summary table

| # | Finding | Area | Impact | Effort |
|---|---------|------|--------|--------|
| 1 | Dead `uploaders` effect fetches `/users/{id}` per uploader, result never rendered | Frontend | High | Trivial (delete) |
| 2 | Search/bookmarks/my-resources fetch the **entire** resource list and filter client-side; server caps at 50 rows so search silently misses older resources | Frontend + API | High (correctness + perf) | Medium |
| 3 | Every search keystroke triggers a Next.js RSC round-trip via `router.replace` | Frontend | Medium | Small |
| 4 | Directory tree endpoint runs 2–3 queries per directory node, recursively | Backend | High at depth | Medium |
| 5 | Missing DB indexes: `visibility.user_id`, `resources.parent_id`, `resources.created_at` | Backend | High at scale | Trivial |
| 6 | Bookmark endpoints load full `Resource` rows to return ids / check membership | Backend | Medium | Small |
| 7 | Thumbnail effect refetches surviving thumbs on every filter keystroke (HTTP cache absorbs it) | Frontend | Low–Medium | Small |
| 8 | `/tags` fetched independently by pages that bypass the Redux cache | Frontend | Low | Small |
| 9 | `ILIKE '%q%'` search can't use the title index | Backend | Medium at scale | Small |
| 10 | Detail-page preview may download the full file twice (inline → download fallback) | Frontend | Low | Small |
| 11 | Upload path reads the whole file into memory twice | Backend | Low | Small |
| 12 | `last_accessed_at` write transaction on every download | Backend | Low | Small |
| 13 | `/users/{id}` responses carry no cache headers; refetched on every full page load | API | Low | Trivial |

Already fixed on this branch (issue #12 work): grid-view previews used to download the **entire file** per image resource via `/download`; they now fetch a ≤512 px cached WebP from `/resources/{id}/thumbnail` (~100 B–1 KB each), in parallel, with `Cache-Control: private, max-age=3600`.

---

## High impact

### 1. Dead `uploaders` effect on the search page — N requests for nothing

`frontend/app/(app)/search/page.tsx:91,135–174`

The page keeps an `uploaders` state array and an effect that fetches `/api/users/{id}` for every unique, non-anonymous uploader in the result set. **The state is never read anywhere in the render.** Uploader names are actually displayed by `UserLabel`, which has its own module-level cache and deduped in-flight fetches (`frontend/components/ui/user-label.tsx`).

Worse, the effect depends on `[resources, uploaders]`, and `resources` here is `state.resources.items`, whose identity changes on every store write — so the batch refires. Measured on one search page load: `users/5`, `users/2`, `users/6`, `users/4` each fetched **3×** (once by UserLabel, twice by this effect across re-runs).

**Fix:** delete the `uploaders` state, the effect, and the unused import. `UserLabel` already does the job with caching. This is the single best effort-to-payoff fix in the codebase.

Scaling: requests grow O(unique uploaders × effect re-runs) per page view.

### 2. Client-side filtering over a server-truncated list

`frontend/app/(app)/search/page.tsx:114,197–239`, `frontend/app/(app)/bookmarks/page.tsx:29`, `frontend/app/(app)/my-resources/page.tsx`

All three pages call `dispatch(fetchResources())` with no parameters, pull the whole list into Redux, and do every bit of filtering (text, type, tags, date) in JavaScript. Three problems:

1. **Correctness:** `GET /resources` defaults to `limit=50` (`backend/app/controllers/resources/router.py:207`). Once the university has >50 resources, search silently ignores everything but the 50 newest. No error, no indicator.
2. **Payload:** the full list (with tags) ships to the client on every page that touches resources. 12.5 KB at 22 rows; grows linearly.
3. **Wasted server capability:** the backend already supports `q`, `tags`, `uploader_id`, `hierarchy`, `skip`/`limit` — and `fetchResources` in `resourceSlice.ts` even accepts `q`/`tags` params. Nothing passes them.

The bookmarks page is the starkest case: it downloads *all* resources to display the handful whose ids appear in `/users/me/bookmarks` (which returns bare ids).

**Fix (incremental):**
- Search: pass the debounced query + selected tags to `fetchResources({q, tags})`; add `skip`/`limit` paging (server ordering is already deterministic for stable pagination). Keep type/date filters client-side per page if desired.
- My-resources: use the existing `uploader_id` param.
- Bookmarks: either a backend endpoint returning hydrated bookmarked resources, or accept an `ids` filter on `GET /resources`.

Scaling: today O(total resources) per page view; after fix O(page size).

### 4. Recursive N+1 in the directory tree endpoint

`backend/app/controllers/resources/router.py:868–928` (`_build_children_tree`)

Every directory node triggers a fresh query (plus a `selectinload(tags)` second query — **tags are never serialized into the response**, so that load is pure waste). A tree with D directories costs ~2D+ queries, sequentially, per visit to any resource detail page (the dirtree sidebar calls `/tree/children?max_depth=3` on every detail view).

Measured even at toy scale: `/resources/1/tree/children` = 11.1 ms vs 3.8 ms for a flat single-row endpoint.

`get_resource_parents` (`router.py:953–994`) has the same shape: one resource query **plus** one `Visibility` ACL query per ancestor level (`check_resource_access` hits the DB each call), so 2 queries × depth.

**Fix:**
- Children: one query — `hierarchy <@ :prefix AND nlevel(hierarchy) <= :bound` with the existing visibility filter, then assemble the tree in Python from `parent_id`. Drop the tags eager-load.
- Parents: walk `parent_id` in memory is fine, but batch it — collect the ancestor chain with one recursive CTE (or the bounded loop without per-level ACL queries), then a single `Visibility` query `WHERE resource_id IN (...) AND user_id = :uid`.

Scaling: queries per request drop from O(directories) / O(depth) to O(1).

### 5. Missing indexes on hot filter columns

Postgres does **not** auto-index FK columns. Three that matter:

| Column | Used by | Today |
|--------|---------|-------|
| `visibility.user_id` | The two ACL subqueries executed on **every** `GET /resources` and every tree query (`router.py:233–243`) | No index. `uq_visibility_resource_user` leads with `resource_id`, so `user_id`-only lookups can't use it |
| `resources.parent_id` | `_collect_descendants` BFS (archive/restore cascades), tree building, children lookups | No index — each level is a seq scan |
| `resources.created_at` | `ORDER BY created_at DESC` on the default listing (`router.py:280`) | No index — sort on every list request |

**Fix:** three `Index(...)` additions in the models (`visibility.py`, `resource.py`). Since the project uses `create_all` without migrations, either recreate dev DBs or add the indexes manually/via a migration tool.

Scaling: turns per-request seq scans into index lookups; the `visibility.user_id` one is on the critical path of literally every resource listing.

---

## Medium impact

### 3. One RSC request per search keystroke

`frontend/app/(app)/search/page.tsx:186–195` (`syncFilters` → `router.replace`)

Typing "calculus" produced 8 sequential `GET /search?q=…&_rsc=…` requests — `router.replace` performs a client navigation, and Next fetches the route's RSC payload each time, per character. The URL sync is purely cosmetic (shareable links); no data depends on it.

**Fix:** use `window.history.replaceState(null, '', url)` for filter/URL sync (React docs endorse this for URL-as-state), or debounce `syncFilters` alongside the suggestions debounce. Zero server requests after that.

### 6. Bookmark endpoints hydrate full ORM rows for id-level work

`backend/app/controllers/users/router.py:48–80`

- `GET /me/bookmarks` returns `[r.id for r in current_user.bookmarked_resources]` — lazy-loads every bookmarked `Resource` row (all columns) to throw away everything but the id.
- `add/remove_bookmark` do `resource in current_user.bookmarked_resources` — loads the entire collection to test membership.

**Fix:** query the association table directly (`select(bookmarks.c.resource_id).where(user_id == …)`), and use an `EXISTS`/direct insert-delete for membership. O(bookmarks) row hydration → O(1).

### 9. `ILIKE '%q%'` can't use the title index

`backend/app/controllers/resources/router.py:258–264`

Leading-wildcard `ILIKE` forces a seq scan regardless of the index on `title`; `filename` isn't indexed at all. Fine at hundreds of rows, painful at tens of thousands.

**Fix (when scale demands):** a `pg_trgm` GIN index on `title`/`filename` (supports `ILIKE '%…%'` directly), or proper Postgres full-text search. Pairs naturally with fix #2 (server-side search becomes the only search).

---

## Low impact / hygiene

### 7. Thumbnail refetch churn while typing

`frontend/components/dashboard/resource-table-card.tsx` — as the filtered subset shrinks per keystroke, the effect's key changes, blob URLs are revoked and surviving thumbnails re-requested. **Verified mitigated:** repeats are served from the browser HTTP cache (response `date` headers show the original fetch time) thanks to `Cache-Control: private, max-age=3600`, so no server round-trips occur — but object-URL creation/revocation still churns per keystroke. A module-level blob cache keyed by `id:size` (same pattern as `UserLabel.profileCache`) would make filter changes free. Do this if fix #2's server-side search makes list identity churn more frequent.

### 8. `/tags` fetched outside the Redux cache

The tag slice guards with `if (allTags.length === 0)`, but the resource detail page fetches `/tags` with local state (`resources/[id]/page.tsx:139–155`), and the bookmarks page load showed `/tags` 3× (slice + local fetches). Consolidate on `fetchTags()`.

### 10. Detail-page preview double download

`resources/[id]/page.tsx:382–501` — PDF/image preview tries `download?inline=1` and on *content-type mismatch or error* falls back to plain `download`, i.e. the full file twice in the worst case. The fallback predates the current backend behavior; consider dropping it or gating it on specific statuses.

### 11. Upload reads the whole file into memory twice

`resources/router.py:131–150` reads the full upload for the size check, seeks back, then `minio_client.upload_file` reads it all again. Bounded by `MAX_UPLOAD_SIZE_MB`, but it doubles peak memory per concurrent upload; pass the already-read bytes (or stream with `put_object(part_size=…)`).

### 12. Write transaction per download

`download_resource` commits `last_accessed_at` before streaming every file. Harmless now; under load, consider a background/batched update so downloads are read-only transactions.

### 13. No cache headers on immutable-ish lookups

`/users/{id}` (public profile) and `/tags` return no `Cache-Control`, so every full page load refetches them. `UserLabel`'s in-memory cache only lives per page session. A modest `private, max-age=300` would eliminate most of these. (The thumbnail endpoint already does this.)

---

## Page-by-page request counts (dev, StrictMode doubling included)

| Page | XHR/fetch on load | Notes |
|------|-------------------|-------|
| `/search` | 29 (17 thumbnail, 4 users, 2 resources, 2 tags, suggestions, me, bookmarks) | plus finding #1's extra user refetches |
| `/bookmarks` | 7 | fetches the full resource list to render bookmarks (#2) |
| `/my-resources` | 15 | full list + client filter (#2); thumbnails behave |
| `/resources/25` | 12 | tree children+parents doubled; full-file download for preview (expected for pdf.js) |
| `/admin` | 6 | clean |
| `/moderate` | 6 | clean; UserLabel cache dedupes reporters |
| Typing "calculus" in search | 8 RSC + ~20 thumbnail (all HTTP-cache hits) + 1 suggestions | findings #3, #7 |

Load trace (`/search`, dev): LCP 1138 ms — 40 ms TTFB, ~1100 ms render delay (dev-mode React; re-measure on a production build before optimizing render paths).

## Suggested order of attack

1. **#1** — delete the dead effect (minutes, immediate request reduction).
2. **#5** — add the three indexes (minutes, protects every listing).
3. **#3** — `replaceState` for URL sync (small, kills per-keystroke round-trips).
4. **#2** — server-side search + pagination (the real project; also fixes the 50-row correctness bug).
5. **#4 + #6** — batch the tree and bookmark queries.
6. Rest as hygiene when touching the relevant files.
