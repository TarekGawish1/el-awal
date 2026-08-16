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

## 5. Test Case Traceability Matrix

| Test Case ID | Requirement ID | Backlog Item | User Story | User Scenario | Test Case Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-STU-001` | `FR-STU-004`, `FR-STU-002` | `بيانات الطالب`, `المجموعة و الصف` | `US-STU-001` | `SC-STU-001` | Ready |
| `TC-STU-002` | `FR-STU-003` | `بيانات ولي الامر` | `US-STU-002` | `SC-STU-002` | Ready |
| `TC-STU-003` | `FR-STU-001` | `حالة الطلاب` | `US-STU-003` | `SC-STU-003` | Blocked — Requires Product Clarification |
| `TC-ATT-001` | `FR-ATT-003` | `تسجيل حضور الطلاب` | `US-ATT-001` | `SC-ATT-001` | Ready |
| `TC-ATT-002` | `FR-ATT-002` | `تسجيل الغياب` | `US-ATT-001` | `SC-ATT-001` | Ready |
| `TC-ATT-003` | `FR-ATT-001` | `تقارير الحضور و الغياب` | `US-ATT-002` | `SC-ATT-002` | Ready |
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
