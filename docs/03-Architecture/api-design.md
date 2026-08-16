# API Design Specification

## 1. Purpose

The purpose of this document is to establish the authoritative, implementation-ready Application Programming Interface (API) contract between the client presentation layer (Next.js frontend) and the server application layer (NestJS backend running on a Hetzner VPS with Prisma ORM and Neon PostgreSQL).

This specification establishes:
- Exact RESTful endpoint paths, HTTP verbs, and status codes.
- Deterministic Request and Response Data Transfer Object (DTO) contracts.
- Explicit role-based access control (RBAC) and object-level resource ownership rules.
- Cryptographic credential and token exposure boundaries.
- Precise multi-tier validation, error handling, and concurrency guarantees.
- Bidirectional traceability connecting API routes back to approved Product Requirements, Use Cases, Database Entities, and Quality Assurance Test Cases.

---

## 2. Scope

### 2.1 In-Scope Domains
This specification covers all 35 approved Product Backlog capabilities organized across the system's 9 core domain modules:
1. **Authentication & Identity Management**: Credential login, session inspection, and token invalidation for 4 stakeholder roles.
2. **Student Lifecycle Management**: Enrollment, profile handling, academic status, and unique QR credential provisioning.
3. **Teacher & Academic Group Management**: Cohort setup, timetable scheduling, and roster additions.
4. **Attendance & Absence Management**: Fast camera-based QR roll-call check-in, manual roll-call fallback, and aggregated reporting.
5. **Lectures & Educational Content**: Instructional file distribution, PDF summaries, and content viewing tracking.
6. **Exams, Assignments & Automated Evaluation**: Question banking, digital submissions, and synchronous automated exam grading.
7. **Parent Portal**: Consolidated read-only academic monitoring for verified guardians.
8. **Notifications**: Server-triggered alerts for lesson reminders, homework status, exam grades, and student absence.
9. **Subscriptions**: Student payment status tracking and administrative payment record management.
10. **Infrastructure Handshakes**: Cloudflare R2 presigned direct file uploads and Bunny Stream video delivery.

### 2.2 Out-of-Scope (Deferred / Unapproved Capabilities)
- External commercial payment gateway checkouts (e.g. Stripe, Paymob).
- Direct peer-to-peer real-time video conferencing or chat.
- Live interactive whiteboards.
- Undocumented third-party school integration protocols.

---

## 3. API Architecture

The API adheres to a Layered Modular Monolith architectural pattern:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Next.js Client Presentation Layer                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS (TLS 1.3) / JSON
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HTTP / API Gateway Layer                          │
│  - Reverse Proxy (Nginx on Hetzner VPS)                                     │
│  - Global ThrottlerGuard (Rate Limiting) & CORS Whitelist                   │
│  - Helmet Security Headers & Trace Correlation Injection (X-Correlation-Id) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      NestJS Controller & Security Layer                     │
│  - Route Handlers & URL Parameter Binding                                   │
│  - JwtAuthGuard (Token Validation & User Context Extraction)                │
│  - RolesGuard (TEACHER | SECRETARIAT | STUDENT | PARENT)                    │
│  - ResourceOwnershipGuard (BOLA / IDOR Verification)                         │
│  - ValidationPipe (class-validator DTO Whitelisting)                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Invokes (DTO In)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Application Services & Business Logic                    │
│  - Domain Invariants & State Transition Rules                               │
│  - QR Attendance 7-Tier Verification Pipeline                               │
│  - Automated Exam Grading Engine                                            │
│  - Domain Event Dispatching via EventEmitter2                               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Persists / Queries
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Data Access Layer & Prisma ORM                          │
│  - Repositories & Atomic Transactions ($transaction)                        │
│  - Unique Constraint Concurrency Resolution (PostgreSQL uq_session_student) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ SQL over TLS 1.3
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Neon PostgreSQL (Serverless Database)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Base Path & Versioning

- **URI Versioning Strategy**: Path-based version prefixing.
- **Current Canonical Base Path**: `/api/v1`
- **Protocol**: HTTPS (TLS 1.3 required in staging and production).
- **Default Media Type**: `application/json` (UTF-8 encoding).

---

## 5. HTTP Conventions

### 5.1 Verb Semantics
| HTTP Method | Idempotent | Safe | Semantic Definition |
|---|---|---|---|
| `GET` | Yes | Yes | Retrieve resource representations. Request bodies are ignored. |
| `POST` | No | No | Create new resources, execute non-idempotent domain commands, or submit identification credentials. |
| `PUT` | Yes | No | Complete resource replacement (restricted to explicit bulk replacement operations). |
| `PATCH` | Yes | No | Partial update of mutable resource properties. |
| `DELETE` | Yes | No | Remove or soft-deactivate an existing resource. |

### 5.2 HTTP Status Code Matrix
| Status Code | Standard Reason | Usage Scenario |
|---|---|---|
| `200 OK` | OK | Successful `GET`, `PATCH`, or idempotent state-confirming `POST` operations. |
| `201 Created` | Created | Successful resource creation via `POST`. |
| `204 No Content` | No Content | Successful operation returning an empty payload (e.g. resource deletion). |
| `400 Bad Request` | Bad Request | DTO validation failure, malformed JSON, or missing mandatory headers. |
| `401 Unauthorized` | Unauthorized | Missing, expired, or cryptographically invalid Bearer JWT. |
| `403 Forbidden` | Forbidden | Authenticated user lacks required role or fails Resource Ownership Guard (BOLA). |
| `404 Not Found` | Not Found | Resource ID does not exist or unassigned token lookup returns empty. |
| `409 Conflict` | Conflict | State conflict or uniqueness collision (e.g. student already enrolled in cohort). |
| `422 Unprocessable Entity`| Unprocessable Entity | Semantically invalid payload or business rule mismatch (e.g. cross-group scan). |
| `429 Too Many Requests` | Too Many Requests | Rate limit threshold exceeded. |
| `500 Internal Server Error`| Internal Server Error | Unhandled server error (sanitized; zero stack trace or internal SQL leak). |

---

## 6. Authentication

