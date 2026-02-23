# UniShelf

UniShelf is a centralized academic resource sharing platform designed for university ecosystems. It enables students to upload, organize, discover, and access educational materials such as PDFs, images, and other resources in a structured manner.

## Tech Stack

*   **Frontend:** Next.js 15+ (React), Tailwind CSS
*   **Backend:** FastAPI (Python), SQLAlchemy
*   **Database:** PostgreSQL
*   **Storage:** MinIO (S3-compatible object storage)
*   **Proxy:** Nginx (Reverse proxy, caching, compression)
*   **Authentication:** JWT (JSON Web Tokens)
*   **Infrastructure:** Docker, Docker Compose
*   **Package Managers:** Bun (Frontend), uv (Backend)

## Prerequisites

*   **Docker & Docker Compose** (Recommended for the full stack experience)
*   **Bun** (v1.0+) (for local frontend development)
*   **uv** (for local backend development)

## Getting Started

### Option 1: Using Docker (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd unishelf
    ```

2.  **Run with Docker Compose:**
    ```bash
    docker-compose up --build
    ```
    This will start the entire stack:
    *   **Web App (Nginx):** http://localhost:8000
    *   **Frontend (Next.js):** http://localhost:3000 (Direct access)
    *   **Backend API:** http://localhost:8000/api
    *   **MinIO Console:** http://localhost:9001
    *   **PostgreSQL Database:** Port 5432

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

3.  Run the development server:
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
    *   Create an account or log in with existing credentials.

2.  **Dashboard:**
    *   **Upload:** Use the "Upload Resource" form.
        *   Click **"Choose File"** to select a document.
        *   The button changes to a red **"Remove File"** button if you need to change your selection.
        *   Enter a title and description, then click **"Upload"**.
    *   **Download:** Browse the list of available resources and click **"Download"** to retrieve files.

## Project Structure

*   `backend/`: FastAPI application code managed with `uv`.
    *   `app/`: Main application logic (models, schemas, auth, endpoints).
*   `frontend/`: Next.js application code managed with `bun`.
    *   `app/`: App router pages (Login, Dashboard, Signup).
*   `nginx/`: Nginx configuration for reverse proxying.
*   `data/`: Persistent data for databases (gitignored).
*   `docker-compose.yml`: Docker orchestration configuration.

## Authors

*   Tiya Ananta
*   Prachi Raghunath Tandel
*   Mohammed Sadiq Ali
*   Varun Tangtur
