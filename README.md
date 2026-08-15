# UniShelf

A centralized document storage and sharing platform for organisations. Members upload, organize, discover, and access their organisation's files in a real directory structure, with per-resource access control and optional anonymous uploads.

Each deployment serves one organisation and is bound to its email domain via `ALLOWED_EMAIL_DOMAINS`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15+ (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI(version 0.136.3 or earlier), SQLAlchemy |
| Database | PostgreSQL |
| Object Storage | MinIO (S3-compatible) |
| Auth | JWT (OAuth2 Password Flow) |
| Infra | Docker Compose, Nginx |
| Monitoring | Prometheus + Grafana |

## Quick Start

```bash
git clone https://github.com/alimohammed1624/UniShelf.git && cd UniShelf
cp env.example .env
docker compose up --build
```

The app is available at **http://localhost:8000**.

| Service | URL |
|---------|-----|
| Web App (via Nginx) | http://localhost:8000 |
| Backend API docs (Swagger) | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |
| Grafana Dashboards | http://localhost:8000/grafana |
| Prometheus Metrics | http://localhost:8000/metrics |

> Registration is limited to the domains in `ALLOWED_EMAIL_DOMAINS` (`unishelf.app` in `env.example`). Leave the setting blank to accept any domain.

## Database Seeding

The seed script populates the database with a demo organisation: users at every role, a department directory tree, and the states the app is built to handle — anonymous uploads, whitelist/blacklist entries, an open moderation queue, a moderation takedown alongside an owner's own archive, bookmarks, and interest tags. Files are really uploaded to MinIO, so previews and thumbnails work.

```bash
# Seed without clearing existing data
docker compose exec backend python seed_db.py

# Wipe all data first, then seed fresh
docker compose exec backend python seed_db.py --reset
```

**Seeded accounts:**

| Email | Password | Role |
|-------|----------|------|
| superadmin@unishelf.app | Super123! | Super Admin |
| admin@unishelf.app | Admin123! | Admin |
| admin2@unishelf.app | Admin123! | Admin |
| mod@unishelf.app | Mod123! | Moderator |
| member1@unishelf.app | Member123! | Member |
| member2@unishelf.app | Member123! | Member (must change password) |
| banned@unishelf.app | Member123! | Member (suspended) |

The script creates 7 users, 17 tags across free-form categories, and 29 resources in a department hierarchy (`engineering`, `people`, `finance`, `design`) with sample file content uploaded to MinIO. Re-running without `--reset` is safe: existing rows are left alone.

`engineering.architecture` and `finance` are seeded private, so their contents demonstrate inherited privacy; `member1` holds whitelist entries on both and `member2` is blacklisted from one otherwise-public runbook.

## Local Development

### Backend (requires **uv**)
```bash
cd backend && uv sync && cp ../env.example .env
uv run fastapi dev app/main.py   # → http://localhost:8000
```

### Frontend (requires **Bun**)
```bash
cd frontend && bun install
bun run dev                       # → http://localhost:3000
```

## Features

- Upload and share PDFs, images, and documents via MinIO object storage
- Organize resources with logical parent-child hierarchy
- Tag resources for discovery; manage system-wide tags with free-form categories
- Public/private resource visibility with per-user access control (whitelist/blacklist)
- Anonymous uploads support
- User management: role changes, ban/unban (admin)
- Prometheus metrics and Grafana dashboards for monitoring

## Project Structure

```
backend/          FastAPI app — controllers/, models/, utils/
frontend/         Next.js 15+ App Router — app/(app)/, components/, hooks/
nginx/            Reverse proxy & caching config
prometheus/       Metrics collection config
grafana/          Dashboard provisioning
data/             Persistent volumes (gitignored)
compose.yaml      Docker orchestration
```

## Environment Variables

See `env.example` for all options. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `unishelf` | Database username |
| `POSTGRES_PASSWORD` | `unishelf_password` | Database password |
| `MINIO_ROOT_USER` | `minioadmin` | MinIO access key |
| `MINIO_ROOT_PASSWORD` | `minioadmin123` | MinIO secret key |
| `GRAFANA_ADMIN_PASSWORD` | `admin` | Grafana admin password |

## Authors

Tiya Ananta · Prachi Raghunath Tandel · Mohammed Sadiq Ali · Varun Tangtur
