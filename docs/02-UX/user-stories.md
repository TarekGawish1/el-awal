# User Stories

## 1. Document Information

- **Document Name**: User Stories
- **Document Type**: UX Documentation
- **Product**: Educational Management System for Teachers and Students (El Awal)
- **Version**: 2.0
- **Status**: Updated Draft — Online Learning Domain Integrated
- **Source of Truth**: Approved Backlog, Functional Requirements Document, Non-Functional Requirements Document, User Personas, and User Scenarios

---

## 2. Purpose

This document translates the approved product functionality into user stories describing user-facing capabilities across both **Physical Learning** and **Online Learning** delivery models. Each story adheres to standard agile user story conventions and maintains strict traceability.

---

## 3. User Story Structure

- **Story ID**: Unique identifier (`US-[DOM]-[NNN]`).
- **Story Name**: Descriptive feature name.
- **Actor**: Specific confirmed persona.
- **User Story**: Standard format: `As a [Actor], I want [Capability], so that [Goal]`.
- **Acceptance Criteria**: Given / When / Then criteria.
- **Related Scenario**: Associated Scenario ID from `user-scenarios.md`.
- **Related Requirements**: Associated PRD and FR IDs.

---

## 4. User Stories

### 4.1 Student Management

#### Story ID: US-STU-001 — Student Data and Group/Class Association
- **Actor**: Teacher / Secretariat
- **User Story**:
  > As an administrative staff member or teacher, I want to create and manage student profiles and assign them to academic grade levels and cohorts, so that student demographic and grouping records are maintained centrally.
- **Acceptance Criteria**:
  - **Given**: Valid student profile data.
  - **When**: The user creates or updates the student record.
  - **Then**: The student profile, grade level, and unique QR attendance credential are persisted.
- **Related Scenario**: `SC-STU-001` | **Related Requirements**: `PRD-001`, `FR-STU-002`, `FR-STU-004`

#### Story ID: US-STU-002 — Parent Data Representation & Linkage
- **Actor**: Secretariat / Teacher
- **User Story**:
  > As an administrative staff member, I want to register parent contact details and link them to students, so that guardians can monitor their children's progress.
- **Acceptance Criteria**:
  - **Given**: Parent profile details and target student ID(s).
  - **When**: The user links the parent to the student(s).
  - **Then**: Verified parent-student relationships are established.
- **Related Scenario**: `SC-STU-002` | **Related Requirements**: `PRD-001`, `FR-STU-003`

#### Story ID: US-STU-003 — Student Status Representation
- **Actor**: Teacher / Secretariat
- **User Story**:
  > As an administrative staff member or teacher, I want to update student standing (Active, Inactive, Suspended), so that access permissions are governed accurately.
- **Acceptance Criteria**:
  - **Given**: An existing student profile.
  - **When**: The user modifies the academic status.
  - **Then**: The updated status is reflected across physical rosters and online course access.
- **Related Scenario**: `SC-STU-003` | **Related Requirements**: `PRD-001`, `FR-STU-001`

---

### 4.2 Attendance & Absence (Physical Learning)

#### Story ID: US-ATT-001 — Recording Student Attendance and Absence Manually
- **Actor**: Teacher / Secretariat
- **User Story**:
  > As a teacher, I want to manually record attendance or absence for students in a session, so that physical classroom attendance records are kept up to date.
- **Acceptance Criteria**:
  - **Given**: An active physical lesson session.
  - **When**: The teacher toggles attendance states on the roster.
  - **Then**: Attendance records are persisted with method `MANUAL`.
- **Related Scenario**: `SC-ATT-001` | **Related Requirements**: `PRD-003`, `FR-ATT-002`, `FR-ATT-003`

#### Story ID: US-ATT-002 — Attendance and Absence Reports
- **Actor**: Teacher / Secretariat / Parent
- **User Story**:
  > As a teacher, administrator, or parent, I want to generate attendance and absence reports, so that student attendance trends can be evaluated over time.
