# Test Cases

## 1. Document Information

- **Document Name**: Test Cases
- **Document Type**: Quality Assurance / Test Cases
- **Product**: Educational Management System for Teachers and Students
- **Version**: TBD
- **Status**: Draft
- **Source of Truth**: Approved Backlog, Functional Requirements Document, Non-Functional Requirements Document, User Personas, User Scenarios, User Stories, Presentation Layer Architecture, Business Logic Architecture, Data Layer Architecture, and Test Plan

---

## 2. Purpose

This document defines the formal test cases for verifying the functional capabilities, business logic concepts, user stories, and scenarios of the Educational Management System for Teachers and Students. Each test case is derived directly from approved project requirements without introducing unconfirmed product behavior or technical assumptions.

---

## 3. Test Case Conventions & Statuses

- **ID Convention**: `TC-[MODULE]-[INDEX]` (e.g., `TC-STU-001`, `TC-ATT-001`, `TC-EXM-001`).
- **Priority**: Proposed QA classifications (`P0`, `P1`, `P2`, `P3`).
- **Statuses**:
  - `Ready`: Requirement has sufficient detail for deterministic execution.
  - `Draft`: Test case defined at capability level.
  - `Blocked — Requires Product Clarification`: Detailed test steps or expected outcomes depend on unresolved product clarifications.
  - `Blocked — Requires Architecture Decision`: Test execution depends on uncommitted technical architecture choices.

---

## 4. Test Cases by Module

### 4.1 Student Management

#### Test Case ID: TC-STU-001
- **Test Case Title**: Verify Student Data and Group/Class Representation
- **Requirement ID**: `FR-STU-004`, `FR-STU-002`
- **Backlog Item**: `بيانات الطالب`, `المجموعة و الصف`
- **User Story**: `US-STU-001`
- **User Scenario**: `SC-STU-001`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - System is operational and accessible.
  - Student data and group/class information are available for entry.
- **Test Data**: Conceptual student data and group/class assignment.
- **Test Steps**:
  1. Access the system interface for student management.
  2. Input the student data and associated group/class information.
  3. Confirm the action in the system.
  4. View the student record in the system.
- **Expected Result**: The student data and associated group/class information are represented and accessible in the system.
- **Status**: Ready

---

#### Test Case ID: TC-STU-002
- **Test Case Title**: Verify Parent Data Representation
- **Requirement ID**: `FR-STU-003`
- **Backlog Item**: `بيانات ولي الامر`
- **User Story**: `US-STU-002`
- **User Scenario**: `SC-STU-002`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - System is operational.
  - Parent data is available for entry.
- **Test Data**: Conceptual parent data associated with a student.
- **Test Steps**:
  1. Access the parent data handling interface in the system.
  2. Input the parent data for the designated student.
  3. Submit/confirm the data in the system.
  4. View the parent data record.
- **Expected Result**: The parent data is represented and accessible in the system.
- **Status**: Ready

---

#### Test Case ID: TC-STU-003
- **Test Case Title**: Verify Student Status Representation
- **Requirement ID**: `FR-STU-001`
- **Backlog Item**: `حالة الطلاب`
- **User Story**: `US-STU-003`
- **User Scenario**: `SC-STU-003`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - System is operational with existing student records.
- **Test Data**: Conceptual student status value.
- **Test Steps**:
  1. Access the student status interface in the system.
  2. View or update the status for a designated student.
  3. Confirm the status representation.
- **Expected Result**: The student status is accurately represented in the system.
- **Status**: Blocked — Requires Product Clarification (Specific permitted student status values remain undefined).

---

### 4.2 Attendance & Absence

#### Test Case ID: TC-ATT-001
- **Test Case Title**: Verify Recording Student Attendance
- **Requirement ID**: `FR-ATT-003`
- **Backlog Item**: `تسجيل حضور الطلاب`
- **User Story**: `US-ATT-001`
- **User Scenario**: `SC-ATT-001`
- **Test Type**: Functional / System
- **Priority**: P0
- **Preconditions**:
  - System is operational.
  - Student entity exists in the system.
- **Test Data**: Conceptual student attendance entry.
- **Test Steps**:
  1. Access the attendance recording interface.
  2. Record attendance for the designated student.
  3. Submit/confirm the attendance entry.
  4. Check the recorded attendance log.
- **Expected Result**: The student attendance entry is recorded in the system.
- **Status**: Ready

---

#### Test Case ID: TC-ATT-002
- **Test Case Title**: Verify Recording Student Absence
- **Requirement ID**: `FR-ATT-002`
- **Backlog Item**: `تسجيل الغياب`
- **User Story**: `US-ATT-001`
- **User Scenario**: `SC-ATT-001`
- **Test Type**: Functional / System
- **Priority**: P0
- **Preconditions**:
  - System is operational.
  - Student entity exists in the system.
- **Test Data**: Conceptual student absence entry.
- **Test Steps**:
  1. Access the absence recording interface.
  2. Record an absence entry for the designated student.
  3. Submit/confirm the absence entry.
  4. Check the recorded absence log.
- **Expected Result**: The student absence entry is recorded in the system.
- **Status**: Ready

---

#### Test Case ID: TC-ATT-003
- **Test Case Title**: Verify Attendance and Absence Reports Display
- **Requirement ID**: `FR-ATT-001`
- **Backlog Item**: `تقارير الحضور و الغياب`
- **User Story**: `US-ATT-002`
- **User Scenario**: `SC-ATT-002`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - System is operational.
  - Attendance and absence records exist in the system.
- **Test Data**: Conceptual request for attendance and absence reporting.
- **Test Steps**:
  1. Access the attendance and absence reporting interface.
  2. Request/view the attendance and absence reports.
- **Expected Result**: Attendance and absence reports are presented in the system.
- **Status**: Ready

---

#### Test Case ID: TC-ATT-004
- **Test Case Title**: Verify Unique Student QR Code Provisioning on Enrollment
- **Requirement ID**: `FR-ATT-004`
- **Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **User Story**: `US-ATT-003`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Functional / Integration
- **Priority**: P0
- **Preconditions**:
  - System is operational.
- **Test Data**: Valid student enrollment payload.
- **Test Steps**:
  1. Enroll a new student into the system.
  2. Query the created student profile record and digital student card.
  3. Verify the presence and uniqueness of `qr_code_token`.
- **Expected Result**: A unique, non-null QR code token is generated and rendered as a scannable QR code in the student dashboard.
- **Status**: Ready

---

#### Test Case ID: TC-ATT-005
- **Test Case Title**: Verify Recording Session Attendance via Teacher QR Code Scanning
- **Requirement ID**: `FR-ATT-004`
- **Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **User Story**: `US-ATT-003`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Functional / End-to-End / Performance
- **Priority**: P0
- **Preconditions**:
  - Student is actively enrolled in Group A.
  - Active/scheduled lesson session exists for Group A.
  - Teacher is authenticated and has opened the session QR scanner viewfinder.
- **Test Data**: Enrolled student's unique QR code.
- **Test Steps**:
  1. Student presents QR code on mobile screen or printed student card.
  2. Teacher scans the QR code using the device camera.
  3. System resolves QR token, verifies enrollment in Group A, and records attendance.
- **Expected Result**: Student attendance is persisted as `PRESENT` with recording method `QR_SCAN` in <500ms; teacher UI displays instantaneous positive confirmation and updates the session attendance roster.
- **Status**: Ready

---

#### Test Case ID: TC-ATT-006
- **Test Case Title**: Verify Duplicate QR Code Scan Idempotency
- **Requirement ID**: `FR-ATT-004`
- **Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **User Story**: `US-ATT-003`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Functional / Integration
- **Priority**: P1
- **Preconditions**:
  - Student attendance is already recorded as `PRESENT` for the active lesson session.
