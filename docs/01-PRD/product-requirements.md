# Product Requirements Document (PRD)

## 1. Document Overview

### 1.1 Purpose
This Product Requirements Document (PRD) serves as the central product specification for the **Educational Management System for Teachers and Students** (El Awal). It translates high-level business goals into concrete product capabilities, establishing explicit end-to-end traceability across business requirements, functional behaviors, user stories, use cases, acceptance criteria, and quality assurance test cases.

### 1.2 Product Overview
The platform is an educational management and learning support system designed to streamline core instructional, administrative, and communication workflows among four confirmed stakeholder groups: **Teachers (`المدرس`)**, **Students (`الطالب`)**, **Parents (`ولي الأمر`)**, and **Secretariat (`السكرتارية`)**.

### 1.3 Target Users
- **Instructors / Teachers**: Manage groups, schedules, educational files, lectures, assignments, exams, attendance, and student performance feedback.
- **Learners / Students**: Access instructional materials and lecture recordings, submit homework and exams, and receive grades and notifications.
- **Guardians / Parents**: Monitor student attendance, exam scores, homework completion statuses, teacher notes, and academic levels.
- **Administrative Staff / Secretariat**: Perform operational student administration, group enrollment, and student payment status tracking.

### 1.4 Product Goals
1. Centralize student profiles, contact details, status, and group allocations in a unified system.
2. Provide simple, low-friction attendance and absence recording and reporting, including unique student QR code provisioning and fast teacher QR code scanning.
3. Facilitate seamless digital delivery of educational files, summaries, references, and lecture recordings.
4. Support the full lifecycle of assignments and examinations, including automated exam grading.
5. Provide parents with direct visibility into student academic progress and attendance standing.
6. Deliver timely notifications for schedule reminders, unsolved assignments, new assessments, grades, and absences.
7. Maintain clear, role-based visibility across Teachers, Students, Parents, and Secretariat.
8. Track individual student payment status within the educational operational context.

### 1.5 Document Scope
This document covers the complete functional scope of the nine approved product modules. It explicitly defines what the product must accomplish without prescribing internal database schemas, API payload structures, or backend framework implementations.

