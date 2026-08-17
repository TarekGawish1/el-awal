# El Awal Security Audit

**Audit date:** 2026-08-17
**Assessment type:** Read-only static application and dependency review
**Scope:** NestJS backend, Prisma schema and seed data, Next.js frontend, configuration, documented security controls, tests, and npm dependency advisories

## Executive Summary

The project has useful baseline controls, including a global JWT guard, role checks, strict DTO validation, bcrypt password hashing, parameterized SQL, transactional writes, and parent-child authorization in the parent portal. However, it is not ready for production exposure.

The most important risks are:

- Known fallback secrets and demo credentials can be used when deployment configuration is missing.
- Several teacher and student endpoints enforce roles but not ownership or relationship authorization.
- Refresh tokens are bearer JWTs with no server-side session, rotation, reuse detection, or logout revocation.
- Password hashes and QR bearer credentials are exposed through application responses.
- Authentication, QR scanning, and batch endpoints have no effective rate limiting or strict resource bounds.
- The frontend stores access tokens in `localStorage` and has no implemented route/session guard.
- `npm audit --omit=dev` reported 18 vulnerabilities in the installed dependency tree.

**Overall risk rating: High.** Production deployment should be blocked until the Critical and High findings are addressed and regression tests are added for tenant isolation.

## Severity Summary

| Severity | Count | Priority |
| --- | ---: | --- |
| Critical | 1 | Immediate remediation and secret rotation |
| High | 10 | Remediate before production |
| Medium | 5 | Remediate during security hardening |
| Informational | 0 | Track as engineering improvements |

## Methodology and Limitations

The review used source inspection of security-sensitive controllers, services, guards, DTOs, integrations, configuration, Prisma schema, seed data, frontend API code, tests, and architecture documentation. Dependency findings were checked with `npm audit --omit=dev`.

This was not a dynamic penetration test. The review did not test a deployed environment, production infrastructure, reverse-proxy configuration, cloud bucket policy, database permissions, CI/CD secrets, browser behavior, or third-party provider configuration. Findings that depend on deployment configuration should be verified in staging.

## Findings

### SEC-001: Known secrets and insecure configuration fallbacks

**Severity:** Critical
**Status:** Open
**Affected areas:** Backend configuration, authentication, seed data

`apps/backend/src/core/config/env.validation.ts:4-26` supplies defaults for the database URL, JWT secret, object-storage credentials, and video-provider credentials. `apps/backend/src/modules/auth/auth.module.ts:12-16` and `apps/backend/src/core/security/strategies/jwt.strategy.ts:21-25` also contain fallback JWT secrets. The local `apps/backend/.env` file exists on disk and contains credential configuration; its values are intentionally not reproduced here.

The seed script creates predictable demo accounts and passwords in `apps/backend/prisma/seed.ts:12-14,16-56,157-195`. Student creation also assigns a known default parent password in `apps/backend/src/modules/students/services/students.service.ts:87-100`.

**Impact:** A deployment with missing environment variables may start with predictable database or JWT settings. A leaked or reused demo credential can provide authenticated access. A JWT signed with a known secret can impersonate any user, subject to the user ID existing and remaining active.

**Remediation:**

1. Rotate the database password, JWT secret, R2 keys, Bunny keys, and any credentials that have been used outside an isolated local environment.
2. Remove security-sensitive defaults. Require all production secrets at startup and reject placeholders, short values, localhost database URLs, and known demo values when `NODE_ENV=production`.
3. Move production secrets to a secret manager and prevent them from being printed in CI logs or build artifacts.
4. Make seed data development-only and require an explicit non-production flag. Force password reset for provisioned parent accounts.
5. Review Git history, CI artifacts, backups, and developer machines for credential exposure.

### SEC-002: Missing resource ownership checks for attendance operations

**Severity:** High
**Status:** Open
**Affected areas:** Attendance and academic groups

The attendance controller restricts operations to `TEACHER` and `SECRETARIAT`, but `processQrScan`, `recordManualBatch`, and `getSessionReport` do not verify that the authenticated teacher owns the session's group (`apps/backend/src/modules/attendance/controllers/attendance.controller.ts:26-58`, `apps/backend/src/modules/attendance/services/attendance.service.ts:29-79,113-183,188-255`). The authenticated user ID is only passed as the recorder ID for writes; it is not used for authorization.

Manual attendance also upserts any submitted `studentId` without checking active enrollment in the session group (`attendance.service.ts:125-149`). The global `ResourceOwnershipGuard` only performs a simple parameter-to-user identity comparison when a route has `@CheckOwnership`; these attendance routes do not use that decorator (`apps/backend/src/core/security/guards/resource-ownership.guard.ts:25-67`).