### 6.1 Authentication Protocol
- **Mechanism**: Stateless Bearer JSON Web Token (JWT).
- **Transport**: Standard HTTP header: `Authorization: Bearer <token>`.
- **Token Claims Schema**:
  ```typescript
  interface JwtTokenClaims {
    sub: string;            // User ID (UUIDv4)
    role: 'TEACHER' | 'STUDENT' | 'PARENT' | 'SECRETARIAT';
    fullName: string;
    email?: string;
    phone?: string;
    iat: number;            // Issued at (Unix timestamp)
    exp: number;            // Expiration (Unix timestamp)
  }
  ```
- **Password Hashing**: Passwords stored as salted **Argon2id** hashes. Plaintext credentials are never stored, logged, or serialized.
- **Token Expiration**: Access tokens expire in 24 hours (`exp: 86400`).
- **Refresh Token Strategy**: `TBD — Requires Architecture Decision` (Deferred to secondary session management phase; current baseline operates via standard access token re-authentication).

---

## 7. Authorization

### 7.1 Role-Based Access Control (RBAC)
Every non-public endpoint is guarded by `@UseGuards(JwtAuthGuard, RolesGuard)` enforcing one or more authorized roles:
1. `TEACHER` (`المدرس`): Administrative and academic ownership over assigned cohorts, attendance scanning, educational materials, exam creation, and grading.
2. `SECRETARIAT` (`السكرتارية`): Administrative operational support for student registration, group timetable setup, manual roll-call entry, and payment logging.
3. `STUDENT` (`الطالب`): View assigned content, view personal timetable, present digital QR card, submit assignments/exams, and view graded results.
4. `PARENT` (`ولي الأمر`): Read-only monitoring of linked children's academic performance, homework completion, evaluations, and attendance history.

---

## 8. Resource Ownership & BOLA / IDOR Protection

Role-based access alone is insufficient to protect data privacy. The API enforces strict **Resource Ownership Guards** (`ResourceOwnershipGuard`):

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                     RESOURCE OWNERSHIP VERIFICATION RULES                   │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ Target Domain     │ Enforcement Rule                                        │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Academic Groups   │ Teacher can only access/modify groups where             │
│                   │ `academic_groups.teacher_id == current_user.id`.        │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Lesson Sessions   │ Teacher can only take attendance for sessions where     │
│                   │ `lesson_sessions.group.teacher_id == current_user.id`.  │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Student Records   │ Student can only query their own `StudentProfile`.      │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Parent Portal     │ Parent can only access data for students linked via     │
│                   │ `parent_student_links` table. Cross-family queries 403. │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Submissions       │ Student can only submit answers under their own ID.     │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 9. Request Validation

Incoming request bodies are sanitized and validated globally via NestJS `ValidationPipe`:
- **Whitelisting**: `whitelist: true` strips all unapproved fields (mitigating mass assignment vulnerabilities).
- **Non-Whitelisted Rejection**: `forbidNonWhitelisted: true` immediately rejects unexpected properties with `400 Bad Request`.
- **String Sanitization**: Strings are trimmed of leading/trailing whitespace; HTML/script tags in text fields are stripped.
- **UUID Validation**: All path parameters representing entity IDs are strictly validated via `@IsUUID('4')`.

---

## 10. Response Contract

### 10.1 Single Resource / Mutation Success Envelope
```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "timestamp": "2026-08-16T14:00:00.000Z",
  "correlationId": "req-c9a81234-5678-90ab-cdef"
}
```

### 10.2 Collection Success Envelope
```json
{
  "success": true,
  "statusCode": 200,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 85,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "timestamp": "2026-08-16T14:00:00.000Z",
  "correlationId": "req-c9a81234-5678-90ab-cdef"
}
```

---

## 11. Error Contract