- **Test Data**: Previously scanned student QR code.
- **Test Steps**:
  1. Teacher scans the same student's QR code a second time within the same lesson session.
  2. System evaluates the scan request against existing attendance records.
- **Expected Result**: System returns a deterministic confirmation indicating attendance is already recorded; does not insert a duplicate record, does not modify the existing record (preserving original `recorded_at` timestamp), and raises no application errors.
- **Status**: Ready

---

#### Test Case ID: TC-ATT-007
- **Test Case Title**: Verify Scanning QR Code of Student Not Enrolled in Group Session
- **Requirement ID**: `FR-ATT-004`
- **Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **User Story**: `US-ATT-003`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Functional / Exception Flow
- **Priority**: P1
- **Preconditions**:
  - Student is enrolled in Group B (not Group A).
  - Teacher has opened the QR scanner for a Group A lesson session.
- **Test Data**: Group B student QR code.
- **Test Steps**:
  1. Teacher scans the Group B student's QR code during the Group A session.
  2. System resolves student identity and checks group enrollment for Group A.
- **Expected Result**: System displays an informative warning alert stating the student is not enrolled in Group A (displaying student name and actual group), and does not record attendance for Group A.
- **Status**: Ready

---

#### Test Case ID: TC-ATT-008
- **Test Case Title**: Verify Teacher Authorization & Session Ownership Guard on QR Scan
- **Requirement ID**: `FR-ATT-004`, `FR-USR-004`
- **Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **User Story**: `US-ATT-003`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Security / Access Control
- **Priority**: P0
- **Preconditions**:
  - Teacher 1 manages Group A; Teacher 2 manages Group B.
  - Active lesson session belongs to Group A.
- **Test Data**: Valid student QR code in Group A, authenticated session for Teacher 2.
- **Test Steps**:
  1. Teacher 2 submits a QR scan request for Teacher 1's Group A lesson session.
  2. System evaluates `ResourceOwnershipGuard` on target session.
- **Expected Result**: System rejects the request with HTTP 403 Forbidden, preventing unauthorized teachers from modifying attendance for other teachers' cohorts.
- **Status**: Ready

---

#### Test Case ID: TC-ATT-009
- **Test Case Title**: Verify Invalid or Tampered QR Token Rejection
- **Requirement ID**: `FR-ATT-004`
- **Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **User Story**: `US-ATT-003`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Security / Negative Testing
- **Priority**: P0
- **Preconditions**:
  - Valid lesson session exists.
  - Teacher is authenticated and authorized.
- **Test Data**: Forged, malformed, or non-existent QR token string.
- **Test Steps**:
  1. Submit forged QR token to `POST /api/v1/attendance/sessions/:sessionId/scan-qr`.
  2. Evaluate API response and audit logs.
- **Expected Result**: System rejects the request with HTTP 404 Not Found / 400 Bad Request, logs a security warning event, and leaves session attendance unmodified.
- **Status**: Ready

---

#### Test Case ID: TC-ATT-010
- **Test Case Title**: Verify Student QR Token Regeneration & Old Token Invalidation
- **Requirement ID**: `FR-ATT-004`
- **Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **User Story**: `US-ATT-003`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Functional / Security / Lifecycle
- **Priority**: P1
- **Preconditions**:
  - Student exists with original `qr_code_token_v1`.
  - Authorized teacher/staff executes token regeneration.
- **Test Data**: `POST /api/v1/students/:studentId/regenerate-qr-token`.
- **Test Steps**:
  1. Request QR token regeneration for student.
  2. Verify new `qr_code_token_v2` is generated and saved.
  3. Attempt scanning original `qr_code_token_v1` in active session.
  4. Attempt scanning new `qr_code_token_v2` in active session.
- **Expected Result**: `qr_code_token_v1` is rejected as invalid/revoked; `qr_code_token_v2` is accepted and successfully records attendance.
- **Status**: Ready

---

### 4.3 Lectures & Lessons

#### Test Case ID: TC-LES-001
- **Test Case Title**: Verify Uploading Educational Files, References, and Summaries
- **Requirement ID**: `FR-LES-002`
- **Backlog Item**: `رفع الملفات و المراجع و الملخصات`
- **User Story**: `US-LES-001`
- **User Scenario**: `SC-LES-001`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - System is operational.
  - Educational file/reference/summary document is available for upload.
- **Test Data**: Conceptual educational material file.
- **Test Steps**:
  1. Access the material upload interface.
  2. Select and upload the educational file, reference, or summary.
  3. Confirm the upload action.
  4. View available materials in the system.
- **Expected Result**: The uploaded files, references, and summaries become available in the system.
- **Status**: Ready

---

#### Test Case ID: TC-LES-002
- **Test Case Title**: Verify Uploading Lecture Recordings
- **Requirement ID**: `FR-LES-003`
- **Backlog Item**: `رفع تسجيلات المحاضرات`
- **User Story**: `US-LES-001`
- **User Scenario**: `SC-LES-001`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - System is operational.
  - Lecture recording file is available for upload.
- **Test Data**: Conceptual lecture recording file.
- **Test Steps**:
  1. Access the lecture recording upload interface.
  2. Select and upload the lecture recording.
  3. Confirm the upload action.
  4. View available lecture recordings in the system.
- **Expected Result**: The uploaded lecture recording becomes available in the system.
- **Status**: Ready

---

#### Test Case ID: TC-LES-003
- **Test Case Title**: Verify Monitoring Content Viewing
- **Requirement ID**: `FR-LES-001`
- **Backlog Item**: `متابعة مشاهدة المحتوى`
- **User Story**: `US-LES-002`
- **User Scenario**: `SC-LES-002`
- **Test Type**: Functional / System
- **Priority**: P2
- **Preconditions**:
  - Educational materials or lecture recordings are available in the system.
  - Viewing activity has occurred or is initiated.
- **Test Data**: Conceptual viewing activity record.
- **Test Steps**:
  1. Access the content viewing monitoring interface.
  2. View the tracking information for the specified content.
- **Expected Result**: Content viewing tracking information is displayed in the system.
- **Status**: Blocked — Requires Product Clarification (Specific tracking metrics and thresholds remain undefined).

---

### 4.4 Exams & Assignments

#### Test Case ID: TC-EXM-001
- **Test Case Title**: Verify Creating and Uploading Homework Assignments
- **Requirement ID**: `FR-EXM-004`, `FR-EXM-005`
- **Backlog Item**: `انشاء الواجبات`, `رفع الواجبات`
- **User Story**: `US-EXM-001`
- **User Scenario**: `SC-EXM-001`
- **Test Type**: Functional / System
- **Priority**: P0
- **Preconditions**:
  - System is operational.
  - Assignment details/files are prepared.
- **Test Data**: Conceptual assignment details.
- **Test Steps**:
  1. Access the assignment creation/upload interface.
  2. Create or upload the homework assignment.
  3. Confirm the action in the system.
  4. Verify assignment availability in the system.
- **Expected Result**: The assignment is created, uploaded, and becomes available in the system.
- **Status**: Ready

---

#### Test Case ID: TC-EXM-002
- **Test Case Title**: Verify Creating and Uploading Exams
- **Requirement ID**: `FR-EXM-006`, `FR-EXM-007`
- **Backlog Item**: `انشاء الامتحانات`, `رفع الامتحانات`
- **User Story**: `US-EXM-001`
- **User Scenario**: `SC-EXM-001`
- **Test Type**: Functional / System
- **Priority**: P0
- **Preconditions**:
  - System is operational.
  - Exam details/files are prepared.
