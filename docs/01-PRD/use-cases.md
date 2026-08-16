# Use Cases Specification

## 1. Document Information

- **Document Name**: Use Cases Specification
- **Document Type**: Product Requirements / Use Case Specification
- **Product**: Educational Management System for Teachers and Students (El Awal)
- **Version**: 2.0
- **Status**: Updated Draft — Online Learning Domain Integrated
- **Source of Truth**: Approved Product Backlog, Business Requirements Document, Functional Requirements Document, Non-Functional Requirements Document, and Educational Delivery Models

---

## 2. Purpose

The purpose of this document is to specify actor-system interactions for the Educational Management System for Teachers and Students across two distinct educational delivery models: **Physical Learning** and **Online Learning**.

This document describes observable interactions between confirmed system actors and the system for each defined product capability, maintaining strict domain boundaries and traceability without introducing unconfirmed technical implementations.

---

## 3. Actor Overview

The system defines interactions for four confirmed user roles:

| Actor ID | Actor | Confirmed Role | Description / Responsibilities |
|---|---|---|---|
| **ACT-001** | Teacher / المدرس | Confirmed | Instructional user who manages physical groups, lesson schedules, educational content, assessments, attendance (via QR scanning and manual entry), evaluations, and authors/publishes online courses with structured modules and lessons. |
| **ACT-002** | Student / الطالب | Confirmed | Learner user who accesses educational materials, presents unique QR code for physical session attendance, enrolls in and consumes asynchronous online courses, tracks learning progress, and submits assignments and exams. |
| **ACT-003** | Parent / ولي الأمر | Confirmed | Guardian user who accesses student academic standing, evaluations, notes, exam grades, assignment statuses, physical attendance records, and online course progress for linked children. |
| **ACT-004** | Secretariat / السكرتارية | Confirmed | Administrative system role for student administration, physical group enrollments, online course enrollments, and payment status tracking. *(Responsibilities: `TBD — Requires Product Clarification`)* |

---

## 4. Use Case ID Convention

Use Cases are identified using the prefix `UC-<DOM>-<NNN>` where `<DOM>` represents the functional module:

- **STU**: Student Management
- **ATT**: Attendance & Absence (Physical Classroom)
- **LES**: Lectures & Lessons
- **EXM**: Exams & Assignments
- **PAR**: Parent Student Status
- **NOT**: Notifications
- **GRP**: Groups Management (Physical Classroom)
- **USR**: Users & Permissions
- **SUB**: Subscriptions / Payment Status
- **OL**: Online Learning / Courses (Asynchronous Distance Learning)

---

## 5. Use Case Specifications

### 5.1 Student Management

#### UC-STU-001 — Student Data and Group/Class Association
- **Goal**: Manage and view student profiles and academic stage/group associations.
- **Primary Actor**: Teacher / Secretariat
- **Supporting Actors**: Student
- **Preconditions**: Actor is authenticated with authorized role.
- **Main Flow**:
  1. Actor inputs student profile details and assigns grade level and academic group.
  2. System persists the student profile and associates the group enrollment.
  3. System provisions a unique, opaque QR attendance token (`qr_code_token`) for the student.
  4. System makes student details accessible on administrative rosters and student portal.
- **Postconditions**: Student profile and unique QR credential are active in the system.
- **Related Requirements**: `BR-001`, `FR-STU-002`, `FR-STU-004`, `US-STU-001`

#### UC-STU-002 — Parent Data Representation & Linkage
- **Goal**: Link parent/guardian contact profiles to one or more enrolled students.
- **Primary Actor**: Secretariat / Teacher
- **Supporting Actors**: Parent
- **Preconditions**: Student profile exists.
- **Main Flow**:
  1. Actor registers parent contact information.
  2. Actor selects target student(s) and creates parent-student linkage.
  3. System establishes verified link in `parent_student_links`.
- **Postconditions**: Parent can monitor linked students via Parent Portal.
- **Related Requirements**: `BR-001`, `FR-STU-003`, `US-STU-002`

#### UC-STU-003 — Student Status Representation
- **Goal**: View and update student academic standing status.
- **Primary Actor**: Teacher / Secretariat
- **Preconditions**: Student record exists.
- **Main Flow**:
  1. Actor views student profile and updates status (`ACTIVE`, `INACTIVE`, `SUSPENDED`).
  2. System records status update and adjusts access permissions accordingly.
