# Phase 4A.1 Resolution Report: CI Audit Gate & Offline Account Isolation

**Date:** 2026-10-25  
**Workspace:** El Awal Monorepo  
**Target Environment:** GitHub Actions CI/CD & Browser PWA IndexedDB  

---

## Executive Summary

Phase 4A.1 resolves the two outstanding verification issues from Phase 4A:
1. **CI Dependency Audit Gate:** Configured a strict two-tier dependency audit policy in GitHub Actions workflows. The production dependency tree is strictly blocked against any Critical vulnerabilities (currently 0 critical, exiting with code 0). Dev-only test-runner advisories (`tinypool` and `vitest`) are explicitly documented with paths, exploitability rationale, and a review expiry date (2026-12-31). Any newly discovered or un-exempted critical vulnerability immediately breaks the build.
2. **Offline Account Isolation in IndexedDB:** Implemented authorization boundary checks (`isUserAuthorizedForOfflineData()`) and memory cache purging (`clearMemoryEntityCaches()`) across offline repositories (`students`, `groups`, `rosters`, `sessions`, `payments`). Comprehensive regression tests prove that offline data cannot leak between users on a shared device, mutations cannot be replayed across identities, un-synced operations are preserved, and existing offline workflows remain fully functional without globally deleting IndexedDB.

---

## 1. CI Dependency Audit Gate Resolution

### 1.1 Installed Bun Version & Initial Audit Result
- **Installed Bun Version:** `bun 1.4.2`
- **Command Executed:** `bun audit --audit-level=critical`
- **Initial Exit Code:** `1` (Failed)
- **Reported Advisories:**
  1. `GHSA-5gmw-xhrv-c9v3` (`tinypool@1.1.1` <= 2.1.0): Prototype Pollution gadget in worker options leads to RCE.
  2. `GHSA-85c8-ppgw-ccpr` (`tinypool@1.1.1` < 2.1.2): Prototype Pollution gadget to RCE in `run()` options.
  3. `GHSA-5xrq-8626-4rwp` (`vitest@2.1.9` < 3.2.6): When Vitest UI server is listening, arbitrary files can be read and executed.

### 1.2 Remediability Analysis
Running `bun audit fix --dry-run` confirmed that remediating Vitest and Tinypool in-place is blocked by declared ranges across `@vitest/mocker`, `vite`, `deepmerge-ts`, and `tinypool`. Upgrading to Vitest 3.2.6+ / 4.x represents a major breaking framework migration across Vite 6, Node requirements, and test harness APIs across 110 test files and 575 unit/integration tests in `apps/web`.

### 1.3 Exploitability & Safety Assessment
- **`GHSA-5xrq-8626-4rwp` (Vitest UI):** Only exploitable when the Vitest UI HTTP server (`vitest --ui`) is launched and bound to a network interface. In this workspace and throughout CI, tests run strictly via headless CLI (`vitest run`). The UI server is neither started nor exposed in CI or production.
- **`GHSA-5gmw-xhrv-c9v3` & `GHSA-85c8-ppgw-ccpr` (Tinypool):** Prototype pollution gadgets in the worker pool initialization. Exploitability requires attacker-controlled input polluting `Object.prototype` within test files. Test files run locally or in ephemeral CI containers without accepting untrusted external payloads.

### 1.4 Implemented Quality Gate Policy
Both Heroku deployment workflows (`.github/workflows/deploy-backend-heroku.yml` and `.github/workflows/deploy-frontend-heroku.yml`) and root `package.json` have been configured with a two-tier policy:

```bash
# Tier 1: Strict Blocking Production Dependency Audit (Zero Critical Allowed)
bun audit --production --audit-level=critical
# Exit code: 0 | Checked 856 packages | 0 critical vulnerabilities found

# Tier 2: Full-Tree Tooling Audit with Explicit Documented Exceptions
bun audit --audit-level=critical \
  --ignore=GHSA-5gmw-xhrv-c9v3 \
  --ignore=GHSA-85c8-ppgw-ccpr \
  --ignore=GHSA-5xrq-8626-4rwp
# Exit code: 0 | Checked 1451 packages | 3 documented exceptions | 0 other critical
```

- **Policy Guarantees:**
  - Zero Critical vulnerabilities allowed in runtime production packages.
  - Development tooling is strictly audited; any new or unlisted Critical CVE immediately exits with code `1` and aborts deployment.
  - Failures in the audit service trigger `set -e` exit, preventing network/service errors from counting as clean audits.
  - **Review / Expiry Date:** **2026-12-31** (aligned with the next major Next.js / Vitest upgrade window).

---

## 2. IndexedDB Offline Account Isolation & Lifecycle

### 2.1 Complete Lifecycle Inspection

