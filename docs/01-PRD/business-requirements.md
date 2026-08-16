# Business Requirements Document

## 1. Document Information

- **Document Name**: Business Requirements Document
- **Document Type**: Product Requirements
- **Product**: Educational Management System for Teachers and Students (El Awal)
- **Version**: 2.0
- **Status**: Updated Draft — Online Learning Domain Integrated
- **Source of Truth**: Approved Product Backlog, Architecture Baseline, and Educational Delivery Models

---

## 2. Purpose

The purpose of this document is to define the high-level business and product requirements for the Educational Management System for Teachers and Students, establishing the business context, stakeholder relationships, high-level business requirements, and domain boundaries across two distinct educational delivery models: **Physical Learning** and **Online Learning**.

This document establishes:
- The business context and high-level capabilities supported by the system.
- The business stakeholders and their relationships to the product.
- The high-level business requirements governing the product modules.
- The defined product scope, boundaries, and traceability to existing documentation.

---

## 3. Business Context

The system is an educational management platform designed to support educational, instructional, administrative, and self-paced asynchronous workflows involving four confirmed user roles:
- **Teacher (`المدرس`)**
- **Student (`الطالب`)**
- **Parent (`ولي الأمر`)**
- **Secretariat (`السكرتارية`)**

The product encompasses educational and operational capabilities across ten confirmed product modules:
1. **Student Management**: Handling student data, parent data, student status, and group/grade associations.
2. **Attendance & Absence**: Recording physical student attendance (including unique student QR code provisioning and teacher QR code scanning), recording absences, and providing attendance/absence reports.
3. **Lectures & Lessons**: Uploading educational files, references, summaries, lecture recordings, and tracking content viewing.
4. **Exams & Assignments**: Creating and uploading assignments and exams, student submissions, automatic exam grading, and displaying results to parents.
5. **Parent Student Status**: Providing parents with access to evaluations, teacher notes, exam grades, student level, assignment status, attendance/absence records, and online course progress.
6. **Notifications**: Providing notifications for upcoming lessons, unsolved assignments, new exams, exam grades, and student absences.
7. **Groups Management**: Creating physical classroom groups, scheduling lesson times, and adding students to groups.
8. **Users & Permissions**: Supporting the four confirmed user roles.
9. **Subscriptions**: Tracking the payment status for each student.
10. **Online Learning (Courses)**: Authoring independent asynchronous online courses, managing course modules/lessons, handling course enrollments/access entitlements, delivering digital instructional content (videos, files, summaries), tracking independent course progress, and conducting online course assessments.

### Dual Educational Delivery Models

The platform explicitly supports two distinct educational delivery models:

#### 1. Physical Learning (Classroom Model)
Students physically attend teacher-managed cohorts.
- **Flow**: `Student` → `Physical Group Enrollment` → `Academic Group` → `Lesson Schedule` → `Lesson Session` → `Attendance Record (QR / Manual)`.
- Physical students participate in scheduled sessions, camera-based QR attendance, manual roll-call, group-based content distribution, in-class/take-home assignments, exams, and parent monitoring.

#### 2. Online Learning (Asynchronous Course Model)
Students subscribe to educational courses and consume content digitally without physically attending classroom lessons.
- **Flow**: `Student` → `Course` → `Course Enrollment` → `Course Access / Subscription` → `Course Lessons` → `Videos / Files / Summaries` → `Progress Tracking` → `Assignments / Exams` → `Grades`.
- An online-only student does NOT need to belong to a physical `AcademicGroup` to consume online courses.

### Core Domain Principle: Single Student Identity
- The platform enforces strictly **ONE Student identity** (`Student`).
- Online students are NOT modeled as a separate user type (`Student ≠ Physical Student`, `Student ≠ Online Student`).
- The same Student may simultaneously have:
  - One or more **Physical Group enrollments** (e.g., Mathematics Group A)
  - One or more **Online Course enrollments** (e.g., Physics Course, Exam Revision Course)
- Structural hierarchy:
  ```text
  Student
  ├── Physical Learning Relationships (AcademicGroup, GroupEnrollment, LessonSession, AttendanceRecord)
  └── Online Learning Relationships (Course, CourseEnrollment, CourseAccess, CourseProgress)
  ```