**Impact:** Any teacher can scan QR credentials for another teacher's session, change attendance for students outside their group, or read a session report containing student names and phone numbers. Manual requests can create records for students who are not enrolled in the target group.

**Remediation:**

1. Pass the authenticated user context into every attendance operation.
2. Resolve `session -> group -> teacher` and require the current teacher to own the group. Keep Secretariat access as an explicit administrative policy.
3. For every manual record, verify that the student has an active enrollment in the session group before upserting.
4. Add tests for cross-teacher QR scan, manual update, report access, and non-enrolled students.

### SEC-003: Student profile and QR credential IDOR

**Severity:** High
**Status:** Open
**Affected areas:** Student profile and QR routes

`GET /students/:id` and `GET /students/:id/qr-code` allow `PARENT` and `STUDENT` roles without checking self-access or a parent-child relationship (`apps/backend/src/modules/students/controllers/students.controller.ts:40-52`). The service returns contact details, parent contact details, active groups, and other academic data (`apps/backend/src/modules/students/services/students.service.ts:168-193`). It also returns the raw QR bearer credential (`students.service.ts:199-215`).

`POST /students/:id/regenerate-qr-token` allows any teacher to rotate a token for an arbitrary student because the service does not check group ownership (`students.controller.ts:55-61`, `students.service.ts:221-238`).

**Impact:** An authenticated user who obtains another student UUID can disclose personal information and retrieve a bearer credential that can be used to impersonate that student during attendance. A teacher can invalidate or replace credentials belonging to students outside their groups.

**Remediation:**

1. Permit students to access only their own profile and QR credential.
2. Require a verified `ParentStudentLink` for parent access.
3. Scope teacher access to students actively enrolled in a group owned by that teacher.
4. Store a hash of the QR token where possible and return the raw token only during controlled issuance or regeneration. Never include it in general profile responses.
5. Add authorization tests for every role and cross-student UUID.

### SEC-004: Cross-teacher schedule and group resource IDORs

**Severity:** High
**Status:** Open
**Affected areas:** Schedules

Schedule create, delete, group listing, and session generation endpoints accept IDs but do not receive or validate the authenticated user (`apps/backend/src/modules/schedules/controllers/schedules.controller.ts:24-55`, `apps/backend/src/modules/schedules/services/schedules.service.ts:20-141`). Students and parents can also query schedules for arbitrary group IDs without enrollment or guardian checks.

**Impact:** A teacher can create or delete schedules and generate sessions for another teacher's group. Students or parents can enumerate timetable information for groups unrelated to them.

**Remediation:** Enforce group ownership for teacher mutations and session generation. For student and parent reads, require active enrollment or a verified parent-child relationship. Use explicit administrative bypass rules rather than relying only on roles.

### SEC-005: Payment authorization and financial-data IDORs

**Severity:** High
**Status:** Open
**Affected areas:** Subscriptions and payments

Payment writes and payment logs are role-restricted but not scoped to the authenticated teacher's groups (`apps/backend/src/modules/subscriptions/controllers/subscriptions.controller.ts:27-64`, `apps/backend/src/modules/subscriptions/services/subscriptions.service.ts:26-147`). Group defaulter queries likewise do not validate group ownership (`subscriptions.service.ts:173-241`). Student and parent payment history does not enforce self-access or parent linkage (`subscriptions.controller.ts:45-50`, `subscriptions.service.ts:153-167`).

**Impact:** A teacher can modify payments or view financial and contact data for another teacher's students. Any student or parent can request another student's payment history by ID.

**Remediation:** Pass actor context to all payment operations. Scope teacher reads and writes through group ownership and active enrollment. Require student self-access and verified parent linkage for student history. Add immutable payment audit events and tests for cross-group access.

### SEC-006: Assessment authorization and enrollment gaps

**Severity:** High
**Status:** Open
**Affected areas:** Assessments and submissions

Assessment creation accepts arbitrary `groupId`, `courseId`, and `lessonId` without validating ownership or that those relationships are consistent (`apps/backend/src/modules/assessments/services/assessments.service.ts:31-97`). `getAssessments` returns records across tenants and can include unpublished assessments when no publication filter is supplied (`assessments.service.ts:103-137`).

Student assessment detail access does not verify enrollment, course entitlement, group membership, or publication status (`assessments.service.ts:144-215`). Submission checks only that the assessment is published; it does not verify that the student is entitled to the associated course or enrolled in the associated group (`assessments.service.ts:221-253`).

**Impact:** Students can discover or submit to assessments outside their learning relationships. Teachers can associate assessments with resources they do not own. Unpublished assessment metadata may be disclosed.