- **Acceptance Criteria**:
  - **Given**: Recorded attendance history.
  - **When**: The user requests a report for a group or student.
  - **Then**: Aggregated attendance counts and percentages are displayed.
- **Related Scenario**: `SC-ATT-002` | **Related Requirements**: `PRD-003`, `FR-ATT-001`

#### Story ID: US-ATT-003 — Student QR Code Attendance Scanning
- **Actor**: Teacher (Primary), Student (Supporting)
- **User Story**:
  > As a teacher, I want to scan a student's unique QR code badge with my device camera during class roll-call, so that student attendance is verified and logged in <500ms without manual searching.
- **Acceptance Criteria**:
  - **Given**: An active physical session and a student presenting a valid QR badge.
  - **When**: The teacher scans the QR code.
  - **Then**: System validates teacher session ownership, resolves student identity, verifies physical group enrollment, and creates `AttendanceRecord` as `PRESENT` with method `QR_SCAN`.
  - **And**: Repeat scans are handled idempotently; online-only students receive an enrollment mismatch alert without logging attendance.
- **Related Scenario**: `SC-ATT-003` | **Related Requirements**: `PRD-003`, `FR-ATT-004`

---

### 4.3 Lectures & Lessons

#### Story ID: US-LES-001 — Uploading Educational Content and Lecture Recordings
- **Actor**: Teacher
- **User Story**:
  > As a teacher, I want to upload PDF summaries, references, and video lecture recordings, so that students can review learning materials digitally.
- **Acceptance Criteria**:
  - **Given**: Educational documents or lecture video files.
  - **When**: The teacher uploads files to object storage (Cloudflare R2) and video streaming cloud (Bunny Stream).
  - **Then**: Content is attached to the group or course and made accessible to students.
- **Related Scenario**: `SC-LES-001` | **Related Requirements**: `PRD-004`, `FR-LES-002`, `FR-LES-003`

#### Story ID: US-LES-002 — Monitoring Content Viewing
- **Actor**: Student, Teacher
- **User Story**:
  > As a student and teacher, I want content viewing progress to be tracked, so that learning engagement is visible.
- **Acceptance Criteria**:
  - **Given**: Uploaded content accessed by a student.
  - **When**: The student views the material.
  - **Then**: Viewing timestamps, view counts, and completion flags are recorded.
- **Related Scenario**: `SC-LES-002` | **Related Requirements**: `PRD-004`, `FR-LES-001`

---

### 4.4 Exams & Assignments

#### Story ID: US-EXM-001 — Creating and Uploading Exams and Assignments
- **Actor**: Teacher
- **User Story**:
  > As a teacher, I want to author homework assignments and create auto-graded exams with structured questions, so that I can evaluate student comprehension.
- **Acceptance Criteria**:
  - **Given**: Assessment parameters and questions.
  - **When**: The teacher authors and publishes the assessment.
  - **Then**: Assignments and auto-graded exams are distributed to students.
- **Related Scenario**: `SC-EXM-001` | **Related Requirements**: `PRD-005`, `FR-EXM-004..007`

#### Story ID: US-EXM-002 — Submitting Assignments and Exams
- **Actor**: Student
- **User Story**:
  > As a student, I want to submit my completed homework files and exam answers online, so that my work can be evaluated.
- **Acceptance Criteria**:
  - **Given**: An active assessment.
  - **When**: The student uploads files or answers questions and submits.
  - **Then**: The submission is recorded with timestamp.
- **Related Scenario**: `SC-EXM-002` | **Related Requirements**: `PRD-005`, `FR-EXM-003`

#### Story ID: US-EXM-003 — Automatic Grading of Exams
- **Actor**: System (Primary), Student (Supporting)
- **User Story**:
  > As a student and teacher, I want exam submissions to be graded automatically and synchronously, so that test scores are available immediately.
