# User Stories

## 1. Document Information

- **Document Name**: User Stories
- **Document Type**: UX Documentation
- **Product**: Educational Management System for Teachers and Students
- **Version**: TBD
- **Status**: Draft
- **Source of Truth**: Approved Backlog, Functional Requirements Document, Non-Functional Requirements Document, User Personas, and User Scenarios

---

## 2. Purpose

This document translates the approved product functionality into user stories that describe user-facing capabilities. Each story represents product behavior derived directly from the approved product backlog and user scenarios without introducing unconfirmed scope, user interface assumptions, or technical implementation details.

---

## 3. User Story Structure

Each user story is structured with the following fields:

- **Story ID**: Unique identifier within the module.
- **Story Name**: Descriptive name of the user story.
- **Related Backlog Item(s)**: Exact Arabic backlog items represented by the story.
- **Related Scenario**: Associated Scenario ID from `user-scenarios.md`.
- **Actor**: Confirmed persona or `TBD — Requires Product Clarification`.
- **User Story**: Standard format: `As a [Actor], I want [Capability], so that [Goal]`.
- **Acceptance Criteria**: Product-level `Given / When / Then` criteria.
- **Clarifications**: Open product clarifications where details are undefined.

---

## 4. User Stories

### 4.1 Student Management

#### Story ID: US-STU-001
- **Story Name**: Student Data and Group/Class Association
- **Related Backlog Item(s)**: `بيانات الطالب`, `المجموعة و الصف`
- **Related Scenario**: `SC-STU-001`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a system user [TBD — Requires Product Clarification], I want student data and group and grade/class information to be handled in the system, so that student data and group/class information are represented in the system.
- **Acceptance Criteria**:
  - **Given**: Student data and group/class information are to be handled in the system.
  - **When**: The user interacts with the system regarding student data and group/class information.
  - **Then**: Student data and group/class information are represented in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Actor ownership and exact data fields are undefined).

---

#### Story ID: US-STU-002
- **Story Name**: Parent Data Representation
- **Related Backlog Item(s)**: `بيانات ولي الامر`
- **Related Scenario**: `SC-STU-002`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a system user [TBD — Requires Product Clarification], I want parent data to be handled in the system, so that parent data is represented in the system.
- **Acceptance Criteria**:
  - **Given**: Parent data is to be handled in the system.
  - **When**: The user interacts with the system regarding parent data.
  - **Then**: Parent data is represented in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Actor ownership and exact parent data fields are undefined).

---

#### Story ID: US-STU-003
- **Story Name**: Student Status Representation
- **Related Backlog Item(s)**: `حالة الطلاب`
- **Related Scenario**: `SC-STU-003`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a system user [TBD — Requires Product Clarification], I want student status to be handled in the system, so that student status is represented in the system.
- **Acceptance Criteria**:
  - **Given**: Student status is to be handled in the system.
  - **When**: The user interacts with the system regarding student status.
  - **Then**: Student status is represented in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Actor ownership and defined status values are undefined).

---

### 4.2 Attendance & Absence

#### Story ID: US-ATT-001
- **Story Name**: Recording Student Attendance and Absence
- **Related Backlog Item(s)**: `تسجيل حضور الطلاب`, `تسجيل الغياب`
- **Related Scenario**: `SC-ATT-001`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a system user [TBD — Requires Product Clarification], I want to record student attendance and absence, so that student attendance and absence are recorded in the system.
- **Acceptance Criteria**:
  - **Given**: Attendance or absence is to be recorded for students.
  - **When**: Student attendance or absence is provided to the system.
  - **Then**: Attendance or absence is recorded in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Actor ownership between Teacher and Secretariat is undefined).

---

#### Story ID: US-ATT-002
- **Story Name**: Attendance and Absence Reports
- **Related Backlog Item(s)**: `تقارير الحضور و الغياب`
- **Related Scenario**: `SC-ATT-002`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a system user [TBD — Requires Product Clarification], I want to access attendance and absence reports, so that attendance and absence reports are available in the system.
- **Acceptance Criteria**:
  - **Given**: Attendance and absence reports are to be accessed.
  - **When**: Attendance and absence reports are requested.
  - **Then**: Attendance and absence reports are made available in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Actor access permissions and report contents are undefined).

---