| Component | Architecture & Isolation Boundary |
|---|---|
| **Outbox Mutations (`outbox_mutations`)** | **User-Partitioned at Rest:** Each record contains `userId` and is indexed via `idx_userId`. `enqueueMutation` rejects unauthenticated operations and stamps `currentUser.id`. `getPendingMutations(userId)` and `getUserPendingCount(userId)` filter by account. `SyncFlushExecutor` only reads and flushes mutations belonging to `currentUser.id`. |
| **Relational Entity Stores (`students`, `groups`, `sessions`, `rosters`, `payments`)** | **Protected via Active Authorization Boundary:** Stores use primary key `id`. Account isolation is enforced at query time via `isUserAuthorizedForOfflineData()`. If `lastBootstrapUserId` does not match the active `useAuthStore.user.id` (or if unauthenticated), repositories return empty arrays (`[]`) / `null`. |
| **Account Switching & Bootstrap Reconcile** | When User B logs in, `bootstrapManager.performBootstrap()` detects `isUserSwitch = (currentUserId !== lastBootstrapUserId)`. It forces a full snapshot download (`forceFull = true`, `since = null`), executes snapshot reconciliation (`syncStudentsSnapshot`, `syncGroupsSnapshot`) that prunes User A's records from local stores while preserving locally pending mutations, saves User B's dataset, and records `lastBootstrapUserId = User B`. |
| **Logout & Session Expiration** | `useAuth.logout` executes `clearSession()`, `queryClient.clear()`, `purgeServiceWorkerUserCache()`, and `offlineDb.clearMemoryEntityCaches()`. Memory maps in RAM are wiped immediately. Disk outbox mutations belonging to User A remain safely preserved with status `PENDING` and are never silently discarded. |
| **Replay Authorization** | User B cannot flush or replay User A's queued mutations because `SyncFlushExecutor.executeFlush()` explicitly scopes queries to `currentUser.id`. |