- **Test Data**: Conceptual exam details.
- **Test Steps**:
  1. Access the exam creation/upload interface.
  2. Create or upload the exam.
  3. Confirm the action in the system.
  4. Verify exam availability in the system.
- **Expected Result**: The exam is created, uploaded, and becomes available in the system.
- **Status**: Ready

---

#### Test Case ID: TC-EXM-003
- **Test Case Title**: Verify Student Assignment Submission
- **Requirement ID**: `FR-EXM-003`
- **Backlog Item**: `تسليم الواجبات و الامتحانات`
- **User Story**: `US-EXM-002`
- **User Scenario**: `SC-EXM-002`
- **Test Type**: Functional / End-to-End
- **Priority**: P0
- **Preconditions**:
  - An active assignment exists in the system.
  - Actor is authenticated/acting as Student (`الطالب`).
- **Test Data**: Conceptual assignment submission.
- **Test Steps**:
  1. Access the designated assignment as a Student.
  2. Submit the completed assignment.
  3. Confirm submission in the system.
- **Expected Result**: The assignment submission is recorded in the system.
- **Status**: Ready

---

#### Test Case ID: TC-EXM-004
- **Test Case Title**: Verify Student Exam Submission and Automatic Grading
- **Requirement ID**: `FR-EXM-002`, `FR-EXM-003`
- **Backlog Item**: `تسليم الواجبات و الامتحانات`, `تصحيح الدرجات تلقائي`
- **User Story**: `US-EXM-002`, `US-EXM-003`
- **User Scenario**: `SC-EXM-002`, `SC-EXM-003`
- **Test Type**: Functional / Integration / End-to-End
- **Priority**: P0
- **Preconditions**:
  - An active exam supporting automatic grading exists in the system.
  - Actor is authenticated/acting as Student (`الطالب`).
- **Test Data**: Conceptual exam submission.
- **Test Steps**:
  1. Access the designated exam as a Student.
  2. Submit the exam.
  3. Allow system automatic grading to execute.
  4. Verify the graded exam result in the system.
- **Expected Result**: The exam submission is recorded and automatically graded by the system.
- **Status**: Ready

---

#### Test Case ID: TC-EXM-005
- **Test Case Title**: Verify Displaying Student Results to Parent
- **Requirement ID**: `FR-EXM-001`
- **Backlog Item**: `عرض النتائج لي ولي الامر`
- **User Story**: `US-EXM-004`
- **User Scenario**: `SC-EXM-004`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - Graded student results exist in the system.
  - Actor is authenticated/acting as Parent (`ولي الأمر`).
- **Test Data**: Conceptual parent inquiry for student results.
- **Test Steps**:
  1. Access the parent results viewing interface.
  2. Select the student record.
  3. View the student academic results.
- **Expected Result**: The student results are displayed to the parent.
- **Status**: Ready

---

### 4.5 Parent Student Status

#### Test Case ID: TC-PAR-001
- **Test Case Title**: Verify Parent Viewing Teacher Evaluations and Notes
- **Requirement ID**: `FR-PAR-001`
- **Backlog Item**: `تقييمات + ملاحظات المدرس`
- **User Story**: `US-PAR-001`
- **User Scenario**: `SC-PAR-001`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - Teacher evaluations and notes exist for a student.
  - Actor is authenticated/acting as Parent (`ولي الأمر`).
- **Test Data**: Conceptual evaluation and note records.
- **Test Steps**:
  1. Access the parent interface for student evaluations.
  2. View the teacher evaluations and notes for the student.
- **Expected Result**: Teacher evaluations and notes are displayed to the parent.
- **Status**: Ready

---

#### Test Case ID: TC-PAR-002
- **Test Case Title**: Verify Parent Viewing Exam Grades
- **Requirement ID**: `FR-PAR-003`
- **Backlog Item**: `درجات الامتحانات`
- **User Story**: `US-PAR-001`
- **User Scenario**: `SC-PAR-001`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - Exam grades are recorded for a student.
  - Actor is authenticated/acting as Parent (`ولي الأمر`).
- **Test Data**: Conceptual student exam grade.
- **Test Steps**:
  1. Access the parent interface for exam grades.
  2. View the recorded exam grades for the student.
- **Expected Result**: Exam grades are displayed to the parent.
- **Status**: Ready

---

#### Test Case ID: TC-PAR-003
- **Test Case Title**: Verify Parent Viewing Student Level
- **Requirement ID**: `FR-PAR-005`
- **Backlog Item**: `مستوى الطالب`
- **User Story**: `US-PAR-001`
- **User Scenario**: `SC-PAR-001`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - Student level information is maintained in the system.
  - Actor is authenticated/acting as Parent (`ولي الأمر`).
- **Test Data**: Conceptual student level record.
- **Test Steps**:
  1. Access the parent interface for student level.
  2. View the student level indicator.
- **Expected Result**: Student level information is displayed to the parent.
- **Status**: Blocked — Requires Product Clarification (Calculation criteria and student level definitions remain undefined).

---

#### Test Case ID: TC-PAR-004
- **Test Case Title**: Verify Parent Viewing Assignment Status
- **Requirement ID**: `FR-PAR-002`
- **Backlog Item**: `حالة الواجبات`
- **User Story**: `US-PAR-002`
- **User Scenario**: `SC-PAR-002`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - Assignment statuses exist for a student.
  - Actor is authenticated/acting as Parent (`ولي الأمر`).
- **Test Data**: Conceptual assignment status record.
- **Test Steps**:
  1. Access the parent interface for assignment status.
  2. View the assignment completion status for the student.
- **Expected Result**: Assignment statuses are displayed to the parent.
- **Status**: Blocked — Requires Product Clarification (Specific assignment status values remain undefined).

---

#### Test Case ID: TC-PAR-005
- **Test Case Title**: Verify Parent Viewing Attendance and Absence Records
- **Requirement ID**: `FR-PAR-004`
- **Backlog Item**: `الحضور و الغياب`
- **User Story**: `US-PAR-002`
- **User Scenario**: `SC-PAR-002`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - Attendance and absence records exist for a student.
  - Actor is authenticated/acting as Parent (`ولي الأمر`).
- **Test Data**: Conceptual attendance/absence history.
- **Test Steps**:
  1. Access the parent interface for attendance and absence.
  2. View the attendance and absence records for the student.
- **Expected Result**: Student attendance and absence records are displayed to the parent.
- **Status**: Ready

---

### 4.6 Notifications

#### Test Case ID: TC-NOT-001
- **Test Case Title**: Verify Lesson Reminder Notification Trigger (1 Hour Before Lesson)
- **Requirement ID**: `FR-NOT-001`
- **Backlog Item**: `اشعار قبل الحصة ب ساعه`
- **User Story**: `US-NOT-001`
- **User Scenario**: `SC-NOT-001`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - A scheduled lesson is configured in the system.
  - The scheduled lesson time is reached (1 hour prior to session).
- **Test Data**: Conceptual lesson schedule.
- **Test Steps**:
  1. Configure a lesson scheduled for a designated time.
  2. Advance system condition to 1 hour before the scheduled lesson.
  3. Verify notification initiation for the lesson reminder.
- **Expected Result**: A reminder notification is initiated 1 hour before the scheduled lesson.
- **Status**: Blocked — Requires Product Clarification (Intended recipient and delivery channel remain undefined).

---

#### Test Case ID: TC-NOT-002
- **Test Case Title**: Verify Unsolved Homework Notification Trigger
- **Requirement ID**: `FR-NOT-002`
- **Backlog Item**: `اشعار في حالة عدم حل الواجب`
- **User Story**: `US-NOT-002`
- **User Scenario**: `SC-NOT-002`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - An assignment is created and assigned in the system.
  - Homework remains unsolved under trigger conditions.
