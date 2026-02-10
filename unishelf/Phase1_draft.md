# **Study Project – Phase 1 Document**

---

**Course Title:** Study Project

**Project Title:** UniShelf

**Group Number:** 146

**Student Name(s):**  1\. Tiya Ananta   
		             2\. Prachi Raghunath Tandel  
		             3\. Mohammed Sadiq Ali  
		             4\. Varun Tangtur

**Student ID(s):** 1\.  2023EBCS463  
		      2\.  2023EBCS178  
		      3\.  2023EBCS072  
		      4\.  2023EBCS179

**Project Advisor / Supervisor:** Lakshya Jain

**Date of Submission:** 2nd February, 2026

---

## **1\. Project Idea Summary**

**Title of Project: UniShelf**

**Abstract:**

This project addresses the fragmented nature of academic resource sharing within university ecosystems. Currently, students rely on multiple platforms like Google Drive, WhatsApp groups, and personal file sharing, resulting in scattered resources, broken links, and difficulty discovering materials not directly shared with them. Our solution is a centralized, university-specific web platform that enables students to upload, organize, and search academic resources including PDFs, videos, code snippets, and other educational materials. The platform uses university email authentication to create a closed academic ecosystem where resources are organized by courses, semesters, and subjects with advanced search and filtering capabilities based on tags for each category that an asset can belong to. By providing a single hub for academic resource discovery and sharing with privacy controls and anonymous upload options, this system aims to improve resource accessibility, reduce redundancy, and foster collaborative learning within university communities.

---

## 

## **2\. Project Background and Motivation**

### **Problem Statement**

**Academic resource sharing in universities faces several critical challenges:**

**The Core Problem:**

* Students struggle to discover and access educational resources that exist within their university community but were not directly shared with them  
* Academic materials are scattered across multiple platforms (Google Drive, messaging apps, email attachments) leading to broken links, expired access, and lost resources over time  
* There is no centralized, searchable repository where students can find course-specific materials, past exam resources, or code examples shared by peers

**Who is Affected:**

* Undergraduate and graduate students who need access to study materials, code examples, and academic resources  
* Students who miss out on valuable resources because they weren't part of specific sharing groups  
* Academic communities that lack a unified platform for knowledge preservation and transfer between batches

**Why Existing Solutions are Insufficient:**

* Google Drive/Dropbox: Requires manual sharing links, resources remain siloed, no discovery mechanism for publicly available materials, link organization becomes chaotic over time  
* Messaging Apps (WhatsApp/Discord): Files get buried in chat history, storage limits, no categorization or search functionality, temporary access  
* Learning Management Systems: Often restricted to enrolled courses only, not suitable for peer-to-peer sharing, limited file type support  
* These solutions lack university-specific organization, advanced filtering by course/semester/subject, and privacy controls for selective sharing

### 

### **Motivation**

**Why This Problem is Worth Solving:**

The fragmentation of academic resources creates inefficiency and inequality in access to educational materials. A centralized platform would democratize access to knowledge within a university, ensuring that valuable resources aren't lost or inaccessible simply because a student wasn't in the right group chat. This promotes collaborative learning and reduces redundant efforts where multiple students search for or recreate the same materials.

**Academic and Technical Relevance:**

* Addresses real-world challenges in information organization and access control  
* Provides practical application of full-stack web development, database design, and system architecture  
* Explores authentication systems, file storage solutions, and search optimization  
* Develops skills in building scalable multi-user platforms

**Course-Driven Motivation:**

This project fulfills the Study Project course requirement by tackling a well-defined problem with clear stakeholders and measurable outcomes. The identified use case—creating a centralized, searchable alternative to fragmented file-sharing platforms—provides scope for implementing various technical concepts while delivering practical value to university communities.

---

## 

## **3\. Educational Value and Course Alignment**

### **Relevance to Course Objectives**

**Course Topics Alignment:**

* **Software Engineering:** Requirements analysis, system design, software architecture patterns  
* **Database Systems:** Schema design, query optimization, data relationships and indexing  
* **Web Technologies:** RESTful API design, client-server architecture, responsive web interfaces  
* **Security:** Authentication systems, access control, privacy management  
* **System Design:** Scalability considerations, file storage strategies, search functionality

