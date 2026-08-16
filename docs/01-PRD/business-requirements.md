# Business Requirements Document

## 1. Document Information

- **Document Name**: Business Requirements Document
- **Document Type**: Product Requirements
- **Product**: Educational Management System for Teachers and Students
- **Version**: TBD
- **Status**: Draft
- **Source of Truth**: Approved Product Backlog & Existing Product Documentation

---

## 2. Purpose

The purpose of this document is to define the high-level business and product requirements for the Educational Management System for Teachers and Students, derived exclusively from the approved product backlog and existing product documentation.

This document establishes:
- The business context and high-level capabilities supported by the system.
- The business stakeholders and their relationships to the product.
- The high-level business requirements governing the product modules.
- The defined product scope, boundaries, and traceability to existing documentation.

This document does not introduce unconfirmed product features, technical architectures, database designs, API specifications, UI designs, or detailed functional behavior.

---

## 3. Business Context

The system is an educational management platform designed to support educational and administrative workflows involving four confirmed user roles:
- **Teacher (`المدرس`)**
- **Student (`الطالب`)**
- **Parent (`ولي الأمر`)**
- **Secretariat (`السكرتارية`)**

The product encompasses educational and operational capabilities across nine confirmed product modules:
1. **Student Management**: Handling student data, parent data, student status, and group/grade associations.
2. **Attendance & Absence**: Recording student attendance, recording absences, and providing attendance/absence reports.
3. **Lectures & Lessons**: Uploading educational files, references, summaries, lecture recordings, and tracking content viewing.
4. **Exams & Assignments**: Creating and uploading assignments and exams, student submissions, automatic exam grading, and displaying results to parents.
5. **Parent Student Status**: Providing parents with access to evaluations, teacher notes, exam grades, student level, assignment status, and attendance/absence records.
6. **Notifications**: Providing notifications for upcoming lessons, unsolved assignments, new exams, exam grades, and student absences.
7. **Groups Management**: Creating groups, scheduling lesson times, and adding students to groups.
8. **Users & Permissions**: Supporting the four confirmed user roles.
9. **Subscriptions**: Tracking the payment status for each student.

---

## 4. Business Problem

The product addresses core operational and educational capability needs identified across the approved backlog modules:
- Managing student information, parent information, student status, and academic group/class associations.
- Managing group formation and scheduling lesson times.
- Recording and reporting student attendance and absence records.
- Managing and providing access to educational files, summaries, references, and lecture recordings, along with tracking content engagement.
- Managing the creation, upload, submission, and grading of assignments and examinations.
- Providing parents with visibility into student academic standing, evaluations, assignment statuses, exam grades, and attendance records.
- Providing relevant schedule reminders and academic alerts.
- Supporting defined system user roles.
- Tracking student payment status.

> **Note**: Detailed historical problem statements, baseline operational metrics, and legacy operational workflows are not documented in the backlog (`TBD — Requires Product Clarification`).

---

## 5. Business Objectives

The business objectives directly supported by the approved product scope are:

1. **Enable Student Information Management**: Provide capabilities to maintain and view student profiles, parent contact data, student status, and class/group assignments.
2. **Enable Group & Schedule Management**: Provide capabilities to create student groups, assign students to groups, and define lesson schedules.
3. **Enable Attendance & Absence Tracking**: Provide capabilities to record student attendance and absences and generate attendance/absence reports.
4. **Enable Educational Content Delivery**: Provide capabilities to upload and distribute educational materials, summaries, references, and lecture recordings, and track content viewing.
5. **Enable Assignment & Exam Management**: Provide capabilities to create and upload assignments and exams for students.
6. **Enable Student Assessment Submissions**: Enable students to submit their completed assignments and exams through the system.
7. **Enable Automatic Exam Grading**: Provide automated grading capabilities for student exam submissions where explicitly required.
8. **Enable Parent Visibility into Student Academic Status**: Enable parents to view evaluations, teacher notes, exam grades, student level, assignment completion status, and attendance/absence records.
9. **Enable Notifications**: Provide notification capabilities for one-hour pre-lesson reminders, unsolved homework alerts, new exam announcements, student exam grades, and student absence alerts.
10. **Support Defined System Roles & Permissions**: Represent and manage the four confirmed roles (Teacher, Student, Parent, Secretariat).
11. **Enable Student Payment Status Tracking**: Provide visibility and tracking for the payment status of each student.