- **Test Data**: Conceptual unsolved assignment record.
- **Test Steps**:
  1. Configure an assignment in the system.
  2. Establish the condition where the homework is not solved.
  3. Verify notification initiation for unsolved homework.
- **Expected Result**: A notification is initiated for the unsolved homework.
- **Status**: Blocked — Requires Product Clarification (Trigger deadline, intended recipient, and delivery channel remain undefined).

---

#### Test Case ID: TC-NOT-003
- **Test Case Title**: Verify New Exam Notification Trigger
- **Requirement ID**: `FR-NOT-004`
- **Backlog Item**: `اشعار امتحان جديد`
- **User Story**: `US-NOT-003`
- **User Scenario**: `SC-NOT-003`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - System is operational.
  - A new exam is created or scheduled.
- **Test Data**: Conceptual new exam record.
- **Test Steps**:
  1. Create or schedule a new exam in the system.
  2. Confirm the exam creation.
  3. Verify notification initiation for the new exam.
- **Expected Result**: A notification is initiated for the new exam.
- **Status**: Blocked — Requires Product Clarification (Intended recipient and delivery channel remain undefined).

---

#### Test Case ID: TC-NOT-004
- **Test Case Title**: Verify Student Exam Grade Notification Trigger
- **Requirement ID**: `FR-NOT-003`
- **Backlog Item**: `اشعار درجة امتحان الطالب`
- **User Story**: `US-NOT-003`
- **User Scenario**: `SC-NOT-003`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - A student exam has been evaluated/graded in the system.
- **Test Data**: Conceptual exam grade entry.
- **Test Steps**:
  1. Record or generate a student exam grade in the system.
  2. Confirm the grade entry.
  3. Verify notification initiation for the recorded exam grade.
- **Expected Result**: A notification is initiated for the student exam grade.
- **Status**: Blocked — Requires Product Clarification (Intended recipient and delivery channel remain undefined).

---

#### Test Case ID: TC-NOT-005
- **Test Case Title**: Verify Student Absence Notification Trigger
- **Requirement ID**: `FR-NOT-005`
- **Backlog Item**: `اشعارات في حالة غياب الطالب`
- **User Story**: `US-NOT-004`
- **User Scenario**: `SC-NOT-004`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - System is operational.
  - Student absence is recorded.
- **Test Data**: Conceptual student absence record.
- **Test Steps**:
  1. Record an absence for a designated student.
  2. Confirm the absence record in the system.
  3. Verify notification initiation for the student absence.
- **Expected Result**: A notification is initiated for the student absence.
- **Status**: Blocked — Requires Product Clarification (Intended recipient and delivery channel remain undefined).

---

### 4.7 Groups Management

#### Test Case ID: TC-GRP-001
- **Test Case Title**: Verify Creating Group
- **Requirement ID**: `FR-GRP-003`
- **Backlog Item**: `انشاء مجموعة`
- **User Story**: `US-GRP-001`
- **User Scenario**: `SC-GRP-001`
- **Test Type**: Functional / System
- **Priority**: P0
- **Preconditions**:
  - System is operational.
  - Group details are prepared.
- **Test Data**: Conceptual group details.
- **Test Steps**:
  1. Access the group creation interface.
  2. Provide the group details.
  3. Confirm the group creation.
  4. Verify that the group exists in the system.
- **Expected Result**: The group is created and available in the system.
- **Status**: Ready

---

#### Test Case ID: TC-GRP-002
- **Test Case Title**: Verify Scheduling Lesson Times
- **Requirement ID**: `FR-GRP-001`
- **Backlog Item**: `تحديد مواعيد الدروس`
- **User Story**: `US-GRP-001`
- **User Scenario**: `SC-GRP-001`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - An educational group exists in the system.
  - Lesson schedule information is prepared.
- **Test Data**: Conceptual scheduled lesson time.
- **Test Steps**:
  1. Access the lesson scheduling interface for a group.
  2. Define and assign scheduled lesson times to the group.
  3. Confirm the schedule assignment.
  4. Verify the scheduled lesson times in the system.
- **Expected Result**: The scheduled lesson times are recorded and associated with the group in the system.
- **Status**: Ready

---

#### Test Case ID: TC-GRP-003
- **Test Case Title**: Verify Adding Students to Groups
- **Requirement ID**: `FR-GRP-002`
- **Backlog Item**: `اضافة طلاب`
- **User Story**: `US-GRP-002`
- **User Scenario**: `SC-GRP-002`
- **Test Type**: Functional / System
- **Priority**: P0
- **Preconditions**:
  - A group exists in the system.
  - Student records exist in the system.
- **Test Data**: Conceptual student-to-group assignment.
- **Test Steps**:
  1. Access the group roster management interface.
  2. Add/assign designated students to the group.
  3. Confirm the roster addition.
  4. View the group student roster.
- **Expected Result**: The addition of students to the group is recorded in the system.
- **Status**: Ready

---

### 4.8 Users & Permissions

#### Test Case ID: TC-USR-001
- **Test Case Title**: Verify Representation of Teacher Role
- **Requirement ID**: `FR-USR-004`
- **Backlog Item**: `المدرس`
- **User Story**: `US-USR-001`
- **User Scenario**: `SC-USR-001`
- **Test Type**: Functional / Security
- **Priority**: P0
- **Preconditions**:
  - System is operational.
- **Test Data**: Conceptual Teacher role entity.
- **Test Steps**:
  1. Access the system with Teacher role context.
  2. Verify that the system recognizes and represents the Teacher role.
- **Expected Result**: The Teacher role (`المدرس`) is represented in the system.
- **Status**: Blocked — Requires Product Clarification (Detailed permissions and access rights remain undefined).

---

#### Test Case ID: TC-USR-002
- **Test Case Title**: Verify Representation of Student Role
- **Requirement ID**: `FR-USR-003`
- **Backlog Item**: `الطالب`
- **User Story**: `US-USR-001`
- **User Scenario**: `SC-USR-001`
- **Test Type**: Functional / Security
- **Priority**: P0
- **Preconditions**:
  - System is operational.
- **Test Data**: Conceptual Student role entity.
- **Test Steps**:
  1. Access the system with Student role context.
  2. Verify that the system recognizes and represents the Student role.
- **Expected Result**: The Student role (`الطالب`) is represented in the system.
- **Status**: Blocked — Requires Product Clarification (Detailed permissions and access rights remain undefined).

---

#### Test Case ID: TC-USR-003
- **Test Case Title**: Verify Representation of Parent Role
- **Requirement ID**: `FR-USR-002`
- **Backlog Item**: `ولي الامر`
- **User Story**: `US-USR-001`
- **User Scenario**: `SC-USR-001`
- **Test Type**: Functional / Security
- **Priority**: P0
- **Preconditions**:
  - System is operational.
- **Test Data**: Conceptual Parent role entity.
- **Test Steps**:
  1. Access the system with Parent role context.
  2. Verify that the system recognizes and represents the Parent role.
- **Expected Result**: The Parent role (`ولي الامر`) is represented in the system.
- **Status**: Blocked — Requires Product Clarification (Detailed permissions and access rights remain undefined).

---

#### Test Case ID: TC-USR-004
- **Test Case Title**: Verify Representation of Secretariat Role
- **Requirement ID**: `FR-USR-001`
- **Backlog Item**: `السكرتارية`
- **User Story**: `US-USR-001`
- **User Scenario**: `SC-USR-001`
- **Test Type**: Functional / Security
- **Priority**: P1
- **Preconditions**:
  - System is operational.