#### Story ID: US-ATT-003
- **Story Name**: Student QR Code Attendance Scanning
- **Related Backlog Item(s)**: `تسجيل الحضور عبر مسح QR Code`
- **Related Scenario**: `SC-ATT-003`
- **Actor**: Teacher (`المدرس`) / Student (`الطالب`)
- **User Story**:
  > As an authorized Teacher (`المدرس`), I want to scan a student's unique QR attendance credential during an active lesson session, so that the student's attendance is verified against group enrollment and recorded immediately without manual roster searching.
  >
  > As a Student (`الطالب`), I want to view and present my unique QR attendance credential from my digital student card or portal, so that my teacher can scan it to record my attendance.
- **Acceptance Criteria**:
  - **Given**: An authenticated teacher managing an active lesson session and a student presenting their unique QR credential.
  - **When**: The teacher scans the student's QR code via the camera scanner interface.
  - **Then**: The system validates teacher session authorization, resolves the student's active profile, verifies active group enrollment in the session's group, records attendance as `PRESENT` with recording method `QR_SCAN`, and provides instantaneous visual/audio feedback.
  - **Given**: A student whose attendance has already been recorded for the session.
  - **When**: The student's QR code is scanned again in the same session.
  - **Then**: The system confirms the existing attendance status idempotently without duplicating entries.
  - **Given**: A student enrolled in a different group.
  - **When**: The student's QR code is scanned.
  - **Then**: The system displays an informative enrollment mismatch warning with the student's name and actual group, and does not record attendance in this session.
- **Clarifications**: Defined.

---

### 4.3 Lectures & Lessons

#### Story ID: US-LES-001
- **Story Name**: Uploading Educational Materials and Lecture Recordings
- **Related Backlog Item(s)**: `رفع الملفات و المراجع و الملخصات`, `رفع تسجيلات المحاضرات`
- **Related Scenario**: `SC-LES-001`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a system user [TBD — Requires Product Clarification], I want to upload files, references, summaries, and lecture recordings, so that educational materials and lecture recordings are available in the system.
- **Acceptance Criteria**:
  - **Given**: Educational materials or lecture recordings are to be uploaded.
  - **When**: Files, references, summaries, or lecture recordings are uploaded.
  - **Then**: The uploaded materials become available in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Actor ownership and file format/size limits are undefined).

---

#### Story ID: US-LES-002
- **Story Name**: Monitoring Content Viewing
- **Related Backlog Item(s)**: `متابعة مشاهدة المحتوى`
- **Related Scenario**: `SC-LES-002`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a system user [TBD — Requires Product Clarification], I want to track content viewing, so that content viewing information is available in the system.
- **Acceptance Criteria**:
  - **Given**: Content viewing information is to be tracked.
  - **When**: Content viewing information is accessed in the system.
  - **Then**: Content viewing information is made available in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Actor ownership and tracked viewing metrics are undefined).

---

### 4.4 Exams & Assignments

#### Story ID: US-EXM-001
- **Story Name**: Creating and Uploading Exams and Assignments
- **Related Backlog Item(s)**: `انشاء الواجبات`, `رفع الواجبات`, `انشاء الامتحانات`, `رفع الامتحانات`
- **Related Scenario**: `SC-EXM-001`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a system user [TBD — Requires Product Clarification], I want to create and upload exams and assignments, so that assignments and exams are available in the system.
- **Acceptance Criteria**:
  - **Given**: Assignments or exams are to be created or uploaded.
  - **When**: Assignments or exams are created or uploaded.
  - **Then**: The created or uploaded assignments and exams become available in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Actor ownership and assessment structures are undefined).

---

#### Story ID: US-EXM-002
- **Story Name**: Submitting Assignments and Exams
- **Related Backlog Item(s)**: `تسليم الواجبات و الامتحانات`
- **Related Scenario**: `SC-EXM-002`
- **Actor**: `Student / الطالب`
- **User Story**:
  > As a Student (`الطالب`), I want to submit assignments and exams, so that assignment and exam submissions are delivered in the system.
- **Acceptance Criteria**:
  - **Given**: An assignment or exam is to be submitted.
  - **When**: A student submits the assignment or exam.
  - **Then**: The assignment or exam submission is recorded in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Submission deadlines, formats, and retry rules are undefined).

---

#### Story ID: US-EXM-003
- **Story Name**: Automatic Grading of Exams
- **Related Backlog Item(s)**: `تصحيح الدرجات تلقائي`
- **Related Scenario**: `SC-EXM-003`
- **Actor**: `System` / `TBD — Requires Product Clarification`
- **User Story**:
  > As a system capability, I want submitted exams to be graded automatically, so that exam grading is performed automatically.