- **Acceptance Criteria**:
  - **Given**: A delivered exam submission.
  - **When**: The system processes the student answers against the answer key.
  - **Then**: Question correctness is evaluated, total score computed, and grade released.
- **Related Scenario**: `SC-EXM-003` | **Related Requirements**: `PRD-006`, `FR-EXM-002`

#### Story ID: US-EXM-004 — Displaying Results to Parent
- **Actor**: Parent
- **User Story**:
  > As a parent, I want to view my child's graded exam scores and homework completion statuses, so that I can stay informed of their academic standing.
- **Acceptance Criteria**:
  - **Given**: Graded assessments for a linked child.
  - **When**: The parent accesses the results portal.
  - **Then**: Exam scores, passing indicators, and teacher feedback are displayed.
- **Related Scenario**: `SC-EXM-004` | **Related Requirements**: `PRD-007`, `FR-EXM-001`

---

### 4.5 Parent Student Status

#### Story ID: US-PAR-001 — Parent Viewing Teacher Evaluations and Student Level
- **Actor**: Parent
- **User Story**:
  > As a parent, I want to review teacher evaluations, qualitative notes, and student academic level, so that I understand my child's development.
- **Acceptance Criteria**:
  - **Given**: Teacher evaluations recorded for a linked child.
  - **When**: The parent opens the evaluations tab.
  - **Then**: Notes and student level indicators are rendered.
- **Related Scenario**: `SC-PAR-001` | **Related Requirements**: `PRD-007`, `FR-PAR-001`, `FR-PAR-005`

#### Story ID: US-PAR-002 — Parent Viewing Homework Status and Attendance Records
- **Actor**: Parent
- **User Story**:
  > As a parent, I want to check my child's daily physical attendance history and pending homework assignments, so that I can ensure their regular participation.
- **Acceptance Criteria**:
  - **Given**: Historical attendance logs and active assignment states.
  - **When**: The parent views the child's academic overview.
  - **Then**: Attendance records and homework status badges are presented.
- **Related Scenario**: `SC-PAR-002` | **Related Requirements**: `PRD-007`, `FR-PAR-002`, `FR-PAR-004`

---

### 4.6 Notifications

#### Story ID: US-NOT-001 — Pre-Lesson Reminder (1 Hour)
- **Actor**: System
- **User Story**: As a student/teacher, I want to receive a reminder 1 hour before a scheduled lesson, so that I can prepare on time.
- **Related Scenario**: `SC-NOT-001` | **Related Requirements**: `PRD-008`, `FR-NOT-001`

#### Story ID: US-NOT-002 — Unsolved Homework Alert
- **Actor**: System
- **User Story**: As a student/parent, I want an alert when an assignment is approaching its deadline unsolved, so that homework is completed on time.
- **Related Scenario**: `SC-NOT-002` | **Related Requirements**: `PRD-008`, `FR-NOT-002`

#### Story ID: US-NOT-003 — Exam Grade & Announcement Alerts
- **Actor**: System
- **User Story**: As a student/parent, I want notifications when new exams are announced and grades are released, so that I stay informed immediately.
- **Related Scenario**: `SC-NOT-003` | **Related Requirements**: `PRD-008`, `FR-NOT-003`, `FR-NOT-004`

#### Story ID: US-NOT-004 — Student Absence Alert
- **Actor**: System
- **User Story**: As a parent, I want an immediate alert if my child is marked absent from a physical class, so that I am aware of their safety and attendance.
- **Related Scenario**: `SC-NOT-004` | **Related Requirements**: `PRD-008`, `FR-NOT-005`

---

### 4.7 Groups Management (Physical Learning)

#### Story ID: US-GRP-001 — Create Physical Group and Schedule Lesson Times
- **Actor**: Teacher / Secretariat
- **User Story**: As a teacher or administrator, I want to create educational groups and define recurring weekly timetables, so that physical sessions can be conducted.
- **Related Scenario**: `SC-GRP-001` | **Related Requirements**: `PRD-002`, `FR-GRP-001`, `FR-GRP-003`