**Remediation:** Validate resource ownership and relationship consistency during creation. Default student queries to published assessments that are explicitly entitled to the student. Require active course access or group enrollment before detail access and submission. Scope teacher list/detail results to owned assessments.

### SEC-007: Refresh-token replay and missing logout revocation

**Severity:** High
**Status:** Open
**Affected areas:** Authentication

Access and refresh tokens are signed with the same secret and carry the same payload shape (`apps/backend/src/modules/auth/services/auth.service.ts:58-71`). The refresh endpoint verifies only the signature, expiration, and active user status (`auth.service.ts:98-135`). There is no token type claim, separate signing key, server-side session record, rotation/reuse detection, or logout endpoint (`apps/backend/src/modules/auth/controllers/auth.controller.ts:14-31`).

The frontend logout action only removes the browser token (`apps/web/src/app/(dashboard)/layout.tsx:134-140`).

**Impact:** A stolen refresh token remains usable until expiry. Because token types are not distinguished, a valid access token signed with the same secret can also be submitted to the refresh endpoint. Client logout does not invalidate server-side authentication.

**Remediation:** Use short-lived access tokens and server-tracked refresh sessions containing only a hash of the refresh token. Rotate refresh tokens on use, detect reuse, revoke sessions on logout and password change, and use distinct keys and claims such as `typ`, `iss`, and `aud`.

### SEC-008: Password hash returned by the authenticated profile endpoint

**Severity:** High
**Status:** Open
**Affected areas:** Users

`UsersService.getProfile` returns a full `User` record using `include` without a field projection (`apps/backend/src/modules/users/services/users.service.ts:8-23`). The Prisma model includes `passwordHash` as a normal selected field (`apps/backend/prisma/schema.prisma:129-155`). Therefore `/users/me` can return the password hash to the authenticated caller.

**Impact:** Password hashes can be exfiltrated and cracked offline. Hash disclosure also violates credential confidentiality and increases the impact of any authenticated compromise.

**Remediation:** Use an explicit safe-field `select` for profile queries. Establish a repository or Prisma extension that excludes password hashes by default and add a response contract test that fails if credential fields are present.

### SEC-009: Unrestricted upload metadata and storage key handling

**Severity:** High
**Status:** Open
**Affected areas:** R2 uploads and educational content

`PresignedUploadDto.fileSizeBytes` is validated but ignored (`apps/backend/src/modules/content/dto/presigned-upload.dto.ts:21-28`). The presigned PUT only signs a client-supplied content type and has no size condition (`apps/backend/src/integrations/storage/storage.service.ts:44-64`). MIME types are not allowlisted, and there is no malware or content inspection.

Content registration accepts client-controlled `fileKey`, `fileUrl`, `mimeType`, and associations. It checks that referenced groups and lessons exist but not that the teacher owns them or that the file key was issued to the caller (`apps/backend/src/modules/content/services/content.service.ts:21-71`). Lesson `contentUrl` is also accepted as an arbitrary string and later used as an R2 object key for signed downloads (`apps/backend/src/modules/courses/services/courses.service.ts:442-446`).

**Impact:** Attackers can upload oversized or active files, associate assets with another teacher's resources, and potentially cause stored XSS if active content is served from a trusted origin. Arbitrary object keys can expose or sign unrelated objects when a user is authorized to view the lesson.

**Remediation:** Generate and bind storage keys server-side to the authenticated owner and resource. Enforce an allowlist of MIME types, maximum size conditions, and post-upload verification. Keep buckets private, scan uploads, set safe download headers, and store only server-issued keys rather than arbitrary URLs.

### SEC-010: Offline progress sync trusts client course identity

**Severity:** High
**Status:** Open
**Affected areas:** Offline sync and course progress

The offline sync DTO accepts both `courseId` and `lessonId` (`apps/backend/src/modules/sync/dto/batch-progress-sync.dto.ts:5-36`). The repository inserts both values directly into SQL without checking that the lesson belongs to the course or that the student has an active entitlement (`apps/backend/src/modules/courses/repositories/course-progress.repository.ts:49-87,96-160`). `CourseProgress.courseId` has no Prisma relation to `Course` (`apps/backend/prisma/schema.prisma:462-480`).

Batch size is also unbounded. A student can submit a large operation array and can mark arbitrary lessons as completed, corrupting progress analytics and increasing database load.

**Remediation:** Resolve course identity from the server-side lesson relation. Verify active course access for each operation, reject course/lesson mismatches, add relational integrity where appropriate, cap batch size, cap position values, and validate operation IDs for idempotency semantics.

