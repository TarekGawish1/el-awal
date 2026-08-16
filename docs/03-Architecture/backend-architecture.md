# Backend Architecture Specification

## 1. Document Overview

### 1.1 Purpose
This document defines the complete backend software architecture for the **Educational Management System for Teachers and Students** (El Awal). It establishes the technical blueprint, application structure, modular boundaries, cross-cutting infrastructure patterns, integration mechanisms, and operational deployment strategies required to implement the approved product requirements reliably and securely.

### 1.2 Scope
This specification governs the backend application layer serving the four confirmed stakeholder personas:
- **Teacher (`المدرس`)**
- **Student (`الطالب`)**
- **Parent (`ولي الأمر`)**
- **Secretariat (`السكرتارية`)**

It covers all nine confirmed functional modules:
1. **Student Management**
2. **Attendance & Absence**
3. **Lectures & Lessons**
4. **Exams & Assignments**
5. **Parent Student Status**
6. **Notifications**
7. **Groups Management**
8. **Users & Permissions**
9. **Subscriptions (Payment Status Tracking)**

### 1.3 Target Audience
- **Backend Engineers & Tech Leads**: Implementation guidance for NestJS modules, services, controllers, and Prisma schemas.
- **Frontend Engineers (Next.js)**: Integration contracts, authentication flows, error formats, and API conventions.
- **DevOps / Infrastructure Engineers**: Deployment topology on Hetzner VPS, Neon PostgreSQL configuration, Cloudflare R2/CDN provisioning, and Bunny Stream setup.
- **QA Engineers**: Verification of security boundaries, transactional invariants, error codes, and asynchronous event delivery.