- **Postconditions**: Student status is updated across physical and online views.
- **Related Requirements**: `BR-001`, `FR-STU-001`, `US-STU-003`

---

### 5.2 Attendance & Absence (Physical Learning)

#### UC-ATT-001 — Record Attendance and Absence Manually
- **Goal**: Record presence, absence, or excused state for students during a physical lesson session.
- **Primary Actor**: Teacher / Secretariat
- **Preconditions**: Physical `LessonSession` exists and actor is authorized.
- **Main Flow**:
  1. Teacher selects physical group and active session.
  2. Teacher toggles attendance state (`PRESENT`, `ABSENT`, `EXCUSED`) for students on roster.
  3. System persists attendance records with method `MANUAL`.
- **Postconditions**: Attendance records are logged and absence notifications triggered if absent.
- **Related Requirements**: `BR-003`, `FR-ATT-002`, `FR-ATT-003`, `US-ATT-001`

#### UC-ATT-002 — Generate Attendance and Absence Reports
- **Goal**: Generate aggregated attendance/absence reports for physical groups and students.
- **Primary Actor**: Teacher / Secretariat / Parent
- **Preconditions**: Historical attendance records exist.
- **Main Flow**:
  1. Actor selects target group or student and date range.
  2. System dynamically aggregates attendance counts and attendance percentage.
  3. System renders formatted report.
- **Postconditions**: Report data is displayed.
- **Related Requirements**: `BR-003`, `FR-ATT-001`, `US-ATT-002`

#### UC-ATT-003 — Student QR Code Attendance Scanning
- **Goal**: Rapidly record student physical attendance by scanning student unique QR badge.
- **Primary Actor**: Teacher
- **Supporting Actors**: Student
- **Preconditions**: Active physical `LessonSession` is managed by scanning teacher.
- **Main Flow**:
  1. Teacher opens camera scanner interface on active physical session.
  2. Student presents unique QR code from digital card.
  3. Scanner captures QR token and posts to `/sessions/:sessionId/scan-qr`.
  4. System executes 7-tier verification (teacher auth -> session state -> token lookup -> student status -> group enrollment check).
  5. If unrecorded, system atomically creates `AttendanceRecord` as `PRESENT` with method `QR_SCAN` in <500ms.
  6. Scanner displays visual/audio confirmation with student name.
- **Alternative Flow (Repeat Scan)**: If student is already marked present, system acknowledges idempotently without modifying records.
- **Exception Flow (Enrollment Mismatch / Online-Only Student)**: If student is not enrolled in the physical group (e.g. enrolled only in online courses), system displays mismatch warning and records zero attendance.
- **Postconditions**: Attendance is logged accurately.
- **Related Requirements**: `BR-003`, `FR-ATT-004`, `US-ATT-003`

---

### 5.3 Lectures & Lessons

#### UC-LES-001 — Upload Educational Files and Lecture Recordings
- **Goal**: Upload instructional documents and lecture videos for students.
- **Primary Actor**: Teacher
- **Preconditions**: Teacher is authenticated and manages target group/course.
- **Main Flow**:
  1. Teacher selects target physical group or online course lesson.
  2. Teacher uploads PDF file (via Cloudflare R2 presigned URL) or video (via Bunny Stream).
  3. System records asset metadata in `educational_content`.
- **Postconditions**: Content becomes available to authorized enrolled students.
- **Related Requirements**: `BR-004`, `FR-LES-002`, `FR-LES-003`, `US-LES-001`

#### UC-LES-002 — Track Educational Content Viewing
- **Goal**: Monitor student access and completion of educational materials.
- **Primary Actor**: Student
- **Supporting Actors**: Teacher
- **Preconditions**: Student is enrolled in group or course.
- **Main Flow**:
  1. Student accesses and views content item.
  2. System records/updates viewing progress in `content_progress`.
- **Postconditions**: Viewing metrics are updated.
- **Related Requirements**: `BR-004`, `FR-LES-001`, `US-LES-002`

---

### 5.4 Exams & Assignments

#### UC-EXM-001 — Create and Upload Assessments
- **Goal**: Author homework assignments and examinations with structured questions.
- **Primary Actor**: Teacher
- **Preconditions**: Teacher is authenticated.
- **Main Flow**:
  1. Teacher defines assessment parameters (title, type, total marks, due date).
  2. For exams, teacher adds structured multiple-choice/true-false questions with answer keys.
  3. Teacher attaches assessment to a physical group or online course lesson.
  4. System publishes assessment and dispatches new exam notifications (`FR-NOT-004`).
