# User Scenarios

## 1. Document Information

- **Document Name**: User Scenarios
- **Document Type**: UX Documentation
- **Product**: Educational Management System for Teachers and Students (El Awal)
- **Version**: 2.0
- **Status**: Updated Draft — Online Learning Domain Integrated
- **Source of Truth**: Approved Backlog, Functional Requirements Document, Non-Functional Requirements Document, User Personas, and Educational Delivery Models

---

## 2. Scenario Overview

This document defines user scenarios for the educational management system across both **Physical Learning** and **Online Learning** delivery models for the four confirmed user roles:
- `UX-PER-001` — Teacher / المدرس
- `UX-PER-002` — Student / الطالب
- `UX-PER-003` — Parent / ولي الأمر
- `UX-PER-004` — Secretariat / السكرتارية

---

## 3. User Scenarios

### 3.1 Student Management

#### Scenario ID: SC-STU-001 — Student Data and Group/Class Association
- **Actor**: Teacher / Secretariat
- **Context**: Student demographic profiles, grade level, and group associations are recorded.
- **Scenario**:
  1. Staff enters student details and assigns academic stage/group.
  2. System stores profile and issues unique QR token (`qr_code_token`).
  3. Profile is active across physical and online views.
- **Expected Outcome**: Student profile is established with single identity.

#### Scenario ID: SC-STU-002 — Parent Data Management & Linking
- **Actor**: Secretariat / Parent
- **Context**: Parent/guardian contact details are registered and linked to enrolled students.
- **Scenario**:
  1. Staff registers parent contact and links parent to student record.
  2. Linkage is confirmed in `parent_student_links`.
- **Expected Outcome**: Verified parent monitoring established.

#### Scenario ID: SC-STU-003 — Student Status Representation
- **Actor**: Teacher / Secretariat
- **Context**: Updating student status (`ACTIVE`, `INACTIVE`, `SUSPENDED`).
- **Scenario**:
  1. Staff modifies status on student profile.
  2. System reflects updated status across physical rosters and online courses.
- **Expected Outcome**: Status change enforced system-wide.

---

### 3.2 Attendance & Absence (Physical Learning)

#### Scenario ID: SC-ATT-001 — Recording Student Attendance and Absence Manually
- **Actor**: Teacher / Secretariat
- **Context**: Teacher logs roll-call manually on session roster.
- **Scenario**:
  1. Teacher selects physical group session and marks student presence/absence.
  2. System records `AttendanceRecord` with method `MANUAL`.
- **Expected Outcome**: Session attendance logged.

#### Scenario ID: SC-ATT-002 — Attendance and Absence Reports
- **Actor**: Teacher / Secretariat / Parent
- **Context**: Viewing aggregated attendance summaries.
- **Scenario**:
  1. User selects date range and group/student.
  2. System calculates totals and attendance percentage.
- **Expected Outcome**: Formatted report displayed.

#### Scenario ID: SC-ATT-003 — Scanning Student QR Code for Session Attendance
- **Actor**: Teacher (Primary), Student (Supporting)
- **Context**: Rapid roll-call check-in at classroom door.
- **Scenario**:
  1. Teacher opens camera scanner on active physical session.
  2. Student presents QR badge; scanner captures token in <500ms.
  3. System validates teacher authorization, student active state, and physical group enrollment.
  4. System records `AttendanceRecord` as `PRESENT` with method `QR_SCAN`.
  5. Repeat scans are handled idempotently; online-only students receive an enrollment mismatch warning without logging attendance.
- **Expected Outcome**: Fast, tamper-proof attendance logged.

---

### 3.3 Lectures & Lessons

#### Scenario ID: SC-LES-001 — Uploading Educational Content and Lecture Recordings
- **Actor**: Teacher
- **Context**: Adding documents and lecture videos.
- **Scenario**:
  1. Teacher uploads PDFs to Cloudflare R2 and videos to Bunny Stream.
  2. System records metadata in `educational_content`.
- **Expected Outcome**: Materials available to enrolled students.

