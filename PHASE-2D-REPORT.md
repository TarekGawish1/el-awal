# Phase 2D: Residual Plaintext Credential Retention & Legacy Remediation Report

**Date:** 2026-10-25  
**Project:** El Awal Educational Platform  
**Status:** Completed & Validated (All 62 Backend Test Files, 571 Tests Passing)  

---

## 1. Executive Summary

Phase 2D and Phase 2D.1 address the remaining plaintext retention risks, lifecycle boundaries, and multi-caller interactions across student and parent account lifecycles:

1. **Legacy Temporary PINs Without Expiration (`tempAccessPin != null` AND `pinExpiresAt == null`)**:
   - Root cause: previously bypassed the hourly cleanup job and remained active indefinitely.
   - Resolved: enforced strict expiration checks (`Boolean(pinExpiresAt) && pinExpiresAt > now`) across student `/login`, parent `/login`, and `/parent-access`.
   - Updated `CleanupJobsService.cleanupExpiredTemporaryPins()` to safely target and purge obsolete legacy PINs alongside expired PINs via `OR: [{ pinExpiresAt: { lte: cutoffDate } }, { pinExpiresAt: null }]`.
   - Permanent password authentication (`users.password_hash`) is 100% preserved and never modified.
2. **`pendingCredentials` Multi-Caller Isolation**:
   - Identified that `pendingCredentials` was being used for two distinct purposes:
     - *Purpose A:* Onboarding reservation delivery envelope (`studentPassword`, `studentPhone`, `parentPhone`, `createdAt`).
     - *Purpose B:* Parent password reset card-printing envelope (`parentPassword`, `parentPhone`, `updatedAt`).
   - Fixed: updated `rejectReservation()`, `acceptReservation()`, and opportunistic student password login so they never erase active parent password reset envelopes (`isParentResetActive = Boolean(pending.updatedAt) && updatedAt + 48h > now`). Onboarding student passwords are stripped, while parent reset credentials remain preserved for the 48-hour card printing window.
3. **WhatsApp Message Content Retention Audit**:
   - Traced credential-bearing messages across `Notification` and `WhatsAppMessageLog`.
   - Established that plaintext credentials remain stored indefinitely in message bodies and JSON payloads even after `student_profiles.pendingCredentials` is cleared.
   - Mapped API and database visibility, and defined a safe, post-delivery redaction lifecycle that preserves active delivery and retry mechanisms.

---

## 2. Exact Files Changed

| File Path | Description of Changes |
| :--- | :--- |
| [`apps/backend/src/jobs/cleanup-jobs.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/jobs/cleanup-jobs.service.ts) | Extended `cleanupExpiredTemporaryPins()` predicate to safely match both `pinExpiresAt <= cutoffDate` and legacy `pinExpiresAt IS NULL` records, while modifying only `tempAccessPin` and `pinExpiresAt` in `student_profiles`. |
| [`apps/backend/src/modules/auth/services/auth-credentials.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/services/auth-credentials.service.ts) | Hardened student `/login`, parent `/login`, and `/parent-access` against PIN bypass by requiring `pinExpiresAt > now()`. Updated opportunistic login cleanup to purge legacy PIN copies where `pinExpiresAt` is null, while preserving active parent password reset envelopes (`isParentResetActive`). |
| [`apps/backend/src/modules/students/services/student-credentials.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/students/services/student-credentials.service.ts) | Hardened `getStudentCredentials()` to treat legacy PINs with null expiry as inactive (`isPinActive: false`), immediately masking `tempAccessPin` and `parentPassword` to `null`. |
| [`apps/backend/src/modules/groups/services/group-reservations.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/groups/services/group-reservations.service.ts) | In `rejectReservation()` and `acceptReservation()`, safely clears onboarding credentials when 0 pending reservations remain, while strictly preserving active parent reset envelopes (`isParentResetActive`). |
| [`apps/backend/src/modules/auth/services/student-registration.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/services/student-registration.service.ts) | Added explicit `createdAt` timestamp to newly generated `pendingCredentials` payload on public self-registration. |
| [`apps/backend/src/modules/auth/services/auth-group-registration.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/services/auth-group-registration.service.ts) | Added explicit `createdAt` timestamp to newly generated `pendingCredentials` payload on group link registration. |
| [`apps/backend/src/modules/auth/tests/phase-2c-secure-retention.spec.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/tests/phase-2c-secure-retention.spec.ts) | Updated mock in `updateMany` to support `where.OR` predicates used by legacy PIN cleanup. |
| [`apps/backend/src/modules/auth/tests/phase-2d-residual-retention.spec.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/tests/phase-2d-residual-retention.spec.ts) | Dedicated 19-test regression suite covering legacy null-expiry PIN cleanup, auth bypass blocking, rejection cleanup, parent reset preservation, and permanent password login behavior. |

