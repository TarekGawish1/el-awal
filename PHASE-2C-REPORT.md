# Phase 2C: Secure Plaintext Credential Retention & Recovery Audit Report

**Date:** 2026-10-25  
**Project:** El Awal Educational Platform  
**Status:** Completed & Validated (All 556 Backend Tests Passing)  

---

## 1. Executive Summary

Phase 2C addresses the secure retention and lifecycle management of plaintext credentials (`tempAccessPin` and `pendingCredentials`) across student and parent account lifecycles. 

The primary objectives achieved:
1. **Preserve Permanent Student & Parent Passwords**: Student and parent accounts and their permanent passwords (`User.passwordHash`) **never** expire after 48 hours. Login via permanent password remains permanent, seamless, and unaffected.
2. **Strict Plaintext Retention Window (48 Hours)**: Plaintext credential copies (`tempAccessPin` and `pendingCredentials.parentPassword`) are retained exclusively during the initial 48-hour handoff/printing window. After 48 hours, they expire and evaluate to `null`.
3. **Safe, Idempotent Background Cleanup**: Hourly scheduled cron cleanup purges expired plaintext PIN records from `student_profiles` without touching `users.password_hash`.
4. **Opportunistic Login Cleanup**: When a student logs in using their real password, plaintext `tempAccessPin` and `pendingCredentials` are purged immediately from the database.
5. **Pending Registration & WhatsApp Delivery Traceability**: `pendingCredentials` is preserved during group join requests / reservations until the teacher approves the request and WhatsApp delivery is successfully enqueued. If dispatch encounters network or service failure, `pendingCredentials` is preserved for retry.
6. **Parent Access Compatibility & Hardening**: Parents can authenticate using their own password, linked student permanent password (even after 48h), or unexpired student temporary PIN. Expired temporary PINs are strictly blocked from parent access.
7. **Teacher Credential Card Printing & Re-issuance**: Teachers and secretariat staff can retrieve plaintext credentials for printing physical cards during the 48-hour window. Once expired, the UI displays clear guidance to use the authorized password-reset flow instead of exposing old passwords.

---

## 2. Recovery Audit: Pre-Existing vs. Recovery Changes

### A. Pre-Existing State (Identified During Step 1 Recovery)
The previous session had already completed significant architectural foundations:
- **`apps/backend/src/modules/auth/services/auth-credentials.service.ts`**:
  - Validates student permanent password (`bcrypt.compare`).
  - Fallback to `tempAccessPin` only when `pinExpiresAt > now()`.
  - Opportunistic purge of `tempAccessPin` and `pendingCredentials` upon verified login.
  - In `parentAccess`: allows parent password, linked student permanent password, and unexpired student PIN; blocks expired student PIN.
- **`apps/backend/src/jobs/cleanup-jobs.service.ts` & `schedulers.ts`**:
  - Implemented `cleanupExpiredTemporaryPins()` which updates `studentProfile` where `pinExpiresAt <= cutoffDate`.
  - Hourly cron schedule (`0 * * * *`, Cairo timezone) registered in `schedulers.ts`.
- **`apps/backend/src/modules/groups/services/group-reservations.service.ts`**:
  - Dispatches `STUDENT_APPROVAL_CREDENTIALS` notification.
  - Clears `pendingCredentials: null` only after `sendNotification` succeeds; preserves on error.
- **`apps/backend/src/modules/auth/tests/phase-2c-secure-retention.spec.ts`**:
  - Initial 19 unit tests validating core retention logic.

### B. Gap Identified & Fixed During Recovery
- **Plaintext Retention Leak on `parentPassword`**:
  - In `apps/backend/src/modules/students/services/student-credentials.service.ts` line 418, `getStudentCredentials` previously extracted `parentPassword` directly from `studentProfile.pendingCredentials` without checking the 48-hour retention window.
  - **Fix Applied**: Tied `parentPassword` exposure strictly to the retention lifecycle:
    ```typescript
    const isParentResetActive =
      Boolean(pending.updatedAt) &&
      new Date(pending.updatedAt).getTime() + 48 * 60 * 60 * 1000 > Date.now();
    const isParentPasswordActive = isPinActive || isParentResetActive;
    const parentPassword =
      isParentPasswordActive && pending.parentPassword
        ? pending.parentPassword
        : null;
    ```
  - **Outcome**: Plaintext parent passwords are never exposed after the 48-hour window. Teachers use the authorized password-reset button to issue fresh credentials when needed.