> **Note on Measurable Targets**: Specific quantitative business targets, financial KPIs, ROI, market share, adoption percentages, and efficiency improvement metrics are not defined in the source documentation (`TBD — Requires Product Clarification`).

---

## 6. Business Stakeholders / User Roles

The system serves four confirmed user roles derived from the product backlog:

| Role | Business Relationship to Product |
|---|---|
| **Teacher / المدرس** | Educational and instructional user responsible for managing groups, schedules, educational content, assessments, attendance, evaluations, and viewing student progress. |
| **Student / الطالب** | Learner user who accesses educational materials, receives notifications, and submits assignments and exams. |
| **Parent / ولي الأمر** | Guardian user who accesses student academic standing, evaluations, notes, grades, assignment status, attendance records, and notifications. |
| **Secretariat / السكرتارية** | Administrative role explicitly identified in the product scope. *(Responsibilities: `TBD — Requires Product Clarification`)* |

---

## 7. High-Level Business Requirements

### BR-001 — Student Management
- **Description**: The system shall support the management and representation of student-related information, parent contact data, student status, and group/grade associations within the defined product scope.
- **Supported Backlog Capabilities**:
  - `بيانات الطالب` (Student Data)
  - `بيانات ولي الامر` (Parent Data)
  - `حالة الطلاب` (Student Status)
  - `المجموعة و الصف` (Group and Grade/Class)
- **Business Scope**: High-level data association and status representation. Exact field schemas and validation rules belong to downstream technical specifications.

---

### BR-002 — Group & Lesson Management
- **Description**: The system shall support the creation and management of educational groups, student group enrollment, and lesson scheduling within the defined product scope.
- **Supported Backlog Capabilities**:
  - `انشاء مجموعة` (Create Group)
  - `اضافة طلاب` (Add Students)
  - `تحديد مواعيد الدروس` (Schedule Lesson Times)
- **Business Scope**: Group creation, student membership assignment, and schedule timing.

---

### BR-003 — Attendance & Absence Management
- **Description**: The system shall support recording and reporting student attendance and absence records within the defined product scope.
- **Supported Backlog Capabilities**:
  - `تسجيل حضور الطلاب` (Record Student Attendance)
  - `تسجيل الغياب` (Record Absence)
  - `تقارير الحضور و الغياب` (Attendance and Absence Reports)
- **Business Scope**: Logging attendance status per student/session and providing summarized reports.

---

### BR-004 — Educational Content Management
- **Description**: The system shall support the management, uploading, and availability of educational files, references, summaries, and lecture recordings, as well as tracking content viewing.
- **Supported Backlog Capabilities**:
  - `رفع الملفات و المراجع و الملخصات` (Upload Files, References, and Summaries)
  - `رفع تسجيلات المحاضرات` (Upload Lecture Recordings)
  - `متابعة مشاهدة المحتوى` (Track Content Viewing)
- **Business Scope**: Making instructional assets available to students and capturing viewing engagement.

---

### BR-005 — Assignments & Exams Management
- **Description**: The system shall support the creation, uploading, distribution, and student submission of assignments and examinations within the defined product scope.
- **Supported Backlog Capabilities**:
  - `انشاء الواجبات` (Create Assignments)
  - `رفع الواجبات` (Upload Assignments)
  - `انشاء الامتحانات` (Create Exams)
  - `رفع الامتحانات` (Upload Exams)
  - `تسليم الواجبات و الامتحانات` (Submit Assignments and Exams)
- **Business Scope**: Authoring, attaching, distributing, and receiving student submissions for academic assessments.

---

### BR-006 — Automatic Exam Grading
- **Description**: The system shall support automatic grading of submitted student examinations where explicitly required by the product scope.
- **Supported Backlog Capabilities**:
  - `تصحيح الدرجات تلقائي` (Automatic Grading)
- **Business Scope**: Automated grading specifically for examinations.
- **Important Constraint**: Automatic grading is specified exclusively for exams; assignments are not automatically graded. No grading algorithms, scoring methods, partial credit logic, or grading thresholds are assumed.

---

### BR-007 — Parent Student Status Visibility
- **Description**: The system shall provide parents with visibility into defined student academic information, evaluation records, and performance metrics.
- **Supported Backlog Capabilities**:
  - `عرض النتائج لي ولي الامر` (Display Results to Parent)
  - `تقييمات + ملاحظات المدرس` (Teacher Evaluations and Notes)
  - `حالة الواجبات` (Assignments Status)
  - `درجات الامتحانات` (Exam Grades)
  - `الحضور و الغياب` (Attendance and Absence)
  - `مستوى الطالب` (Student Level)