*(Note: `apps/web/src/components/navigation/MobileBottomNav.tsx` was untouched).*

---

## 3. WhatsApp Message Content Retention Audit

### A. Lifecycle Trace from Dispatch to Delivery
1. **Creation**:
   - Credential-bearing notifications are generated during:
     - Direct student registration ([`student-registration.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/services/student-registration.service.ts)).
     - Group link registration ([`auth-group-registration.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/services/auth-group-registration.service.ts)).
     - Group reservation approval ([`group-reservations.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/groups/services/group-reservations.service.ts)).
     - Parent password reset ([`student-credentials.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/students/services/student-credentials.service.ts)).
   - Messages are formatted via `formatStudentApprovalMessage()` or `formatResetParentPasswordMessage()`, embedding plaintext passwords into Arabic text.
2. **Notification Persistence**:
   - `NotificationDispatchService.sendNotification()` creates a record in `notifications`:
     - `message`: contains the formatted body with plaintext passwords and direct login URLs (`?pass=...`).
     - `data`: contains `studentPassword` and `parentPassword` as raw JSON fields.
3. **Queueing in `whatsAppMessageLog`**:
   - `WhatsAppQueueManagerService.enqueueNotification()` creates a record in `whatsAppMessageLog`:
     - `messageBody`: contains the outbound plaintext message.
     - `status`: `QUEUED`.
4. **Worker Processing**:
   - `WhatsAppDispatcherService.processNextQueuedMessage()` queries candidates where `status IN ['QUEUED', 'FAILED']`.
   - Reads `candidate.messageBody` and dispatches via `WhatsAppService.sendTrackedProtectedMessage()`.
   - On success: updates `status: SENT`, `sentAt: NOW()`.
   - On transient failure: updates `status: FAILED`, increments `retryCount`, schedules retry via exponential backoff (1m, 5m, 15m).
   - On permanent failure: updates `status: PERMANENT_FAIL`.
5. **Delivery**:
   - When WhatsApp webhook delivers: `markDelivered()` updates `status: DELIVERED`.

### B. Retention Reality
- **Do Plaintext Passwords Remain Stored After `pendingCredentials` is Cleared?**  
  **YES.** Clearing `studentProfile.pendingCredentials` to `null` purges the profile column, but the message bodies remain stored in:
  1. `notifications.message`
  2. `notifications.data` (`studentPassword`, `parentPassword`)
  3. `whats_app_message_logs.message_body`
- **How Long Do They Remain?**  
  **Indefinitely.** There is currently no automated cron job or database TTL policy that deletes or redacts historical notifications or WhatsApp message logs.
- **Access Vectors**:
  - Staff APIs: `@Get('notifications/whatsapp-queue')`, `@Get('notifications/whatsapp-failed')`, and `@Get('notifications/whatsapp-overview')` expose `messageBody` to all users with role `TEACHER` or `SECRETARIAT`.
  - User Notification Feed: `@Get('notifications')` returns `message` and `data` to the recipient user (and to staff when `query.scope === 'all'`).
  - Database Records & Backups: Rows remain in Postgres indefinitely.

### C. Proposed Safe Lifecycle for Message Content
- **Why Content Cannot Be Cleared Prematurely**:
  - While a message is `QUEUED`, `SENDING`, or `FAILED` (within its retry window), the background dispatcher worker requires `candidate.messageBody` to execute delivery and retries. Clearing it early breaks delivery.