- **Acceptance Criteria**:
  - **Given**: An exam submission is received.
  - **When**: Automatic grading is performed.
  - **Then**: The exam is automatically graded.
- **Clarifications**: `TBD — Requires Product Clarification` (Applicable question types and grading mechanisms are undefined).

---

#### Story ID: US-EXM-004
- **Story Name**: Displaying Results to Parent
- **Related Backlog Item(s)**: `عرض النتائج لي ولي الامر`
- **Related Scenario**: `SC-EXM-004`
- **Actor**: `Parent / ولي الأمر`
- **User Story**:
  > As a Parent (`ولي الأمر`), I want to view student results, so that results are displayed to the parent.
- **Acceptance Criteria**:
  - **Given**: Results are to be displayed to the parent.
  - **When**: The parent accesses student results.
  - **Then**: The student results are displayed to the parent.
- **Clarifications**: `TBD — Requires Product Clarification` (Access channel and presentation method are undefined).

---

### 4.5 Parent Student Status

#### Story ID: US-PAR-001
- **Story Name**: Parent Viewing Teacher Evaluations, Notes, Exam Grades, and Student Level
- **Related Backlog Item(s)**: `تقييمات + ملاحظات المدرس`, `درجات الامتحانات`, `مستوى الطالب`
- **Related Scenario**: `SC-PAR-001`
- **Actor**: `Parent / ولي الأمر`
- **User Story**:
  > As a Parent (`ولي الأمر`), I want to view teacher evaluations and notes, exam grades, and student level, so that teacher evaluations, notes, exam grades, and student level are displayed to the parent.
- **Acceptance Criteria**:
  - **Given**: Teacher evaluations, notes, exam grades, or student level are to be viewed by the parent.
  - **When**: The parent accesses the information.
  - **Then**: Teacher evaluations, notes, exam grades, and student level are displayed to the parent.
- **Clarifications**: `TBD — Requires Product Clarification` (Evaluation structure and student level definition are undefined).

---

#### Story ID: US-PAR-002
- **Story Name**: Parent Viewing Assignment Status and Attendance Records
- **Related Backlog Item(s)**: `حالة الواجبات`, `الحضور و الغياب`
- **Related Scenario**: `SC-PAR-002`
- **Actor**: `Parent / ولي الأمر`
- **User Story**:
  > As a Parent (`ولي الأمر`), I want to view assignment status and attendance and absence records, so that assignment status and attendance and absence records are displayed to the parent.
- **Acceptance Criteria**:
  - **Given**: Assignment status or attendance and absence records are to be viewed by the parent.
  - **When**: The parent accesses the information.
  - **Then**: Assignment status and attendance and absence records are displayed to the parent.
- **Clarifications**: `TBD — Requires Product Clarification` (Possible assignment statuses are undefined).

---

### 4.6 Notifications & WhatsApp

#### Story ID: US-NOT-001
- **Story Name**: Notification One Hour Before Lesson
- **Related Backlog Item(s)**: `اشعار قبل الحصة ب ساعه`
- **Related Scenario**: `SC-NOT-001`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a designated recipient [TBD — Requires Product Clarification], I want to receive a notification one hour before a lesson, so that a reminder is delivered one hour before the lesson.
- **Acceptance Criteria**:
  - **Given**: A lesson is one hour away.
  - **When**: The one-hour pre-lesson notification is to be sent.
  - **Then**: The notification is sent one hour before the lesson.
- **Clarifications**: `TBD — Requires Product Clarification` (Recipient role and notification delivery channel are undefined).

---

#### Story ID: US-NOT-002
- **Story Name**: Notification for Unsolved Homework
- **Related Backlog Item(s)**: `اشعار في حالة عدم حل الواجب`
- **Related Scenario**: `SC-NOT-002`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a designated recipient [TBD — Requires Product Clarification], I want to receive a notification when homework is not solved, so that an alert for unsolved homework is delivered.
- **Acceptance Criteria**:
  - **Given**: Homework is not solved.
  - **When**: The notification for unsolved homework is to be sent.
  - **Then**: The notification for unsolved homework is sent.
- **Clarifications**: `TBD — Requires Product Clarification` (Recipient role and delivery channel are undefined).

---

#### Story ID: US-NOT-003
- **Story Name**: Exam Notifications
- **Related Backlog Item(s)**: `اشعار امتحان جديد`, `اشعار درجة امتحان الطالب`
- **Related Scenario**: `SC-NOT-003`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a designated recipient [TBD — Requires Product Clarification], I want to receive notifications for a new exam and for a student exam grade, so that exam-related notifications are delivered.
- **Acceptance Criteria**:
  - **Given**: A new exam or a student exam grade is present.
  - **When**: The exam notification is to be sent.
  - **Then**: The notification for the new exam or student exam grade is sent.
