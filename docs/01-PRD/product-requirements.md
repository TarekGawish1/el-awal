# Product Requirements Document (PRD)

## 1. Document Overview

### 1.1 Purpose
This Product Requirements Document (PRD) serves as the central product specification for the **Educational Management System for Teachers and Students** (El Awal). It translates high-level business goals into concrete product capabilities, establishing explicit end-to-end traceability across business requirements, functional behaviors, user stories, use cases, acceptance criteria, database entities, APIs, and quality assurance test cases.

### 1.2 Product Overview
The platform is an educational management and learning platform designed to streamline instructional, administrative, and communication workflows across two distinct educational delivery models:
1. **Physical Learning (Classroom Model)**: Managing physical student cohorts, schedules, live classroom sessions, camera-based QR roll-call attendance, and physical group content/assessments.
2. **Online Learning (Asynchronous Course Model)**: Authoring structured online courses with modules and lessons, managing student course enrollments and access entitlements, asynchronous video/document streaming, independent progress tracking, and online assessments.

The system serves four confirmed stakeholder groups: **Teachers (`المدرس`)**, **Students (`الطالب`)**, **Parents (`ولي الأمر`)**, and **Secretariat (`السكرتارية`)**.

### 1.3 Target Users
- **Instructors / Teachers**: Manage physical groups, schedules, classroom attendance (via QR scanning and manual entry), author and publish online courses (modules, lessons, content, assessments), and evaluate student performance.
- **Learners / Students**: Attend physical sessions via unique QR codes, enroll in and consume online courses asynchronously, watch video streams, review documents/summaries, track lesson progress, submit homework and exams, and view grades and alerts.
- **Guardians / Parents**: Monitor physical student attendance, exam scores, homework completion statuses, teacher notes, academic levels, and online course completion progress.
- **Administrative Staff / Secretariat**: Perform operational student administration, physical group allocations, online course enrollments, and payment status tracking.

### 1.4 Product Goals
1. Centralize student profiles, contact details, status, physical group allocations, and online course enrollments in a unified system.
2. Provide simple, low-friction physical attendance and absence recording and reporting, including unique student QR code provisioning and fast teacher QR code scanning.
3. Facilitate seamless digital delivery of educational files, summaries, references, and lecture recordings for physical groups and online courses.
4. Support the full lifecycle of assignments and examinations, including automated exam grading across classroom groups and online courses.
5. Provide parents with direct visibility into student academic progress, attendance standing, and online course progress.
6. Deliver timely notifications for schedule reminders, unsolved assignments, new assessments, grades, and absences.
7. Maintain clear, role-based visibility across Teachers, Students, Parents, and Secretariat.
8. Track individual student payment status within the educational operational context.
9. Support independent online course authoring, modular structuring, and asynchronous content delivery without requiring membership in a physical classroom group.
10. Provide resilient offline-first caching for course metadata and progress outbox queuing with server-authoritative synchronization.

### 1.5 Document Scope
This document covers the complete functional scope of the ten approved product modules. It explicitly defines what the product must accomplish without prescribing internal database schemas, API payload structures, or backend framework implementations.

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
Educational practitioners require a unified platform capable of managing both in-person physical tutoring cohorts and digital asynchronous distance learning. Without an integrated architecture, student records, physical attendance logs, online course progress, and assessment evaluations become fragmented, forcing instructors and parents to navigate disparate, incompatible tools.

### 2.2 Target Audience
- **Primary Beneficiaries**: Teachers seeking unified group and course authoring workflows; Students seeking clear access to classroom materials and flexible online course learning; Parents seeking transparent visibility into their children's complete academic standing.
- **Administrative Beneficiaries**: Secretariat staff managing student records, group assignments, course enrollments, and payment statuses.

### 2.3 Expected Value
- **Operational Efficiency**: Streamlined group scheduling, rapid QR-based attendance, digital course authoring, and automated exam grading.
- **Academic Transparency**: Immediate parental access to exam grades, evaluations, notes, attendance records, and online course progress metrics.
- **Learning Continuity**: Centralized access for students to lecture recordings, video streams, summaries, and downloadable references both online and offline.

### 2.4 Desired Product Outcome
A dependable, role-aware educational management platform where physical classroom operations and online asynchronous courses operate seamlessly with unified student identities and resilient offline capabilities.

---

## 3. Product Goals

