# Backend Implementation Architecture Blueprint

## 1. Document Information

- **Document Name**: Backend Implementation Architecture Blueprint (مخطط التنفيذ البرمجي للواجهة الخلفية)
- **Document Type**: Technical Architecture / Developer Implementation Blueprint
- **Product**: Educational Management System for Teachers and Students (El Awal / منصة الأول التعليمية)
- **Version**: 2.0.0
- **Status**: Approved Baseline — Online Learning Domain & Offline Sync Integrated
- **Technology Stack**:
  - **Framework**: NestJS (Node.js + TypeScript)
  - **ORM**: Prisma ORM
  - **Database**: PostgreSQL on Neon (Serverless Postgres with PgBouncer Pooling)
  - **Hosting Infrastructure**: Hetzner Cloud VPS (Docker + Nginx Reverse Proxy)
  - **Object Storage**: Cloudflare R2 (S3-Compatible Object Store)
  - **Media & Delivery**: Cloudflare CDN + Bunny Stream (HLS Video Transcoding & Delivery)
- **Source of Truth**:
  - [Business Requirements](file:///d:/el_awal/docs/01-PRD/business-requirements.md)
  - [Functional Requirements](file:///d:/el_awal/docs/01-PRD/functional-requirements.md)
  - [Non-Functional Requirements](file:///d:/el_awal/docs/01-PRD/non-functional-requirements.md)
  - [Use Cases](file:///d:/el_awal/docs/01-PRD/use-cases.md)
  - [User Stories](file:///d:/el_awal/docs/02-UX/user-stories.md)
  - [Backend Architecture](file:///d:/el_awal/docs/03-Architecture/backend-architecture.md)
  - [Database Design](file:///d:/el_awal/docs/03-Architecture/database-design.md)
  - [Business Logic Architecture](file:///d:/el_awal/docs/03-Architecture/business-logic.md)
  - [API Design Specification](file:///d:/el_awal/docs/03-Architecture/api-design.md)
  - [Test Plan & Test Cases](file:///d:/el_awal/docs/04-Test/test-cases.md)

---

## 2. Architectural Paradigm & Design Patterns

### 2.1 Layered Modular Monolith Pattern
The application is structured as a **Modular Monolith** organized into distinct functional domain modules. Each module maintains strict internal layering:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CONTROLLER LAYER                                 │
│  - REST Route Handlers (@Controller, @Get, @Post, @Patch, @Delete)          │
│  - HTTP Request / Response Serialization & Status Codes                     │
│  - Guard Attachment (@UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard))   │
│  - Pipe Validation (@UsePipes(ValidationPipe))                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Calls
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            APPLICATION LAYER                                │
│  - Application Services (@Injectable() XService)                            │
│  - Use-Case Orchestration & Cross-Module Delegation                         │
│  - Data Transformation & Response DTO Mapping                               │
│  - Domain Event Dispatching (EventEmitter2.emit)                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Coordinates
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DOMAIN & BUSINESS LOGIC LAYER                       │
│  - Core Domain Rules & Business Invariants (e.g. BLR-ATT-003, BLR-OL-003)   │
│  - Automated Exam Grading Engine & Formula Evaluation                       │
│  - QR Attendance 7-Tier Verification Pipeline                               │
│  - Monotonic Progress Merging & Completion Calculation                      │
│  - State Machine Transitions & Domain Exception Throwing                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Persists via
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA ACCESS & PERSISTENCE LAYER                     │
│  - Repositories / Dedicated Prisma Data Access Services                     │
│  - Atomic Transaction Management ($transaction, Unit of Work)               │
│  - Database Constraint Error Handling (P2002 Concurrency Fallbacks)         │
│  - Filter Criteria & Query Building                                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Interacts with
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRISMA ORM & NEON POSTGRESQL                          │
│  - Pooled Database Connection (PgBouncer)                                   │
│  - 26 Relational Entities, Indexes, Foreign Keys, Unique Constraints        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Core Design Invariants
1. **Separation of Concerns**: Controllers never execute database queries directly; business logic is quarantined within services/domain entities.
2. **Explicit DTO Boundaries**: Every network boundary crossing requires strongly typed Request and Response DTOs.
3. **Single Student Identity**: A single `StudentProfile` is shared across physical groups and online courses.
4. **Strict Domain Boundary**: Physical groups (`academic_groups`) and online courses (`courses`) are independent models. Online enrollments never grant physical QR attendance eligibility.
5. **Server Authority**: The backend is the sole authority for course access entitlement, grading, and progress state.

---

## 3. Directory Layout & Source Tree Structure

```text
src/
├── main.ts                           # Application bootstrap, global pipes, filters, Swagger
├── app.module.ts                     # Root module orchestrating all feature & core modules
│
├── core/                             # Cross-cutting foundational capabilities
│   ├── config/                       # Environment configuration & validation (Joi/Zod)
│   │   ├── env.validation.ts
│   │   └── configuration.ts
│   ├── database/                     # Database access layer
│   │   ├── prisma.service.ts         # Prisma client lifecycle singleton (connect/disconnect)
│   │   └── database.module.ts
│   ├── security/                     # Security guards, decorators, strategies
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts     # Bearer JWT verification guard
│   │   │   ├── roles.guard.ts        # Role-based access control guard
│   │   │   └── resource-ownership.guard.ts # BOLA / IDOR protection guard
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── public.decorator.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts       # Passport JWT extraction strategy
│   ├── filters/                      # Global exception filters
│   │   ├── global-exception.filter.ts# Catch-all sanitized 500 error filter
│   │   └── prisma-exception.filter.ts# Prisma P2002/P2025 error mapper
│   ├── interceptors/                 # Global response & logging interceptors
│   │   ├── transform-response.interceptor.ts # Global success envelope wrapper
│   │   └── logging.interceptor.ts    # Correlation ID & execution duration logger
│   ├── pipes/                        # Custom validation and sanitization pipes
│   │   └── trim-strings.pipe.ts
│   └── events/                       # Global event emitter & event bus constants
│       └── app-events.constant.ts
│
├── common/                           # Shared models, utilities, DTOs, and enums
│   ├── dto/
│   │   ├── pagination-query.dto.ts
│   │   ├── paginated-response.dto.ts
│   │   └── api-response.dto.ts
│   ├── enums/
│   │   ├── user-role.enum.ts         # TEACHER, STUDENT, PARENT, SECRETARIAT
│   │   ├── attendance-status.enum.ts # PRESENT, ABSENT, EXCUSED
│   │   ├── recording-method.enum.ts  # QR_SCAN, MANUAL
│   │   ├── assessment-type.enum.ts   # EXAM, ASSIGNMENT
│   │   ├── content-type.enum.ts      # FILE, SUMMARY, REFERENCE, LECTURE_RECORDING
│   │   ├── course-status.enum.ts     # DRAFT, PUBLISHED, ARCHIVED
│   │   └── access-status.enum.ts     # ACTIVE, EXPIRED, SUSPENDED
│   └── utils/
│       ├── crypto.util.ts            # High-entropy token generators, hashers
│       └── date.util.ts
│
├── integrations/                     # External infrastructure integrations
│   ├── storage/                      # Cloudflare R2 S3 SDK Integration
│   │   ├── storage.service.ts        # Presigned URL generation & file deletion
│   │   └── storage.module.ts
│   ├── video/                        # Bunny Stream API Integration
│   │   ├── bunny-video.service.ts    # Video upload signatures, HLS playback URLs
│   │   └── video.module.ts
│   └── notifications-gateway/        # Future external delivery channels (WhatsApp/SMS)
│       └── external-gateway.interface.ts
│
└── modules/                          # Domain feature modules
    ├── auth/                         # Authentication & identity management
    ├── users/                        # User account provisioning & profile queries
    ├── students/                     # Student lifecycle, code & QR credential generation
    ├── groups/                       # Academic groups, grade stages, student addition
    ├── schedules/                    # Timetable recurrence & calendar sessions
    ├── attendance/                   # QR scanning roll-call, manual fallback, reporting
    ├── courses/                      # Online Courses, Modules, Lessons, Enrollments, Progress
    │   ├── controllers/
    │   │   ├── courses.controller.ts
    │   │   ├── course-modules.controller.ts
    │   │   ├── course-lessons.controller.ts
    │   │   └── course-enrollments.controller.ts
    │   ├── services/
    │   │   ├── courses.service.ts
    │   │   ├── course-modules.service.ts
    │   │   ├── course-lessons.service.ts
    │   │   ├── course-enrollments.service.ts
    │   │   ├── course-access.service.ts
    │   │   └── course-progress.service.ts
    │   ├── dto/
    │   │   ├── create-course.dto.ts
    │   │   ├── update-course.dto.ts
    │   │   ├── create-module.dto.ts
    │   │   ├── create-lesson.dto.ts
    │   │   ├── update-progress.dto.ts
    │   │   └── course-response.dto.ts
    │   └── courses.module.ts
    ├── content/                      # Educational assets, lecture recordings, viewing tracking
    ├── assessments/                  # Assignments, exams, question bank, auto-grading
    ├── parent-portal/                # Parent read-only consolidated monitoring views
    ├── notifications/                # In-app event alerts & background scheduler
    ├── subscriptions/                # Payment status tracking & verification
    ├── sync/                         # Offline Outbox Batch Intake & Conflict Resolution
    │   ├── sync.controller.ts
    │   ├── sync.service.ts
    │   ├── dto/
    │   │   ├── batch-progress-sync.dto.ts
    │   │   └── sync-response.dto.ts
    │   └── sync.module.ts
    └── health/                       # Terminus liveness and readiness healthchecks
```

---

## 4. Module Boundaries & Dependency Graph

```text
                                  ┌──────────────┐
                                  │  AppModule   │
                                  └──────┬───────┘
                                         │
      ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
      │                   │                               │                   │
      ▼                   ▼                               ▼                   ▼
┌───────────┐     ┌─────────────┐                 ┌─────────────┐     ┌─────────────┐
│CoreModule │     │DatabaseMod  │                 │StorageModule│     │VideoModule  │
│(Auth/Conf)│     │(Prisma)     │                 │(Cloudflare) │     │(BunnyStream)│
└─────┬─────┘     └──────┬──────┘                 └──────┬──────┘     └──────┬──────┘
      │                  │                               │                   │
      └──────────────────┼───────────────────────────────┼───────────────────┘
                         │ Shared Foundation (Injected)
                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             FEATURE DOMAIN MODULES                               │
│                                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│   │  AuthModule  │───>│ UsersModule  │<───│StudentsModule│───>│ GroupsModule │   │
│   └──────────────┘    └──────────────┘    └──────┬───────┘    └──────┬───────┘   │
│                              │                   │                   │           │
│                              ▼                   ▼                   ▼           │
│                       ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│                       │ParentPortalMod│   │AttendanceMod │<───│ SchedulesMod │   │
│                       └──────────────┘    └──────┬───────┘    └──────────────┘   │
│                              ▲                   │                               │
│                              │                   ▼            ┌──────────────┐   │
│                       ┌──────┴───────┐    ┌──────────────┐    │ContentModule │   │
│                       │CoursesModule │    │Notifications │<───│(Assets/Videos│   │
│                       └──────┬───────┘    │(Event Bus)   │    └──────────────┘   │
│                              │            └──────────────┘                       │
│                              ▼                   ▲                               │
│                       ┌──────────────┐           │            ┌──────────────┐   │
│                       │  SyncModule  │───────────┘            │AssessmentsMod│   │
│                       └──────────────┘                        └──────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Courses & Sync Modules Deep-Dive

### 5.1 Courses Module (`src/modules/courses`)
- **Responsibilities**: Online course catalog, module/lesson hierarchy, digital student enrollments, course access entitlements, asynchronous video stream token generation, and monotonic lesson progress tracking.
- **Components**:
  - `CoursesController`: `GET /api/v1/courses`, `POST /api/v1/courses`, `GET /api/v1/courses/:id`, `PATCH /api/v1/courses/:id`.
  - `CourseModulesController`: `POST /api/v1/courses/:id/modules`, `PATCH /api/v1/courses/modules/:moduleId`.
  - `CourseLessonsController`: `POST /api/v1/courses/modules/:moduleId/lessons`, `GET /api/v1/courses/lessons/:lessonId`, `POST /api/v1/courses/lessons/:lessonId/progress`.
  - `CourseEnrollmentsController`: `POST /api/v1/courses/:id/enroll`, `GET /api/v1/courses/my-courses`.
  - `CoursesService`: Manages course CRUD and publishing status lifecycle (`DRAFT` -> `PUBLISHED` -> `ARCHIVED`).
  - `CourseAccessService`: Validates student entitlement against `course_access` table before releasing signed video tokens or lesson files.
  - `CourseProgressService`: Ingests video playback timestamps, executes monotonic progress merges, updates completion status, and computes total course progress percentage.

### 5.2 Sync Module (`src/modules/sync`)
- **Responsibilities**: Batch intake of offline staged client operations (`POST /api/v1/sync/progress`), idempotent deduplication via `client_operation_id`, atomic transaction execution, and conflict resolution.
- **Components**:
  - `SyncController`: Exposes `POST /api/v1/sync/progress`.
  - `SyncService`: Validates student JWT, opens Prisma `$transaction`, iterates through progress batch, merges monotonic max playback positions and boolean completion flags, and returns confirmed operation UUIDs.

---

## 6. End-to-End Execution Lifecycles

### 6.1 Online Lesson Playback & Progress Save Lifecycle
```text
1. Student Client -> GET /api/v1/courses/lessons/:lessonId
2. NestJS JwtAuthGuard -> Resolves student identity from JWT
3. CourseAccessService -> Verifies active CourseAccess entitlement for student
4. BunnyVideoService -> Generates signed, time-limited video playback URL
5. StorageService (R2) -> Issues presigned download URLs for attached lesson PDFs
6. CourseProgressService -> Retrieves existing playback position (last_position_seconds)
7. Controller -> Returns LessonViewModel (videoUrl, resumePosition, attachments)
8. Client Video Player -> Plays video and emits periodic heartbeats:
   POST /api/v1/courses/lessons/:lessonId/progress { positionSeconds: 180, isCompleted: false }
9. CourseProgressService -> Updates course_progress atomically in PostgreSQL
```

### 6.2 Offline-to-Online Sync Lifecycle
```text
1. Client loses connection -> Plays cached content -> Queues completion in IndexedDB outbox
2. Network reconnects -> Client flushes outbox: POST /api/v1/sync/progress { operations: [...] }
3. NestJS SyncController -> Ingests batch payload
4. SyncService -> Executes atomic Prisma $transaction:
   - For each operation: validates client_operation_id uniqueness (idempotency)
   - Executes monotonic merge: last_position_seconds = GREATEST(db, payload), is_completed = db OR payload
   - Recalculates overall course completion percentage
5. Controller -> Returns { processedOperations: [...], courseProgressSummary: {...} }
6. Client -> Clears synced operations from local IndexedDB outbox
```

---

## 7. Requirement Traceability Matrix

| Architectural Component | Related Functional Requirement | Related Product Requirement |
|---|---|---|
| `CoursesModule` / `CoursesService` | `FR-OL-001`, `FR-OL-002` | `PRD-OL-001` |
| `CourseEnrollmentsService` / `CourseAccessService` | `FR-OL-003` | `PRD-OL-002` |
| `CourseLessonsService` / `BunnyVideoService` | `FR-OL-004` | `PRD-OL-003` |
| `CourseProgressService` | `FR-OL-005` | `PRD-OL-004` |
| `AssessmentsModule` (Course Context) | `FR-OL-006` | `PRD-OL-005` |
| `ParentPortalModule` (Courses View) | `FR-OL-007` | `PRD-OL-006` |
| `SyncModule` / `SyncService` | `FR-OL-008` | `PRD-OL-007` |
| `AttendanceModule` (QR 7-Tier Pipeline) | `FR-ATT-001..004` | `PRD-003` |
