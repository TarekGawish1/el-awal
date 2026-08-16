# User Scenarios

## 1. Document Information

- **Document Name**: User Scenarios
- **Document Type**: UX Documentation
- **Product**: Educational Management System for Teachers and Students
- **Version**: TBD
- **Status**: Draft
- **Source of Truth**: Approved Backlog, Functional Requirements Document, Non-Functional Requirements Document, and User Personas

---

## 2. Scenario Overview

This document defines the high-level user scenarios for the educational management system based exclusively on the approved product backlog and the four confirmed user roles:
- `UX-PER-001` — Teacher / المدرس
- `UX-PER-002` — Student / الطالب
- `UX-PER-003` — Parent / ولي الأمر
- `UX-PER-004` — Secretariat / السكرتارية

Each scenario captures a high-level product situation without assuming UI layouts, navigation, buttons, form controls, unstated business rules, or technical implementation details. Where actor ownership, workflows, or preconditions are not defined in the backlog, they are documented as `TBD — Requires Product Clarification`.

---

## 3. User Scenarios

### 3.1 Student Management

#### Scenario ID: SC-STU-001
- **Scenario Name**: Student Data and Group/Class Association
- **Related Backlog Items**: `بيانات الطالب`, `المجموعة و الصف`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: The system contains student data and associated group and grade/class information.
- **Goal**: Handle student data and group/class information as defined by the product scope.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The user interacts with the system for student data and group/class information.
  2. The system processes the student data and associated group/class information.
  3. The student data and group/class details are represented in the system.
- **Expected Outcome**: Student data and group/class information are handled in the system.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-STU-002
- **Scenario Name**: Parent Data Management
- **Related Backlog Items**: `بيانات ولي الامر`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: The system contains parent data associated with students.
- **Goal**: Handle parent data in the system.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The user interacts with the system regarding parent data.
  2. The system processes the parent data.
  3. Parent data is represented in the system.
- **Expected Outcome**: Parent data is represented in the system.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-STU-003
- **Scenario Name**: Student Status Representation
- **Related Backlog Items**: `حالة الطلاب`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: Student status information is maintained in the system.
- **Goal**: Handle student status as defined in the product backlog.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The user interacts with the system regarding student status.
  2. The system processes the student status information.
  3. The student status is represented in the system.
- **Expected Outcome**: Student status is represented in the system.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

### 3.2 Attendance & Absence

#### Scenario ID: SC-ATT-001
- **Scenario Name**: Recording Student Attendance and Absence
- **Related Backlog Items**: `تسجيل حضور الطلاب`, `تسجيل الغياب`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: Student attendance or absence needs to be recorded.
- **Goal**: Record student attendance and absence in the system.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The user provides student attendance or absence information to the system.
  2. The attendance or absence is recorded in the system.
- **Expected Outcome**: Attendance and absence records are logged in the system.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-ATT-002
- **Scenario Name**: Attendance and Absence Reports
- **Related Backlog Items**: `تقارير الحضور و الغياب`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: Reports for attendance and absence are generated or viewed.
- **Goal**: Provide attendance and absence reports.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The user interacts with the system to obtain attendance and absence reports.
  2. Attendance and absence reports are made available in the system.
- **Expected Outcome**: Attendance and absence reports are made available.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-ATT-003
- **Scenario Name**: Scanning Student QR Code for Session Attendance
- **Related Backlog Items**: `تسجيل الحضور عبر مسح QR Code`
- **Actor**: Teacher / المدرس (Primary Actor), Student / الطالب (Supporting Actor)
- **Context**: A lesson session is scheduled or actively underway, and students check in for the class.
- **Goal**: Rapidly record student attendance for the specific lesson session by scanning each student's unique QR code.
- **Preconditions**:
  - The student has a unique QR code generated by the system (accessible via student profile or physical card).
  - The teacher has selected the active/scheduled lesson session and initiated the camera scanner interface.
- **Scenario**:
  1. The student presents their unique QR code to the teacher.
  2. The teacher points the device camera at the student's QR code within the scanning viewfinder.
  3. The system scans the QR token, validates student identity and group enrollment, and logs the student's attendance as `PRESENT` for that session.
  4. The system provides instantaneous visual/audio confirmation on the teacher's screen and updates the session attendance roster.
