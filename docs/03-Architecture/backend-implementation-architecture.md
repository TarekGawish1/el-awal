# Backend Implementation Architecture Blueprint

## 1. Document Information

- **Document Name**: Backend Implementation Architecture Blueprint (مخطط التنفيذ البرمجي للواجهة الخلفية)
- **Document Type**: Technical Architecture / Developer Implementation Blueprint
- **Product**: Educational Management System for Teachers and Students (El Awal / منصة الأول التعليمية)
- **Version**: 1.0.0
- **Status**: Approved Baseline
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
│  - Core Domain Rules & Business Invariants (e.g. BLR-ATT-003, BLR-EXM-003)   │
│  - Automated Exam Grading Engine & Formula Evaluation                       │
│  - QR Attendance 7-Tier Verification Pipeline                               │
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
│  - 20 Relational Entities, Indexes, Foreign Keys, Unique Constraints        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Core Design Invariants
1. **Separation of Concerns**: Controllers never execute database queries directly; business logic is quarantined within services/domain entities.
2. **Explicit DTO Boundaries**: Every network boundary crossing requires strongly typed Request and Response DTOs.
3. **Immutability of Audit Trails**: Historical attendance (`attendance_records`) and grading submissions (`assessment_submissions`) cannot be mutated or purged by normal operations.
4. **Stateless Scalability**: The NestJS server retains zero in-memory session state; all authentication state resides in signed stateless JWTs and persistent PostgreSQL tables.

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
│   │   └── content-type.enum.ts      # FILE, SUMMARY, REFERENCE, LECTURE_RECORDING
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
    ├── content/                      # Educational assets, lecture recordings, viewing tracking
    ├── assessments/                  # Assignments, exams, question bank, auto-grading
    ├── parent-portal/                # Parent read-only consolidated monitoring views
    ├── notifications/                # In-app event alerts & background scheduler
    ├── subscriptions/                # Payment status tracking & verification
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
│                                                  │                               │
│                       ┌──────────────┐           ▼            ┌──────────────┐   │
│                       │AssessmentsMod│    ┌──────────────┐    │ContentModule │   │
│                       └──────┬───────┘    │Notifications │<───│(Assets/Videos│   │
│                              │            │(Event Bus)   │    └──────────────┘   │
│                              ▼            └──────────────┘                       │
│                       ┌──────────────┐           ▲                               │
│                       │Subscriptions │───────────┘                               │
│                       └──────────────┘                                           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Domain Feature Module Architecture

### 5.1 Auth Module (`src/modules/auth`)
- **Responsibilities**: User login, credential verification (Argon2id), JWT issuance, session refresh, identity inspection.
- **Components**:
  - `AuthController`: Routes for `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
  - `AuthService`: Password comparison via `argon2`, JWT generation via `@nestjs/jwt`, user profile assembly.
  - `JwtStrategy`: Passport strategy extracting Bearer JWTs from `Authorization` header and validating cryptographic signature.
  - `DTOs`: `LoginRequestDto`, `AuthResponseDto`, `UserProfileDto`.

### 5.2 Students Module (`src/modules/students`)
- **Responsibilities**: Student profile management, student identification code generation, cryptographically random QR credential provisioning (`qr_code_token`), token revocation/regeneration.
- **Components**:
  - `StudentsController`: Routes for `GET /api/v1/students`, `POST /api/v1/students`, `GET /api/v1/students/:id`, `PATCH /api/v1/students/:id`, `POST /api/v1/students/:id/regenerate-qr-token`.
  - `StudentsService`: Encapsulates student creation within `$transaction` (User account + StudentProfile + Parent linkage + Group enrollment).
  - `QrTokenGeneratorService`: Generates high-entropy, collision-free tokens (`crypto.randomUUID()`) and validates format.
  - `DTOs`: `CreateStudentDto`, `UpdateStudentProfileDto`, `StudentResponseDto`, `RegenerateQrResponseDto`.

### 5.3 Groups & Schedules Module (`src/modules/groups`, `src/modules/schedules`)
- **Responsibilities**: Academic cohort management, grade-level binding, student roster enrollment, weekly recurring timetables (`lesson_schedules`), execution session instances (`lesson_sessions`).
- **Components**:
  - `GroupsController`: Routes for group CRUD, student addition, and schedule attachments.
  - `GroupsService`: Manages cohort rosters and verifies teacher group ownership.
  - `SchedulesService`: Manages weekly recurring rules and generates `lesson_sessions` calendar records.
  - `DTOs`: `CreateGroupDto`, `EnrollStudentDto`, `CreateScheduleDto`, `GroupResponseDto`.

### 5.4 Attendance Module (`src/modules/attendance`)
- **Responsibilities**: High-throughput QR code camera roll-call check-in, manual attendance/absence fallback, concurrency race arbitration, attendance reporting.
- **Components**:
  - `AttendanceController`:
    - `POST /api/v1/attendance/sessions/:sessionId/scan-qr`: Scanner check-in endpoint.
    - `POST /api/v1/attendance/sessions/:sessionId/manual`: Manual roll-call fallback.
    - `GET /api/v1/attendance/reports`: Aggregated reporting.
  - `AttendanceService`: Coordinates the 7-tier verification pipeline and concurrency handling.
  - `AttendanceRepository`: Handles database queries and Prisma `P2002` exception translation.
  - `DTOs`: `ScanQrRequestDto`, `ManualAttendanceDto`, `AttendanceResponseDto`, `AttendanceReportDto`.

### 5.5 Content Module (`src/modules/content`)
- **Responsibilities**: Educational asset metadata management (PDF files, summaries, references, lecture recordings), Cloudflare CDN delivery integration, Bunny Stream video playback signing, student viewing progress tracking.
- **Components**:
  - `ContentController`: Routes for content publishing, asset retrieval, progress logging.
  - `ContentService`: Coordinates asset creation and viewing percentage updates (`content_progress`).
  - `DTOs`: `CreateContentDto`, `UpdateProgressDto`, `ContentResponseDto`.

### 5.6 Assessments & Grading Module (`src/modules/assessments`)
- **Responsibilities**: Assignment and examination authoring, structured question banking, student digital submissions, synchronous automated exam grading, parent-visible score publishing.
- **Components**:
  - `AssessmentsController`: Routes for creating exams, submitting student answers, viewing grade reports.
  - `AssessmentsService`: Coordinates assessment lifecycles and submission persistence.
  - `GradingEngineService`: Domain service executing automated score calculations:
    - Iterates over student answer array.
    - Compares submitted answer with `questions.correct_answer`.
    - Computes `score_obtained`, `total_score`, percentage, and pass/fail boolean.
    - Emits `'assessment.exam_graded'` domain event upon completion.
  - `DTOs`: `CreateAssessmentDto`, `SubmitAssessmentDto`, `GradingResultDto`.

### 5.7 Parent Portal Module (`src/modules/parent-portal`)
- **Responsibilities**: Read-only aggregated monitoring endpoints for guardians, linking parent accounts to authorized children (`parent_student_links`), compiling comprehensive academic dashboards.
- **Components**:
  - `ParentPortalController`: Routes for `GET /api/v1/parent-portal/students/:id/overview`, evaluations, homework, grades, and attendance.
  - `ParentPortalService`: Executes parallel optimized queries (`Promise.all`) to assemble student evaluations, assignment completion ratios, exam grade histories, and attendance rates.
  - `DTOs`: `ParentStudentOverviewDto`, `StudentEvaluationDto`, `ParentGradeReportDto`.

### 5.8 Notifications Module (`src/modules/notifications`)
- **Responsibilities**: In-app notification persistence, unread counter management, asynchronous event listeners, scheduled background cron triggers.
- **Components**:
  - `NotificationsController`: Routes for `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`.
  - `NotificationsService`: Persists notification rows and calculates unread totals.
  - `NotificationsEventListener`: Listens for domain events emitted across the application (`EventEmitter2`):
    - `'attendance.student_absent'` $\rightarrow$ Dispatches absence notification to Parent.
    - `'assessment.exam_graded'` $\rightarrow$ Dispatches grade notice to Student & Parent.
    - `'assessment.published'` $\rightarrow$ Dispatches new exam alert to enrolled group.
    - `'lesson.1h_reminder'` $\rightarrow$ Dispatches lesson reminder to Student & Parent.
  - `TasksSchedulerService`: Cron job runners (`@nestjs/schedule`) evaluating 1-hour pre-lesson reminder windows and overdue unsolved homework.

### 5.9 Subscriptions Module (`src/modules/subscriptions`)
- **Responsibilities**: Student payment status tracking (`حالة الدفع لكل طالب`), recording administrative payment updates, querying payment records.
- **Components**:
  - `SubscriptionsController`: Routes for `GET /api/v1/subscriptions/payments`, `PATCH /api/v1/subscriptions/students/:id/payment-status`.
  - `SubscriptionsService`: Manages `student_payment_records` persistence and validation.
  - `DTOs`: `UpdatePaymentStatusDto`, `PaymentRecordResponseDto`.

---

## 6. Execution Flow & Detailed Technical Recipes

### 6.1 QR Attendance Concurrency & Verification Implementation Flow
The implementation structure for `AttendanceService.recordAttendanceByQrToken` follows the verified 7-tier architecture:

```typescript
// Architectural Recipe: Concurrency-Safe QR Attendance Processing
async function recordAttendanceByQrToken(
  sessionId: string,
  qrCodeToken: string,
  teacherId: string,
): Promise<AttendanceScanResult> {
  // Tier 1 & 2: Validate Session Existence & State
  const session = await prisma.lessonSession.findUnique({
    where: { id: sessionId },
    include: { academicGroup: true },
  });
  if (!session) throw new NotFoundException('Lesson session not found');
  if (session.status === 'ARCHIVED') throw new BadRequestException('Session attendance window is closed');

  // Tier 3: O(1) Indexed Token Lookup
  const student = await prisma.studentProfile.findUnique({
    where: { qrCodeToken },
    include: { user: true },
  });
  if (!student) throw new NotFoundException('Invalid or unassigned QR token');

  // Tier 4: Student Account Integrity
  if (!student.user.isActive) throw new ForbiddenException('Student account is inactive');
  if (student.academicStatus !== 'ACTIVE') throw new UnprocessableEntityException('Student status is not active');

  // Tier 5: Cohort Enrollment Check
  const enrollment = await prisma.groupEnrollment.findFirst({
    where: {
      groupId: session.groupId,
      studentId: student.id,
      status: 'ACTIVE',
    },
  });
  if (!enrollment) {
    const actualGroup = await this.resolveStudentPrimaryGroup(student.id);
    return {
      success: false,
      code: 'GROUP_ENROLLMENT_MISMATCH',
      message: 'Student is not enrolled in this group',
      details: { studentName: student.user.fullName, actualGroup },
    };
  }

  // Tier 6: Concurrency-Safe Idempotent Persistence
  try {
    // 1. Optimistic Check: Avoid unnecessary write locks if already scanned
    const existing = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: student.id } },
    });
    if (existing) {
      return {
        success: true,
        isDuplicate: true,
        student: { id: student.id, fullName: student.user.fullName, studentCode: student.studentCode },
        attendance: existing,
        sessionStats: await this.getSessionStats(sessionId),
      };
    }

    // 2. First Scan: Create new record
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId,
        studentId: student.id,
        status: 'PRESENT',
        recordingMethod: 'QR_SCAN',
        recordedById: teacherId,
        recordedAt: new Date(),
      },
    });

    // Tier 7: Event Dispatch & Success Response
    this.eventEmitter.emit('attendance.student_checked_in', {
      sessionId,
      studentId: student.id,
      teacherId,
      timestamp: record.recordedAt,
    });

    return {
      success: true,
      isDuplicate: false,
      student: { id: student.id, fullName: student.user.fullName, studentCode: student.studentCode },
      attendance: record,
      sessionStats: await this.getSessionStats(sessionId),
    };
  } catch (error) {
    // 3. Race Condition Arbiter: Catch PostgreSQL uq_session_student violation (P2002)
    if (error.code === 'P2002') {
      const winner = await prisma.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId, studentId: student.id } },
      });
      return {
        success: true,
        isDuplicate: true,
        student: { id: student.id, fullName: student.user.fullName, studentCode: student.studentCode },
        attendance: winner,
        sessionStats: await this.getSessionStats(sessionId),
      };
    }
    throw error;
  }
}
```

---

### 6.2 Direct-to-R2 Presigned Upload Execution Flow
To prevent file upload buffering from exhausting VPS RAM and bandwidth, client uploads bypass the NestJS server:

```text
Step 1: Frontend requests upload grant -> POST /api/v1/uploads/presigned-url
        Payload: { fileName, contentType, fileSize, category }
        │
        ▼
