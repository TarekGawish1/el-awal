# Use Cases Specification

## 1. Document Information

- **Document Name**: Use Cases Specification
- **Document Type**: Product Requirements / Use Case Specification
- **Product**: Educational Management System for Teachers and Students
- **Version**: TBD
- **Status**: Draft
- **Source of Truth**: Approved Product Backlog, Business Requirements Document, Functional Requirements Document, Non-Functional Requirements Document, User Personas, User Scenarios, and User Stories

---

## 2. Purpose

The purpose of this document is to specify actor-system interactions for the Educational Management System for Teachers and Students, derived strictly from the approved product backlog and existing product documentation.

This document describes observable interactions between confirmed system actors and the system for each defined product capability, without introducing unconfirmed workflows, UI controls, database operations, internal processing mechanisms, or API definitions.

---

## 3. Actor Overview

The system defines interactions for four confirmed user roles:

| Actor ID | Actor | Confirmed Role | Description / Responsibilities |
|---|---|---|---|
| **ACT-001** | Teacher / المدرس | Confirmed | Instructional user who manages groups, lesson schedules, educational content, assessments, attendance, and student evaluations. |
| **ACT-002** | Student / الطالب | Confirmed | Learner user who accesses educational materials, receives notifications, and submits assignments and exams. |
| **ACT-003** | Parent / ولي الأمر | Confirmed | Guardian user who accesses student results, notes, evaluations, exam grades, assignment statuses, and attendance records. |
| **ACT-004** | Secretariat / السكرتارية | Confirmed | Administrative system role explicitly identified in the product scope. *(Responsibilities: `TBD — Requires Product Clarification`)* |

---

## 4. Use Case ID Convention

Use Cases are identified using the prefix `UC-<DOM>-<NNN>` where `<DOM>` represents the functional module:

- **STU**: Student Management
- **ATT**: Attendance & Absence
- **LES**: Lectures & Lessons
- **EXM**: Exams & Assignments
- **PAR**: Parent Student Status
- **NOT**: Notifications
- **GRP**: Groups Management
- **USR**: Users & Permissions
- **SUB**: Subscriptions / Payment Status

---

## 5. Use Case Specifications

### 5.1 Student Management

#### UC-STU-001 — Student Data and Group/Class Association
- **Goal**: Make student data and associated group and grade/class information available in the system.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. Actor provides student data and group and grade/class association to the system.
  2. System makes the student data and associated group and grade/class information available.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Student data and group/class association are available in the system.
- **Related Requirements**:
  - **Business Requirement**: `BR-001`
  - **Functional Requirements**: `FR-STU-002`, `FR-STU-004`
  - **User Story**: `US-STU-001`
  - **User Scenario**: `SC-STU-001`
- **Status**: Partially Defined

---

#### UC-STU-002 — Parent Data Representation
- **Goal**: Make parent data associated with students available in the system.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. Actor provides parent data to the system.
  2. System makes the parent data available.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Parent data is available in the system.
- **Related Requirements**:
  - **Business Requirement**: `BR-001`
  - **Functional Requirement**: `FR-STU-003`
  - **User Story**: `US-STU-002`
  - **User Scenario**: `SC-STU-002`
- **Status**: Partially Defined

---

#### UC-STU-003 — Student Status Representation
- **Goal**: Make student status information available in the system.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. Actor interacts with the system regarding student status.
  2. System makes the student status available.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Student status is available in the system.
- **Related Requirements**:
  - **Business Requirement**: `BR-001`
  - **Functional Requirement**: `FR-STU-001`
  - **User Story**: `US-STU-003`
  - **User Scenario**: `SC-STU-003`
- **Status**: Partially Defined

---

### 5.2 Attendance & Absence

#### UC-ATT-001 — Record Student Attendance and Absence
- **Goal**: Record student attendance and absence in the system.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. Actor provides student attendance or absence information to the system.
  2. System makes the recorded attendance or absence available.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Student attendance and absence records are available in the system.