### Required Domain Separation
- **Physical Domain**: `AcademicGroup`, `GroupEnrollment`, `LessonSchedule`, `LessonSession`, `AttendanceRecord`.
- **Online Learning Domain**: `Course`, `CourseEnrollment`, `CourseModule`, `CourseLesson`, `CourseContent`, `CourseProgress`, `CourseAccess` / `CourseSubscription`.
- **Domain Invariant**: A `Course` is an independent educational product entity. It is NOT another type of `AcademicGroup`, and `isOnline` boolean flags are rejected as primary architectural solutions.
- **Attendance Boundary**: Online course enrollments do NOT participate in or satisfy physical QR attendance. The QR attendance pipeline remains strictly bound to `Teacher` → `Physical LessonSession` → `AcademicGroup` → `GroupEnrollment` → `AttendanceRecord`.

---

## 4. Business Problem

The product addresses core operational and educational capability needs across physical and online educational contexts:
- Managing student information, parent information, student status, and academic group/class associations.
- Managing physical group formation and scheduling recurring lesson times.
- Recording and reporting student attendance and absence records rapidly and reliably, including via student unique QR code scanning by the teacher.
- Managing and distributing educational files, summaries, references, and lecture recordings, along with tracking content engagement.
- Managing the creation, upload, submission, and grading of assignments and examinations across physical cohorts and online courses.
- Providing parents with visibility into student academic standing, evaluations, assignment statuses, exam grades, physical attendance, and online course progress.
- Providing relevant schedule reminders and academic alerts.
- Supporting defined system user roles.
- Tracking student payment status.
- Providing structured, self-paced online courses with modular lessons, video streaming, downloadable references, independent progress tracking, and online assessment workflows.

> **Note**: Detailed historical problem statements, baseline operational metrics, and legacy operational workflows are not documented in the backlog (`TBD — Requires Product Clarification`).

---

## 5. Business Objectives

The business objectives directly supported by the approved product scope are:

1. **Enable Student Information Management**: Provide capabilities to maintain and view student profiles, parent contact data, student status, and class/group assignments.
2. **Enable Group & Schedule Management**: Provide capabilities to create physical student groups, assign students to groups, and define lesson schedules.
3. **Enable Attendance & Absence Tracking**: Provide capabilities to record student attendance and absences (via manual entry and teacher scanning of unique student QR codes) and generate attendance/absence reports.
4. **Enable Educational Content Delivery**: Provide capabilities to upload and distribute educational materials, summaries, references, and lecture recordings, and track content viewing.
5. **Enable Assignment & Exam Management**: Provide capabilities to create and upload assignments and exams for students.
6. **Enable Student Assessment Submissions**: Enable students to submit their completed assignments and exams through the system.
7. **Enable Automatic Exam Grading**: Provide automated grading capabilities for student exam submissions where explicitly required.
8. **Enable Parent Visibility into Student Academic Status**: Enable parents to view evaluations, teacher notes, exam grades, student level, assignment completion status, attendance/absence records, and online course progress.
9. **Enable Notifications**: Provide notification capabilities for one-hour pre-lesson reminders, unsolved homework alerts, new exam announcements, student exam grades, and student absence alerts.
10. **Support Defined System Roles & Permissions**: Represent and manage the four confirmed roles (Teacher, Student, Parent, Secretariat).
11. **Enable Student Payment Status Tracking**: Provide visibility and tracking for the payment status of each student.
12. **Enable Online Learning & Course Management**: Provide capabilities for teachers to author, structure, publish, and manage online courses (modules, lessons, content, assessments) and for students to enroll, access learning materials asynchronously, track individual progress, and submit assessments.
13. **Enable Parent Monitoring of Online Courses**: Enable parents to view enrolled online courses, module/lesson progress metrics, and online assessment scores for their linked children.

> **Note on Measurable Targets**: Specific quantitative business targets, financial KPIs, ROI, market share, adoption percentages, and efficiency improvement metrics are not defined in the source documentation (`TBD — Requires Product Clarification`).

---

## 6. Business Stakeholders / User Roles

The system serves four confirmed user roles derived from the product backlog:

