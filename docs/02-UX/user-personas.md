# User Personas

## 1. Document Information

- **Document Name**: User Personas
- **Document Type**: UX Documentation
- **Product**: Educational Management System for Teachers and Students
- **Version**: TBD
- **Status**: Draft
- **Source of Truth**: Approved Backlog & Functional Requirements Document

---

## 2. Persona Overview

This document defines the user personas for the educational management system based exclusively on the four user roles explicitly identified in the approved product backlog:

1. **المدرس — Teacher** (`UX-PER-001`)
2. **الطالب — Student** (`UX-PER-002`)
3. **ولي الأمر — Parent** (`UX-PER-003`)
4. **السكرتارية — Secretariat** (`UX-PER-004`)

No demographic attributes, technical skill levels, behaviors, pain points, or workflow assumptions are invented. Where details or actor assignments are not explicitly established in the backlog, they are marked as `TBD — Requires Product Clarification`.

---

## 3. Persona 01 — Teacher

### Basic Information
- **Persona ID**: UX-PER-001
- **Role**: Teacher / المدرس
- **Persona Type**: `TBD — Requires Product Clarification`
- **Demographics (Age, Gender, Location)**: `TBD — Requires Product Clarification`

### Role in the System
The Teacher represents the educator role within the system. Based on the product backlog, functionality related to the teacher or instruction includes:
- Creating groups (`انشاء مجموعة`)
- Adding students (`اضافة طلاب`)
- Scheduling lesson times (`تحديد مواعيد الدروس`)
- Uploading files, references, and summaries (`رفع الملفات و المراجع و الملخصات`)
- Uploading lecture recordings (`رفع تسجيلات المحاضرات`)
- Creating assignments (`انشاء الواجبات`) and uploading assignments (`رفع الواجبات`)
- Creating exams (`انشاء الامتحانات`) and uploading exams (`رفع الامتحانات`)
- Providing evaluations and notes regarding students (`تقييمات + ملاحظات المدرس`)
- Recording student attendance (`تسجيل حضور الطلاب`) and recording absence (`تسجيل الغياب`)
- Attendance and absence reports (`تقارير الحضور و الغياب`)
- Monitoring content viewing (`متابعة مشاهدة المحتوى`)

*Note*: Specific actor ownership and division of responsibilities between the Teacher, Secretariat, and other system entities (such as managing student status, parent data, student data, or viewing student payment status) are not explicitly separated in the backlog and remain subject to clarification (`TBD — Requires Product Clarification`).

### Goals
- Manage groups and schedule lesson times.
- Upload educational materials, lecture recordings, files, references, and summaries.
- Create and upload assignments and examinations.
- Record attendance and absence, and access attendance and absence reports.
- Provide student evaluations and notes.
- Monitor content viewing.

### Needs
- System capabilities to create groups, add students, and schedule lesson times.
- Capabilities to upload files, lecture recordings, summaries, and references.
- Capabilities to create and upload exams and assignments.
- Capabilities to record attendance and absence and view attendance reports.
- Capabilities to add evaluations and notes for students.

### Pain Points
`TBD — Requires Product Clarification`

### Behaviors
`TBD — Requires Product Clarification`

### Technical Characteristics
`TBD — Requires Product Clarification`

---

## 4. Persona 02 — Student

### Basic Information
- **Persona ID**: UX-PER-002
- **Role**: Student / الطالب
- **Persona Type**: `TBD — Requires Product Clarification`
- **Demographics (Age, Gender, Location)**: `TBD — Requires Product Clarification`

### Role in the System
The Student represents the learner role in the system. The product backlog associates the following functional items with the student:
- Student data (`بيانات الطالب`)
- Student status (`حالة الطلاب`)
- Group and grade/class (`المجموعة و الصف`)
- Viewing content (`مشاهدة المحتوى`)
- Submitting assignments and exams (`تسليم الواجبات و الامتحانات`)
- Attendance and absence records (`تسجيل حضور الطلاب`, `تسجيل الغياب`)
- Exam grades and student level (`درجات الامتحانات`, `مستوى الطالب`)
- Associated notifications (notification 1 hour before lesson, notification of new exam, notification of exam grade, notification for unsolved homework, notification in case of absence)

*Note*: The exact recipient for each notification type and specific submission workflows are not fully defined in the backlog and remain `TBD — Requires Product Clarification`.

### Goals
- Access learning materials, lecture recordings, files, references, and summaries.
- Submit assignments and exams (`تسليم الواجبات و الامتحانات`).
- View exam grades and student level.
- Receive applicable notifications.

### Needs
- Access to uploaded lecture recordings, files, references, and summaries.
- Functionality to submit assignments and exams.
- Access to student-related information (group and grade/class, exam grades, student level).

### Pain Points
`TBD — Requires Product Clarification`

### Behaviors
`TBD — Requires Product Clarification`

### Technical Characteristics
`TBD — Requires Product Clarification`