| Goal ID | Product Goal | Description | Success Indicator |
|---|---|---|---|
| **GOAL-001** | Student Profile Centralization | Enable structured capture and viewing of student data, parent data, student status, physical group allocations, and online course enrollments. | All student data entities represented and retrievable across physical and online learning. |
| **GOAL-002** | Group & Schedule Organization | Enable creation of physical educational groups, student roster assignment, and lesson time scheduling. | Groups created with assigned students and scheduled lesson times. |
| **GOAL-003** | Attendance & Absence Tracking | Enable logging of attendance and absence per student/session (via direct roster entry and teacher scanning of unique student QR codes) and generation of attendance reports. | Attendance records logged accurately via manual entry and QR scans; absence reports generated. |
| **GOAL-004** | Educational Asset Distribution | Provide capabilities to upload and access files, summaries, references, and lecture recordings with content viewing tracking. | Educational assets successfully uploaded and accessible to enrolled students. |
| **GOAL-005** | Assessment Lifecycle Delivery | Support creation, upload, distribution, and student submission of assignments and exams in physical and online contexts. | Students able to deliver submissions for active assignments and exams. |
| **GOAL-006** | Automated Exam Grading | Provide automated evaluation and grade assignment for submitted student examinations. | Submitted exams evaluated and graded automatically. |
| **GOAL-007** | Parental Progress Transparency | Provide parents with direct visibility into student results, evaluations, notes, grades, assignment status, physical attendance, and online course progress. | Parents successfully access academic standing and course progress metrics. |
| **GOAL-008** | Timely Academic Notifications | Deliver event notifications for pre-lesson reminders, unsolved homework, new exams, exam grades, and student absences. | Notifications triggered for all confirmed event conditions. |
| **GOAL-009** | Role-Aware Access Support | Represent and maintain access boundaries across Teacher, Student, Parent, and Secretariat roles. | All 4 confirmed roles represented in system operations. |
| **GOAL-010** | Student Payment Tracking | Provide clear tracking and display of individual student payment status. | Student payment status represented and visible to authorized roles. |
| **GOAL-OL-001**| Online Course Lifecycle | Enable teachers to create, structure (modules/lessons), publish, and manage asynchronous online courses. | Online courses successfully authored, structured, and published. |
| **GOAL-OL-002**| Course Enrollment & Access | Enable student enrollment and entitlement verification for online courses independently of physical group membership. | Enrolled students access course materials; unenrolled access is blocked. |
| **GOAL-OL-003**| Online Lesson Delivery | Deliver streaming video and downloadable lesson assets asynchronously. | Course lessons stream smoothly via dedicated video infrastructure without local binary bloat. |
| **GOAL-OL-004**| Independent Course Progress | Track student lesson start, viewing position, completion state, and aggregate course completion percentage. | Course progress metrics calculated accurately and synced across devices. |

---

## 4. Target Users