- **Postconditions**: Assessment is active and accessible to enrolled students.
- **Related Requirements**: `BR-005`, `FR-EXM-004..007`, `US-EXM-001`

#### UC-EXM-002 — Submit Assignment or Examination
- **Goal**: Student submits completed homework file or exam answer payload.
- **Primary Actor**: Student
- **Preconditions**: Assessment is active and student is enrolled.
- **Main Flow**:
  1. Student accesses assessment interface.
  2. Student uploads homework file or selects question answers for exam.
  3. Student confirms submission.
  4. System logs `AssessmentSubmission` with status `SUBMITTED`.
- **Postconditions**: Submission is recorded.
- **Related Requirements**: `BR-005`, `FR-EXM-003`, `US-EXM-002`

#### UC-EXM-003 — Automated Exam Grading
- **Goal**: Automatically evaluate and grade submitted student examinations.
- **Primary Actor**: System
- **Supporting Actors**: Student
- **Preconditions**: Student delivers exam submission.
- **Main Flow**:
  1. System compares each student answer against the question's `correct_answer`.
  2. System calculates points earned, marks correctness, and sums `score_obtained`.
  3. System updates submission status to `GRADED` with timestamp `graded_at`.
  4. System triggers exam grade release notification (`FR-NOT-003`).
- **Postconditions**: Exam score is immediately recorded and visible.
- **Related Requirements**: `BR-006`, `FR-EXM-002`, `US-EXM-003`

#### UC-EXM-004 — Parent View Assessment Results
- **Goal**: Parent inspects child's assignment statuses and exam scores.
- **Primary Actor**: Parent
- **Preconditions**: Parent has verified link to student.
- **Main Flow**:
  1. Parent navigates to child's assessment results view.
  2. System queries graded submissions for linked student across physical and online contexts.
  3. System displays scores, passing indicators, and teacher feedback.
- **Postconditions**: Parent views accurate academic results.
- **Related Requirements**: `BR-007`, `FR-EXM-001`, `US-EXM-004`

---

### 5.5 Parent Student Status

#### UC-PAR-001 — View Evaluations and Teacher Notes
- **Goal**: Parent reviews qualitative teacher notes and student level rating.
- **Primary Actor**: Parent
- **Preconditions**: Parent is authenticated and linked to student.
- **Main Flow**:
  1. Parent selects linked child.
  2. System retrieves teacher evaluations from `student_evaluations`.
  3. System presents chronological feedback timeline and student level indicator.
- **Postconditions**: Parent reviews qualitative feedback.
- **Related Requirements**: `BR-007`, `FR-PAR-001`, `FR-PAR-005`, `US-PAR-001`

#### UC-PAR-002 — View Complete Student Progress Summary
- **Goal**: Parent accesses consolidated summary of attendance, homework, and exam standing.
- **Primary Actor**: Parent
- **Preconditions**: Parent is authenticated and linked to student.
- **Main Flow**:
  1. Parent views student dashboard overview.
  2. System aggregates attendance percentage, pending homework count, and average exam grade.
- **Postconditions**: Consolidated summary is displayed.
- **Related Requirements**: `BR-007`, `FR-PAR-002..004`, `US-PAR-002`

---

### 5.6 Notifications

#### UC-NOT-001 — Pre-Lesson Reminder Dispatch
- **Goal**: Dispatch 1-hour advance reminder for physical lesson sessions.
- **Primary Actor**: System
- **Supporting Actors**: Student, Teacher
- **Preconditions**: Scheduled lesson starts in exactly 1 hour.
- **Main Flow**:
  1. Cron scheduler detects upcoming session.
  2. System creates `LESSON_REMINDER_1HR` notification records for enrolled students and teacher.
- **Postconditions**: Notifications are delivered.
- **Related Requirements**: `BR-008`, `FR-NOT-001`, `US-NOT-001`

#### UC-NOT-002 — Unsolved Homework Alert Dispatch
- **Goal**: Notify students and parents of incomplete assignments.
- **Primary Actor**: System
- **Supporting Actors**: Student, Parent
- **Preconditions**: Assignment deadline approaching with unsubmitted status.
- **Main Flow**:
  1. System identifies pending assignment for student.
  2. System generates `UNSOLVED_HOMEWORK` notifications.
