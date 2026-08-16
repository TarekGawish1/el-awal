# Presentation Layer Architecture

## 1. Document Information

- **Document Name**: Presentation Layer Architecture
- **Document Type**: Architecture Documentation
- **Product**: Educational Management System for Teachers and Students
- **Version**: TBD
- **Status**: Draft
- **Source of Truth**: Approved Backlog, Functional Requirements Document, Non-Functional Requirements Document, User Personas, User Scenarios, and User Stories

---

## 2. Purpose

This document defines the conceptual responsibilities, user-facing capabilities, structural boundaries, and interface requirements of the Presentation Layer for the educational management system. It establishes the architectural representation of user interaction and data presentation without selecting specific technologies, frameworks, libraries, or implementation details.

---

## 3. Presentation Layer Responsibilities

At a conceptual level, the Presentation Layer is responsible for providing the interface through which users interact with the system and receive information. Based strictly on the approved product scope, the Presentation Layer supports user-facing capabilities across the nine product modules:

1. **Student Management**: Presenting student data, parent data, student status, and group/class associations.
2. **Attendance & Absence**: Capturing attendance and absence entries and presenting attendance and absence reports.
3. **Lectures & Lessons**: Uploading files, references, summaries, and lecture recordings, making materials available, and displaying content viewing information.
4. **Exams & Assignments**: Creating and uploading exams/assignments, submitting assignments and exams, presenting automated grading results, and displaying academic results to parents.
5. **Parent Student Status**: Presenting teacher evaluations, notes, exam grades, student level, assignment status, and attendance/absence records to parents.
6. **Notifications**: Presenting notifications for lesson schedule reminders, unsolved homework alerts, new exam announcements, exam grades, and student absences.
7. **Groups Management**: Creating groups, scheduling lesson times, and adding students to groups.
8. **Users & Permissions**: Representing the four confirmed user roles within the system interface.
9. **Subscriptions**: Presenting the payment status for each student.

---

## 4. User Role Presentation

The system accommodates four confirmed user roles explicitly identified in the product backlog and UX documentation:

### 4.1 Teacher / المدرس (`UX-PER-001`)
- **Presentation Scope**: User-facing interfaces for interacting with group creation, student management, lesson scheduling, content uploading (recordings, files, summaries, references), exam and assignment creation/upload, attendance/absence recording, attendance reports, student evaluations and notes, and content viewing tracking.
- **Role Permissions & Access Control**: `TBD — Requires Architecture Decision`

### 4.2 Student / الطالب (`UX-PER-002`)
- **Presentation Scope**: User-facing interfaces for accessing educational materials (lecture recordings, files, references, summaries), submitting assignments and exams, and viewing student-related information (grades, level, and designated notifications).
- **Role Permissions & Access Control**: `TBD — Requires Architecture Decision`

### 4.3 Parent / ولي الأمر (`UX-PER-003`)
- **Presentation Scope**: User-facing interfaces for viewing student results, exam grades, teacher evaluations and notes, assignment statuses, attendance/absence records, student level, and receiving student-related notifications.
- **Access Method & Delivery Medium**: `TBD — Requires Architecture Decision`

### 4.4 Secretariat / السكرتارية (`UX-PER-004`)
- **Presentation Scope**: The role is confirmed in the product backlog; specific user interfaces and administrative presentation views remain undefined.
- **Presentation Responsibilities & Access**: `TBD — Requires Architecture Decision`

---

## 5. Presentation Capabilities

### 5.1 Student Management

#### Capability ID: PL-STU-001
- **Capability Name**: Student Data and Group/Class Association Presentation
- **Related User Story**: `US-STU-001`
- **Presentation Responsibility**: Present student data and associated group and grade/class information.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-STU-002
- **Capability Name**: Parent Data Presentation
- **Related User Story**: `US-STU-002`
- **Presentation Responsibility**: Present parent data associated with students.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-STU-003
- **Capability Name**: Student Status Presentation
- **Related User Story**: `US-STU-003`
- **Presentation Responsibility**: Present student status information.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

---

### 5.2 Attendance & Absence

