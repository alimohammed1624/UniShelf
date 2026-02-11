**Study Project – Phase 2 Document Template**

*(Design & Proof of Concept)*

---

**Cover Page**

**Course Title:** [Course Name]

**Project Title:** UniShelf

**Student Name(s):** [Your Name]

**Student ID(s):** [Your ID]

**Project Advisor / Supervisor:** [Advisor Name]

**Date of Submission:** [Date]

---



**1\. Introduction**

**1.1 Purpose of Phase 2**

The purpose of Phase 2 is to design the architecture for UniShelf and implement a Proof of Concept (PoC) to validate the core functionalities. This phase transforms the problem statement from Phase 1 into a concrete system design with a working prototype.

---

**1.2 Scope of Phase 2**

Phase 2 includes:
*   **System Architecture Design:** Detailed breakdown of frontend, backend, database, and infrastructure components.
*   **Functional Requirements:** Specification of core features implemented in the PoC.
*   **Database Design:** High-level schema for users and resources.
*   **Proof of Concept (PoC):** A functional prototype demonstrating:
    *   University-specific authentication (email domain restriction).
    *   Resource uploading with metadata (title, tags).
    *   Resource discovery (feed/list view).

---





**2\. System Overview**

**2.1 Product Perspective**

UniShelf is a web-based platform designed as a centralized academic hub for university students. It operates as a standalone system with potential integrations for university single sign-on (SSO) in the future. The system is containerized using Docker for consistent deployment.

---

**2.2 Major System Functions**

*   **User Management:** Registration and login with email verification (restricted to `@example.ac.in` domain).
*   **Resource Management:** Uploading files (PDFs, images) with descriptions and tags.
*   **Search & Discovery:** Browsing uploaded resources filtering by tags.

---

**2.3 User Classes and Characteristics**

*   **Students:** Primary users who upload and view study materials.
*   **Administrators:** (Future) Users who moderate content and manage user access.

---





**3\. Functional Requirements**

*   **FR1 (Authentication):** The system shall allow users to register using only a valid university email address (`@example.ac.in`).
*   **FR2 (Login):** The system shall authenticate users and issue a JWT for session management.
*   **FR3 (Upload):** The system shall allow authenticated users to upload files with a title, description, and tags.
*   **FR4 (View):** The system shall display a list of uploaded resources, including metadata (uploader, date, tags).
*   **FR5 (Filter):** The system shall allow users to filter resources by tags.

---





**4\. Non-Functional Requirements**

**4.1 Performance Requirements**

*   The system should handle concurrent uploads and downloads with minimal latency.
*   API response time should be under 200ms for metadata queries.

**4.2 Security Requirements**

*   Passwords must be hashed using bcrypt before storage.
*   API endpoints must be protected using JWT (JSON Web Tokens).
*   File uploads should be validated for size and type (future scope).

**4.3 Usability Requirements**

*   The UI should be responsive and accessible on mobile and desktop devices.
*   Clean and intuitive interface using modern design principles (ShadCN UI).

**4.4 Scalability and Maintainability**

*   Microservices-ready architecture (Frontend and Backend separated).
*   Dockerized environment for easy scaling and deployment.

---





**5\. System Architecture and Design**

**5.1 System Architecture Diagram**

*   **Client (UI):** Next.js application (React) running on Node/Bun.
*   **Reverse Proxy:** Nginx handling request routing between UI and API.
*   **Backend (API):** FastAPI (Python) application handling business logic.
*   **Database:** PostgreSQL (or SQLite for local PoC) storing user and resource data.
*   **File Storage:** Local filesystem (for PoC) or Object Storage (S3, MinIO) for production.

---

**5.2 Module-wise Design**

*   **Auth Module:** Handles user registration, login, and token generation.
*   **Resource Module:** Handles file upload, metadata storage, and retrieval.
*   **UI Module:** specific pages for Login, Signup, and Dashboard.

---

**5.3 Data Flow Design**

1.  **User Registration:** User -> UI -> API (POST /auth/signup) -> DB (Insert User).
2.  **File Upload:** User -> UI -> API (POST /resources/upload) -> File System (Save File) & DB (Insert Metadata).
3.  **View Resources:** User -> UI -> API (GET /resources) -> DB (Select Resources) -> UI (Render List).

---

**5.4 Database Design**

**Entities:**

*   **User:**
    *   `id` (Primary Key)
    *   `email` (Unique, Indexed)
    *   `hashed_password`
    *   `full_name`
    *   `is_active`

*   **Resource:**
    *   `id` (Primary Key)
    *   `title`
    *   `description`
    *   `tags`
    *   `file_path`
    *   `owner_id` (Foreign Key to User)
    *   `uploaded_at`

---





**6\. Technology Stack and Justification**

**Frontend:**

*   **Next.js (React):** Framework for server-side rendering and static site generation, ensuring performance and SEO.
*   **Bun:** Fast JavaScript runtime and package manager.
*   **ShadCN UI / Tailwind CSS:** For rapid, accessible, and customizable UI development.

**Backend:**

*   **FastAPI (Python):** High-performance web framework for building APIs with automatic documentation (Swagger UI).
*   **SQLModel / SQLAlchemy:** Modern ORM for interacting with SQL databases using Python type hints.
*   **uv:** Extremely fast Python package installer and resolver.

**Database:**

*   **PostgreSQL:** Robust, open-source relational database (swappable with SQLite for PoC).

**Infrastructure:**

*   **Docker:** Containerization for consistent development and deployment environments.
*   **Nginx:** Reverse proxy for routing and load balancing.

---





**7\. Proof of Concept (PoC)**

**7.1 PoC Description**

The PoC implements the core "Happy Path" for a student:
1.  Registering with a university email.
2.  Logging in to the dashboard.
3.  Uploading a study material (PDF/Image).
4.  Viewing the uploaded material in the feed.

The PoC validates the feasibility of the chosen tech stack and the "University Specific" constraint.

---

**7.2 PoC Demonstration Details**

*   **Source Code:** Available in the `ui` and `api` directories.
*   **Screenshots:** (To be added after verification).
*   **Current Limitations:**
    *   Files are stored locally on the server.
    *   No email verification (OTP) yet, just domain check.
    *   Basic tag filtering (substring match).

---





**8\. Testing and Validation Strategy**

*   **Manual Testing:** Verifying flows via the UI (Signup, Login, Upload).
*   **API Testing:** Using `curl` or Swagger UI to test endpoints independently.
*   **Component Testing:** Verifying UI components render correctly.

---





**9\. Risks, Challenges, and Mitigation**

**Identified Risks**

*   **Deployment Complexity:** Dockerizing Next.js and Python together.
    *   *Mitigation:* Use Docker Compose and separate containers.
*   **File Storage Limits:** Storing files locally in containers is not persistent.
    *   *Mitigation:* Use Docker volumes or external object storage (Phase 3).

---





**10\. Phase 2 Outcomes and Readiness for Phase 3**

**Completed:**
*   Full system architecture design.
*   Functional backend API with Auth and Resources.
*   Functional frontend UI with Dashboard.
*   Docker configuration for local development.

**Readiness:**
The system is ready for Phase 3 (Implementation & Refinement), where we will focus on:
*   Integrating external file storage (S3).
*   Advanced search (Elasticsearch/MeiliSearch).
*   Enhanced security (Role-based access).
*   Production deployment pipeline.

---