| User Persona | Role | Main Responsibilities | Main Goals | Key Needs | Persona Ref |
|---|---|---|---|---|---|
| **Teacher (`المدرس`)** | Primary Educator | Creates physical groups, sets schedules, uploads files/recordings, authors assignments/exams, scans student QR codes for attendance, writes evaluations, and authors/publishes online courses with structured modules and lessons. | Maximize instructional time; maintain accurate physical and online records; track student progress across learning models. | Fast attendance QR scanning, flexible course builder, easy material uploads, organized grading. | [UX-PER-001](file:///d:/el_awal/docs/02-UX/user-personas.md#L27-L68) |
| **Student (`الطالب`)** | Primary Learner | Reviews lesson materials, watches lecture recordings and course videos, presents QR code for session attendance, consumes online course modules asynchronously, submits assignments and exams, checks grades. | Complete academic tasks on time; access physical and online learning resources easily; learn at own pace. | Unique QR attendance badge, seamless online course player, clear deadlines, easy submission interface, offline progress sync. | [UX-PER-002](file:///d:/el_awal/docs/02-UX/user-personas.md#L69-L108) |
| **Parent (`ولي الأمر`)** | Guardian / Monitor | Reviews student grades, evaluations, teacher notes, assignment completion status, physical attendance records, and online course progress. | Stay informed about child's physical attendance and digital course advancement. | Transparent, clear summary of student results, attendance history, and course progress bars. | [UX-PER-003](file:///d:/el_awal/docs/02-UX/user-personas.md#L109-L151) |
| **Secretariat (`السكرتارية`)** | Operational Admin | Administrative support role for managing student data, physical group enrollments, online course enrollments, and payment status tracking. *(Detailed duties: `TBD`)* | Support administrative workflows; manage physical roster and online course access; track payment statuses. | Roster management, course enrollment management, payment status visibility. | [UX-PER-004](file:///d:/el_awal/docs/02-UX/user-personas.md#L152-L190) |

---

## 5. Product Scope

### 5.1 In Scope
The product scope encompasses ten confirmed product modules:
1. **Student Management**: Student profiles, parent contact data, student status, and group/grade associations.
2. **Attendance & Absence**: Recording physical student attendance (including unique student QR code provisioning and teacher QR code scanning), recording absences, and attendance/absence reporting.
3. **Lectures & Lessons**: Uploading files, references, summaries, lecture recordings, and tracking content viewing.
4. **Exams & Assignments**: Creating/uploading assignments and exams, student submissions, automatic exam grading, and displaying results to parents across physical and online contexts.
5. **Parent Student Status**: Parent access to evaluations, teacher notes, exam grades, student level, assignment status, physical attendance records, and online course progress.
6. **Notifications**: Delivery of alerts for 1-hour pre-lesson reminders, unsolved homework, new exams, exam grades, and student absences.
7. **Groups Management**: Physical group creation, lesson time scheduling, and adding students to groups.
8. **Users & Permissions**: Representation of the four confirmed user roles (Teacher, Student, Parent, Secretariat).
9. **Subscriptions / Payment Status**: Tracking and viewing individual student payment status.
10. **Online Learning (Courses)**: Course authoring, module/lesson hierarchy, course enrollment, access entitlement, asynchronous video/file delivery, independent course progress tracking, and online course assessments.

### 5.2 Out of Scope
The following capabilities are explicitly outside the current approved product scope:
- Commercial payment gateway checkout integration, automated credit card processing, and invoice generation (`TBD — Requires Product Clarification`).
- Real-time video conferencing / live interactive virtual classrooms (`TBD`).
- Peer-to-peer social networking and student chat channels (`TBD`).
- Complex custom formula gradebooks, GPA weighting engines, and external school ERP synchronizations (`TBD`).
- Third-party learning analytics engines (`TBD`).
- Storing full binary video files inside local SQLite/client databases (video streaming requires network connectivity via Bunny Stream).

---

## 6. Product Modules

| Module Name | Purpose | Primary Users | Main Capabilities | Related BR | Related FR | Related UC |
|---|---|---|---|---|---|---|
| **1. Student Management** | Centralize student and parent profiles and academic groupings. | Teacher, Secretariat | Student data, parent data, student status, group and grade/class. | `BR-001` | `FR-STU-001..004` | `UC-STU-001..003` |
| **2. Attendance & Absence** | Capture and report session-level physical student presence and absence. | Teacher, Secretariat | Generate unique student QR codes, scan QR codes to log attendance, log attendance, log absence, generate attendance/absence reports. | `BR-003` | `FR-ATT-001..004` | `UC-ATT-001..003` |
| **3. Lectures & Lessons** | Distribute instructional materials and lecture recordings. | Teacher, Student | Upload files, references, summaries, recordings; track content viewing. | `BR-004` | `FR-LES-001..003` | `UC-LES-001..002` |
| **4. Exams & Assignments** | Author, distribute, receive, and automatically grade assessments. | Teacher, Student | Create/upload homework and exams, student submission, auto-grading exams. | `BR-005`, `BR-006`, `BR-007` | `FR-EXM-001..007` | `UC-EXM-001..004` |
| **5. Parent Student Status** | Provide parent visibility into student performance and attendance. | Parent | View evaluations, notes, exam grades, student level, assignment status, physical attendance, online course progress. | `BR-007` | `FR-PAR-001..005`, `FR-OL-007` | `UC-PAR-001..002`, `UC-OL-005` |
| **6. Notifications** | Broadcast event-driven reminders and academic alerts. | All Roles | Pre-lesson reminder, unsolved homework alert, exam notice, grade notice, absence alert. | `BR-008` | `FR-NOT-001..005` | `UC-NOT-001..004` |
| **7. Groups Management** | Structure physical educational cohorts and schedule recurring lesson times. | Teacher, Secretariat | Create physical group, schedule lesson times, add students to groups. | `BR-002` | `FR-GRP-001..003` | `UC-GRP-001..002` |
| **8. Users & Permissions** | Represent the four authorized system personas. | All Roles | Representation of Teacher, Student, Parent, and Secretariat entities. | `BR-009` | `FR-USR-001..004` | `UC-USR-001` |
| **9. Subscriptions** | Track individual student fee/payment standing. | Secretariat, Teacher | Representation and viewing of payment status for each student. | `BR-010` | `FR-SUB-001` | `UC-SUB-001` |
| **10. Online Learning (Courses)** | Manage asynchronous digital courses, structured modules/lessons, enrollments, and progress. | Teacher, Student, Parent, Secretariat | Create courses, modules, lessons, enroll students, deliver async video/files, track progress, conduct online assessments. | `BR-OL-001..005` | `FR-OL-001..008` | `UC-OL-001..006` |

---

## 7. Product Requirements

### PRD-001: Student Profile & Academic Group Association
- **Requirement**: The system shall allow authorized users to manage and view student data, associated parent data, student status, and group/grade classification.
- **Description**: Centralizes student demographic details, parent contact linkage, enrollment status, and assigned class/group hierarchy.
- **Priority**: Must Have
- **User/Actor**: Teacher / Secretariat (`TBD — Requires Product Clarification`)
- **Related Business Requirement**: `BR-001`
- **Related Functional Requirements**: `FR-STU-001`, `FR-STU-002`, `FR-STU-003`, `FR-STU-004`

---

### PRD-002: Physical Group & Schedule Management
- **Requirement**: The system shall allow authorized users to create physical educational groups, assign students to groups, and define recurring lesson schedules.
- **Description**: Supports the establishment of student cohorts, timetable management, and physical roster assignments.
- **Priority**: Must Have
- **User/Actor**: Teacher / Secretariat (`TBD — Requires Product Clarification`)
- **Related Business Requirement**: `BR-002`
- **Related Functional Requirements**: `FR-GRP-001`, `FR-GRP-002`, `FR-GRP-003`

---

### PRD-003: Physical Attendance & Absence Tracking with QR Scanning
- **Requirement**: The system shall provision a unique QR credential for every student and allow authorized teachers to record session-level attendance rapidly via QR code scanning or manual entry, and generate attendance reports.
- **Description**: Enables fast camera roll-call check-in during physical lesson sessions, verifies teacher ownership and group enrollment, deduplicates repeat scans idempotently, and provides absence logs and reports.
- **Priority**: Must Have
- **User/Actor**: Teacher / Secretariat / Student
- **Related Business Requirement**: `BR-003`
- **Related Functional Requirements**: `FR-ATT-001`, `FR-ATT-002`, `FR-ATT-003`, `FR-ATT-004`

---

### PRD-004: Educational Content & Lecture Recordings Delivery
- **Requirement**: The system shall allow teachers to upload educational files, summaries, references, and lecture recordings and make them accessible to authorized students with viewing tracking.
- **Description**: Supports digital document distribution via Cloudflare R2 and lecture recording streaming via Bunny Stream, tracking student viewing progress.
- **Priority**: Must Have
- **User/Actor**: Teacher / Student
- **Related Business Requirement**: `BR-004`
- **Related Functional Requirements**: `FR-LES-001`, `FR-LES-002`, `FR-LES-003`

---

### PRD-005: Assignment & Exam Lifecycle Management
- **Requirement**: The system shall allow teachers to author, upload, and distribute assignments and examinations, and allow students to submit their completed assessments.
- **Description**: Handles the complete assessment lifecycle across physical cohorts and online courses.
- **Priority**: Must Have
- **User/Actor**: Teacher / Student
- **Related Business Requirement**: `BR-005`
- **Related Functional Requirements**: `FR-EXM-003`, `FR-EXM-004`, `FR-EXM-005`, `FR-EXM-006`, `FR-EXM-007`

---

### PRD-006: Automated Exam Grading Engine
- **Requirement**: The system shall automatically evaluate and grade student examination submissions containing structured questions.
- **Description**: Compares student responses against correct answer keys and records calculated scores synchronously.
- **Priority**: Must Have
- **User/Actor**: System / Student
- **Related Business Requirement**: `BR-006`
- **Related Functional Requirements**: `FR-EXM-002`

---

### PRD-007: Parent Academic Standing & Attendance Visibility
- **Requirement**: The system shall provide parents with read-only visibility into student exam grades, evaluations, teacher notes, assignment completion statuses, and physical attendance/absence records for linked children.
- **Description**: Enables guardians to monitor child performance transparently.
- **Priority**: Must Have
- **User/Actor**: Parent
- **Related Business Requirement**: `BR-007`
- **Related Functional Requirements**: `FR-EXM-001`, `FR-PAR-001`, `FR-PAR-002`, `FR-PAR-003`, `FR-PAR-004`, `FR-PAR-005`

---

### PRD-008: Automated Event Notifications
- **Requirement**: The system shall trigger automated notifications for 1-hour pre-lesson reminders, unsolved homework, new exams, released grades, and recorded student absences.
- **Description**: Delivers event-driven alerts to keep stakeholders informed.
- **Priority**: Must Have
- **User/Actor**: All Roles
- **Related Business Requirement**: `BR-008`
- **Related Functional Requirements**: `FR-NOT-001`, `FR-NOT-002`, `FR-NOT-003`, `FR-NOT-004`, `FR-NOT-005`

---

### PRD-009: Users & Role-Based Access Control
- **Requirement**: The system shall represent and enforce role boundaries for Teacher, Student, Parent, and Secretariat users.
- **Description**: Enforces authentication, authorization, and data isolation.
- **Priority**: Must Have
- **User/Actor**: All Roles
- **Related Business Requirement**: `BR-009`
- **Related Functional Requirements**: `FR-USR-001`, `FR-USR-002`, `FR-USR-003`, `FR-USR-004`

---

### PRD-010: Student Payment Status Tracking
- **Requirement**: The system shall allow authorized staff to track and display the payment status for each student per billing period.
- **Description**: Administrative record of fee status without direct merchant payment processing.
- **Priority**: Must Have
- **User/Actor**: Secretariat / Teacher
- **Related Business Requirement**: `BR-010`
- **Related Functional Requirements**: `FR-SUB-001`

---

### PRD-OL-001: Online Course Catalog & Curriculum Structure Management
- **Requirement**: The system shall allow teachers to author, structure, publish, and manage independent asynchronous educational courses consisting of ordered modules and lessons.
- **Description**: Enables educators to build comprehensive digital curricula with titles, descriptions, subject categories, publication states (`DRAFT`, `PUBLISHED`, `ARCHIVED`), ordered modules, and lessons.
- **Priority**: Must Have
- **User/Actor**: Teacher / Secretariat
- **Related Business Requirement**: `BR-OL-001`
- **Related Functional Requirements**: `FR-OL-001`, `FR-OL-002`

---

### PRD-OL-002: Course Enrollment & Access Entitlement Verification
- **Requirement**: The system shall support student enrollment into online courses and enforce server-authoritative access entitlement validation before granting access to course content.
- **Description**: Manages `CourseEnrollment` and `CourseAccess` states, ensuring only entitled students can access lesson videos, summaries, and assessments.
- **Priority**: Must Have
- **User/Actor**: Student / Teacher / Secretariat
- **Related Business Requirement**: `BR-OL-002`
- **Related Functional Requirements**: `FR-OL-003`

---

### PRD-OL-003: Asynchronous Course Lesson Content Delivery
- **Requirement**: The system shall deliver course lesson materials—including adaptive video streaming via Bunny Stream and downloadable documents/summaries via Cloudflare R2—asynchronously without requiring physical classroom scheduling.
- **Description**: Allows enrolled students to stream video lessons and download PDF files on-demand.
- **Priority**: Must Have
- **User/Actor**: Student / Teacher
- **Related Business Requirement**: `BR-OL-003`
- **Related Functional Requirements**: `FR-OL-004`

---

### PRD-OL-004: Independent Online Course Progress Tracking
- **Requirement**: The system shall independently track student progress across course lessons (start state, last viewing position, completion state, completion timestamp) and compute aggregate course completion percentage.
- **Description**: Provides real-time and offline-resilient progress logging, allowing students to resume playback and view completion indicators.
- **Priority**: Must Have
- **User/Actor**: Student / Teacher
- **Related Business Requirement**: `BR-OL-004`
- **Related Functional Requirements**: `FR-OL-005`

---

### PRD-OL-005: Online Course Assessments & Automated Evaluation
- **Requirement**: The system shall allow attaching assignments and examinations directly to online courses or course lessons, enable student submissions, and automatically grade online exams.
- **Description**: Extends assessment capabilities to online courses without requiring physical `AcademicGroup` linkage.
- **Priority**: Must Have
- **User/Actor**: Teacher / Student
- **Related Business Requirement**: `BR-OL-005`
- **Related Functional Requirements**: `FR-OL-006`

---

### PRD-OL-006: Parent Online Learning Progress Visibility
- **Requirement**: The system shall provide verified parents with read-only visibility into their linked children's enrolled online courses, lesson completion progress, and online assessment scores.
- **Description**: Gives parents complete insight into online coursework alongside physical attendance.
- **Priority**: Must Have
- **User/Actor**: Parent
- **Related Business Requirement**: `BR-007`, `BR-OL-004`
- **Related Functional Requirements**: `FR-OL-007`

---

### PRD-OL-007: Offline-First Course Metadata Caching & Progress Sync
- **Requirement**: The client application shall cache course metadata, structure, and lesson metadata in local storage for offline browsing, queue progress events in a durable local outbox during network disconnects, and synchronize automatically upon reconnection.
- **Description**: Ensures uninterrupted learning continuity while preserving server authority for access entitlement and grading.
- **Priority**: Must Have
- **User/Actor**: Student / System
- **Related Business Requirement**: `BR-OL-004`
- **Related Functional Requirements**: `FR-OL-008`

---

## 8. Core User Journeys

### 8.1 Physical Learning Student Journey
```text
Student Login
  │
  ├──► Present QR Attendance Badge (Digital Student Card)
  │      └── Teacher Scans at Classroom Door ──► Attendance Marked "PRESENT"
  │
  ├──► View Timetable & Physical Group Sessions
  │
  └──► Access Physical Group Files, Lecture Recordings & In-Class Assessments
```

### 8.2 Online Learning Student Journey
```text
Student Login
  │
  ├──► Browse Course Catalog & Enroll in Course
  │      └── Server Validates Access Entitlement (CourseAccess Active)
  │
  ├──► Access Course Outline (Modules & Lessons)
  │      ├── Stream Video (Bunny Stream Edge Player)
  │      ├── Download PDF Summaries & Reference Documents (Cloudflare R2)
  │      └── Track Progress (Auto-Logged / Resumed)
  │
  ├──► Take Online Course Assessments (Assignments / Auto-Graded Exams)
  │
  └──► Offline Mode: Continue Cached Lesson ──► Queue Progress Event ──► Auto-Sync on Reconnect
```

### 8.3 Teacher Course Authoring Journey
```text
Teacher Login
  │
  ├──► Create Course (Title, Description, Subject, Grade Level)
  │
  ├──► Structure Course Hierarchy (Add Modules ──► Add Lessons)
  │
  ├──► Attach Educational Content (Upload Videos via Bunny Stream, PDFs via R2)
  │
  ├──► Attach Online Assessments (Assignments & Auto-Graded Exams)
  │
  └──► Publish Course (Status: DRAFT ──► PUBLISHED)
```

### 8.4 Parent Complete Monitoring Journey
```text
Parent Login
  │
  ├──► Select Linked Child
  │      │
  │      ├──► Physical Learning Tab:
  │      │      ├── View Academic Groups & Schedules
  │      │      ├── View Attendance & Absence History (QR / Manual)
  │      │      └── View Teacher Notes & Evaluations
  │      │
  │      └──► Online Learning Tab:
  │             ├── View Enrolled Online Courses
  │             ├── View Course Completion Progress Bars & Lesson Statuses
  │             └── View Online Assessment Results & Exam Grades
```

---

## 9. Business Rules Summary

1. **Single Student Identity**: A student has one user account and profile. A student may concurrently hold physical group enrollments and online course enrollments without duplicate accounts.
2. **Domain Boundary Separation**:
   - Physical domain entities (`AcademicGroup`, `GroupEnrollment`, `LessonSchedule`, `LessonSession`, `AttendanceRecord`) are distinct from Online domain entities (`Course`, `CourseEnrollment`, `CourseModule`, `CourseLesson`, `CourseContent`, `CourseProgress`, `CourseAccess`).
   - A `Course` is an independent entity, never modeled as a subtype of `AcademicGroup`.
3. **Attendance Boundary**: Online course enrollments do NOT participate in QR attendance. The QR scanner strictly validates physical `GroupEnrollment` for an active `LessonSession`.
4. **Assessment Dual Parentage**: Assessments can belong either to a physical `AcademicGroup` OR an online `CourseLesson`/`Course`, preserving the auto-grading engine across both contexts.
5. **Enrollment vs. Entitlement vs. Payment**:
   - `CourseEnrollment` records student membership in a course.
   - `CourseAccess` records whether the student is entitled to view content (`ACTIVE`, `EXPIRED`, `SUSPENDED`).
   - `StudentPaymentRecord` records administrative fee tracking. Commercial billing rules remain `TBD`.
6. **Offline Security Invariant**: Local client storage is a cache, never an authorization authority. The backend server remains authoritative for all access verification, auto-grading, and enrollment changes.

---

## 10. Functional Requirements Mapping

| Product Requirement | Functional Requirement ID | Backlog Item / Domain | Use Case ID | User Story ID |
|---|---|---|---|---|
| **PRD-001** | `FR-STU-001..004` | `Student Management` | `UC-STU-001..003` | `US-STU-001..003` |
| **PRD-002** | `FR-GRP-001..003` | `Groups Management` | `UC-GRP-001..002` | `US-GRP-001..002` |
| **PRD-003** | `FR-ATT-001..004` | `Attendance & Absence` | `UC-ATT-001..003` | `US-ATT-001..003` |
| **PRD-004** | `FR-LES-001..003` | `Lectures & Lessons` | `UC-LES-001..002` | `US-LES-001..002` |
| **PRD-005** | `FR-EXM-003..007` | `Exams & Assignments` | `UC-EXM-001..002` | `US-EXM-001..002` |
| **PRD-006** | `FR-EXM-002` | `Automatic Exam Grading` | `UC-EXM-003` | `US-EXM-003` |
| **PRD-007** | `FR-EXM-001`, `FR-PAR-001..005` | `Parent Student Status` | `UC-EXM-004`, `UC-PAR-001..002` | `US-EXM-004`, `US-PAR-001..002` |
| **PRD-008** | `FR-NOT-001..005` | `Notifications` | `UC-NOT-001..004` | `US-NOT-001..004` |
| **PRD-009** | `FR-USR-001..004` | `Users & Permissions` | `UC-USR-001` | `US-USR-001` |
| **PRD-010** | `FR-SUB-001` | `Subscriptions` | `UC-SUB-001` | `US-SUB-001` |
| **PRD-OL-001**| `FR-OL-001`, `FR-OL-002` | `Online Learning (Courses)` | `UC-OL-001` | `US-OL-001` |
| **PRD-OL-002**| `FR-OL-003` | `Online Learning (Enrollment)` | `UC-OL-002` | `US-OL-002` |
| **PRD-OL-003**| `FR-OL-004` | `Online Learning (Content)` | `UC-OL-003` | `US-OL-003` |
| **PRD-OL-004**| `FR-OL-005` | `Online Learning (Progress)` | `UC-OL-003` | `US-OL-004` |
| **PRD-OL-005**| `FR-OL-006` | `Online Learning (Assessments)` | `UC-OL-004` | `US-OL-006` |
| **PRD-OL-006**| `FR-OL-007` | `Parent Online Progress` | `UC-OL-005` | `US-OL-007` |
| **PRD-OL-007**| `FR-OL-008` | `Offline Sync & Outbox` | `UC-OL-006` | `US-OL-005` |

---

## 11. Non-Functional Product Expectations

1. **Performance**: Online video streams initiate in <2.0 seconds via Bunny Stream CDN. Metadata queries and progress sync batch endpoints respond in <300ms.
2. **Security & Authorization**: BOLA/IDOR protection guarantees students can access only courses and progress records they own or are entitled to. Server remains authoritative.
3. **Availability**: Target 99.9% uptime for core API and video streaming distribution.
4. **Offline Resilience**: Course structure and lesson metadata are cached locally; progress events queue in an IndexedDB/SQLite outbox and sync automatically on reconnect without data loss.
5. **Dual-Language UX**: Full Arabic (`RTL`) and English (`LTR`) support across course catalog, lesson player, and parent views.

---

## 12. Acceptance Criteria

| AC ID | Connected PRD | Acceptance Criteria Statement | Testable Verification |
|---|---|---|---|
| **AC-001** | `PRD-001` | Given valid student data, when submitted, then the student profile and group/grade association are represented. | View student profile and confirm data matches input. |
| **AC-002** | `PRD-001` | Given parent data, when entered, then the parent data is associated with the student record. | Verify parent contact information is displayed within the student context. |
| **AC-003** | `PRD-001` | Given a student record, when status is set, then the student status is represented. | Verify student status indicator displays in student management views. |
| **AC-004** | `PRD-002` | Given group parameters and lesson times, when created, then the group and scheduled times are available. | Retrieve group record and verify scheduled lesson times. |
| **AC-005** | `PRD-002` | Given an existing group and student(s), when added, then the student membership in the group is recorded. | Confirm students appear in the group roster. |
| **AC-006** | `PRD-003` | Given a group session, when attendance or absence is logged manually, then the student attendance state is recorded. | Verify student presence/absence record for the specified session date. |
| **AC-007** | `PRD-003` | Given recorded attendance records, when requested, then attendance and absence reports are presented. | Generate attendance report and verify calculated presence/absence counts. |
| **AC-008** | `PRD-004` | Given educational files, references, or summaries, when uploaded, then the files become available to authorized users. | Download/open uploaded file from student and teacher views. |
| **AC-009** | `PRD-004` | Given a lecture recording, when uploaded, then the recording becomes available in the system. | Access lecture recording item from student learning view. |
| **AC-010** | `PRD-004` | Given uploaded educational content, when accessed by students, then content viewing information is available for monitoring. | Check content viewing monitoring record for student view status. |
| **AC-011** | `PRD-005` | Given assignment details or attachments, when created/uploaded, then the assignment becomes available. | Verify assignment appears in group/course assessment list. |
| **AC-012** | `PRD-005` | Given exam details or attachments, when created/uploaded, then the exam becomes available. | Verify exam appears in group/course exam list. |
| **AC-013** | `PRD-005` | Given an active assignment or exam, when a student delivers a submission, then the submission is recorded. | Verify submission delivery status in teacher assessment view. |
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
| **AC-025** | `PRD-003` | Given an authenticated teacher managing an active lesson session and a student's unique QR credential, when scanned, then the system validates teacher session authorization, resolves student identity, verifies active group enrollment, and atomically creates attendance as `PRESENT` with recording method `QR_SCAN` in <500ms; if already logged, the existing record remains unmodified and is acknowledged idempotently. | Scan student QR code during session, verify multi-tier validation, and check idempotent attendance recording without modifying existing records. |
| **AC-OL-001**| `PRD-OL-001`| Given an authorized teacher, when creating and publishing an online course with modules and lessons, then the course becomes visible in the catalog with status `PUBLISHED`. | Teacher authors course hierarchy, publishes it, and verifies it in catalog. |
| **AC-OL-002**| `PRD-OL-002`| Given an enrolled student with active `CourseAccess`, when requesting course lessons, then access is granted and lesson assets are returned. | Student opens enrolled course and successfully loads lesson content. |
| **AC-OL-003**| `PRD-OL-002`| Given a student without course enrollment or with expired access, when attempting to access lesson materials, then access is rejected with `403 Forbidden`. | Unenrolled student requests lesson endpoint and receives access denial. |
| **AC-OL-004**| `PRD-OL-003`| Given an enrolled student accessing a video lesson, when played, then the video streams via Bunny Stream signed token and playback position is tracked. | Student streams video, verifies signed token authorization and playback. |
| **AC-OL-005**| `PRD-OL-004`| Given an enrolled student viewing a lesson, when progress reaches completion threshold, then the lesson is marked `is_completed = true` and course progress percentage updates. | View lesson to completion, verify progress record and aggregate course percentage. |
| **AC-OL-006**| `PRD-OL-004`| Given progress events synced with duplicate operation IDs, then the server updates progress idempotently without duplicating events or resetting higher progress. | Post duplicate progress sync payloads and confirm idempotent server response. |
| **AC-OL-007**| `PRD-OL-005`| Given an online course assessment, when a student submits answers, then the submission is recorded and auto-grading scores the exam synchronously. | Student submits online exam, verifies automatic grading calculation. |
| **AC-OL-008**| `PRD-OL-006`| Given a parent linked to a student, when navigating to online learning tab, then the child's enrolled courses, progress bars, and assessment grades are displayed read-only. | Parent views child's online course progress and exam grades. |
| **AC-OL-009**| `PRD-OL-006`| Given a parent attempting to view course progress of an unlinked student, then the request is rejected with `403 Forbidden` (BOLA prevention). | Attempt cross-student parent progress retrieval and verify authorization block. |
| **AC-OL-010**| `PRD-OL-007`| Given an offline student client, when consuming cached lesson metadata and generating progress events, then events are stored in local outbox and synced upon reconnection. | Disconnect network, generate progress, reconnect, and verify outbox flush to server. |
| **AC-OL-011**| `PRD-003`, `PRD-OL-002`| Given an online-only student scanned at physical classroom QR attendance, then the scanner rejects the scan with `NOT_ENROLLED_IN_GROUP` warning and logs zero attendance. | Scan online-only student badge in physical group session and verify rejection. |
| **AC-OL-012**| `PRD-OL-001`| Given a student attempting to create or modify a course, then the action is rejected with `403 Forbidden`. | Attempt course mutation with student role and verify RBAC rejection. |

---

## 13. Dependencies and Constraints

### 13.1 Business Dependencies
- **Role Assignment**: Accurate assignment of user roles (Teacher, Student, Parent, Secretariat) governs feature accessibility.
- **Single Identity**: A student identity is shared across physical enrollments and online course enrollments.

### 13.2 Technical & Architectural Dependencies
- **Media & File Storage**: Upload of documents and summaries depends on Cloudflare R2; video streaming depends on Bunny Stream.
- **Grading Engine**: Automated exam grading executes synchronously via the domain evaluation engine.
- **Offline Storage**: Local device SQLite/IndexedDB manages metadata caching and durable sync queue outbox.

### 13.3 Product Constraints
- **Strict Scope Boundaries**: Commercial payment gateways, live streaming, and social chats are out of scope.
- **Physical Attendance Isolation**: Online course enrollment never satisfies physical attendance eligibility.

---

## 14. Assumptions and TBDs

### 14.1 Confirmed Assumptions
1. **Four Confirmed Roles**: Teacher, Student, Parent, and Secretariat represent the authorized human roles.
2. **Ten Confirmed Modules**: The ten modules represent the complete baseline scope.
3. **Single Identity Principle**: One student identity manages physical and online learning relationships.
4. **Bilingual Requirement**: Arabic (`RTL`) and English (`LTR`) support across all modules.

### 14.2 Items Requiring Product Clarification (TBD)
1. **Commercial Subscription & Pricing**: Course pricing, discount codes, checkout gateways, and recurring billing plans remain `TBD — Requires Product Clarification`.
2. **Secretariat Responsibilities**: Detailed operational boundaries between Teacher and Secretariat tasks remain `TBD`.
3. **Notification Channels & Routing**: Specific delivery transports (SMS, WhatsApp, push, in-app) remain `TBD`.
4. **Student Level Rubric**: Calculation formulas for "Student Level" (`مستوى الطالب`) remain `TBD`.
5. **Submission Parameters**: File format limitations, deadlines, and retry policies remain `TBD`.

---

## 15. Requirement Traceability Summary

```text
Business Requirement (BR-001..010, BR-OL-001..005)
        ↓
Product Requirement (PRD-001..010, PRD-OL-001..007)
        ↓
Functional Requirement (FR-STU-001..SUB-001, FR-OL-001..008)
        ↓
User Story (US-STU-001..SUB-001, US-OL-001..007)
        ↓
Use Case (UC-STU-001..SUB-001, UC-OL-001..006)
        ↓
Acceptance Criteria (AC-001..025, AC-OL-001..012)
        ↓
Test Case (TC-STU-001..SUB-001, TC-OL-001..020)
```

| BR ID | PRD ID | FR ID(s) | US ID(s) | UC ID(s) | AC ID(s) | TC ID(s) |
|---|---|---|---|---|---|---|
| **BR-001** | `PRD-001` | `FR-STU-001..004` | `US-STU-001..003` | `UC-STU-001..003` | `AC-001..003` | `TC-STU-001..003` |
| **BR-002** | `PRD-002` | `FR-GRP-001..003` | `US-GRP-001..002` | `UC-GRP-001..002` | `AC-004..005` | `TC-GRP-001..003` |
| **BR-003** | `PRD-003` | `FR-ATT-001..004` | `US-ATT-001..003` | `UC-ATT-001..003` | `AC-006..007, AC-025, AC-OL-011` | `TC-ATT-001..010, TC-OL-014` |
| **BR-004** | `PRD-004` | `FR-LES-001..003` | `US-LES-001..002` | `UC-LES-001..002` | `AC-008..010` | `TC-LES-001..003` |
| **BR-005** | `PRD-005` | `FR-EXM-003..007` | `US-EXM-001..002` | `UC-EXM-001..002` | `AC-011..013` | `TC-EXM-001..003` |
| **BR-006** | `PRD-006` | `FR-EXM-002` | `US-EXM-003` | `UC-EXM-003` | `AC-014` | `TC-EXM-004` |
| **BR-007** | `PRD-007` | `FR-EXM-001`, `FR-PAR-001..005` | `US-EXM-004`, `US-PAR-001..002` | `UC-EXM-004`, `UC-PAR-001..002` | `AC-015..017` | `TC-EXM-005`, `TC-PAR-001..005` |
| **BR-008** | `PRD-008` | `FR-NOT-001..005` | `US-NOT-001..004` | `UC-NOT-001..004` | `AC-018..022` | `TC-NOT-001..005` |
| **BR-009** | `PRD-009` | `FR-USR-001..004` | `US-USR-001` | `UC-USR-001` | `AC-023` | `TC-USR-001..004` |
| **BR-010** | `PRD-010` | `FR-SUB-001` | `US-SUB-001` | `UC-SUB-001` | `AC-024` | `TC-SUB-001` |
| **BR-OL-001**| `PRD-OL-001`| `FR-OL-001`, `FR-OL-002` | `US-OL-001` | `UC-OL-001` | `AC-OL-001, AC-OL-012` | `TC-OL-001..003` |
| **BR-OL-002**| `PRD-OL-002`| `FR-OL-003` | `US-OL-002` | `UC-OL-002` | `AC-OL-002, AC-OL-003` | `TC-OL-004..006` |
| **BR-OL-003**| `PRD-OL-003`| `FR-OL-004` | `US-OL-003` | `UC-OL-003` | `AC-OL-004` | `TC-OL-007..008` |
| **BR-OL-004**| `PRD-OL-004`| `FR-OL-005`, `FR-OL-008` | `US-OL-004, US-OL-005` | `UC-OL-003, UC-OL-006` | `AC-OL-005, AC-OL-006, AC-OL-010` | `TC-OL-009..011` |
| **BR-OL-005**| `PRD-OL-005`| `FR-OL-006` | `US-OL-006` | `UC-OL-004` | `AC-OL-007` | `TC-OL-012` |
| **BR-OL-006**| `PRD-OL-006`| `FR-OL-007` | `US-OL-007` | `UC-OL-005` | `AC-OL-008, AC-OL-009` | `TC-OL-013` |
| **BR-OL-007**| `PRD-OL-007`| `FR-OL-008` | `US-OL-005` | `UC-OL-006` | `AC-OL-010` | `TC-OL-010, TC-OL-011` |

---

## 16. Open Questions

| Question ID | Question Description | Why It Matters | Related Module / Req | Status |
|---|---|---|---|---|
| **OQ-001** | What are the exact administrative operational boundaries between Teacher and Secretariat? | Determines permissions, action routing, and interface layouts. | `PRD-001`, `PRD-002`, `PRD-009`, `FR-USR-001` | Open |
| **OQ-002** | What are the specific delivery channels (SMS, WhatsApp, in-app, push) and designated recipients for each notification type? | Required to architect notification dispatch and integration adapters. | `PRD-008`, `FR-NOT-001..005`, `UC-NOT-001..004` | Open |
| **OQ-003** | What are the valid lifecycle values and update permissions for student payment status? | Required to structure data validation and administrative editing interfaces. | `PRD-010`, `FR-SUB-001`, `UC-SUB-001` | Open |
| **OQ-004** | How is "Student Level" (`مستوى الطالب`) calculated, formatted, and updated? | Required to build accurate parent reporting views. | `PRD-007`, `FR-PAR-005`, `UC-PAR-001` | Open |
| **OQ-005** | What authentication model, credential distribution, and parent-student account linkage mechanisms will be used? | Required for security architecture and session management. | `PRD-001`, `PRD-007`, `PRD-009`, NFR Security | Open |
| **OQ-006** | What are the file format limits, maximum file sizes, and submission deadline rules for assignments and exams? | Required to configure storage and validation rules. | `PRD-004`, `PRD-005`, `FR-LES-002`, `FR-EXM-003` | Open |
| **OQ-007** | What are the approved commercial subscription tiers, pricing plans, and checkout mechanisms for online courses? | Required to architect commercial billing integration. | `PRD-OL-002`, `BR-OL-002`, `FR-OL-003` | `TBD — Requires Product Clarification` |