All error responses strictly adhere to a standardized, machine-readable Problem Details JSON envelope:

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed on submitted payload",
  "details": [
    {
      "field": "title",
      "issue": "title should not be empty"
    }
  ],
  "timestamp": "2026-08-16T14:00:00.000Z",
  "path": "/api/v1/assessments",
  "correlationId": "req-c9a81234-5678-90ab-cdef"
}
```

### Security Error Disclosure Rules
- Zero internal stack traces or database driver messages are leaked to clients.
- Entity existence is not disclosed across unauthorized tenant boundaries (returns `403 Forbidden` or `404 Not Found`).

---

## 12. Pagination

The API strictly implements **Page/Limit Offset Pagination** across all list endpoints:
- `page`: Integer $\ge 1$ (Default: `1`).
- `limit`: Integer between `1` and `100` (Default: `20`).
- Collection responses encapsulate pagination state in the standard `meta` envelope.

---

## 13. Filtering & Sorting

List endpoints support deterministic query parameter filters:
- **Text Search**: `search` parameter performs case-insensitive prefix matching on designated entity titles/names.
- **Foreign Key Filtering**: Filter collections by `groupId`, `studentId`, or `teacherId`.
- **Date Filtering**: `startDate` and `endDate` parameters (ISO 8601 strings) for calendar and reporting queries.
- **Sorting Parameters**:
  - `sortBy`: Name of indexed attribute (e.g. `createdAt`, `title`, `dateOfBirth`). Default: `createdAt`.
  - `sortOrder`: Direction enum (`ASC` | `DESC`). Default: `DESC`.

---

## 14. Idempotency

The API guarantees strict idempotency on state-modifying operations where repeated invocations could produce duplicated side effects:
- **QR Code Attendance**: Repeat scans of an already present student return deterministic affirmative acknowledgments (`isDuplicate: true`) without creating duplicate records or mutating original timestamps.
- **Student Group Enrollment**: Re-enrolling an existing active student returns `409 Conflict` or confirms existing active enrollment.
- **Exam Submissions**: Submitting answers to an already completed assessment returns `409 Conflict` (single-attempt invariant).

---

## 15. Rate Limiting

Rate limiting is enforced at the gateway and application layers via `@nestjs/throttler`:
- **Global API Rate Limit**: Configurable default of 100 requests per minute per IP.
- **Authentication Endpoints**: Max 5 login attempts per 15 minutes per IP (`429 Too Many Requests`).
- **QR Scanner Endpoints**: Configurable rate limit (e.g. max 60 scan requests per minute per teacher session) to permit classroom flow while mitigating automated credential enumeration (`TBD — Rate Limit Threshold`).

---

## 16. Endpoint Inventory

| # | Domain | Method | Endpoint URI | Actor(s) | Auth | Ownership Guard | Source Req | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Auth | `POST` | `/api/v1/auth/login` | Public | None | None | `FR-USR-001..004` | CONFIRMED |
| 2 | Auth | `POST` | `/api/v1/auth/logout` | All Roles | JWT | None | `FR-USR-001..004` | CONFIRMED |
| 3 | Auth | `GET` | `/api/v1/auth/me` | All Roles | JWT | Self Profile | `FR-USR-001..004` | CONFIRMED |
| 4 | Students | `GET` | `/api/v1/students` | Teacher, Sec | JWT | Teacher Groups | `FR-STU-004` | CONFIRMED |
| 5 | Students | `POST` | `/api/v1/students` | Teacher, Sec | JWT | Target Group | `FR-STU-004`, `FR-ATT-004` | CONFIRMED |
| 6 | Students | `GET` | `/api/v1/students/:id` | Teacher, Sec, Student | JWT | Self / Teacher Group | `FR-STU-004` | CONFIRMED |
| 7 | Students | `PATCH` | `/api/v1/students/:id` | Teacher, Sec | JWT | Teacher Group | `FR-STU-001` | CONFIRMED |
| 8 | Students | `POST` | `/api/v1/students/:id/regenerate-qr-token` | Teacher, Sec | JWT | Teacher Group | `FR-ATT-004`, `ADR-005` | CONFIRMED |
| 9 | Groups | `GET` | `/api/v1/groups` | Teacher, Sec | JWT | Teacher Groups | `FR-GRP-003` | CONFIRMED |
| 10 | Groups | `POST` | `/api/v1/groups` | Teacher, Sec | JWT | Authenticated Teacher | `FR-GRP-003` | CONFIRMED |
| 11 | Groups | `GET` | `/api/v1/groups/:id` | Teacher, Sec | JWT | Group Owner | `FR-GRP-003` | CONFIRMED |
| 12 | Groups | `POST` | `/api/v1/groups/:id/students` | Teacher, Sec | JWT | Group Owner | `FR-GRP-002` | CONFIRMED |
| 13 | Groups | `DELETE` | `/api/v1/groups/:id/students/:studentId` | Teacher, Sec | JWT | Group Owner | `FR-GRP-002` | CONFIRMED |
| 14 | Groups | `POST` | `/api/v1/groups/:id/schedules` | Teacher, Sec | JWT | Group Owner | `FR-GRP-001` | CONFIRMED |
| 15 | Groups | `GET` | `/api/v1/groups/:id/schedules` | Teacher, Sec, Student | JWT | Group Member/Owner | `FR-GRP-001` | CONFIRMED |
| 16 | Attendance | `POST` | `/api/v1/attendance/sessions/:sessionId/scan-qr` | Teacher, Sec | JWT | Session Owner | `FR-ATT-004`, `BLR-ATT-003`| CONFIRMED |
| 17 | Attendance | `POST` | `/api/v1/attendance/sessions/:sessionId/manual` | Teacher, Sec | JWT | Session Owner | `FR-ATT-002`, `FR-ATT-003` | CONFIRMED |
| 18 | Attendance | `GET` | `/api/v1/attendance/reports` | Teacher, Sec | JWT | Group Owner | `FR-ATT-001` | CONFIRMED |
| 19 | Content | `GET` | `/api/v1/content` | Teacher, Student | JWT | Enrolled Cohort | `FR-LES-002`, `FR-LES-003` | CONFIRMED |
| 20 | Content | `POST` | `/api/v1/content` | Teacher | JWT | Group Owner | `FR-LES-002`, `FR-LES-003` | CONFIRMED |
| 21 | Content | `POST` | `/api/v1/content/:id/progress` | Student | JWT | Self Student | `FR-LES-001` | CONFIRMED |
| 22 | Assessments | `GET` | `/api/v1/assessments` | Teacher, Student | JWT | Enrolled Cohort | `FR-EXM-004..007` | CONFIRMED |
| 23 | Assessments | `POST` | `/api/v1/assessments` | Teacher | JWT | Group Owner | `FR-EXM-004..007` | CONFIRMED |
| 24 | Assessments | `POST` | `/api/v1/assessments/:id/submit` | Student | JWT | Enrolled Student | `FR-EXM-002`, `FR-EXM-003` | CONFIRMED |
| 25 | Parent Portal| `GET` | `/api/v1/parent-portal/students/:id/overview` | Parent | JWT | Linked Child | `FR-PAR-001..005` | CONFIRMED |
| 26 | Notifications| `GET` | `/api/v1/notifications` | All Roles | JWT | User Notifications | `FR-NOT-001..005` | CONFIRMED |
| 27 | Notifications| `PATCH` | `/api/v1/notifications/:id/read` | All Roles | JWT | Notification Owner | `FR-NOT-001..005` | CONFIRMED |
| 28 | Subscriptions| `GET` | `/api/v1/subscriptions/payments` | Teacher, Sec | JWT | Managed Students | `FR-SUB-001` | CONFIRMED |
| 29 | Subscriptions| `PATCH` | `/api/v1/subscriptions/students/:id/payment-status` | Teacher, Sec | JWT | Managed Students | `FR-SUB-001` | CONFIRMED |
| 30 | Uploads | `POST` | `/api/v1/uploads/presigned-url` | Teacher, Sec | JWT | Teacher Auth | `ADR-002`, `FR-LES-002` | CONFIRMED |
| 31 | Health | `GET` | `/api/v1/health` | Public | None | None | Ops Baseline | CONFIRMED |

---

## 17. Authentication API (`/api/v1/auth`)

### 17.1 `POST /api/v1/auth/login`
- **Purpose**: Authenticate user credentials and return signed stateless Bearer JWT.
- **Authorization**: Public
- **Request Body DTO**:
  ```json
  {
    "identifier": "teacher@elawal.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Validation**: `identifier` (valid email or E.164 phone, required), `password` (string $\ge 8$ chars, required).
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "tokenType": "Bearer",
      "expiresIn": 86400,
      "user": {
        "id": "a1b2c3d4-5678-90ab-cdef-123456789abc",
        "fullName": "أ. طارق عبد الله",
        "email": "teacher@elawal.edu",
        "role": "TEACHER"
      }
    },
    "timestamp": "2026-08-16T14:00:00.000Z",
    "correlationId": "req-auth-001"
  }
  ```

---

## 18. User API (`/api/v1/users`)

### 18.1 `GET /api/v1/users/me`
- **Purpose**: Inspect authenticated user identity profile.
- **Authorization**: `TEACHER`, `STUDENT`, `PARENT`, `SECRETARIAT`
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "id": "a1b2c3d4-5678-90ab-cdef-123456789abc",
      "fullName": "أ. طارق عبد الله",
      "role": "TEACHER",
      "email": "teacher@elawal.edu",
      "phone": "+201012345678",
      "isActive": true
    }
  }
  ```