### 1.6 Relationship with Other Documentation
```text
┌──────────────────────────────────────────────────────────────────────────┐
│                   01-PRD/business-requirements.md                       │
│                   (Why & What Business Capabilities)                     │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────┐
│                   01-PRD/product-requirements.md                        │
│                   (Central PRD, Scope & Acceptance Criteria)             │
└──────┬─────────────────────────────┬──────────────────────────────┬──────┘
       │                             │                              │
┌──────▼─────────────────────┐ ┌─────▼──────────────────────┐ ┌─────▼──────┐
│  functional-requirements.md│ │  02-UX/user-stories.md     │ │  use-cases.│
│  (System Behaviors)        │ │  (User Value & Narratives) │ │  (Flows)   │
└──────┬─────────────────────┘ └─────┬──────────────────────┘ └─────┬──────┘
       │                             │                              │
┌──────▼─────────────────────────────▼──────────────────────────────▼──────┐
│                   04-Test/test-cases.md & test-plan.md                   │
│                   (Formal Verification & Acceptance Testing)             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Product Vision

### 2.1 The Problem
Educational practitioners (teachers and administrative staff) require a centralized, structured system to manage student data, group schedules, attendance, content delivery, assessments, and parent communications. Without a unified system, information regarding student absences, pending assignments, exam results, and payment statuses becomes fragmented and difficult to track.

### 2.2 Target Audience
- **Primary Beneficiaries**: Teachers seeking workflow efficiency; Students seeking clear access to learning materials and assessment submissions; Parents seeking transparent visibility into their children's progress.
- **Administrative Beneficiaries**: Secretariat staff managing student records, group assignments, and payment statuses.

### 2.3 Expected Value
- **Operational Efficiency**: Streamlined group scheduling, rapid QR-based and manual attendance logging, and digital assignment/exam management.
- **Academic Transparency**: Immediate access for parents to exam grades, evaluations, notes, and attendance records.
- **Learning Continuity**: Centralized access for students to lecture recordings, files, summaries, and references.

### 2.4 Desired Product Outcome
A dependable, role-aware educational management platform where administrative, educational, and parental tracking tasks are integrated seamlessly across all nine core modules.

---

## 3. Product Goals

| Goal ID | Product Goal | Description | Success Indicator |
|---|---|---|---|
| **GOAL-001** | Student Profile Centralization | Enable structured capture and viewing of student data, parent data, student status, and group/class assignments. | All 4 student data entities represented and retrievable in the system. |
| **GOAL-002** | Group & Schedule Organization | Enable creation of educational groups, student roster assignment, and lesson time scheduling. | Groups created with assigned students and scheduled lesson times. |
| **GOAL-003** | Attendance & Absence Tracking | Enable logging of attendance and absence per student/session (via direct roster entry and teacher scanning of unique student QR codes) and generation of attendance reports. | Attendance records logged accurately via manual entry and QR scans; absence reports generated. |
| **GOAL-004** | Educational Asset Distribution | Provide capabilities to upload and access files, summaries, references, and lecture recordings with content viewing tracking. | Educational assets successfully uploaded and accessible to enrolled students. |
| **GOAL-005** | Assessment Lifecycle Delivery | Support creation, upload, distribution, and student submission of assignments and exams. | Students able to deliver submissions for active assignments and exams. |
| **GOAL-006** | Automated Exam Grading | Provide automated evaluation and grade assignment for submitted student examinations. | Submitted exams evaluated and graded automatically. |
| **GOAL-007** | Parental Progress Transparency | Provide parents with direct visibility into student results, evaluations, notes, grades, assignment status, and attendance. | Parents successfully access all 6 defined academic standing items. |
| **GOAL-008** | Timely Academic Notifications | Deliver event notifications for pre-lesson reminders, unsolved homework, new exams, exam grades, and student absences. | Notifications triggered for all 5 confirmed event conditions. |
| **GOAL-009** | Role-Aware Access Support | Represent and maintain access boundaries across Teacher, Student, Parent, and Secretariat roles. | All 4 confirmed roles represented in system operations. |
| **GOAL-010** | Student Payment Tracking | Provide clear tracking and display of individual student payment status. | Student payment status represented and visible to authorized roles. |

---

## 4. Target Users

| User Persona | Role | Main Responsibilities | Main Goals | Key Needs | Persona Ref |
|---|---|---|---|---|---|
| **Teacher (`المدرس`)** | Primary Educator | Creates groups, sets schedules, uploads educational files and lecture recordings, authors assignments/exams, logs attendance (including scanning student QR codes), and writes evaluations. | Maximize instructional time; maintain accurate records; track student progress. | Fast attendance entry & QR scanning, easy material uploads, organized grading. | [UX-PER-001](file:///d:/el_awal/docs/02-UX/user-personas.md#L27-L68) |
| **Student (`الطالب`)** | Primary Learner | Reviews lesson materials, watches lecture recordings, presents unique QR code for session attendance, submits assignments and exams, checks grades. | Complete academic tasks on time; access learning resources easily. | Unique QR attendance code, clear deadlines, easy submission interface, immediate grade access. | [UX-PER-002](file:///d:/el_awal/docs/02-UX/user-personas.md#L69-L108) |
| **Parent (`ولي الأمر`)** | Guardian / Monitor | Reviews student grades, evaluations, teacher notes, assignment completion status, and attendance. | Stay informed about child's academic standing and attendance. | Transparent, clear summary of student results and attendance. | [UX-PER-003](file:///d:/el_awal/docs/02-UX/user-personas.md#L109-L151) |
| **Secretariat (`السكرتارية`)** | Operational Admin | Administrative support role identified in product scope. *(Detailed duties: `TBD`)* | Support administrative workflows; manage student data and payment status. | Roster management, payment status visibility, group enrollment. | [UX-PER-004](file:///d:/el_awal/docs/02-UX/user-personas.md#L152-L190) |

---

## 5. Product Scope

### 5.1 In Scope
The product scope encompasses exclusively the nine confirmed product modules:
1. **Student Management**: Student profiles, parent contact data, student status, and group/grade associations.
2. **Attendance & Absence**: Recording student attendance (including unique student QR code provisioning and teacher QR code scanning), recording absences, and attendance/absence reporting.
3. **Lectures & Lessons**: Uploading files, references, summaries, lecture recordings, and tracking content viewing.
4. **Exams & Assignments**: Creating/uploading assignments and exams, student submissions, automatic exam grading, and displaying results to parents.
5. **Parent Student Status**: Parent access to evaluations, teacher notes, exam grades, student level, assignment status, and attendance records.
6. **Notifications**: Delivery of alerts for 1-hour pre-lesson reminders, unsolved homework, new exams, exam grades, and student absences.
7. **Groups Management**: Group creation, lesson time scheduling, and adding students to groups.
8. **Users & Permissions**: Representation of the four confirmed user roles (Teacher, Student, Parent, Secretariat).
9. **Subscriptions / Payment Status**: Tracking and viewing individual student payment status.

### 5.2 Out of Scope
The following capabilities are explicitly outside the current approved product scope:
- Payment gateway integration, credit card processing, automated recurring billing, and invoice generation (`TBD`).
- Real-time video conferencing / live interactive virtual classrooms (`TBD`).
- Peer-to-peer social networking and student chat channels (`TBD`).
- Complex custom formula gradebooks, GPA weighting engines, and external school ERP synchronizations (`TBD`).
- Third-party learning analytics engines (`TBD`).

---

## 6. Product Modules

| Module Name | Purpose | Primary Users | Main Capabilities | Related BR | Related FR | Related UC |
|---|---|---|---|---|---|---|
| **1. Student Management** | Centralize student and parent profiles and academic groupings. | Teacher, Secretariat | Student data, parent data, student status, group and grade/class. | `BR-001` | `FR-STU-001..004` | `UC-STU-001..003` |
| **2. Attendance & Absence** | Capture and report session-level student presence and absence. | Teacher, Secretariat | Generate unique student QR codes, scan QR codes to log attendance, log attendance, log absence, generate attendance/absence reports. | `BR-003` | `FR-ATT-001..004` | `UC-ATT-001..003` |
| **3. Lectures & Lessons** | Distribute instructional materials and lecture recordings. | Teacher, Student | Upload files, references, summaries, recordings; track content viewing. | `BR-004` | `FR-LES-001..003` | `UC-LES-001..002` |
| **4. Exams & Assignments** | Author, distribute, receive, and automatically grade assessments. | Teacher, Student | Create/upload homework and exams, student submission, auto-grading exams. | `BR-005`, `BR-006`, `BR-007` | `FR-EXM-001..007` | `UC-EXM-001..004` |
| **5. Parent Student Status** | Provide parent visibility into student performance and attendance. | Parent | View evaluations, notes, exam grades, student level, assignment status, attendance. | `BR-007` | `FR-PAR-001..005` | `UC-PAR-001..002` |
| **6. Notifications** | Broadcast event-driven reminders and academic alerts. | All Roles | Pre-lesson reminder, unsolved homework alert, exam notice, grade notice, absence alert. | `BR-008` | `FR-NOT-001..005` | `UC-NOT-001..004` |
| **7. Groups Management** | Structure educational cohorts and schedule recurring lesson times. | Teacher, Secretariat | Create group, schedule lesson times, add students to groups. | `BR-002` | `FR-GRP-001..003` | `UC-GRP-001..002` |
| **8. Users & Permissions** | Represent the four authorized system personas. | All Roles | Representation of Teacher, Student, Parent, and Secretariat entities. | `BR-009` | `FR-USR-001..004` | `UC-USR-001` |
| **9. Subscriptions** | Track individual student fee/payment standing. | Secretariat, Teacher | Representation and viewing of payment status for each student. | `BR-010` | `FR-SUB-001` | `UC-SUB-001` |

---

## 7. Product Requirements

### PRD-001: Student Profile & Academic Group Association
- **Requirement**: The system shall allow authorized users to manage and view student data, associated parent data, student status, and group/grade classification.
- **Description**: Centralizes student demographic details, parent contact linkage, enrollment status, and assigned class/group hierarchy.
- **Priority**: Must Have
- **User/Actor**: Teacher / Secretariat (`TBD — Requires Product Clarification`)
- **Related Business Requirement**: `BR-001`
- **Related Functional Requirements**: `FR-STU-001`, `FR-STU-002`, `FR-STU-003`, `FR-STU-004`
- **Related Use Cases**: `UC-STU-001`, `UC-STU-002`, `UC-STU-003`
- **Acceptance Criteria**: `AC-001`, `AC-002`, `AC-003`

---

### PRD-002: Group Formation & Lesson Scheduling
- **Requirement**: The system shall allow authorized users to create educational groups, schedule lesson times, and assign students to groups.
- **Description**: Enables instructors or administrative staff to define group cohorts, associate scheduled lesson times, and manage student group rosters.
- **Priority**: Must Have
- **User/Actor**: Teacher / Secretariat (`TBD — Requires Product Clarification`)
- **Related Business Requirement**: `BR-002`
- **Related Functional Requirements**: `FR-GRP-001`, `FR-GRP-002`, `FR-GRP-003`
- **Related Use Cases**: `UC-GRP-001`, `UC-GRP-002`
- **Acceptance Criteria**: `AC-004`, `AC-005`

---

### PRD-003: Attendance & Absence Management
- **Requirement**: The system shall allow recording of student attendance (including unique student QR code generation and teacher QR code scanning), recording of student absences, and generation of attendance and absence reports.
- **Description**: Provisions a unique QR code for each student, enables teachers to scan student QR codes to instantly verify and record attendance for a specific session, captures manual presence and absence records, and provides summarized reporting for review.
- **Priority**: Must Have
- **User/Actor**: Teacher / Secretariat (`TBD — Requires Product Clarification`), Student (QR presentation)
- **Related Business Requirement**: `BR-003`
- **Related Functional Requirements**: `FR-ATT-001`, `FR-ATT-002`, `FR-ATT-003`, `FR-ATT-004`
- **Related Use Cases**: `UC-ATT-001`, `UC-ATT-002`, `UC-ATT-003`
- **Acceptance Criteria**: `AC-006`, `AC-007`, `AC-025`

---

### PRD-004: Educational Content & Media Distribution
- **Requirement**: The system shall allow uploading of educational files, references, summaries, and lecture recordings, and track content viewing.
- **Description**: Provides an instructional repository where educational assets and recorded lectures can be published and accessed by students, with viewing activity tracked.
- **Priority**: Must Have
- **User/Actor**: Teacher (Upload), Student (Access), Teacher/Admin (Monitor Viewing)
- **Related Business Requirement**: `BR-004`
- **Related Functional Requirements**: `FR-LES-001`, `FR-LES-002`, `FR-LES-003`
- **Related Use Cases**: `UC-LES-001`, `UC-LES-002`
- **Acceptance Criteria**: `AC-008`, `AC-009`, `AC-010`

---

### PRD-005: Assignment & Exam Lifecycle Management
- **Requirement**: The system shall allow creation and uploading of assignments and exams, and enable students to submit their completed assignments and exams.
- **Description**: Handles authoring, file attachment, publishing, and digital submission delivery for both homework assignments and examinations.
- **Priority**: Must Have
- **User/Actor**: Teacher (Create/Upload), Student (Submit)
- **Related Business Requirement**: `BR-005`
- **Related Functional Requirements**: `FR-EXM-003`, `FR-EXM-004`, `FR-EXM-005`, `FR-EXM-006`, `FR-EXM-007`
- **Related Use Cases**: `UC-EXM-001`, `UC-EXM-002`
- **Acceptance Criteria**: `AC-011`, `AC-012`, `AC-013`

---

### PRD-006: Automatic Examination Grading
- **Requirement**: The system shall automatically correct and grade submitted student examinations.
- **Description**: Provides automated scoring for exam submissions upon receipt, generating instant score records. *(Applies strictly to exams; assignments are not automatically graded).*
- **Priority**: Must Have
- **User/Actor**: System / Authorized Evaluator (`TBD — Requires Product Clarification`)
- **Related Business Requirement**: `BR-006`
- **Related Functional Requirements**: `FR-EXM-002`
- **Related Use Cases**: `UC-EXM-003`
- **Acceptance Criteria**: `AC-014`

---

### PRD-007: Parent Visibility into Student Academic Standing
- **Requirement**: The system shall provide parents with access to student exam results, teacher evaluations, teacher notes, assignment completion status, attendance records, and student level.
- **Description**: Delivers a dedicated monitoring view for parents to review all key academic and behavioral standing indicators for their child.
- **Priority**: Must Have
- **User/Actor**: Parent (`ACT-003`)
- **Related Business Requirement**: `BR-007`
- **Related Functional Requirements**: `FR-EXM-001`, `FR-PAR-001`, `FR-PAR-002`, `FR-PAR-003`, `FR-PAR-004`, `FR-PAR-005`
- **Related Use Cases**: `UC-EXM-004`, `UC-PAR-001`, `UC-PAR-002`
- **Acceptance Criteria**: `AC-015`, `AC-016`, `AC-017`

---

### PRD-008: Event-Driven Academic Notifications
- **Requirement**: The system shall provide notification alerts for: (1) one hour before a lesson, (2) unsolved homework, (3) new exam publication, (4) student exam grades, and (5) student absence.
- **Description**: Dispatches event notifications corresponding to critical academic milestones and attendance events.
- **Priority**: Must Have
- **User/Actor**: Designated Recipients (`TBD — Requires Product Clarification`)
- **Related Business Requirement**: `BR-008`
- **Related Functional Requirements**: `FR-NOT-001`, `FR-NOT-002`, `FR-NOT-003`, `FR-NOT-004`, `FR-NOT-005`
- **Related Use Cases**: `UC-NOT-001`, `UC-NOT-002`, `UC-NOT-003`, `UC-NOT-004`
- **Acceptance Criteria**: `AC-018`, `AC-019`, `AC-020`, `AC-021`, `AC-022`

---

### PRD-009: User Role Entity Representation
- **Requirement**: The system shall represent and support the four confirmed user roles: Teacher, Student, Parent, and Secretariat.
- **Description**: Ensures the four stakeholder entities exist within the system to anchor permissions and role-specific workflows.
- **Priority**: Must Have
- **User/Actor**: Teacher, Student, Parent, Secretariat
- **Related Business Requirement**: `BR-009`
- **Related Functional Requirements**: `FR-USR-001`, `FR-USR-002`, `FR-USR-003`, `FR-USR-004`
- **Related Use Cases**: `UC-USR-001`
- **Acceptance Criteria**: `AC-023`

---

### PRD-010: Student Payment Status Tracking
- **Requirement**: The system shall support tracking and displaying the payment status for each student.
- **Description**: Provides visibility into whether a student's payment status is recorded and up to date within the administrative scope.
- **Priority**: Must Have
- **User/Actor**: Secretariat / Teacher (`TBD — Requires Product Clarification`)
- **Related Business Requirement**: `BR-010`
- **Related Functional Requirements**: `FR-SUB-001`
- **Related Use Cases**: `UC-SUB-001`
- **Acceptance Criteria**: `AC-024`

---

## 8. User Journey & Core Product Flows

### 8.1 Teacher Core Journey
```text
Teacher Access [Auth TBD]
  │
  ├──► Groups & Scheduling: Create Group ──► Add Students ──► Schedule Lesson Times
  │
  ├──► Attendance: Select Group/Session ──► Scan Student QR Code / Log Attendance & Absence ──► View Reports
  │
  ├──► Content: Upload Files, Summaries, References, Lecture Recordings ──► Monitor Viewing
  │
  └──► Assessments: Create/Upload Assignment & Exam ──► Review Submissions ──► Provide Notes/Evaluations