#### Capability ID: PL-ATT-001
- **Capability Name**: Student Attendance and Absence Recording Interface
- **Related User Story**: `US-ATT-001`
- **Presentation Responsibility**: Provide user interface capability for recording student attendance and absence entries.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-ATT-002
- **Capability Name**: Attendance and Absence Reports Presentation
- **Related User Story**: `US-ATT-002`
- **Presentation Responsibility**: Present attendance and absence reports.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-ATT-003
- **Capability Name**: Student QR Code Attendance Scanning & Display Interface
- **Related User Story**: `US-ATT-003`
- **Presentation Responsibility**:
  1. Provide camera-based QR scanning viewfinder with optical decode for teachers during lesson sessions.
  2. Display unique QR code pass and digital student card within the student portal.
  3. Render immediate visual and audio confirmation upon successful attendance verification.
- **Inputs**: Device camera feed, student QR token payload.
- **Outputs**: Verified attendance status badge, real-time session roster increment, scan error/mismatch banners.

---

### 5.3 Lectures & Lessons

#### Capability ID: PL-LES-001
- **Capability Name**: Educational Content and Lecture Recordings Upload Interface
- **Related User Story**: `US-LES-001`
- **Presentation Responsibility**: Provide user interface capability for uploading educational files, references, summaries, and lecture recordings, and displaying available materials.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-LES-002
- **Capability Name**: Content Viewing Information Presentation
- **Related User Story**: `US-LES-002`
- **Presentation Responsibility**: Present content viewing tracking information to relevant users.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

---

### 5.4 Exams & Assignments

#### Capability ID: PL-EXM-001
- **Capability Name**: Exam and Assignment Creation and Upload Interface
- **Related User Story**: `US-EXM-001`
- **Presentation Responsibility**: Provide user interface capability for creating and uploading homework assignments and examinations.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-EXM-002
- **Capability Name**: Assignment and Exam Submission Interface
- **Related User Story**: `US-EXM-002`
- **Presentation Responsibility**: Provide user interface capability for submitting completed assignments and exams.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-EXM-003
- **Capability Name**: Automatic Exam Grading Presentation
- **Related User Story**: `US-EXM-003`
- **Presentation Responsibility**: Present the outcome of automatic exam grading.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-EXM-004
- **Capability Name**: Student Results Presentation for Parent
- **Related User Story**: `US-EXM-004`
- **Presentation Responsibility**: Present student results to parents.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

---

### 5.5 Parent Student Status

#### Capability ID: PL-PAR-001
- **Capability Name**: Teacher Evaluations, Notes, Exam Grades, and Student Level Presentation
- **Related User Story**: `US-PAR-001`
- **Presentation Responsibility**: Present teacher evaluations, notes, exam grades, and student level to parents.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-PAR-002
- **Capability Name**: Assignment Status and Attendance Records Presentation
- **Related User Story**: `US-PAR-002`
- **Presentation Responsibility**: Present student assignment status and attendance/absence records to parents.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

---

### 5.6 Notifications & WhatsApp

#### Capability ID: PL-NOT-001
- **Capability Name**: Lesson Reminder Notification Presentation
- **Related User Story**: `US-NOT-001`
- **Presentation Responsibility**: Present notifications sent one hour before scheduled lessons.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-NOT-002
- **Capability Name**: Unsolved Homework Notification Presentation
- **Related User Story**: `US-NOT-002`
- **Presentation Responsibility**: Present notifications for unsolved homework assignments.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-NOT-003
- **Capability Name**: Exam Announcement and Grade Notification Presentation
- **Related User Story**: `US-NOT-003`
- **Presentation Responsibility**: Present notifications for new exams and recorded exam grades.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-NOT-004
- **Capability Name**: Student Absence Notification Presentation
- **Related User Story**: `US-NOT-004`
- **Presentation Responsibility**: Present student absence notifications.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

---

### 5.7 Groups Management

#### Capability ID: PL-GRP-001
- **Capability Name**: Group Creation and Lesson Scheduling Interface
- **Related User Story**: `US-GRP-001`
- **Presentation Responsibility**: Provide user interface capability for creating educational groups and scheduling lesson times.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