- **Clarifications**: `TBD — Requires Product Clarification` (Recipient role and delivery channel are undefined).

---

#### Story ID: US-NOT-004
- **Story Name**: Notification for Student Absence
- **Related Backlog Item(s)**: `اشعارات في حالة غياب الطالب`
- **Related Scenario**: `SC-NOT-004`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a designated recipient [TBD — Requires Product Clarification], I want to receive a notification when a student absence occurs, so that an absence notification is delivered.
- **Acceptance Criteria**:
  - **Given**: A student absence occurs.
  - **When**: The student absence notification is to be sent.
  - **Then**: The absence notification is sent.
- **Clarifications**: `TBD — Requires Product Clarification` (Recipient role and delivery channel are undefined).

---

### 4.7 Groups Management

#### Story ID: US-GRP-001
- **Story Name**: Creating Groups and Scheduling Lesson Times
- **Related Backlog Item(s)**: `انشاء مجموعة`, `تحديد مواعيد الدروس`
- **Related Scenario**: `SC-GRP-001`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a system user [TBD — Requires Product Clarification], I want to create groups and schedule lesson times, so that groups and scheduled lesson times are available in the system.
- **Acceptance Criteria**:
  - **Given**: A group is to be created and lesson times scheduled.
  - **When**: A group is created and lesson times are scheduled.
  - **Then**: The group and scheduled lesson times become available in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Actor ownership between Teacher and Secretariat is undefined).

---

#### Story ID: US-GRP-002
- **Story Name**: Adding Students to Groups
- **Related Backlog Item(s)**: `اضافة طلاب`
- **Related Scenario**: `SC-GRP-002`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a system user [TBD — Requires Product Clarification], I want to add students to a group, so that the addition of students to the group is recorded in the system.
- **Acceptance Criteria**:
  - **Given**: Students are to be added to a group.
  - **When**: Students are added to the group.
  - **Then**: The addition of students to the group is recorded in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Actor ownership and group capacity limits are undefined).

---

### 4.8 Users & Permissions

#### Story ID: US-USR-001
- **Story Name**: System Role Representation
- **Related Backlog Item(s)**: `المدرس`, `الطالب`, `ولي الامر`, `السكرتارية`
- **Related Scenario**: `SC-USR-001`
- **Actor**: `Teacher / المدرس`, `Student / الطالب`, `Parent / ولي الأمر`, `Secretariat / السكرتارية`
- **User Story**:
  > As a system stakeholder, I want the system to include the confirmed user roles (Teacher, Student, Parent, and Secretariat), so that the four roles are represented in the system.
- **Acceptance Criteria**:
  - **Given**: The educational management system is in operation.
  - **When**: Users interact with the system.
  - **Then**: The four confirmed roles (Teacher, Student, Parent, and Secretariat) are represented in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Role permissions and administrative privileges are undefined).

---

### 4.9 Subscriptions

#### Story ID: US-SUB-001
- **Story Name**: Payment Status for Each Student
- **Related Backlog Item(s)**: `حالة الدفع لكل طالب`
- **Related Scenario**: `SC-SUB-001`
- **Actor**: `TBD — Requires Product Clarification`
- **User Story**:
  > As a system user [TBD — Requires Product Clarification], I want the payment status for each student to be handled in the system, so that the payment status for each student is represented in the system.
- **Acceptance Criteria**:
  - **Given**: Student payment status is to be represented in the system.
  - **When**: The user interacts with the system regarding student payment status.
  - **Then**: The payment status for each student is represented in the system.
- **Clarifications**: `TBD — Requires Product Clarification` (Actor ownership and defined payment statuses are undefined).

---

## 5. User Story Traceability