- **Postconditions**: Alert appears in user feeds.
- **Related Requirements**: `BR-008`, `FR-NOT-002`, `US-NOT-002`

#### UC-NOT-003 — Exam Announcement and Grade Notifications
- **Goal**: Notify students and parents of published exams and finalized grades.
- **Primary Actor**: System
- **Supporting Actors**: Student, Parent
- **Preconditions**: Exam published or grading completed.
- **Main Flow**:
  1. System generates `NEW_EXAM` or `EXAM_GRADE` notification records.
- **Postconditions**: Alerts delivered.
- **Related Requirements**: `BR-008`, `FR-NOT-003`, `FR-NOT-004`, `US-NOT-003`

#### UC-NOT-004 — Student Absence Alert Dispatch
- **Goal**: Notify parents immediately when student absence is logged.
- **Primary Actor**: System
- **Supporting Actors**: Parent
- **Preconditions**: Absence recorded in physical lesson session.
- **Main Flow**:
  1. Attendance service detects `status = ABSENT`.
  2. System dispatches `STUDENT_ABSENCE` notification to linked parents.
- **Postconditions**: Parents receive absence alert.
- **Related Requirements**: `BR-008`, `FR-NOT-005`, `US-NOT-004`

---

### 5.7 Groups Management (Physical Learning)

#### UC-GRP-001 — Create Physical Group and Define Schedules
- **Goal**: Create physical educational group and configure weekly timetable.
- **Primary Actor**: Teacher / Secretariat
- **Preconditions**: Actor is authenticated.
- **Main Flow**:
  1. Actor enters group name, grade level, and weekly schedule rules.
  2. System persists `AcademicGroup` and `LessonSchedule` records.
- **Postconditions**: Group is created and available for student allocation.
- **Related Requirements**: `BR-002`, `FR-GRP-001`, `FR-GRP-003`, `US-GRP-001`

#### UC-GRP-002 — Add Students to Physical Group
- **Goal**: Enroll students into a physical classroom group.
- **Primary Actor**: Teacher / Secretariat
- **Preconditions**: Group and student records exist.
- **Main Flow**:
  1. Actor selects group and target student(s).
  2. System creates `GroupEnrollment` records.
- **Postconditions**: Students appear on physical roster and roll-call check-in.
- **Related Requirements**: `BR-002`, `FR-GRP-002`, `US-GRP-002`

---

### 5.8 Users & Permissions

#### UC-USR-001 — Authenticate and Enforce Role Boundaries
- **Goal**: Authenticate user and enforce RBAC and ownership boundaries.
- **Primary Actor**: All Roles
- **Preconditions**: User credentials provided.
- **Main Flow**:
  1. User authenticates; system verifies credentials and issues JWT token with role claims.
  2. Subsequent requests are intercepted by `JwtAuthGuard`, `RolesGuard`, and `ResourceOwnershipGuard`.
- **Postconditions**: Authenticated session established with verified permissions.
- **Related Requirements**: `BR-009`, `FR-USR-001..004`, `US-USR-001`

---

### 5.9 Subscriptions / Payment Status

#### UC-SUB-001 — Track and View Student Payment Status
- **Goal**: Record and review student fee payment status per billing cycle.
- **Primary Actor**: Secretariat / Teacher
- **Preconditions**: Student profile exists.
- **Main Flow**:
  1. Staff member opens student payment tracking view.
  2. Staff member logs payment status descriptor and administrative notes.
  3. System records update in `student_payment_records`.
- **Postconditions**: Payment status is updated and auditable.
- **Related Requirements**: `BR-010`, `FR-SUB-001`, `US-SUB-001`

---

### 5.10 Online Learning (Courses)

#### UC-OL-001 — Create and Publish Online Course
- **Goal**: Teacher authors, structures, and publishes an independent online educational course.
- **Primary Actor**: Teacher
- **Supporting Actors**: Secretariat
- **Preconditions**: Teacher is authenticated with role `TEACHER`.
- **Main Flow**:
  1. Teacher enters course title, description, subject category, and grade level.
  2. Teacher creates structured course modules (`CourseModule`) in desired order.
  3. Teacher adds lessons (`CourseLesson`) under modules, attaching streaming video IDs (Bunny Stream) and PDF summaries/files (Cloudflare R2).
  4. Teacher attaches online homework assignments or auto-graded exams.
  5. Teacher updates course status from `DRAFT` to `PUBLISHED`.
