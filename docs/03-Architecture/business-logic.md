# Business Logic Architecture

## 1. Document Information

- **Document Name**: Business Logic Architecture
- **Document Type**: Architecture Documentation
- **Product**: Educational Management System for Teachers and Students
- **Version**: TBD
- **Status**: Draft
- **Source of Truth**: Approved Backlog, Functional Requirements Document, Non-Functional Requirements Document, User Personas, User Scenarios, User Stories, and Presentation Layer Architecture

---

## 2. Purpose

This document defines the conceptual business logic, domain concepts, confirmed workflows, and product-level processing responsibilities of the educational management system. It makes a clear distinction between confirmed product capabilities, undefined business rules (`TBD — Requires Product Clarification`), and open architecture decisions (`TBD — Requires Architecture Decision`).

---

## 3. Business Logic Responsibilities

The Business Logic Layer represents domain concepts and product capabilities across the nine product modules:

1. **Student Management**: Representing student data, parent data, student status, and group/grade associations as confirmed product concepts.
2. **Attendance & Absence**: Representing student attendance recording, absence recording, and attendance and absence reporting.
3. **Lectures & Lessons**: Representing educational content uploads (files, references, summaries, lecture recordings) and content viewing tracking.
4. **Exams & Assignments**: Representing the creation and upload of exams and assignments, student submissions, automatic exam grading, and displaying results to parents.
5. **Parent Student Status**: Representing parent access to student evaluations, teacher notes, exam grades, student level, assignment status, and attendance/absence records.
6. **Notifications**: Representing notification requirements for lesson schedule reminders, unsolved homework alerts, new exam announcements, exam grades, and student absences.
7. **Groups Management**: Representing group creation, student additions, and lesson schedule associations.
8. **Users & Permissions**: Representing the four confirmed roles (Teacher, Student, Parent, Secretariat).
9. **Subscriptions**: Representing student payment status.

---

## 4. Business Rules & Domain Concepts

### 4.1 Student Management

#### Concept ID: BLR-STU-001
- **Concept Name**: Student Data and Group/Class Concept
- **Related Backlog Item**: `بيانات الطالب`, `المجموعة و الصف`
- **Related User Story**: `US-STU-001`
- **Confirmed Capability**: Student data and group/grade associations exist as product concepts within the system.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Data validation rules, mandatory attributes, and relationship constraints are undefined).

#### Concept ID: BLR-STU-002
- **Concept Name**: Parent Data Concept
- **Related Backlog Item**: `بيانات ولي الامر`
- **Related User Story**: `US-STU-002`
- **Confirmed Capability**: Parent data exists as a product concept within the system.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Parent data fields and relationship multiplicity are undefined).

#### Concept ID: BLR-STU-003
- **Concept Name**: Student Status Concept
- **Related Backlog Item**: `حالة الطلاب`
- **Related User Story**: `US-STU-003`
- **Confirmed Capability**: Student status exists as a product concept within the system.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Permitted student status values and status transition rules are undefined).

---

### 4.2 Attendance & Absence

#### Concept ID: BLR-ATT-001
- **Concept Name**: Attendance and Absence Recording Concept
- **Related Backlog Item**: `تسجيل حضور الطلاب`, `تسجيل الغياب`
- **Related User Story**: `US-ATT-001`
- **Confirmed Capability**: Recording student attendance and recording absence are supported as product capabilities.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Absence criteria, excuse handling, and correction rules are undefined).

#### Concept ID: BLR-ATT-002
- **Concept Name**: Attendance and Absence Reports Concept
- **Related Backlog Item**: `تقارير الحضور و الغياب`
- **Related User Story**: `US-ATT-002`
- **Confirmed Capability**: Attendance and absence reports are supported as a product capability.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Report contents, aggregation logic, and access rules are undefined).