#### Scenario ID: SC-LES-002 — Monitoring Content Viewing
- **Actor**: Student, Teacher
- **Context**: Tracking engagement with instructional assets.
- **Scenario**:
  1. Student accesses file/video; system updates `content_progress`.
- **Expected Outcome**: Viewing statistics recorded.

---

### 3.4 Exams & Assignments

#### Scenario ID: SC-EXM-001 — Creating and Uploading Exams and Assignments
- **Actor**: Teacher
- **Context**: Authoring homework and auto-graded exams.
- **Scenario**:
  1. Teacher creates assessment with due dates and structured questions.
  2. System publishes assessment to group/course feed.
- **Expected Outcome**: Assessment available to learners.

#### Scenario ID: SC-EXM-002 — Submitting Assignments and Exams
- **Actor**: Student
- **Context**: Delivering completed coursework.
- **Scenario**:
  1. Student submits file or answers; system logs `AssessmentSubmission`.
- **Expected Outcome**: Submission recorded with timestamp.

#### Scenario ID: SC-EXM-003 — Automatic Grading of Exams
- **Actor**: System (Primary), Student (Supporting)
- **Context**: Automated exam score calculation.
- **Scenario**:
  1. System checks student answers against answer keys synchronously upon submission.
  2. System records total score and releases grade notification.
- **Expected Outcome**: Exam graded immediately without teacher delay.

#### Scenario ID: SC-EXM-004 — Displaying Results to Parent
- **Actor**: Parent
- **Context**: Reviewing child's grades.
- **Scenario**:
  1. Parent accesses results portal and views scores, passing status, and feedback.
- **Expected Outcome**: Transparent academic visibility.

---

### 3.5 Parent Student Status

#### Scenario ID: SC-PAR-001 — Parent Viewing Student Evaluations, Exam Grades, and Student Level
- **Actor**: Parent
- **Context**: Checking teacher feedback and academic standing.
- **Scenario**:
  1. Parent selects child and reviews teacher notes, exam scores, and student level.
- **Expected Outcome**: Complete performance feedback presented.

#### Scenario ID: SC-PAR-002 — Parent Viewing Assignment Status and Attendance Records
- **Actor**: Parent
- **Context**: Monitoring daily attendance and homework completion.
- **Scenario**:
  1. Parent inspects attendance logs and pending/completed homework items.
- **Expected Outcome**: Attendance history and homework status displayed.

---

### 3.6 Notifications

#### Scenario ID: SC-NOT-001 — Pre-Lesson Notification (1 Hour Reminder)
- **Actor**: System
- **Scenario**: Scheduled job alerts students and teachers 1 hour before physical lesson.

#### Scenario ID: SC-NOT-002 — Unsolved Homework Notification
- **Actor**: System
- **Scenario**: System alerts student and parent when homework deadline is pending.

#### Scenario ID: SC-NOT-003 — Exam Grade and New Exam Notifications
- **Actor**: System
- **Scenario**: System broadcasts alerts when exams are published or grades confirmed.

#### Scenario ID: SC-NOT-004 — Student Absence Notification
- **Actor**: System
- **Scenario**: System dispatches immediate notification to parent when child is marked absent.

---

### 3.7 Groups Management (Physical Learning)

#### Scenario ID: SC-GRP-001 — Create Physical Group and Schedule Lessons
- **Actor**: Teacher / Secretariat
- **Scenario**: Staff defines group name, stage, and recurring weekly timetable.

#### Scenario ID: SC-GRP-002 — Add Students to Physical Group
- **Actor**: Teacher / Secretariat
- **Scenario**: Staff allocates students to group roster.

---

### 3.8 Users & Permissions

#### Scenario ID: SC-USR-001 — System Role Representation & Security
- **Actor**: All Roles
- **Scenario**: System authenticates users and enforces role/ownership boundaries.

---

### 3.9 Subscriptions

#### Scenario ID: SC-SUB-001 — Payment Status for Each Student
- **Actor**: Secretariat / Teacher
- **Scenario**: Staff updates and reviews student fee payment records per billing cycle.

---

### 3.10 Online Learning (Courses)