#### Story ID: US-GRP-002 — Add Students to Physical Group
- **Actor**: Teacher / Secretariat
- **User Story**: As a teacher or administrator, I want to add students to group rosters, so that they can participate in physical sessions and attendance roll-calls.
- **Related Scenario**: `SC-GRP-002` | **Related Requirements**: `PRD-002`, `FR-GRP-002`

---

### 4.8 Users & Permissions

#### Story ID: US-USR-001 — System Role Representation & Access Control
- **Actor**: All Roles
- **User Story**: As a system user, I want role-based authentication and strict permission enforcement, so that my account and data remain secure.
- **Related Scenario**: `SC-USR-001` | **Related Requirements**: `PRD-009`, `FR-USR-001..004`

---

### 4.9 Subscriptions

#### Story ID: US-SUB-001 — Track Student Payment Status
- **Actor**: Secretariat / Teacher
- **User Story**: As an administrative staff member, I want to track and view the fee payment status for each student per billing period, so that administrative fee records remain accurate.
- **Related Scenario**: `SC-SUB-001` | **Related Requirements**: `PRD-010`, `FR-SUB-001`

---

### 4.10 Online Learning (Courses)

#### Story ID: US-OL-001 — Teacher Creating and Structuring Online Course
- **Actor**: Teacher
- **User Story**:
  > As a teacher, I want to author, structure (modules and lessons), and publish online courses independently of physical classroom groups, so that students can learn asynchronously.
- **Acceptance Criteria**:
  - **Given**: Course title, description, subject, and grade level.
  - **When**: The teacher builds the module/lesson outline, attaches video streams and PDF summaries, and sets status to `PUBLISHED`.
  - **Then**: The course is live in the catalog for student enrollment.
- **Related Scenario**: `SC-OL-007` | **Related Requirements**: `PRD-OL-001`, `FR-OL-001`, `FR-OL-002`

#### Story ID: US-OL-002 — Student Enrolling in Online Course
- **Actor**: Student
- **User Story**:
  > As a student, I want to browse the Course Catalog and enroll in online courses, so that I gain access to digital instructional lessons and learning materials.
- **Acceptance Criteria**:
  - **Given**: A published online course.
  - **When**: The student requests enrollment.
  - **Then**: `CourseEnrollment` is created, `CourseAccess` is activated (`ACTIVE`), and course lessons become accessible.
  - **And**: The enrollment does NOT grant physical classroom attendance privileges.
- **Related Scenario**: `SC-OL-001` | **Related Requirements**: `PRD-OL-002`, `FR-OL-003`

#### Story ID: US-OL-003 — Student Consuming Course Lesson Content (Video & Documents)
- **Actor**: Student
- **User Story**:
  > As an enrolled student, I want to stream high-quality lesson videos and download PDF summaries asynchronously, so that I can learn at my own pace.
- **Acceptance Criteria**:
  - **Given**: Active `CourseAccess` for the course.
  - **When**: The student opens a lesson.
  - **Then**: The video streams via Bunny Stream with adaptive bitrate and PDF summaries download via Cloudflare R2.
- **Related Scenario**: `SC-OL-002` | **Related Requirements**: `PRD-OL-003`, `FR-OL-004`

#### Story ID: US-OL-004 — Student Tracking Lesson Progress & Resuming Playback
- **Actor**: Student
- **User Story**:
  > As a student, I want my lesson playback progress to be saved automatically, so that I can resume learning from where I left off and track my course completion percentage.
- **Acceptance Criteria**:
  - **Given**: An active video lesson playback session.
  - **When**: The student pauses or watches past completion milestones.
  - **Then**: The system updates `course_progress` (last position, completed flag) and recalculates total course progress percentage.
