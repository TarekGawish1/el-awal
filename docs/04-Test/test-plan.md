# Test Plan

## 1. Document Information

- **Document Name**: Test Plan
- **Document Type**: Quality Assurance & Testing Strategy
- **Product**: Educational Management System for Teachers and Students
- **Version**: TBD
- **Status**: Draft
- **Source of Truth**: Approved Backlog, Functional Requirements Document, Non-Functional Requirements Document, User Personas, User Scenarios, User Stories, Presentation Layer Architecture, Business Logic Architecture, and Data Layer Architecture

---

## 2. Test Plan Purpose

The purpose of this Test Plan is to establish the overall testing strategy, quality assurance approach, test levels, and governance framework for verifying that the implemented Educational Management System satisfies:
- The approved Functional Requirements and Backlog items.
- The Non-Functional Requirements.
- User Stories and product acceptance criteria.
- Confirmed Business Logic and domain concepts.
- Confirmed Architecture layer boundaries (Presentation Layer, Business Logic Layer, Data Layer).

This document defines HOW the system will be tested at a strategic level. Individual test cases will be specified separately in subsequent test documentation (`docs/04-Test/test-cases.md`).

---

## 3. Test Scope

The test scope is derived directly from the approved Product Backlog and includes the following nine modules:

1. **Student Management**:
   - Verification of Student Data (`بيانات الطالب`) handling.
   - Verification of Parent Data (`بيانات ولي الامر`) handling.
   - Verification of Student Status (`حالة الطلاب`) representation.
   - Verification of Group and Grade/Class (`المجموعة و الصف`) association.

2. **Attendance & Absence**:
   - Verification of recording student attendance (`تسجيل حضور الطلاب`).
   - Verification of recording student absence (`تسجيل الغياب`).
   - Verification of student QR code attendance scanning (`تسجيل الحضور عبر مسح QR Code`).
   - Verification of attendance and absence reporting (`تقارير الحضور و الغياب`).

3. **Lectures & Lessons**:
   - Verification of educational files, references, and summaries upload (`رفع الملفات و المراجع و الملخصات`).
   - Verification of lecture recordings upload (`رفع تسجيلات المحاضرات`).
   - Verification of content viewing tracking (`متابعة مشاهدة المحتوى`).

4. **Exams & Assignments**:
   - Verification of creating homework assignments (`انشاء الواجبات`) and exams (`انشاء الامتحانات`).
   - Verification of uploading homework assignments (`رفع الواجبات`) and exams (`رفع الامتحانات`).
   - Verification of student submissions for assignments and exams (`تسليم الواجبات و الامتحانات`).
   - Verification that submitted exams are automatically graded as required (`تصحيح الدرجات تلقائي`).
   - Verification of displaying academic results to parents (`عرض النتائج لي ولي الامر`).

5. **Parent Student Status**:
   - Verification of displaying teacher evaluations and notes (`تقييمات + ملاحظات المدرس`).
   - Verification of displaying student assignment statuses (`حالة الواجبات`).
   - Verification of displaying exam grades (`درجات الامتحانات`).
   - Verification of displaying student attendance and absence records (`الحضور و الغياب`).
   - Verification of displaying student level (`مستوى الطالب`).

6. **Notifications**:
   - Verification of 1-hour pre-lesson notification requirement (`اشعار قبل الحصة ب ساعه`).
   - Verification of unsolved homework notification requirement (`اشعار في حالة عدم حل الواجب`).
   - Verification of new exam notification requirement (`اشعار امتحان جديد`).
   - Verification of student exam grade notification requirement (`اشعار درجة امتحان الطالب`).
   - Verification of student absence notification requirement (`اشعارات في حالة غياب الطالب`).

7. **Groups Management**:
   - Verification of group creation (`انشاء مجموعة`).
   - Verification of scheduling lesson times (`تحديد مواعيد الدروس`).
   - Verification of adding students to groups (`اضافة طلاب`).

8. **Users & Permissions**:
   - Verification of representation for the four confirmed user roles: Teacher (`المدرس`), Student (`الطالب`), Parent (`ولي الامر`), and Secretariat (`السكرتارية`).

9. **Subscriptions**:
   - Verification of student payment status representation (`حالة الدفع لكل طالب`).