### SEC-011: Authentication and QR endpoints lack rate limiting

**Severity:** High
**Status:** Open
**Affected areas:** Login, refresh, QR attendance, and batch APIs

No `@nestjs/throttler`, rate-limit middleware, or equivalent control was found. This conflicts with the documented rate-limit requirements in `docs/03-Architecture/api-design.md:292-297`. Public authentication routes are defined in `apps/backend/src/modules/auth/controllers/auth.controller.ts:14-31`, and QR scanning is exposed in `apps/backend/src/modules/attendance/controllers/attendance.controller.ts:26-38`.

**Impact:** Attackers can perform password spraying, credential stuffing, refresh abuse, QR token enumeration, and request flooding. The unbounded offline batch endpoint adds a separate resource-exhaustion path.

**Remediation:** Add distributed rate limiting at the gateway and application layers. Use separate limits for login, refresh, QR scans, and batch sync, keyed by IP plus account/session where appropriate. Configure trusted proxy handling before using forwarded IPs. Add maximum request body size and batch-count validation.

### SEC-012: Course details are not scoped to publication or entitlement

**Severity:** Medium
**Status:** Open
**Affected areas:** Course catalog and course details

The public catalog correctly filters for published courses, but `GET /courses/:id` permits teacher, Secretariat, student, and parent roles and calls `getCourseDetails` without checking course status, enrollment, or ownership (`apps/backend/src/modules/courses/controllers/courses.controller.ts:59-64`, `apps/backend/src/modules/courses/services/courses.service.ts:103-136`).

**Impact:** Authenticated users can enumerate draft or archived course outlines and teacher contact information. This also creates an inconsistent access model where lesson media is protected but course metadata is not.

**Remediation:** Apply role-specific policy: teachers and Secretariat may access owned or administratively permitted courses; students may access published courses for which they have enrollment or preview entitlement; parents should receive only linked-child course summaries.

### SEC-013: Permissive CORS, public Swagger, and missing security headers

**Severity:** Medium
**Status:** Open
**Affected areas:** Backend bootstrap

`apps/backend/src/main.ts:27-32` defaults CORS to `*`, converts that to a reflected origin, and enables credentials. Swagger is always mounted at `/api/docs` (`main.ts:34-69`). No Helmet, CSP, HSTS, clickjacking, or MIME-sniffing header configuration is present.

**Impact:** Misconfiguration can allow untrusted web origins to interact with the API. Public API documentation increases reconnaissance value. Missing response headers reduce browser-side defense in depth.

**Remediation:** Require an explicit production origin allowlist and enable credentials only where required. Gate Swagger behind development or authenticated administrative access. Add security headers at the application or trusted reverse-proxy layer, including a tested CSP, HSTS in HTTPS deployments, `frame-ancestors`, and `X-Content-Type-Options`.

### SEC-014: Frontend bearer token exposure and missing session enforcement

**Severity:** Medium
**Status:** Open
**Affected areas:** Next.js frontend

`apps/web/src/lib/api/client.ts:17,37-40` reads the bearer token from `localStorage` and attaches it to requests. It also accepts arbitrary absolute URLs and attaches the same token to them. The dashboard logout handler only removes local storage (`apps/web/src/app/(dashboard)/layout.tsx:134-140`). No implemented frontend route guard, refresh flow, or consistent 401/session-expiry handling was found.

**Impact:** Any successful XSS can steal the access token. A future caller that passes an attacker-controlled absolute URL could disclose the token to another origin. Missing route/session enforcement can expose authenticated UI states or cause inconsistent logout behavior.

**Remediation:** Prefer an HttpOnly, Secure, SameSite session cookie with CSRF protection, or keep short-lived access tokens in memory and protect refresh sessions. Restrict API requests to the configured API origin. Add middleware or server-side route protection, centralized 401 handling, refresh failure handling, and server-side logout.

### SEC-015: Sensitive request logging and spoofable request metadata

**Severity:** Medium
**Status:** Open
**Affected areas:** Logging and request tracing

`LoggingInterceptor` logs request bodies and query strings (`apps/backend/src/core/interceptors/logging.interceptor.ts:54-85`). Its sensitive-key list does not include `qrCodeToken`, so QR bearer credentials can be logged. It also logs identifiers and other personal data. Client-controlled `X-Forwarded-For` and `X-Correlation-Id` values are trusted (`logging.interceptor.ts:59-64`, `apps/backend/src/core/middleware/correlation-id.middleware.ts:7-13`).

**Impact:** Log readers or log storage compromise can expose bearer credentials and student data. Attackers can spoof IP and correlation information, weakening incident investigation and rate-limit decisions.