- **Related Requirements**:
  - **Business Requirement**: `BR-003`
  - **Functional Requirements**: `FR-ATT-002`, `FR-ATT-003`
  - **User Story**: `US-ATT-001`
  - **User Scenario**: `SC-ATT-001`
- **Status**: Partially Defined

---

#### UC-ATT-002 — View Attendance and Absence Reports
- **Goal**: Provide attendance and absence reports to authorized actors.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. Actor requests attendance and absence reports.
  2. System presents the attendance and absence reports.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Attendance and absence reports are presented to the actor.
- **Related Requirements**:
  - **Business Requirement**: `BR-003`
  - **Functional Requirement**: `FR-ATT-001`
  - **User Story**: `US-ATT-002`
  - **User Scenario**: `SC-ATT-002`
- **Status**: Partially Defined

---

#### UC-ATT-003 — Record Student Attendance via QR Code Scanning
- **Goal**: Rapidly and securely record student session attendance by scanning the student's unique QR identification credential.
- **Primary Actor**: `Teacher / المدرس`
- **Supporting Actors**: `Student / الطالب`
- **Trigger**: Teacher initiates the QR scanner during or for a scheduled lesson session and points the viewfinder at the student's presented QR code.
- **Preconditions**:
  1. Teacher is authenticated with a valid session and authorized to manage the target `AcademicGroup`.
  2. Lesson session exists and is in an active attendance-taking window.
  3. Student exists with an assigned unique, high-entropy `qr_code_token`.
  4. Device camera access is granted to the application.
- **Main Flow**:
  1. Teacher selects the active lesson session and launches the QR camera scanner interface.
  2. Student presents their unique QR code (via mobile digital student card or printed card).
  3. Teacher aligns the QR code within the scanner viewfinder.
  4. Client captures and submits the opaque QR token payload to the backend attendance scanning endpoint.
  5. System validates teacher authorization and session state.
  6. System resolves the QR token to the student, verifies active account status, and confirms active group enrollment in the session's group.
  7. If no attendance record exists, system atomically creates the student's attendance record as `PRESENT` with recording method `QR_SCAN`, recording teacher ID, and server timestamp.
  8. System returns instantaneous positive visual and audio confirmation to the teacher and increments the session attendance count in real time.
- **Alternative Flows**:
  - *Duplicate / Repeated Scan*: If attendance is already logged for this student in this session, the system does not create another record, does not modify the existing record, and returns affirmative duplicate confirmation preserving existing attendance data.
- **Exception Flows**:
  - *Unauthorized Teacher*: If the scanning educator does not own the group session, the system rejects the request with HTTP 403 Forbidden.
  - *Invalid / Unrecognized QR Token*: If the QR token does not resolve to an active student record, the system displays an error banner and logs a security event.
  - *Student Not Enrolled in Group*: If the student is enrolled in a different group, the system presents an informative alert displaying the student's name and actual group without logging attendance in this session.
  - *Inactive / Suspended Student*: If the student's account is deactivated or suspended, the system displays an account status alert.
- **Postconditions**: The student's attendance is persisted as `PRESENT` for the lesson session with audit metadata (`recorded_by_id`, `recorded_at`, `recording_method = 'QR_SCAN'`).
- **Related Requirements**:
  - **Business Requirement**: `BR-003`
  - **Functional Requirement**: `FR-ATT-004`
  - **User Story**: `US-ATT-003`
  - **User Scenario**: `SC-ATT-003`
- **Status**: Defined

---

### 5.3 Lectures & Lessons

#### UC-LES-001 — Upload Educational Materials and Lecture Recordings
- **Goal**: Upload educational files, references, summaries, and lecture recordings into the system.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. Actor uploads educational files, references, summaries, or lecture recordings.
  2. System makes the uploaded materials and lecture recordings available.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Educational files, references, summaries, and lecture recordings are available in the system.
- **Related Requirements**:
  - **Business Requirement**: `BR-004`
  - **Functional Requirements**: `FR-LES-002`, `FR-LES-003`
  - **User Story**: `US-LES-001`
  - **User Scenario**: `SC-LES-001`