#### Rule ID: BLR-ATT-003
- **Rule Name**: Student QR Code Attendance Validation & Processing
- **Related Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **Related User Story**: `US-ATT-003`
- **Confirmed Business Invariants**:
  1. **Credential Classification**: The QR code represents an opaque **Attendance Identification Credential**; it does not authorize user access, does not act as a bearer token, and does not expose personal identifiable data in its raw format.
  2. **Unique Provisioning**: Every student is provisioned with a persistent, non-guessable cryptographic token (`qr_code_token`) upon enrollment.
  3. **Multi-Tier Processing Pipeline**:
     - *Teacher & Session Ownership*: Scan must originate from an authenticated educator authorized for the target academic group.
     - *Session Status*: Session must be in an active/valid attendance recording window.
     - *Identity & Status*: Token must resolve to an active student account (`is_active = true`, `academic_status = 'ACTIVE'`).
     - *Cohort Enrollment*: Student must have an active `GroupEnrollment` in the session's group.
     - *Atomic Persistence*: If no attendance record exists, attendance is created with `status = 'PRESENT'`, `recording_method = 'QR_SCAN'`, recording teacher ID, and server timestamp.
  4. **Strict Idempotency**: If attendance already exists for the student in the session, repeated scans do not create another record and do not modify the existing record, returning deterministic idempotent confirmation.
  5. **Cross-Cohort Exception Handling**: Scanning a student enrolled in a different group triggers an informative enrollment mismatch warning with the student's name and assigned group, without altering attendance for the active session.
  6. **Token Lifecycle & Revocation**: Tokens can be regenerated/rotated by authorized staff upon report of a lost badge or compromised token.
- **Business Logic Status**: Defined

---

### 4.3 Lectures & Lessons

#### Concept ID: BLR-LES-001
- **Concept Name**: Educational Content and Lecture Recording Concept
- **Related Backlog Item**: `رفع الملفات و المراجع و الملخصات`, `رفع تسجيلات المحاضرات`
- **Related User Story**: `US-LES-001`
- **Confirmed Capability**: Uploading educational files, references, summaries, and lecture recordings is supported as a product capability.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (File constraints, size limits, and access duration rules are undefined).

#### Concept ID: BLR-LES-002
- **Concept Name**: Content Viewing Tracking Concept
- **Related Backlog Item**: `متابعة مشاهدة المحتوى`
- **Related User Story**: `US-LES-002`
- **Confirmed Capability**: Tracking content viewing is supported as a product capability.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Tracking criteria, completion definitions, and access rules are undefined).

---

### 4.4 Exams & Assignments

#### Concept ID: BLR-EXM-001
- **Concept Name**: Exam and Assignment Provision Concept
- **Related Backlog Item**: `انشاء الواجبات`, `رفع الواجبات`, `انشاء الامتحانات`, `رفع الامتحانات`
- **Related User Story**: `US-EXM-001`
- **Confirmed Capability**: Creating and uploading assignments and exams are supported as product capabilities.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Assessment structure, question formats, and scoring scales are undefined).

#### Concept ID: BLR-EXM-002
- **Concept Name**: Assignment and Exam Submission Concept
- **Related Backlog Item**: `تسليم الواجبات و الامتحانات`
- **Related User Story**: `US-EXM-002`
- **Confirmed Capability**: Submitting assignments and exams is supported as a product capability.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Submission rules, deadlines, and attempt limits are undefined).

#### Rule ID: BLR-EXM-003
- **Rule Name**: Automatic Exam Grading
- **Related Backlog Item**: `تصحيح الدرجات تلقائي`
- **Related User Story**: `US-EXM-003`
- **Confirmed Business Rule**: Submitted exams are automatically graded.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Supported question types, scoring rules, and grading criteria are undefined).

#### Concept ID: BLR-EXM-004
- **Concept Name**: Displaying Results to Parent Concept
- **Related Backlog Item**: `عرض النتائج لي ولي الامر`
- **Related User Story**: `US-EXM-004`
- **Confirmed Capability**: Displaying results to the parent is supported as a product capability.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Result release conditions and parent access rules are undefined).

---

### 4.5 Parent Student Status

#### Concept ID: BLR-PAR-001
- **Concept Name**: Parent Academic Information Access Concept
- **Related Backlog Item**: `تقييمات + ملاحظات المدرس`, `درجات الامتحانات`, `مستوى الطالب`
- **Related User Story**: `US-PAR-001`
- **Confirmed Capability**: Displaying teacher evaluations, notes, exam grades, and student level to the parent is supported as a product capability.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Student level definition and evaluation structure are undefined).