- **Test Data**: Conceptual Secretariat role entity.
- **Test Steps**:
  1. Access the system with Secretariat role context.
  2. Verify that the system recognizes and represents the Secretariat role.
- **Expected Result**: The Secretariat role (`السكرتارية`) is represented in the system.
- **Status**: Blocked — Requires Product Clarification (Detailed operational scope and permissions remain undefined).

---

### 4.9 Subscriptions

#### Test Case ID: TC-SUB-001
- **Test Case Title**: Verify Student Payment Status Representation
- **Requirement ID**: `FR-SUB-001`
- **Backlog Item**: `حالة الدفع لكل طالب`
- **User Story**: `US-SUB-001`
- **User Scenario**: `SC-SUB-001`
- **Test Type**: Functional / System
- **Priority**: P1
- **Preconditions**:
  - A student record exists in the system.
  - Payment status is assigned to the student.
- **Test Data**: Conceptual payment status record.
- **Test Steps**:
  1. Access the payment status interface for a student.
  2. View or update the payment status record.
  3. Confirm the payment status representation in the system.
- **Expected Result**: The payment status for each student is represented in the system.
- **Status**: Blocked — Requires Product Clarification (Specific payment status values and management permissions remain undefined).

---

### 4.11 Offline-First & Data Synchronization

#### Test Case ID: TC-OFF-001
- **Test Case Title**: Verify Offline QR Code Attendance Scanning and Outbox Persistence
- **Requirement ID**: `FR-ATT-004`, `NFR-REL-002`
- **Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **User Story**: `US-ATT-003`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Offline / Local Data Integration
- **Priority**: P1
- **Preconditions**:
  - Teacher is authenticated on client device.
  - Active lesson session roster and student QR tokens are synchronized in local database.
  - Network connectivity is disabled (device is offline).
- **Test Data**: Valid student QR credential.
- **Test Steps**:
  1. Teacher scans student QR code while offline.
  2. Inspect local database and pending outbox queue.
- **Expected Result**: Attendance is saved locally with state `PENDING_CREATION`; Outbox row is created; UI displays pending sync indicator.
- **Status**: Ready

---

#### Test Case ID: TC-OFF-002
- **Test Case Title**: Verify Automatic Reconnection Synchronization and Server Confirmation
- **Requirement ID**: `FR-ATT-004`, `NFR-REL-002`
- **Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **User Story**: `US-ATT-003`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Synchronization / Integration
- **Priority**: P1
- **Preconditions**:
  - Pending attendance operations exist in client outbox.
- **Test Data**: `POST /api/v1/attendance/sessions/:sessionId/scan-qr`.
- **Test Steps**:
  1. Re-establish network connectivity.
  2. Observe Sync Engine dispatching outbox operations to server API.
  3. Verify server confirmation response.
- **Expected Result**: Server returns 200 OK; Outbox queue drains; Local attendance records transition to confirmed `SYNCED` state.
- **Status**: Ready

---

#### Test Case ID: TC-OFF-003
- **Test Case Title**: Verify Server Rejection of Ineligible Student Scanned Offline
- **Requirement ID**: `FR-ATT-004`, `NFR-REL-002`
- **Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **User Story**: `US-ATT-003`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Conflict / Server Authority
- **Priority**: P1
- **Preconditions**:
  - Student was deactivated on server while client device was offline.
  - Teacher scanned the deactivated student badge offline.
- **Test Data**: Pending outbox item for deactivated student.
- **Test Steps**:
  1. Restore network connection.
  2. Sync Engine attempts to synchronize outbox item with server.
- **Expected Result**: Server authoritative check rejects request with `422 Unprocessable Entity`; Outbox item transitions to `FAILED_PERMANENT`; UI displays informative rejection notice.
- **Status**: Ready

---

#### Test Case ID: TC-OFF-004
- **Test Case Title**: Verify Offline Duplicate Scan Idempotency on Server Sync
- **Requirement ID**: `FR-ATT-004`, `NFR-REL-002`
- **Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **User Story**: `US-ATT-003`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Idempotency / Concurrency
- **Priority**: P1
- **Preconditions**:
  - Same student badge was scanned twice while offline.
- **Test Data**: Two outbox sync requests for identical `(sessionId, studentId)`.
- **Test Steps**:
  1. Reconnect to network and execute synchronization.
- **Expected Result**: First request creates attendance row; Second request caught by server unique constraint `uq_session_student` and returns `isDuplicate: true`; Zero duplicate rows created; Original timestamp preserved.
- **Status**: Ready

---

#### Test Case ID: TC-OFF-005
- **Test Case Title**: Verify Application Restart and Durable Outbox Recovery
- **Requirement ID**: `FR-ATT-004`, `NFR-REL-002`
- **Backlog Item**: `تسجيل الحضور عبر مسح QR Code`
- **User Story**: `US-ATT-003`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Resilience / Durability
- **Priority**: P1
- **Preconditions**:
  - Device is offline with pending operations in local outbox.
- **Test Data**: Pending operations in durable local database.
- **Test Steps**:
  1. Force-quit application or reboot device.
  2. Relaunch application in offline state.
- **Expected Result**: Pending operations and local attendance records remain intact; Sync Engine resumes automatically once network returns.
- **Status**: Ready

---

### 4.10 Online Learning (Courses)

#### Test Case ID: TC-OL-001
- **Test Case Title**: Verify Teacher Online Course Creation & Publication Lifecycle
- **Requirement ID**: `FR-OL-001`, `PRD-OL-001`
- **User Story**: `US-OL-001`
- **User Scenario**: `SC-OL-007`
- **Test Type**: Functional / State Transition
- **Priority**: P0
- **Preconditions**: Authenticated user with role `TEACHER`.
- **Test Steps**:
  1. Call `POST /api/v1/courses` with title, subject, grade level, and description.
  2. Verify course record created in PostgreSQL with status `DRAFT`.
  3. Call `PATCH /api/v1/courses/:id` setting `status: "PUBLISHED"`.
  4. Verify course appears in public Course Catalog.
- **Expected Result**: Course transitions cleanly from `DRAFT` to `PUBLISHED` and becomes discoverable in catalog.
- **Status**: Ready

#### Test Case ID: TC-OL-002
- **Test Case Title**: Verify Course Module Creation & Sequential Ordering
- **Requirement ID**: `FR-OL-002`, `PRD-OL-001`
- **User Story**: `US-OL-001`
- **User Scenario**: `SC-OL-007`
- **Test Type**: Functional / Data Integrity
- **Priority**: P1
- **Preconditions**: Existing published course.
- **Test Steps**:
  1. Call `POST /api/v1/courses/:id/modules` with module 1 (`orderIndex: 1`).
  2. Call `POST /api/v1/courses/:id/modules` with module 2 (`orderIndex: 2`).
  3. Attempt creating another module with `orderIndex: 1` in the same course.
- **Expected Result**: Modules created in sequence; duplicate `orderIndex` in same course is rejected by database composite unique constraint `uq_course_module_order`.
- **Status**: Ready

#### Test Case ID: TC-OL-003
- **Test Case Title**: Verify Course Lesson Creation with Bunny Video & R2 Attachments
- **Requirement ID**: `FR-OL-002`, `FR-OL-004`
- **User Story**: `US-OL-001`, `US-OL-003`
- **User Scenario**: `SC-OL-007`
- **Test Type**: Functional / Media Integration
- **Priority**: P1
- **Preconditions**: Existing course module.
- **Test Steps**:
  1. Call `POST /api/v1/courses/modules/:moduleId/lessons` with video asset ID and duration.
  2. Attach Cloudflare R2 PDF summary reference to the lesson.
  3. Fetch lesson outline for course.