- **Status**: Partially Defined

---

#### UC-LES-002 — Monitor Content Viewing
- **Goal**: Provide content viewing information for monitoring.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: Educational content is available in the system.
- **Main Flow**:
  1. Actor accesses content viewing information.
  2. System presents content viewing information for monitoring.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Content viewing information is available for monitoring.
- **Related Requirements**:
  - **Business Requirement**: `BR-004`
  - **Functional Requirement**: `FR-LES-001`
  - **User Story**: `US-LES-002`
  - **User Scenario**: `SC-LES-002`
- **Status**: Partially Defined

---

### 5.4 Exams & Assignments

#### UC-EXM-001 — Create and Upload Assignments and Exams
- **Goal**: Create and upload assignments and examinations into the system.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. Actor creates or uploads an assignment or exam.
  2. System makes the created or uploaded assignment or exam available.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Assignments and exams are available in the system.
- **Related Requirements**:
  - **Business Requirement**: `BR-005`
  - **Functional Requirements**: `FR-EXM-004`, `FR-EXM-005`, `FR-EXM-006`, `FR-EXM-007`
  - **User Story**: `US-EXM-001`
  - **User Scenario**: `SC-EXM-001`
- **Status**: Partially Defined

---

#### UC-EXM-002 — Submit Assignments and Exams
- **Goal**: Submit completed assignments and exams.
- **Primary Actor**: `Student / الطالب` (`ACT-002`)
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: An assignment or exam is available for submission.
- **Main Flow**:
  1. Student submits the assignment or exam.
  2. System accepts the submission.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: The assignment or exam submission is delivered in the system.
- **Related Requirements**:
  - **Business Requirement**: `BR-005`
  - **Functional Requirement**: `FR-EXM-003`
  - **User Story**: `US-EXM-002`
  - **User Scenario**: `SC-EXM-002`
- **Status**: Defined

---

#### UC-EXM-003 — Automatically Grade Exam
- **Goal**: Automatically grade submitted examinations.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: An exam submission is received.
- **Preconditions**: An exam has been submitted.
- **Main Flow**:
  1. Automatic grading is performed for the submitted exam.
  2. System makes the resulting exam grade available.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: The exam is automatically graded in the system.
- **Related Requirements**:
  - **Business Requirement**: `BR-006`
  - **Functional Requirement**: `FR-EXM-002`
  - **User Story**: `US-EXM-003`
  - **User Scenario**: `SC-EXM-003`
- **Status**: Partially Defined

---

#### UC-EXM-004 — Display Results to Parent
- **Goal**: Display student results to the parent.
- **Primary Actor**: `Parent / ولي الأمر` (`ACT-003`)
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. Parent accesses student results.
  2. System presents the student results to the parent.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Student results are displayed to the parent.
- **Related Requirements**:
  - **Business Requirement**: `BR-007`
  - **Functional Requirement**: `FR-EXM-001`
  - **User Story**: `US-EXM-004`
  - **User Scenario**: `SC-EXM-004`
- **Status**: Defined

---

### 5.5 Parent Student Status

#### UC-PAR-001 — View Evaluations, Notes, Exam Grades, and Student Level
- **Goal**: Display teacher evaluations, notes, exam grades, and student level to the parent.
- **Primary Actor**: `Parent / ولي الأمر` (`ACT-003`)
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. Parent accesses student evaluation and academic status information.
  2. System presents teacher evaluations, notes, exam grades, and student level to the parent.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Teacher evaluations, notes, exam grades, and student level are displayed to the parent.
- **Related Requirements**:
  - **Business Requirement**: `BR-007`
  - **Functional Requirements**: `FR-PAR-001`, `FR-PAR-003`, `FR-PAR-005`
  - **User Story**: `US-PAR-001`
  - **User Scenario**: `SC-PAR-001`
- **Status**: Partially Defined

---

