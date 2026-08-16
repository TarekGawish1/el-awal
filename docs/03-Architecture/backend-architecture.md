# Backend Architecture Specification

## 1. Document Overview

### 1.1 Purpose
This document defines the complete backend software architecture for the **Educational Management System for Teachers and Students** (El Awal). It establishes the technical blueprint, application structure, modular boundaries, cross-cutting infrastructure patterns, integration mechanisms, and operational deployment strategies required to implement the approved product requirements reliably and securely across both **Physical Learning** and **Online Learning** delivery models.

### 1.2 Scope
This specification governs the backend application layer serving the four confirmed stakeholder personas:
- **Teacher (`المدرس`)**
- **Student (`الطالب`)**
- **Parent (`ولي الأمر`)**
- **Secretariat (`السكرتارية`)**

It covers all ten confirmed functional modules:
1. **Student Management**
2. **Attendance & Absence** (Physical Classroom)
3. **Lectures & Lessons**
4. **Exams & Assignments**
5. **Parent Student Status**
6. **Notifications**
7. **Groups Management** (Physical Classroom)
8. **Users & Permissions**
9. **Subscriptions (Payment Status Tracking)**
10. **Online Learning (Courses & Asynchronous Learning)**

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

---

## 2. Approved Technology Stack

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
| **Video Transcoding & Delivery** | **Bunny Video / Bunny Stream** | Dedicated video cloud handling encoding, multi-bitrate HLS/DASH streaming, DRM/signed token protection, and edge playback for lecture recordings and online course lessons. |
| **Frontend Consumer** | **Next.js** | React full-stack framework consuming the backend via HTTPS REST APIs and signed webhooks/tokens. |

---

## 3. Architectural Style: Modular Monolith

### 3.1 Architectural Selection
The backend is structured as a **Modular Monolith** using NestJS:

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
│   │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │   │
│   │         │                 │                 │                 │          │   │
│   │  ┌──────▼───────┐  ┌──────▼───────┐         │                 │          │   │
│   │  │Subscriptions │  │   Courses    │◄────────┘                 │          │   │
│   │  │    Module    │  │    Module    │ (Online Learning Domain)  │          │   │
│   │  └──────────────┘  └──────────────┘                           │          │   │
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

### 3.2 Domain Boundary Separation
- **Physical Learning Domain (`GroupsModule`, `AttendanceModule`)**:
  - Manages `AcademicGroup`, `GroupEnrollment`, `LessonSchedule`, `LessonSession`, `AttendanceRecord`.
  - Operates classroom QR scanning pipeline requiring physical group membership.
- **Online Learning Domain (`CoursesModule`)**:
  - Manages `Course`, `CourseModule`, `CourseLesson`, `CourseEnrollment`, `CourseAccess`, `CourseProgress`.
  - Operates asynchronous video streaming, lesson progress tracking, and online assessment workflows.
  - An online course is an independent entity, NOT another type of `AcademicGroup`.
- **Shared Entities (`LessonsModule`, `AssessmentsModule`)**:
  - `EducationalContent` and `Assessment` attach polymorphically to physical groups OR online course lessons.
- **Single Student Identity (`StudentsModule`, `UsersModule`)**:
  - `StudentProfile` is unified across physical and online learning.

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
                               |   - Physical & Online Views |
                               |   - Local Outbox & DB Sync  |
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
|  |   ├── StudentsModule / GroupsModule (Physical Domain)                                             |  |
|  |   ├── AttendanceModule (QR 7-Tier Pipeline)                                                       |  |
|  |   ├── CoursesModule (Online Learning Domain)                                                      |  |
|  |   ├── LessonsModule (Polymorphic Content)                                                         |  |
|  |   ├── AssessmentsModule (Exams & Assignments + Auto-Grading Engine)                              |  |
|  |   ├── ParentStatusModule / SubscriptionsModule                                                    |  |
|  |   ├── SyncModule (Offline Progress & Outbox Intake)                                               |  |
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
                |  - PostgreSQL v16 Engine     |  |  - PDFs / Summaries  |  |  - Video Transcoding      |
                |  - Serverless PgBouncer Pool |  |  - Homework Files    |  |  - Adaptive HLS Streaming |
                |  - Branching (Dev/Staging)   |  |  - CDN Edge Delivery |  |  - Signed Embed Tokens    |
                +------------------------------+  +----------------------+  +---------------------------+