10. **Online Learning / Courses**:
    - Verification of course authoring and catalog publishing (`ادارة الدورات التدريبية عبر الإنترنت`).
    - Verification of structured module and lesson ordering (`هيكلة الوحدات والدروس الرقمية`).
    - Verification of student online course enrollment and access entitlement validation (`الالتحاق بالدورة وصلاحية الوصول`).
    - Verification of asynchronous video lesson streaming (Bunny Stream) and PDF downloading (`تقديم محتوى الدروس الرقمية`).
    - Verification of playback progress tracking and dynamic course completion calculation (`متابعة التقدم في الدورات الرقمية`).
    - Verification of online course auto-graded assessments (`أداء امتحان الدورة الرقمية`).
    - Verification of parent online learning monitoring (`متابعة ولي الامر للتعلم عبر الإنترنت`).
    - Verification of offline metadata caching and outbox batch progress synchronization (`المزامنة والعمل بدون اتصال للدورات الرقمية`).

---

## 4. Domain Boundary & Invariant Test Strategies

1. **Domain Boundary Isolation Testing**:
   - Verify that an online-only student holding `CourseEnrollment` is explicitly **rejected** if scanned in a physical QR attendance roll-call session (`NOT_ENROLLED_IN_GROUP`).
   - Verify that dissolving or archiving a physical `AcademicGroup` has zero effect on `Course` or `CourseEnrollment` records.
2. **Single Student Identity Testing**:
   - Verify that a single student account can hold both physical group memberships (`GroupEnrollment`) and online course enrollments (`CourseEnrollment`) simultaneously with complete data integrity.
3. **Offline Sync Idempotency & Monotonicity Testing**:
   - Verify that re-transmitting duplicate offline progress batches does not duplicate or corrupt server progress states.
   - Verify that older offline progress heartbeats cannot reverse an already-completed (`is_completed = true`) server lesson status.

---

## 5. Out of Scope

The following areas cannot currently be formally tested against detailed acceptance criteria because their specific requirements, technologies, or thresholds remain uncommitted:

- **Commercial Course Checkout & Gateway Transactions**: External credit card or mobile wallet processing (`TBD — Requires Product Clarification`).
- **Live Peer-to-Peer Video Streaming**: Interactive video conference classrooms (`Out of Scope`).

---

## 6. Testing Objectives

The primary objectives of the testing process are:
- Verify that all 10 approved product modules are implemented in accordance with functional requirements and user stories.
- Verify that user stories can be completed successfully according to their documented acceptance criteria.
- Verify that confirmed business logic (such as QR attendance 7-tier check, auto-grading, and monotonic progress sync) executes correctly.
- Verify that data interactions adhere strictly to defined architecture boundaries (Presentation Layer $\rightarrow$ Business Logic Layer $\rightarrow$ Data Layer).
- Identify and document defects early in the development lifecycle.
- Maintain bidirectional traceability from Backlog items through requirements, user stories, architecture, test cases, and defect reports.

---

## 7. Test Levels

### 7.1 Unit Testing
- **Purpose**: Verify the correctness of individual business logic functions, domain concepts, and isolated components.
- **Scope**: Core domain rules, calculations, status evaluations, and utilities.
- **Framework**: Vitest / Jest (TypeScript).

### 7.2 Integration Testing
- **Purpose**: Verify the correct interaction and data flow between architectural layers and internal components.
- **Scope**:
  - Presentation Layer $\rightarrow$ Business Logic Layer interactions.
  - Business Logic Layer $\rightarrow$ Data Layer interactions.
  - Inter-module business workflows (e.g., student exam submission and automatic grading, offline progress outbox sync).
- **Framework**: NestJS Supertest / Testcontainers.

### 7.3 System Testing
- **Purpose**: Verify end-to-end functionality of the integrated system against approved functional requirements and user stories.
- **Scope**: Complete user-facing capabilities across all 10 modules.
- **Environment**: Dedicated Test / QA Environment.

### 7.4 Acceptance Testing
- **Purpose**: Verify that the implemented system satisfies product expectations and business requirements before release.
- **Scope**: Acceptance criteria defined in Functional Requirements and User Stories.
- **Criteria**: Adherence to approved PRD and UX baselines.

---

## 7. Test Types

### 7.1 Functional Testing
- Verify all confirmed functional capabilities across the 9 modules against PRD and user stories.

### 7.2 Regression Testing
- Verify that code changes, bug fixes, or enhancements do not adversely affect existing, previously verified functionality.

### 7.3 Integration Testing
- Verify that data flows across architectural boundaries function without communication errors or data loss.

### 7.4 End-to-End Testing
- Verify complete user workflows across system capabilities where defined by User Scenarios.

### 7.5 Usability Testing
- Verify user-facing interactions against documented UX personas and scenarios.
- Usability benchmarks: `TBD — Requires Product Clarification`.

