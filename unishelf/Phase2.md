# **Study Project – Phase 2 Document**

*(Design & Proof of Concept)*

---

**Cover Page**

**Course Title:** Study Project

**Project Title:** UniShelf

**Group Number:** 146

**Student Name(s):**
1. Tiya Ananta (2023EBCS463)
2. Prachi Raghunath Tandel (2023EBCS178)
3. Mohammed Sadiq Ali (2023EBCS072)
4. Varun Tangtur (2023EBCS179)

**Project Advisor / Supervisor:** Lakshya Jain

**Date of Submission:** 4th March, 2026

---

## **1. Introduction**

### **1.1 Purpose of Phase 2**

The purpose of Phase 2 is to transition from the conceptual planning of Phase 1 into a concrete system design and architecture for **UniShelf**. This phase focuses on:
*   Refining the high-level requirements into detailed functional and non-functional specifications.
*   Designing the system architecture, including database schema, API structure, and frontend components.
*   Establishing the technology stack and development environment.
*   Developing a Proof of Concept (PoC) to validate the core technical feasibility, specifically the authentication and resource management workflows.

### **1.2 Scope of Phase 2**

This document covers:
*   **System Design:** Detailed architecture diagram, module breakdown, and data flow.
*   **Database Design:** Entity-Relationship (ER) diagram and schema definitions for Users and Resources.
*   **Requirements Specification:** Comprehensive list of functional and non-functional requirements.
*   **Proof of Concept:** Implementation details of the MVP (Minimum Viable Product) features: User Registration/Login (Auth) and Resource Upload/Listing.

---

## **2. System Overview**

### **2.1 Product Perspective**

UniShelf is a web-based platform designed as a centralized academic hub. Unlike general-purpose file sharing services (Google Drive, Dropbox), UniShelf is context-aware, organizing content by academic structures (Courses, Semesters, Subjects). It operates as a standalone system but integrates with the university ecosystem via email domain verification for authentication. It is designed to be responsive, accessible via desktop and mobile web browsers.

### **2.2 Major System Functions**

*   **Authentication & Authorization:** Secure access using university email verification. Role-based access control (Student, Admin).
*   **Resource Management:** Uploading files (PDFs, images, etc.) with metadata (Title, Description, Tags, Visibility).
*   **Discovery:** Listing and searching for resources.
*   **Access Control:** Owners can set visibility (Public, Private).

### **2.3 User Classes and Characteristics**

*   **Students:** The primary users. They upload study materials, search for resources, and manage their own uploads. They are tech-savvy but require an intuitive UI.
*   **Administrators (Moderators):** Responsible for maintaining platform integrity. They can view all resources (including anonymous uploads), manage user reports, and ban users/content if necessary.

---

## **3. Functional Requirements**

### **FR1: Authentication & User Management**
*   **FR1.1:** The system shall allow users to register using a valid university email address (e.g., ending in `.edu` or `.ac.in`).
*   **FR1.2:** The system shall authenticate users using a password-based mechanism (PoC) or email magic links (Future).
*   **FR1.3:** The system shall issue secure access tokens (JWT) upon successful login.

### **FR2: Resource Management**
*   **FR2.1:** Users shall be able to upload files (PDF, Images, etc.) with a title and optional description.
*   **FR2.2:** The system shall validate file types and enforce size limits (e.g., 50MB).
*   **FR2.3:** Users shall be able to set visibility for their resources (Public/Private).
*   **FR2.4:** The system shall store uploaded files securely and provide retrieval URLs.

### **FR3: Resource Discovery**
*   **FR3.1:** Users shall be able to view a paginated list of available public resources.
*   **FR3.2:** Users shall be able to see details of a resource, including uploader information (unless anonymous).

---

## **4. Non-Functional Requirements**

### **4.1 Performance Requirements**
*   API response time should be under 200ms for standard read operations.
*   File uploads should support concurrent users without system locking.

### **4.2 Security Requirements**
*   Passwords must be hashed using strong algorithms (e.g., bcrypt) before storage.
*   All API endpoints (except public read/auth) must be protected via JWT authorization headers.
*   Input validation must be performed on both client and server sides to prevent injection attacks.

### **4.3 Usability Requirements**
*   The User Interface should be clean, consistent, and responsive (mobile-friendly).
*   Error messages should be descriptive and guide the user to resolution.

### **4.4 Scalability and Maintainability**
*   The backend architecture (FastAPI) should be stateless to allow horizontal scaling.
*   The database (PostgreSQL) should utilize proper indexing on foreign keys and search fields.
*   Codebase should follow modular patterns (Routers, Controllers, Services).

---

## **5. System Architecture and Design**

### **5.1 System Architecture Diagram**

The system follows a standard 3-tier web architecture:

```
Client (Browser)  <--->  Reverse Proxy (Nginx)  <--->  Application Server (FastAPI)  <--->  Database (PostgreSQL)
       |                                                         |
       |                                                         v
       ------------------------------------------------->  File Storage (Local/S3)
```

1.  **Presentation Layer (Frontend):** Next.js application handling UI, Routing, and State.
2.  **Application Layer (Backend):** FastAPI server handling Business Logic, Auth, and Data Orchestration.
3.  **Data Layer:** PostgreSQL for structured data (Users, Metadata) and File System/Object Storage for binary assets.

### **5.2 Module-wise Design**