- **Business Scope**: Informational transparency for parents regarding their child's academic progress and attendance standing. Student level is a confirmed product concept whose definition is `TBD — Requires Product Clarification`.

---

### BR-008 — Notifications
- **Description**: The system shall support the notification capabilities explicitly defined in the product scope.
- **Supported Backlog Capabilities**:
  - `اشعار قبل الحصة ب ساعه` (Notification One Hour Before Lesson)
  - `اشعار في حالة عدم حل الواجب` (Notification for Unsolved Assignment)
  - `اشعار امتحان جديد` (New Exam Notification)
  - `اشعار درجة امتحان الطالب` (Student Exam Grade Notification)
  - `اشعارات في حالة غياب الطالب` (Student Absence Notifications)
- **Business Scope**: Providing notifications for lesson reminders, unsolved assignments, new exams, exam grades, and student absences.
- **Important Constraint**: Notification delivery channels (e.g., in-app, SMS, email, WhatsApp, push) and recipient routing are not assumed and remain `TBD — Requires Product Clarification`.

---

### BR-009 — Users & Roles
- **Description**: The system shall support the four user roles explicitly identified in the product scope: Teacher, Student, Parent, and Secretariat.
- **Supported Backlog Capabilities**:
  - `المدرس` (Teacher)
  - `الطالب` (Student)
  - `ولي الامر` (Parent)
  - `السكرتارية` (Secretariat)
- **Business Scope**: Role identification and foundational role-based system access.
- **Important Constraint**: Detailed role permissions and administrative delegation boundaries are undefined (`TBD — Requires Product Clarification`).

---

### BR-010 — Student Payment Status
- **Description**: The system shall support tracking and displaying the payment status for each student.
- **Supported Backlog Capabilities**:
  - `حالة الدفع لكل طالب` (Payment Status for Each Student)
- **Business Scope**: Visibility into individual student payment status.
- **Important Constraint**: Payment gateways, online transactions, invoices, fee structures, payment amounts, currencies, subscription plans, billing cycles, and accounting workflows are not part of the currently approved scope (`TBD — Requires Product Clarification`).

---

## 8. Business Scope

### In Scope
The business scope comprises exclusively the nine confirmed product modules:
1. **Student Management**
2. **Attendance & Absence**
3. **Lectures & Lessons**
4. **Exams & Assignments**
5. **Parent Student Status**
6. **Notifications**
7. **Groups Management**
8. **Users & Permissions**
9. **Subscriptions / Student Payment Status**

### Out of Scope
Any business capability, operational workflow, or feature not represented in the approved product backlog is currently **Out of Scope** unless formally reviewed and approved in subsequent backlog versions. This includes, but is not limited to:
- Integrated payment gateways, online billing, or invoice generation.
- Real-time video conferencing / live streaming infrastructure.
- Social networking or direct inter-student chat.
- Advanced predictive analytics or AI-driven tutoring engines.
- Third-party school administrative ERP integrations.

---

## 9. Business Constraints

The following business constraints represent known areas where boundaries or definitions remain open:

1. **Secretariat Responsibilities**: The operational scope, administrative duties, and specific permissions of the Secretariat role are undefined (`TBD — Requires Product Clarification`).
2. **Role Responsibility Boundaries**: The exact division of administrative tasks between Teachers and Secretariat (e.g., student enrollment, schedule creation, attendance logging) is not demarcated.
3. **Notification Recipients & Channels**: The exact recipient routing and delivery transport channels are not specified in the backlog (`TBD — Requires Product Clarification`).
4. **Student Assessment Submission Workflows**: File format constraints, submission deadlines, retry policies, and late submission handling are undefined.
5. **Student Level Definition**: Student level (`مستوى الطالب`) is a confirmed product concept; its calculation methodology, rubric, or scale is undefined (`TBD — Requires Product Clarification`).
6. **Payment Status Lifecycle**: The valid states (e.g., Paid, Unpaid) and update workflows for student payment status are undefined.
7. **Performance & Volume Targets**: Specific concurrent user targets, storage quotas, and throughput requirements are undefined.

---

## 10. Business Rules Status