Step 2: NestJS UploadsService validates file type/size constraints & generates:
        - fileKey: "summaries/2026/08/nahw-unit-1-[uuid].pdf"
        - presignedS3Url (via @aws-sdk/s3-request-presigner, expires in 15 min)
        - publicCdnUrl: "https://cdn.elawal.edu/summaries/2026/08/nahw-unit-1-[uuid].pdf"
        │
        ▼
Step 3: Client uploads file directly to Cloudflare R2 via HTTP PUT presignedS3Url
        │
        ▼
Step 4: Upon upload completion, Client submits metadata to NestJS -> POST /api/v1/content
        Payload: { groupId, title, contentType, fileKey, fileUrl: publicCdnUrl, fileSize }
        │
        ▼
Step 5: NestJS ContentService persists educational_content record in PostgreSQL
```

---

### 6.3 Automated Exam Grading Engine Flow
The exam evaluation flow runs synchronously in the application layer upon exam submission:

```text
Student Submits Answers -> POST /api/v1/assessments/:id/submit { answers: [{ questionId, selectedAnswer }] }
        │
        ▼
AssessmentsService.submitAssessment(assessmentId, studentId, answersDto)
        │
        ├── 1. Query Assessment with Questions:
        │      prisma.assessment.findUnique({ where: { id: assessmentId }, include: { questions: true } })
        │      └── Verify: assessment is published, student is enrolled, due_date is valid
        │
        ├── 2. Grading Engine Evaluation (Synchronous Loop):
        │      let totalScoreObtained = 0;
        │      const studentAnswersToPersist = [];
        │      for (const question of assessment.questions) {
        │        const submitted = answers.find(a => a.questionId === question.id);
        │        const isCorrect = submitted && submitted.selectedAnswer.trim() === question.correctAnswer.trim();
        │        const pointsAwarded = isCorrect ? question.points : 0;
        │        totalScoreObtained += pointsAwarded;
        │        studentAnswersToPersist.push({ questionId: question.id, submittedAnswer: submitted?.selectedAnswer, isCorrect, pointsAwarded });
        │      }
        │      const isPassed = totalScoreObtained >= assessment.passingScore;
        │
        ├── 3. Persist Submission & Student Answers via Prisma $transaction:
        │      prisma.$transaction([
        │        prisma.assessmentSubmission.create({
        │          data: { assessmentId, studentId, status: 'GRADED', scoreObtained: totalScoreObtained, totalScore: assessment.totalScore, isPassed, gradedAt: new Date() }
        │        }),
        │        prisma.studentAnswer.createMany({ data: studentAnswersToPersist })
        │      ])
        │
        ├── 4. Emit Domain Event: 'assessment.exam_graded'
        │      eventEmitter.emit('assessment.exam_graded', { studentId, assessmentId, scoreObtained: totalScoreObtained, totalScore: assessment.totalScore })
        │
        └── 5. Return Immediate Grading Result Response (<100ms) to Student