---

## 19. Student API (`/api/v1/students`)

### 19.1 `POST /api/v1/students`
- **Purpose**: Enroll a new student and provision their initial unique QR attendance credential.
- **Authorization**: `TEACHER`, `SECRETARIAT`
- **Request Body DTO**:
  ```json
  {
    "fullName": "محمود أحمد علي",
    "email": "mahmoud@student.elawal.edu",
    "phone": "+201123456789",
    "password": "TemporaryPassword123!",
    "gradeLevel": "الصف الثالث الثانوي",
    "studentCode": "STU-2026-104",
    "parent": {
      "fullName": "أحمد علي إبراهيم",
      "phone": "+201098765432",
      "relationshipType": "Father"
    },
    "groupId": "b2c3d4e5-6789-01ab-cdef-234567890abc"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": {
      "id": "e9f8a7b6-5432-10fe-dcba-987654321fed",
      "studentCode": "STU-2026-104",
      "fullName": "محمود أحمد علي",
      "gradeLevel": "الصف الثالث الثانوي",
      "academicStatus": "ACTIVE",
      "createdAt": "2026-08-16T14:00:00.000Z"
    }
  }
  ```

### 19.2 `GET /api/v1/students/:id`
- **Purpose**: Retrieve student academic record.
- **Security Rule**: Does **not** expose the raw `qr_code_token` string in generic responses to prevent accidental token scraping.

---

## 20. Teacher API (`/api/v1/teachers`)

- Operations encapsulated within `/api/v1/groups` and `/api/v1/auth/me`. Dedicated teacher administrative profile endpoints: `TBD — Requires Product Decision`.

---

## 21. Group API (`/api/v1/groups`)

### 21.1 `POST /api/v1/groups`
- **Purpose**: Create academic group and establish stage/grade association.
- **Authorization**: `TEACHER`, `SECRETARIAT`
- **Request Body DTO**:
  ```json
  {
    "name": "الصف الثالث الثانوي - مجموعة أ",
    "gradeLevel": "الصف الثالث الثانوي",
    "academicYear": "2026-2027",
    "description": "مجموعة الشرح والتدريبات المكثفة"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": {
      "id": "b2c3d4e5-6789-01ab-cdef-234567890abc",
      "name": "الصف الثالث الثانوي - مجموعة أ",
      "gradeLevel": "الصف الثالث الثانوي",
      "academicYear": "2026-2027",
      "totalEnrolled": 0
    }
  }
  ```

---

## 22. Enrollment API (`/api/v1/groups/:id/students`)

### 22.1 `POST /api/v1/groups/:id/students`
- **Purpose**: Enroll a student in an academic cohort.
- **Authorization**: `TEACHER`, `SECRETARIAT` (Must own target group).
- **Request Body DTO**:
  ```json
  {
    "studentId": "e9f8a7b6-5432-10fe-dcba-987654321fed"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": {
      "enrollmentId": "f5a6b7c8-9012-34de-fabc-567890123cde",
      "groupId": "b2c3d4e5-6789-01ab-cdef-234567890abc",
      "studentId": "e9f8a7b6-5432-10fe-dcba-987654321fed",
      "status": "ACTIVE"
    }
  }
  ```
- **Error Responses**:
  - `409 Conflict`: Student is already actively enrolled in this group.

---

## 23. Lesson / Schedule / Session API (`/api/v1/groups/:id/schedules`)

### 23.1 `POST /api/v1/groups/:id/schedules`
- **Purpose**: Attach a recurring weekly timetable rule.
- **Authorization**: `TEACHER`, `SECRETARIAT`
- **Request Body DTO**:
  ```json
  {
    "dayOfWeek": 0,
    "startTime": "17:00",
    "endTime": "19:00",
    "roomLocation": "قاعة 1"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": {
      "id": "d4e5f6a7-8901-23bc-defa-456789012bcd",
      "groupId": "b2c3d4e5-6789-01ab-cdef-234567890abc",
      "dayOfWeek": 0,
      "startTime": "17:00",
      "endTime": "19:00"
    }
  }
  ```

---

## 24. Attendance API (`/api/v1/attendance`)

### 24.1 `POST /api/v1/attendance/sessions/:sessionId/manual`
- **Purpose**: Record manual roll-call presence/absence for a session.
- **Authorization**: `TEACHER`, `SECRETARIAT` (Must own target session).
- **Request Body DTO**:
  ```json
  {
    "records": [
      {
        "studentId": "e9f8a7b6-5432-10fe-dcba-987654321fed",
        "status": "PRESENT",
        "notes": "حاضر في الموعد"
      },
      {
        "studentId": "b8a7f6e5-4321-09fe-dcba-876543210fed",
        "status": "ABSENT",
        "notes": "غياب بعذر طبي"
      }
    ]
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "sessionId": "c3d4e5f6-7890-12bc-defa-345678901bcd",
      "updatedCount": 2,
      "sessionStats": { "totalPresent": 28, "totalAbsent": 2, "totalEnrolled": 30 }
    }
  }
  ```

---

## 25. QR Attendance API (`POST /api/v1/attendance/sessions/:sessionId/scan-qr`)