| Role | Business Relationship to Product |
|---|---|
| **Teacher / المدرس** | Educational and instructional user responsible for managing physical groups, schedules, educational content, assessments, attendance (including scanning student QR codes), evaluations, and authoring/publishing online courses with modules, lessons, and progress tracking. |
| **Student / الطالب** | Learner user who accesses educational materials, receives notifications, presents unique QR code for physical session attendance, enrolls in and consumes asynchronous online courses, tracks learning progress, and submits assignments and exams. |
| **Parent / ولي الأمر** | Guardian user who accesses student academic standing, evaluations, notes, grades, assignment status, attendance records, online course progress, and notifications for linked children. |
| **Secretariat / السكرتارية** | Administrative role explicitly identified in the product scope for managing student data, physical group enrollments, online course enrollments, and payment status tracking. *(Responsibilities: `TBD — Requires Product Clarification`)* |

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
- **Description**: The system shall support the creation and management of physical educational groups, student group enrollment, and lesson scheduling within the defined product scope.
- **Supported Backlog Capabilities**:
  - `انشاء مجموعة` (Create Group)
  - `اضافة طلاب` (Add Students)
  - `تحديد مواعيد الدروس` (Schedule Lesson Times)
- **Business Scope**: Physical classroom group creation, student membership assignment, and schedule timing.

---

### BR-003 — Attendance & Absence Management
- **Description**: The system shall support recording and reporting student attendance and absence records within the defined product scope, including unique student QR code generation and teacher QR code scanning for session attendance check-in.
- **Supported Backlog Capabilities**:
  - `تسجيل حضور الطلاب` (Record Student Attendance)
  - `تسجيل الغياب` (Record Absence)
  - `تقارير الحضور و الغياب` (Attendance and Absence Reports)
  - `تسجيل الحضور عبر رمز الاستجابة السريعة (QR Code)` (Student QR Code Attendance Scanning)
- **Business Scope**: Generating a unique QR code for every enrolled student, enabling teachers to scan student QR codes to log session-level attendance, logging manual attendance/absence statuses per student/session, and providing summarized reports.
- **Boundary Invariant**: Physical attendance applies strictly to physical `AcademicGroup` lesson sessions. Online course enrollments do NOT participate in QR attendance.

---

### BR-004 — Educational Content Management
- **Description**: The system shall support the management, uploading, and availability of educational files, references, summaries, and lecture recordings, as well as tracking content viewing.
- **Supported Backlog Capabilities**:
  - `رفع الملفات و المراجع و الملخصات` (Upload Files, References, and Summaries)
  - `رفع تسجيلات المحاضرات` (Upload Lecture Recordings)
  - `متابعة مشاهدة المحتوى` (Track Content Viewing)
- **Business Scope**: Making instructional assets available to students in physical group contexts and asynchronous online course contexts, and capturing viewing engagement.

---

### BR-005 — Assignments & Exams Management
- **Description**: The system shall support the creation, uploading, distribution, and student submission of assignments and examinations within the defined product scope.
- **Supported Backlog Capabilities**:
  - `انشاء الواجبات` (Create Assignments)
  - `رفع الواجبات` (Upload Assignments)
  - `انشاء الامتحانات` (Create Exams)
  - `رفع الامتحانات` (Upload Exams)
  - `تسليم الواجبات و الامتحانات` (Submit Assignments and Exams)
- **Business Scope**: Authoring, attaching, distributing, and receiving student submissions for academic assessments across physical group and online course contexts.

---

### BR-006 — Automatic Exam Grading
- **Description**: The system shall support automatic grading of submitted student examinations where explicitly required by the product scope.
- **Supported Backlog Capabilities**:
  - `تصحيح الدرجات تلقائي` (Automatic Grading)
- **Business Scope**: Automated grading specifically for examinations.
- **Important Constraint**: Automatic grading is specified exclusively for exams; assignments are not automatically graded. No grading algorithms, scoring methods, partial credit logic, or grading thresholds are assumed.

---

### BR-007 — Parent Student Status Visibility
- **Description**: The system shall provide parents with visibility into defined student academic information, evaluation records, physical attendance, and online course progress metrics.
- **Supported Backlog Capabilities**:
  - `عرض النتائج لي ولي الامر` (Display Results to Parent)
  - `تقييمات + ملاحظات المدرس` (Teacher Evaluations and Notes)
  - `حالة الواجبات` (Assignments Status)
  - `درجات الامتحانات` (Exam Grades)
  - `الحضور و الغياب` (Attendance and Absence)
  - `مستوى الطالب` (Student Level)
  - `متابعة التعلم عبر الإنترنت` (Parent Online Course Progress Monitoring)