**Skills and Concepts Application:**

* Translating user requirements into functional specifications  
* Designing normalized database schemas for complex relationships  
* Implementing role-based access control and privacy mechanisms  
* Building RESTful APIs with proper endpoint design and documentation  
* Creating responsive, user-friendly interfaces with modern frameworks

**Practical Application of Theory:**

* Applying database normalization principles to resource metadata storage  
* Implementing authentication and authorization concepts in a real system  
* Using search algorithms and filtering logic for resource discovery  
* Managing file uploads and storage with appropriate validation

### **Learning Outcomes**

**Technical Skills:**

* Full-stack development using Next.js (frontend), FastAPI (backend), and PostgreSQL (database)  
* RESTful API design and implementation with proper HTTP methods and status codes  
* Database schema design with relationships, constraints, and indexes  
* File handling, storage management, and content serving  
* Authentication implementation using university email verification  
* Deployment and configuration using nginx as a reverse proxy

**Analytical and Design Skills:**

* Requirements gathering and functional specification writing  
* System architecture design for multi-user platforms  
* Database modeling for complex many-to-many relationships (users, resources, tags, permissions)  
* Access control design for public, private, and selective sharing scenarios  
* Search and filter logic design for multi-criteria queries

**Tool and Framework Exposure:**

* PostgreSQL for relational database management  
* FastAPI for Python-based API development with automatic documentation  
* Next.js for server-side rendered React applications  
* nginx for web server and reverse proxy configuration  
* Free hosting platforms (Vercel/Netlify for frontend, Railway/Render for backend)  
* Git for version control and team collaboration

**Problem-Solving and Documentation Skills:**

* Breaking down complex requirements into manageable features  
* Writing technical documentation for APIs and system architecture  
* Creating user-focused feature specifications  
* Risk analysis and mitigation planning  
* Collaborative development and task distribution

---

## **4\. Objectives**

### **Primary Objectives**

1. Develop a centralized resource sharing platform that allows university students to upload, store, and access academic materials in a single location  
2. Implement resource download functionality alongside in-platform viewing capabilities  
3. Implement university-specific ecosystem controls using email-based authentication to ensure only verified university members can access the platform  
4. Create comprehensive search and filtering capabilities enabling users to discover resources by title, description, tags, course name, semester, resource type, and other tags  
5. Build flexible privacy and sharing controls supporting public resources, private resources, and selective sharing with specific users or users with a tag  
6. Enable multi-format resource support with initial focus on PDF rendering and storage support for videos, video links, code files, images, and other academic materials (File Rendering)  
7. Provide optional anonymous upload functionality while maintaining admin/moderator visibility for accountability and verification based on reporting

### **Secondary Objectives**

1. Add support for GitHub repository links and syntax-highlighted code viewer with copy functionality  
2. Create custom university branding options to allow institutions to personalize the platform  
3. Develop user-specific bookmarking and non-curated personalization features  
4. Caching (Redis)

---

## 

## **5\. Research and Analysis**

### **Existing Solutions**

**Google Drive / Dropbox:**

* **Approach:** Cloud storage with folder-based organization and link sharing  
* **Limitations:** Resources remain isolated in individual accounts, no centralized discovery mechanism, shared links become difficult to organize at scale, no academic-specific categorization, links can expire or break over time, no filtering by course/semester/subject

**Learning Management Systems (Moodle, Canvas, Blackboard):**

* **Approach:** Course-centric platforms managed by instructors  
* **Limitations:** Restricted to enrolled courses only, instructor-controlled content, not suitable for peer-to-peer sharing, limited to current semester, often lacks flexibility in file formats and organization

**Messaging Apps (WhatsApp, Telegram, Discord):**

* **Approach:** Real-time communication with file sharing capabilities  
* **Limitations:** Files buried in chat history, storage size limits, no categorization or search, temporary access, poor resource organization, difficult to retrieve older content

**GitHub / GitLab:**