- **Related Scenario**: `SC-OL-002` | **Related Requirements**: `PRD-OL-004`, `FR-OL-005`

#### Story ID: US-OL-005 — Student Offline Learning and Progress Sync
- **Actor**: Student
- **User Story**:
  > As a student, I want to browse cached course outlines offline and have my completed lesson progress queue locally, so that when I reconnect, all progress syncs automatically without data loss.
- **Acceptance Criteria**:
  - **Given**: Previously cached course metadata and an offline network state.
  - **When**: The student completes a lesson reading and reconnects to the internet.
  - **Then**: The client outbox worker flushes queued progress events to the server idempotently.
- **Related Scenario**: `SC-OL-003`, `SC-OL-004` | **Related Requirements**: `PRD-OL-007`, `FR-OL-008`

#### Story ID: US-OL-006 — Student Taking Online Course Assessment
- **Actor**: Student
- **User Story**:
  > As an enrolled student, I want to complete assignments and take auto-graded exams attached to course lessons, so that I can evaluate my understanding of the course material.
- **Acceptance Criteria**:
  - **Given**: An assessment attached to a course lesson.
  - **When**: The student submits the assessment payload.
  - **Then**: The submission is recorded and exam questions are graded automatically and synchronously.
- **Related Scenario**: `SC-OL-005` | **Related Requirements**: `PRD-OL-005`, `FR-OL-006`

#### Story ID: US-OL-007 — Parent Monitoring Online Course Progress
- **Actor**: Parent
- **User Story**:
  > As a parent, I want to view my child's enrolled online courses, lesson completion rates, and online assessment scores in a dedicated tab, so that I have complete visibility into their digital learning.
- **Acceptance Criteria**:
  - **Given**: A verified parent-student link.
  - **When**: The parent opens the Online Learning monitoring tab.
  - **Then**: Child's enrolled courses, progress bars, completed lessons, and exam scores are rendered read-only.
- **Related Scenario**: `SC-OL-006` | **Related Requirements**: `PRD-OL-006`, `FR-OL-007`

---

## 5. User Stories Traceability Matrix