- **Business Scope**: Informational transparency for parents regarding their child's academic progress, attendance standing, and online course completion. Student level is a confirmed product concept whose definition is `TBD — Requires Product Clarification`.

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
- **Business Scope**: Role identification and foundational role-based system access across physical and online learning domains.
- **Important Constraint**: Detailed role permissions and administrative delegation boundaries are undefined (`TBD — Requires Product Clarification`).

---

### BR-010 — Student Payment Status
- **Description**: The system shall support tracking and displaying the payment status for each student.
- **Supported Backlog Capabilities**:
  - `حالة الدفع لكل طالب` (Payment Status for Each Student)
- **Business Scope**: Visibility into individual student payment status.
- **Important Constraint**: Payment gateways, online transactions, invoices, fee structures, payment amounts, currencies, subscription plans, billing cycles, and accounting workflows are not part of the currently approved scope (`TBD — Requires Product Clarification`).

---

### BR-OL-001 — Online Course & Curriculum Management
- **Description**: The system shall support the creation, structure organization, publishing, and lifecycle management of independent asynchronous educational courses.
- **Supported Business Scope**:
  - Authoring courses with title, description, subject/category, ordering, and publication status.
  - Organizing courses into modular hierarchies (`Course` → `CourseModule` → `CourseLesson`).
  - Associating educational assets (video streams, PDF documents, summaries, and references) directly with course lessons.
- **Domain Constraint**: A `Course` is an independent educational product and shall not be modeled as an `AcademicGroup` or configured merely through an `isOnline` boolean.

---

### BR-OL-002 — Course Enrollment & Access Entitlement
- **Description**: The system shall support student enrollment into online courses and manage access entitlements independently from physical classroom group enrollments.
- **Supported Business Scope**:
  - Enrolling a student into an online course (`CourseEnrollment`).
  - Representing course access entitlements (`CourseAccess` / `CourseSubscription`).
  - Enforcing access verification so that only enrolled/entitled students can access course lessons and materials.
- **Important Distinction**: `CourseEnrollment` ("Is this student enrolled in this course?") is conceptually decoupled from `StudentPaymentRecord` ("What is the student's payment record?"). Commercial subscription checkout and payment gateway integrations are `TBD — Requires Product Clarification`.

---

### BR-OL-003 — Asynchronous Course Lesson Delivery
- **Description**: The system shall support asynchronous digital delivery of course lessons, including adaptive video streaming and downloadable educational documents.
- **Supported Business Scope**:
  - Secure video delivery using Bunny Stream infrastructure.
  - Educational document/summary delivery using Cloudflare R2 object storage.
  - Ensuring lesson content is consumable independently of physical group scheduling.

---

### BR-OL-004 — Online Course Progress Tracking
- **Description**: The system shall provide independent tracking and aggregation of student progress across enrolled online courses.
- **Supported Business Scope**:
  - Tracking lesson start state, last viewing position, completion flag, and completion timestamps (`CourseProgress`).
  - Aggregating overall student progress within a course.
  - Supporting resilient offline progress recording and synchronization upon network reconnection.

---

### BR-OL-005 — Online Course Assessments & Evaluations
- **Description**: The system shall support attaching assignments and examinations to online courses or course lessons, receiving student submissions, and executing automated grading for online exams.
- **Supported Business Scope**:
  - Attaching assessments directly to courses/lessons without requiring a physical `AcademicGroup`.
  - Receiving online student submissions and executing automatic grading for exams.
  - Providing online assessment grades to students and linked parents.

---

## 8. Business Scope

### In Scope
The business scope comprises exclusively the ten confirmed product modules:
1. **Student Management**
2. **Attendance & Absence** (Physical Classroom)
3. **Lectures & Lessons**
4. **Exams & Assignments**
5. **Parent Student Status**
6. **Notifications**
7. **Groups Management** (Physical Classroom)
8. **Users & Permissions**
9. **Subscriptions / Student Payment Status**
10. **Online Learning / Courses** (Asynchronous Learning)