- **Recommended Minimal Safe Lifecycle**:
  1. **Post-Finalization Redaction**: Once a message reaches `status: 'DELIVERED'` (or `sentAt < NOW() - INTERVAL '24 hours'`), a lightweight cleanup job or worker hook can redact credential patterns (`كلمة المرور: ...`) in `whatsAppMessageLog.messageBody` and nullify `Notification.data.studentPassword` and `parentPassword`.
  2. **Failed Message Retention Cap**: If a message remains in `FAILED` or `PERMANENT_FAIL` status for longer than 7 days, redact the message body while keeping delivery telemetry (status, recipient, failure reason, timestamps).

---

## 4. `pendingCredentials` Multi-Caller Isolation & Prevention of Accidental Erase

### A. The Two Conflicting Callers
- **Caller 1: Onboarding Reservation Delivery**:
  - Sets `{ studentPassword, parentPassword, studentPhone, parentPhone, createdAt }`.
  - Needed strictly until the teacher reviews and accepts/rejects the group reservation.
- **Caller 2: Parent Password Reset Card Printing**:
  - Sets `{ parentPassword, parentPhone, updatedAt: ISOString }`.
  - Needed for 48 hours to allow the teacher or secretariat to view and print physical cards via `getStudentCredentials()`.

### B. Vulnerability Identified & Fixed
- **Risk**: In a naive implementation, if a student had an active parent password reset generated minutes ago, and an unrelated pending group reservation was subsequently rejected by a teacher (or the student logged in with their permanent password), `pendingCredentials` was set to `null`. This inadvertently destroyed the parent's new password before staff could print the card!
- **Fix Applied**:
  - Defined the active parent reset predicate:
    ```typescript
    const isParentResetActive =
      Boolean(prevPending.updatedAt) &&
      new Date(prevPending.updatedAt).getTime() + 48 * 60 * 60 * 1000 > Date.now();
    ```
  - In `rejectReservation()`, `acceptReservation()`, and `auth-credentials.service.ts` opportunistic login:
    - If `isParentResetActive === true`: preserves `{ parentPassword, parentPhone, updatedAt }` while stripping `studentPassword`.
    - If `isParentResetActive === false`: safely sets `pendingCredentials: null`.
  - Verified by regression tests in `phase-2d-residual-retention.spec.ts`.

---

## 5. PIN Expiry Versus Permanent Password Authentication

The system maintains a strict separation between temporary access PINs and permanent passwords:

```typescript
// 1. Permanent password check (Bcrypt against User.passwordHash)
let isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

// 2. Temporary PIN check (Fallback ONLY if permanent password did not match)
if (!isPasswordValid && user.studentProfile?.tempAccessPin) {
  const isPinValid =
    Boolean(user.studentProfile.pinExpiresAt) &&
    new Date(user.studentProfile.pinExpiresAt) > new Date();
  if (isPinValid && user.studentProfile.tempAccessPin === dto.password) {
    isPasswordValid = true;
  }
}
```

### Four Exact Login Behaviors:

1. **Permanent password is also the old PIN, after 48 hours**:
   - `bcrypt.compare(dto.password, user.passwordHash)` **succeeds immediately**.
   - Temporary PIN check is completely skipped.
   - Authentication succeeds unconditionally.
   - The expired temporary PIN copy is opportunistically purged from the database.
   - **Crucial Note**: The user is **NOT** blocked. Permanent password authentication is permanent and never expires.
2. **A separate PIN that has expired**:
   - `bcrypt.compare` fails because the entered string does not match `passwordHash`.
   - Fallback checks `isPinValid`.
   - Because `pinExpiresAt <= now()`, `isPinValid` evaluates to `false`.
   - Authentication is **rejected (`401 UnauthorizedException`)**.
   - The expired PIN bypass is blocked.
3. **A legacy PIN with null expiry (`pinExpiresAt = NULL`)**:
   - `bcrypt.compare` fails.
   - Fallback checks `Boolean(pinExpiresAt) && pinExpiresAt > now()`.
   - Evaluates to `false` (null check fails).
   - Authentication is **rejected (`401 UnauthorizedException`)**.
   - Hourly cron job purges the obsolete plaintext record from the database.