#### Capability ID: PL-GRP-002
- **Capability Name**: Adding Students to Groups Interface
- **Related User Story**: `US-GRP-002`
- **Presentation Responsibility**: Provide user interface capability for adding students to specified groups.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

---

### 5.8 Users & Permissions

#### Capability ID: PL-USR-001
- **Capability Name**: System Role Interface Representation
- **Related User Story**: `US-USR-001`
- **Presentation Responsibility**: Represent the four confirmed user roles within the system interface.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

---

### 5.9 Subscriptions

#### Capability ID: PL-SUB-001
- **Capability Name**: Student Payment Status Presentation
- **Related User Story**: `US-SUB-001`
- **Presentation Responsibility**: Present payment status information for each student.
- **Inputs**: `TBD — Requires Architecture Decision`
- **Outputs**: `TBD — Requires Architecture Decision`

---

### 5.10 Online Learning Presentation Capabilities

#### Capability ID: PL-OL-001 — Online Course Catalog & Discovery View
- **Related User Story**: `US-OL-002`
- **Presentation Responsibility**: Present discoverable cards for published online courses with filtering by subject and grade level.

#### Capability ID: PL-OL-002 — Teacher Course Curriculum Builder Interface
- **Related User Story**: `US-OL-001`
- **Presentation Responsibility**: Provide an interactive tree builder for organizing modules, ordering lessons, and attaching media resources.

#### Capability ID: PL-OL-003 — Course Player & Video Lesson Viewer Interface
- **Related User Story**: `US-OL-003`, `US-OL-004`
- **Presentation Responsibility**: Render responsive widescreen video player (Bunny Stream), downloadable PDF summary tabs, and auto-resuming playback position.

#### Capability ID: PL-OL-004 — Course Progress & Metric Indicator
- **Related User Story**: `US-OL-004`
- **Presentation Responsibility**: Present visual completion progress bars, completed lesson badges, and overall percentage metrics.

#### Capability ID: PL-OL-005 — Online Assessment & Quiz Runner Interface
- **Related User Story**: `US-OL-006`
- **Presentation Responsibility**: Deliver focused test-taking interface with countdown timer, question pagination, answer submission, and immediate score reveal.

#### Capability ID: PL-OL-006 — Parent Online Course Progress Review View
- **Related User Story**: `US-OL-007`
- **Presentation Responsibility**: Render a dedicated guardian tab summarizing child's enrolled courses, lesson completion rates, and digital exam scores.

#### Capability ID: PL-OL-007 — Offline Status Indicator & Sync Outbox Badge
- **Related User Story**: `US-OL-005`
- **Presentation Responsibility**: Display contextual offline mode banner when network disconnects and animated sync pulse when pending outbox operations flush to server.

---

## 6. Presentation Layer Boundaries

### 6.1 Presentation Layer SHOULD Handle:
- Presenting user interfaces and visual representations across all 10 approved modules.
- Displaying product information, academic records, video streams, and media content.
- Collecting user inputs (including camera viewfinder for QR roll-call and offline lesson completion events).
- Presenting outcomes returned by the server application layer.

### 6.2 Presentation Layer SHOULD NOT Handle:
- Direct database access or persistence operations.
- Execution of server-authoritative business rules, course entitlements, or grading algorithms.
- Issuing signed video playback tokens directly (delegated to backend API).

---

## 7. Presentation State

- **Student Status**: Representation of active/inactive learner status.
- **Course Access State**: Representation of `ACTIVE`, `EXPIRED`, `SUSPENDED` entitlement.
- **Lesson Playback State**: Current video playback position, completed checkmarks, and overall course percentage.
- **Offline Sync State**: Online vs. Offline mode, count of pending outbox operations.
- **Attendance State**: Physical session presence logs (Present / Absent / Excused).
- **Exam State**: Graded results, unanswered questions, time remaining.

---

## 8. Presentation-to-System Interaction