### Out of Scope
Any business capability, operational workflow, or feature not represented in the approved product backlog is currently **Out of Scope** unless formally reviewed and approved in subsequent backlog versions. This includes, but is not limited to:
- Integrated commercial payment gateways, credit card checkouts, online billing, or automated invoice generation (`TBD — Requires Product Clarification`).
- Real-time video conferencing / live interactive virtual classrooms.
- Social networking or direct inter-student chat channels.
- Advanced predictive AI tutoring engines.
- Third-party school administrative ERP integrations.
- Local SQLite caching of full binary video files (video streaming remains online-required via Bunny Stream CDN).

---

## 9. Business Constraints

The following business constraints represent known areas where boundaries or definitions remain open:

1. **Secretariat Responsibilities**: The operational scope, administrative duties, and specific permissions of the Secretariat role are undefined (`TBD — Requires Product Clarification`).
2. **Role Responsibility Boundaries**: The exact division of administrative tasks between Teachers and Secretariat (e.g., student enrollment, course creation, attendance logging) is not demarcated.
3. **Notification Recipients & Channels**: The exact recipient routing and delivery transport channels are not specified in the backlog (`TBD — Requires Product Clarification`).
4. **Student Assessment Submission Workflows**: File format constraints, submission deadlines, retry policies, and late submission handling are undefined.
5. **Student Level Definition**: Student level (`مستوى الطالب`) is a confirmed product concept; its calculation methodology, rubric, or scale is undefined (`TBD — Requires Product Clarification`).
6. **Payment Status Lifecycle & Commercial Subscriptions**: The valid states (e.g., Paid, Unpaid) and update workflows for student payment status, as well as commercial course pricing/billing plans, are undefined (`TBD — Requires Product Clarification`).
7. **Performance & Volume Targets**: Specific concurrent user targets, storage quotas, and throughput requirements are undefined.

---

## 10. Business Rules Status