**Remediation:** Default to structured, minimal audit logging. Redact QR tokens, identifiers, URLs containing credentials, and PII. Generate correlation IDs server-side unless a validated trusted upstream value is present. Configure trusted proxies and derive client IP only from trusted proxy headers.

### SEC-016: Vulnerable installed dependency tree

**Severity:** Medium, with high and critical transitive advisories
**Status:** Open
**Affected areas:** `package-lock.json`

`npm audit --omit=dev` reported **18 vulnerabilities: 10 moderate, 7 high, and 1 critical**. The report included advisories affecting transitive versions of NestJS/Express, `body-parser`, `file-type`, `js-yaml`, `lodash`, `multer`, Next.js, PostCSS, `qs`, and `tar`.

Some fixes require breaking major-version upgrades, so exploitability and compatibility must be assessed rather than applying `npm audit fix --force` blindly.

**Remediation:**

1. Capture the audit output in CI and fail builds on agreed severity thresholds.
2. Upgrade direct dependencies and regenerate the lockfile in a dedicated change.
3. Test backend, frontend, production builds, and security-sensitive flows after upgrades.
4. For advisories that cannot be immediately upgraded, document reachability and apply compensating controls.

## Positive Controls Observed

- Global JWT authentication and active/deleted-user validation in `apps/backend/src/core/security/strategies/jwt.strategy.ts:21-52`.
- Global role guard in `apps/backend/src/core/security/guards/roles.guard.ts:11-35`.
- Strict DTO validation with whitelist, transformation, and forbidden unknown fields in `apps/backend/src/main.ts:15-25`.
- Bcrypt password hashing in authentication and student provisioning flows.
- Parameterized tagged SQL in the progress repository.
- Prisma transactions, unique constraints, and idempotent attendance persistence.
- Parent portal endpoints consistently call `verifyGuardianLink` before child-specific reads.
- Lesson entitlement checks and expiring Bunny/R2 URLs exist in `apps/backend/src/modules/courses/services/courses.service.ts:395-447`.
- Response projections generally avoid password fields outside the `/users/me` defect.

## Testing Gaps

The current tests cover basic login, refresh issuance, QR enrollment behavior, and student self-attendance history, but they do not adequately cover the identified authorization boundaries.

Add automated tests for:

- Cross-teacher attendance scan, manual attendance, and report access.
- Manual attendance for a student not enrolled in the session group.
- Student self-only profile and QR access.
- Parent-child linkage enforcement for student, attendance, and payment routes.
- Teacher ownership for schedules, payments, content, assessments, and groups.
- Published and entitlement checks for assessment and course metadata access.
- Assessment submission by a student outside the relevant course or group.
- Refresh-token type validation, rotation, reuse detection, logout, and password-change revocation.
- Absence of `passwordHash` and QR bearer tokens in API responses and logs.
- Login, refresh, QR, and batch rate limits.
- Oversized upload, invalid MIME type, arbitrary storage key, and oversized sync batch rejection.
- Course/lesson consistency and entitlement checks during offline progress sync.
- CORS origin allowlisting, security headers, and Swagger production behavior.
- Frontend route protection, token origin restriction, 401 handling, and logout behavior.

## Prioritized Remediation Plan

### Immediate

1. Rotate all non-local credentials and remove insecure production fallbacks.
2. Block production deployment until resource-level authorization is implemented for attendance, schedules, payments, students, content, and assessments.
3. Stop returning password hashes and QR bearer tokens.
4. Implement refresh-session storage, rotation, reuse detection, and logout revocation.

### Before production

1. Add distributed rate limiting and request/batch/upload bounds.
2. Enforce course, lesson, group, and student relationship integrity server-side.
3. Harden uploads and storage key issuance.
4. Replace browser `localStorage` bearer storage with a safer session design.
5. Lock down CORS, Swagger, security headers, proxy handling, and sensitive logs.
6. Resolve or document all dependency advisories with CI enforcement.

### Ongoing

1. Add negative authorization tests for every object-bearing route.
2. Run dependency, secret, and container scans in CI.
3. Maintain an access-control matrix derived from the API contract and verify it against implemented routes.
4. Perform a dynamic penetration test against a production-like staging environment after the code-level fixes land.

## Conclusion

The application has a reasonable security foundation, but role checks are currently being used as a substitute for object-level authorization in multiple domains. Because the platform processes student identity data, attendance, grades, QR bearer credentials, and payment records, the identified cross-tenant access issues and credential weaknesses represent material confidentiality and integrity risks. Remediation should begin with secret rotation and fail-closed configuration, followed by centralized authorization policies and security regression tests.