### 7.6 Performance Testing
- Evaluate system responsiveness and operational stability under load.
- Performance thresholds (response time, concurrency, throughput): `TBD — Requires Product Clarification`.

### 7.7 Security Testing
- Verify access boundaries, role separation, and data protection concepts.
- Detailed security acceptance criteria: `TBD — Requires Product Clarification / Architecture Decision`.

### 7.8 Compatibility Testing
- Verify system functionality across target client platforms, operating systems, and browsers.
- Supported platform matrix: `TBD — Requires Product Clarification`.

### 7.9 Accessibility Testing
- Verify interface accessibility for diverse user groups.
- Accessibility compliance target: `TBD — Requires Product Clarification`.

---

## 8. Test Strategy by Module

| Module | Functional Testing | Integration Testing | System/E2E Testing | Other Testing |
| :--- | :--- | :--- | :--- | :--- |
| **Student Management** | Verify student data, parent data, student status, and group/class association handling. | Verify student data flow across presentation, business, and data layers. | Verify student record handling from user interface to data layer. | Usability & Security testing. |
| **Attendance & Absence** | Verify recording attendance, recording absence, student unique QR code scanning, and attendance and absence reporting. | Verify QR scan token verification, teacher session authorization guard, attendance recording interaction with student data and reports. | Verify QR scanning check-in, manual roll-call entry, and report viewing flows. | Usability, Performance (<500ms scan), and Security testing (token anti-tampering, rate limiting, teacher session ownership). |
| **Lectures & Lessons** | Verify uploading files, references, summaries, lecture recordings, and content viewing tracking. | Verify content availability and viewing tracking integration with user records. | Verify upload and viewing tracking flows. | Performance & Compatibility testing. |
| **Exams & Assignments** | Verify assignment/exam creation, upload, submission, automatic exam grading, and parent result display. | Verify the confirmed flow between student submission and automatic exam grading. | Verify complete exam creation, student submission, automatic grading, and result display workflow. | Usability & Performance testing. |
| **Parent Student Status** | Verify displaying evaluations, notes, exam grades, student level, assignment status, and attendance. | Verify compilation of student academic data for parent-facing display. | Verify parent access to consolidated student status information. | Usability & Security testing. |
| **Notifications** | Verify notification trigger requirements (1h pre-lesson, unsolved homework, new exam, exam grade, absence). | Verify business logic notification event triggering. | Verify notification initiation flow upon trigger event occurrence. | Compatibility testing. |
| **Groups Management** | Verify group creation, lesson scheduling, and adding students to groups. | Verify group entity association with schedules and student additions. | Verify group creation, scheduling, and roster setup workflow. | Usability testing. |
| **Users & Permissions** | Verify representation of the four confirmed user roles (Teacher, Student, Parent, Secretariat). | Verify role domain representation across architectural layers. | Verify role-specific interaction interfaces. | Security & Usability testing. |
| **Subscriptions** | Verify student payment status representation. | Verify the confirmed student payment status capability across layers. | Verify viewing and handling student payment status. | Security testing. |

---

## 9. Conceptual Test Environments

The testing strategy conceptually considers the following testing environments:

1. **Development Environment**: Local or shared developer environment for unit and component-level testing.
2. **Test / QA Environment**: Dedicated environment for functional, integration, system, and regression test execution.
3. **Staging Environment**: Production-like environment for final acceptance testing and pre-release validation.
4. **Production Environment**: Live operational environment for post-release smoke verification.

*Note*: Actual environment availability, hosting infrastructure, deployment configurations, and network topology remain `TBD — Requires Architecture / Deployment Decision`.

---

## 10. Test Data Strategy

A comprehensive set of realistic, sanitized test data must be established to support testing across all domains:
- **User Roles Data**: Test accounts representing Teacher, Student, Parent, and Secretariat roles.
- **Student & Parent Data**: Conceptual profiles with varied student statuses and associated parent information.
- **Groups & Schedules Data**: Educational groups with assigned schedules and student rosters.
- **Attendance Data**: Representative attendance and absence records.
- **Educational Content Data**: Representative files, references, summaries, and lecture recordings.
- **Assessments Data**: Assignments and exams supporting automatic grading verification.
- **Submissions & Grades Data**: Student submissions and graded results.
- **Evaluations & Notes Data**: Instructor feedback notes, evaluations, and student level records.
- **Notification Data**: Test trigger conditions (upcoming lessons, absence logs, exam announcements).
- **Payment Status Data**: Representative student payment status records.