```text
+-------------------------------------------------------+
|                  Presentation Layer                   |
| (Next.js React UI, Bunny Stream Player, Scanner Feed) |
+-------------------------------------------------------+
                           |
                           v HTTPS REST API (/api/v1)
+-------------------------------------------------------+
|             Business Logic / Application Layer        |
|  (NestJS Controllers, Services, QR Pipeline, Sync)    |
+-------------------------------------------------------+
                           |
                           v Prisma ORM / S3 / API
+-------------------------------------------------------+
|                      Data Layer                       |
|   (PostgreSQL Server Database ↕ Cloudflare R2 / Bunny)|
+-------------------------------------------------------+
```

---

## 9. Traceability

| User Story | Presentation Capability | Architecture Status |
| :--- | :--- | :--- |
| `US-STU-001` | `PL-STU-001` — Student Data and Group/Class Association Presentation | Defined |
| `US-STU-002` | `PL-STU-002` — Parent Data Presentation | Defined |
| `US-STU-003` | `PL-STU-003` — Student Status Presentation | Defined |
| `US-ATT-001` | `PL-ATT-001` — Student Attendance and Absence Recording Interface | Defined |
| `US-ATT-002` | `PL-ATT-002` — Attendance and Absence Reports Presentation | Defined |
| `US-ATT-003` | `PL-ATT-003` — Student QR Code Attendance Scanning & Display Interface | Defined |
| `US-LES-001` | `PL-LES-001` — Educational Content and Lecture Recordings Upload Interface | Defined |
| `US-LES-002` | `PL-LES-002` — Content Viewing Information Presentation | Defined |
| `US-EXM-001` | `PL-EXM-001` — Exam and Assignment Creation and Upload Interface | Defined |
| `US-EXM-002` | `PL-EXM-002` — Assignment and Exam Submission Interface | Defined |
| `US-EXM-003` | `PL-EXM-003` — Automatic Exam Grading Presentation | Defined |
| `US-EXM-004` | `PL-EXM-004` — Student Results Presentation for Parent | Defined |
| `US-PAR-001` | `PL-PAR-001` — Teacher Evaluations, Notes, Exam Grades, and Student Level Presentation | Defined |
| `US-PAR-002` | `PL-PAR-002` — Assignment Status and Attendance Records Presentation | Defined |
| `US-NOT-001` | `PL-NOT-001` — Lesson Reminder Notification Presentation | Defined |
| `US-NOT-002` | `PL-NOT-002` — Unsolved Homework Notification Presentation | Defined |
| `US-NOT-003` | `PL-NOT-003` — Exam Announcement and Grade Notification Presentation | Defined |
| `US-NOT-004` | `PL-NOT-004` — Student Absence Notification Presentation | Defined |
| `US-GRP-001` | `PL-GRP-001` — Group Creation and Lesson Scheduling Interface | Defined |
| `US-GRP-002` | `PL-GRP-002` — Adding Students to Groups Interface | Defined |
| `US-USR-001` | `PL-USR-001` — System Role Interface Representation | Defined |
| `US-SUB-001` | `PL-SUB-001` — Student Payment Status Presentation | Defined |
| `US-OL-001` | `PL-OL-002` — Teacher Course Curriculum Builder Interface | Defined |
| `US-OL-002` | `PL-OL-001` — Online Course Catalog & Discovery View | Defined |
| `US-OL-003` | `PL-OL-003` — Course Player & Video Lesson Viewer Interface | Defined |
| `US-OL-004` | `PL-OL-004` — Course Progress & Metric Indicator | Defined |
| `US-OL-005` | `PL-OL-007` — Offline Status Indicator & Sync Outbox Badge | Defined |
| `US-OL-006` | `PL-OL-005` — Online Assessment & Quiz Runner Interface | Defined |
| `US-OL-007` | `PL-OL-006` — Parent Online Course Progress Review View | Defined |

---

## 10. Open Architecture Decisions

1. **`TBD — Commercial Checkout UI Flow`**: Payment checkout modal and payment receipt presentation deferred until payment provider is selected.
2. **`TBD — Offline Video Caching Mechanism`**: Determination of whether local service worker chunk caching is enabled for web browsers.

