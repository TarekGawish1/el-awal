# El Awal — Phase 3: OWASP Remediation Status Audit Report

**Date:** 2026-10-25  
**Assessment Type:** Read-Only Source Code & Dependency Security Audit (Phase 3 Reassessment)  
**Git Commit / Reference:** `bba1c9bb` (`main` branch, working tree completely clean)  
**Audited Artifacts:** Backend (NestJS/Fastify), Web Client (Next.js 14 App Router), Prisma Schema & Database Migrations, Service Worker (`public/sw.js`), GitHub Actions Workflows, `bun.lock`  
**Status:** Completed (Read-Only; No Code or Test Mutations Introduced)

---

## 1. Executive Summary

This Phase 3 audit independently reassesses the original El Awal security audit findings (**SEC-01 through SEC-16**) along with the five architectural security domains (**SEC-17 through SEC-21**) established during Phase 1, Phase 2A, Phase 2B, Phase 2C, Phase 2D, and Phase 2D.2.

Every finding was inspected directly in the current source code, configuration files, and lockfiles. No status is assumed based on previous reports. Both backend and frontend test suites were executed to verify regression resilience:
- **Backend Test Suite:** 63 test files, **592 tests passed** (100% passing in 69.89s).
- **Frontend Test Suite:** 108 test files, **561 tests passed** (100% passing in 86.25s).
- **Dependency Audit:** Re-checked via `bun audit`; identified **66 vulnerabilities** (11 Critical, 17 High, 27 Moderate, 11 Low), demonstrating significant supply-chain drift compared to the historical 18 vulnerabilities reported in August 2026.

### Summary of Current Posture across SEC-01 through SEC-21:
- **Fixed (7 Findings):** SEC-03, SEC-04, SEC-06, SEC-07, SEC-08, SEC-18, SEC-19.
- **Partially Fixed (10 Findings):** SEC-01, SEC-02, SEC-05, SEC-09, SEC-10, SEC-11, SEC-12, SEC-13, SEC-14, SEC-20.
- **Open / Regressed (4 Findings):** SEC-16, SEC-17, SEC-21, plus seed safety in SEC-01.

---

## 2. Prioritized Remediation Matrix

| Finding ID | Title / Domain | Original Severity | Current Status | Current Risk | Recommended Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Known secrets & configuration fallbacks | Critical | **Partially Fixed** | Medium | High |
| **SEC-02** | Attendance resource ownership & isolation | High | **Partially Fixed** | Medium | High |
| **SEC-03** | Student profile & QR credential IDOR | High | **Fixed** | Low (Mitigated) | Low |
| **SEC-04** | Cross-teacher schedule & group IDORs | High | **Fixed** | Low (Mitigated) | Low |
| **SEC-05** | Payment authorization & financial data IDOR | High | **Partially Fixed** | Medium | High |
| **SEC-06** | Assessment authorization & enrollment gaps | High | **Fixed** | Low (Mitigated) | Low |
| **SEC-07** | Refresh-token replay & missing logout revocation | High | **Fixed** | Low (Mitigated) | Low |
| **SEC-08** | Password hash exposure in profile endpoint | High | **Fixed** | Low (Mitigated) | Low |
| **SEC-09** | Unrestricted upload metadata & storage key handling | High | **Partially Fixed** | High | High |
| **SEC-10** | Offline progress sync trusts client course identity | High | **Partially Fixed** | Medium | Medium |
| **SEC-11** | Authentication, QR & batch rate limiting | High | **Partially Fixed** | High | High |
| **SEC-12** | Course details publication & entitlement scoping | Medium | **Fixed** | Low (Mitigated) | Low |
| **SEC-13** | Permissive CORS, Swagger & security headers | Medium | **Partially Fixed** | High | High |
| **SEC-14** | Frontend bearer token exposure & session guard | Medium | **Partially Fixed** | Medium | High |
| **SEC-15** | Sensitive request logging & spoofable metadata | Medium | **Partially Fixed** | Medium | Medium |
| **SEC-16** | Vulnerable installed dependency tree | Medium/High | **Open (Regressed)** | Critical | Immediate |
| **SEC-17** | Service worker caching of authenticated responses | High | **Open** | High | Immediate |
| **SEC-18** | Refresh-token secret management & segregation | High | **Fixed** | Low (Mitigated) | Low |
| **SEC-19** | Sync mutation authorization & replay defense | High | **Fixed** | Low (Mitigated) | Low |
| **SEC-20** | Process supervision, health & graceful shutdown | Medium | **Partially Fixed** | Medium | Medium |
| **SEC-21** | CI/CD security pipeline & automated quality gates | High | **Open** | Critical | Immediate |

---

## 3. Comprehensive Finding-by-Finding Audit (SEC-01 through SEC-21)

---

### SEC-01: Known Secrets and Insecure Configuration Fallbacks