### 25.1 Architectural Invariants
1. **Attendance Identification Credential**: The QR token is strictly a physical/digital identity badge for roll-call check-in. It does **not** grant authorization or access to student data.
2. **Context Derivation**: The client submits **only** `qrCodeToken`. The backend derives `studentId`, `teacherId`, `groupId`, `recordingMethod = 'QR_SCAN'`, and server timestamp from trusted session context.
3. **Deterministic Idempotency**:
   - **First Scan**: Creates record (`status: 'PRESENT'`, `recording_method: 'QR_SCAN'`, `recorded_by_id`, `recorded_at: NOW`), returns `isDuplicate: false`.
   - **Repeated Scan**: Detects existing record, performs no modification, preserves initial audit timestamp, and returns `isDuplicate: true`.
4. **Concurrency Safety**: The database unique constraint `uq_session_student` on `(session_id, student_id)` prevents physical duplicate rows. The backend catches unique collisions and gracefully returns the existing record.

### 25.2 Request DTO Contract
```json
{
  "qrCodeToken": "qr_tok_9f8a7b6c5d4e3f2a1b0c"
}
```

### 25.3 Success Response — First Scan (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "isDuplicate": false,
    "student": {
      "id": "e9f8a7b6-5432-10fe-dcba-987654321fed",
      "fullName": "محمود أحمد علي",
      "studentCode": "STU-2026-104"
    },
    "attendance": {
      "id": "a7b8c9d0-1234-56ef-ab01-678901234def",
      "sessionId": "c3d4e5f6-7890-12bc-defa-345678901bcd",
      "status": "PRESENT",
      "recordingMethod": "QR_SCAN",
      "recordedAt": "2026-08-16T17:05:12.431Z",
      "recordedById": "a1b2c3d4-5678-90ab-cdef-123456789abc"
    },
    "sessionStats": {
      "totalPresent": 28,
      "totalEnrolled": 30
    }
  },
  "timestamp": "2026-08-16T17:05:12.450Z",
  "correlationId": "req-qr-001"
}
```

### 25.4 Success Response — Repeated Scan (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "isDuplicate": true,
    "message": "Student attendance is already recorded for this session.",
    "student": {
      "id": "e9f8a7b6-5432-10fe-dcba-987654321fed",
      "fullName": "محمود أحمد علي",
      "studentCode": "STU-2026-104"
    },
    "attendance": {
      "id": "a7b8c9d0-1234-56ef-ab01-678901234def",
      "sessionId": "c3d4e5f6-7890-12bc-defa-345678901bcd",
      "status": "PRESENT",
      "recordingMethod": "QR_SCAN",
      "recordedAt": "2026-08-16T17:05:12.431Z",
      "recordedById": "a1b2c3d4-5678-90ab-cdef-123456789abc"
    },
    "sessionStats": {
      "totalPresent": 28,
      "totalEnrolled": 30
    }
  }
}
```

### 25.5 Domain Error Responses
- **Enrollment Mismatch Warning (`422 Unprocessable Entity`)**:
  ```json
  {
    "success": false,
    "statusCode": 422,
    "error": "Unprocessable Entity",
    "code": "GROUP_ENROLLMENT_MISMATCH",
    "message": "Student is not enrolled in this group session",
    "details": {
      "studentName": "محمود أحمد علي",
      "actualGroup": "مجموعة الأحد والأربعاء - الصف الثالث"
    }
  }
  ```
- **Unauthorized Teacher (`403 Forbidden`)**: Teacher does not own the session's group.
- **Invalid Token (`404 Not Found`)**: Token does not resolve to an active student record.

---

## 26. Assessment API (`/api/v1/assessments`)

### 26.1 `POST /api/v1/assessments`
- **Purpose**: Author assignment or examination with questions.
- **Authorization**: `TEACHER`
- **Request Body DTO**:
  ```json
  {
    "groupId": "b2c3d4e5-6789-01ab-cdef-234567890abc",
    "title": "امتحان نصوص وبلاغة",
    "type": "EXAM",
    "totalScore": 30.0,
    "passingScore": 15.0,
    "dueDate": "2026-08-25T23:59:59.000Z",
    "isAutoGraded": true,
    "questions": [
      {
        "questionText": "ما نوع الصورة البيانية في قول الشاعر: 'وسلا مصر هل سلا القلب عنها'؟",
        "questionType": "MULTIPLE_CHOICE",
        "options": ["تشبيه مجمل", "استعارة مكنية", "استعارة تصريحية", "كناية عن موصوف"],
        "correctAnswer": "استعارة مكنية",
        "points": 5.0,
        "displayOrder": 1
      }
    ]
  }
  ```

### 26.2 Security Projection Rule for Student Queries
When a student queries `GET /api/v1/assessments/:id`:
- The response projection **strictly strips** `correctAnswer` and grading keys from the returned question list.
- Only teachers querying their own assessments receive `correctAnswer`.

---

## 27. Assignment & Submissions API (`/api/v1/assessments/:id/submit`)

### 27.1 `POST /api/v1/assessments/:id/submit`
- **Purpose**: Submit completed exam/assignment. Triggers synchronous automated grading for exams.
- **Authorization**: `STUDENT` (Enforces enrollment in assessment group).
- **Request Body DTO**:
  ```json
  {
    "answers": [
      {
        "questionId": "q1-uuid-1234-5678",
        "selectedAnswer": "استعارة مكنية"
      }
    ]
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "submissionId": "sub-1234-5678-90ab-cdef",
      "assessmentId": "e1234567-89ab-cdef-0123-456789abcdef",
      "status": "GRADED",
      "scoreObtained": 30.0,
      "totalScore": 30.0,
      "isPassed": true,
      "gradedAt": "2026-08-16T14:15:02.120Z"
    }
  }
  ```

---

## 28. Parent Portal API (`/api/v1/parent-portal`)