#### UC-PAR-002 — View Assignment Status and Attendance Records
- **Goal**: Display assignment status and attendance and absence records to the parent.
- **Primary Actor**: `Parent / ولي الأمر` (`ACT-003`)
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. Parent accesses assignment status and attendance information.
  2. System presents assignment status and attendance and absence records to the parent.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Assignment status and attendance and absence records are displayed to the parent.
- **Related Requirements**:
  - **Business Requirement**: `BR-007`
  - **Functional Requirements**: `FR-PAR-002`, `FR-PAR-004`
  - **User Story**: `US-PAR-002`
  - **User Scenario**: `SC-PAR-002`
- **Status**: Defined

---

### 5.6 Notifications

#### UC-NOT-001 — Notification One Hour Before Lesson
- **Goal**: Provide a notification one hour before a lesson.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: One hour before a scheduled lesson.
- **Preconditions**: A lesson is scheduled in the system.
- **Main Flow**:
  1. The one-hour pre-lesson timing condition is reached.
  2. System sends the notification one hour before the lesson.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Notification is sent one hour before the lesson.
- **Related Requirements**:
  - **Business Requirement**: `BR-008`
  - **Functional Requirement**: `FR-NOT-001`
  - **User Story**: `US-NOT-001`
  - **User Scenario**: `SC-NOT-001`
- **Status**: Partially Defined

---

#### UC-NOT-002 — Notification for Unsolved Assignment
- **Goal**: Provide a notification when an assignment is not solved.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: An assignment is not solved.
- **Preconditions**: An assignment is available in the system.
- **Main Flow**:
  1. An unsolved assignment condition is present.
  2. System sends the notification for the unsolved assignment.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Notification for unsolved assignment is sent.
- **Related Requirements**:
  - **Business Requirement**: `BR-008`
  - **Functional Requirement**: `FR-NOT-002`
  - **User Story**: `US-NOT-002`
  - **User Scenario**: `SC-NOT-002`
- **Status**: Partially Defined

---

#### UC-NOT-003 — Exam Notifications
- **Goal**: Provide notifications for a new exam and for a student exam grade.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: A new exam is available or a student exam grade is present.
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. A new exam or student exam grade is present.
  2. System sends the notification for the new exam or student exam grade.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Notification for a new exam or student exam grade is sent.
- **Related Requirements**:
  - **Business Requirement**: `BR-008`
  - **Functional Requirements**: `FR-NOT-003`, `FR-NOT-004`
  - **User Story**: `US-NOT-003`
  - **User Scenario**: `SC-NOT-003`
- **Status**: Partially Defined

---

#### UC-NOT-004 — Student Absence Notifications
- **Goal**: Provide notifications in case of student absence.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: A student absence occurs.
- **Preconditions**: Student absence is recorded in the system.
- **Main Flow**:
  1. A student absence condition is present.
  2. System sends the student absence notification.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Notification for student absence is sent.
- **Related Requirements**:
  - **Business Requirement**: `BR-008`
  - **Functional Requirement**: `FR-NOT-005`
  - **User Story**: `US-NOT-004`
  - **User Scenario**: `SC-NOT-004`
- **Status**: Partially Defined

---

### 5.7 Groups Management

#### UC-GRP-001 — Create Group and Schedule Lesson Times
- **Goal**: Create a group and schedule lesson times in the system.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. Actor creates a group and specifies lesson times.
  2. System makes the group and scheduled lesson times available.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Group and scheduled lesson times are available in the system.
- **Related Requirements**:
  - **Business Requirement**: `BR-002`
  - **Functional Requirements**: `FR-GRP-001`, `FR-GRP-003`
  - **User Story**: `US-GRP-001`
  - **User Scenario**: `SC-GRP-001`
- **Status**: Partially Defined

---

#### UC-GRP-002 — Add Students to Group
- **Goal**: Add students to an existing group.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: A group exists in the system.
- **Main Flow**:
  1. Actor adds students to a group.
  2. System makes the addition of students to the group effective.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Addition of students to the group is recorded in the system.