- **Expected Result**: Lesson created successfully with video metadata and PDF download references.
- **Status**: Ready

#### Test Case ID: TC-OL-004
- **Test Case Title**: Verify Student Online Course Enrollment & Entitlement Activation
- **Requirement ID**: `FR-OL-003`, `PRD-OL-002`
- **User Story**: `US-OL-002`
- **User Scenario**: `SC-OL-001`
- **Test Type**: Functional / Entitlement
- **Priority**: P0
- **Preconditions**: Authenticated student account, published course.
- **Test Steps**:
  1. Student requests `POST /api/v1/courses/:id/enroll`.
  2. Verify creation of `CourseEnrollment` and `CourseAccess` with `access_status = 'ACTIVE'`.
  3. Student requests `GET /api/v1/courses/my-courses`.
- **Expected Result**: Course appears in student's "My Courses" list with unlocked lesson access.
- **Status**: Ready

#### Test Case ID: TC-OL-005
- **Test Case Title**: Verify Course Access Denied for Unenrolled Student
- **Requirement ID**: `FR-OL-003`, `NFR-SEC-001`
- **User Story**: `US-OL-003`
- **User Scenario**: `SC-OL-002`
- **Test Type**: Security / Authorization
- **Priority**: P0
- **Preconditions**: Student is NOT enrolled in Course X (no `CourseAccess`).
- **Test Steps**:
  1. Student attempts `GET /api/v1/courses/lessons/:lessonId` for a non-preview lesson in Course X.
- **Expected Result**: Backend rejects request with `403 Forbidden` (`COURSE_ACCESS_DENIED`); Zero signed video embed tokens are leaked.
- **Status**: Ready

#### Test Case ID: TC-OL-006
- **Test Case Title**: Verify Online-Only Student Enrollment Rejection in Physical QR Attendance
- **Requirement ID**: `FR-ATT-004`, `FR-OL-003`
- **User Story**: `US-ATT-003`, `US-OL-002`
- **User Scenario**: `SC-ATT-003`
- **Test Type**: Domain Boundary Invariant
- **Priority**: P0
- **Preconditions**: Student has active `CourseEnrollment` in Teacher's online course, but is NOT enrolled in Teacher's physical `AcademicGroup`.
- **Test Steps**:
  1. Teacher opens active physical session scanner.
  2. Teacher scans student's QR badge.
- **Expected Result**: 7-tier attendance pipeline fails at Tier 5 (`GroupEnrollment` check); Returns `422 Unprocessable Entity` with `NOT_ENROLLED_IN_GROUP`; Zero attendance records created in `attendance_records`.
- **Status**: Ready

#### Test Case ID: TC-OL-007
- **Test Case Title**: Verify Single Student Identity Across Dual Enrollments
- **Requirement ID**: `FR-STU-004`, `FR-OL-003`, `FR-GRP-002`
- **User Story**: `US-STU-001`, `US-OL-002`
- **User Scenario**: `SC-STU-001`, `SC-OL-001`
- **Test Type**: Data Integrity / Multi-Domain
- **Priority**: P0
- **Preconditions**: Existing student profile.
- **Test Steps**:
  1. Enroll student in physical `AcademicGroup A`.
  2. Enroll same student in online `Course B`.
  3. Inspect `users` and `student_profiles` tables.
- **Expected Result**: Exactly ONE `users` row and ONE `student_profiles` row exists; Student holds active `group_enrollments` and active `course_enrollments` simultaneously without identity collision.
- **Status**: Ready

#### Test Case ID: TC-OL-008
- **Test Case Title**: Verify Asynchronous Video Lesson Playback & Signed Token Generation
- **Requirement ID**: `FR-OL-004`, `PRD-OL-003`
- **User Story**: `US-OL-003`
- **User Scenario**: `SC-OL-002`
- **Test Type**: Functional / Media Delivery
- **Priority**: P1
- **Preconditions**: Enrolled student accessing lesson.
- **Test Steps**:
  1. Student requests `GET /api/v1/courses/lessons/:lessonId`.
  2. Inspect response payload for signed video embed URL.
- **Expected Result**: Response returns time-limited signed Bunny Stream URL (`expiresIn <= 3600s`) and existing resume playback position.
- **Status**: Ready

#### Test Case ID: TC-OL-009
- **Test Case Title**: Verify Playback Progress Save & Resume Position Retrieval
- **Requirement ID**: `FR-OL-005`, `PRD-OL-004`
- **User Story**: `US-OL-004`
- **User Scenario**: `SC-OL-002`
- **Test Type**: Functional / Progress Tracking
- **Priority**: P1
- **Preconditions**: Enrolled student playing video.
- **Test Steps**:
  1. Video player emits `POST /api/v1/courses/lessons/:lessonId/progress` with `positionSeconds: 450`.
  2. Reload lesson view via `GET /api/v1/courses/lessons/:lessonId`.
- **Expected Result**: Response reflects `lastPositionSeconds = 450`; video player resumes automatically at 450s.
- **Status**: Ready

#### Test Case ID: TC-OL-010
- **Test Case Title**: Verify Dynamic Course Completion Percentage Calculation
- **Requirement ID**: `FR-OL-005`, `PRD-OL-004`
- **User Story**: `US-OL-004`
- **User Scenario**: `SC-OL-002`
- **Test Type**: Functional / Calculation Invariant
- **Priority**: P1
- **Preconditions**: Course has 4 published lessons.
- **Test Steps**:
  1. Student completes lesson 1 (`isCompleted: true`) -> Progress = 25%.
  2. Student completes lesson 2 (`isCompleted: true`) -> Progress = 50%.
  3. Fetch `GET /api/v1/courses/my-courses`.
- **Expected Result**: Progress accurately calculated as 50% (`completedCount / totalCount * 100`).
- **Status**: Ready

#### Test Case ID: TC-OL-011
- **Test Case Title**: Verify Online Course Assessment Single Attempt & Auto-Grading
- **Requirement ID**: `FR-OL-006`, `PRD-OL-005`
- **User Story**: `US-OL-006`
- **User Scenario**: `SC-OL-005`
- **Test Type**: Functional / Assessment
- **Priority**: P0
- **Preconditions**: Assessment attached to course lesson with 5 MCQ questions.
- **Test Steps**:
  1. Student delivers answers via `POST /api/v1/assessments/:id/submit`.
  2. Verify immediate auto-grading score response.
  3. Student attempts second submission for same assessment.
- **Expected Result**: First submission returns 200 OK with total score and graded answers; Second attempt rejected with `409 Conflict` (`ALREADY_SUBMITTED`).
- **Status**: Ready

#### Test Case ID: TC-OL-012
- **Test Case Title**: Verify Parent Online Course Progress Monitoring
- **Requirement ID**: `FR-OL-007`, `PRD-OL-006`
- **User Story**: `US-OL-007`
- **User Scenario**: `SC-OL-006`
- **Test Type**: Functional / Parent Portal
- **Priority**: P1
- **Preconditions**: Parent authenticated and verified as guardian of Student A.
- **Test Steps**:
  1. Parent requests `GET /api/v1/parent-portal/students/:studentId/courses`.
- **Expected Result**: Returns Student A's enrolled courses, completion percentage bars, completed lesson counts, and online exam scores.
- **Status**: Ready

#### Test Case ID: TC-OL-013
- **Test Case Title**: Verify Parent BOLA / IDOR Protection on Online Courses Tab
- **Requirement ID**: `FR-OL-007`, `NFR-SEC-001`
- **User Story**: `US-OL-007`
- **User Scenario**: `SC-OL-006`
- **Test Type**: Security / IDOR Protection
- **Priority**: P0
- **Preconditions**: Parent X is NOT linked to Student Y in `parent_student_links`.
- **Test Steps**:
  1. Parent X attempts `GET /api/v1/parent-portal/students/[Student-Y-ID]/courses`.