* **Approach:** Version control systems with file hosting  
* **Limitations:** Primarily designed for code, not suitable for non-technical users, steep learning curve, not ideal for PDFs/videos/general academic content, lacks academic organization structure

**General File Sharing Services (WeTransfer, MediaFire):**

* **Approach:** Temporary file hosting with download links  
* **Limitations:** Time-limited access, no organization, no search functionality, not university-specific, no privacy controls, files eventually expire

**Gap Analysis:** None of these solutions provide a university-specific, centralized, searchable repository with academic organization (courses/semesters/subjects), flexible privacy controls, and resource discovery for materials not directly shared to a user. This creates the need for a purpose-built platform.

### **Functional Requirements**

**FR1: User Management**

* FR1.1: University email-based registration and authentication  
* FR1.2: User profile with tagging capabilities (department, batch, interests)  
* FR1.3: Access control lists for blacklisting/whitelisting specific users

**FR2: Resource Upload and Storage**

* FR2.1: Support for multiple file formats (PDF, video, images, code, links)  
* FR2.2: Anonymous upload option with admin/moderator visibility  
* FR2.3: Metadata entry (title, description, tags, course, semester, subject)  
* FR2.4: File validation and format verification

**FR3: Resource Organization**

* FR3.1: Course-wise categorization  
* FR3.2: Semester-based grouping  
* FR3.3: Subject-specific categories  
* FR3.4: Exam-oriented collections  
* FR3.5: Tag-based classification (departments, courses, custom tags)

**FR4: Privacy and Sharing Controls**

* FR4.1: Public resource visibility (anyone in university can access)  
* FR4.2: Private resources (only uploader can access)  
* FR4.3: Tag-based selective sharing with users  
* FR4.4: User-specific blacklist/whitelist for resource access

**FR5: Search and Discovery**

* FR5.1: Search by title, description, and tags  
* FR5.2: Search by code language (for code files)  
* FR5.3: Filter by resource type (PDF, video, code, image, link)  
* FR5.4: Filter by subject, semester, department  
* FR5.5: Filter by date uploaded and popularity metrics  
* FR5.6: Advanced multi-criteria search combinations

**FR6: Resource Viewing and Access**

* FR6.1: In-platform PDF rendering and viewing  
* FR6.2: Download to device functionality  
* FR6.3: View resource metadata and details  
* FR6.4: Access resources anytime after initial upload

**FR7: Administrative Functions**

* FR7.1: Admin/moderator dashboard  
* FR7.2: View actual uploader for anonymous submissions  
* FR7.3: Reporting and verification system  
* FR7.4: Content moderation capabilities (manual review)

### **Non-Functional Requirements**

**Usability:**

* Intuitive user interface with minimal learning curve  
* Responsive design for desktop and mobile devices  
* Clear navigation and resource organization  
* Fast search results (\< 2 seconds for typical queries)

**Performance:**

* Handle concurrent uploads and downloads without significant degradation  
* Efficient file storage and retrieval mechanisms  
* Optimized database queries for search and filtering  
* Progressive loading for resource lists

**Security:**

* Secure authentication using university email verification  
* Access control enforcement at API level  
* Protection against unauthorized resource access

**Scalability:**

* Database schema designed to handle thousands of resources and users  
* File storage strategy that can expand as needed  
* Efficient indexing for fast searches as data grows  
* Modular architecture allowing feature additions

**Maintainability:**

* Clean, documented code following best practices  
* Modular architecture with separation of concerns  
* RESTful API design for easy frontend-backend integration  
* Comprehensive API documentation  
* Version control and collaborative development workflow

**Reliability:**

* Data persistence and backup considerations  
* Error handling and graceful degradation  
* Consistent system behavior across different scenarios

### **Feasibility Analysis**

**Technical Feasibility:**

* **Assessment:** Highly feasible  
* **Rationale:** The chosen tech stack (PostgreSQL, FastAPI, Next.js, nginx) consists of mature, well-documented technologies with extensive community support. All required features (authentication, file upload, search, filtering, access control) can be implemented using standard libraries and frameworks. PDF rendering can be achieved using existing JavaScript libraries (PDF.js). The team has access to adequate learning resources and documentation.