- **Regression Test Coverage Extended**:
  - Added 2 new tests in `phase-2c-secure-retention.spec.ts` to test unexpired vs. expired `parentPassword` retrieval, bringing total tests to 21.

---

## 3. Exact Files Changed

| File Path | Description of Changes |
| :--- | :--- |
| [`apps/backend/src/modules/students/services/student-credentials.service.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/students/services/student-credentials.service.ts) | Applied 48-hour retention window check to `parentPassword` from `pendingCredentials` in `getStudentCredentials()`, ensuring plaintext passwords are not leaked after expiry. |
| [`apps/backend/src/modules/auth/tests/phase-2c-secure-retention.spec.ts`](file:///d:/development/nexly/el-awal/apps/backend/src/modules/auth/tests/phase-2c-secure-retention.spec.ts) | Added regression tests verifying `parentPassword` is accessible during the active window and masked/nulled when expired or post-cleanup. |
| [`PHASE-2C-REPORT.md`](file:///d:/development/nexly/el-awal/PHASE-2C-REPORT.md) | Comprehensive Phase 2C recovery, audit, and verification report. |

*(Note: `apps/web/src/components/navigation/MobileBottomNav.tsx` was preserved and unmodified as strictly required).*

---

## 4. Test Execution & Results

### 1. Dedicated Phase 2C Retention & Hardening Suite
```bash
npx vitest run src/modules/auth/tests/phase-2c-secure-retention.spec.ts
```
**Result: 21 passed (21 total) in 2.01s**

#### Test Breakdown:
- **1. Student Permanent Password Login vs Expired Plaintext Copy**
  - `authenticates student with permanent password before expiry without wiping active temp PIN` (Passed)
  - `authenticates student with permanent password AFTER expiry and opportunistically clears expired temp PIN` (Passed)
  - `allows student to log in seamlessly with permanent password when tempAccessPin is already NULL` (Passed)
  - `blocks login when using old expired temp PIN that differs from permanent password` (Passed)
- **2. Safe Idempotent Cleanup of Expired Temporary Access PINs**
  - `purges expired tempAccessPin records in database without altering passwordHash` (Passed)
  - `is strictly idempotent: second cleanup run produces 0 purged rows` (Passed)
  - `does not purge unexpired temporary PINs whose pinExpiresAt is in the future` (Passed)
  - `handles database errors gracefully without unhandled exceptions` (Passed)
- **3. Parent Authentication via parentAccess() & login()**
  - `authenticates parent in parentAccess using parent own permanent password` (Passed)
  - `authenticates parent in parentAccess using linked student permanent password EVEN AFTER pinExpiresAt` (Passed)
  - `authenticates parent in parentAccess using unexpired student tempAccessPin` (Passed)
  - `BLOCKS parent in parentAccess when student tempAccessPin is EXPIRED (closing the bypass gap)` (Passed)
  - `does not accept plaintext passwords from pendingCredentials if hash does not match` (Passed)
- **4. Teacher Credential Retrieval Boundary & Authorization**
  - `returns active PIN, parentPassword, and isPinActive: true when PIN is unexpired` (Passed)
  - `returns tempAccessPin: null, parentPassword: null, and isPinActive: false when PIN is expired` (Passed)
  - `returns tempAccessPin: null, parentPassword: null, and isPinActive: false after cleanup has cleared the DB` (Passed)
  - `returns parentPassword when recently reset even if student tempAccessPin is null` (Passed)
  - `returns parentPassword: null when parent reset has expired beyond 48 hours` (Passed)
  - `blocks unauthorized teacher from retrieving credentials (SEC-02 isolation)` (Passed)
- **5. pendingCredentials Lifecycle in Reservation Approval**
  - `safely clears pendingCredentials on successful notification dispatch during approval` (Passed)
  - `preserves pendingCredentials if sendNotification fails so the operation can be retried` (Passed)

### 2. Password Reset & Credentials Access Suite
```bash
npx vitest run src/modules/students/tests/students.password-reset.spec.ts
```
**Result: 6 passed (6 total) in 3.73s**

### 3. Full Backend Test Suite
```bash
npm test (in apps/backend)
```
**Result: 61 test files passed, 556 tests passed, 0 failed in 55.85s (100% passing)**

### 4. TypeScript Strict Compilation
```bash
npx tsc --noEmit (in apps/backend)
```
**Result: Exit Code 0 (Zero type errors)**

### 5. Git Diff Formatting & Whitespace Check
```bash
git diff --check
```
**Result: 0 conflicts, 0 formatting errors**

---

## 5. Credential-Retention Behavior: Before vs. After

| Capability | Before Phase 2C | After Phase 2C |
| :--- | :--- | :--- |
| **Student Permanent Password** | Indefinite, but plaintext `tempAccessPin` remained in database indefinitely if not cleared. | `passwordHash` is permanent and never expires. Plaintext `tempAccessPin` copy is strictly bounded to 48 hours. |
| **Student Login After 48 Hours** | Could use plaintext PIN indefinitely if student never changed password. | Plaintext PIN rejected after 48h. Student logs in seamlessly using permanent password (`passwordHash`). |
| **Database Plaintext Copies** | Plaintext PINs and JSON credentials accumulated in database over time. | Expired plaintext copies purged automatically by hourly cron (`0 * * * *`) and on verified login. |
| **Parent Access via Expired PIN** | Parent could log in with expired student PIN indefinitely. | Strictly blocked. Parent must use their password, student permanent password, or active (unexpired) PIN. |
| **Parent Plaintext Password in Modal** | Returned from `pendingCredentials` forever to teachers. | Returned only during the active 48-hour window. Afterwards returns `null`; teacher uses reset button if needed. |
| **Pending Reservation Approval** | Risk of premature deletion before WhatsApp sent. | `pendingCredentials` preserved until WhatsApp notification successfully enqueued; retained on failure for retries. |

---

## 6. Parent-Login Compatibility & Workflow Verification

1. **Direct Parent Login (`/login`)**:
   - Matches parent phone number against `User.passwordHash`.
   - If parent enters linked student permanent password, authentication succeeds (`UserRole.PARENT`).
   - If parent enters linked student temporary PIN, authentication succeeds only if `pinExpiresAt > now()`.
2. **Parent Access Portal (`/parent-access`)**:
   - Searches by student phone, student code, emergency phone, or parent phone.
   - Evaluates parent `passwordHash`, linked student `passwordHash`, or unexpired `tempAccessPin`.
   - Never exposes plaintext credentials in responses or session tokens.

---

## 7. Remaining Risks & Recommended Migrations

1. **Legacy Records in Production Database**:
   - Student records created months before Phase 2C may still have historical `pending_credentials` JSON or unexpired-marked `temp_access_pin` where `pin_expires_at` was originally set to null.
   - **Recommended Safe SQL Migration**:
     ```sql
     -- Safe, non-breaking cleanup of historical plaintext credentials older than 48 hours:
     UPDATE student_profiles
     SET 
       temp_access_pin = NULL,
       pin_expires_at = NULL,
       pending_credentials = NULL
     WHERE created_at < NOW() - INTERVAL '48 hours'
       AND (temp_access_pin IS NOT NULL OR pending_credentials IS NOT NULL);
     ```
   - This migration modifies **only** `student_profiles` and does **not** alter `users.password_hash`. Permanent access remains 100% intact.

---

## 8. Current Git Status

```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
	modified:   apps/backend/src/modules/auth/tests/phase-2c-secure-retention.spec.ts
	modified:   apps/backend/src/modules/students/services/student-credentials.service.ts

Untracked files:
	PHASE-2C-REPORT.md
```

All modifications are clean, isolated, thoroughly tested, and ready. Stopped without committing, pushing, or deploying.