| Backlog Item / Domain | User Story ID | Related Scenario | Related FR | Related PRD |
|---|---|---|---|---|
| `بيانات الطالب` | `US-STU-001` | `SC-STU-001` | `FR-STU-004` | `PRD-001` |
| `المجموعة و الصف` | `US-STU-001` | `SC-STU-001` | `FR-STU-002` | `PRD-001` |
| `بيانات ولي الامر` | `US-STU-002` | `SC-STU-002` | `FR-STU-003` | `PRD-001` |
| `حالة الطلاب` | `US-STU-003` | `SC-STU-003` | `FR-STU-001` | `PRD-001` |
| `تسجيل حضور الطلاب` | `US-ATT-001` | `SC-ATT-001` | `FR-ATT-003` | `PRD-003` |
| `تسجيل الغياب` | `US-ATT-001` | `SC-ATT-001` | `FR-ATT-002` | `PRD-003` |
| `تقارير الحضور و الغياب` | `US-ATT-002` | `SC-ATT-002` | `FR-ATT-001` | `PRD-003` |
| `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | `FR-ATT-004` | `PRD-003` |
| `رفع الملفات و المراجع و الملخصات` | `US-LES-001` | `SC-LES-001` | `FR-LES-002` | `PRD-004` |
| `رفع تسجيلات المحاضرات` | `US-LES-001` | `SC-LES-001` | `FR-LES-003` | `PRD-004` |
| `متابعة مشاهدة المحتوى` | `US-LES-002` | `SC-LES-002` | `FR-LES-001` | `PRD-004` |
| `انشاء الواجبات` | `US-EXM-001` | `SC-EXM-001` | `FR-EXM-005` | `PRD-005` |
| `رفع الواجبات` | `US-EXM-001` | `SC-EXM-001` | `FR-EXM-004` | `PRD-005` |
| `انشاء الامتحانات` | `US-EXM-001` | `SC-EXM-001` | `FR-EXM-007` | `PRD-005` |
| `رفع الامتحانات` | `US-EXM-001` | `SC-EXM-001` | `FR-EXM-006` | `PRD-005` |
| `تسليم الواجبات و الامتحانات` | `US-EXM-002` | `SC-EXM-002` | `FR-EXM-003` | `PRD-005` |
| `تصحيح الدرجات تلقائي` | `US-EXM-003` | `SC-EXM-003` | `FR-EXM-002` | `PRD-006` |
| `عرض النتائج لي ولي الامر` | `US-EXM-004` | `SC-EXM-004` | `FR-EXM-001` | `PRD-007` |
| `تقييمات + ملاحظات المدرس` | `US-PAR-001` | `SC-PAR-001` | `FR-PAR-001` | `PRD-007` |
| `مستوى الطالب` | `US-PAR-001` | `SC-PAR-001` | `FR-PAR-005` | `PRD-007` |
| `حالة الواجبات` | `US-PAR-002` | `SC-PAR-002` | `FR-PAR-002` | `PRD-007` |
| `الحضور و الغياب` | `US-PAR-002` | `SC-PAR-002` | `FR-PAR-004` | `PRD-007` |
| `اشعار قبل الحصة ب ساعه` | `US-NOT-001` | `SC-NOT-001` | `FR-NOT-001` | `PRD-008` |
| `اشعار في حالة عدم حل الواجب` | `US-NOT-002` | `SC-NOT-002` | `FR-NOT-002` | `PRD-008` |
| `اشعار درجة امتحان الطالب` | `US-NOT-003` | `SC-NOT-003` | `FR-NOT-003` | `PRD-008` |
| `اشعار امتحان جديد` | `US-NOT-003` | `SC-NOT-003` | `FR-NOT-004` | `PRD-008` |
| `اشعارات في حالة غياب الطالب` | `US-NOT-004` | `SC-NOT-004` | `FR-NOT-005` | `PRD-008` |
| `تحديد مواعيد الدروس` | `US-GRP-001` | `SC-GRP-001` | `FR-GRP-001` | `PRD-002` |
| `انشاء مجموعة` | `US-GRP-001` | `SC-GRP-001` | `FR-GRP-003` | `PRD-002` |
| `اضافة طلاب` | `US-GRP-002` | `SC-GRP-002` | `FR-GRP-002` | `PRD-002` |
| `المستخدمون والصلاحيات` | `US-USR-001` | `SC-USR-001` | `FR-USR-001..004` | `PRD-009` |
| `حالة الدفع لكل طالب` | `US-SUB-001` | `SC-SUB-001` | `FR-SUB-001` | `PRD-010` |
| `انشاء دورة رقمية وهيكلتها` | `US-OL-001` | `SC-OL-007` | `FR-OL-001..002` | `PRD-OL-001` |
| `الالتحاق بالدورة الرقمية` | `US-OL-002` | `SC-OL-001` | `FR-OL-003` | `PRD-OL-002` |
| `مشاهدة دروس الدورة والمحتوى` | `US-OL-003` | `SC-OL-002` | `FR-OL-004` | `PRD-OL-003` |
| `متابعة واستئناف تقدم الدورة`| `US-OL-004` | `SC-OL-002` | `FR-OL-005` | `PRD-OL-004` |
| `التعلم بدون اتصال والمزامنة` | `US-OL-005` | `SC-OL-003..004`| `FR-OL-008` | `PRD-OL-007` |
| `أداء امتحان الدورة الرقمية` | `US-OL-006` | `SC-OL-005` | `FR-OL-006` | `PRD-OL-005` |
| `متابعة ولي الامر للدورات` | `US-OL-007` | `SC-OL-006` | `FR-OL-007` | `PRD-OL-006` |