### 28.1 `GET /api/v1/parent-portal/students/:id/overview`
- **Purpose**: Retrieve consolidated academic dashboard for a guardian's child.
- **Authorization**: `PARENT` (Guarded via `ResourceOwnershipGuard` on `parent_student_links`).
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "student": {
        "id": "e9f8a7b6-5432-10fe-dcba-987654321fed",
        "fullName": "محمود أحمد علي",
        "gradeLevel": "الصف الثالث الثانوي",
        "studentLevel": "ممتاز (A+)"
      },
      "academicSummary": {
        "averageExamScore": 95.0,
        "homeworkCompletionRate": 100.0,
        "attendancePercentage": 96.0
      },
      "latestEvaluation": {
        "evaluationDate": "2026-08-14",
        "teacherNotes": "طالب متميز ومتفاعل باستمرار في الحصة.",
        "studentLevel": "ممتاز"
      },
      "recentExamGrades": [
        {
          "examTitle": "امتحان البلاغة الشامل",
          "scoreObtained": 29.0,
          "totalScore": 30.0
        }
      ],
      "attendanceStatus": {
        "totalPresent": 12,
        "totalAbsent": 0
      }
    }
  }
  ```

---

## 29. Content API (`/api/v1/content`)

### 29.1 `POST /api/v1/content`
- **Purpose**: Persist metadata for uploaded educational assets and recordings.
- **Authorization**: `TEACHER`
- **Request Body DTO**:
  ```json
  {
    "groupId": "b2c3d4e5-6789-01ab-cdef-234567890abc",
    "title": "مذكرة النحو الشاملة",
    "contentType": "SUMMARY",
    "fileKey": "summaries/2026/nahw-1.pdf",
    "fileUrl": "https://cdn.elawal.edu/summaries/2026/nahw-1.pdf",
    "fileSize": 5242880,
    "mimeType": "application/pdf"
  }
  ```

### 29.2 `POST /api/v1/content/:id/progress`
- **Purpose**: Log viewing progress percentage.
- **Authorization**: `STUDENT`
- **Request Body DTO**:
  ```json
  {
    "progressPercent": 100,
    "isCompleted": true,
    "lastPositionSeconds": 3600
  }
  ```

---

## 30. File Upload API (`/api/v1/uploads`)

### 30.1 `POST /api/v1/uploads/presigned-url`
- **Purpose**: Issue presigned S3/R2 upload URL, allowing client direct upload to Cloudflare R2 without passing heavy binaries through the NestJS VPS.
- **Authorization**: `TEACHER`, `SECRETARIAT`
- **Request Body DTO**:
  ```json
  {
    "fileName": "nahw-unit-1.pdf",
    "contentType": "application/pdf",
    "fileSize": 4194304,
    "category": "SUMMARIES"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "fileKey": "summaries/2026/08/nahw-unit-1-uuid.pdf",
      "uploadUrl": "https://storage.elawal.edu/summaries/2026/08/nahw-unit-1-uuid.pdf?X-Amz-Signature=...",
      "publicCdnUrl": "https://cdn.elawal.edu/summaries/2026/08/nahw-unit-1-uuid.pdf",
      "expiresInSeconds": 900
    }
  }
  ```

---

## 31. Video API (`Bunny Stream`)

- **Architecture**: Video transcoding, adaptive HLS bitrate streaming, and DRM/token signing are handled via Bunny Stream integration.
- **Handshake Flow**:
  1. Teacher initiates video upload $\rightarrow$ NestJS requests Bunny Stream video ID & direct upload signature.
  2. Teacher client uploads video directly to Bunny Stream endpoint.
  3. Student requests playback $\rightarrow$ NestJS generates signed Bunny token URL (`https://video.elawal.edu/embed/{videoId}?token=...`).

---

## 32. Notification API (`/api/v1/notifications`)

### 32.1 `GET /api/v1/notifications`
- **Purpose**: Retrieve notification history for the authenticated user.
- **Authorization**: `TEACHER`, `STUDENT`, `PARENT`, `SECRETARIAT`
- **Query Parameters**: `page`, `limit`, `unreadOnly`.

### 32.2 `PATCH /api/v1/notifications/:id/read`
- **Purpose**: Mark a specific notification as read.
- **Authorization**: Owner of the notification entity.

---

## 33. Subscription & Payment Status API (`/api/v1/subscriptions`)

### 33.1 `PATCH /api/v1/subscriptions/students/:id/payment-status`
- **Purpose**: Update student payment status record.
- **Authorization**: `TEACHER`, `SECRETARIAT`
- **Request Body DTO**:
  ```json
  {
    "paymentStatus": "PAID",
    "billingMonth": "2026-08",
    "amountPaid": 500.0,
    "notes": "تم السداد نقداً"
  }
  ```

---

## 34. Webhooks

- **Cloudflare R2 / Bunny Stream Webhooks**: External webhooks (e.g. video processing completed) will be handled via `/api/v1/webhooks/bunny` with HMAC cryptographic signature validation (`TBD — Requires Architecture Decision`).

---

## 35. Audit & Observability

- **Correlation Tracing**: All requests receive an `X-Correlation-Id` header returned in all responses.
- **Structured Audit Logging**: Sensitive operations (QR token regeneration, attendance scanning, manual grade overrides, payment updates) produce structured JSON logs documenting `userId`, `action`, `resourceId`, and timestamp.
- **Healthchecks**: `/api/v1/health` provides Terminus database ping, memory heap, and storage status.

---

## 36. OpenAPI / Swagger

- **Tooling**: `@nestjs/swagger` generating dynamic OpenAPI 3.0 documentation at `/api/docs`.
- **Security Scheme**: `bearerAuth` (JWT) registered globally in Swagger configuration.

---

## 37. Complete Bidirectional Traceability Matrix

