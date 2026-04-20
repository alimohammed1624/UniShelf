# UniShelf

A centralized academic resource sharing platform for university ecosystems. Students can upload, organize, discover, and access educational materials in a structured manner.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15+ (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy |
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

> Registration requires a `.edu` email address. Run `uv run seed_db.py` inside the backend container to populate sample data.

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
- Organize resources with hierarchical parent-child relationships
- Tag resources for easy discovery; manage system-wide tags
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