*Note*: Test data must not contain real student personal information. Test data generation tooling and procedures remain `TBD — Requires Test / Implementation Decision`.

---

## 11. Proposed Defect Management

Defects identified during testing will follow a proposed conceptual defect lifecycle:

```text
+-----------+       +------------+       +-----------+       +------------+
| Detected  | ----> |  Reported  | ----> |  Triaged  | ----> |  Assigned  |
+-----------+       +------------+       +-----------+       +------------+
                                                                    |
                                                                    v
+-----------+       +------------+                           +------------+
|  Closed   | <---- |  Retested  | <------------------------ |   Fixed    |
+-----------+       +------------+                           +------------+
                          |
                          | (Verification Failed)
                          v
                    +------------+
                    |  Reopened  |
                    +------------+
```

Defect tracking platform: `TBD — Requires Project Decision`.

---

## 12. Proposed Defect Classifications

### 12.1 Defect Severity Levels (Proposed QA Policy)
- **Critical**: System crash, severe data loss, blocking a primary product flow with no workaround.
- **High**: Major feature failure (e.g., automatic grading failure, attendance recording breakdown) with significant operational impact.
- **Medium**: Moderate functional defect or UI issue with an existing operational workaround.
- **Low**: Minor cosmetic or non-functional defect with negligible impact on system operation.

### 12.2 Defect Priority Levels (Proposed QA Policy)
- **P0**: Immediate resolution required; blocks testing or release.
- **P1**: High priority; must be resolved before current release cycle completes.
- **P2**: Normal priority; planned for resolution in regular development iterations.
- **P3**: Low priority; deferred to future release iterations.

*Note*: Defect classification policies, SLA turnaround times, and priority schemes remain `TBD — Requires QA / Project Decision`.

---

## 13. Proposed QA Entry Criteria

Formal test execution for a given test cycle may commence when:
- Requirements, user stories, and acceptance criteria for the test scope are documented and approved.
- Testable build is deployed and accessible in the target test environment.
- Test environment is configured and operational.
- Required test data sets are available.

*Note*: Operational entry criteria policies remain `TBD — Requires QA Decision`.

---

## 14. Proposed QA Exit Criteria

A test cycle is considered complete when:
- All planned test cases for the defined scope have been executed.
- All Critical (Severity: Critical / P0) defects are resolved, retested, and closed.
- High severity defects are resolved or have formal product owner sign-off with documented workarounds.
- Regression testing passes with no unexpected side effects.
- Test execution summary and defect reports are produced.

*Note*: Quantitative pass rate percentages, defect count thresholds, and formal sign-off rules remain `TBD — Requires QA / Product Decision`.

---

## 15. Regression Strategy

Regression testing is conducted to ensure that modifications do not introduce unintended side effects. Regression testing is triggered upon:
- Implementation of new product features or functional changes.
- Defect fixes impacting shared business logic or data entities.
- Pre-release candidate stabilization phases.

Regression test selection strategy (full vs. risk-based partial suite): `TBD — Requires QA Decision`.

---

## 16. Traceability Strategy

The testing process maintains bidirectional traceability across the complete engineering lifecycle:

```text
Approved Product Backlog
           |
           v
Functional Requirements / Non-Functional Requirements
           |
           v
User Stories & Scenarios
           |
           v
Architecture Capabilities & Logic Concepts
           |
           v
Test Cases (docs/04-Test/test-cases.md)
           |
           v
Test Execution Results
           |
           v
Defect Reports
```