- **Expected Result**: Backend `ResourceOwnershipGuard` intercepts and returns `403 Forbidden` (`FORBIDDEN_PARENT_ACCESS`).
- **Status**: Ready

#### Test Case ID: TC-OL-014
- **Test Case Title**: Verify Offline Course Outline Browsing from Local Cache
- **Requirement ID**: `FR-OL-008`, `PRD-OL-007`
- **User Story**: `US-OL-005`
- **User Scenario**: `SC-OL-003`
- **Test Type**: Offline-First / Client Cache
- **Priority**: P1
- **Preconditions**: Student previously loaded course outline online; Device disconnected from internet.
- **Test Steps**:
  1. Disconnect device network.
  2. Navigate to Course Outline view.
- **Expected Result**: Client loads cached modules and lesson descriptions from IndexedDB; Displays "Offline Mode" indicator without error crash.
- **Status**: Ready

#### Test Case ID: TC-OL-015
- **Test Case Title**: Verify Staging Progress Events in Client Offline Outbox
- **Requirement ID**: `FR-OL-008`, `PRD-OL-007`
- **User Story**: `US-OL-005`
- **User Scenario**: `SC-OL-003`
- **Test Type**: Offline-First / Outbox Durability
- **Priority**: P1
- **Preconditions**: Device offline.
- **Test Steps**:
  1. Student completes lesson reading while offline.
  2. Inspect local IndexedDB outbox store.
- **Expected Result**: Staged event persisted in outbox table with unique `client_operation_id` UUID and timestamp.
- **Status**: Ready

#### Test Case ID: TC-OL-016
- **Test Case Title**: Verify Batch Progress Sync on Network Reconnection
- **Requirement ID**: `FR-OL-008`, `PRD-OL-007`
- **User Story**: `US-OL-005`
- **User Scenario**: `SC-OL-004`
- **Test Type**: Offline-First / Batch Sync
- **Priority**: P0
- **Preconditions**: Device has 3 queued progress events in outbox.
- **Test Steps**:
  1. Reconnect network.
  2. Background sync worker triggers `POST /api/v1/sync/progress`.
- **Expected Result**: Server processes batch atomically; Updates `course_progress` in PostgreSQL; Returns `200 OK`; Outbox queue drains to 0.
- **Status**: Ready

#### Test Case ID: TC-OL-017
- **Test Case Title**: Verify Monotonic Conflict Resolution on Outbox Sync
- **Requirement ID**: `FR-OL-008`, `NFR-REL-002`
- **User Story**: `US-OL-005`
- **User Scenario**: `SC-OL-004`
- **Test Type**: Conflict Resolution / Monotonicity
- **Priority**: P1
- **Preconditions**: Lesson is already marked `is_completed = true` on server with `last_position_seconds = 1800`.
- **Test Steps**:
  1. Sync worker transmits an older offline event with `positionSeconds: 600` and `isCompleted: false`.
- **Expected Result**: Server applies monotonic operators (`GREATEST(1800, 600) = 1800`, `true OR false = true`); Server state remains `is_completed = true` and `1800s`.
- **Status**: Ready

#### Test Case ID: TC-OL-018
- **Test Case Title**: Verify Batch Progress Sync Idempotency on Duplicate Retransmit
- **Requirement ID**: `FR-OL-008`, `NFR-REL-002`
- **User Story**: `US-OL-005`
- **User Scenario**: `SC-OL-004`
- **Test Type**: Idempotency / Retry Safety
- **Priority**: P1
- **Preconditions**: Batch with `client_operation_id = UUID-X` already processed.
- **Test Steps**:
  1. Retransmit identical batch with `client_operation_id = UUID-X`.
- **Expected Result**: Server detects existing `client_operation_id`; Returns `200 OK` confirmation without duplicating progress rows or altering timestamps.
- **Status**: Ready

---

## 5. Test Case Traceability Matrix