```

---

## 5. Backend Module Decomposition

The application is decomposed into ten **Domain Modules** matching the product requirements, augmented by **Core Infrastructure Modules**.

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
    ├── groups/                     # Academic Groups, Lesson Schedules, Physical Enrollments
    ├── attendance/                 # Sessions, QR 7-Tier Verification Pipeline, Reports
    ├── courses/                    # Online Courses, Modules, Lessons, Enrollments, Access, Progress
    ├── lessons/                    # Educational Files, Summaries, Progress Tracking
    ├── assessments/                # Assignments, Exams, Auto-Grading Engine, Submissions
    ├── parent-status/              # Evaluations, Teacher Notes, Parent-Visible Aggregations
    ├── notifications/              # In-App Alerts, Event Handlers, Reminder Jobs
    ├── subscriptions/              # Student Payment Status Tracking Records
    └── sync/                       # Offline Outbox Batch Intake & Conflict Resolution
```

### 5.1 Domain Modules Responsibility Matrix

| Module Name | NestJS Encapsulation | Primary Domain Entities Managed | Core Services / Responsibilities |
|---|---|---|---|
| **`AuthModule`** | `auth/` | `User`, Session Tokens | Password hashing (argon2/bcrypt), JWT token issuance/verification, login, logout, identity validation. |
| **`UsersModule`** | `users/` | `User`, `TeacherProfile`, `ParentProfile`, `SecretariatProfile` | User provisioning, profile management, role verification, active/inactive toggles. |
| **`StudentsModule`** | `students/` | `StudentProfile`, `ParentStudentLink` | Student profile management, student code generation, unique QR token provisioning (`qr_code_token`), parent-student linkage resolution. |
| **`GroupsModule`** | `groups/` | `AcademicGroup`, `GroupEnrollment`, `LessonSchedule` | Physical group creation, physical student enrollment/transfer/drop, weekly lesson timetable configuration. |
| **`AttendanceModule`** | `attendance/` | `LessonSession`, `AttendanceRecord` | Physical session management, **Student QR Code Attendance Scanning Engine** (7-tier pipeline: `POST /sessions/:sessionId/scan-qr`), manual roll-call, attendance reports. |
| **`CoursesModule`** | `courses/` | `Course`, `CourseModule`, `CourseLesson`, `CourseEnrollment`, `CourseAccess`, `CourseProgress` | Online course authoring, module/lesson hierarchy, catalog discovery, student enrollment, access entitlement validation, asynchronous lesson delivery, video token generation, lesson progress tracking, course completion calculation. |
| **`LessonsModule`** | `lessons/` | `EducationalContent`, `ContentProgress` | File metadata management across physical groups and online lessons, R2 presigned upload URL issuance, Bunny Stream video registration, viewing tracking. |
| **`AssessmentsModule`**| `assessments/`| `Assessment`, `AssessmentQuestion`, `AssessmentSubmission`, `StudentAnswer` | Homework/exam authoring across physical groups and online courses, question management, submission handling, **Automatic Exam Grading Engine**, score calculations. |
| **`ParentStatusModule`**| `parent-status/`| `StudentEvaluation` | Teacher evaluations, qualitative notes, student level rating records, consolidated physical and online progress summary for guardians. |
| **`NotificationsModule`**| `notifications/`| `Notification` | Event listener handling (lesson reminders, unsolved homework, new exams, exam scores, absences), in-app notification persistence. |
| **`SubscriptionsModule`**| `subscriptions/`| `StudentPaymentRecord` | Manual tuition fee payment status tracking per student and billing period for physical cohorts. |
| **`SyncModule`** | `sync/` | Progress Events Outbox | Offline outbox batch intake (`POST /api/v1/sync/progress`), idempotent operation handling, conflict resolution, server-authoritative entitlement checks. |

---

## 6. Layer Responsibilities & Request Lifecycle

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION / API LAYER                        │
│  - Controllers: Expose REST endpoints, consume DTOs, return ViewModels │
│  - Guards: Enforce Authentication (JWT) and Role Permissions (RBAC)    │
│  - Ownership Guard: Verify BOLA / IDOR resource isolation              │
│  - Pipes: Validate request payload schema, transform types, sanitize  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        APPLICATION / DOMAIN LAYER                      │
│  - Services: Encapsulate domain rules, invariants, and workflows       │
│  - CoursesService: Manage course lifecycle & catalog                   │
│  - CourseProgressService: Monotonic progress & completion calculation  │
│  - AttendanceService: 7-Tier QR Attendance Verification Pipeline       │
│  - GradingService: Synchronous Automatic Exam Evaluation               │
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