#### Scenario ID: SC-OL-001 — Student Subscribing / Enrolling in an Online Course
- **Actor**: Student (Primary), Secretariat / Teacher (Supporting)
- **Context**: A student discovers an asynchronous course in the Course Catalog and enrolls.
- **Scenario**:
  1. Student logs into platform, browses the Course Catalog, and selects a published course.
  2. Student requests enrollment.
  3. System creates `CourseEnrollment` and activates `CourseAccess` (`status = ACTIVE`).
  4. System unlocks course modules, lessons, and video streams.
- **Expected Outcome**: Student is enrolled with active access entitlement without requiring membership in a physical group.

#### Scenario ID: SC-OL-002 — Student Accessing Course Lessons
- **Actor**: Student
- **Context**: An enrolled student accesses structured asynchronous course content.
- **Scenario**:
  1. Student navigates to "My Courses" and opens enrolled course.
  2. System validates active `CourseAccess` and renders module/lesson hierarchy.
  3. Student selects a lesson; system returns lesson description, PDF download links, and signed Bunny Stream video playback token.
  4. Video player streams lesson with adaptive bitrate.
- **Expected Outcome**: Lesson content is delivered seamlessly and asynchronously.

#### Scenario ID: SC-OL-003 — Student Continuing a Lesson After Going Offline
- **Actor**: Student
- **Context**: Network connectivity drops while a student is studying.
- **Scenario**:
  1. Student device loses internet connectivity during study.
  2. Application detects offline state and switches gracefully to cached mode.
  3. Student browses cached course outline, reads cached PDF summaries, and interacts with lesson materials.
  4. Student completes lesson; application stages progress update event in local IndexedDB/SQLite outbox queue with client operation UUID.
- **Expected Outcome**: Student experiences uninterrupted local learning with durable offline progress staging.

#### Scenario ID: SC-OL-004 — Student Progress Syncing After Reconnecting
- **Actor**: Student, System
- **Context**: Network connectivity is restored on a device with pending offline operations.
- **Scenario**:
  1. Network connectivity is re-established.
  2. Client background sync worker detects connection and reads pending outbox queue.
  3. Worker dispatches batch progress sync request to `/api/v1/sync/progress`.
  4. Server validates student JWT, verifies operation idempotency, updates `course_progress`, recalculates overall course percentage, and returns confirmation.
  5. Client clears synced items from local outbox and updates UI progress indicators.
- **Expected Outcome**: Offline progress syncs seamlessly without data loss or race conditions.

#### Scenario ID: SC-OL-005 — Student Taking an Online Assessment
- **Actor**: Student (Primary), System (Supporting)
- **Context**: A student takes a quiz or exam attached to an online course lesson.
- **Scenario**:
  1. Student opens assessment within course player.
  2. Student answers multiple-choice questions and submits payload.
  3. System validates single-attempt constraint, scores answers against keys, computes total grade, and updates `AssessmentSubmission` to `GRADED`.
  4. Student immediately views calculated score, correct answers, and feedback.
- **Expected Outcome**: Online assessment submitted and auto-graded synchronously.

#### Scenario ID: SC-OL-006 — Parent Viewing Online Course Progress
- **Actor**: Parent
- **Context**: A guardian checks digital course progress for their child.
- **Scenario**:
  1. Parent logs in, selects linked child, and opens Online Learning tab.
  2. System executes BOLA-safe query verifying `ParentStudentLink` and retrieves child's enrolled courses.
  3. Parent views course cards, completion percentage bars, completed lesson counts, and online exam scores.
- **Expected Outcome**: Parent monitors child's online coursework read-only with complete data isolation.

#### Scenario ID: SC-OL-007 — Teacher Creating and Publishing an Online Course
- **Actor**: Teacher
- **Context**: An educator authors a new digital curriculum.
- **Scenario**:
  1. Teacher navigates to Course Management and creates new course with title, description, subject, and grade level.
  2. Teacher adds structured modules (`CourseModule`) in sequential order.
  3. Teacher adds lessons (`CourseLesson`), attaching video streams (Bunny Stream) and PDF files (Cloudflare R2).
  4. Teacher configures online assignments and auto-graded exams.
  5. Teacher sets course publication status from `DRAFT` to `PUBLISHED`.