| Test Case ID | Requirement ID | Backlog Item / Domain | User Story | User Scenario | Test Case Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-STU-001` | `FR-STU-004`, `FR-STU-002` | `بيانات الطالب`, `المجموعة و الصف` | `US-STU-001` | `SC-STU-001` | Ready |
| `TC-STU-002` | `FR-STU-003` | `بيانات ولي الامر` | `US-STU-002` | `SC-STU-002` | Ready |
| `TC-STU-003` | `FR-STU-001` | `حالة الطلاب` | `US-STU-003` | `SC-STU-003` | Blocked — Requires Product Clarification |
| `TC-ATT-001` | `FR-ATT-003` | `تسجيل حضور الطلاب` | `US-ATT-001` | `SC-ATT-001` | Ready |
| `TC-ATT-002` | `FR-ATT-002` | `تسجيل الغياب` | `US-ATT-001` | `SC-ATT-001` | Ready |
| `TC-ATT-003` | `FR-ATT-001` | `تقارير الحضور و الغياب` | `US-ATT-002` | `SC-ATT-002` | Ready |
| `TC-ATT-004` | `FR-ATT-004` | `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | Ready |
| `TC-ATT-005` | `FR-ATT-004` | `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | Ready |
| `TC-ATT-006` | `FR-ATT-004` | `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | Ready |
| `TC-ATT-007` | `FR-ATT-004` | `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | Ready |
| `TC-ATT-008` | `FR-ATT-004`, `FR-USR-004` | `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | Ready |
| `TC-ATT-009` | `FR-ATT-004` | `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | Ready |
| `TC-ATT-010` | `FR-ATT-004` | `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | Ready |
| `TC-OFF-001` | `FR-ATT-004`, `NFR-REL-002` | `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | Ready |
| `TC-OFF-002` | `FR-ATT-004`, `NFR-REL-002` | `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | Ready |
| `TC-OFF-003` | `FR-ATT-004`, `NFR-REL-002` | `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | Ready |
| `TC-OFF-004` | `FR-ATT-004`, `NFR-REL-002` | `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | Ready |
| `TC-OFF-005` | `FR-ATT-004`, `NFR-REL-002` | `تسجيل الحضور عبر مسح QR Code` | `US-ATT-003` | `SC-ATT-003` | Ready |
| `TC-LES-001` | `FR-LES-002` | `رفع الملفات و المراجع و الملخصات` | `US-LES-001` | `SC-LES-001` | Ready |
| `TC-LES-002` | `FR-LES-003` | `رفع تسجيلات المحاضرات` | `US-LES-001` | `SC-LES-001` | Ready |
| `TC-LES-003` | `FR-LES-001` | `متابعة مشاهدة المحتوى` | `US-LES-002` | `SC-LES-002` | Blocked — Requires Product Clarification |
| `TC-EXM-001` | `FR-EXM-004`, `FR-EXM-005` | `رفع الواجبات`, `انشاء الواجبات` | `US-EXM-001` | `SC-EXM-001` | Ready |
| `TC-EXM-002` | `FR-EXM-006`, `FR-EXM-007` | `رفع الامتحانات`, `انشاء الامتحانات` | `US-EXM-001` | `SC-EXM-001` | Ready |
| `TC-EXM-003` | `FR-EXM-003` | `تسليم الواجبات و الامتحانات` | `US-EXM-002` | `SC-EXM-002` | Ready |
| `TC-EXM-004` | `FR-EXM-002`, `FR-EXM-003` | `تصحيح الدرجات تلقائي`, `تسليم الواجبات و الامتحانات` | `US-EXM-002`, `US-EXM-003` | `SC-EXM-002`, `SC-EXM-003` | Ready |
| `TC-EXM-005` | `FR-EXM-001` | `عرض النتائج لي ولي الامر` | `US-EXM-004` | `SC-EXM-004` | Ready |
| `TC-PAR-001` | `FR-PAR-001` | `تقييمات + ملاحظات المدرس` | `US-PAR-001` | `SC-PAR-001` | Ready |
| `TC-PAR-002` | `FR-PAR-003` | `درجات الامتحانات` | `US-PAR-001` | `SC-PAR-001` | Ready |
| `TC-PAR-003` | `FR-PAR-005` | `مستوى الطالب` | `US-PAR-001` | `SC-PAR-001` | Blocked — Requires Product Clarification |
| `TC-PAR-004` | `FR-PAR-002` | `حالة الواجبات` | `US-PAR-002` | `SC-PAR-002` | Blocked — Requires Product Clarification |
| `TC-PAR-005` | `FR-PAR-004` | `الحضور و الغياب` | `US-PAR-002` | `SC-PAR-002` | Ready |
| `TC-NOT-001` | `FR-NOT-001` | `اشعار قبل الحصة ب ساعه` | `US-NOT-001` | `SC-NOT-001` | Blocked — Requires Product Clarification |
| `TC-NOT-002` | `FR-NOT-002` | `اشعار في حالة عدم حل الواجب` | `US-NOT-002` | `SC-NOT-002` | Blocked — Requires Product Clarification |
| `TC-NOT-003` | `FR-NOT-004` | `اشعار امتحان جديد` | `US-NOT-003` | `SC-NOT-003` | Blocked — Requires Product Clarification |
| `TC-NOT-004` | `FR-NOT-003` | `اشعار درجة امتحان الطالب` | `US-NOT-003` | `SC-NOT-003` | Blocked — Requires Product Clarification |
| `TC-NOT-005` | `FR-NOT-005` | `اشعارات في حالة غياب الطالب` | `US-NOT-004` | `SC-NOT-004` | Blocked — Requires Product Clarification |
| `TC-GRP-001` | `FR-GRP-003` | `انشاء مجموعة` | `US-GRP-001` | `SC-GRP-001` | Ready |
| `TC-GRP-002` | `FR-GRP-001` | `تحديد مواعيد الدروس` | `US-GRP-001` | `SC-GRP-001` | Ready |
| `TC-GRP-003` | `FR-GRP-002` | `اضافة طلاب` | `US-GRP-002` | `SC-GRP-002` | Ready |
| `TC-USR-001` | `FR-USR-004` | `المدرس` | `US-USR-001` | `SC-USR-001` | Blocked — Requires Product Clarification |
| `TC-USR-002` | `FR-USR-003` | `الطالب` | `US-USR-001` | `SC-USR-001` | Blocked — Requires Product Clarification |
| `TC-USR-003` | `FR-USR-002` | `ولي الامر` | `US-USR-001` | `SC-USR-001` | Blocked — Requires Product Clarification |
| `TC-USR-004` | `FR-USR-001` | `السكرتارية` | `US-USR-001` | `SC-USR-001` | Blocked — Requires Product Clarification |
| `TC-SUB-001` | `FR-SUB-001` | `حالة الدفع لكل طالب` | `US-SUB-001` | `SC-SUB-001` | Blocked — Requires Product Clarification |
| `TC-OL-001` | `FR-OL-001` | `ادارة ونشر الدورات الرقمية` | `US-OL-001` | `SC-OL-007` | Ready |
| `TC-OL-002` | `FR-OL-002` | `هيكلة الوحدات الرقمية` | `US-OL-001` | `SC-OL-007` | Ready |
| `TC-OL-003` | `FR-OL-002`, `FR-OL-004` | `هيكلة الدروس والوسائط` | `US-OL-001`, `US-OL-003` | `SC-OL-007` | Ready |
| `TC-OL-004` | `FR-OL-003` | `الالتحاق بالدورة وصلاحية الوصول` | `US-OL-002` | `SC-OL-001` | Ready |
| `TC-OL-005` | `FR-OL-003` | `حظر الوصول لغير الملتحقين` | `US-OL-003` | `SC-OL-002` | Ready |
| `TC-OL-006` | `FR-ATT-004`, `FR-OL-003` | `فصل نطاق الحضور الفيزيائي عن الدورات` | `US-ATT-003`, `US-OL-002` | `SC-ATT-003` | Ready |
| `TC-OL-007` | `FR-STU-004`, `FR-OL-003` | `هوية الطالب الموحدة عبر النطاقين` | `US-STU-001`, `US-OL-002` | `SC-STU-001`, `SC-OL-001` | Ready |
| `TC-OL-008` | `FR-OL-004` | `مشاهدة الدرس والوسائط المشفرة` | `US-OL-003` | `SC-OL-002` | Ready |
| `TC-OL-009` | `FR-OL-005` | `حفظ واستئناف تقدم الفيديو` | `US-OL-004` | `SC-OL-002` | Ready |
| `TC-OL-010` | `FR-OL-005` | `حساب نسبة اتمام الدورة ديناميكياً` | `US-OL-004` | `SC-OL-002` | Ready |
| `TC-OL-011` | `FR-OL-006` | `امتحان الدورة والتصحيح التلقائي` | `US-OL-006` | `SC-OL-005` | Ready |
| `TC-OL-012` | `FR-OL-007` | `متابعة ولي الامر لتقدم الدورة` | `US-OL-007` | `SC-OL-006` | Ready |
| `TC-OL-013` | `FR-OL-007` | `حماية بيانات ولي الامر عبر الدورات` | `US-OL-007` | `SC-OL-006` | Ready |
| `TC-OL-014` | `FR-OL-008` | `تصفح هيكل الدورة بدون اتصال` | `US-OL-005` | `SC-OL-003` | Ready |
| `TC-OL-015` | `FR-OL-008` | `حفظ تقدم الدرس في صندوق الإرسال المحلي` | `US-OL-005` | `SC-OL-003` | Ready |
| `TC-OL-016` | `FR-OL-008` | `مزامنة حزمة التقدم عند عودة الاتصال` | `US-OL-005` | `SC-OL-004` | Ready |
| `TC-OL-017` | `FR-OL-008` | `حل تعارض التقدم بالدمج الأحادي` | `US-OL-005` | `SC-OL-004` | Ready |
| `TC-OL-018` | `FR-OL-008` | `أمان تكرار إرسال حزمة المزامنة` | `US-OL-005` | `SC-OL-004` | Ready |
| `TC-DSH-001` | `FR-DSH-001` | `عرض المؤشرات الرئيسية للوحة المدرس` | `US-DSH-001` | `SC-DSH-001` | Ready |
| `TC-DSH-002` | `FR-DSH-002` | `تصفية بيانات لوحة التحكم حسب المجموعة والفترة` | `US-DSH-001` | `SC-DSH-001` | Ready |
| `TC-DSH-003` | `FR-DSH-003` | `الانتقال السريع لرصد الحضور الذكي للحصة الجارية` | `US-DSH-001` | `SC-DSH-001` | Ready |
| `TC-DSH-004` | `FR-DSH-004` | `تنبيهات الغياب المتكرر والواجبات المعلقة` | `US-DSH-001` | `SC-DSH-001` | Ready |
| `TC-DSH-005` | `FR-DSH-005` | `عرض لوحة التحكم في وضع عدم الاتصال (Offline)` | `US-DSH-001` | `SC-DSH-001` | Ready |
| `TC-DSH-006` | `FR-DSH-006` | `إمكانية الوصول وتوافق قارئ الشاشة للرسوم البيانية` | `US-DSH-001` | `SC-DSH-001` | Ready |