#### Concept ID: BLR-PAR-002
- **Concept Name**: Parent Assignment Status and Attendance Access Concept
- **Related Backlog Item**: `حالة الواجبات`, `الحضور و الغياب`
- **Related User Story**: `US-PAR-002`
- **Confirmed Capability**: Displaying assignment status and attendance/absence records to the parent is supported as a product capability.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Assignment status values and attendance aggregation rules are undefined).

---

### 4.6 Notifications

#### Concept ID: BLR-NOT-001
- **Concept Name**: Lesson Reminder Notification Concept
- **Related Backlog Item**: `اشعار قبل الحصة ب ساعه`
- **Related User Story**: `US-NOT-001`
- **Confirmed Capability**: A notification requirement exists for one hour before a scheduled lesson.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Designated recipient and delivery mechanism are undefined).

#### Concept ID: BLR-NOT-002
- **Concept Name**: Unsolved Homework Notification Concept
- **Related Backlog Item**: `اشعار في حالة عدم حل الواجب`
- **Related User Story**: `US-NOT-002`
- **Confirmed Capability**: A notification requirement exists when homework is not solved.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Trigger conditions, timing, and designated recipient are undefined).

#### Concept ID: BLR-NOT-003
- **Concept Name**: Exam Notifications Concept
- **Related Backlog Item**: `اشعار امتحان جديد`, `اشعار درجة امتحان الطالب`
- **Related User Story**: `US-NOT-003`
- **Confirmed Capability**: Notification requirements exist for a new exam and for a student exam grade.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Designated recipient and delivery mechanism are undefined).

#### Concept ID: BLR-NOT-004
- **Concept Name**: Student Absence Notification Concept
- **Related Backlog Item**: `اشعارات في حالة غياب الطالب`
- **Related User Story**: `US-NOT-004`
- **Confirmed Capability**: A notification requirement exists when a student absence occurs.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Designated recipient and delivery mechanism are undefined).

---

### 4.7 Groups Management

#### Concept ID: BLR-GRP-001
- **Concept Name**: Group Creation and Lesson Scheduling Concept
- **Related Backlog Item**: `انشاء مجموعة`, `تحديد مواعيد الدروس`
- **Related User Story**: `US-GRP-001`
- **Confirmed Capability**: Creating groups and scheduling lesson times are supported as product capabilities.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Scheduling rules and group constraints are undefined).

#### Concept ID: BLR-GRP-002
- **Concept Name**: Student Group Addition Concept
- **Related Backlog Item**: `اضافة طلاب`
- **Related User Story**: `US-GRP-002`
- **Confirmed Capability**: Adding students to groups is supported as a product capability.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Group capacity limits and assignment rules are undefined).

---

### 4.8 Users & Permissions

#### Concept ID: BLR-USR-001
- **Concept Name**: User Role Representation Concept
- **Related Backlog Item**: `المدرس`, `الطالب`, `ولي الامر`, `السكرتارية`
- **Related User Story**: `US-USR-001`
- **Confirmed Capability**: The system includes four confirmed user roles: Teacher (`المدرس`), Student (`الطالب`), Parent (`ولي الامر`), and Secretariat (`السكرتارية`).
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Role responsibilities, permissions, and access rules are undefined).

---

### 4.9 Subscriptions

#### Concept ID: BLR-SUB-001
- **Concept Name**: Student Payment Status Concept
- **Related Backlog Item**: `حالة الدفع لكل طالب`
- **Related User Story**: `US-SUB-001`
- **Confirmed Capability**: Student payment status is represented as a product concept in the system.
- **Business Logic Status**: Partially Defined
- **Undefined Business Rules**: `TBD — Requires Product Clarification` (Payment status values and associated rules are undefined).

---

## 5. Product Workflows

Only explicitly confirmed, ordered multi-step workflows supported by the product backlog are documented here. Capabilities without defined multi-step sequences do not have an assumed workflow.

### Workflow ID: BLW-EXM-001
- **Workflow Name**: Student Exam Submission and Automatic Grading Workflow
- **Related Backlog Items**: `تسليم الواجبات و الامتحانات`, `تصحيح الدرجات تلقائي`
- **Actor**: `Student / الطالب` (submission) / `System` (automatic grading)
- **Workflow Description**:
  1. A student submits an exam.
  2. The submitted exam is automatically graded.