- **Expected Outcome**: The student's attendance is logged as `PRESENT` for the specific lesson session with recording method `QR_SCAN`.
- **Alternative / Exception Scenarios**:
  - *Duplicate Scan*: If scanned multiple times in the same session, the system indicates that attendance is already recorded and prevents duplicate entries.
  - *Cross-Group Scan*: If the student is not enrolled in the selected group, the system presents an informative alert with the student's name and assigned group.

---

### 3.3 Lectures & Lessons

#### Scenario ID: SC-LES-001
- **Scenario Name**: Uploading Educational Content and Lecture Recordings
- **Related Backlog Items**: `رفع الملفات و المراجع و الملخصات`, `رفع تسجيلات المحاضرات`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: Files, references, summaries, and lecture recordings are added to the system.
- **Goal**: Upload educational files, references, summaries, and lecture recordings.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The user uploads lecture recordings, files, references, or summaries to the system.
  2. The uploaded materials become available in the system.
- **Expected Outcome**: Educational files, references, summaries, and lecture recordings are uploaded and available in the system.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-LES-002
- **Scenario Name**: Monitoring Content Viewing
- **Related Backlog Items**: `متابعة مشاهدة المحتوى`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: Content viewing activity is tracked in the system.
- **Goal**: Track or view content viewing information.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The user interacts with the system to track content viewing.
  2. Content viewing information is made available in the system.
- **Expected Outcome**: Content viewing information is made available in the system.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

### 3.4 Exams & Assignments

#### Scenario ID: SC-EXM-001
- **Scenario Name**: Creating and Uploading Exams and Assignments
- **Related Backlog Items**: `انشاء الواجبات`, `رفع الواجبات`, `انشاء الامتحانات`, `رفع الامتحانات`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: Assignments and exams are created and uploaded in the system.
- **Goal**: Create and upload exams and assignments.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The user creates or uploads assignments or exams in the system.
  2. The created or uploaded assignments and exams become available in the system.
- **Expected Outcome**: Assignments and exams are created, uploaded, and available in the system.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-EXM-002
- **Scenario Name**: Submitting Assignments and Exams
- **Related Backlog Items**: `تسليم الواجبات و الامتحانات`
- **Actor**: `UX-PER-002 — Student / الطالب`
- **Context**: A student submits completed assignments and exams.
- **Goal**: Submit assignments and exams.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The student submits an assignment or exam in the system.
  2. The assignment or exam submission is recorded in the system.
- **Expected Outcome**: Assignment or exam submission is recorded in the system.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-EXM-003
- **Scenario Name**: Automatic Grading of Exams
- **Related Backlog Items**: `تصحيح الدرجات تلقائي`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: Exam submissions are graded automatically by the system.
- **Goal**: Automatically grade submitted exams.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. A submitted exam is processed by the system.
  2. The system automatically grades the exam.
- **Expected Outcome**: The exam is automatically graded and the grade is recorded.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-EXM-004
- **Scenario Name**: Displaying Results to Parent
- **Related Backlog Items**: `عرض النتائج لي ولي الامر`
- **Actor**: `UX-PER-003 — Parent / ولي الأمر`
- **Context**: Student results are made available to the parent.
- **Goal**: Display student results to the parent.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The parent interacts with the system to view student results.
  2. The results are presented to the parent.
- **Expected Outcome**: Results are presented to the parent.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

### 3.5 Parent Student Status

#### Scenario ID: SC-PAR-001
- **Scenario Name**: Parent Viewing Student Evaluations, Exam Grades, and Student Level
- **Related Backlog Items**: `تقييمات + ملاحظات المدرس`, `درجات الامتحانات`, `مستوى الطالب`
- **Actor**: `UX-PER-003 — Parent / ولي الأمر`
- **Context**: Teacher evaluations and notes, exam grades, and student level information are available to the parent.
- **Goal**: View teacher evaluations, notes, exam grades, and student level.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The parent interacts with the system to view student academic information.
  2. Teacher evaluations and notes, exam grades, and student level are presented to the parent.
- **Expected Outcome**: Teacher evaluations, notes, exam grades, and student level are displayed to the parent.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-PAR-002
- **Scenario Name**: Parent Viewing Student Assignment Status and Attendance Records
- **Related Backlog Items**: `حالة الواجبات`, `الحضور و الغياب`
- **Actor**: `UX-PER-003 — Parent / ولي الأمر`
- **Context**: Assignment status and attendance/absence records are available to the parent.
- **Goal**: View assignment status and attendance/absence records.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The parent interacts with the system to view assignment status and attendance/absence information.
  2. The assignment status and attendance/absence records are presented to the parent.