```

---

## 7. Data Transfer Objects (DTOs) & Validation Blueprint

### 7.1 Global Validation Configuration
The application configures global validation in `main.ts`:
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Strips unwhitelisted properties (anti-mass assignment)
    forbidNonWhitelisted: true,   // Rejects unexpected payload fields with 400 Bad Request
    transform: true,              // Transforms incoming payloads into typed DTO instances
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors) => new DomainValidationException(errors),
  }),
);
```

### 7.2 Standard Pagination Query DTO Blueprint
```typescript
export class PaginationQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsString()
  search?: string;
}
```

---

## 8. Cross-Cutting Concerns: Security, Logging & Error Handling

### 8.1 Security Guards Pipeline
Every incoming HTTP request traverses a three-stage security perimeter:
1. **`JwtAuthGuard`**: Extracted from Bearer header, validates token signature, expiration, and user `isActive` status. Excluded for routes decorated with `@Public()`.
2. **`RolesGuard`**: Compares user role against `@Roles('TEACHER', 'SECRETARIAT')` metadata.
3. **`ResourceOwnershipGuard`**: Verifies domain ownership (e.g. Teacher owns the `AcademicGroup` of the target session; Parent is linked to target `student_id`).

### 8.2 Structured Logging & Auditing (`Pino`)
All application events and HTTP transactions produce structured JSON logs with correlated trace IDs:
```json
{
  "level": "info",
  "time": "2026-08-16T14:10:00.120Z",
  "pid": 1042,
  "correlationId": "req-c9a81234-5678-90ab-cdef",
  "context": "AttendanceService",
  "event": "QR_ATTENDANCE_RECORDED",
  "sessionId": "c3d4e5f6-7890-12bc-defa-345678901bcd",
  "studentId": "e9f8a7b6-5432-10fe-dcba-987654321fed",
  "teacherId": "a1b2c3d4-5678-90ab-cdef-123456789abc",
  "isDuplicate": false,
  "durationMs": 18
}
```