---

## 5. Persona 03 — Parent

### Basic Information
- **Persona ID**: UX-PER-003
- **Role**: Parent / ولي الأمر
- **Persona Type**: `TBD — Requires Product Clarification`
- **Demographics (Age, Gender, Location)**: `TBD — Requires Product Clarification`

### Role in the System
The Parent represents the student guardian role. The product backlog explicitly includes parent-related functionality:
- Parent data (`بيانات ولي الامر`)
- Displaying results to parent (`عرض النتائج لي ولي الامر`)
- Viewing teacher evaluations and notes (`تقييمات + ملاحظات المدرس`)
- Viewing assignment status (`حالة الواجبات`)
- Viewing exam grades (`درجات الامتحانات`)
- Viewing attendance and absence (`الحضور و الغياب`)
- Viewing student level (`مستوى الطالب`)
- Associated notifications related to the student

*Note*: The access method, interface, and notification recipient rules are not defined in the backlog and remain `TBD — Requires Product Clarification`.

### Goals
- View student results and exam grades (`عرض النتائج لي ولي الامر`, `درجات الامتحانات`).
- View teacher evaluations and notes (`تقييمات + ملاحظات المدرس`).
- View student attendance and absence records (`الحضور و الغياب`).
- View assignment status (`حالة الواجبات`).
- View student level (`مستوى الطالب`).
- Receive applicable notifications regarding the student.

### Needs
- Access to view student results, exam grades, teacher evaluations and notes, assignment status, attendance and absence, and student level.
- Delivery of student-related notifications where designated.

### Pain Points
`TBD — Requires Product Clarification`

### Behaviors
`TBD — Requires Product Clarification`

### Technical Characteristics
`TBD — Requires Product Clarification`

---

## 6. Persona 04 — Secretariat

### Basic Information
- **Persona ID**: UX-PER-004
- **Role**: Secretariat / السكرتارية
- **Persona Type**: `TBD — Requires Product Clarification`
- **Demographics (Age, Gender, Location)**: `TBD — Requires Product Clarification`

### Role in the System
The backlog explicitly identifies the Secretariat (`السكرتارية`) as a system role (Requirement `FR-USR-001`). However, specific operational duties, administrative tasks, and permissions are not defined in the backlog.

- Responsibilities: `TBD — Requires Product Clarification`

### Goals
`TBD — Requires Product Clarification`

### Needs
`TBD — Requires Product Clarification`

### Pain Points
`TBD — Requires Product Clarification`

### Behaviors
`TBD — Requires Product Clarification`

### Technical Characteristics
`TBD — Requires Product Clarification`

---

## 7. Persona Comparison

| Persona ID | Role | Defined Product Responsibilities | Undefined Information |
| :--- | :--- | :--- | :--- |
| **UX-PER-001** | Teacher / المدرس | Creating groups; adding students; scheduling lesson times; uploading files, references, summaries, and lecture recordings; creating and uploading assignments and exams; recording attendance and absence; attendance reports; providing evaluations and notes; monitoring content viewing. | Exact division of administrative responsibilities with Secretariat; responsibility for student payment status; demographics; behaviors; pain points; technical characteristics. |
| **UX-PER-002** | Student / الطالب | Associated with student data, group and class, content viewing, submitting assignments and exams, exam grades, student level, attendance records, and student-related notifications. | Exact notification recipient assignment; submission workflow details; demographics; behaviors; pain points; technical characteristics. |
| **UX-PER-003** | Parent / ولي الأمر | Associated with parent data, viewing student results, exam grades, teacher evaluations and notes, assignment status, attendance and absence, student level, and student-related notifications. | Intended access method; exact notification recipient assignment; demographics; behaviors; pain points; technical characteristics. |
| **UX-PER-004** | Secretariat / السكرتارية | Role explicitly listed in Backlog (`FR-USR-001`). | Specific operational and administrative responsibilities; goals; needs; pain points; behaviors; demographics; technical characteristics. |

---

## 8. Open Product Clarifications

1. **Secretariat Responsibilities**: What are the exact responsibilities and system permissions assigned to the Secretariat?
2. **Action Ownership & Delegation**: Which administrative actions (e.g., student data management, payment status tracking, attendance recording, group management) belong to the Teacher versus the Secretariat?
3. **Payment Status Responsibility**: Which role is responsible for viewing or managing the payment status for each student (`حالة الدفع لكل طالب`)?
4. **Student Submission Workflow**: What are the exact workflows and requirements for submitting assignments and exams (`تسليم الواجبات و الامتحانات`)?
5. **Parent Access Method**: What is the intended access method through which the Parent views student-related information?
6. **Notification Recipients**: For each notification type (1 hour before lesson, absence notification, unsolved homework, new exam, exam grade), which specific role (Student, Parent, or both) is the intended recipient?
7. **User Characteristics**: Are there specific demographic, behavioral, or technical characteristics that define each target user role?