- **Explicit Scope Boundaries**:
  - Automatic grading explicitly applies to submitted exams.
  - Assignment submission (`رفع الواجبات` / `تسليم الواجبات و الامتحانات`) does not automatically imply automated grading unless explicitly specified by product requirements.
- **Outcome**: The exam is submitted and automatically graded.

---

## 6. Student Management Logic

The Business Logic Layer represents confirmed student management concepts:
- **Student Data (`بيانات الطالب`)**
- **Parent Data (`بيانات ولي الامر`)**
- **Student Status (`حالة الطلاب`)**
- **Group & Grade/Class (`المجموعة و الصف`)**

*Note*: Enrollment rules, validation rules, registration workflows, status values, and relationship constraints are `TBD — Requires Product Clarification`.

---

## 7. Attendance & Absence Logic

The Business Logic Layer represents attendance tracking through confirmed product capabilities:
- **Recording Student Attendance (`تسجيل حضور الطلاب`)**
- **Recording Absence (`تسجيل الغياب`)**
- **Attendance and Absence Reports (`تقارير الحضور و الغياب`)**

*Note*: Attendance criteria, absence thresholds, excuse rules, correction rules, aggregation formulas, and authorization rules are `TBD — Requires Product Clarification`.

---

## 8. Lectures & Lessons Logic

The Business Logic Layer represents educational content through confirmed product capabilities:
- **Uploading Files, References, and Summaries (`رفع الملفات و المراجع و الملخصات`)**
- **Uploading Lecture Recordings (`رفع تسجيلات المحاضرات`)**
- **Monitoring Content Viewing (`متابعة مشاهدة المحتوى`)**

*Note*: File formats, size limits, storage behavior, publishing rules, completion thresholds, and viewing duration calculations are `TBD — Requires Product Clarification`.

---

## 9. Exams & Assignments Logic

The Business Logic Layer represents assessments through confirmed product capabilities:
- **Creating Assignments (`انشاء الواجبات`)**
- **Uploading Assignments (`رفع الواجبات`)**
- **Creating Exams (`انشاء الامتحانات`)**
- **Uploading Exams (`رفع الامتحانات`)**
- **Submitting Assignments and Exams (`تسليم الواجبات و الامتحانات`)**
- **Automatic Exam Grading (`تصحيح الدرجات تلقائي`)**: Submitted exams are automatically graded.

*Note*: Grading algorithms, question types, scoring scales, retake policies, deadlines, and attempt limits are `TBD — Requires Product Clarification`.

---

## 10. Parent Student Status Logic

The Business Logic Layer represents parent access through confirmed product capabilities:
- **Displaying Results to Parent (`عرض النتائج لي ولي الامر`)**
- **Teacher Evaluations and Notes (`تقييمات + ملاحظات المدرس`)**
- **Assignment Status (`حالة الواجبات`)**
- **Exam Grades (`درجات الامتحانات`)**
- **Attendance and Absence (`الحضور و الغياب`)**
- **Student Level (`مستوى الطالب`)**

*Note*: Parent request workflows, verification, performance calculations, and aggregation logic are `TBD — Requires Product Clarification`.

---

## 11. Notification Logic

The Business Logic Layer represents notification requirements as product concepts:

| Notification ID | Backlog Item | Requirement Stated by Product | Intended Recipient | Delivery Mechanism | Business Logic Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NOT-001** | `اشعار قبل الحصة ب ساعه` | Notification requirement for one hour before a lesson | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Partially Defined |
| **NOT-002** | `اشعار في حالة عدم حل الواجب` | Notification requirement when homework is not solved | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Partially Defined |
| **NOT-003** | `اشعار امتحان جديد` | Notification requirement for a new exam | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Partially Defined |
| **NOT-004** | `اشعار درجة امتحان الطالب` | Notification requirement for a student exam grade | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Partially Defined |
| **NOT-005** | `اشعارات في حالة غياب الطالب` | Notification requirement for student absence | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Partially Defined |

---

## 12. Groups Management Logic

The Business Logic Layer represents group management through confirmed product capabilities:
- **Creating Groups (`انشاء مجموعة`)**
- **Adding Students (`اضافة طلاب`)**
- **Scheduling Lesson Times (`تحديد مواعيد الدروس`)**

*Note*: Group capacity caps, schedule conflict rules, enrollment rules, transfer rules, and teacher ownership are `TBD — Requires Product Clarification`.