- **Original Risk:** Critical. Application could boot in production with default secrets (`super-secret-jwt-key`), predictable demo seed accounts, and default passwords.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/core/config/env.validation.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/core/config/env.validation.ts#L16-L114): `validateEnv()` enforces that `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are distinct, each minimum 32 characters. Production environment strictly blocks localhost `DATABASE_URL` and mandates all Cloudflare R2 and Bunny Stream configuration variables. Deterministic derivation from `DATABASE_URL` was explicitly disabled.
  - [`apps/backend/src/modules/auth/auth.module.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/auth.module.ts#L22): Uses `configService.getOrThrow<string>('JWT_ACCESS_SECRET')` with zero fallback constants.
  - [`apps/backend/src/core/security/strategies/jwt.strategy.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/core/security/strategies/jwt.strategy.ts#L31): Uses `configService.getOrThrow<string>('JWT_ACCESS_SECRET')` with zero fallback constants.
  - [`apps/backend/prisma/seed.ts`](file:///d:/development/nexly/el-awal/apps/backend/prisma/seed.ts#L44-L75): Defaults `rawPassword` to `process.env.SEED_DEMO_PASSWORD || 'Password123!'` and runs `deleteMany` across all tables.
- **Status:** **Partially Fixed**
- **Tests & Supporting Evidence:**
  - Fastify bootstrap throws at boot if either secret is missing or under 32 characters.
  - Test suite passes in test mode with mock keys.
- **Remaining Exploitability & Uncertainty:**
  - `apps/backend/prisma/seed.ts` does **not** check `process.env.NODE_ENV === 'production'`. If `prisma db seed` or a deployment script runs seed commands against a staging or production database, it will truncate tables and re-create known accounts with `Password123!`.
- **Recommended Next Action & Priority:**
  - Add `if (process.env.NODE_ENV === 'production') throw new Error('Seeding disabled in production')` to `seed.ts`. Priority: **High**.

---

### SEC-02: Missing Resource Ownership Checks for Attendance Operations

- **Original Risk:** High. Any teacher or secretariat assistant could scan QR tokens, record roll calls, or view attendance reports for sessions belonging to other teachers. Non-enrolled students could be manually marked present.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/modules/attendance/controllers/attendance.controller.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/attendance/controllers/attendance.controller.ts#L27-L100): All attendance endpoints accept `@CurrentUser() user: AuthenticatedUser`.
  - [`apps/backend/src/modules/attendance/services/attendance-qr.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/attendance/services/attendance-qr.service.ts#L65-L70): Enforces `session.group.teacherId === teacherId` in `processQrScan()`.
  - [`apps/backend/src/modules/attendance/services/attendance-batch.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/attendance/services/attendance-batch.service.ts#L42-L66): In `recordManualBatch()`, verifies teacher owns the session's group and validates that every submitted `studentId` is actively enrolled in that group.
  - [`apps/backend/src/modules/attendance/services/attendance-queries.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/attendance/services/attendance-queries.service.ts#L79-L84): `getSessionReport()` enforces teacher group ownership.
  - [`apps/backend/src/modules/attendance/services/attendance-queries.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/attendance/services/attendance-queries.service.ts#L154-L178): `getStudentHistory()` enforces student self-only access and parent-child linkage.
- **Status:** **Partially Fixed**
- **Tests & Supporting Evidence:**
  - `src/modules/attendance/tests/attendance.service.spec.ts` passes.
  - E2E tests in `test/app.e2e-spec.ts` validate QR roll call.
- **Remaining Exploitability & Uncertainty:**
  - In `AttendanceQueriesService.getStudentHistory` (`GET /attendance/student/:studentId`), while students and parents are restricted, a `TEACHER` caller is **not** verified to have the student enrolled in any of their academic groups. A teacher can enumerate the full attendance history of any student across the institution.
- **Recommended Next Action & Priority:**
  - Add an enrollment check for teacher callers in `AttendanceQueriesService.getStudentHistory`. Priority: **High**.

---

### SEC-03: Student Profile and QR Credential IDOR

- **Original Risk:** High. Any student or parent could view another student's profile and retrieve their raw QR token to impersonate them during roll calls. Teachers could regenerate QR tokens for students outside their classes.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/modules/students/helpers/student-access.helper.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/students/helpers/student-access.helper.ts#L6-L122): `assertStudentAccess()` strictly enforces:
    - `STUDENT`: self-only access (`myStudentId === studentId`).
    - `PARENT`: verified `parentStudentLink`.
    - `TEACHER`/`SECRETARIAT`: requires active group/course enrollment, teacher creator link, or unassigned self-registered state.
  - [`apps/backend/src/modules/students/services/student-credentials.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/students/services/student-credentials.service.ts#L33-L70):
    - `getStudentQrCode()` calls `assertStudentAccess(studentId, user, true, true)`.
    - `regenerateQrToken()` calls `assertStudentAccess(studentId, user, false, false)`, blocking students and parents.
  - [`apps/backend/src/modules/students/services/student-profile.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/students/services/student-profile.service.ts#L270-L318): `getStudentById()` excludes `qrCodeToken` from general profile responses.
- **Status:** **Fixed**
- **Tests & Supporting Evidence:**
  - `src/modules/students/tests/student-group.service.spec.ts` and `student-query.dto.spec.ts` pass.
- **Remaining Exploitability & Uncertainty:**
  - None identified for IDOR access control. Raw QR tokens are now strictly isolated to badge display and issuance.
- **Recommended Next Action & Priority:**
  - Maintain regression tests. Priority: **Low**.

---

### SEC-04: Cross-Teacher Schedule and Group Resource IDORs

- **Original Risk:** High. Teachers could create or delete schedules and generate sessions for groups owned by other teachers. Students and parents could inspect timetable details of arbitrary cohorts.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/modules/schedules/controllers/schedules.controller.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/schedules/controllers/schedules.controller.ts#L38-L90): Passes `@CurrentUser() user` into all schedule operations.
  - [`apps/backend/src/modules/schedules/helpers/schedule-access.helper.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/schedules/helpers/schedule-access.helper.ts#L9-L79): `assertGroupAccess()` verifies:
    - `TEACHER`: must own the group (`group.teacherId === teacherId`).
    - `STUDENT`: must have active enrollment (`GroupEnrollmentStatus.ACTIVE`).
    - `PARENT`: must have a linked child actively enrolled in the group.
    - Mutations (`requireTeacherOwnership = true`): blocks non-teacher/non-secretariat roles.
  - [`apps/backend/src/modules/schedules/services/schedule-timetable.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/schedules/services/schedule-timetable.service.ts#L48-L95): Validates group ownership and checks time collision across the teacher's schedules.
- **Status:** **Fixed**
- **Tests & Supporting Evidence:**
  - `src/modules/schedules/tests/schedules.service.spec.ts` passes.
- **Remaining Exploitability & Uncertainty:**
  - None identified. Public schedules are isolated to `/schedules/public/centers`.
- **Recommended Next Action & Priority:**
  - Maintain regression tests. Priority: **Low**.

---

### SEC-05: Payment Authorization and Financial-Data IDORs

- **Original Risk:** High. Teachers could modify payments or view financial records across other teachers' cohorts. Students or parents could query any student's billing history.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/modules/subscriptions/services/subscription-ledger.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/subscriptions/services/subscription-ledger.service.ts#L46-L110):
    - `getPaymentLog()` scopes queries to `where.group.teacherId === teacherId`.
    - `getStudentPaymentHistory()` enforces student self-only access, parent-child link, and teacher active enrollment relationship.
    - `getGroupDefaulters()` checks `group.teacherId === teacherId`.
  - [`apps/backend/src/modules/subscriptions/services/subscription-billing.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/subscriptions/services/subscription-billing.service.ts#L93-L111): If `dto.groupId` is provided, verifies teacher group ownership and active student enrollment.
- **Status:** **Partially Fixed**
- **Tests & Supporting Evidence:**
  - `src/modules/subscriptions/tests/subscriptions.service.spec.ts` passes.
- **Remaining Exploitability & Uncertainty:**
  - In `SubscriptionBillingService.recordStudentPayment()`, `groupId` is optional in `RecordPaymentDto` (`record-payment.dto.ts:30`). If a teacher posts a tuition payment without supplying a `groupId`, lines 85–123 are skipped. The record is created/updated with `groupId: null`, bypassing the teacher ownership check and allowing cross-tenant payment entry.
- **Recommended Next Action & Priority:**
  - Require `groupId` for all tuition payment recordings, or resolve student active group server-side and verify teacher ownership before write. Priority: **High**.

---

### SEC-06: Assessment Authorization and Enrollment Gaps

- **Original Risk:** High. Assessments could be associated with groups or courses not owned by the teacher. Students could discover unpublished assessments or submit answers to assessments outside their enrolled groups/courses.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/modules/assessments/services/assessment-crud.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/assessments/services/assessment-crud.service.ts#L90-L140): Verifies that the teacher owns referenced `groupId`, `courseId`, and validates that `lessonId` and `moduleId` belong to the course.
  - [`apps/backend/src/modules/assessments/services/assessment-query.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/assessments/services/assessment-query.service.ts#L153-L188): Scopes student and parent queries strictly to `where.isPublished = true` and active group/course enrollments.
  - [`apps/backend/src/modules/assessments/services/assessment-submission.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/assessments/services/assessment-submission.service.ts#L123-L151): `submitAssessment()` verifies active enrollment in `group`, `targetGroups`, or `course`, rejects submissions to unpublished assessments, and enforces single-attempt rules.
- **Status:** **Fixed**
- **Tests & Supporting Evidence:**
  - `sec-02-assistant-isolation.spec.ts` (10 tests pass).
  - `src/modules/assessments/tests/assessments.service.spec.ts` passes.
- **Remaining Exploitability & Uncertainty:**
  - None identified. Answer keys are redacted on retrieval (`Zero-Leak`).
- **Recommended Next Action & Priority:**
  - Maintain regression suite. Priority: **Low**.

---

### SEC-07: Refresh-Token Replay and Missing Logout Revocation

- **Original Risk:** High. Access and refresh tokens used the same secret and payload. No token type claim. No server session tracking, no rotation, no reuse detection, and no backend logout endpoint.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/core/config/env.validation.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/core/config/env.validation.ts#L60-L66): Strictly requires distinct `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
  - [`apps/backend/src/modules/auth/services/auth-token.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/services/auth-token.service.ts#L54-L98): Generates tokens with `typ: 'access'` vs `typ: 'refresh'` and random `jti`. Hashes refresh token (`sha256`) and persists in `RefreshTokenSession`.
  - [`apps/backend/src/modules/auth/services/auth-token.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/services/auth-token.service.ts#L240-L412): `refreshToken()` verifies `typ === 'refresh'` using `JWT_REFRESH_SECRET`. Rotates session atomically, marking old session revoked with `replacedById`. Detects reuse of revoked tokens.
  - [`apps/backend/src/modules/auth/controllers/auth.controller.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/controllers/auth.controller.ts#L273-L289): Implements `POST /auth/logout` which revokes session in database and clears the HttpOnly cookie.
  - [`apps/backend/src/modules/auth/services/auth-session.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/services/auth-session.service.ts#L96-L100): Revokes all user sessions on password change.
- **Status:** **Fixed**
- **Tests & Supporting Evidence:**
  - Backend integration tests in `auth.service.spec.ts` pass.
- **Remaining Exploitability & Uncertainty:**
  - None identified for token segregation and lifecycle.
- **Recommended Next Action & Priority:**
  - Maintain regression tests. Priority: **Low**.

---

### SEC-08: Password Hash Returned by Authenticated Profile Endpoint

- **Original Risk:** High. `GET /users/me` returned the complete `User` entity without a field projection, disclosing `passwordHash` in the JSON response.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/modules/users/services/users.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/users/services/users.service.ts#L10-L31): `getProfile()` uses an explicit Prisma `select` projection: `id, fullName, phone, email, role, isActive, createdAt, updatedAt, teacherProfile, studentProfile, parentProfile, secretariatProfile, assistantToTeachers`. `passwordHash` is excluded.
- **Status:** **Fixed**
- **Tests & Supporting Evidence:**
  - Verified by inspection of `users.service.ts:13-30`. Full backend test suite passes.
- **Remaining Exploitability & Uncertainty:**
  - While `User.passwordHash` is omitted, `studentProfile: true` selects all fields of `StudentProfile`. This includes `qrCodeToken` and (during active onboarding/reset windows) `tempAccessPin`. For a student calling `/users/me`, returning their own QR token is standard, but `tempAccessPin` should ideally be pruned from profile responses.
- **Recommended Next Action & Priority:**
  - Add explicit `select` projection for `studentProfile` inside `UsersService.getProfile`. Priority: **Low**.

---

### SEC-09: Unrestricted Upload Metadata and Storage Key Handling

- **Original Risk:** High. Client-controlled file keys, URLs, and file sizes. No MIME type allowlist. Arbitrary storage keys accepted during content registration.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/modules/content/dto/presigned-upload.dto.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/content/dto/presigned-upload.dto.ts#L12-L58): `ALLOWED_MIME_TYPES` allowlist defined (PDF, JPEG, PNG, WEBP, MP3, WAV, Word). `@Max(104857600)` enforces 100MB max size.
  - [`apps/backend/src/modules/content/controllers/content.controller.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/content/controllers/content.controller.ts#L57-L65,L199-L204): `allowedStudentFolders` restricts student uploads to `homework-submissions`, `essay-answers`, `assessment-submissions`, and `payment-receipts`. Path traversal `..` is blocked.
  - [`apps/backend/src/modules/content/services/content.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/content/services/content.service.ts#L141-L190): `createContent()` validates teacher ownership of referenced `groupId`, `sessionId`, and `lessonId`.
- **Status:** **Partially Fixed**
- **Tests & Supporting Evidence:**
  - `src/modules/content/tests/content.service.spec.ts` passes.
- **Remaining Exploitability & Uncertainty:**
  - S3 `PutObject` presigned URLs generated in `StorageService.generatePresignedUploadUrl` do not enforce `Content-Length` at the AWS S3 signing policy level.
  - In `createContent`, `dto.fileKey` and `dto.fileUrl` are accepted from the client without verifying whether the file was genuinely uploaded to R2 or whether the key was generated for the current teacher.
- **Recommended Next Action & Priority:**
  - Add server-side pre-signed key registration table or perform an R2 `HeadObject` check before saving educational content records. Priority: **High**.

---

### SEC-10: Offline Progress Sync Trusts Client Course Identity

- **Original Risk:** High. Offline progress sync accepted arbitrary `courseId` and `lessonId` without verifying relational integrity or active student entitlement. Unbounded batch sizes allowed database flooding.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/modules/sync/dto/batch-progress-sync.dto.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/sync/dto/batch-progress-sync.dto.ts#L32-L52): Bounds `positionSeconds` between 0 and 86400. Caps batch size to `@ArrayMaxSize(50)`.
  - [`apps/backend/src/modules/courses/services/course-progress.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/courses/services/course-progress.service.ts#L372-L387): Resolves `courseId` strictly from `courseLesson.module.courseId` in database, ignoring the client-submitted `courseId`. Filters out non-existent lessons.
  - [`apps/backend/src/modules/courses/repositories/course-progress.repository.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/courses/repositories/course-progress.repository.ts#L53-L88): Uses parameterized SQL with monotonic `GREATEST()` updates.
- **Status:** **Partially Fixed**
- **Tests & Supporting Evidence:**
  - `src/modules/sync/tests/sync-batch.spec.ts` passes.
- **Remaining Exploitability & Uncertainty:**
  - While `courseId` is resolved authoritatively from the lesson relation, `CourseProgressService.applyMonotonicProgressBatch` does **not** verify whether the student holds an active `CourseEnrollment` or `CourseAccess` for that course. A student can mark lessons completed for paid courses they do not own.
- **Recommended Next Action & Priority:**
  - Add a course entitlement check before saving progress records in `applyMonotonicProgressBatch`. Priority: **Medium**.

---

### SEC-11: Authentication, QR, and Batch Endpoints Lack Distributed Rate Limiting

- **Original Risk:** High. No rate limiting existed for login, refresh, QR attendance, or batch sync endpoints, leaving them open to password spraying, brute force, and resource exhaustion.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/core/core.module.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/core/core.module.ts#L29-L44): Global `ThrottlerModule` registered (default 1200 req/min) with `CustomThrottlerGuard` bound to `APP_GUARD`.
  - [`apps/backend/src/modules/auth/controllers/auth.controller.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/controllers/auth.controller.ts#L93-L273): Decorates auth endpoints with `@Throttle` (login: 180/min; OTP verify: 10/min; password-reset: 5/min; refresh: 300/min).
  - [`apps/backend/src/modules/auth/services/auth-session.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/services/auth-session.service.ts#L20-L64): In-memory account lockout after 5 consecutive failed attempts (5-minute cooldown).
- **Status:** **Partially Fixed**
- **Tests & Supporting Evidence:**
  - Roles and throttler guards pass unit and E2E tests.
- **Remaining Exploitability & Uncertainty:**
  - `ThrottlerModule` uses in-memory storage, meaning counters are isolated per cluster worker and reset on restart. When deployed across multiple Heroku dynos or workers, limits multiply.
  - No specific `@Throttle` decorators exist on QR roll call (`/attendance/sessions/:id/scan-qr`) or offline sync (`/sync/batch`), falling back to the 1200 req/min global limit.
- **Recommended Next Action & Priority:**
  - Connect `@nestjs/throttler` to Upstash Redis (`ThrottlerStorageRedisService`) and add tight limits on QR scanning (e.g. 60/min) and sync batching (30/min). Priority: **High**.

---

### SEC-12: Course Details Are Not Scoped to Publication or Entitlement

- **Original Risk:** Medium. `GET /courses/:id` returned course outlines for draft, archived, or unpublished courses to any authenticated user, disclosing unreleased curricula and teacher contact information.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/modules/courses/controllers/courses.controller.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/courses/controllers/courses.controller.ts#L126-L131): Passes authenticated `user` context to `getCourseDetails()`.
  - [`apps/backend/src/modules/courses/services/course-query.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/courses/services/course-query.service.ts#L185-L194):
    ```typescript
    if (user && course.status !== CourseStatus.PUBLISHED) {
      const isSecretariat = user.role === UserRole.SECRETARIAT;
      const isOwnerTeacher = user.role === UserRole.TEACHER && (course.teacherId === user.teacherProfileId || course.teacherId === user.id);
      if (!isSecretariat && !isOwnerTeacher) {
        throw new NotFoundException(`Course [${courseId}] not found`);
      }
    }
    ```
- **Status:** **Fixed**
- **Tests & Supporting Evidence:**
  - `src/modules/courses/tests/courses.service.spec.ts` passes.
- **Remaining Exploitability & Uncertainty:**
  - Draft and archived courses return 404 to students and non-owner teachers.
  - Note: Teacher email and phone are selected on lines 138–140 for published course outlines; consider masking phone for public visitors.
- **Recommended Next Action & Priority:**
  - Mask teacher phone in public course details unless explicitly published. Priority: **Low**.

---

### SEC-13: Permissive CORS, Public Swagger, and Missing Security Headers

- **Original Risk:** Medium. CORS defaulted to wildcard `*` with reflected origins and credentials enabled. Swagger UI was publicly mounted in production. No security headers (CSP, HSTS, X-Content-Type-Options) were configured.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/main.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/main.ts#L39-L41): Fastify Helmet registered with cross-origin resource policy.
  - [`apps/backend/src/main.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/main.ts#L174-L214): Swagger is gated behind `!isProduction || enableSwagger`. In production, it is disabled by default.
  - [`apps/web/next.config.js`](file:///d:/development/nexly/el-awal/apps/web/next.config.js#L93-L137): Configures full security headers: HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, Referrer-Policy, Permissions-Policy, and strict `Content-Security-Policy`.
  - [`apps/backend/src/main.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/main.ts#L123-L140): CORS allowlist checks explicit domains and patterns.
- **Status:** **Partially Fixed**
- **Tests & Supporting Evidence:**
  - Verified by inspection of `main.ts` and `next.config.js`.
- **Remaining Exploitability & Uncertainty:**
  - **High CORS Vulnerability in `main.ts:128,133`:**
    ```typescript
    if (/^https:\/\/(.*\.)?vercel\.app$/i.test(normalized)) return true;
    if (/^https:\/\/(.*\.)?herokuapp\.com$/i.test(normalized)) return true;
    ```
    Because `credentials: true` is enabled, permitting any site matching `*.vercel.app` or `*.herokuapp.com` means an attacker can deploy an arbitrary free website on Vercel or Heroku and execute cross-origin authenticated API requests against the El Awal backend.
- **Recommended Next Action & Priority:**
  - Replace wildcard domain regexes with exact production domains (`https://al-awal.online`, specific preview branch URLs). Priority: **High**.

---

### SEC-14: Frontend Bearer Token Exposure and Missing Session Enforcement

- **Original Risk:** Medium. Frontend stored access tokens in `localStorage` indefinitely, making them vulnerable to XSS exfiltration. Token was blindly attached to any requested URL. No route guards or centralized 401 handling.
- **Current Implementation & File Paths:**
  - [`apps/web/src/features/auth/utils/auth-tokens.ts`](file:///d:/development/nexly/el-awal/apps/web/src/features/auth/utils/auth-tokens.ts#L11-L40,L78-L97): Access token resides in **in-memory RAM only** (`inMemoryAccessToken`). Any legacy tokens in `localStorage` are immediately purged. User profile metadata stored for UI hydration is non-sensitive.
  - [`apps/web/src/lib/api/client.ts`](file:///d:/development/nexly/el-awal/apps/web/src/lib/api/client.ts#L200-L258): Attaches Bearer header **only** if `isInternalApi` is true. External URLs never receive the token.
  - [`apps/web/src/lib/api/client.ts`](file:///d:/development/nexly/el-awal/apps/web/src/lib/api/client.ts#L26-L99): Uses concurrency mutex for silent token refresh on 401. Prioritizes same-origin `/api/v1/auth/refresh` to utilize HttpOnly cookie.
  - [`apps/web/src/components/layout/DashboardLayoutShell.tsx`](file:///d:/development/nexly/el-awal/apps/web/src/components/layout/DashboardLayoutShell.tsx#L53-L59): Redirects unauthenticated visitors to `/login`.
- **Status:** **Partially Fixed**
- **Tests & Supporting Evidence:**
  - Web unit tests in `src/features/auth/__tests__/auth-tokens.test.ts` pass (4 tests).
- **Remaining Exploitability & Uncertainty:**
  - While client-side layout protection is in place, Next.js does not have a server-side edge `middleware.ts` to block unauthorized page requests prior to HTML streaming.
- **Recommended Next Action & Priority:**
  - Implement a Next.js Edge Middleware (`apps/web/src/middleware.ts`) that verifies session cookies before serving dashboard routes. Priority: **High**.

---

### SEC-15: Sensitive Request Logging and Spoofable Request Metadata

- **Original Risk:** Medium. Request bodies containing passwords and QR tokens were logged in plaintext. Client-supplied `X-Forwarded-For` and `X-Correlation-Id` headers were trusted without validation.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/core/interceptors/logging.interceptor.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/core/interceptors/logging.interceptor.ts#L15-L56): `SENSITIVE_KEYS` redacts `password`, `confirmpassword`, `passwordhash`, `token`, `refreshtoken`, `accesstoken`, `qrcodetoken`, `tokenhash`, `secret`, `secretkey`, `apikey`, `authorization`, `cookie`, `creditcard`, `cvv`. Truncates request summaries to 120 characters.
  - [`apps/backend/src/core/middleware/correlation-id.middleware.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/core/middleware/correlation-id.middleware.ts#L7-L17): Assigns or preserves correlation IDs.
- **Status:** **Partially Fixed**
- **Tests & Supporting Evidence:**
  - Verified by inspection of `logging.interceptor.ts`.
- **Remaining Exploitability & Uncertainty:**
  - `CorrelationIdMiddleware` accepts arbitrary client-supplied `x-correlation-id` strings without validating format (UUIDv4) or length, allowing potential header injection or log poisoning.
  - In `main.ts`, `trustProxy: true` trusts all proxy hops unconditionally without defining trusted upstream CIDRs.
- **Recommended Next Action & Priority:**
  - Validate that incoming `x-correlation-id` matches UUIDv4 regex; otherwise generate a fresh server-side UUID. Configure specific proxy CIDRs. Priority: **Medium**.

---

### SEC-16: Vulnerable Installed Dependency Tree

- **Original Risk:** Medium/High. Historical August 2026 audit reported 18 vulnerabilities across transitive dependencies.
- **Current Implementation & File Paths:**
  - Monorepo package manifests and lockfile: `package.json`, `apps/backend/package.json`, `apps/web/package.json`, `bun.lock`.
  - Re-checked directly via `bun audit`.
- **Status:** **Open (Regressed)**
- **Audit Results & Evidence:**
  - Total current advisories: **66 vulnerabilities (11 Critical, 17 High, 27 Moderate, 11 Low)**.
  - Critical CVEs / GHSA advisories identified:
    - **Next.js:** Multiple Remote Code Execution vulnerabilities (GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4, GHSA-vcvr-r3jv-pc5j, GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr) in installed versions (`16.3.2` in platform, `16.4.3` in web).
    - **Tinypool (`<=2.1.0`):** Prototype pollution gadget leading to RCE (GHSA-5gmw-xhrv-c9v3).
    - **Vitest (`<3.2.6`):** Arbitrary file read via UI server (GHSA-5xrq-8626-4rwp).
  - High CVEs / GHSA advisories identified:
    - **Multer (`>=2.0.0 <2.5.0`):** DoS via pending fileFilter (GHSA-q7qp-rjg7-q26m).
    - **MySQL2 (`<3.22.0`):** Auth downgrade credential leak & decompression bomb DoS (GHSA-3f6p-5ww8-9rcr).
    - **JS-YAML (`<4.3.2`):** MaxTotalMergeKeys CPU exhaustion DoS (GHSA-2883-xcg3-v3hh).
    - **Zod (`<4.6.6`):** Memory exhaustion with oversized collections (GHSA-mrhx-c7xc-m3w5).
- **Remaining Exploitability & Uncertainty:**
  - Server-side Next.js vulnerabilities represent critical risk if exposed directly without an upstream WAF or reverse-proxy mitigation.
- **Recommended Next Action & Priority:**
  - Run target dependency upgrades, bump Next.js to patched release, and add automated audit gates. Priority: **Immediate (Critical)**.

---

### SEC-17: Service-Worker / PWA Caching of Authenticated Endpoints and Sensitive Data Storage

- **Original Risk:** High. PWA service workers caching authenticated JSON API responses in browser CacheStorage or unencrypted IndexedDB, allowing subsequent local users to view cached student records, attendance logs, and credentials after logout.
- **Current Implementation & File Paths:**
  - [`apps/web/public/sw.js`](file:///d:/development/nexly/el-awal/apps/web/public/sw.js#L475-L508): Strategy D intercepts all same-origin GET requests. Because `/api/v1` is rewritten as same-origin in `next.config.js`, all same-origin API queries are matched:
    ```javascript
    const response = await fetch(request);
    if (isCachableResponse(response)) {
      const runtimeCache = await caches.open(RUNTIME_CACHE);
      await runtimeCache.put(request, response.clone());
    }
    ```
  - Strategy D does **not** exclude `/api/v1/`, does not inspect `Authorization` or `Cookie` request headers, and does not check for `Cache-Control: no-store`.
  - On client logout, no `CLEAR_CACHE` message is dispatched to `sw.js`.
- **Status:** **Open**
- **Tests & Supporting Evidence:**
  - Code inspection of `apps/web/public/sw.js:475-508` and search for `CLEAR_CACHE` across frontend codebase confirmed that `CLEAR_CACHE` is never invoked.
- **Remaining Exploitability & Uncertainty:**
  - On shared computers (e.g. school computer labs or shared family tablets), cached authenticated responses stored in CacheStorage (`RUNTIME_CACHE`) remain accessible in browser developer tools or offline navigation even after logging out.
- **Recommended Next Action & Priority:**
  - Update `sw.js` to strictly skip caching any URL starting with `/api/` or containing `Authorization`/cookie credentials. Dispatch `CLEAR_CACHE` on logout. Priority: **Immediate (High)**.

---

### SEC-18: Refresh-Token Secret Management & Multi-Secret Segregation

- **Original Risk:** High. In previous versions, access and refresh tokens shared the same secret or could fall back to predictable keys, allowing access tokens to be submitted to refresh endpoints.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/core/config/env.validation.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/core/config/env.validation.ts#L60-L66,L152-L158): Startup validation mandates distinct `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (each >= 32 chars).
  - [`apps/backend/src/core/security/strategies/jwt.strategy.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/core/security/strategies/jwt.strategy.ts#L36-L38): Rejects any token where `typ !== 'access'`.
  - [`apps/backend/src/modules/auth/services/auth-token.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/services/auth-token.service.ts#L54-L87,L249-L251): Signs with dedicated secrets and enforces `typ: 'refresh'` during verification.
- **Status:** **Fixed**
- **Tests & Supporting Evidence:**
  - Backend integration tests pass.
- **Remaining Exploitability & Uncertainty:**
  - None identified.
- **Recommended Next Action & Priority:**
  - Maintain configuration checks. Priority: **Low**.

---

### SEC-19: Sync Mutation Authorization, Batch Replay Defense & Multi-Tenant ID Spoofing

- **Original Risk:** High. Offline outbox synchronization accepted multi-domain mutation batches without checking student vs teacher roles, allowing students to submit attendance or onsite homework records.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/modules/sync/controllers/sync.controller.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/sync/controllers/sync.controller.ts#L133-L152): Forbids `STUDENT` callers from submitting teacher-level domains (`groups`, `students`, `attendance`, `payments`, `homework`) or mutation types (`RECORD_HOMEWORK_ONSITE`, `RECORD_ATTENDANCE`).
  - [`apps/backend/src/modules/sync/services/sync-mutation-handlers.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/sync/services/sync-mutation-handlers.ts#L70-L97,L240): Verifies teacher group ownership for every mutation in the batch.
  - Transactions ensure atomicity and idempotency via `clientOperationId`.
- **Status:** **Fixed**
- **Tests & Supporting Evidence:**
  - `src/modules/sync/tests/sync-authorization.spec.ts` (6 tests pass).
  - `src/modules/sync/tests/processMutationBatch.attendance.spec.ts` passes.
- **Remaining Exploitability & Uncertainty:**
  - None identified for authorization boundaries.
- **Recommended Next Action & Priority:**
  - Maintain regression suite. Priority: **Low**.

---

### SEC-20: Process Health Supervision, Graceful Shutdown & Memory Leaks

- **Original Risk:** Medium. Heroku dynos restarting abruptly without draining in-flight requests; unhandled async promise rejections crashing processes; absence of heap limits and cluster supervision.
- **Current Implementation & File Paths:**
  - [`apps/backend/src/modules/health/controllers/health.controller.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/health/controllers/health.controller.ts#L25-L39): `@nestjs/terminus` probes monitor PostgreSQL connectivity and 1GB heap limit.
  - [`apps/backend/src/core/cluster/cluster-master.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/core/cluster/cluster-master.ts#L49-L98): Primary cluster process manages worker health, auto-heals deceased workers, and handles SIGTERM/SIGINT by disconnecting workers gracefully.
  - [`apps/backend/src/main.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/main.ts#L223-L235): Intercepts `unhandledRejection` and non-fatal `uncaughtException` events.
- **Status:** **Partially Fixed**
- **Tests & Supporting Evidence:**
  - Verified by inspection of `cluster-master.ts` and `health.controller.ts`.
- **Remaining Exploitability & Uncertainty:**
  - `apps/backend/src/main.ts` does **not** call `app.enableShutdownHooks()`. When a worker process receives SIGTERM from Heroku, Fastify and NestJS lifecycle hooks (`onModuleDestroy`, `beforeApplicationShutdown`) are not invoked, meaning active database connections in Prisma are terminated abruptly rather than drained.
- **Recommended Next Action & Priority:**
  - Add `app.enableShutdownHooks()` in `main.ts`. Priority: **Medium**.

---

### SEC-21: CI/CD Security Pipeline, Supply-Chain Quality Gates & Deployment Automation

- **Original Risk:** High. Deployments pushing directly to production without automated test verification, security scans, linting, or build checks in CI/CD.
- **Current Implementation & File Paths:**
  - [`.github/workflows/deploy-backend-heroku.yml`](file:///d:/development/nexly/el-awal/.github/workflows/deploy-backend-heroku.yml#L1-L71): Triggers on `push: branches: [main]`. Instantly extracts subtree and executes `git push --force heroku`. Zero test or lint gates.
  - [`.github/workflows/deploy-frontend-heroku.yml`](file:///d:/development/nexly/el-awal/.github/workflows/deploy-frontend-heroku.yml#L1-L70): Triggers on `push: branches: [main]`. Instantly extracts subtree and executes `git push --force heroku`. Zero test or build gates.
- **Status:** **Open**
- **Audit Results & Evidence:**
  - Verified by inspection of `.github/workflows/`. Neither workflow contains a job for `vitest`, `tsc --noEmit`, `bun audit`, or secret scanning.
- **Remaining Exploitability & Uncertainty:**
  - Any push or merged PR to `main` containing a syntax error, broken test, regression, or exposed credential will be deployed directly to production without any quality gate blocking the deployment.
- **Recommended Next Action & Priority:**
  - Restructure CI/CD workflows into a 2-stage pipeline: Stage 1 (Quality Gate: tests, typecheck, audit) must pass before Stage 2 (Deploy) can execute. Priority: **Immediate (High)**.

---

## 4. Revalidation of Completed Plaintext Credential Work (Phases 2C, 2D, 2D.2)

A targeted regression revalidation was conducted across the plaintext credential lifecycle changes implemented in Phases 2C, 2D, and 2D.2:

1. **Student Permanent Password Integrity:**
   - Student login authenticates permanent passwords (`passwordHash`) seamlessly via standard bcrypt compare.
   - When a student authenticates using their permanent password, expired temporary PINs and onboarding envelopes are physically purged opportunistically.
2. **48-Hour Plaintext PIN Boundary:**
   - Plaintext `tempAccessPin` is masked to `null` at the API boundary once expired.
   - Hourly cron (`CleanupJobsService.cleanupExpiredTemporaryPins()`) safely purges expired and legacy null-expiry PIN records.
3. **Multi-Caller Retention Isolation:**
   - Active parent password reset envelopes (`pendingCredentials.updatedAt` within 48 hours) remain protected and isolated from student reservation cleanups.
4. **Outbound WhatsApp Message Lifecycle:**
   - Plaintext passwords in outbound WhatsApp messages continue to be formatted and enqueued for parent delivery.
   - URL sanitization (`pass=` removed) is intact across all notification links.
   - Safe terminal redaction (`••••••••`) triggers only after confirmed `DELIVERED`, after 48h in `SENT`, or after 7 days in `PERMANENT_FAIL`.
5. **Dedicated Test Verification:**
   - `phase-2c-secure-retention.spec.ts`: 21 tests passed.
   - `phase-2d-residual-retention.spec.ts`: 19 tests passed.
   - `phase-2d2-credential-lifecycle.spec.ts`: 14 tests passed.
   - **Zero regressions detected.**

---

## 5. Strategic Recommendation: The Next Three Remediation Phases

Based on actual residual risk, exploitability, and system dependencies, the following three sequential remediation phases are recommended:

```mermaid
graph TD
    subgraph "Phase 4A: Critical Supply Chain, PWA Cache & CI/CD Gates"
        P4A1["SEC-17: Harden PWA Service Worker (Exclude /api/ & Clear on Logout)"]
        P4A2["SEC-21: Establish GitHub Actions CI Quality Gate (Test + Audit Before Deploy)"]
        P4A3["SEC-16: Upgrade High/Critical Vulnerabilities (Next.js patch, Multer, Zod)"]
    end

    subgraph "Phase 4B: Boundary Security & Configuration Hardening"
        P4B1["SEC-13: Restrict CORS (Eliminate *.vercel.app & *.herokuapp.com wildcards)"]
        P4B2["SEC-01: Guard Prisma Seed Script against Production Execution"]
        P4B3["SEC-15: Validate & Sanitize x-correlation-id & Configure Trusted CIDRs"]
        P4B4["SEC-20: Add app.enableShutdownHooks() for Graceful Dyno Draining"]
    end

    subgraph "Phase 4C: API Authorization Depth & Distributed Throttling"
        P4C1["SEC-02: Enforce Teacher Enrollment Scope in getStudentHistory"]
        P4C2["SEC-05: Enforce Mandatory Group Scoping on Tuition Payment Records"]
        P4C3["SEC-09: Bind Upload Keys Server-Side with R2 HeadObject Verification"]
        P4C4["SEC-10: Check Course Entitlement Before Progress Reconcile"]
        P4C5["SEC-11: Integrate Redis-Backed Throttler on QR & Sync Endpoints"]
        P4C6["SEC-14: Add Next.js Edge Middleware for Pre-SSR Route Guarding"]
    end

    Phase 4A --> Phase 4B --> Phase 4C
```

### Phase 4A: Critical Supply Chain, PWA Caching & CI/CD Security Gates (Immediate Priority)
- **Objective:** Eliminate active remote vulnerabilities, protect shared-device users, and stop untested code from deploying to production.
- **Tasks:**
  1. **SEC-17:** Update `apps/web/public/sw.js` to strictly exclude `/api/` from Strategy D caching, and dispatch a `CLEAR_CACHE` message during `useAuthStore.clearSession()`.
  2. **SEC-21:** Update `.github/workflows/deploy-backend-heroku.yml` and `deploy-frontend-heroku.yml` so deployments only run after a required `test_and_audit` job passes.
  3. **SEC-16:** Upgrade Next.js to the latest security patch release to address the Critical RCE advisories, and regenerate `bun.lock`.

### Phase 4B: Origin Boundaries, Process Lifecycle & Seed Safety (High Priority)
- **Objective:** Lock down network origin trust, dyno termination, and database seeding safety.
- **Tasks:**
  1. **SEC-13:** In `apps/backend/src/main.ts`, remove broad regex wildcards (`*.vercel.app`, `*.herokuapp.com`) from CORS allowlists, restricting origins strictly to confirmed production and staging domains.
  2. **SEC-01:** Add hard production guard to `apps/backend/prisma/seed.ts`.
  3. **SEC-15:** Validate that incoming `x-correlation-id` matches UUIDv4, falling back to server-generated UUIDs on invalid input.
  4. **SEC-20:** Call `app.enableShutdownHooks()` in `main.ts` so Fastify and Prisma drain connections cleanly on Heroku SIGTERM.

### Phase 4C: API Authorization Gaps & Distributed Throttling (Medium/Hardening Priority)
- **Objective:** Complete residual object-level authorization checks and transition rate limiting to distributed Redis.
- **Tasks:**
  1. **SEC-02:** Add teacher enrollment relationship check to `AttendanceQueriesService.getStudentHistory`.
  2. **SEC-05:** Require `groupId` or resolve active group server-side before recording tuition payments in `SubscriptionBillingService`.
  3. **SEC-09:** Add pre-signed key registration and R2 object presence validation for educational content.
  4. **SEC-10:** Check active course entitlement before recording progress in `CourseProgressService`.
  5. **SEC-11:** Connect `ThrottlerModule` to Redis for distributed rate limiting across cluster dynos, and add specific throttles to QR and sync endpoints.
  6. **SEC-14:** Add Next.js Edge Middleware (`apps/web/src/middleware.ts`) for server-side pre-SSR route protection.

---

## 6. Conclusion

Phase 1, Phase 2, and the Phase 2D credential lifecycle work successfully established solid core defenses across authentication, token segregation, attendance roll-calls, assessment integrity, and plaintext credential storage boundaries. All 1,153 automated tests (592 backend + 561 frontend) remain passing.

However, three primary exposures require immediate attention before declaring the platform ready for production exposure:
1. **PWA Service Worker Cache:** Same-origin authenticated API responses are cached in unencrypted browser storage and not purged on logout.
2. **CI/CD Pipeline:** GitHub Actions deployments force-push directly to Heroku without running test or audit quality gates.
3. **CORS Policy:** Permissive regex allowlists trust any arbitrary site deployed on Vercel or Heroku with credentials enabled.

Addressing these issues in the recommended Phase 4A and Phase 4B sequence will close the remaining security surface while preserving all existing product behaviors.