```

### 8.2 Student Core Journey
```text
Student Access [Auth TBD]
  │
  ├──► Attendance Check-in: Open Student Profile / Digital Card ──► Present Unique QR Code to Teacher
  │
  ├──► Learning: Access Files, Summaries, References ──► Watch Lecture Recordings
  │
  ├──► Assessments: View Assignment / Exam ──► Deliver Submission ──► View Graded Exam Results
  │
  └──► Notifications: Receive 1-Hr Lesson Reminder, New Exam Alert, Grade Release Notice
```

### 8.3 Parent Core Journey
```text
Parent Access [Auth / Linkage TBD]
  │
  ├──► Progress Review: View Student Level ──► View Exam Grades & Teacher Notes/Evaluations
  │
  ├──► Attendance & Homework: View Session Attendance Records ──► Check Assignment Status
  │
  └──► Notifications: Receive Absence Alerts & Unsolved Homework Alerts
```

### 8.4 Secretariat Core Journey
```text
Secretariat Access [Auth TBD]
  │
  ├──► Student Administration: Manage Student Data, Parent Data & Group/Class Linkage
  │
  └──► Subscriptions: View and Track Payment Status for Each Student
```

---

## 9. Business Rules Summary

High-level business rules derived from the approved product documentation (detailed logic in [docs/03-Architecture/business-logic.md](file:///d:/el_awal/docs/03-Architecture/business-logic.md)):

1. **Role Separation**: System functionality is organized across four distinct personas: Teacher, Student, Parent, and Secretariat.
2. **Assessment Differentiation**:
   - **Exams**: Can be created, uploaded, submitted by students, and are **automatically graded**.
   - **Assignments**: Can be created, uploaded, and submitted by students; automatic grading is **not** specified for assignments.
3. **Parent Visibility Boundaries**: Parents have view access specifically to: results, teacher evaluations, teacher notes, exam grades, student level, assignment completion status, and attendance/absence records.
4. **Notification Triggers**: Notifications are triggered by five specific event states: (1) 1 hour prior to a lesson, (2) unsolved assignment, (3) new exam published, (4) exam grade ready, (5) student absence logged.
5. **Payment Scope**: The system tracks and displays student payment status (`حالة الدفع لكل طالب`) as a record without executing payment transactions or managing billing plans.

---

## 10. Functional Requirements Mapping

| Product Requirement | Functional Requirement ID | Backlog Item | Use Case ID | User Story ID |
|---|---|---|---|---|
| **PRD-001** | `FR-STU-004` | `بيانات الطالب` | `UC-STU-001` | `US-STU-001` |
| **PRD-001** | `FR-STU-002` | `المجموعة و الصف` | `UC-STU-001` | `US-STU-001` |
| **PRD-001** | `FR-STU-003` | `بيانات ولي الامر` | `UC-STU-002` | `US-STU-002` |
| **PRD-001** | `FR-STU-001` | `حالة الطلاب` | `UC-STU-003` | `US-STU-003` |
| **PRD-002** | `FR-GRP-003` | `انشاء مجموعة` | `UC-GRP-001` | `US-GRP-001` |
| **PRD-002** | `FR-GRP-001` | `تحديد مواعيد الدروس` | `UC-GRP-001` | `US-GRP-001` |
| **PRD-002** | `FR-GRP-002` | `اضافة طلاب` | `UC-GRP-002` | `US-GRP-002` |
| **PRD-003** | `FR-ATT-003` | `تسجيل حضور الطلاب` | `UC-ATT-001` | `US-ATT-001` |
| **PRD-003** | `FR-ATT-004` | `تسجيل الحضور عبر مسح QR Code` | `UC-ATT-003` | `US-ATT-003` |
| **PRD-003** | `FR-ATT-002` | `تسجيل الغياب` | `UC-ATT-001` | `US-ATT-001` |
| **PRD-003** | `FR-ATT-001` | `تقارير الحضور و الغياب` | `UC-ATT-002` | `US-ATT-002` |
| **PRD-004** | `FR-LES-002` | `رفع الملفات و المراجع و الملخصات` | `UC-LES-001` | `US-LES-001` |
| **PRD-004** | `FR-LES-003` | `رفع تسجيلات المحاضرات` | `UC-LES-001` | `US-LES-001` |
| **PRD-004** | `FR-LES-001` | `متابعة مشاهدة المحتوى` | `UC-LES-002` | `US-LES-002` |
| **PRD-005** | `FR-EXM-005` | `انشاء الواجبات` | `UC-EXM-001` | `US-EXM-001` |
| **PRD-005** | `FR-EXM-004` | `رفع الواجبات` | `UC-EXM-001` | `US-EXM-001` |
| **PRD-005** | `FR-EXM-007` | `انشاء الامتحانات` | `UC-EXM-001` | `US-EXM-001` |
| **PRD-005** | `FR-EXM-006` | `رفع الامتحانات` | `UC-EXM-001` | `US-EXM-001` |
| **PRD-005** | `FR-EXM-003` | `تسليم الواجبات و الامتحانات` | `UC-EXM-002` | `US-EXM-002` |
| **PRD-006** | `FR-EXM-002` | `تصحيح الدرجات تلقائي` | `UC-EXM-003` | `US-EXM-003` |
| **PRD-007** | `FR-EXM-001` | `عرض النتائج لي ولي الامر` | `UC-EXM-004` | `US-EXM-004` |
| **PRD-007** | `FR-PAR-001` | `تقييمات + ملاحظات المدرس` | `UC-PAR-001` | `US-PAR-001` |
| **PRD-007** | `FR-PAR-003` | `درجات الامتحانات` | `UC-PAR-001` | `US-PAR-001` |
| **PRD-007** | `FR-PAR-005` | `مستوى الطالب` | `UC-PAR-001` | `US-PAR-001` |
| **PRD-007** | `FR-PAR-002` | `حالة الواجبات` | `UC-PAR-002` | `US-PAR-002` |
| **PRD-007** | `FR-PAR-004` | `الحضور و الغياب` | `UC-PAR-002` | `US-PAR-002` |
| **PRD-008** | `FR-NOT-001` | `اشعار قبل الحصة ب ساعه` | `UC-NOT-001` | `US-NOT-001` |
| **PRD-008** | `FR-NOT-002` | `اشعار في حالة عدم حل الواجب` | `UC-NOT-002` | `US-NOT-002` |
| **PRD-008** | `FR-NOT-004` | `اشعار امتحان جديد` | `UC-NOT-003` | `US-NOT-003` |
| **PRD-008** | `FR-NOT-003` | `اشعار درجة امتحان الطالب` | `UC-NOT-003` | `US-NOT-003` |
| **PRD-008** | `FR-NOT-005` | `اشعارات في حالة غياب الطالب` | `UC-NOT-004` | `US-NOT-004` |
| **PRD-009** | `FR-USR-004` | `المدرس` | `UC-USR-001` | `US-USR-001` |
| **PRD-009** | `FR-USR-003` | `الطالب` | `UC-USR-001` | `US-USR-001` |
| **PRD-009** | `FR-USR-002` | `ولي الامر` | `UC-USR-001` | `US-USR-001` |
| **PRD-009** | `FR-USR-001` | `السكرتارية` | `UC-USR-001` | `US-USR-001` |
| **PRD-010** | `FR-SUB-001` | `حالة الدفع لكل طالب` | `UC-SUB-001` | `US-SUB-001` |

---

## 11. Non-Functional Product Expectations

*(Summary derived from [docs/01-PRD/non-functional-requirements.md](file:///d:/el_awal/docs/01-PRD/non-functional-requirements.md))*:

1. **Performance**: System interfaces must support daily classroom operations and content access smoothly. Quantitative response time and throughput targets remain `TBD — Requires Product Clarification`.
2. **Security & Access Control**: The system must enforce role boundaries preventing students and parents from modifying attendance, grades, or lesson schedules. Specific authentication mechanisms (e.g., OAuth, OTP, password rules) remain `TBD — Requires Product Clarification`.
3. **Availability**: The system must be available during active teaching and examination periods. Quantitative uptime SLAs remain `TBD — Requires Product Clarification`.
4. **Scalability**: The architecture must support expansion across multiple student groups and lecture files. Specific volumetric capacity targets remain `TBD — Requires Product Clarification`.
5. **Usability & Dual-Language**: Interfaces must provide seamless readability in Arabic (`RTL`) and English (`LTR`), maintaining consistent domain terminology across all screens.
6. **Accessibility**: Interfaces should maintain clear contrast, visible focus rings, and readable typography. Formal WCAG compliance targets remain `TBD — Requires Product Clarification`.
7. **Data Integrity & Privacy**: Student academic grades, attendance records, and payment statuses must remain consistent and protected against unauthorized tampering.

---

## 12. Acceptance Criteria

| AC ID | Connected PRD | Acceptance Criteria Statement | Testable Verification |
|---|---|---|---|
| **AC-001** | `PRD-001` | Given valid student data, when submitted, then the student data and group/class association are represented in the system. | View student profile and confirm data & group details match input. |
| **AC-002** | `PRD-001` | Given parent data, when entered, then the parent data is associated with the student record. | Verify parent contact information is displayed within the student context. |
| **AC-003** | `PRD-001` | Given a student record, when status is set, then the student status is represented in the system. | Verify student status indicator displays in student management views. |
| **AC-004** | `PRD-002` | Given group parameters and lesson times, when created, then the group and scheduled times are available in the system. | Retrieve group record and verify scheduled lesson times. |
| **AC-005** | `PRD-002` | Given an existing group and student(s), when added, then the student membership in the group is recorded. | Confirm students appear in the group roster. |
| **AC-006** | `PRD-003` | Given a group session, when attendance or absence is logged, then the student attendance state is recorded. | Verify student presence/absence record for the specified session date. |
| **AC-007** | `PRD-003` | Given recorded attendance records, when requested, then attendance and absence reports are presented. | Generate attendance report and verify calculated presence/absence counts. |
| **AC-008** | `PRD-004` | Given educational files, references, or summaries, when uploaded, then the files become available to authorized users. | Download/open uploaded file from student and teacher views. |
| **AC-009** | `PRD-004` | Given a lecture recording, when uploaded, then the recording becomes available in the system. | Access lecture recording item from student learning view. |
| **AC-010** | `PRD-004` | Given uploaded educational content, when accessed by students, then content viewing information is available for monitoring. | Check content viewing monitoring record for student view status. |
| **AC-011** | `PRD-005` | Given assignment details or attachments, when created/uploaded, then the assignment becomes available in the system. | Verify assignment appears in group assignment list. |
| **AC-012** | `PRD-005` | Given exam details or attachments, when created/uploaded, then the exam becomes available in the system. | Verify exam appears in group exam list. |
| **AC-013** | `PRD-005` | Given an active assignment or exam, when a student delivers a submission, then the submission is recorded in the system. | Verify submission delivery status in teacher assessment view. |
| **AC-014** | `PRD-006` | Given a submitted student examination, when received, then automatic grading is executed and the exam grade is recorded. | Verify automated score is calculated and displayed on student record. |
| **AC-015** | `PRD-007` | Given graded exams, when accessed by a parent, then student results and exam grades are displayed. | Parent accesses results portal and views child's exam scores. |
| **AC-016** | `PRD-007` | Given teacher evaluations and notes, when accessed by a parent, then evaluations and notes are displayed. | Parent views teacher notes feed for the student. |
| **AC-017** | `PRD-007` | Given assignment statuses and attendance records, when accessed by a parent, then assignment completion and attendance records are displayed. | Parent views assignment status list and attendance history. |
| **AC-018** | `PRD-008` | Given a scheduled lesson 1 hour away, when the milestone is reached, then the 1-hour pre-lesson notification is triggered. | Verify dispatch of pre-lesson reminder notification. |
| **AC-019** | `PRD-008` | Given an unsolved assignment condition, when triggered, then the unsolved homework notification is dispatched. | Verify dispatch of unsolved homework alert. |
| **AC-020** | `PRD-008` | Given a newly published exam, when created, then the new exam notification is dispatched. | Verify dispatch of new exam announcement. |
| **AC-021** | `PRD-008` | Given a recorded student exam grade, when available, then the student exam grade notification is dispatched. | Verify dispatch of exam grade release notification. |
| **AC-022** | `PRD-008` | Given a recorded student absence, when logged, then the student absence notification is dispatched. | Verify dispatch of absence alert notification. |
| **AC-023** | `PRD-009` | Given the system in operation, when users interact, then the four confirmed roles (Teacher, Student, Parent, Secretariat) are represented. | Verify system entities exist for each of the four roles. |
| **AC-024** | `PRD-010` | Given student payment records, when accessed by authorized users, then the payment status for each student is displayed. | View student payment status field in administrative management view. |
| **AC-025** | `PRD-003` | Given an authenticated teacher managing an active lesson session and a student's unique QR credential, when scanned, then the system validates teacher session authorization, resolves student identity, verifies active group enrollment, and atomically creates attendance as `PRESENT` with recording method `QR_SCAN` in <500ms if not already logged; if already logged, the existing record remains unmodified and is acknowledged idempotently. | Scan student QR code during session, verify multi-tier validation, and check idempotent attendance recording without modifying existing records. |

---

## 13. Dependencies and Constraints

### 13.1 Business Dependencies
- **Role Assignment**: Accurate assignment of user roles (Teacher, Student, Parent, Secretariat) is required to govern feature accessibility.
- **Roster Linkage**: Group and schedule creation must precede session-level attendance recording and content distribution.

### 13.2 Technical & Architectural Dependencies
- **Media & File Storage**: Upload of lecture recordings and PDF/document summaries depends on underlying storage capabilities documented in [docs/03-Architecture/data-layer.md](file:///d:/el_awal/docs/03-Architecture/data-layer.md).
- **Grading Engine**: Automated exam grading depends on domain evaluation logic documented in [docs/03-Architecture/business-logic.md](file:///d:/el_awal/docs/03-Architecture/business-logic.md).

### 13.3 Product Constraints
- **Strict Scope Boundaries**: Functionality not represented in the approved backlog (such as commercial payment gateways or live video streaming) cannot be introduced without formal backlog revision.
- **Non-Automated Assignment Grading**: Automated grading is constrained exclusively to examinations; assignments require manual teacher evaluation.

---

## 14. Assumptions and TBDs

### 14.1 Confirmed Assumptions
1. **Four Confirmed Roles**: Teacher, Student, Parent, and Secretariat represent the authorized human roles for the product.
2. **Nine Confirmed Modules**: The nine modules and confirmed backlog items (including student QR code attendance) represent the authorized functional baseline.
3. **Bilingual Requirement**: The product scope requires consistent representation in Arabic and English.

### 14.2 Items Requiring Product Clarification (TBD)
1. **Secretariat Responsibilities**: Detailed operational boundaries between Teacher and Secretariat tasks remain `TBD`.
2. **Authentication & Account Lifecycle**: Registration, password management, and login flows remain `TBD`.
3. **Notification Channels & Routing**: Specific delivery transports (SMS, WhatsApp, push, in-app) and target recipients per alert type remain `TBD`.
4. **Payment Status Lifecycle**: Definitive allowed values (e.g., Paid, Unpaid, Overdue, Exempt) for student payment status remain `TBD`.
5. **Student Level Rubric**: Calculation and presentation rubric for "Student Level" (`مستوى الطالب`) remain `TBD`.
6. **Submission Parameters**: File format limitations, deadlines, and retry policies for assignments/exams remain `TBD`.

---

## 15. Requirement Traceability Summary

```text
Business Requirement (BR-001..010)
        ↓