- **Related Requirements**:
  - **Business Requirement**: `BR-002`
  - **Functional Requirement**: `FR-GRP-002`
  - **User Story**: `US-GRP-002`
  - **User Scenario**: `SC-GRP-002`
- **Status**: Partially Defined

---

### 5.8 Users & Permissions

#### UC-USR-001 — User Roles and Permissions Representation
- **Goal**: Support the representation of confirmed user roles (Teacher, Student, Parent, Secretariat) in the system.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  > *Note*: User role and permission behavior is partially defined in the backlog. Discrete actor-system interaction steps are not defined in the source requirements.
  1. Users interact with the system.
  2. System reflects the confirmed user roles (Teacher, Student, Parent, Secretariat).
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Confirmed roles are represented in the system.
- **Related Requirements**:
  - **Business Requirement**: `BR-009`
  - **Functional Requirements**: `FR-USR-001`, `FR-USR-002`, `FR-USR-003`, `FR-USR-004`
  - **User Story**: `US-USR-001`
  - **User Scenario**: `SC-USR-001`
- **Status**: Blocked — Requires Product Clarification

---

### 5.9 Subscriptions / Payment Status

#### UC-SUB-001 — Student Payment Status
- **Goal**: Make the payment status for each student available in the system.
- **Primary Actor**: `TBD — Requires Product Clarification`
- **Supporting Actors**: `N/A — No Supporting Actor Defined`
- **Trigger**: `TBD — Requires Product Clarification`
- **Preconditions**: `TBD — Requires Product Clarification`
- **Main Flow**:
  1. Actor interacts with the system regarding student payment status.
  2. System makes the payment status for each student available.
- **Alternative Flows**: `N/A — No Alternative Flow Defined`
- **Exception Flows**: `N/A — No Exception Flow Defined`
- **Postconditions**: Payment status for each student is available in the system.
- **Related Requirements**:
  - **Business Requirement**: `BR-010`
  - **Functional Requirement**: `FR-SUB-001`
  - **User Story**: `US-SUB-001`
  - **User Scenario**: `SC-SUB-001`
- **Status**: Partially Defined

---

## 6. Use Case Traceability Matrix