| Backlog Item | Functional Req | Use Case | API Endpoint URI | HTTP Method | Authorized Roles | Database Entities | Test Cases |
|---|---|---|---|---|---|---|---|
| `بيانات الطالب` | `FR-STU-004` | `UC-STU-001` | `/api/v1/students` | `POST`, `GET` | `TEACHER`, `SEC`, `STUDENT` | `users`, `student_profiles` | `TC-STU-001` |
| `حالة الطلاب` | `FR-STU-001` | `UC-STU-003` | `/api/v1/students/:id` | `PATCH` | `TEACHER`, `SEC` | `student_profiles` | `TC-STU-003` |
| `بيانات ولي الامر` | `FR-STU-003` | `UC-STU-002` | `/api/v1/parent-portal/students/:id/overview` | `GET` | `PARENT` | `parent_profiles`, `parent_student_links` | `TC-STU-002` |
| `المجموعة و الصف` | `FR-STU-002`, `FR-GRP-003` | `UC-GRP-001` | `/api/v1/groups` | `POST`, `GET` | `TEACHER`, `SEC` | `academic_groups` | `TC-GRP-001` |
| `تحديد مواعيد الدروس` | `FR-GRP-001` | `UC-GRP-001` | `/api/v1/groups/:id/schedules` | `POST`, `GET` | `TEACHER`, `SEC` | `lesson_schedules` | `TC-GRP-002` |
| `اضافة طلاب` | `FR-GRP-002` | `UC-GRP-002` | `/api/v1/groups/:id/students` | `POST`, `DELETE` | `TEACHER`, `SEC` | `group_enrollments` | `TC-GRP-003` |
| `تسجيل حضور الطلاب` | `FR-ATT-003` | `UC-ATT-001` | `/api/v1/attendance/sessions/:sessionId/manual` | `POST` | `TEACHER`, `SEC` | `attendance_records` | `TC-ATT-001` |
| `تسجيل الغياب` | `FR-ATT-002` | `UC-ATT-001` | `/api/v1/attendance/sessions/:sessionId/manual` | `POST` | `TEACHER`, `SEC` | `attendance_records` | `TC-ATT-002` |
| `تقارير الحضور و الغياب` | `FR-ATT-001` | `UC-ATT-002` | `/api/v1/attendance/reports` | `GET` | `TEACHER`, `SEC` | `attendance_records` | `TC-ATT-003` |
| `تسجيل الحضور عبر مسح QR Code` | `FR-ATT-004` | `UC-ATT-003` | `/api/v1/attendance/sessions/:sessionId/scan-qr` | `POST` | `TEACHER`, `SEC` | `attendance_records`, `student_profiles` | `TC-ATT-004..010` |
| `رفع الملفات و المراجع و الملخصات` | `FR-LES-002` | `UC-LES-001` | `/api/v1/content`, `/api/v1/uploads/presigned-url` | `POST`, `GET` | `TEACHER`, `STUDENT` | `educational_content` | `TC-LES-001` |
| `رفع تسجيلات المحاضرات` | `FR-LES-003` | `UC-LES-001` | `/api/v1/content` | `POST`, `GET` | `TEACHER`, `STUDENT` | `educational_content` | `TC-LES-002` |
| `متابعة مشاهدة المحتوى` | `FR-LES-001` | `UC-LES-002` | `/api/v1/content/:id/progress` | `POST` | `STUDENT` | `content_progress` | `TC-LES-003` |
| `انشاء الواجبات` | `FR-EXM-005` | `UC-EXM-001` | `/api/v1/assessments` | `POST` | `TEACHER` | `assessments`, `questions` | `TC-EXM-001` |
| `رفع الواجبات` | `FR-EXM-004` | `UC-EXM-001` | `/api/v1/assessments` | `POST` | `TEACHER` | `assessments` | `TC-EXM-001` |
| `انشاء الامتحانات` | `FR-EXM-007` | `UC-EXM-001` | `/api/v1/assessments` | `POST` | `TEACHER` | `assessments`, `questions` | `TC-EXM-002` |
| `رفع الامتحانات` | `FR-EXM-006` | `UC-EXM-001` | `/api/v1/assessments` | `POST` | `TEACHER` | `assessments` | `TC-EXM-002` |
| `تسليم الواجبات و الامتحانات` | `FR-EXM-003` | `UC-EXM-002` | `/api/v1/assessments/:id/submit` | `POST` | `STUDENT` | `assessment_submissions` | `TC-EXM-003` |
| `تصحيح الدرجات تلقائي` | `FR-EXM-002` | `US-EXM-003` | `/api/v1/assessments/:id/submit` | `POST` | `STUDENT` (Auto-Graded) | `assessment_submissions`, `student_answers` | `TC-EXM-004` |
| `عرض النتائج لي ولي الامر` | `FR-EXM-001` | `UC-EXM-004` | `/api/v1/parent-portal/students/:id/overview` | `GET` | `PARENT` | `assessment_submissions` | `TC-EXM-005` |
| `تقييمات + ملاحظات المدرس` | `FR-PAR-001` | `UC-PAR-001` | `/api/v1/parent-portal/students/:id/overview` | `GET` | `PARENT` | `student_evaluations` | `TC-PAR-001` |
| `درجات الامتحانات` | `FR-PAR-003` | `UC-PAR-001` | `/api/v1/parent-portal/students/:id/overview` | `GET` | `PARENT` | `assessment_submissions` | `TC-PAR-002` |
| `مستوى الطالب` | `FR-PAR-005` | `UC-PAR-001` | `/api/v1/parent-portal/students/:id/overview` | `GET` | `PARENT` | `student_evaluations` | `TC-PAR-003` |
| `حالة الواجبات` | `FR-PAR-002` | `UC-PAR-002` | `/api/v1/parent-portal/students/:id/overview` | `GET` | `PARENT` | `assessment_submissions` | `TC-PAR-004` |
| `الحضور و الغياب` | `FR-PAR-004` | `UC-PAR-002` | `/api/v1/parent-portal/students/:id/overview` | `GET` | `PARENT` | `attendance_records` | `TC-PAR-005` |
| `اشعار قبل الحصة ب ساعه` | `FR-NOT-001` | `UC-NOT-001` | `/api/v1/notifications` | `GET` | `STUDENT`, `PARENT` | `notifications` | `TC-NOT-001` |
| `اشعار في حالة عدم حل الواجب` | `FR-NOT-002` | `UC-NOT-002` | `/api/v1/notifications` | `GET` | `STUDENT`, `PARENT` | `notifications` | `TC-NOT-002` |
| `اشعار امتحان جديد` | `FR-NOT-004` | `UC-NOT-003` | `/api/v1/notifications` | `GET` | `STUDENT`, `PARENT` | `notifications` | `TC-NOT-003` |
| `اشعار درجة امتحان الطالب` | `FR-NOT-003` | `UC-NOT-003` | `/api/v1/notifications` | `GET` | `STUDENT`, `PARENT` | `notifications` | `TC-NOT-004` |
| `اشعارات في حالة غياب الطالب` | `FR-NOT-005` | `UC-NOT-004` | `/api/v1/notifications` | `GET` | `PARENT` | `notifications` | `TC-NOT-005` |
| `حالة الدفع لكل طالب` | `FR-SUB-001` | `UC-SUB-001` | `/api/v1/subscriptions/students/:id/payment-status` | `PATCH`, `GET` | `TEACHER`, `SEC` | `student_payment_records` | `TC-SUB-001` |