Detailed domain logic, entity relationships, validation concepts, and architectural processing boundaries are documented in:
- [docs/03-Architecture/business-logic.md](file:///d:/el_awal/docs/03-Architecture/business-logic.md)

This Business Requirements Document defines high-level product capabilities and does not duplicate or redefine granular business logic rules.

---

## 11. Business Success Criteria

### Currently Defined Success Criteria
The product is successful at the business requirement level when all approved capabilities across the ten modules are available and operational as specified:
- Instructors and administrators can manage students, physical groups, schedules, attendance (including unique student QR code generation and rapid teacher QR code scanning), content, assessments, and author/publish online courses.
- Students can access physical educational assets, present their unique QR code for physical attendance verification, enroll in and consume online courses asynchronously, track learning progress, and submit assignments and exams.
- Automated grading executes for submitted examinations in both physical and online contexts.
- Parents have access to student academic records, notes, grades, assignment status, physical attendance, and online course progress.
- Defined schedule reminders and academic alert notifications are provided.
- Student payment statuses and course access entitlements are tracked and represented within the system.

> **Measurable Business KPIs**: Quantitative targets (such as customer acquisition numbers, revenue targets, active user retention percentages, or satisfaction benchmarks) are not defined in the source documentation (`TBD — Requires Product Clarification`).

---

## 12. Assumptions

The following assumptions apply strictly to the documentation baseline:
1. **Confirmed Roles**: The four roles listed in the backlog (`المدرس`, `الطالب`, `ولي الامر`, `السكرتارية`) represent all primary human actors interacting with the product scope.
2. **Approved Scope**: The ten modules and confirmed backlog items (including student QR code attendance and online courses) represent the complete and authorized baseline product scope.
3. **Single Identity Principle**: A student maintains a single unified identity across physical classroom groups and online course enrollments.
4. **Traceability**: All functional specifications, user stories, and architecture designs derive directly from this product scope without introducing external assumptions.

---

## 13. Open Business Decisions

The following business-level decisions require formal product clarification:

1. **Secretariat Responsibilities**: Define the exact operational functions, workflows, and administrative authority assigned to the Secretariat role.
2. **Teacher vs. Secretariat Responsibility Boundaries**: Determine whether administrative tasks (adding students, creating groups, authoring courses, recording attendance, tracking payment status) are performed by Teachers, Secretariat, or both.
3. **Student Submission Workflow**: Define file formats, size limitations, due dates, grace periods, and retry policies for assignment and exam submissions.
4. **Parent Access Method**: Define the interaction mechanism and credential model for parents to access student status and reports.
5. **Notification Recipients**: Specify the exact recipient(s) for each notification type.
6. **Notification Delivery Channels**: Define the delivery channels (in-app, SMS, email, WhatsApp, push notifications) supported for each notification type.
7. **Payment Status & Commercial Course Subscriptions**: Define the permissible values, pricing models, commercial subscription lifecycles, and update workflows for student payment status and course access (`TBD — Requires Product Clarification`).
8. **Student Level Definition**: Clarify the definition and evaluation basis for student level (`مستوى الطالب`).
9. **Business Success Criteria**: Establish formal quantitative business KPIs, operational metrics, and target adoption benchmarks.

---

## 14. Business Requirements Traceability

| BR ID | Business Requirement | Backlog Item(s) / Scope | FR ID(s) | User Story ID(s) | Status |
|---|---|---|---|---|---|
| **BR-001** | Student Management | `بيانات الطالب` | `FR-STU-004` | `US-STU-001` | Partially Defined |
| **BR-001** | Student Management | `المجموعة و الصف` | `FR-STU-002` | `US-STU-001` | Partially Defined |
| **BR-001** | Student Management | `بيانات ولي الامر` | `FR-STU-003` | `US-STU-002` | Partially Defined |
| **BR-001** | Student Management | `حالة الطلاب` | `FR-STU-001` | `US-STU-003` | Partially Defined |
| **BR-002** | Group & Lesson Management | `انشاء مجموعة` | `FR-GRP-003` | `US-GRP-001` | Partially Defined |
| **BR-002** | Group & Lesson Management | `تحديد مواعيد الدروس` | `FR-GRP-001` | `US-GRP-001` | Partially Defined |
| **BR-002** | Group & Lesson Management | `اضافة طلاب` | `FR-GRP-002` | `US-GRP-002` | Partially Defined |
| **BR-003** | Attendance & Absence Management | `تسجيل حضور الطلاب` | `FR-ATT-003` | `US-ATT-001` | Partially Defined |
| **BR-003** | Attendance & Absence Management | `تسجيل الحضور عبر مسح QR Code` | `FR-ATT-004` | `US-ATT-003` | Defined |
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
| **BR-OL-001**| Online Course & Curriculum Management | `الدورات والمناهج عبر الإنترنت` | `FR-OL-001`, `FR-OL-002` | `US-OL-001` | Defined |
| **BR-OL-002**| Course Enrollment & Access Entitlement | `الاشتراك والالتحاق بالدورة` | `FR-OL-003` | `US-OL-002` | Defined |
| **BR-OL-003**| Asynchronous Course Lesson Delivery | `تقديم الدروس والمحتوى الرقمي` | `FR-OL-004` | `US-OL-003` | Defined |
| **BR-OL-004**| Online Course Progress Tracking | `متابعة التقدم في الدورات` | `FR-OL-005`, `FR-OL-008` | `US-OL-004`, `US-OL-005` | Defined |
| **BR-OL-005**| Online Course Assessments & Evaluations | `الواجبات والامتحانات الإلكترونية` | `FR-OL-006` | `US-OL-006` | Defined |

---

## 15. Business Requirements vs Functional Requirements

To ensure clear separation of concerns across product documentation:

| Dimension | Business Requirements (`BRD`) | Functional Requirements (`FRD`) |
|---|---|---|
| **Primary Question** | **Why & What capability?** | **How does the system behave?** |
| **Focus** | High-level business capabilities, organizational objectives, and product scope. | Detailed functional behavior, inputs, outputs, preconditions, and system interactions. |
| **Audience** | Product Managers, Stakeholders, Business Owners, Lead Architects. | Developers, QA Engineers, UX Designers, System Implementers. |
| **Granularity** | Coarse-grained capability blocks (`BR-001` to `BR-010`, `BR-OL-001` to `BR-OL-005`). | Fine-grained requirement statements (`FR-STU-001`, `FR-ATT-001`, `FR-OL-001`, etc.). |
| **Technical Content** | Zero technical, schema, or endpoint details. | Concrete behavior, validation triggers, and acceptance conditions. |