| Use Case ID | Use Case Name | Actor | BR ID | FR ID | User Story ID | User Scenario ID | Status |
|---|---|---|---|---|---|---|---|
| **UC-STU-001** | Student Data and Group/Class Association | `TBD — Clarification` | `BR-001` | `FR-STU-002`, `FR-STU-004` | `US-STU-001` | `SC-STU-001` | Partially Defined |
| **UC-STU-002** | Parent Data Representation | `TBD — Clarification` | `BR-001` | `FR-STU-003` | `US-STU-002` | `SC-STU-002` | Partially Defined |
| **UC-STU-003** | Student Status Representation | `TBD — Clarification` | `BR-001` | `FR-STU-001` | `US-STU-003` | `SC-STU-003` | Partially Defined |
| **UC-ATT-001** | Record Student Attendance and Absence | `TBD — Clarification` | `BR-003` | `FR-ATT-002`, `FR-ATT-003` | `US-ATT-001` | `SC-ATT-001` | Partially Defined |
| **UC-ATT-002** | View Attendance and Absence Reports | `TBD — Clarification` | `BR-003` | `FR-ATT-001` | `US-ATT-002` | `SC-ATT-002` | Partially Defined |
| **UC-ATT-003** | Record Student Attendance via QR Code Scanning | `Teacher / المدرس` | `BR-003` | `FR-ATT-004` | `US-ATT-003` | `SC-ATT-003` | Defined |
| **UC-LES-001** | Upload Educational Materials and Lecture Recordings | `TBD — Clarification` | `BR-004` | `FR-LES-002`, `FR-LES-003` | `US-LES-001` | `SC-LES-001` | Partially Defined |
| **UC-LES-002** | Monitor Content Viewing | `TBD — Clarification` | `BR-004` | `FR-LES-001` | `US-LES-002` | `SC-LES-002` | Partially Defined |
| **UC-EXM-001** | Create and Upload Assignments and Exams | `TBD — Clarification` | `BR-005` | `FR-EXM-004`, `FR-EXM-005`, `FR-EXM-006`, `FR-EXM-007` | `US-EXM-001` | `SC-EXM-001` | Partially Defined |
| **UC-EXM-002** | Submit Assignments and Exams | `Student / الطالب` | `BR-005` | `FR-EXM-003` | `US-EXM-002` | `SC-EXM-002` | Defined |
| **UC-EXM-003** | Automatically Grade Exam | `TBD — Clarification` | `BR-006` | `FR-EXM-002` | `US-EXM-003` | `SC-EXM-003` | Partially Defined |
| **UC-EXM-004** | Display Results to Parent | `Parent / ولي الأمر` | `BR-007` | `FR-EXM-001` | `US-EXM-004` | `SC-EXM-004` | Defined |
| **UC-PAR-001** | View Evaluations, Notes, Exam Grades, and Student Level | `Parent / ولي الأمر` | `BR-007` | `FR-PAR-001`, `FR-PAR-003`, `FR-PAR-005` | `US-PAR-001` | `SC-PAR-001` | Partially Defined |
| **UC-PAR-002** | View Assignment Status and Attendance Records | `Parent / ولي الأمر` | `BR-007` | `FR-PAR-002`, `FR-PAR-004` | `US-PAR-002` | `SC-PAR-002` | Defined |
| **UC-NOT-001** | Notification One Hour Before Lesson | `TBD — Clarification` | `BR-008` | `FR-NOT-001` | `US-NOT-001` | `SC-NOT-001` | Partially Defined |
| **UC-NOT-002** | Notification for Unsolved Assignment | `TBD — Clarification` | `BR-008` | `FR-NOT-002` | `US-NOT-002` | `SC-NOT-002` | Partially Defined |
| **UC-NOT-003** | Exam Notifications | `TBD — Clarification` | `BR-008` | `FR-NOT-003`, `FR-NOT-004` | `US-NOT-003` | `SC-NOT-003` | Partially Defined |
| **UC-NOT-004** | Student Absence Notifications | `TBD — Clarification` | `BR-008` | `FR-NOT-005` | `US-NOT-004` | `SC-NOT-004` | Partially Defined |
| **UC-GRP-001** | Create Group and Schedule Lesson Times | `TBD — Clarification` | `BR-002` | `FR-GRP-001`, `FR-GRP-003` | `US-GRP-001` | `SC-GRP-001` | Partially Defined |
| **UC-GRP-002** | Add Students to Group | `TBD — Clarification` | `BR-002` | `FR-GRP-002` | `US-GRP-002` | `SC-GRP-002` | Partially Defined |
| **UC-USR-001** | User Roles and Permissions Representation | `TBD — Clarification` | `BR-009` | `FR-USR-001`, `FR-USR-002`, `FR-USR-003`, `FR-USR-004` | `US-USR-001` | `SC-USR-001` | Blocked — Clarification |
| **UC-SUB-001** | Student Payment Status | `TBD — Clarification` | `BR-010` | `FR-SUB-001` | `US-SUB-001` | `SC-SUB-001` | Partially Defined |

---

## 7. Open Product Clarifications for Use Cases

1. **Actor Ownership for Management Functions**: Which specific role (Teacher, Secretariat, or both) acts as the primary actor for student data, parent data, student status, group creation, and scheduling?
2. **Attendance Logging Authority**: Who logs attendance and absence records, and which roles have authorization to view attendance reports?
3. **Assessment Authoring & Content Uploads**: Are educational content and assessment uploads performed by Teachers, Secretariat, or both?
4. **Notification Recipients and Channels**: Who are the designated recipients for each notification type, and through what delivery channels are they sent?
5. **Student Level Definition**: How is student level (`مستوى الطالب`) defined, calculated, and represented in the system?
6. **Payment Status Operational Flow**: What role updates student payment status, and what are the allowable payment status values?