### 8.3 Rate Limiting & Throttler Architecture (`@nestjs/throttler`)
- **Global API Rate Limit**: 100 requests per minute per IP.
- **Auth Endpoint Rate Limit**: 5 login attempts per 15 minutes per IP.
- **QR Scanner Rate Limit**: Max 60 scans per minute per teacher session to prevent automated brute-force token enumeration.

---

## 9. Testing & Quality Assurance Architecture

### 9.1 Unit Testing Strategy (`Jest`)
- **Target**: Individual application services, domain logic, grading calculations, and DTO validators in complete isolation.
- **Mocking**: Database access is mocked using `jest-mock-extended` for `PrismaService`.
- **Coverage Requirement**: 100% coverage on domain calculation formulas and verification pipelines (e.g., `GradingEngineService`, `QrTokenGeneratorService`).

### 9.2 Integration Testing Strategy (`Supertest` + Test Database)
- **Target**: Module controllers and database repository interactions.
- **Environment**: Isolated PostgreSQL schema (e.g. Docker / ephemeral Neon branch).
- **Execution**: Verifies transactions, Prisma query filters, and `P2002` concurrency exception handling.

### 9.3 End-to-End (E2E) Test Suite
- Directly verifies all 10 confirmed product test scenarios documented in [test-cases.md](file:///d:/el_awal/docs/04-Test/test-cases.md):
  - `TC-ATT-004`: Student unique QR token provisioning.
  - `TC-ATT-005`: First-scan QR attendance recording in <500ms.
  - `TC-ATT-006`: Duplicate scan idempotency and non-mutation.
  - `TC-ATT-007`: Cross-cohort enrollment mismatch alert.
  - `TC-ATT-008`: Unauthorized teacher session ownership rejection (HTTP 403).
  - `TC-ATT-009`: Invalid QR token rejection (HTTP 404).
  - `TC-ATT-010`: Student QR credential rotation & invalidation.
  - `TC-EXM-004`: Student exam submission and instantaneous auto-grading.

---

## 10. Traceability Matrix

| Component / Layer | Module Reference | Functional Requirements Covered | Architecture Source Document |
|---|---|---|---|
| **Identity & Access** | `AuthModule`, `UsersModule` | `FR-USR-001..004` | [backend-architecture.md](file:///d:/el_awal/docs/03-Architecture/backend-architecture.md) |
| **Student Lifecycle** | `StudentsModule` | `FR-STU-001..004`, `FR-ATT-004` | [data-layer.md](file:///d:/el_awal/docs/03-Architecture/data-layer.md) |
| **Groups & Timetables**| `GroupsModule`, `SchedulesModule` | `FR-GRP-001..003` | [database-design.md](file:///d:/el_awal/docs/03-Architecture/database-design.md) |
| **QR Attendance Engine**| `AttendanceModule` | `FR-ATT-001..004` | [business-logic.md](file:///d:/el_awal/docs/03-Architecture/business-logic.md) |
| **Content & Video** | `ContentModule`, `StorageModule`, `VideoModule` | `FR-LES-001..003` | [backend-architecture.md](file:///d:/el_awal/docs/03-Architecture/backend-architecture.md) |
| **Assessment & Auto-Grade**| `AssessmentsModule` | `FR-EXM-001..007` | [api-design.md](file:///d:/el_awal/docs/03-Architecture/api-design.md) |
| **Parent Portal** | `ParentPortalModule` | `FR-PAR-001..005` | [presentation-layer.md](file:///d:/el_awal/docs/03-Architecture/presentation-layer.md) |
| **Notification Bus** | `NotificationsModule` | `FR-NOT-001..005` | [backend-architecture.md](file:///d:/el_awal/docs/03-Architecture/backend-architecture.md) |
| **Payment Management**| `SubscriptionsModule` | `FR-SUB-001` | [api-design.md](file:///d:/el_awal/docs/03-Architecture/api-design.md) |