---

## 13. Users & Permissions Logic

The product domain recognizes four confirmed user roles:
1. **Teacher / المدرس**
2. **Student / الطالب**
3. **Parent / ولي الأمر**
4. **Secretariat / السكرتارية**

*Note*: Role responsibilities, permissions, access matrices, and delegation rules are `TBD — Requires Product Clarification`.

---

## 14. Subscription / Payment Logic

The Business Logic Layer represents student payment status:
- **Concept**: Student payment status (`حالة الدفع لكل طالب`) is represented as a product concept.

*Note*: Permitted payment status values, calculation rules, payment processing, billing cycles, and management roles are `TBD — Requires Product Clarification`.

---

## 15. Business Logic Inputs and Outputs

| Domain | Conceptual Inputs | Business Processing | Conceptual Outputs |
| :--- | :--- | :--- | :--- |
| **Student Management** | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Conceptual representation of student data, parent data, student status, group/class |
| **Attendance & Absence** | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Conceptual representation of attendance records, absence records, attendance reports |
| **Lectures & Lessons** | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Conceptual representation of educational materials, content viewing information |
| **Exams & Assignments** | `TBD — Requires Product Clarification` | Automatic grading for exams (`TBD — Requires Product Clarification` for other processing) | Conceptual representation of assessments, submissions, graded exam outcome |
| **Parent Student Status** | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Conceptual representation of results, teacher notes, evaluations, assignment status, attendance, student level |
| **Notifications** | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Conceptual representation of notification messages |
| **Groups Management** | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Conceptual representation of groups, schedules, group rosters |
| **Users & Permissions** | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Conceptual representation of confirmed user roles |
| **Subscriptions** | `TBD — Requires Product Clarification` | `TBD — Requires Product Clarification` | Conceptual representation of student payment status |

---

## 16. Business Logic Boundaries

### 16.1 Business Logic SHOULD Handle:
- Domain concepts and product capabilities explicitly defined in the product backlog.
- Execution of confirmed product workflows (student exam submission and automatic grading).
- Evaluation of defined notification trigger conditions.

### 16.2 Business Logic SHOULD NOT Handle:
- User interface presentation, rendering, and visual styling.
- Form controls, buttons, screen layouts, and client navigation.
- Physical database schema design, direct database queries, or storage implementation.
- Technical communication protocols, network handling, and API serialization.
- External notification service infrastructure and message delivery transport.

*Note*: Architectural service boundaries and interface contracts are `TBD — Requires Architecture Decision`.

---

## 17. Open Business Rules

The following missing product rules must be clarified by product stakeholders:

1. **Student Status Values**: What specific status values can a student hold, and what rules govern status transitions?
2. **Attendance & Absence Rules**: What specific rules define attendance vs. absence, and are there absence limits or excuse mechanisms?
3. **Automatic Grading Criteria**: What question types support automatic grading, what scoring rules apply, and are retakes permitted?
4. **Assignment & Exam Submission Rules**: What are the specific rules, formats, deadlines, and attempt limits for assignment and exam submissions?
5. **Notification Recipient Assignment**: For each notification requirement, who are the designated recipients (Student, Parent, or both)?
6. **Payment Status Definitions**: What are the defined values for `حالة الدفع لكل طالب`?
7. **Secretariat Operational Responsibilities**: What specific business responsibilities and operational tasks are assigned to the Secretariat?
8. **Role Authorization & Responsibility Matrix**: What specific business actions belong to each of the four roles (Teacher, Student, Parent, Secretariat)?

---

## 18. Business Logic Traceability