- **Postconditions**: Course is live in the Course Catalog for student discovery and enrollment.
- **Related Requirements**: `BR-OL-001`, `FR-OL-001`, `FR-OL-002`, `US-OL-001`

#### UC-OL-002 — Enroll in Online Course & Verify Access Entitlement
- **Goal**: Student enrolls in an online course and system validates entitlement.
- **Primary Actor**: Student
- **Supporting Actors**: Secretariat / Teacher
- **Preconditions**: Course is `PUBLISHED` and student is authenticated.
- **Main Flow**:
  1. Student browses catalog and selects course.
  2. Student requests enrollment.
  3. System creates `CourseEnrollment` record and activates `CourseAccess` (`status = ACTIVE`).
  4. System grants access to course outline and lesson materials.
- **Alternative Flow (Access Revoked/Expired)**: If `CourseAccess` is `EXPIRED` or `SUSPENDED`, requests for lesson streams are rejected with `403 Forbidden`.
- **Domain Boundary Rule**: Course enrollment does NOT create a physical `GroupEnrollment` and does NOT permit physical QR attendance check-in.
- **Postconditions**: Student is enrolled with active access entitlement.
- **Related Requirements**: `BR-OL-002`, `FR-OL-003`, `US-OL-002`

#### UC-OL-003 — Consume Course Lesson & Track Progress
- **Goal**: Student streams video lesson, reads documents, and system records playback progress.
- **Primary Actor**: Student
- **Preconditions**: Student has active `CourseAccess` for the course.
- **Main Flow**:
  1. Student selects a lesson from the course outline.
  2. System returns lesson metadata and signed Bunny Stream video playback token.
  3. Video player streams lesson and periodically sends progress heartbeats (e.g. current playback position in seconds).
  4. When viewing threshold is reached, system sets `is_completed = true` in `course_progress` and updates overall course completion percentage.
- **Postconditions**: Lesson progress and course completion metrics are persisted.
- **Related Requirements**: `BR-OL-003`, `BR-OL-004`, `FR-OL-004`, `FR-OL-005`, `US-OL-003`, `US-OL-004`

#### UC-OL-004 — Take Online Course Assessment & Submit
- **Goal**: Student completes online homework or auto-graded exam attached to course.
- **Primary Actor**: Student
- **Supporting Actors**: System
- **Preconditions**: Student has active `CourseAccess`.
- **Main Flow**:
  1. Student opens online assignment or exam from the course lesson viewer.
  2. Student answers structured questions and submits.
  3. System records `AssessmentSubmission` and automatically grades exams synchronously.
  4. Awarded score and question feedback are displayed to student.
- **Postconditions**: Assessment submission is recorded and graded.
- **Related Requirements**: `BR-OL-005`, `FR-OL-006`, `US-OL-006`

#### UC-OL-005 — View Child's Online Course Progress (Parent)
- **Goal**: Parent monitors linked child's enrolled online courses, completion rate, and grades.
- **Primary Actor**: Parent
- **Preconditions**: Parent has verified `ParentStudentLink`.
- **Main Flow**:
  1. Parent selects linked child and navigates to Online Learning tab.
  2. System queries enrolled courses, module progress bars, completed lesson counts, and online exam scores for the child.
  3. System renders read-only online course overview.
- **Postconditions**: Parent views transparent progress metrics.
- **Related Requirements**: `BR-007`, `BR-OL-004`, `FR-OL-007`, `US-OL-007`

#### UC-OL-006 — Offline Course Consumption & Reconnection Sync
- **Goal**: Student browses cached course outline offline and syncs progress upon reconnecting.
- **Primary Actor**: Student
- **Supporting Actors**: System
- **Preconditions**: Course metadata was previously cached locally.
- **Main Flow**:
  1. Network connectivity drops while student is learning.
  2. Client switches to offline mode using local cached course and lesson metadata.
  3. Student completes lesson reading/interaction; progress heartbeat is queued in local outbox with client-generated operation UUID.
  4. Network connectivity is restored.
  5. Client background sync worker flushes pending outbox operations to `/api/v1/sync/progress`.
  6. Server processes events idempotently and acknowledges sync.
- **Postconditions**: Local outbox is cleared and server progress is updated.
- **Related Requirements**: `BR-OL-004`, `FR-OL-008`, `US-OL-005`

---

## 6. Use Cases Traceability Matrix