| Backlog Item | Scenario ID | User Story ID | Coverage Status |
| :--- | :--- | :--- | :--- |
| حالة الطلاب | SC-STU-003 | US-STU-003 | Covered with TBD Actor |
| المجموعة و الصف | SC-STU-001 | US-STU-001 | Covered with TBD Actor |
| بيانات ولي الامر | SC-STU-002 | US-STU-002 | Covered with TBD Actor |
| بيانات الطالب | SC-STU-001 | US-STU-001 | Covered with TBD Actor |
| تقارير الحضور و الغياب | SC-ATT-002 | US-ATT-002 | Covered with TBD Actor |
| تسجيل الغياب | SC-ATT-001 | US-ATT-001 | Covered with TBD Actor |
| تسجيل حضور الطلاب | SC-ATT-001 | US-ATT-001 | Covered with TBD Actor |
| تسجيل الحضور عبر مسح QR Code | SC-ATT-003 | US-ATT-003 | Covered |
| متابعة مشاهدة المحتوى | SC-LES-002 | US-LES-002 | Covered with TBD Actor |
| رفع الملفات و المراجع و الملخصات | SC-LES-001 | US-LES-001 | Covered with TBD Actor |
| رفع تسجيلات المحاضرات | SC-LES-001 | US-LES-001 | Covered with TBD Actor |
| عرض النتائج لي ولي الامر | SC-EXM-004 | US-EXM-004 | Covered |
| تصحيح الدرجات تلقائي | SC-EXM-003 | US-EXM-003 | Covered with TBD Details |
| تسليم الواجبات و الامتحانات | SC-EXM-002 | US-EXM-002 | Covered |
| رفع الواجبات | SC-EXM-001 | US-EXM-001 | Covered with TBD Actor |
| انشاء الواجبات | SC-EXM-001 | US-EXM-001 | Covered with TBD Actor |
| رفع الامتحانات | SC-EXM-001 | US-EXM-001 | Covered with TBD Actor |
| انشاء الامتحانات | SC-EXM-001 | US-EXM-001 | Covered with TBD Actor |
| تقييمات + ملاحظات المدرس | SC-PAR-001 | US-PAR-001 | Covered |
| حالة الواجبات | SC-PAR-002 | US-PAR-002 | Covered |
| درجات الامتحانات | SC-PAR-001 | US-PAR-001 | Covered |
| الحضور و الغياب | SC-PAR-002 | US-PAR-002 | Covered |
| مستوى الطالب | SC-PAR-001 | US-PAR-001 | Covered |
| اشعار قبل الحصة ب ساعه | SC-NOT-001 | US-NOT-001 | Covered with TBD Actor |
| اشعار في حالة عدم حل الواجب | SC-NOT-002 | US-NOT-002 | Covered with TBD Actor |
| اشعار درجة امتحان الطالب | SC-NOT-003 | US-NOT-003 | Covered with TBD Actor |
| اشعار امتحان جديد | SC-NOT-003 | US-NOT-003 | Covered with TBD Actor |
| اشعارات في حالة غياب الطالب | SC-NOT-004 | US-NOT-004 | Covered with TBD Actor |
| تحديد مواعيد الدروس | SC-GRP-001 | US-GRP-001 | Covered with TBD Actor |
| اضافة طلاب | SC-GRP-002 | US-GRP-002 | Covered with TBD Actor |
| انشاء مجموعة | SC-GRP-001 | US-GRP-001 | Covered with TBD Actor |
| السكرتارية | SC-USR-001 | US-USR-001 | Covered with TBD Details |
| ولي الامر | SC-USR-001 | US-USR-001 | Covered |
| الطالب | SC-USR-001 | US-USR-001 | Covered |
| المدرس | SC-USR-001 | US-USR-001 | Covered |
| حالة الدفع لكل طالب | SC-SUB-001 | US-SUB-001 | Covered with TBD Actor |

---

## 6. Open Product Clarifications

1. **Actor Assignment for Student Management**: Which specific role (Teacher, Secretariat, or both) manages student data, parent data, student status, and group/class assignments?
2. **Attendance Management Roles**: Who has authorization to log student attendance/absence, and who is permitted to view attendance and absence reports?
3. **Content and Assessment Ownership**: Which user role is responsible for uploading educational files and lecture recordings, and creating/uploading exams and assignments?
4. **Notification Routing & Delivery**: For each notification item (`اشعار قبل الحصة ب ساعه`, `اشعار في حالة عدم حل الواجب`, `اشعار درجة امتحان الطالب`, `اشعار امتحان جديد`, `اشعارات في حالة غياب الطالب`), who is the intended recipient (Student, Parent, or both)?
5. **Payment Status Responsibility**: Which role is responsible for managing or viewing the payment status for each student (`حالة الدفع لكل طالب`)?
6. **Student Submission Mechanisms**: What are the specific rules, deadlines, and technical formats for students submitting assignments and exams?
7. **Secretariat Responsibilities & Permissions**: What specific operational tasks and permissions belong to the Secretariat role?