---

## 7. Core Architectural Pipelines

### 7.1 Online Course Access & Streaming Pipeline

```text
Student Request: GET /api/v1/courses/lessons/:lessonId
  │
  ├──► [1. JwtAuthGuard] ───────────► Validate student JWT
  │
  ├──► [2. CourseAccessService] ────► Query course_access: Verify status == 'ACTIVE' && (valid_until IS NULL || valid_until > now())
  │      └── If Inactive / Expired ─► Throw 403 Forbidden ("COURSE_ACCESS_EXPIRED")
  │
  ├──► [3. VideoService (Bunny)] ───► Generate signed, time-limited video embed token for video_asset_id
  │
  ├──► [4. StorageService (R2)] ────► Generate secure download URLs for attached lesson PDFs
  │
  └──► [5. CourseProgressService] ──► Query/Initialize course_progress row ──► Return lesson payload with resume position
```

### 7.2 Offline Progress Synchronization Pipeline

```text
Client Reconnects ──► Dispatches Batch Outbox: POST /api/v1/sync/progress
  │
  ├──► [1. JwtAuthGuard] ───────────► Validate student identity
  │
  ├──► [2. SyncService Intake] ─────► Process batch in single Prisma $transaction:
  │      ├── For each progress event (client_operation_id, lesson_id, position_seconds, is_completed):
  │      │     ├── Check if client_operation_id already processed (Idempotency check)
  │      │     │     └── If processed: Skip mutation, return cached confirmation
  │      │     │
  │      │     ├── Verify active student course enrollment
  │      │     │
  │      │     ├── Monotonic Progress Merge:
  │      │     │     ├── last_position_seconds = GREATEST(existing.last_position_seconds, payload.position_seconds)
  │      │     │     ├── is_completed = existing.is_completed OR payload.is_completed
  │      │     │     └── completed_at = existing.completed_at ?? (payload.is_completed ? now() : NULL)
  │      │     │
  │      │     └── Update last_synced_at = now(), client_operation_id = payload.client_operation_id
  │      │
  │      └── Recalculate dynamic course completion percentage
  │
  └──► Return 200 OK with processed operation IDs and updated course metrics
```

### 7.3 QR Attendance 7-Tier Verification Pipeline (Preserved Architecture)
1. **Tier 1: Scanner Authentication & Session Authorization**: Verifies teacher identity and ownership of the active `LessonSession`.
2. **Tier 2: Session Validity**: Verifies session date and non-voided state.
3. **Tier 3: QR Credential Resolution**: Resolves opaque `qr_code_token` to `StudentProfile`.
4. **Tier 4: Student Active Status**: Verifies `academic_status == 'ACTIVE'`.
5. **Tier 5: Physical Group Enrollment Verification**: Verifies student belongs to session's physical `AcademicGroup` via active `GroupEnrollment`. Online-only course enrollments are explicitly rejected (`NOT_ENROLLED_IN_GROUP`).
6. **Tier 6: Idempotent Concurrency Control**: Evaluates `(session_id, student_id)`. If record exists, acknowledges idempotently without mutation. If absent, atomically creates `AttendanceRecord` with `status = 'PRESENT'` and `recording_method = 'QR_SCAN'`.
7. **Tier 7: Concurrency Race Handling**: PostgreSQL `uq_session_student` unique constraint catches concurrent identical scans; application catches Prisma P2002 error and returns winner record idempotently.

---

## 8. Data Protection & Security Invariants

1. **Server Authority**: The cloud database (Neon PostgreSQL) is the sole authority for entitlement, access control, and grade computation. Local client storage is strictly a cache.
2. **Student Isolation**: Endpoints enforcing student access strictly derive `studentId` from the authenticated JWT token context, preventing IDOR/BOLA attacks.
3. **Parent Link Verification**: Parent endpoints verify explicit entries in `parent_student_links` before returning attendance or course progress.
4. **Physical vs. Online Boundary**: `GroupEnrollment` and `CourseEnrollment` are strictly decoupled. No endpoint shall treat a `CourseEnrollment` as satisfying physical classroom attendance eligibility.
5. **Video Security**: Bunny Stream videos use signed tokens with 1-hour expiration; direct video MP4 downloads are disabled.