**Time Feasibility:**

* **Assessment:** Feasible within semester timeline  
* **Rationale:** The project is scoped appropriately for a semester-long effort with 4 team members. Core features (authentication, upload, basic search, privacy controls) can be prioritized for MVP, with advanced features (complex filtering, anonymous uploads, time-limited access) implemented iteratively.

**Resource Constraints:**

* **Assessment:** Manageable with free-tier solutions  
* **Constraints Identified:**  
  * Zero budget requiring use of free hosting platforms  
  * Free-tier storage limits may restrict total file capacity  
  * Free hosting may have performance limitations  
* **Mitigation:**  
  * **Frontend:** Deploy on Vercel or Netlify (generous free tiers for Next.js)  
  * **Backend:** Use Railway, Render, or Fly.io free tiers for FastAPI  
  * **Database:** PostgreSQL on Railway, Supabase, or Neon free tier  
  * **File Storage:** Initially use database for smaller files, explore Cloudflare R2 or Supabase Storage free tiers  
  * **nginx:** Can be configured on same instance as backend or use platform defaults  
  * Document storage limits clearly and implement file size restrictions  
  * Plan for potential migration to paid hosting if project scales beyond free tiers

---

## 

## **6\. Project Scope and Expected Deliverables**

### **Scope Definition**

**What is Included:**

1. **Core Platform Features:**  
   * User registration and authentication using university email  
   * Resource upload with metadata (title, description, tags, course, semester)  
   * Multi-format file storage (initial rendering focus on PDFs)  
   * Search functionality by title, description, and tags  
   * Filtering by resource type, subject, semester, date, and department  
   * Public, private, and selective sharing mechanisms  
   * User and resource tagging system  
   * Atomic blacklist/whitelist access control  
   * Anonymous upload with admin visibility  
   * Resource viewing and download capabilities  
2. **Academic Organization:**  
   * Course-wise resource categorization  
   * Semester-based grouping  
   * Subject-specific categories  
   * Tag-based filtering through departments and courses  
3. **Administrative Functions:**  
   * Admin/moderator dashboard  
   * Anonymous upload tracking for verification  
   * Manual content moderation interface  
4. **Technical Implementation:**  
   * RESTful API backend using FastAPI  
   * PostgreSQL database with proper schema design  
   * Next.js frontend with responsive design  
   * nginx configuration for deployment  
   * University-agnostic architecture

**Assumptions:**

* Users have valid university email addresses for registration  
* Users will tag resources accurately for effective organization  
* Basic content moderation will be manual rather than automated  
* Free hosting tiers will provide adequate resources for initial deployment  
* University email domains can be configured for each institution deployment

**Constraints:**

* Zero budget requiring free hosting solutions  
* Storage capacity limited by free-tier constraints  
* No integration with existing university systems or databases  
* Development timeline limited to one semester  
* Team size of 4 members with varying skill levels

**What is Excluded:**

1. **Automated Systems:**  
   * Automated content safety/moderation tools  
   * AI-based content classification or recommendations  
2. **Social Features:**  
   * Comments and discussion threads  
   * Likes, upvotes, and rating systems  
   * User reputation or gamification  
3. **Community Features:**  
   * Groups and spaces (batch-wise, club-based, project-specific)  
   * Direct messaging between users  
   * Senior-junior mentorship channels  
   * Community forums or discussion boards  
4. **Advanced Code Features:**  
   * Live code execution environments  
   * Code comparison or diff tools  
   * Automated code quality analysis  
   * Integrated development environment features  
5. **Other Exclusions:**  
   * Mobile applications (web-only platform)  
   * Real-time collaboration on documents  
   * Version control for uploaded files  
   * Integration with external learning management systems  
   * Payment or subscription features

### **Deliverables (Phase 1\)**

1. **Project Proposal Document**   
   * Problem definition and motivation  
   * Objectives and scope  
   * Functional and non-functional requirements  
   * Feasibility analysis  
2. **Background Research and Analysis**  
   * Existing solutions review  
   * Gap analysis  
   * Technology stack justification  
