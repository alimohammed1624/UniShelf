# UniShelf

UniShelf is a centralized academic resource sharing platform designed for university ecosystems. It enables students to upload, organize, discover, and access educational materials such as PDFs, images, and other resources in a structured manner.

## Tech Stack

*   **Frontend:** Next.js 15+ (React), TypeScript, Tailwind CSS
*   **Backend:** FastAPI (Python), SQLAlchemy
*   **Database:** PostgreSQL
*   **Storage:** MinIO (S3-compatible object storage)
*   **Proxy:** Nginx (Reverse proxy, caching, compression)
*   **Authentication:** JWT (JSON Web Tokens)
*   **Infrastructure:** Docker, Docker Compose
*   **Package Managers:** Bun (Frontend), uv (Backend)
*   **Monitoring:** Prometheus + Grafana

## Prerequisites

*   **Docker & Docker Compose** (Recommended for the full stack experience)
*   **Bun** (v1.0+) (for local frontend development)
*   **uv** (for local backend development)

## Getting Started

### Option 1: Using Docker (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/alimohammed1624/UniShelf.git
    cd UniShelf
    ```

2.  **Create environment file:**
    ```bash
    cp env.example .env
    ```
    Review and customize the `.env` file if needed (database credentials, MinIO settings, etc.)

3.  **Run with Docker Compose:**
    ```bash
    docker compose up --build
    ```

    This will start the entire stack:
    *   **Web App (Nginx):** http://localhost:8000
    *   **Frontend (Next.js):** http://localhost:3000 (Direct access)
    *   **Backend API:** http://localhost:8000/api
    *   **MinIO Console:** http://localhost:9001
    *   **Grafana Dashboards:** http://localhost:8000/grafana (Admin password from `.env` or default `admin`)
    *   **Prometheus Metrics:** http://localhost:8000/metrics

### Option 2: Local Development

#### Backend

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```

2.  Install dependencies using `uv` (creates virtual environment automatically):
    ```bash
    uv sync
    ```

3.  Copy `env.example` and configure your environment variables:
    ```bash
    cp ../env.example .env
    ```

4.  Run the development server:
    ```bash
    uv run fastapi dev app/main.py
    ```
    The API will be available at http://localhost:8000.

#### Frontend

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies using `bun`:
    ```bash
    bun install
    ```

3.  Run the development server (configured with Turbopack for speed):
    ```bash
    bun run dev
    ```
    The app will be available at http://localhost:3000.

## Usage

1.  **Register/Login:**
    *   Access the app at http://localhost:8000.
    *   Create an account with a valid university email address (.edu domain).
    *   Log in with your credentials.

2.  **Dashboard:**
    *   **Upload Resources:** Use the "Upload Resource" form.
        *   Click **"Choose File"** to select a document (PDF, images, etc.).
        *   Enter a title and description.
        *   Assign existing tags or create new ones.
        *   Click **"Upload"** to save.
    *   **Download Resources:** Browse the list of available resources and click **"Download"** to retrieve files.
    *   **Edit/Delete Resources:** Modify metadata or remove your uploaded resources.
    *   **Manage Tags:** Assign tags to resources, create new tags, and remove existing tag assignments.

3.  **User Profile:**
    *   View your profile at `/api/users/me`
    *   Update your full name or change your password
    *   Manage interest tags for personalized resource recommendations

## Features

### For Students & Faculty
*   Upload and share educational resources (PDFs, images, documents)
*   Organize resources with hierarchical folder-like structure
*   Tag resources with custom categories for easy discovery
*   Set resources as public or private
*   Enable anonymous uploads when needed
*   Track resource access history

### For Admins & Moderators
*   **User Management:** Ban/unban users, change user roles
*   **Resource Oversight:** View all resources including archived ones
*   **Tag Management:** Create and manage system-wide tags
*   **Visibility Control:** Whitelist/blacklist specific users for resource access

### Infrastructure Features
*   Persistent storage using PostgreSQL and MinIO
*   Docker-based orchestration with health checks
*   Prometheus metrics for monitoring API performance
*   Grafana dashboards for visualizing platform usage

## Environment Variables

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` | Database username |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_DB` | Database name |
| `POSTGRES_PORT` | Database port (default: 5432) |
| `MINIO_ROOT_USER` | MinIO access key |
| `MINIO_ROOT_PASSWORD` | MinIO secret key |
| `MINIO_BUCKET_NAME` | MinIO bucket for uploads |
| `MINIO_CONSOLE_URL` | MinIO console URL for browser access |
| `NEXT_PUBLIC_API_URL` | Backend API endpoint (frontend) |
| `DEBUG` | Enable debug mode |
| `APP_PORT` | Application port |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password |

## Project Structure

*   `backend/`: FastAPI application code managed with `uv`.
    *   `app/controllers/`: API endpoints (auth, users, resources, tags, admin)
    *   `app/models/`: SQLAlchemy models and database tables
    *   `app/utils/`: Utility functions (MinIO client, metrics)
*   `frontend/`: Next.js application code managed with `bun`.
    *   `app/`: App router pages (Login, Signup, Dashboard)
    *   `components/`: Reusable UI components
    *   `hooks/`: Custom React hooks (resource management)
*   `nginx/`: Nginx configuration for reverse proxying and caching
*   `prometheus/`: Prometheus metrics configuration
*   `grafana/`: Grafana dashboard provisioning
*   `data/`: Persistent data for databases (gitignored)
*   `compose.yaml`: Docker orchestration configuration

## API Documentation

Once the backend server is running, visit:
*   Swagger UI: http://localhost:8000/docs


## Authors

*   Tiya Ananta
*   Prachi Raghunath Tandel
*   Mohammed Sadiq Ali
*   Varun Tangtur