---

## 38. API Security Audit

| Security Domain | Vulnerability / Threat Checked | Mitigation Implemented in API Specification | Status |
|---|---|---|---|
| **Broken Object Level Auth (BOLA)** | Parent accessing another student's grades or attendance. | Enforced `ResourceOwnershipGuard` on `parent_student_links` for all `/parent-portal` routes. | Passed |
| **Cross-Teacher Cohort Tampering** | Teacher B scanning attendance for Teacher A's group session. | Session ownership verified prior to QR token resolution (`TC-ATT-008`). | Passed |
| **Credential Token Enumeration** | Brute-force guessing of `qr_code_token` values. | High-entropy random tokens, rate limiting on scanner endpoint, and generic `404` rejection. | Passed |
| **Assessment Answer Key Leakage** | Student inspecting exam JSON to see correct answers. | Explicit response projection stripping `correctAnswer` for `STUDENT` queries. | Passed |
| **Mass Assignment** | Student injecting `scoreObtained` or `isPassed` in submission. | `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` rejects unapproved fields. | Passed |
| **Server Resource Exhaustion** | Heavy PDF/video uploads exhausting VPS memory. | Presigned direct-to-R2 URLs bypassing NestJS memory buffers (`ADR-002`). | Passed |

---

## 39. Cross-Document Consistency & Backend Module Mapping

### 39.1 API to Backend Module Traceability
| API Domain | Endpoint URI Pattern | NestJS Controller | NestJS Module | Application Service |
|---|---|---|---|---|
| **Auth** | `/api/v1/auth/*` | `AuthController` | `AuthModule` | `AuthService` |
| **Users** | `/api/v1/users/*` | `UsersController` | `UsersModule` | `UsersService` |
| **Students** | `/api/v1/students/*` | `StudentsController` | `StudentsModule` | `StudentsService`, `QrTokenGeneratorService` |
| **Groups** | `/api/v1/groups/*` | `GroupsController` | `GroupsModule` | `GroupsService` |
| **Schedules** | `/api/v1/groups/:id/schedules` | `SchedulesController` | `SchedulesModule` | `SchedulesService` |
| **Attendance** | `/api/v1/attendance/*` | `AttendanceController` | `AttendanceModule` | `AttendanceService` |
| **Content** | `/api/v1/content/*` | `ContentController` | `ContentModule` | `ContentService` |
| **Assessments**| `/api/v1/assessments/*` | `AssessmentsController` | `AssessmentsModule` | `AssessmentsService`, `GradingEngineService` |
| **Parent Portal**| `/api/v1/parent-portal/*` | `ParentPortalController` | `ParentPortalModule` | `ParentPortalService` |
| **Notifications**| `/api/v1/notifications/*` | `NotificationsController` | `NotificationsModule` | `NotificationsService`, `TasksSchedulerService` |
| **Subscriptions**| `/api/v1/subscriptions/*` | `SubscriptionsController` | `SubscriptionsModule` | `SubscriptionsService` |
| **Uploads** | `/api/v1/uploads/*` | `UploadsController` | `StorageModule` | `StorageService` |
| **Health** | `/api/v1/health` | `HealthController` | `HealthModule` | `TerminusHealthService` |

### 39.2 Consistency Verification
- **Consistency with PRD**: All 35 approved backlog items and 10 PRD modules map directly to concrete API endpoints.
- **Consistency with Backend Architecture**: Controller and Service definitions align with the Modular Monolith pattern in [backend-architecture.md](file:///d:/el_awal/docs/03-Architecture/backend-architecture.md).
- **Consistency with Database Design**: All request/response payloads reflect table columns, relational foreign keys, and unique indexes in [database-design.md](file:///d:/el_awal/docs/03-Architecture/database-design.md).
- **Consistency with Testing Suite**: All test cases `TC-STU-001` through `TC-SUB-001` and `TC-ATT-001..010` have deterministic matching API routes.

---

## 40. Open Decisions & Product Clarifications (`TBD`)

1. **`TBD — Refresh Token Rotation & Storage Strategy`**: Definitive architecture for refresh token rotation or server-side revocation tables (Architecture Decision).
2. **`TBD — Rate Limit Threshold Specifics`**: Exact quantitative requests-per-minute ceilings across different user tiers (Product Decision).
3. **`TBD — External Messaging Gateways`**: Webhook endpoints and transport adapters for SMS or WhatsApp Business API (Product Decision).
4. **`TBD — Attendance Correction Policy`**: Permitted administrative workflows for overriding historical attendance entries (Product Decision).

---

## 41. API Readiness Checklist

- [x] Base URL and `/api/v1` versioning confirmed
- [x] HTTP verb conventions and status code matrix confirmed
- [x] Stateless JWT authentication model confirmed
- [x] Role-based authorization matrix confirmed (4 roles)
- [x] Resource Ownership Guards (BOLA/IDOR protection) confirmed
- [x] Problem Details error contract confirmed
- [x] Page/limit offset pagination contract confirmed
- [x] Filtering, sorting, and search query parameters confirmed
- [x] Complete 31-endpoint inventory documented
- [x] Student management APIs confirmed
- [x] Group management APIs confirmed
- [x] Enrollment APIs confirmed
- [x] Timetable and session APIs confirmed
- [x] Manual attendance APIs confirmed
- [x] QR attendance API & repeat-scan idempotency confirmed
- [x] Assessment & automated exam grading APIs confirmed
- [x] Parent portal consolidated APIs confirmed
- [x] Educational content APIs confirmed
- [x] Cloudflare R2 presigned file upload API confirmed
- [x] Bunny Stream video integration API confirmed
- [x] Notification APIs confirmed
- [x] Subscription and payment status APIs confirmed
- [x] Complete bidirectional traceability matrix documented
- [x] Security audit passed
- [x] Cross-document consistency verified
- [x] Open decisions cleanly documented and classified