- **Expected Outcome**: Course is published and available in catalog for student enrollments.

---

## 4. Scenario Traceability

| Backlog Item / Domain | Scenario ID | Coverage Status |
| :--- | :--- | :--- |
| `حالة الطلاب` | `SC-STU-003` | Covered |
| `المجموعة و الصف` | `SC-STU-001` | Covered |
| `بيانات ولي الامر` | `SC-STU-002` | Covered |
| `بيانات الطالب` | `SC-STU-001` | Covered |
| `تقارير الحضور و الغياب` | `SC-ATT-002` | Covered |
| `تسجيل الغياب` | `SC-ATT-001` | Covered |
| `تسجيل حضور الطلاب` | `SC-ATT-001` | Covered |
| `تسجيل الحضور عبر مسح QR Code` | `SC-ATT-003` | Covered |
| `متابعة مشاهدة المحتوى` | `SC-LES-002` | Covered |
| `رفع الملفات و المراجع و الملخصات` | `SC-LES-001` | Covered |
| `رفع تسجيلات المحاضرات` | `SC-LES-001` | Covered |
| `عرض النتائج لي ولي الامر` | `SC-EXM-004` | Covered |
| `تصحيح الدرجات تلقائي` | `SC-EXM-003` | Covered |
| `تسليم الواجبات و الامتحانات` | `SC-EXM-002` | Covered |
| `رفع الواجبات` | `SC-EXM-001` | Covered |
| `انشاء الواجبات` | `SC-EXM-001` | Covered |
| `رفع الامتحانات` | `SC-EXM-001` | Covered |
| `انشاء الامتحانات` | `SC-EXM-001` | Covered |
| `تقييمات + ملاحظات المدرس` | `SC-PAR-001` | Covered |
| `حالة الواجبات` | `SC-PAR-002` | Covered |
| `درجات الامتحانات` | `SC-PAR-001` | Covered |
| `الحضور و الغياب` | `SC-PAR-002` | Covered |
| `مستوى الطالب` | `SC-PAR-001` | Covered |
| `اشعار قبل الحصة ب ساعه` | `SC-NOT-001` | Covered |
| `اشعار في حالة عدم حل الواجب` | `SC-NOT-002` | Covered |
| `اشعار درجة امتحان الطالب` | `SC-NOT-003` | Covered |
| `اشعار امتحان جديد` | `SC-NOT-003` | Covered |
| `اشعارات في حالة غياب الطالب` | `SC-NOT-004` | Covered |
| `تحديد مواعيد الدروس` | `SC-GRP-001` | Covered |
| `اضافة طلاب` | `SC-GRP-002` | Covered |
| `انشاء مجموعة` | `SC-GRP-001` | Covered |
| `السكرتارية` | `SC-USR-001` | Covered |
| `ولي الامر` | `SC-USR-001` | Covered |
| `الطالب` | `SC-USR-001` | Covered |
| `المدرس` | `SC-USR-001` | Covered |
| `حالة الدفع لكل طالب` | `SC-SUB-001` | Covered |
| `الاشتراك في دورة رقمية` | `SC-OL-001` | Covered |
| `عرض الدروس الرقمية` | `SC-OL-002` | Covered |
| `متابعة الدرس بدون اتصال` | `SC-OL-003` | Covered |
| `مزامنة التقدم بعد الاتصال` | `SC-OL-004` | Covered |
| `أداء امتحان الدورة` | `SC-OL-005` | Covered |
| `متابعة ولي الامر للتقدم` | `SC-OL-006` | Covered |
| `انشاء ونشر دورة رقمية` | `SC-OL-007` | Covered |

---

## 5. Open Product Clarifications

1. **Commercial Course Subscriptions**: Approved payment gateways, pricing rules, and refund policies for online courses remain `TBD — Requires Product Clarification`.
2. **Offline Video Caching Policy**: Product decision on whether partial video chunk caching should be supported for mobile apps remains `TBD`.
3. **Secretariat vs. Teacher Course Rights**: Clarification on whether Secretariat can author courses or strictly manage enrollments remains `TBD`.