3. **Requirements Specification**  
   * Detailed functional requirements (FR1-FR7)  
   * Non-functional requirements  
   * Use cases and user stories  
4. **High-Level System Overview**  
   * System architecture diagram  
   * Component interactions (Frontend ↔ API ↔ Database ↔ Storage)  
   * Data flow overview  
   * Technology stack breakdown  
5. **Project Planning Documents**  
   * Preliminary timeline and milestones  
   * Team structure and role assignments  
   * Risk analysis and mitigation strategies  
6. **Initial Technical Decisions**  
   * Database schema draft  
   * API endpoint planning  
   * File storage strategy  
   * Authentication approach

---

## **7\. Preliminary Project Timeline and Milestones**

* **Week 1 \- 2 :** Use case and user flow design  
* **Week 3 \- 5 :** High level architecture design  
* **Week 6 \- 9 :** DB/API design  
* **Week 9 \- 12 :** Building MVP

---

## **8\. Team Structure and Collaboration**

### **Team Composition**

* **Team Size:** 4 members  
* **Project Type:** Group project

### **Roles and Responsibilities**

**Role 1: Backend Lead (Mohammed)**

* Responsible for FastAPI development and API design  
* Database schema design and PostgreSQL management  
* Authentication and authorization implementation  
* File upload and storage management  
* API documentation

**Role 2: Frontend Lead (Tiya)**

* Responsible for Next.js development and UI/UX design  
* Component architecture and state management  
* Integration with backend APIs  
* Responsive design implementation  
* Frontend routing and navigation

**Role 3: Database and Infrastructure (Prachi)**

* Database schema optimization and query performance  
* Deployment and hosting configuration  
* nginx setup and configuration  
* File storage strategy implementation  
* Performance monitoring and optimization

**Role 4: Integration and Testing (Varun)**

* API-frontend integration  
* Search and filtering logic implementation  
* Testing and quality assurance  
* Bug tracking and resolution  
* Documentation and user guides

### **Collaboration Tools and Practices**

* **Docker**  
* **Github**  
* **Live Share (VS Code extension)**  
* **G-Suite**  
* **Slack**

---

**9\. Risk and Challenge Analysis**

**Identified Risks**

* Advanced features may be harder than expected   
* Storage/bandwidth restrictions on free tiers   
* Large file handling challenging with free resources   
* Slow queries as database grows   
* Semester timeline may be tight   
* Integration/communication issues   
* Secure verification requires careful design   
* Late design flaws costly to fix   
* Some PDFs may not render correctly   
* University email verification challenges 

**Mitigation Strategies**

* Break into smaller tasks, implement MVP first, prototype early, use existing libraries  
* Research limits, implement file size restrictions, use compression, monitor usage  
* Start with DB storage, validate file sizes, research free options (Cloudflare R2, Supabase)  
* Design proper indexes, implement pagination, use PostgreSQL full-text search, cache queries  
* Prioritize features (must/should/nice-to-have), focus on core features first, set milestones with buffer  
* Establish API contracts early, regular integration meetings, use GitHub/task trackers  
* Use established libraries, bcrypt \+ JWT, email confirmation links, rate limiting, follow OWASP  
* Thorough initial design, create ER diagrams, use migration tools (Alembic)  
* PDF Use PDF.js, provide download fallback, test with various PDF types  
* Confirmation links, configurable domain list, use free email services (SendGrid)

**General Approach:** Weekly risk assessment, maintain risk register, build contingency time, focus on MVP first

---

## 

## **10\. Supervisor Review and Approval**

**Advisor Feedback:**

The proposal looks good

**Supervisor Comments:**

* The proposal mentions a unique product which has great potential to compete with big competitors.  
* The suggested scope should be deployment of the final product with all features.   
* The team confidence regarding product features makes scope feasible.

**Recommendations:**

* Mention Roles and capabilities of Student, Admin, Super-admin, Faculty  
* Put file size limit for different formats depending on the limitations while implementing

**Signature:   LAKSHYA JAIN**

**Date: 02/02/2026**

---