- **Expected Outcome**: Assignment status and attendance/absence records are displayed to the parent.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

### 3.6 Notifications & WhatsApp

#### Scenario ID: SC-NOT-001
- **Scenario Name**: Notification One Hour Before Lesson
- **Related Backlog Items**: `اشعار قبل الحصة ب ساعه`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: A notification is sent one hour before a scheduled lesson.
- **Goal**: Deliver a notification one hour before a lesson.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The condition of one hour before a scheduled lesson occurs according to the product requirement.
  2. The notification is sent.
- **Expected Outcome**: Notification is sent one hour before the lesson.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-NOT-002
- **Scenario Name**: Notification in Case Homework Is Not Solved
- **Related Backlog Items**: `اشعار في حالة عدم حل الواجب`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: A notification is sent when homework is not solved.
- **Goal**: Deliver a notification when homework is unsolved.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The condition of unsolved homework occurs according to the product requirement.
  2. The notification is sent.
- **Expected Outcome**: Notification for unsolved homework is sent.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-NOT-003
- **Scenario Name**: Exam Notifications
- **Related Backlog Items**: `اشعار امتحان جديد`, `اشعار درجة امتحان الطالب`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: Notifications are sent for a new exam and for student exam grades.
- **Goal**: Deliver notifications for new exams and student exam grades.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The condition of a new exam or a recorded student exam grade occurs according to the product requirement.
  2. The corresponding notification is sent.
- **Expected Outcome**: Notification for new exam or student exam grade is delivered.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-NOT-004
- **Scenario Name**: Notification in Case of Student Absence
- **Related Backlog Items**: `اشعارات في حالة غياب الطالب`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: A notification is sent when a student absence occurs.
- **Goal**: Deliver a notification in case of student absence.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The condition of a student absence occurs according to the product requirement.
  2. The notification is sent.
- **Expected Outcome**: Absence notification is delivered.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

### 3.7 Groups Management

#### Scenario ID: SC-GRP-001
- **Scenario Name**: Creating Groups and Scheduling Lesson Times
- **Related Backlog Items**: `انشاء مجموعة`, `تحديد مواعيد الدروس`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: Groups are created and lesson times are scheduled in the system.
- **Goal**: Create a group and schedule lesson times.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The user creates a group and specifies scheduled lesson times in the system.
  2. The group and scheduled lesson times become available in the system.
- **Expected Outcome**: The group is created and lesson times are scheduled.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

#### Scenario ID: SC-GRP-002
- **Scenario Name**: Adding Students to Groups
- **Related Backlog Items**: `اضافة طلاب`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: Students are added to a group in the system.
- **Goal**: Add students to a group.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The user performs the action to add students to a group.
  2. The addition of the students to the group is recorded in the system.
- **Expected Outcome**: Students are added to the specified group.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

### 3.8 Users & Permissions

#### Scenario ID: SC-USR-001
- **Scenario Name**: System Role Representation
- **Related Backlog Items**: `المدرس`, `الطالب`, `ولي الامر`, `السكرتارية`
- **Actor**: `UX-PER-001 — Teacher`, `UX-PER-002 — Student`, `UX-PER-003 — Parent`, `UX-PER-004 — Secretariat`
- **Context**: The system includes the four user roles identified in the product backlog.
- **Goal**: Represent Teacher, Student, Parent, and Secretariat entities in the system.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The system includes the user roles defined in the product backlog: Teacher (`المدرس`), Student (`الطالب`), Parent (`ولي الامر`), and Secretariat (`السكرتارية`).
  2. The roles are represented within the system.
- **Expected Outcome**: Teacher, Student, Parent, and Secretariat roles are represented in the system.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

### 3.9 Subscriptions

#### Scenario ID: SC-SUB-001
- **Scenario Name**: Payment Status for Each Student
- **Related Backlog Items**: `حالة الدفع لكل طالب`
- **Actor**: `TBD — Requires Product Clarification`
- **Context**: The payment status for each student is represented in the system.
- **Goal**: Handle the payment status for each student as defined in the product backlog.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Scenario**:
  1. The user interacts with the system regarding the payment status for a student.
  2. The payment status for the student is represented in the system.