*   **Frontend Modules:**
    *   `AuthModule`: Login, Register forms, Session management (JWT storage).
    *   `DashboardModule`: Resource listing, Upload Modal/Page.
    *   `UI Components`: Reusable elements (Buttons, Inputs, Cards).

*   **Backend Modules:**
    *   `Auth Router`: `/token`, `/register`. Handles credential validation and token generation.
    *   `Resource Router`: `/resources`. Handles CRUD operations for resources.
    *   `Models`: SQLAlchemy definitions for DB tables.
    *   `Schemas`: Pydantic models for request/response validation.

### **5.3 Data Flow Design**

**Resource Upload Flow:**
1.  User fills upload form (Title, File) on Frontend.
2.  Frontend sends `POST /resources` (Multipart/form-data) with JWT Header.
3.  Backend authenticates token -> Validates file type/size -> Saves file to Storage -> Saves metadata to DB (`resources` table).
4.  Backend returns 201 Created with Resource Object.
5.  Frontend updates the list.

### **5.4 Database Design**

**Entities:**

*   **Users**
    *   `id` (PK, Integer)
    *   `email` (String, Unique)
    *   `hashed_password` (String)
    *   `role` (String)
    *   `created_at` (DateTime)

*   **Resources**
    *   `id` (PK, Integer)
    *   `title` (String)
    *   `description` (String, Nullable)
    *   `file_path` (String)
    *   `visibility` (String)
    *   `uploader_id` (FK -> Users.id)
    *   `created_at` (DateTime)

**(ER Diagram Description):** A `User` has a **One-to-Many** relationship with `Resources`.

---

## **6. Technology Stack and Justification**

*   **Frontend: Next.js (React Framework)**
    *   **Reason:** Provides Server-Side Rendering (SSR) for better performance and SEO (future proofing), robust routing, and excellent developer experience with TypeScript support.
*   **UI Components: Tailwind CSS**
    *   **Reason:** Utility-first CSS framework allows for rapid UI development and easy responsiveness without writing custom CSS files.
*   **Backend: FastAPI (Python)**
    *   **Reason:** High performance (comparable to NodeJS/Go), native async support, automatic API documentation (Swagger UI), and Python's rich ecosystem for potential future data processing/AI features.
*   **Database: PostgreSQL**
    *   **Reason:** Robust open-source relational database, handles complex queries and data integrity better than NoSQL for this relational data model. (Note: PoC uses SQLite for ease of environment setup).
*   **ORM: SQLAlchemy**
    *   **Reason:** Mature, Type-safe database interaction, allowing DB agnosticism (easy switch between SQLite/Postgres).

---

## **7. Proof of Concept (PoC)**

### **7.1 PoC Description**
The Phase 2 PoC implements the critical path of the application:
1.  **User Registration/Login:** Users can sign up with an email and password. The system checks for the university domain format (mocked as checking for `.edu`). Login returns a JWT.
2.  **Resource Upload:** Authenticated users can upload files. The files are stored on the server, and metadata is saved to the database.
3.  **Dashboard:** Users can view a list of all uploaded resources with details.

### **7.2 PoC Demonstration Details**

*   **Login Screen:** A simple form accepting Email and Password. Toggles to Registration mode.
*   **Dashboard:**
    *   **Upload Section:** Form with Title, Description, and File input.
    *   **Resources List:** A list displaying Title, Description, and Uploader ID for existing items.
*   **Backend Validation:** Attempting to register with a non-university email results in an error. Attempting to upload without login results in 401 Unauthorized.

*(Note: The PoC code is available in the project repository under `backend/` and `frontend/`)*

---

## **8. Testing and Validation Strategy**

*   **Unit Testing:** Backend Pydantic schemas validate inputs automatically. Future tests will cover Service logic.
*   **Integration Testing:** Testing the API endpoints using Swagger UI (`/docs`) to ensure Database and Logic interaction works.
*   **Manual Testing:**
    *   Verify Login flow (Success/Fail cases).
    *   Verify Upload flow (File storage check, DB entry check).
    *   Verify Dashboard rendering.

---

## **9. Risks, Challenges, and Mitigation**

*   **Risk:** Docker Rate Limits on CI/CD or Dev environments.
    *   *Mitigation:* Use SQLite for local development/PoC to avoid dependency on pulling heavy Docker images.
*   **Risk:** Large File Storage.
    *   *Mitigation:* PoC uses local storage. Production design plans for S3-compatible storage (MinIO/AWS) to offload storage from the app server.
*   **Risk:** Security of User Data.
    *   *Mitigation:* Implemented bcrypt hashing for passwords immediately. JWT used for stateless auth to minimize session hijacking risks.

---

## **10. Phase 2 Outcomes and Readiness for Phase 3**

**Completed in Phase 2:**
*   Full System Architecture design.
*   Database Schema defined.
*   Technology Stack finalized.
*   **Functional PoC** running with Frontend (Next.js) + Backend (FastAPI).

**Readiness:**
The core infrastructure is in place. The system can register users, authenticate them, and handle basic resource data. Phase 3 will focus on:
*   Implementing the full "Academic Organization" (Course/Semester tagging).
*   Search & Filter implementation (MeiliSearch or DB-based).
*   Deployment to cloud platforms.
*   UI Polish and User Experience improvements.

---

## **11. Supervisor Review and Approval**

**Advisor Feedback:**

**Supervisor Comments:**

**Recommendations:**

**Signature:** _________________________

**Date:** _____________________________