4. **A valid permanent password when all plaintext copies have been cleared**:
   - `tempAccessPin: null`, `pinExpiresAt: null`, `pendingCredentials: null`.
   - `bcrypt.compare(dto.password, user.passwordHash)` succeeds.
   - Authentication succeeds seamlessly.

---

## 6. Test Execution & Verification

### 1. Dedicated Phase 2D Regression Test Suite
```bash
npx vitest run src/modules/auth/tests/phase-2d-residual-retention.spec.ts
```
**Outcome: 19 passed (19 total) in 4.41s**

* Verified:
  - Purging legacy PINs with null expiry without touching `users.passwordHash`.
  - Preserving unexpired PINs.
  - Strict idempotency (second run produces 0 purged rows).
  - Permanent password login verification after legacy PIN purge.
  - Permanent password login succeeding even when identical to expired PIN string.
  - Blocking student `/login`, parent `/login`, and `/parent-access` when using legacy null-expiry PINs.
  - Opportunistic cleanup of legacy PINs on permanent password login.
  - Opportunistic cleanup preserving active parent reset credentials.
  - API masking of legacy records in `getStudentCredentials()`.
  - Clearing `pendingCredentials` on reservation rejection when 0 pending reservations remain.
  - Preserving active parent reset credentials on reservation rejection.
  - Preserving `pendingCredentials` on rejection when other pending reservations exist.
  - Clearing `pendingCredentials` upon successful approval notification dispatch.
  - Preserving active parent reset credentials on approval notification dispatch.
  - Preserving `pendingCredentials` upon notification dispatch failure for retry.
  - Graceful handling when approving an account where `pendingCredentials` is already null.

### 2. Phase 2C Regression Test Suite
```bash
npx vitest run src/modules/auth/tests/phase-2c-secure-retention.spec.ts
```
**Outcome: 21 passed (21 total) in 2.45s**

### 3. Password Reset & Credentials Access Suite
```bash
npx vitest run src/modules/students/tests/students.password-reset.spec.ts
```
**Outcome: 6 passed (6 total) in 3.78s**

### 4. Combined Auth & Credentials Suites
```bash
npx vitest run src/modules/auth/tests/phase-2c-secure-retention.spec.ts src/modules/auth/tests/phase-2d-residual-retention.spec.ts src/modules/students/tests/students.password-reset.spec.ts
```
**Outcome: 3 test files passed, 46 tests passed, 0 failed in 3.34s**

### 5. Full Backend Test Suite
```bash
npm test (in apps/backend)
```
**Outcome: 62 test files passed, 571 tests passed, 0 failed in 33.34s (100% passing)**

### 6. TypeScript Strict Compilation
```bash
npx tsc --noEmit (in apps/backend)
```
**Outcome: Exit Code 0 (Zero type errors)**

### 7. Git Diff Check
```bash
git diff --check
```
**Outcome: Exit Code 0 (Zero formatting or whitespace errors)**

---

## 7. Final Git Status

```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   PHASE-2C-REPORT.md
	modified:   apps/backend/src/jobs/cleanup-jobs.service.ts
	modified:   apps/backend/src/modules/auth/services/auth-credentials.service.ts
	modified:   apps/backend/src/modules/auth/services/auth-group-registration.service.ts
	modified:   apps/backend/src/modules/auth/services/student-registration.service.ts
	modified:   apps/backend/src/modules/auth/tests/phase-2c-secure-retention.spec.ts
	modified:   apps/backend/src/modules/groups/services/group-reservations.service.ts
	modified:   apps/backend/src/modules/students/services/student-credentials.service.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	PHASE-2D-REPORT.md
	apps/backend/src/modules/auth/tests/phase-2d-residual-retention.spec.ts

no changes added to commit (use "git add" and/or "git commit -a")
```

Zero production database mutations performed. No commits, pushes, merges, or deployments executed. [`apps/web/src/components/navigation/MobileBottomNav.tsx`](file:///d:/development/nexly/el-awal/apps/web/src/components/navigation/MobileBottomNav.tsx) remains completely untouched.