| Use Case ID | Use Case Name | Primary Actor | Related BR | Related FR | Related PRD |
|---|---|---|---|---|---|
| `UC-STU-001` | Student Data and Group/Class Association | Teacher, Admin | `BR-001` | `FR-STU-002`, `FR-STU-004` | `PRD-001` |
| `UC-STU-002` | Parent Data Representation & Linkage | Admin, Teacher | `BR-001` | `FR-STU-003` | `PRD-001` |
| `UC-STU-003` | Student Status Representation | Teacher, Admin | `BR-001` | `FR-STU-001` | `PRD-001` |
| `UC-ATT-001` | Record Attendance and Absence Manually | Teacher | `BR-003` | `FR-ATT-002`, `FR-ATT-003` | `PRD-003` |
| `UC-ATT-002` | Generate Attendance and Absence Reports | All Roles | `BR-003` | `FR-ATT-001` | `PRD-003` |
| `UC-ATT-003` | Student QR Code Attendance Scanning | Teacher, Student | `BR-003` | `FR-ATT-004` | `PRD-003` |
| `UC-LES-001` | Upload Files & Lecture Recordings | Teacher | `BR-004` | `FR-LES-002`, `FR-LES-003` | `PRD-004` |
| `UC-LES-002` | Track Educational Content Viewing | Student | `BR-004` | `FR-LES-001` | `PRD-004` |
| `UC-EXM-001` | Create and Upload Assessments | Teacher | `BR-005` | `FR-EXM-004..007` | `PRD-005` |
| `UC-EXM-002` | Submit Assignment or Examination | Student | `BR-005` | `FR-EXM-003` | `PRD-005` |
| `UC-EXM-003` | Automated Exam Grading | System | `BR-006` | `FR-EXM-002` | `PRD-006` |
| `UC-EXM-004` | Parent View Assessment Results | Parent | `BR-007` | `FR-EXM-001` | `PRD-007` |
| `UC-PAR-001` | View Evaluations and Teacher Notes | Parent | `BR-007` | `FR-PAR-001`, `FR-PAR-005` | `PRD-007` |
| `UC-PAR-002` | View Complete Student Progress Summary | Parent | `BR-007` | `FR-PAR-002..004` | `PRD-007` |
| `UC-NOT-001` | Pre-Lesson Reminder Dispatch | System | `BR-008` | `FR-NOT-001` | `PRD-008` |
| `UC-NOT-002` | Unsolved Homework Alert Dispatch | System | `BR-008` | `FR-NOT-002` | `PRD-008` |
| `UC-NOT-003` | Exam Announcement & Grade Notifications| System | `BR-008` | `FR-NOT-003`, `FR-NOT-004` | `PRD-008` |
| `UC-NOT-004` | Student Absence Alert Dispatch | System | `BR-008` | `FR-NOT-005` | `PRD-008` |
| `UC-GRP-001` | Create Physical Group & Define Schedules| Teacher | `BR-002` | `FR-GRP-001`, `FR-GRP-003` | `PRD-002` |
| `UC-GRP-002` | Add Students to Physical Group | Teacher | `BR-002` | `FR-GRP-002` | `PRD-002` |
| `UC-USR-001` | Authenticate & Enforce Role Boundaries | All Roles | `BR-009` | `FR-USR-001..004` | `PRD-009` |
| `UC-SUB-001` | Track & View Student Payment Status | Secretariat | `BR-010` | `FR-SUB-001` | `PRD-010` |
| `UC-OL-001` | Create and Publish Online Course | Teacher | `BR-OL-001` | `FR-OL-001`, `FR-OL-002` | `PRD-OL-001` |
| `UC-OL-002` | Enroll in Online Course & Verify Access | Student | `BR-OL-002` | `FR-OL-003` | `PRD-OL-002` |
| `UC-OL-003` | Consume Course Lesson & Track Progress | Student | `BR-OL-003..004` | `FR-OL-004`, `FR-OL-005` | `PRD-OL-003..004` |
| `UC-OL-004` | Take Online Course Assessment & Submit | Student | `BR-OL-005` | `FR-OL-006` | `PRD-OL-005` |
| `UC-OL-005` | View Child's Online Course Progress | Parent | `BR-007`, `BR-OL-004` | `FR-OL-007` | `PRD-OL-006` |
| `UC-OL-006` | Offline Course Consumption & Sync | Student, System | `BR-OL-004` | `FR-OL-008` | `PRD-OL-007` |