- **Expected Outcome**: The payment status for each student is represented in the system.
- **Alternative / Exception Scenarios**: `TBD — Requires Product Clarification`

---

## 4. Scenario Traceability

| Backlog Item | Scenario ID | Coverage Status |
| :--- | :--- | :--- |
| حالة الطلاب | SC-STU-003 | Covered with TBD Actor |
| المجموعة و الصف | SC-STU-001 | Covered with TBD Actor |
| بيانات ولي الامر | SC-STU-002 | Covered with TBD Actor |
| بيانات الطالب | SC-STU-001 | Covered with TBD Actor |
| تقارير الحضور و الغياب | SC-ATT-002 | Covered with TBD Actor |
| تسجيل الغياب | SC-ATT-001 | Covered with TBD Actor |
| تسجيل حضور الطلاب | SC-ATT-001 | Covered with TBD Actor |
| تسجيل الحضور عبر مسح QR Code | SC-ATT-003 | Covered |
| متابعة مشاهدة المحتوى | SC-LES-002 | Covered with TBD Actor |
| رفع الملفات و المراجع و الملخصات | SC-LES-001 | Covered with TBD Actor |
| رفع تسجيلات المحاضرات | SC-LES-001 | Covered with TBD Actor |
| عرض النتائج لي ولي الامر | SC-EXM-004 | Covered |
| تصحيح الدرجات تلقائي | SC-EXM-003 | Covered with TBD Details |
| تسليم الواجبات و الامتحانات | SC-EXM-002 | Covered |
| رفع الواجبات | SC-EXM-001 | Covered with TBD Actor |
| انشاء الواجبات | SC-EXM-001 | Covered with TBD Actor |
| رفع الامتحانات | SC-EXM-001 | Covered with TBD Actor |
| انشاء الامتحانات | SC-EXM-001 | Covered with TBD Actor |
| تقييمات + ملاحظات المدرس | SC-PAR-001 | Covered |
| حالة الواجبات | SC-PAR-002 | Covered |
| درجات الامتحانات | SC-PAR-001 | Covered |
| الحضور و الغياب | SC-PAR-002 | Covered |
| مستوى الطالب | SC-PAR-001 | Covered |
| اشعار قبل الحصة ب ساعه | SC-NOT-001 | Covered with TBD Actor |
| اشعار في حالة عدم حل الواجب | SC-NOT-002 | Covered with TBD Actor |
| اشعار درجة امتحان الطالب | SC-NOT-003 | Covered with TBD Actor |
| اشعار امتحان جديد | SC-NOT-003 | Covered with TBD Actor |
| اشعارات في حالة غياب الطالب | SC-NOT-004 | Covered with TBD Actor |
| تحديد مواعيد الدروس | SC-GRP-001 | Covered with TBD Actor |
| اضافة طلاب | SC-GRP-002 | Covered with TBD Actor |
| انشاء مجموعة | SC-GRP-001 | Covered with TBD Actor |
| السكرتارية | SC-USR-001 | Covered with TBD Details |
| ولي الامر | SC-USR-001 | Covered |
| الطالب | SC-USR-001 | Covered |
| المدرس | SC-USR-001 | Covered |
| حالة الدفع لكل طالب | SC-SUB-001 | Covered with TBD Actor |

---

## 5. Open Product Clarifications

1. **Actor Assignment for Administrative Tasks**: Which specific user role (Teacher, Secretariat, or both) is responsible for managing student data, parent data, student status, creating groups, adding students, and scheduling lesson times?
2. **Attendance Operations Ownership**: Who is authorized to record student attendance and absence, and who can view attendance and absence reports?
3. **Content and Assessment Ownership**: Are educational content uploads, exam/assignment creation, and exam/assignment uploads performed solely by the Teacher, or can other roles assist?
4. **Notification Recipients**: For each notification event (`اشعار قبل الحصة ب ساعه`, `اشعار في حالة عدم حل الواجب`, `اشعار درجة امتحان الطالب`, `اشعار امتحان جديد`, `اشعارات في حالة غياب الطالب`), who is the intended recipient (Student, Parent, or both)?
5. **Payment Status Ownership**: Which role is responsible for viewing or managing the payment status for each student (`حالة الدفع لكل طالب`)?
6. **Submission Workflow**: What are the specific interaction rules and submission requirements for students submitting assignments and exams?
7. **Secretariat Responsibilities**: What specific operational tasks and system access rights belong to the Secretariat role?