Detailed domain logic, entity relationships, validation concepts, and architectural processing boundaries are documented in:
- [docs/03-Architecture/business-logic.md](file:///d:/el_awal/docs/03-Architecture/business-logic.md)

This Business Requirements Document defines high-level product capabilities and does not duplicate or redefine granular business logic rules.

---

## 11. Business Success Criteria

### Currently Defined Success Criteria
The product is successful at the business requirement level when all approved backlog capabilities across the nine modules are available and operational as specified:
- Instructors and administrators can manage students, groups, schedules, attendance, content, and assessments.
- Students can access educational assets and submit assignments and exams.
- Automated grading executes for submitted examinations.
- Parents have access to student academic records, notes, grades, assignment status, and attendance.
- Defined schedule reminders and academic alert notifications are provided.
- Student payment statuses are tracked and represented within the system.

> **Measurable Business KPIs**: Quantitative targets (such as customer acquisition numbers, revenue targets, active user retention percentages, or satisfaction benchmarks) are not defined in the source documentation (`TBD — Requires Product Clarification`).

---

## 12. Assumptions

The following assumptions apply strictly to the documentation baseline:
1. **Confirmed Roles**: The four roles listed in the backlog (`المدرس`, `الطالب`, `ولي الامر`, `السكرتارية`) represent all primary human actors interacting with the product scope.
2. **Approved Scope**: The nine modules and 35 distinct backlog items represent the complete and authorized baseline product scope.
3. **Traceability**: All functional specifications, user stories, and architecture designs derive directly from this product scope without introducing external assumptions.

---

## 13. Open Business Decisions

The following business-level decisions require formal product clarification:

1. **Secretariat Responsibilities**: Define the exact operational functions, workflows, and administrative authority assigned to the Secretariat role.
2. **Teacher vs. Secretariat Responsibility Boundaries**: Determine whether administrative tasks (adding students, creating groups, recording attendance, tracking payment status) are performed by Teachers, Secretariat, or both.
3. **Student Submission Workflow**: Define file formats, size limitations, due dates, grace periods, and retry policies for assignment and exam submissions.
4. **Parent Access Method**: Define the interaction mechanism and credential model for parents to access student status and reports.
5. **Notification Recipients**: Specify the exact recipient(s) for each notification type.
6. **Notification Delivery Channels**: Define the delivery channels (in-app, SMS, email, WhatsApp, push notifications) supported for each notification type.
7. **Payment Status Definitions**: Define the permissible values and lifecycle transitions for student payment status.
8. **Student Level Definition**: Clarify the definition and evaluation basis for student level (`مستوى الطالب`).
9. **Business Success Criteria**: Establish formal quantitative business KPIs, operational metrics, and target adoption benchmarks.

---

## 14. Business Requirements Traceability

| BR ID | Business Requirement | Backlog Item(s) | FR ID(s) | User Story ID(s) | Status |
|---|---|---|---|---|---|
| **BR-001** | Student Management | `بيانات الطالب` | `FR-STU-004` | `US-STU-001` | Partially Defined |
| **BR-001** | Student Management | `المجموعة و الصف` | `FR-STU-002` | `US-STU-001` | Partially Defined |
| **BR-001** | Student Management | `بيانات ولي الامر` | `FR-STU-003` | `US-STU-002` | Partially Defined |
| **BR-001** | Student Management | `حالة الطلاب` | `FR-STU-001` | `US-STU-003` | Partially Defined |
| **BR-002** | Group & Lesson Management | `انشاء مجموعة` | `FR-GRP-003` | `US-GRP-001` | Partially Defined |
| **BR-002** | Group & Lesson Management | `تحديد مواعيد الدروس` | `FR-GRP-001` | `US-GRP-001` | Partially Defined |
| **BR-002** | Group & Lesson Management | `اضافة طلاب` | `FR-GRP-002` | `US-GRP-002` | Partially Defined |
| **BR-003** | Attendance & Absence Management | `تسجيل حضور الطلاب` | `FR-ATT-003` | `US-ATT-001` | Partially Defined |
| **BR-003** | Attendance & Absence Management | `تسجيل الغياب` | `FR-ATT-002` | `US-ATT-001` | Partially Defined |
| **BR-003** | Attendance & Absence Management | `تقارير الحضور و الغياب` | `FR-ATT-001` | `US-ATT-002` | Partially Defined |
| **BR-004** | Educational Content Management | `رفع الملفات و المراجع و الملخصات` | `FR-LES-002` | `US-LES-001` | Partially Defined |
| **BR-004** | Educational Content Management | `رفع تسجيلات المحاضرات` | `FR-LES-003` | `US-LES-001` | Partially Defined |
| **BR-004** | Educational Content Management | `متابعة مشاهدة المحتوى` | `FR-LES-001` | `US-LES-002` | Partially Defined |
| **BR-005** | Assignments & Exams Management | `انشاء الواجبات` | `FR-EXM-005` | `US-EXM-001` | Partially Defined |
| **BR-005** | Assignments & Exams Management | `رفع الواجبات` | `FR-EXM-004` | `US-EXM-001` | Partially Defined |
| **BR-005** | Assignments & Exams Management | `انشاء الامتحانات` | `FR-EXM-007` | `US-EXM-001` | Partially Defined |
| **BR-005** | Assignments & Exams Management | `رفع الامتحانات` | `FR-EXM-006` | `US-EXM-001` | Partially Defined |
| **BR-005** | Assignments & Exams Management | `تسليم الواجبات و الامتحانات` | `FR-EXM-003` | `US-EXM-002` | Defined |
| **BR-006** | Automatic Exam Grading | `تصحيح الدرجات تلقائي` | `FR-EXM-002` | `US-EXM-003` | Partially Defined |
| **BR-007** | Parent Student Status Visibility | `عرض النتائج لي ولي الامر` | `FR-EXM-001` | `US-EXM-004` | Defined |
| **BR-007** | Parent Student Status Visibility | `تقييمات + ملاحظات المدرس` | `FR-PAR-001` | `US-PAR-001` | Defined |
| **BR-007** | Parent Student Status Visibility | `درجات الامتحانات` | `FR-PAR-003` | `US-PAR-001` | Defined |
| **BR-007** | Parent Student Status Visibility | `مستوى الطالب` | `FR-PAR-005` | `US-PAR-001` | Partially Defined |
| **BR-007** | Parent Student Status Visibility | `حالة الواجبات` | `FR-PAR-002` | `US-PAR-002` | Defined |
| **BR-007** | Parent Student Status Visibility | `الحضور و الغياب` | `FR-PAR-004` | `US-PAR-002` | Defined |
| **BR-008** | Notifications | `اشعار قبل الحصة ب ساعه` | `FR-NOT-001` | `US-NOT-001` | Partially Defined |
| **BR-008** | Notifications | `اشعار في حالة عدم حل الواجب` | `FR-NOT-002` | `US-NOT-002` | Partially Defined |
| **BR-008** | Notifications | `اشعار امتحان جديد` | `FR-NOT-004` | `US-NOT-003` | Partially Defined |
| **BR-008** | Notifications | `اشعار درجة امتحان الطالب` | `FR-NOT-003` | `US-NOT-003` | Partially Defined |
| **BR-008** | Notifications | `اشعارات في حالة غياب الطالب` | `FR-NOT-005` | `US-NOT-004` | Partially Defined |
| **BR-009** | Users & Roles | `المدرس` | `FR-USR-004` | `US-USR-001` | Defined |
| **BR-009** | Users & Roles | `الطالب` | `FR-USR-003` | `US-USR-001` | Defined |
| **BR-009** | Users & Roles | `ولي الامر` | `FR-USR-002` | `US-USR-001` | Defined |
| **BR-009** | Users & Roles | `السكرتارية` | `FR-USR-001` | `US-USR-001` | Partially Defined |
| **BR-010** | Student Payment Status | `حالة الدفع لكل طالب` | `FR-SUB-001` | `US-SUB-001` | Partially Defined |

---

## 15. Business Requirements vs Functional Requirements

To ensure clear separation of concerns across product documentation:

| Dimension | Business Requirements (`BRD`) | Functional Requirements (`FRD`) |
|---|---|---|
| **Primary Question** | **Why & What capability?** | **How does the system behave?** |
| **Focus** | High-level business capabilities, organizational objectives, and product scope. | Detailed functional behavior, inputs, outputs, preconditions, and system interactions. |
| **Audience** | Product Managers, Stakeholders, Business Owners, Lead Architects. | Developers, QA Engineers, UX Designers, System Implementers. |
| **Granularity** | Coarse-grained capability blocks (`BR-001` to `BR-010`). | Fine-grained requirement statements (`FR-STU-001`, `FR-ATT-001`, etc.). |
| **Technical Content** | Zero technical, schema, or endpoint details. | Concrete behavior, validation triggers, and acceptance conditions. |
