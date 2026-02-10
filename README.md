# UniShelf

UniShelf is a centralized academic resource sharing platform designed for university ecosystems. It enables students to upload, organize, discover, and access educational materials such as PDFs, images, and other resources in a structured manner.

## Tech Stack

*   **Frontend:** Next.js (React), Tailwind CSS
*   **Backend:** FastAPI (Python), SQLAlchemy
*   **Database:** PostgreSQL (with SQLite fallback for local/PoC development)
*   **Authentication:** JWT (JSON Web Tokens)
*   **Infrastructure:** Docker, Docker Compose

## Prerequisites

*   **Docker & Docker Compose** (Recommended for full stack experience)
*   **Node.js** (v18+) & **npm** (for local frontend)
*   **Python** (v3.9+) (for local backend)

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
    This will start:
    *   **PostgreSQL Database:** Port 5432
    *   **Backend API:** http://localhost:8000
    *   **Frontend App:** http://localhost:3000

### Option 2: Local Development (Without Docker)

#### Backend

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```

2.  Create a virtual environment and activate it:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Run the server:
    ```bash
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```
    *   Note: By default, it uses SQLite (`unishelf.db`). To use Postgres, set the `DATABASE_URL` environment variable.

#### Frontend

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```
    The app will be available at http://localhost:3000.

## Usage

1.  **Register:**
    *   Go to http://localhost:3000.
    *   Click "Need an account? Register".
    *   Enter a university email (must end in `.edu` or similar for validation logic) and password.

2.  **Login:**
    *   Use your registered credentials to log in.

3.  **Dashboard:**
    *   **Upload:** Use the upload form to add a new resource (PDFs recommended for PoC).
    *   **View:** See the list of uploaded resources below the upload form.

## API Documentation

Once the backend is running, you can access the interactive API documentation (Swagger UI) at:

*   http://localhost:8000/docs

## Project Structure

*   `backend/`: FastAPI application code.
    *   `app/`: Main application logic (models, schemas, auth, endpoints).
*   `frontend/`: Next.js application code.
    *   `app/`: App router pages (Login, Dashboard).
*   `unishelf/`: Project documentation (Phase 1 & Phase 2 docs).
*   `docker-compose.yml`: Docker orchestration configuration.

## Authors

*   Tiya Ananta
*   Prachi Raghunath Tandel
*   Mohammed Sadiq Ali
*   Varun Tangtur