### 1.4 Source of Truth & Precedence
This architecture derives strictly from and enforces:
- [Product Requirements Document (PRD)](file:///d:/el_awal/docs/01-PRD/product-requirements.md)
- [Functional Requirements Document](file:///d:/el_awal/docs/01-PRD/functional-requirements.md)
- [Business Requirements Document](file:///d:/el_awal/docs/01-PRD/business-requirements.md)
- [Non-Functional Requirements Document](file:///d:/el_awal/docs/01-PRD/non-functional-requirements.md)
- [Business Logic Architecture](file:///d:/el_awal/docs/03-Architecture/business-logic.md)
- [Data Layer Architecture](file:///d:/el_awal/docs/03-Architecture/data-layer.md)
- [Database Design Specification](file:///d:/el_awal/docs/03-Architecture/database-design.md)
- [Presentation Layer Architecture](file:///d:/el_awal/docs/03-Architecture/presentation-layer.md)

> [!IMPORTANT]
> This architecture does **not** invent product features or resolve business rules marked `TBD — Requires Product Clarification`. Open product decisions remain explicitly noted.

---

## 2. Approved Technology Stack

The backend architecture strictly complies with the approved technical stack:

| Layer / Concern | Technology Selection | Architectural Rationale & Constraints |
|---|---|---|
| **Backend Framework** | **NestJS (Node.js / TypeScript)** | Enterprise-grade TypeScript framework offering native dependency injection, modular organization, strong typing, declarative decorators, and robust interceptor/pipe/guard pipelines. |
| **Runtime Engine** | **Node.js LTS (v20+)** | Stable, asynchronous I/O runtime optimized for high-concurrency RESTful APIs and event-driven architectures. |
| **Programming Language** | **TypeScript (Strict Mode)** | End-to-end type safety, compile-time contract enforcement, shared interfaces with Prisma and Next.js. |
| **Object-Relational Mapping (ORM)** | **Prisma ORM** | Type-safe query builder, declarative schema definitions, automated migrations, connection lifecycle control, and automated model generation. |
| **Primary Relational Database** | **PostgreSQL (v16+)** | ACID-compliant relational engine supporting UUIDv4, JSONB queries, composite constraints, and relational enum types. |
| **Database Cloud Provider** | **Neon** | Serverless PostgreSQL with autoscaling, serverless connection pooling, and database branching for staging and preview testing. |
| **Application Hosting** | **Hetzner VPS** | Dedicated cloud compute instance in European data centers providing cost-effective CPU/memory resources, low network latency, Dockerized application hosting, and predictable performance. |
| **Binary File Storage** | **Cloudflare R2** | S3-compatible, zero-egress fee distributed object storage for PDF summaries, educational documents, homework files, and evaluation attachments. |
| **File Delivery Network** | **Cloudflare CDN** | Edge-caching CDN providing distributed static asset acceleration, DDoS protection, TLS termination, and secure URL token delivery. |
| **Video Transcoding & Delivery** | **Bunny Video / Bunny Stream** | Dedicated video cloud handling encoding, multi-bitrate HLS/DASH streaming, DRM/signed token protection, and edge playback for lecture recordings. |
| **Frontend Consumer** | **Next.js** | React full-stack framework consuming the backend via HTTPS REST APIs and signed webhooks/tokens. |

---

## 3. Architectural Style: Modular Monolith

### 3.1 Architectural Selection
The backend is structured as a **Modular Monolith** using NestJS.

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             NESTJS MODULAR MONOLITH                              │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                          HTTP & Routing Layer                            │   │
│   │   [Controllers] -> [Guards (Auth/RBAC)] -> [Pipes] -> [Interceptors]     │   │
│   └────────────────────────────────────┬─────────────────────────────────────┘   │
│                                        │                                         │
│   ┌────────────────────────────────────▼─────────────────────────────────────┐   │
│   │                         Domain Modules (Boundaries)                      │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│   │  │   Students   │  │  Attendance  │  │   Lectures   │  │    Exams     │  │   │
│   │  │    Module    │  │    Module    │  │    Module    │  │    Module    │  │   │
│   │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │   │
│   │         │                 │                 │                 │          │   │
│   │  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  │   │
│   │  │ ParentStatus │  │Notifications │  │    Groups    │  │ Users & Auth │  │   │
│   │  │    Module    │  │    Module    │  │    Module    │  │    Module    │  │   │
│   │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│   │                            ┌──────────────┐                              │   │
│   │                            │Subscriptions │                              │   │
│   │                            │    Module    │                              │   │
│   │                            └──────────────┘                              │   │
│   └────────────────────────────────────┬─────────────────────────────────────┘   │
│                                        │                                         │
│   ┌────────────────────────────────────▼─────────────────────────────────────┐   │
│   │                   Shared & Core Infrastructure Modules                   │   │
│   │  [PrismaService]   [StorageService (R2)]   [VideoService (Bunny)]        │   │
│   │  [LoggerService]   [JobQueue / Scheduler]  [EventBus / EventEmitter]     │   │
│   └────────────────────────────────────┬─────────────────────────────────────┘   │
└────────────────────────────────────────┼─────────────────────────────────────────┘
                                         │
                                         ▼
                               [External Integrations]
                        PostgreSQL (Neon) | Cloudflare R2 | Bunny Stream
```

### 3.2 Rationale Over Microservices
1. **Domain Maturity & Team Velocity**: At the current product stage, business domain boundaries are well-defined across nine modules. A modular monolith provides clean separation of concerns without the operational complexity, network latency, distributed transactions, and deployment overhead of microservices.
2. **Transactional Integrity**: Critical operations (e.g., student enrollment with group allocation, automatic exam grading with submission and answer recording) require strict ACID transactional guarantees across domain entities. A single relational database managed by Prisma guarantees consistency without two-phase commits.
3. **Operational Simplicity**: A single deployable container artifact on a Hetzner VPS simplifies CI/CD, log aggregation, monitoring, and environment configuration.
4. **Independent Module Extensibility**: Each NestJS module encapsulates its own controllers, services, DTOs, and domain logic. Modules communicate via explicit service injection or internal decoupled events (`EventEmitter2`), enabling future extraction into standalone microservices if specific volumetric scaling requires it.

---

## 4. High-Level System Architecture

### 4.1 End-to-End System Topology

```text
                               +-----------------------------+
                               |        Client Users         |
                               | (Teacher, Student, Parent,  |
                               |        Secretariat)         |
                               +--------------+--------------+
                                              |
                                              | HTTPS / Browser / Mobile Web
                                              v
                               +-----------------------------+
                               |     Cloudflare CDN / Edge   |
                               | - SSL Termination / DDoS    |
                               | - Edge Caching              |
                               | - Static Content Delivery   |
                               +--------------+--------------+
                                              |
                                              | Proxied Traffic
                                              v
                               +-----------------------------+
                               |   Next.js Frontend (Web)    |
                               |   - SSR / Client Dashboard  |
                               |   - Authentication Token    |
                               |   - Role-Based Views        |
                               +--------------+--------------+
                                              |
                                              | HTTPS REST API (JSON)
                                              | [Authorization: Bearer <JWT>]
                                              v
+---------------------------------------------------------------------------------------------------------+
| Hetzner VPS (Ubuntu Linux / Docker Engine)                                                              |
|                                                                                                         |
|  +---------------------------------------------------------------------------------------------------+  |
|  | Nginx Reverse Proxy (SSL / Rate Limiting / Gzip / Security Headers)                              |  |
|  +--------------------------------------------------+------------------------------------------------+  |
|                                                     |                                                   |
|                                                     | http://127.0.0.1:3000                             |
|                                                     v                                                   |
|  +---------------------------------------------------------------------------------------------------+  |
|  | NestJS Application Server (Node.js LTS / TypeScript)                                              |  |
|  |                                                                                                   |  |
|  |   [API Gateway / Routing]                                                                         |  |
|  |   ├── Middlewares (Correlation ID, HTTP Logger)                                                   |  |
|  |   ├── Guards (JWT Auth Guard, Role Guard, Ownership Guard)                                        |  |
|  |   ├── Interceptors (Transform Interceptor, Timeout Interceptor)                                  |  |
|  |   ├── Pipes (Validation Pipe, Sanitization Pipe)                                                  |  |
|  |   ├── Exception Filters (Global ProblemDetails Filter, Prisma Exception Filter)                  |  |
|  |                                                                                                   |  |
|  |   [Business Domain Modules]                                                                       |  |
|  |   ├── AuthModule / UsersModule                                                                    |  |
|  |   ├── StudentsModule / GroupsModule                                                               |  |
|  |   ├── AttendanceModule / LessonsModule                                                            |  |
|  |   ├── AssessmentsModule (Exams & Assignments + Auto-Grading Engine)                              |  |
|  |   ├── ParentStatusModule / SubscriptionsModule                                                    |  |
|  |   └── NotificationsModule                                                                         |  |
|  |                                                                                                   |  |
|  |   [Core & Integration Services]                                                                   |  |
|  |   ├── PrismaService (PostgreSQL Connection Pooling)                                               |  |
|  |   ├── StorageService (Cloudflare R2 Client - S3 API)                                              |  |
|  |   ├── VideoService (Bunny Stream API Client)                                                      |  |
|  |   ├── SchedulerService (@nestjs/schedule Cron Engine)                                             |  |
|  |   └── EventBusService (@nestjs/event-emitter Async Dispatcher)                                    |  |
|  +---------------------------+------------------------------+---------------------------+------------+  |
+------------------------------|------------------------------|---------------------------|---------------+
                               |                              |                           |
                               | TCP (SSL / Pooler)           | S3 REST API (HTTPS)       | REST API (HTTPS)
                               v                              v                           v
                +------------------------------+  +----------------------+  +---------------------------+
                |    Neon PostgreSQL Cloud     |  |    Cloudflare R2     |  |   Bunny Video / Stream    |
                |  - PostgreSQL v16 Engine     |  |  - PDFs / Summaries  |  |  - Lecture Transcoding    |
                |  - Serverless PgBouncer Pool |  |  - Homework Files    |  |  - Adaptive HLS Streaming |
                |  - Branching (Dev/Staging)   |  |  - CDN Edge Delivery |  |  - Signed Embed Tokens    |
                +------------------------------+  +----------------------+  +---------------------------+
```

---

## 5. Backend Module Decomposition

The application is decomposed into nine **Domain Modules** matching the product requirements, augmented by **Core Infrastructure Modules**.

```text
src/
├── app.module.ts
├── main.ts
├── common/                         # Shared Cross-Cutting Utilities
│   ├── decorators/                 # @CurrentUser(), @Roles(), @Public()
│   ├── dto/                        # Standard PaginatedQueryDto, ApiResponseDto
│   ├── exceptions/                 # Custom Domain Exceptions
│   ├── filters/                    # GlobalExceptionFilter, PrismaClientExceptionFilter
│   ├── guards/                     # JwtAuthGuard, RolesGuard, ResourceOwnershipGuard
│   ├── interceptors/               # LoggingInterceptor, TransformInterceptor
│   ├── pipes/                      # ValidationPipe, ParseUuidPipe
│   └── types/                      # Common Enums, Shared Interfaces
├── core/                           # Singleton Infrastructure Providers
│   ├── config/                     # Environment configuration & validation
│   ├── database/                   # PrismaModule & PrismaService
│   ├── event-bus/                  # EventEmitterModule wrapper
│   ├── logger/                     # Structured Pino/Winston LoggerModule
│   ├── storage/                    # Cloudflare R2 StorageModule & Service
│   ├── video/                      # Bunny Video/Stream VideoModule & Service
│   └── scheduler/                  # Scheduled Cron Tasks Module
└── modules/                        # Business Domain Modules
    ├── auth/                       # Identity, Authentication, Password & Token Management
    ├── users/                      # User Entity, Profiles (Teacher, Student, Parent, Secretariat)
    ├── students/                   # Student Profiles, Parent Links, Academic Status
    ├── groups/                     # Academic Groups, Lesson Schedules, Enrollments
    ├── attendance/                 # Sessions, Attendance Logging, Reports
    ├── lessons/                    # Educational Files, Summaries, Progress Tracking
    ├── assessments/                # Assignments, Exams, Auto-Grading Engine, Submissions
    ├── parent-status/              # Evaluations, Teacher Notes, Parent-Visible Aggregations
    ├── notifications/              # In-App Alerts, Event Handlers, Reminder Jobs
    └── subscriptions/              # Student Payment Status Tracking Records
```

### 5.1 Domain Modules Responsibility Matrix

| Module Name | NestJS Encapsulation | Primary Domain Entities Managed | Core Services / Responsibilities |
|---|---|---|---|
| **`AuthModule`** | `auth/` | `User`, Session Tokens | Password hashing (argon2/bcrypt), JWT token issuance and verification, login, logout, identity validation. |
| **`UsersModule`** | `users/` | `User`, `TeacherProfile`, `ParentProfile`, `SecretariatProfile` | User provisioning, profile management, role verification, account active/inactive status toggles. |
| **`StudentsModule`** | `students/` | `StudentProfile`, `ParentStudentLink` | Student enrollment, student code generation, unique QR token provisioning (`qr_code_token`), academic status management, parent-student linkage resolution. |
| **`GroupsModule`** | `groups/` | `AcademicGroup`, `GroupEnrollment`, `LessonSchedule` | Group cohort creation, student enrollment/transfer/drop, recurring weekly lesson timetable configuration. |
| **`AttendanceModule`** | `attendance/` | `LessonSession`, `AttendanceRecord` | Class session scheduling/instantiation, session roll-call recording (`PRESENT`, `ABSENT`, `EXCUSED`), **Student QR Code Attendance Scanning Engine** (`POST /sessions/:sessionId/scan-qr`), attendance summary report generation. |
| **`LessonsModule`** | `lessons/` | `EducationalContent`, `ContentProgress` | File metadata management, R2 presigned upload URL issuance, Bunny Stream video registration, student viewing progress and completion tracking. |
| **`AssessmentsModule`**| `assessments/`| `Assessment`, `AssessmentQuestion`, `AssessmentSubmission`, `StudentAnswer` | Homework/exam authoring, question options management, submission handling, **Automatic Exam Grading Engine**, score calculations. |
| **`ParentStatusModule`**| `parent-status/`| `StudentEvaluation` | Teacher evaluations, qualitative notes, student level rating records, consolidated student progress summary for guardians. |
| **`NotificationsModule`**| `notifications/`| `Notification` | Event listener handling (lesson reminders, unsolved homework, new exams, exam scores, absences), in-app notification persistence, read status management. |
| **`SubscriptionsModule`**| `subscriptions/`| `StudentPaymentRecord` | Manual fee/payment status tracking per student and billing period, administrative payment remarks. |

---

## 6. Layer Responsibilities & Request Lifecycle

### 6.1 Architectural Layering
Each module strictly adheres to a three-tier separation within the modular boundary:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION / API LAYER                        │
│  - Controllers: Expose REST endpoints, consume DTOs, return ViewModels │
│  - Guards: Enforce Authentication (JWT) and Role Permissions (RBAC)    │
│  - Pipes: Validate request payload schema, transform types, sanitize  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        APPLICATION / DOMAIN LAYER                      │
│  - Services: Encapsulate domain rules, invariants, and workflows       │
│  - Use Cases / Command Handlers: Coordinate multi-entity operations    │
│  - Domain Events: Emit decoupled events via internal EventBus          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        DATA PERSISTENCE LAYER                          │
│  - PrismaService: Execute parameterized SQL via Prisma Client          │
│  - Interactive Transactions: Coordinate multi-record atomic units      │
│  - PostgreSQL Database: Enforce referential integrity & constraints   │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Step-by-Step Request-Response Lifecycle

```text
 Incoming HTTP Request
       │
       ▼
 [1. CorrelationMiddleware] ──> Attaches unique `x-request-id` to request context and response headers
       │
       ▼
 [2. Global Guards]
       ├── JwtAuthGuard ──────> Verifies Bearer JWT signature, expiration, and user active status
       └── RolesGuard ────────> Verifies user role matches required @Roles(...) metadata
       │
       ▼
 [3. Interceptors (Pre-Controller)]
       └── LoggingInterceptor ─> Captures request start time, route, and incoming metadata
       │
       ▼
 [4. Validation Pipes]
       └── ValidationPipe ────> Validates payload using class-validator against DTO rules (whitelist, forbidNonWhitelisted)
       │
       ▼
 [5. Module Controller] ───────> Maps HTTP method/route, extracts parameters (@Param, @Body, @CurrentUser), invokes Service
       │
       ▼
 [6. Module Service (Business Logic)]
       ├── Enforces domain invariants and business rules
       ├── Coordinates database operations via PrismaService
       └── Emits domain events (if state changed)
       │
       ▼
 [7. Prisma ORM / PostgreSQL Engine]
       └── Executes parameterized queries within Neon connection pool / transaction boundary
       │
       ▼
 [8. Interceptors (Post-Controller)]
       ├── TransformInterceptor -> Wraps response in standard envelope: { success: true, data: ..., meta: ... }
       └── LoggingInterceptor ─> Logs execution duration, status code, and response size
       │
       ▼
 [9. Exception Filters (On Error)]
       └── GlobalExceptionFilter -> Intercepts unhandled errors, maps to standard RFC 7807 / ProblemDetails JSON
       │
       ▼
 Outgoing HTTP Response
```

---

## 7. Domain & Business Logic Execution Model

### 7.1 Separation of Business Rules from Controllers and ORM
- **Controllers** are strictly thin adapters: they only handle HTTP protocol concerns, serialization, status codes, and routing. No business decisions occur in controllers.
- **Prisma Client** is strictly a data access tool: no complex business domain logic or validation is embedded inside database triggers or raw queries.
- **Domain Services** own and enforce all business invariants:
  - Validating attendance session states before marking.
  - Ensuring an exam submission cannot occur after due dates or if already submitted.
  - Executing automated exam correction against `correct_answer` keys.
  - Enforcing student group capacity or enrollment prerequisites.
  - Calculating student content viewing completion.

### 7.2 Automatic Examination Grading Engine Execution Flow
The automatic exam grading engine is encapsulated inside `AssessmentsModule`:

```text
Student Submits Exam -> AssessmentsController.submitExam()
       │
       ▼
 AssessmentsService.processExamSubmission()
       │
       ├── 1. Verify Assessment exists, type == 'EXAM', is_auto_graded == true
       ├── 2. Verify Student is actively enrolled in Assessment's AcademicGroup
       ├── 3. Verify no existing AssessmentSubmission exists for this (assessment_id, student_id)
       │
       ▼
 Execute within Prisma Interactive Transaction: $transaction(async (tx) => { ... })
       │
       ├── 4. Fetch AssessmentQuestion records (with correct_answer and points)
       ├── 5. Iterate through submitted StudentAnswer items:
       │      ├── Compare student selected_answer with correct_answer
       │      ├── If match: is_correct = true, points_earned = question.points
       │      └── If mismatch: is_correct = false, points_earned = 0.00
       │
       ├── 6. Compute total score_obtained = SUM(points_earned)
       ├── 7. Insert AssessmentSubmission (status: 'GRADED', score_obtained, is_auto_graded: true, graded_at: NOW())
       ├── 8. Bulk insert StudentAnswer records linked to submission_id
       │
       └── 9. Emit Domain Event: 'assessment.exam_graded'
              Payload: { studentId, assessmentId, scoreObtained, totalScore }
       │
       ▼
 NotificationsEventListener catches 'assessment.exam_graded'
       └── Persists Notification entity for designated recipients (PRD-008, FR-NOT-004)
```

### 7.3 Student QR Code Attendance Execution Flow
The student QR code attendance workflow is encapsulated within `AttendanceModule` and coordinated with `StudentsModule`:

```text
Teacher Scans Student QR Code -> AttendanceController.scanQrCode(sessionId, { qrCodeToken })
       │
       ▼
 AttendanceService.recordAttendanceByQrToken(sessionId, qrCodeToken, teacherId)
       │
       ├── 1. Validate LessonSession exists and belongs to Teacher's AcademicGroup
       ├── 2. Resolve StudentProfile via qr_code_token (indexed lookup, O(1))
       │      └── If not found: throw StudentNotFoundException (404)
       ├── 3. Verify Student has active GroupEnrollment in Session's AcademicGroup
       │      └── If not enrolled: return WarningResponse (422 / domain alert with student name & actual group)
       │
       ▼
 Execute Upsert / Idempotent Record Operation via Prisma:
       │
       ├── 4. prisma.attendanceRecord.upsert({
       │        where: { sessionId_studentId: { sessionId, studentId } },
       │        create: {
       │          sessionId,
       │          studentId,
       │          status: 'PRESENT',
       │          recordingMethod: 'QR_SCAN',
       │          recordedById: teacherId,
       │          recordedAt: new Date()
       │        },
       │        update: {
       │          status: 'PRESENT',
       │          recordingMethod: 'QR_SCAN',
       │          recordedById: teacherId,
       │          recordedAt: new Date()
       │        }
       │      })
       │
       └── 5. Return Success Response in < 500ms:
              {
                success: true,
                student: { id, fullName, studentCode },
                attendance: { status: 'PRESENT', recordingMethod: 'QR_SCAN', recordedAt },
                sessionStats: { totalPresent, totalEnrolled }
              }
```

---

## 8. Authentication & Identity Management

### 8.1 Identity & Credential Management
- **User Identity Model**: Central `User` entity holds authentication credentials (`email` or `phone`, hashed `password_hash`, `role`, `is_active`).
- **Password Security**: Passwords are cryptographically hashed using **Argon2id** (or bcrypt with work factor 12) with unique per-user cryptographic salts. Plaintext passwords are never stored, logged, or cached.
- **Identity Identifiers**: Supports login via registered phone number or email address.

### 8.2 Token Strategy (Stateless JWT)
- **Token Architecture**: Stateless JSON Web Tokens (JWT) signed using HMAC-SHA256 (`HS256`) or asymmetric RSA (`RS256`).
- **Access Token**: Short-lived (e.g., 15 minutes to 1 hour) containing claims:
  ```json
  {
    "sub": "b8f6c4a2-1234-4b5c-890a-123456789abc",
    "role": "TEACHER",
    "email": "teacher@elawal.com",
    "profileId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "iat": 1786881600,
    "exp": 1786885200
  }
  ```
- **Refresh Token (`TBD — Architecture Polish`)**: Long-lived token (e.g., 7–30 days) stored securely with cryptographic hash in database/cookie to allow transparent session renewal without requiring re-login.
- **Secret Management**: Signing keys (`JWT_SECRET`, `JWT_REFRESH_SECRET`) are injected exclusively via environment variables and validated at startup.

---

## 9. Authorization & Role-Based Access Control (RBAC)

### 9.1 Role Hierarchy & Personas
The system enforces strict RBAC across the four confirmed stakeholder roles:

```text
                             [SUPER_ADMIN / SECRETARIAT]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
            [TEACHER]                                        [PARENT]
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         │
                                     [STUDENT]
```

| Role Enum | Key System Capabilities | Prohibited Capabilities |
|---|---|---|
| **`TEACHER`** | Create groups, set schedules, upload educational content, author exams/assignments, grade assignments, log attendance, write student evaluations. | Cannot view or modify other teachers' non-shared groups; cannot alter administrative payment records without permission. |
| **`STUDENT`** | Access group lectures/files, view assignments/exams, submit answers/homework, view own grades, view own attendance standing. | Cannot access other students' submissions, modify attendance, upload class materials, or view parent evaluations. |
| **`PARENT`** | View linked students' exam results, attendance logs, homework completion status, teacher evaluations, and teacher notes. | Cannot submit assessments, edit student profiles, modify attendance, or access records of unlinked students. |
| **`SECRETARIAT`** | Manage student enrollment, group assignments, view attendance summaries, manage student payment status records. | Specific administrative permission matrix: `TBD — Requires Product Clarification`. |

### 9.2 Authorization Enforcement Pattern
1. **Global Authentication Guard (`JwtAuthGuard`)**: Rejects any request lacking a valid Bearer JWT, unless decorated with `@Public()`.
2. **Role Authorization Guard (`RolesGuard`)**: Compares `@Roles(Role.TEACHER, Role.SECRETARIAT)` metadata against `request.user.role`.
3. **Resource Ownership & Scoping Guard (`ResourceOwnershipGuard`)**:
   - **Student Isolation**: Enforces `request.params.studentId === request.user.profileId` for student-restricted endpoints.
   - **Parent-Student Link Validation**: Queries `parent_student_links` to guarantee `parent_id == request.user.profileId && student_id == target_student_id` before returning academic standing data (`PRD-007`).
   - **Teacher Group Ownership**: Guarantees `academic_groups.teacher_id === request.user.profileId` before allowing assessment publishing, attendance logging, or evaluation creation.

---

## 10. Data Transfer Objects (DTOs), Validation & Sanitization

### 10.1 Validation Pipeline
Validation is handled globally via NestJS `ValidationPipe` leveraging `class-validator` and `class-transformer`:

```typescript
// Conceptual Global Validation Pipe Configuration in main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,               // Strip any properties not defined in the DTO
    forbidNonWhitelisted: true,    // Reject requests with unexpected properties (400 Bad Request)
    transform: true,               // Automatically transform incoming payloads to DTO instance types
    transformOptions: {
      enableImplicitConversion: false,
    },
  }),
);
```

### 10.2 DTO Guidelines
- **Explicit Type Declarations**: Every controller route must define explicit Request and Response DTOs.
- **Decorator Constraints**: Use `@IsString()`, `@IsUUID('4')`, `@IsEnum()`, `@IsArray()`, `@IsOptional()`, `@Min()`, `@Max()`.
- **String Sanitization**: Trim leading/trailing whitespace, escape malicious script inputs.
- **Pagination Contracts**: Standardize pagination query parameters across list endpoints (`page`, `limit`, `sortBy`, `sortOrder`).

---

## 11. Error Handling, Exception Filtering & Problem Details

### 11.1 Standardized Error Response Format
All errors return a consistent, machine-readable JSON structure based on RFC 7807 (Problem Details for HTTP APIs):

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed on submitted assessment data",
  "details": [
    {
      "field": "questions[0].correct_answer",
      "issue": "correct_answer should not be empty"
    }
  ],
  "timestamp": "2026-08-16T10:03:33.000Z",
  "path": "/api/v1/assessments",
  "correlationId": "req-c9a81234-5678-90ab-cdef"
}
```

### 11.2 Exception Handling Architecture
1. **Domain Exceptions Hierarchy**:
   - `EntityNotFoundException` -> Maps to HTTP 404.
   - `DomainValidationException` -> Maps to HTTP 400.
   - `UnauthorizedActionException` -> Maps to HTTP 403.
   - `ResourceConflictException` -> Maps to HTTP 409 (e.g., student already enrolled in group).
2. **Prisma Error Mapping (`PrismaClientExceptionFilter`)**:
   - `P2002` (Unique constraint violation) -> 409 Conflict with field details.
   - `P2025` (Record not found for update/delete) -> 404 Not Found.
   - `P2003` (Foreign key constraint violation) -> 400 Bad Request.
3. **Global Catch-All Filter**:
   - Catches unexpected internal errors, logs full stack trace with `correlationId`, and returns a safe HTTP 500 without leaking internal database or environment details.

---

## 12. Database Access, Prisma ORM & Neon PostgreSQL

### 12.1 Prisma Architecture
- **Schema Single Source of Truth**: `prisma/schema.prisma` models all 20 logical entities defined in the Database Design Specification.
- **Type Generation**: Prisma generates strongly-typed client bindings consumed by all NestJS services.
- **Soft vs. Hard Deletions**:
  - `User.is_active = false` for soft account deactivation.
  - `AcademicGroup.is_active = false` for archiving completed cohorts.
  - Relational `ON DELETE RESTRICT` foreign keys safeguard historical attendance records, assessment submissions, and student evaluations against accidental deletion.

### 12.2 Neon Serverless Connection Management
- **Connection Modes**:
  - **Direct Connection (`DATABASE_URL_UNPOOLED`)**: Used exclusively for executing schema migrations (`prisma migrate deploy`).
  - **Pooled Connection (`DATABASE_URL`)**: Uses Neon's built-in PgBouncer pooler for standard API runtime query execution, preventing connection exhaustion under concurrent API traffic.
- **Prisma Client Lifecycle**: Managed as a NestJS `OnModuleInit` and `OnModuleDestroy` singleton provider to ensure orderly connection establishment and clean pool draining during graceful shutdowns.

```typescript
// Conceptual PrismaService Lifecycle Management
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

---

## 13. Transaction Management & Unit of Work

### 13.1 Transactional Invariants
The system utilizes Prisma interactive transactions (`$transaction`) whenever an operation spans multiple tables that must succeed or fail atomically:

1. **User Registration & Profile Creation**:
   - Creating a `User` and its corresponding profile (`TeacherProfile`, `StudentProfile`, etc.) occurs in a single transaction.
2. **Exam Creation with Questions**:
   - Inserting an `Assessment` header and its child `AssessmentQuestion` rows occurs in a single transaction.
3. **Assessment Submission & Auto-Grading**:
   - Creating the `AssessmentSubmission` header, recording individual `StudentAnswer` rows, and calculating the final grade occurs within an atomic transaction.
4. **Session Creation & Attendance Initialization**:
   - Generating a `LessonSession` and populating default enrollment rosters occurs atomically.

### 13.2 Transaction Isolation & Concurrency
- Uses PostgreSQL default `READ COMMITTED` isolation level, sufficient for educational transactional workflows.
- Avoids long-running operations (such as external HTTP calls or file uploads) inside database transaction blocks.

---

## 14. File Storage & Static Asset Delivery (Cloudflare R2 & CDN)

### 14.1 File Upload Architecture (Direct-to-Storage via Presigned URLs)
To prevent memory spikes and CPU saturation on the Hetzner VPS, files are uploaded directly from the client to Cloudflare R2 using presigned S3 URLs:

```text
 Client (Next.js)           NestJS API                     Cloudflare R2            Cloudflare CDN
       │                          │                              │                        │
       ├── 1. Request Upload URL ─>                              │                        │
       │   (filename, mime, size) │                              │                        │
       │                          ├── 2. Validate MIME & Size    │                        │
       │                          ├── 3. Generate Storage Key    │                        │
       │                          ├── 4. Sign S3 PutObject URL ──>                        │
       │                          │      (Expires in 15 mins)    │                        │
       │<─ 5. Return Presigned URL                               │                        │
       │      & Storage Key ──────┘                              │                        │
       │                                                         │                        │
       ├── 6. HTTP PUT Direct Upload (Binary Payload) ───────────>                        │
       │                                                         │                        │
       ├── 7. Confirm Upload with Metadata ─────────────────────>│                        │
       │      (title, file_key, group_id, content_type)          │                        │
       │                          ├── 8. Verify & Persist in DB  │                        │
       │                          │      (educational_content)   │                        │
       │<─ 9. Success Response ───┘                              │                        │
       │                                                         │                        │
       ├── 10. Request File Download / View ─────────────────────────────────────────────>│
       │                                                         │                        ├── 11. Edge Cache
       │<─ 12. Stream Content via CDN ────────────────────────────────────────────────────┘
```

### 14.2 Storage Key Taxonomy
Files stored in Cloudflare R2 follow a deterministic path structure:
- **Educational Content Files**: `content/{groupId}/{contentId}/{originalFilename}`
- **Summaries & References**: `summaries/{groupId}/{contentId}/{originalFilename}`
- **Homework Attachments**: `submissions/{assessmentId}/{studentId}/{originalFilename}`
- **Evaluation Attachments**: `evaluations/{studentId}/{evaluationId}/{originalFilename}`

### 14.3 Static Delivery & CDN Caching
- Educational files and downloadable PDFs are served via Cloudflare CDN domain with strict caching headers (`Cache-Control: public, max-age=86400, immutable`).
- Private/sensitive files (e.g., student submission attachments) are accessed via signed temporary URLs generated on demand by the backend.

---

## 15. Video Processing & Delivery (Bunny Video / Bunny Stream)

### 15.1 Video Streaming Workflow
Video lecture recordings (`LECTURE_RECORDING`) are managed exclusively via **Bunny Stream** to provide adaptive bitrate HLS delivery and bandwidth optimization:

```text
 Teacher (Client)            NestJS API                     Bunny Stream API
       │                          │                               │
       ├── 1. Request Video Upload>                               │
       │   (title, duration, etc) ├── 2. Create Video Object ────>
       │                          │      (POST /library/videos)   │
       │                          │<── 3. Return Video ID ────────┤
       │                          │       & Direct Upload Auth    │
       │<─ 4. Return Upload Ticket┘                               │
       │                                                          │
       ├── 5. Direct Video Upload (TUS / Multipart) ─────────────>│
       │                                                          ├── Transcoding (1080p, 720p, 480p, HLS)
       │                                                          │
       │                          <── 6. Webhook: TranscodingDone─┤
       │                          │      (status: 3 - Ready)      │
       │                          ├── 7. Update educational_content
       │                          │      (file_url = HLS playback)│
       │                                                          │
 Student (Client)                                                 │
       │                                                          │
       ├── 8. Request Video Playback URL ────────────────────────>│
       │                          ├── 9. Generate Signed Token    │
       │<─ 10. Return Signed HLS URL / Embed Iframe ──────────────┘
```

### 15.2 Video Security & DRM Protection
- **Direct Link Protection**: Direct MP4 downloads are disabled.
- **Signed Playback URLs**: Video embeds and HLS playlists require SHA256-signed security tokens generated with Bunny Stream API keys and configured expiration timestamps.
- **Viewing Progress Tracking**: Next.js client reports video progress intervals (e.g., 25%, 50%, 75%, 100%) to `LessonsController.trackProgress()` which updates `content_progress` (`is_completed`, `view_count`, `last_viewed_at`).

---

## 16. Notification Processing & Asynchronous Event System

### 16.1 Notification Triggers & Product Requirements Mapping
The system satisfies all five confirmed event-driven notification alerts (`PRD-008`, `FR-NOT-001..005`):

| Notification Event | Trigger Condition | Target Recipient (`TBD Product Clarification`) | Persistence & Delivery Mechanism |
|---|---|---|---|
| **1. Pre-Lesson Reminder** (`FR-NOT-001`) | Exactly 1 hour prior to scheduled `lesson_schedules` start time. | Students & Parents of enrolled Group. | Cron Scheduler -> EventBus -> `Notification` record in DB -> Real-time polling/WebSocket. |
| **2. Unsolved Homework Alert** (`FR-NOT-002`) | Assignment past due date without a valid `AssessmentSubmission`. | Student & Parent. | Daily Cron Job -> EventBus -> `Notification` record in DB. |
| **3. New Exam Announcement** (`FR-NOT-003`) | Assessment published (`type == 'EXAM'`). | Enrolled Students & Parents. | `AssessmentsService.publish()` -> EventBus -> `Notification` record in DB. |
| **4. Student Exam Grade Notice** (`FR-NOT-004`) | Exam graded automatically or manually confirmed. | Student & Parent. | Auto-Grading Engine -> EventBus -> `Notification` record in DB. |
| **5. Student Absence Alert** (`FR-NOT-005`) | Attendance logged as `ABSENT` in a `LessonSession`. | Parent of absent student. | `AttendanceService.recordAttendance()` -> EventBus -> `Notification` record in DB. |

### 16.2 Internal Event Dispatcher Flow
```text
[Domain Service (e.g., AttendanceService)]
       │
       ├── 1. Updates DB record: attendance_records (status: 'ABSENT')
       └── 2. eventEmitter.emit('attendance.student_absent', payload)
                     │
                     ▼
       [NotificationsEventListener]
              ├── 3. Resolves Student & Parent User IDs
              ├── 4. Inserts `Notification` row in PostgreSQL (is_read: false)
              └── 5. Dispatches to Delivery Channel (In-App DB; external channels: `TBD`)
```

> [!NOTE]
> External messaging gateways (such as WhatsApp Business API or SMS) are documented as `TBD — Requires Product Clarification`. The event bus decouples notification generation so that external providers can be attached seamlessly without modifying domain logic.

---

## 17. Background Jobs & Scheduled Tasks

### 17.1 Cron Scheduling (`@nestjs/schedule`)
The backend runs scheduled cron jobs within the NestJS process:

```typescript
@Injectable()
export class TasksSchedulerService {
  private readonly logger = new Logger(TasksSchedulerService.name);

  // Every 5 minutes: Scan for upcoming lessons starting within the next 60 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkUpcomingLessonReminders() {
    this.logger.debug('Running scan for 1-hour pre-lesson reminders');
    // Query groups with scheduled lessons starting in [NOW + 55 min, NOW + 60 min]
    // Emit 'lesson.upcoming_reminder' for unsent notifications
  }

  // Daily at 00:00: Scan for overdue unsolved homework
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scanUnsolvedHomework() {
    this.logger.debug('Running scan for unsolved assignments past due date');
    // Query assessments where type == 'ASSIGNMENT' AND due_date < NOW
    // Find active enrollments lacking submission
    // Emit 'assessment.unsolved_homework'
  }
}
```

### 17.2 Queue Evolution Path
- **Stage 1 (Current)**: In-process cron scheduling and asynchronous `EventEmitter2` listeners.
- **Stage 2 (Scale Transition)**: When background processing volume grows, BullMQ with a managed Redis instance will be plugged in without changing domain event signatures.

---

## 18. Security Architecture & Threat Mitigation

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY DEFENSE IN DEPTH                             │
│                                                                                 │
│   1. Network / Edge Layer: Cloudflare DDoS Protection, TLS 1.3, Rate Limiting   │
│   2. Reverse Proxy Layer: Nginx Security Headers (CSP, HSTS, X-Frame-Options)   │
│   3. Application Gateway: Helmet, CORS Whitelisting, Global ThrottlerGuard     │
│   4. Authentication Layer: Argon2id Password Hashing, Signed Stateless JWT      │
│   5. Authorization Layer: Strict Role Guards & Entity Ownership Verification   │
│   6. Input Validation Layer: class-validator DTO Whitelisting, XSS Sanitization│
│   7. Persistence Layer: Parameterized SQL (Prisma), Encrypted TLS 1.3 to Neon   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 18.1 Specific Security Controls

| Vulnerability / Threat | Mitigation Strategy in El Awal Backend Architecture |
|---|---|
| **SQL Injection** | **Prisma Parameterized Queries**: All database queries are compiled to parameterized SQL. Raw unescaped SQL strings are forbidden. |
| **Cross-Site Scripting (XSS)** | **Helmet Security Headers** + Content-Security-Policy (CSP) + input sanitization pipes stripping raw HTML tags from user-entered notes. |
| **Broken Object Level Auth (BOLA / IDOR)**| **ResourceOwnershipGuard**: System verifies that parents can only query linked students, teachers only manage their assigned groups, and students only submit their own assessments. |
| **QR Code Tampering & Replay** | **Cryptographic QR Tokens**: High-entropy, non-sequential QR tokens generated server-side. Scanner endpoint validates session context, group enrollment, and teacher session ownership with rate limiting. |
| **Brute Force & DoS Attacks** | **@nestjs/throttler Rate Limiting**: Global rate limit (e.g., 100 req/min per IP); strict rate limit on auth endpoints (e.g., 5 login attempts per 15 min); scanner throttling (max 60 scans/min per teacher session). |
| **Mass Assignment Vulnerabilities** | **DTO Whitelisting**: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` rejects any payload containing unapproved database columns. |
| **Credential & Secret Exposure** | Secrets injected via environment variables; `.env` excluded from version control; zero hardcoded tokens. |

---

## 19. Structured Logging, Auditing & Observability

### 19.1 Structured Logging Strategy
The application utilizes structured JSON logging (via Pino or NestJS Logger) to produce standardized, machine-parseable log lines:

```json
{
  "level": "info",
  "time": "2026-08-16T10:03:33.120Z",
  "pid": 1042,
  "correlationId": "req-c9a81234-5678-90ab-cdef",
  "context": "AssessmentsService",
  "event": "EXAM_AUTO_GRADED",
  "userId": "b8f6c4a2-1234-4b5c-890a-123456789abc",
  "assessmentId": "e1234567-89ab-cdef-0123-456789abcdef",
  "scoreObtained": 85.0,
  "totalScore": 100.0,
  "durationMs": 42
}
```

### 19.2 Sensitive Data Masking
- Passwords, JWT secrets, authorization headers, and payment details are strictly masked or redacted before emitting logs.

### 19.3 Health Checks & Liveness Probes
- Implemented via `@nestjs/terminus` at `/api/v1/health`:
  - **Database Ping**: Verifies PostgreSQL (Neon) responsiveness.
  - **Memory Health Indicator**: Flags memory heap thresholds.
  - **Disk Health Indicator**: Verifies storage availability on VPS.

---

## 20. Deployment Architecture (Hetzner VPS)

### 20.1 Infrastructure Topology

```text
+-----------------------------------------------------------------------------+
| Hetzner VPS (Ubuntu Linux 24.04 LTS / 4 vCPU / 8 GB RAM / 80 GB NVMe)       |
|                                                                             |
|  [Port 80/443] -> Let's Encrypt SSL -> Nginx (Reverse Proxy & Static Cache)  |
|                                           │                                 |
|                                           │ http://127.0.0.1:3000           |
|                                           v                                 |
|  [Docker Engine]                                                            |
|    └── Container: `elawal-backend` (Node.js LTS / Alpine / NestJS App)      |
|          ├── Process: NestJS Server (Cluster Mode / PM2 / Node Runtime)     |
|          └── Health: Docker Healthcheck (/api/v1/health)                    |
|                                                                             |
|  [Host Maintenance & Logging]                                               |
|    ├── Systemd Service (Auto-restart on reboot)                             |
|    └── Logrotate (Rotating Docker container log outputs)                    |
+-----------------------------------------------------------------------------+
```

### 20.2 Production Multi-Stage Dockerfile Blueprint

```dockerfile
# Stage 1: Build & Prune
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
USER node
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/package*.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 20.3 Continuous Integration & Deployment (CI/CD) Workflow
1. **GitHub Actions Pipeline**:
   - **Test & Lint**: Runs ESLint, TypeScript type-check, and automated unit/integration tests.
   - **Prisma Validation**: Runs `prisma validate` to guarantee schema integrity.
   - **Container Build**: Builds and pushes Docker image to secure container registry.
   - **Deployment Execution**: SSH to Hetzner VPS, pulls latest image, runs database migration (`prisma migrate deploy`), and performs zero-downtime container rolling restart.

---

## 21. Environment Separation & Configuration Management

### 21.1 Environment Architecture

| Environment | Purpose | Database (Neon) | Storage (Cloudflare R2) | Video (Bunny Stream) |
|---|---|---|---|---|
| **Development (`development`)** | Local engineer workstation | Neon Dev Branch / Local DB | R2 `elawal-dev` bucket | Bunny Stream Dev Library |
| **Preview / Staging (`staging`)** | Pull Request & integration testing | Neon Ephemeral Branch | R2 `elawal-staging` bucket | Bunny Stream Staging Library |
| **Production (`production`)** | Live production system | Neon Primary Main Branch | R2 `elawal-prod` bucket | Bunny Stream Production Library |

### 21.2 Configuration Validation Schema
Environment variables are managed via `@nestjs/config` and validated at startup using **Joi** / **Zod**:

```typescript
// Required Environment Variables Matrix
- NODE_ENV: 'development' | 'staging' | 'production'
- PORT: number (default: 3000)
- DATABASE_URL: string (Neon pooled connection string)
- DATABASE_URL_UNPOOLED: string (Neon direct connection string for migrations)
- JWT_SECRET: string (min 32 characters)
- JWT_EXPIRATION: string (e.g., '1h')
- CLOUDFLARE_R2_ACCOUNT_ID: string
- CLOUDFLARE_R2_ACCESS_KEY_ID: string
- CLOUDFLARE_R2_SECRET_ACCESS_KEY: string
- CLOUDFLARE_R2_BUCKET_NAME: string
- CLOUDFLARE_CDN_DOMAIN: string
- BUNNY_STREAM_API_KEY: string
- BUNNY_STREAM_LIBRARY_ID: string
- BUNNY_STREAM_TOKEN_SECURITY_KEY: string
```

---

## 22. Scalability, Resilience & Performance Strategy

### 22.1 Scalability Measures
1. **Stateless API Design**: The NestJS application server holds no in-memory session state; all state resides in PostgreSQL (Neon) or Cloudflare R2. Any number of NestJS instances can run behind Nginx or a load balancer.
2. **Serverless Connection Pooling**: Utilizing Neon's PgBouncer infrastructure prevents backend connection pool exhaustion under spiky loads (e.g., simultaneous exam submissions or attendance logging).
3. **Offloaded Media Bandwidth**: 100% of large file downloads and video streams are served directly by Cloudflare CDN and Bunny Stream, shielding VPS network bandwidth and CPU.

### 22.2 Resilience & Graceful Degradation
1. **Graceful Shutdown**: The NestJS application listens for `SIGTERM`/`SIGINT`, closes incoming connections, completes active in-flight requests, and disconnects Prisma pools cleanly.
2. **Circuit Breaking / Retries**: External API interactions (Bunny Stream, Cloudflare R2) implement bounded retries with exponential backoff and jitter.

---

## 23. Traceability & Product Requirements Matrix

| PRD Req ID | Product Feature / Module | Backend Architectural Component / Implementation |
|---|---|---|
| **`PRD-001`** | Student Profiles & Parent Links | `StudentsModule`, `UsersModule`, `StudentProfile`, `ParentStudentLink` |
| **`PRD-002`** | Group Formation & Lesson Schedules | `GroupsModule`, `AcademicGroup`, `LessonSchedule`, `GroupEnrollment` |
| **`PRD-003`** | Attendance & Absence Recording & Reports | `AttendanceModule`, `LessonSession`, `AttendanceRecord` (Manual & QR Scanning engine) |
| **`PRD-004`** | Educational Content & Video Tracking | `LessonsModule`, `EducationalContent`, `ContentProgress`, Cloudflare R2, Bunny Stream |
| **`PRD-005`** | Assessment Lifecycle (Assignments & Exams) | `AssessmentsModule`, `Assessment`, `AssessmentSubmission` |
| **`PRD-006`** | Automatic Examination Grading Engine | `AssessmentsService.processExamSubmission()`, `StudentAnswer`, auto-score calculation |
| **`PRD-007`** | Parent Progress Visibility & Notes | `ParentStatusModule`, `StudentEvaluation`, consolidated multi-domain reporting |
| **`PRD-008`** | 5 Event-Driven Academic Notifications | `NotificationsModule`, `TasksSchedulerService`, `EventEmitter2` listeners |
| **`PRD-009`** | 4 Stakeholder User Roles | `AuthModule`, `UsersModule`, `JwtAuthGuard`, `RolesGuard` (`TEACHER`, `STUDENT`, `PARENT`, `SECRETARIAT`) |
| **`PRD-010`** | Student Payment Status Tracking | `SubscriptionsModule`, `StudentPaymentRecord` |

---

## 24. Architectural Decision Records (ADRs) & Unresolved Decisions

### 24.1 Confirmed Architectural Decisions (ADRs)

#### ADR-001: Architecture Style — Modular Monolith
- **Status**: Accepted
- **Decision**: Structure the NestJS backend as a Modular Monolith.
- **Rationale**: Balances domain encapsulation with operational simplicity, zero network serialization latency between modules, and atomic ACID transaction capabilities.

#### ADR-002: Direct-to-Storage Uploads via Cloudflare R2 Presigned URLs
- **Status**: Accepted
- **Decision**: Issue presigned S3 upload URLs from NestJS; client uploads files directly to Cloudflare R2.
- **Rationale**: Eliminates multi-megabyte payload buffering on the Hetzner VPS, optimizing memory and network bandwidth.

#### ADR-003: Dedicated Video Streaming via Bunny Stream
- **Status**: Accepted
- **Decision**: Offload lecture video transcoding, HLS packaging, and edge streaming to Bunny Stream.
- **Rationale**: Avoids costly on-server video transcoding, provides adaptive bitrate streaming for students across variable mobile internet connections, and enforces token-signed video protection.

#### ADR-004: Primary Key Strategy — UUIDv4
- **Status**: Accepted
- **Decision**: Use UUIDv4 across all database entities.
- **Rationale**: Eliminates sequential ID enumeration attacks, protects student academic records, and allows client-side ID pre-generation where needed.

#### ADR-005: Unique Student QR Code Attendance Token Strategy
- **Status**: Accepted
- **Decision**: Provision a persistent, unique cryptographic UUID token (`qr_code_token`) per student record, indexed with `uq_student_qr_code`.
- **Rationale**: Provides O(1) indexed lookup upon scanner submission (<500ms response), prevents guessing or tampering with student IDs, and supports offline or printed student badge usage.

---

### 24.2 Open Decisions & Product Clarifications (`TBD`)

The following items are product-level or external business decisions that remain pending clarification from stakeholders:

| Item ID | Category | Description | Architecture Impact & Handling |
|---|---|---|---|
| **TBD-PROD-001** | Secretariat Scope | Detailed operational permissions and workflows for Secretariat staff. | Implemented as configurable role in `RolesGuard`; specific admin endpoints to be adjusted once finalized. |
| **TBD-PROD-002** | External Notification Gateways | Selection of external WhatsApp / SMS gateway providers for student/parent alerts. | `NotificationsModule` emits decoupled domain events; webhook/external dispatch adapters will plug in without changing core domain logic. |
| **TBD-PROD-003** | Assessment Due Dates & Limits | Maximum exam attempt limits, strict countdown timers, and late submission penalties. | Schema supports optional `due_date`; additional constraints will be enforced in `AssessmentsService` upon product definition. |
| **TBD-PROD-004** | Student Level Rubric | Specific grading formula or qualitative scale for `StudentEvaluation.student_level`. | Schema stores string representation; rubric calculation service to be finalized upon definition. |
| **TBD-PROD-005** | Student Payment Values | Standardized status enumeration for `StudentPaymentRecord.payment_status`. | Stored as descriptive string; enum constraint to be locked upon confirmation. |