Detailed test cases will be maintained in [test-cases.md](file:///d:/el_awal/docs/04-Test/test-cases.md).

---

## 17. Test Coverage

Test coverage ensures comprehensive verification across all confirmed product dimensions:
- **Test Planning Scope**: 100% of approved Backlog items (35 items) are included in the test planning scope.
- **Functional Requirements Coverage**: Verification of all functional requirements (`FR-STU-001` through `FR-SUB-001`).
- **User Story Coverage**: Verification of acceptance criteria for all user stories (`US-STU-001` through `US-SUB-001`).
- **Business Logic Coverage**: Verification of confirmed business concepts and automatic grading workflows.

*Note*: Quantitative test execution coverage targets (e.g., statement, branch coverage percentages) remain `TBD — Requires QA Decision`.

---

## 18. Risks & Assumptions

### 18.1 Testing Risks Caused by Undefined Requirements
- **Undefined Quantitative NFR Thresholds**: Inability to construct deterministic performance or load test criteria until thresholds are defined (`TBD — Requires Product Clarification`).
- **Undefined Security & Cryptographic Specifications**: Security testing is limited to conceptual role boundaries until security architectures are chosen (`TBD — Requires Architecture Decision`).
- **Undefined Client Compatibility Matrix**: Cross-browser and device testing scope is uncommitted until target platforms are clarified (`TBD — Requires Product Clarification`).
- **Undefined Accessibility Standard**: Accessibility testing criteria cannot be verified against explicit WCAG levels until compliance targets are established (`TBD — Requires Product Clarification`).
- **Undefined Notification Routing & Mechanisms**: End-to-end notification delivery testing is bounded until recipient rules and channels are defined (`TBD — Requires Product Clarification`).

### 18.2 General Testing Assumptions
- The approved Product Backlog (35 items) remains the single source of product scope truth.
- Test execution will occur in environments isolated from real personal student data.

---

## 19. Test Deliverables

The quality assurance lifecycle produces the following standard deliverables:
1. **Test Plan** (`docs/04-Test/test-plan.md`) — Overall quality strategy and test planning.
2. **Test Cases** (`docs/04-Test/test-cases.md`) — Granular test case specifications and steps.
3. **Test Execution Results** — Records of test runs and pass/fail outcomes.
4. **Defect Reports** — Documented defect records within the defect management system.
5. **Regression Test Summary** — Outcome of regression suites executed across builds.
6. **Release Test Summary Report** — Final quality evaluation and release readiness assessment.

---

## 20. Proposed Testing Roles & Responsibilities

| Proposed Role | Conceptual Testing Responsibilities |
| :--- | :--- |
| **Product Owner** | Clarifies requirements, defines acceptance criteria, reviews test scope, triages defect priorities, and approves release readiness. |
| **Developer** | Performs unit testing, resolves defects, supports integration test environment setup, and provides technical root-cause analysis. |
| **QA / Tester** | Designs test cases, executes functional/integration/system tests, reports defects, performs regression testing, and compiles test reports. |
| **UX / Design** | Participates in usability reviews and verifies user interface consistency against design principles. |
| **System Administrator / DevOps** | Deploys test builds, maintains test environments, and ensures test infrastructure availability. |

*Note*: Project role staffing and specific responsibility ownership remain `TBD — Requires Project Clarification`.

---

## 21. Test Tools

| Tool Category | Selected Tool | Status |
| :--- | :--- | :--- |
| **Test Management & Case Repository** | `TBD — Requires Project / QA Decision` | Uncommitted |
| **Unit & Integration Test Automation** | `TBD — Requires Project / QA Decision` | Uncommitted |
| **End-to-End Test Automation** | `TBD — Requires Project / QA Decision` | Uncommitted |
| **API Testing Tool** | `TBD — Requires Project / QA Decision` | Uncommitted |
| **Performance & Load Testing Tool** | `TBD — Requires Project / QA Decision` | Uncommitted |
| **Security Scanning Tool** | `TBD — Requires Project / QA Decision` | Uncommitted |
| **Defect Tracking & Management Platform** | `TBD — Requires Project / QA Decision` | Uncommitted |

---

## 22. Test Plan Traceability

| Source Document / Artifact | Scope / Status | Test Planning Coverage |
| :--- | :--- | :--- |
| **Approved Product Backlog** | 35 Backlog Items | Included (100% Scope Coverage) |
| **Functional Requirements Document** | `docs/01-PRD/functional-requirements.md` | Included |
| **Non-Functional Requirements Document** | `docs/01-PRD/non-functional-requirements.md` | Included |
| **User Personas** | `docs/02-UX/user-personas.md` | Included |
| **User Scenarios** | `docs/02-UX/user-scenarios.md` | Included |
| **User Stories** | `docs/02-UX/user-stories.md` | Included |
| **Presentation Layer Architecture** | `docs/03-Architecture/presentation-layer.md` | Included |
| **Business Logic Architecture** | `docs/03-Architecture/business-logic.md` | Included |
| **Data Layer Architecture** | `docs/03-Architecture/data-layer.md` | Included |
| **Database Design** | `docs/03-Architecture/database-design.md` | Included |
| **Backend Architecture** | `docs/03-Architecture/backend-architecture.md` | Included |
| **Backend Implementation Architecture** | `docs/03-Architecture/backend-implementation-architecture.md` | Included |
| **API Design Specification** | `docs/03-Architecture/api-design.md` | Included |
| **Frontend Architecture Specification** | `docs/03-Architecture/frontend-architecture.md` | Included |
| **Offline-First & Data Sync Architecture**| `docs/03-Architecture/offline-first-sync-architecture.md` | Included |