### 2.2 Regression Test Coverage
Implemented comprehensive test suite:  
[`apps/web/src/lib/offline/__tests__/offline-account-isolation.spec.ts`](file:///d:/development/nexly/el-awal/apps/web/src/lib/offline/__tests__/offline-account-isolation.spec.ts)

1. **User A cannot read User B's offline data after an account switch:**
   - User A populates offline data (`lastBootstrapUserId = 'teacher-user-a'`).
   - Active user switched to User B (`'teacher-user-b'`).
   - Prior to sync, User B queries `getStudentsOffline()`, `getGroupsOffline()`, `getRoster()`, `getStudentByIdOffline()` — all return `[]` or `null`.
   - User B performs online bootstrap: full snapshot reconciliation cleanly prunes User A's data, saves User B's data, and sets `lastBootstrapUserId = 'teacher-user-b'`. User B now accesses only User B's records.
2. **User B cannot replay User A's queued mutations under User B's identity:**
   - User A enqueues attendance and finance mutations while offline.
   - User B logs in and triggers `syncEngine.flushOutbox()`.
   - Flush reports `synced: 0, failed: 0`, and backend API is never called for User A's mutations.
   - User A's mutations remain safely pending with `userId: 'user-a'`.
3. **Logging out does not expose private IndexedDB data through offline UI or memory caches:**
   - User logs out via `clearSession()` + `clearMemoryEntityCaches()`.
   - Queries to `getStudentsOffline()`, `getGroupsOffline()`, `getRoster()`, `getPaymentsOffline()` return empty results.
   - In-memory entity caches in `offlineDb.core` have size `0`.
4. **Unsynchronized operations belonging to User A are not silently discarded:**
   - User A logs out with 2 pending operations.
   - User B logs in, performs operations, and logs out.
   - User A logs back in: both original operations remain in `outbox_mutations` with IDs and payloads intact.
5. **Existing offline learning, attendance, and synchronization behavior remains functional:**
   - Authorized user queries students by search keyword, filters groups by grade level, retrieves offline rosters, enqueues attendance, and successfully flushes outbox with backend idempotency.

---

## 3. Validation Results

| Test / Check Suite | Scope | Result | Details |
|---|---|---|---|
| **Production Dependency Audit** | Monorepo Root | **PASSED** (Exit 0) | `bun audit --production --audit-level=critical` (856 packages, 0 critical) |
| **Full Tooling Audit Gate** | Monorepo Root | **PASSED** (Exit 0) | `bun audit --audit-level=critical --ignore=...` (1451 packages, 0 unlisted critical) |
| **Offline Account Isolation Spec** | `apps/web` | **PASSED** (Exit 0) | `src/lib/offline/__tests__/offline-account-isolation.spec.ts` (5 tests) |
| **Full Offline Test Suite** | `apps/web` | **PASSED** (Exit 0) | 9 test files, 53 tests passing |
| **Full Web Unit & Integration Suite** | `apps/web` | **PASSED** (Exit 0) | 110 test files, 575 tests passing |
| **Full Backend Test Suite** | `apps/backend` | **PASSED** (Exit 0) | 63 test files, 592 tests passing |
| **TypeScript Typecheck (Web)** | `apps/web` | **PASSED** (Exit 0) | `bun x tsc --noEmit` (0 errors) |
| **TypeScript Typecheck (Backend)** | `apps/backend` | **PASSED** (Exit 0) | `tsc -p tsconfig.build.json --noEmit` (0 errors) |
| **Backend Production Build** | `apps/backend` | **PASSED** (Exit 0) | `bun --filter @el-awal/backend build` |
| **Frontend Production Build** | `apps/web` | **PASSED** (Exit 0) | `next build apps/web` (Turbopack, 46 static pages generated) |
| **Git Diff Check** | Monorepo Root | **PASSED** (Exit 0) | `git diff --check` (0 whitespace errors) |

---

## 4. Remaining Architectural Considerations & Minimal Migration Plan

### Current Architectural Characteristic
The relational entity stores (`students`, `groups`, `sessions`, `payments`) are single-tenant at rest on the client device. Access isolation is enforced by:
1. Active session authorization checks (`isUserAuthorizedForOfflineData()`).
2. Immediate memory cache clearing on logout (`clearMemoryEntityCaches()`).
3. Pruning snapshot reconciliation upon account switch (`bootstrapManager.performBootstrap()`).

**Behavior on Shared Offline Device:**
If User A logs out and User B logs in while the device is completely disconnected from the internet, User B cannot view User A's data (protected), but User B cannot view User B's offline data either until User B connects to the internet to perform an initial bootstrap snapshot.

### Future Multi-Account Local Migration Plan (Optional)
If full multi-tenant simultaneous offline caching on a shared device is required in a future phase:
1. **Schema Migration (DB Version 6):**
   - Update object store definitions in `indexeddb-core.ts` to use compound keys:
     - `students`: `{ keyPath: ['teacherId', 'id'] }`
     - `groups`: `{ keyPath: ['teacherId', 'id'] }`
     - `sessions`: `{ keyPath: ['teacherId', 'id'] }`
2. **Index Alignment:**
   - Add index on `teacherId` across all relational entity stores.
3. **Repository Methods:**
   - Scope all `getAll()` calls to `IDBKeyRange.only(currentTeacherId)`.

---

## 5. Files Changed & Git Status

### Files Modified
- `.github/workflows/deploy-backend-heroku.yml`: Two-tier dependency audit with strict production blocking and documented dev exceptions.
- `.github/workflows/deploy-frontend-heroku.yml`: Two-tier dependency audit with strict production blocking and documented dev exceptions.
- `package.json`: Added `audit`, `audit:production`, and `audit:dev-exceptions` scripts.
- `apps/web/src/lib/offline/schema/indexeddb-core.ts`: Added `clearMemoryEntityCaches()` method.
- `apps/web/src/lib/offline/types/database.types.ts`: Added `clearMemoryEntityCaches()` and `isUserAuthorizedForOfflineData()` signatures to `IOfflineDatabase`.
- `apps/web/src/lib/offline/db.ts`: Implemented `clearMemoryEntityCaches()` and `isUserAuthorizedForOfflineData()`.
- `apps/web/src/lib/offline/bootstrap-manager.ts`: Detects `isUserSwitch` to force full snapshot and update `lastBootstrapUserId`.
- `apps/web/src/lib/offline/repositories/students.repository.ts`: Added authorization guards to `getStudentsOffline` and `getStudentByIdOffline`.
- `apps/web/src/lib/offline/repositories/groups.repository.ts`: Added authorization guards to `getGroupsOffline` and `getGroupByIdOffline`.
- `apps/web/src/lib/offline/repositories/rosters-reports.repository.ts`: Added authorization guards to `getRoster` and `getAllCachedRosters`.
- `apps/web/src/lib/offline/repositories/sessions-schedules.repository.ts`: Added authorization guards to `getSessionsOffline` and `getSchedulesOffline`.
- `apps/web/src/lib/offline/repositories/payments.repository.ts`: Added authorization guards to `getPaymentsOffline`.
- `apps/web/src/features/auth/hooks/useAuth.tsx`: Added `offlineDb.clearMemoryEntityCaches()` on logout.

### Untracked Files Added
- `apps/web/src/lib/offline/__tests__/offline-account-isolation.spec.ts`: 5 comprehensive account isolation regression tests.
- `PHASE-4A1-REPORT.md`: This comprehensive verification report.

### Unmodified Protected Files
- `apps/web/src/components/navigation/MobileBottomNav.tsx`: **Untouched** (verified via `git status`).

---

## Conclusion

Phase 4A.1 verification is complete. The CI dependency audit gate passes under an explicit, defensible vulnerability policy, and IndexedDB account isolation is verified with full test coverage and zero regression across backend and frontend suites. No commits or deployments have been made.