Product Requirement (PRD-001..010)
        ↓
Functional Requirement (FR-STU-001..SUB-001)
        ↓
User Story (US-STU-001..SUB-001)
        ↓
Use Case (UC-STU-001..SUB-001)
        ↓
Acceptance Criteria (AC-001..025)
        ↓
Test Case (TC-STU-001..SUB-001)
```

| BR ID | PRD ID | FR ID(s) | US ID(s) | UC ID(s) | AC ID(s) | TC ID(s) |
|---|---|---|---|---|---|---|
| **BR-001** | `PRD-001` | `FR-STU-001..004` | `US-STU-001..003` | `UC-STU-001..003` | `AC-001..003` | `TC-STU-001..003` |
| **BR-002** | `PRD-002` | `FR-GRP-001..003` | `US-GRP-001..002` | `UC-GRP-001..002` | `AC-004..005` | `TC-GRP-001..003` |
| **BR-003** | `PRD-003` | `FR-ATT-001..004` | `US-ATT-001..003` | `UC-ATT-001..003` | `AC-006..007, AC-025` | `TC-ATT-001..010` |
| **BR-004** | `PRD-004` | `FR-LES-001..003` | `US-LES-001..002` | `UC-LES-001..002` | `AC-008..010` | `TC-LES-001..003` |
| **BR-005** | `PRD-005` | `FR-EXM-003..007` | `US-EXM-001..002` | `UC-EXM-001..002` | `AC-011..013` | `TC-EXM-001..003` |
| **BR-006** | `PRD-006` | `FR-EXM-002` | `US-EXM-003` | `UC-EXM-003` | `AC-014` | `TC-EXM-004` |
| **BR-007** | `PRD-007` | `FR-EXM-001`, `FR-PAR-001..005` | `US-EXM-004`, `US-PAR-001..002` | `UC-EXM-004`, `UC-PAR-001..002` | `AC-015..017` | `TC-EXM-005`, `TC-PAR-001..005` |
| **BR-008** | `PRD-008` | `FR-NOT-001..005` | `US-NOT-001..004` | `UC-NOT-001..004` | `AC-018..022` | `TC-NOT-001..005` |
| **BR-009** | `PRD-009` | `FR-USR-001..004` | `US-USR-001` | `UC-USR-001` | `AC-023` | `TC-USR-001..004` |
| **BR-010** | `PRD-010` | `FR-SUB-001` | `US-SUB-001` | `UC-SUB-001` | `AC-024` | `TC-SUB-001` |

---

## 16. Open Questions

| Question ID | Question Description | Why It Matters | Related Module / Req | Status |
|---|---|---|---|---|
| **OQ-001** | What are the exact administrative operational boundaries between Teacher and Secretariat? | Determines permissions, action routing, and interface layouts for both roles. | `PRD-001`, `PRD-002`, `PRD-009`, `FR-USR-001` | Open |
| **OQ-002** | What are the specific delivery channels (SMS, WhatsApp, in-app, push) and designated recipients for each notification type? | Required to architect notification dispatch and integration adapters. | `PRD-008`, `FR-NOT-001..005`, `UC-NOT-001..004` | Open |
| **OQ-003** | What are the valid lifecycle values and update permissions for student payment status? | Required to structure data validation and administrative editing interfaces. | `PRD-010`, `FR-SUB-001`, `UC-SUB-001` | Open |
| **OQ-004** | How is "Student Level" (`مستوى الطالب`) calculated, formatted, and updated? | Required to build accurate parent reporting views and student progress tracking. | `PRD-007`, `FR-PAR-005`, `UC-PAR-001` | Open |
| **OQ-005** | What authentication model, credential distribution, and parent-student account linkage mechanisms will be used? | Required for security architecture, session management, and onboarding flows. | `PRD-001`, `PRD-007`, `PRD-009`, NFR Security | Open |
| **OQ-006** | What are the file format limits, maximum file sizes, and submission deadline rules for assignments and exams? | Required to configure storage, validation rules, and submission retry handlers. | `PRD-004`, `PRD-005`, `FR-LES-002`, `FR-EXM-003` | Open |