| Backlog Item | User Story | Business Rule / Domain Concept | Workflow | Status |
| :--- | :--- | :--- | :--- | :--- |
| حالة الطلاب | `US-STU-003` | `BLR-STU-003` | N/A — No Explicit Workflow Defined | Partially Defined |
| المجموعة و الصف | `US-STU-001` | `BLR-STU-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| بيانات ولي الامر | `US-STU-002` | `BLR-STU-002` | N/A — No Explicit Workflow Defined | Partially Defined |
| بيانات الطالب | `US-STU-001` | `BLR-STU-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| تقارير الحضور و الغياب | `US-ATT-002` | `BLR-ATT-002` | N/A — No Explicit Workflow Defined | Partially Defined |
| تسجيل الغياب | `US-ATT-001` | `BLR-ATT-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| تسجيل حضور الطلاب | `US-ATT-001` | `BLR-ATT-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| تسجيل الحضور عبر مسح QR Code | `US-ATT-003` | `BLR-ATT-003` | N/A — No Explicit Workflow Defined | Defined |
| متابعة مشاهدة المحتوى | `US-LES-002` | `BLR-LES-002` | N/A — No Explicit Workflow Defined | Partially Defined |
| رفع الملفات و المراجع و الملخصات | `US-LES-001` | `BLR-LES-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| رفع تسجيلات المحاضرات | `US-LES-001` | `BLR-LES-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| عرض النتائج لي ولي الامر | `US-EXM-004` | `BLR-EXM-004` | N/A — No Explicit Workflow Defined | Partially Defined |
| تصحيح الدرجات تلقائي | `US-EXM-003` | `BLR-EXM-003` | `BLW-EXM-001` | Partially Defined |
| تسليم الواجبات و الامتحانات | `US-EXM-002` | `BLR-EXM-002` | `BLW-EXM-001` (For Exams) | Partially Defined |
| رفع الواجبات | `US-EXM-001` | `BLR-EXM-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| انشاء الواجبات | `US-EXM-001` | `BLR-EXM-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| رفع الامتحانات | `US-EXM-001` | `BLR-EXM-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| انشاء الامتحانات | `US-EXM-001` | `BLR-EXM-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| تقييمات + ملاحظات المدرس | `US-PAR-001` | `BLR-PAR-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| حالة الواجبات | `US-PAR-002` | `BLR-PAR-002` | N/A — No Explicit Workflow Defined | Partially Defined |
| درجات الامتحانات | `US-PAR-001` | `BLR-PAR-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| الحضور و الغياب | `US-PAR-002` | `BLR-PAR-002` | N/A — No Explicit Workflow Defined | Partially Defined |
| مستوى الطالب | `US-PAR-001` | `BLR-PAR-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| اشعار قبل الحصة ب ساعه | `US-NOT-001` | `BLR-NOT-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| اشعار في حالة عدم حل الواجب | `US-NOT-002` | `BLR-NOT-002` | N/A — No Explicit Workflow Defined | Partially Defined |
| اشعار درجة امتحان الطالب | `US-NOT-003` | `BLR-NOT-003` | N/A — No Explicit Workflow Defined | Partially Defined |
| اشعار امتحان جديد | `US-NOT-003` | `BLR-NOT-003` | N/A — No Explicit Workflow Defined | Partially Defined |
| اشعارات في حالة غياب الطالب | `US-NOT-004` | `BLR-NOT-004` | N/A — No Explicit Workflow Defined | Partially Defined |
| تحديد مواعيد الدروس | `US-GRP-001` | `BLR-GRP-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| اضافة طلاب | `US-GRP-002` | `BLR-GRP-002` | N/A — No Explicit Workflow Defined | Partially Defined |
| انشاء مجموعة | `US-GRP-001` | `BLR-GRP-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| السكرتارية | `US-USR-001` | `BLR-USR-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| ولي الامر | `US-USR-001` | `BLR-USR-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| الطالب | `US-USR-001` | `BLR-USR-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| المدرس | `US-USR-001` | `BLR-USR-001` | N/A — No Explicit Workflow Defined | Partially Defined |
| حالة الدفع لكل طالب | `US-SUB-001` | `BLR-SUB-001` | N/A — No Explicit Workflow Defined | Partially Defined |

---

## 19. Open Architecture Decisions

The following technical architecture decisions must be resolved:

1. **Domain Service Architecture**: How will business domain logic be structured (e.g., modular monolith, clean architecture use-cases, domain-driven design services)?
2. **Business Rule Validation Strategy**: What validation architecture will enforce domain invariants?
3. **Automatic Grading Execution Engine**: How will automated grading logic be isolated and executed securely?
4. **Notification Trigger & Scheduling Architecture**: What mechanism will manage the time-based (e.g., 1 hour pre-lesson) and event-based notification triggers?
5. **Transaction & Consistency Boundaries**: What consistency models and transaction boundaries will apply across related domain updates?
