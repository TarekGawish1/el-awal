# Functional Requirements Document

## 1. Document Information
- **Document Name**: Functional Requirements Document
- **Document Type**: Product Documentation
- **Product**: Educational Management System for Teachers and Students (El Awal)
- **Version**: 2.0
- **Status**: Updated Draft — Online Learning Domain Integrated
- **Source of Truth**: Approved Backlog, Architecture Baseline, and Educational Delivery Models

---

## 2. Purpose
This document defines the functional requirements derived directly from the approved product backlog and architectural specifications across two distinct educational delivery models: **Physical Learning** and **Online Learning**.

---

## 3. Scope
This document covers the functional behavior across ten confirmed product modules:
1. Student Management
2. Attendance & Absence (Physical Classroom)
3. Lectures & Lessons
4. Exams & Assignments
5. Parent Student Status
6. Notifications
7. Groups Management (Physical Classroom)
8. Users & Permissions
9. Subscriptions (Student Payment Status)
10. Online Learning / Courses (Asynchronous Distance Learning)

---

## 4. Functional Requirements

### 1. Student Management System

#### Requirement ID: FR-STU-001
- **Backlog Reference**: حالة الطلاب
- **Requirement Name**: Student Status
- **Description**: The system must provide functionality related to student academic status.
- **Actor**: Teacher / Secretariat / Admin
- **Functional Behavior**: The system supports viewing and updating student status (e.g., `ACTIVE`, `INACTIVE`, `SUSPENDED`, `GRADUATED`).
- **Acceptance Criteria**: The system accurately reflects the student's status across administrative rosters, group enrollments, and course enrollments.
- **Business Rules**: Inactive students cannot be marked present in new physical sessions or access new online course lessons.
- **Dependencies**: `FR-STU-004`, `FR-USR-003`

#### Requirement ID: FR-STU-002
- **Backlog Reference**: المجموعة و الصف
- **Requirement Name**: Group and Grade/Class
- **Description**: The system must provide functionality related to the physical group and grade/class stage.
- **Actor**: Teacher / Secretariat
- **Functional Behavior**: The system supports assigning students to academic grade levels and associating them with specific physical academic cohorts.
- **Acceptance Criteria**: The system represents the grade level on the student profile and allows physical group membership assignment.
- **Business Rules**: A student can belong to multiple physical groups across different subjects or terms.
- **Dependencies**: `FR-STU-004`, `FR-GRP-002`

#### Requirement ID: FR-STU-003
- **Backlog Reference**: بيانات ولي الامر
- **Requirement Name**: Parent Data
- **Description**: The system must provide functionality related to parent/guardian contact and linkage.
- **Actor**: Secretariat / Teacher / Parent
- **Functional Behavior**: The system supports recording parent contact details (name, primary phone, relationship) and linking parent profiles to one or more student profiles.
- **Acceptance Criteria**: The system maintains an N:M relationship between parents and students without data duplication.
- **Business Rules**: Verified parent-student links govern access boundaries in the Parent Portal (`FR-PAR-001..005`, `FR-OL-007`).
- **Dependencies**: `FR-USR-002`, `FR-USR-003`

#### Requirement ID: FR-STU-004
- **Backlog Reference**: بيانات الطالب
- **Requirement Name**: Student Data
- **Description**: The system must provide functionality related to core student identity and profile data.
- **Actor**: Teacher / Secretariat / Student
- **Functional Behavior**: The system manages student demographic information, unique student code (`student_code`), emergency contact, and unique QR attendance credential.
- **Acceptance Criteria**: Core student profile is uniquely created, searchable, and shared across physical and online learning contexts.
- **Business Rules**: There is strictly **ONE Student identity** (`Student`) representing a learner across all physical groups and online courses.
- **Dependencies**: `FR-USR-003`

---

### 2. Attendance & Absence System (Physical Learning)

#### Requirement ID: FR-ATT-001
- **Backlog Reference**: تقارير الحضور و الغياب
- **Requirement Name**: Attendance and Absence Reports
- **Description**: The system must provide aggregated and detailed reports regarding physical session attendance and absence.
- **Actor**: Teacher / Secretariat / Parent
- **Functional Behavior**: The system calculates dynamic session-level and student-level attendance summaries (total sessions, attended count, absent count, excused count, attendance percentage).
- **Acceptance Criteria**: The system generates filtered reports by physical group, date range, and student.
- **Business Rules**: Aggregations are calculated dynamically from `AttendanceRecord` entries tied to physical `LessonSession` instances.
- **Dependencies**: `FR-ATT-002`, `FR-ATT-003`

#### Requirement ID: FR-ATT-002
- **Backlog Reference**: تسجيل الغياب
- **Requirement Name**: Record Absence
- **Description**: The system must allow recording of absence for a student in a physical lesson session.
- **Actor**: Teacher / Secretariat
- **Functional Behavior**: The system records a student's state as `ABSENT` or `EXCUSED` for a specific physical lesson session, including optional justification notes.
- **Acceptance Criteria**: Absence is recorded with the recording staff ID and timestamp, triggering student absence notification (`FR-NOT-005`).
- **Business Rules**: Absences apply strictly to physical `LessonSession` instances.
- **Dependencies**: `FR-ATT-003`, `FR-GRP-001`

#### Requirement ID: FR-ATT-003
- **Backlog Reference**: تسجيل حضور الطلاب
- **Requirement Name**: Record Student Attendance
- **Description**: The system must allow recording of student presence in a physical lesson session.
- **Actor**: Teacher / Secretariat
- **Functional Behavior**: The system records student presence via direct roster entry or camera-based QR code scanning.
- **Acceptance Criteria**: Attendance is logged with status `PRESENT`, recording method (`MANUAL` or `QR_SCAN`), recorder ID, and timestamp.
- **Business Rules**: Enforces composite uniqueness on `(session_id, student_id)` to prevent duplicate roll-call records.
- **Dependencies**: `FR-GRP-001`, `FR-GRP-002`

#### Requirement ID: FR-ATT-004
- **Backlog Reference**: تسجيل الحضور عبر مسح QR Code
- **Requirement Name**: Student QR Code Attendance Scanning & Provisioning
- **Description**: Every student must have a unique, opaque QR code attendance credential that can be scanned by an authorized teacher to record the student's attendance for a specific physical lesson session.
- **Actor**: Teacher (`المدرس`) / Student (`الطالب`)
- **Functional Behavior**: The system automatically provisions a unique, cryptographically random, non-sequential QR token for each student upon profile creation. During an active physical lesson session, an authenticated teacher scans the student's QR credential. The system executes a multi-tier verification pipeline (teacher session authorization -> session state validity -> token resolution -> student active status check -> group enrollment verification) and idempotently records attendance as `PRESENT` with recording method `QR_SCAN`.
- **Acceptance Criteria**:
  1. The system automatically generates a unique QR credential token for every student upon profile creation.
  2. Students can view and present their unique QR code from their digital student card.
  3. Authorized teachers can scan student QR codes via the camera interface.
  4. Teacher session authorization, student active status, and active physical `GroupEnrollment` are validated.
  5. Unrecorded students are logged as `PRESENT` with recording method `QR_SCAN` in <500ms.
  6. Repeat scans of an already-marked student return an affirmative idempotent response without modifying existing records.
  7. Students from different groups or students enrolled ONLY in online courses receive an informative mismatch warning without logging attendance.
  8. Local outbox supports offline scan queuing with automatic server-authoritative sync upon reconnection.
- **Business Rules**:
  1. The QR code functions strictly as a physical **Attendance Identification Credential**.
  2. Online course enrollment (`CourseEnrollment`) shall NEVER satisfy physical attendance eligibility.
- **Dependencies**: `FR-STU-004`, `FR-GRP-001`, `FR-GRP-002`, `FR-ATT-003`, `FR-USR-004`

---

### 3. Lectures & Lessons System

#### Requirement ID: FR-LES-001
- **Backlog Reference**: متابعة مشاهدة المحتوى
- **Requirement Name**: Track Content Viewing
- **Description**: The system must track student access and viewing engagement for uploaded educational materials.
- **Actor**: Teacher / Student
- **Functional Behavior**: The system records initial view timestamp, most recent view timestamp, view count, and completion state per content item per student.
- **Acceptance Criteria**: Viewing progress is retrievable by instructors and visible on student dashboards.
- **Business Rules**: Content progress records maintain composite uniqueness on `(content_id, student_id)`.
- **Dependencies**: `FR-LES-002`, `FR-LES-003`

#### Requirement ID: FR-LES-002
- **Backlog Reference**: رفع الملفات و المراجع و الملخصات
- **Requirement Name**: Upload Educational Files, References, and Summaries
- **Description**: The system must support uploading, storing, and organizing educational documents, summaries, and references.
- **Actor**: Teacher
- **Functional Behavior**: Teachers upload files via secure direct presigned URLs to Cloudflare R2 object storage, attaching structured metadata to physical groups or online course lessons.
- **Acceptance Criteria**: Files are accessible for secure streaming/download by authorized enrolled students.
- **Business Rules**: Files inherit access boundaries from their parent `AcademicGroup` or `CourseLesson`.
- **Dependencies**: `FR-GRP-003`, `FR-USR-004`, `FR-OL-002`

#### Requirement ID: FR-LES-003
- **Backlog Reference**: رفع تسجيلات المحاضرات
- **Requirement Name**: Upload Lecture Recordings
- **Description**: The system must support uploading and streaming video lecture recordings.
- **Actor**: Teacher
- **Functional Behavior**: Teachers upload video recordings transcoded and delivered via Bunny Stream, generating signed playback tokens for authorized students.
- **Acceptance Criteria**: Video streams smoothly across network conditions using adaptive bitrate (HLS/DASH).
- **Business Rules**: Direct video binary files are never stored in the database; playback requires active student enrollment.
- **Dependencies**: `FR-LES-001`, `FR-USR-004`

---

### 4. Exams & Assignments System

#### Requirement ID: FR-EXM-001
- **Backlog Reference**: عرض النتائج لي ولي الامر
- **Requirement Name**: Display Assessment Results to Parents
- **Description**: The system must display graded assignment and exam results to linked parents.
- **Actor**: Parent
- **Functional Behavior**: Parents view exam scores, passing thresholds, completion dates, and teacher feedback for their linked children across physical groups and online courses.
- **Acceptance Criteria**: Parent views are strictly read-only and restricted to linked children via BOLA-safe queries.
- **Business Rules**: Results become visible immediately upon grade confirmation or auto-grading completion.
- **Dependencies**: `FR-STU-003`, `FR-EXM-002`, `FR-EXM-003`

#### Requirement ID: FR-EXM-002
- **Backlog Reference**: تصحيح الدرجات تلقائي
- **Requirement Name**: Automatic Exam Grading Engine
- **Description**: The system must automatically grade submitted examinations containing structured question items.
- **Actor**: System / Student
- **Functional Behavior**: Upon exam submission, the system evaluates student answers against question answer keys, computes points earned per question, aggregates the total score, and updates submission status to `GRADED`.
- **Acceptance Criteria**: Automated grading executes synchronously upon submission delivery, recording `score_obtained` and `graded_at`.
- **Business Rules**: Automatic grading applies strictly to examinations (`type = EXAM`); assignments require instructor review.
- **Dependencies**: `FR-EXM-003`, `FR-EXM-007`

#### Requirement ID: FR-EXM-003
- **Backlog Reference**: تسليم الواجبات و الامتحانات
- **Requirement Name**: Student Assessment Submissions
- **Description**: The system must allow students to deliver submissions for active assignments and examinations.
- **Actor**: Student
- **Functional Behavior**: Students submit file attachments for homework assignments or structured answer payloads for exams.
- **Acceptance Criteria**: Submissions are timestamped and marked `SUBMITTED`, linking student answers to question entities.
- **Business Rules**: Enforces composite uniqueness on `(assessment_id, student_id)` to prevent conflicting duplicate attempts.
- **Dependencies**: `FR-EXM-004`, `FR-EXM-006`, `FR-USR-003`

#### Requirement ID: FR-EXM-004
- **Backlog Reference**: رفع الواجبات
- **Requirement Name**: Upload Assignments
- **Description**: The system must allow teachers to upload assignment attachments and prompts.
- **Actor**: Teacher
- **Functional Behavior**: Teachers attach document prompts, instructions, and due dates to homework assignments.
- **Acceptance Criteria**: Uploaded assignment assets are distributed to enrolled students in the specified group or course.
- **Business Rules**: Assignments are created with `type = ASSIGNMENT` and `is_auto_graded = false`.
- **Dependencies**: `FR-EXM-005`

#### Requirement ID: FR-EXM-005
- **Backlog Reference**: انشاء الواجبات
- **Requirement Name**: Create Assignments
- **Description**: The system must allow teachers to author homework assignments.
- **Actor**: Teacher
- **Functional Behavior**: Teachers define title, description, total score, passing score, due date, and cohort/course context.
- **Acceptance Criteria**: Created assignments appear in student assignment lists.
- **Business Rules**: Assignments can be attached to a physical `AcademicGroup` OR an online `CourseLesson`.
- **Dependencies**: `FR-GRP-003`, `FR-OL-002`

#### Requirement ID: FR-EXM-006
- **Backlog Reference**: رفع الامتحانات
- **Requirement Name**: Upload Exams
- **Description**: The system must allow teachers to upload examination documents or supplementary exam assets.
- **Actor**: Teacher
- **Functional Behavior**: Teachers upload exam reference materials and configure examination parameters.
- **Acceptance Criteria**: Exam assets are accessible to students during active examination windows.
- **Business Rules**: Exams are created with `type = EXAM` and default `is_auto_graded = true` when structured questions exist.
- **Dependencies**: `FR-EXM-007`

#### Requirement ID: FR-EXM-007
- **Backlog Reference**: انشاء الامتحانات
- **Requirement Name**: Create Exams & Structured Questions
- **Description**: The system must allow teachers to author examinations with structured questions for auto-grading.
- **Actor**: Teacher
- **Functional Behavior**: Teachers author question items (multiple choice, true/false), assign point values, configure structured options (JSONB), and set correct answer keys.
- **Acceptance Criteria**: Questions are sequentially ordered and locked against modification once student submissions exist.
- **Business Rules**: Unique composite constraint on `(assessment_id, question_number)`.
- **Dependencies**: `FR-EXM-002`, `FR-GRP-003`, `FR-OL-002`

---

### 5. Parent Student Status System

#### Requirement ID: FR-PAR-001
- **Backlog Reference**: تقييمات + ملاحظات المدرس
- **Requirement Name**: Teacher Evaluations and Notes
- **Description**: The system must provide parents with access to teacher qualitative evaluations and instructional notes.
- **Actor**: Parent / Teacher
- **Functional Behavior**: Teachers record qualitative notes and evaluations for students; parents view chronological feedback feeds.
- **Acceptance Criteria**: Evaluations are linked to the student profile and visible to verified parents.
- **Dependencies**: `FR-STU-003`, `FR-USR-004`

#### Requirement ID: FR-PAR-002
- **Backlog Reference**: حالة الواجبات
- **Requirement Name**: Homework Assignment Status Visibility
- **Description**: The system must display assignment completion statuses (`SUBMITTED`, `GRADED`, `UNSOLVED`) to parents.
- **Actor**: Parent
- **Functional Behavior**: Parents view pending, completed, and overdue homework items for their linked children.
- **Acceptance Criteria**: Parent dashboard shows assignment status list with deadlines.
- **Dependencies**: `FR-EXM-003`, `FR-EXM-004`

#### Requirement ID: FR-PAR-003
- **Backlog Reference**: درجات الامتحانات
- **Requirement Name**: Exam Grades Visibility
- **Description**: The system must display student examination scores to parents.
- **Actor**: Parent
- **Functional Behavior**: Parents view awarded exam scores, total marks, and passing status across physical and online exams.
- **Acceptance Criteria**: Graded exam results are displayed with score breakdown.
- **Dependencies**: `FR-EXM-001`, `FR-EXM-002`

#### Requirement ID: FR-PAR-004
- **Backlog Reference**: الحضور و الغياب
- **Requirement Name**: Parent Attendance and Absence History
- **Description**: The system must display physical session attendance and absence records to parents.
- **Actor**: Parent
- **Functional Behavior**: Parents view chronological attendance history, presence logs (including QR scan timestamps), and absence alerts.
- **Acceptance Criteria**: Attendance timeline is accessible from the parent portal.
- **Dependencies**: `FR-ATT-001`, `FR-ATT-002`, `FR-ATT-003`

#### Requirement ID: FR-PAR-005
- **Backlog Reference**: مستوى الطالب
- **Requirement Name**: Student Level Representation
- **Description**: The system must represent the student's academic standing level (`مستوى الطالب`) to parents.
- **Actor**: Parent / Teacher
- **Functional Behavior**: The system displays the student level rating recorded by instructors or derived from academic progress.
- **Acceptance Criteria**: Student level indicator is displayed in parent summary views.
- **Business Rules**: Specific calculation rubrics remain `TBD — Requires Product Clarification`.
- **Dependencies**: `FR-PAR-001`

---

### 6. Notifications System

#### Requirement ID: FR-NOT-001
- **Backlog Reference**: اشعار قبل الحصة ب ساعه
- **Requirement Name**: Pre-Lesson Notification (1 Hour Reminder)
- **Description**: The system must generate a notification 1 hour prior to a scheduled physical lesson session.
- **Actor**: System
- **Functional Behavior**: A scheduled background job detects upcoming physical sessions from `LessonSchedule` and dispatches alerts to enrolled students and teachers.
- **Acceptance Criteria**: Alerts are created with type `LESSON_REMINDER_1HR`.
- **Dependencies**: `FR-GRP-001`, `FR-GRP-002`

#### Requirement ID: FR-NOT-002
- **Backlog Reference**: اشعار في حالة عدم حل الواجب
- **Requirement Name**: Unsolved Homework Notification
- **Description**: The system must generate an alert when a student has not submitted an assignment approaching or past its deadline.
- **Actor**: System
- **Functional Behavior**: Detects unsubmitted assignments and dispatches `UNSOLVED_HOMEWORK` notifications to students and parents.
- **Acceptance Criteria**: Notification links directly to the pending assignment.
- **Dependencies**: `FR-EXM-003`, `FR-EXM-004`

#### Requirement ID: FR-NOT-003
- **Backlog Reference**: اشعار درجة امتحان الطالب
- **Requirement Name**: Exam Grade Release Notification
- **Description**: The system must notify students and parents when an exam score is recorded or auto-graded.
- **Actor**: System
- **Functional Behavior**: Dispatches `EXAM_GRADE` notification upon grade finalization with score summary.
- **Acceptance Criteria**: Alerts are delivered to student and parent accounts immediately after grading.
- **Dependencies**: `FR-EXM-002`, `FR-EXM-003`

#### Requirement ID: FR-NOT-004
- **Backlog Reference**: اشعار امتحان جديد
- **Requirement Name**: New Exam Announcement Notification
- **Description**: The system must notify enrolled students when a new examination is published.
- **Actor**: System
- **Functional Behavior**: Dispatches `NEW_EXAM` notification upon exam publication in a physical group or online course.
- **Acceptance Criteria**: Enrolled students receive alert linking to exam schedule/details.
- **Dependencies**: `FR-EXM-006`, `FR-EXM-007`

#### Requirement ID: FR-NOT-005
- **Backlog Reference**: اشعارات في حالة غياب الطالب
- **Requirement Name**: Student Absence Notification
- **Description**: The system must immediately notify parents when a student is recorded absent in a physical session.
- **Actor**: System
- **Functional Behavior**: Dispatches `STUDENT_ABSENCE` notification to linked parents upon absence logging.
- **Acceptance Criteria**: Parents receive immediate absence notice with session date and group name.
- **Dependencies**: `FR-ATT-002`, `FR-STU-003`

---

### 7. Groups Management System (Physical Learning)

#### Requirement ID: FR-GRP-001
- **Backlog Reference**: تحديد مواعيد الدروس
- **Requirement Name**: Schedule Lesson Times
- **Description**: The system must allow configuring recurring weekly lesson schedules for physical academic groups.
- **Actor**: Teacher / Secretariat
- **Functional Behavior**: Supports defining day of week, start time, end time, and classroom location.
- **Acceptance Criteria**: Recurring schedules are persisted and used to project upcoming calendar sessions.
- **Dependencies**: `FR-GRP-003`

#### Requirement ID: FR-GRP-002
- **Backlog Reference**: اضافة طلاب
- **Requirement Name**: Add Students to Physical Group
- **Description**: The system must allow adding students to physical educational groups.
- **Actor**: Teacher / Secretariat
- **Functional Behavior**: Creates active `GroupEnrollment` records linking students to physical groups.
- **Acceptance Criteria**: Added students appear on group rosters and become eligible for physical session roll-call.
- **Business Rules**: Unique composite constraint on `(group_id, student_id)`.
- **Dependencies**: `FR-GRP-003`, `FR-STU-004`

#### Requirement ID: FR-GRP-003
- **Backlog Reference**: انشاء مجموعة
- **Requirement Name**: Create Physical Group
- **Description**: The system must allow teachers or administrators to create physical educational groups.
- **Actor**: Teacher / Secretariat
- **Functional Behavior**: Creates `AcademicGroup` records with name, grade level, and managing teacher.
- **Acceptance Criteria**: Groups are available for student enrollment, scheduling, and content distribution.
- **Dependencies**: `FR-USR-004`

---

### 8. Users & Permissions System

#### Requirement ID: FR-USR-001
- **Backlog Reference**: السكرتارية
- **Requirement Name**: Secretariat Role Representation
- **Description**: The system must represent and authenticate Secretariat administrative users.
- **Actor**: Secretariat
- **Functional Behavior**: Grants operational access for student administration, group enrollment, course enrollment, and payment status tracking.
- **Acceptance Criteria**: Secretariat accounts authenticate with role `SECRETARIAT`.
- **Dependencies**: `FR-USR-004`

#### Requirement ID: FR-USR-002
- **Backlog Reference**: ولي الامر
- **Requirement Name**: Parent Role Representation
- **Description**: The system must represent and authenticate Parent users.
- **Actor**: Parent
- **Functional Behavior**: Grants read-only access to linked students' physical attendance, evaluations, grades, and online course progress.
- **Acceptance Criteria**: Parent accounts authenticate with role `PARENT` and access only verified children.
- **Dependencies**: `FR-STU-003`

#### Requirement ID: FR-USR-003
- **Backlog Reference**: الطالب
- **Requirement Name**: Student Role Representation
- **Description**: The system must represent and authenticate Student users.
- **Actor**: Student
- **Functional Behavior**: Grants access to digital student cards (QR code), physical group materials, online courses, lesson videos, progress tracking, and assessment submissions.
- **Acceptance Criteria**: Student accounts authenticate with role `STUDENT`.
- **Dependencies**: `FR-STU-004`

#### Requirement ID: FR-USR-004
- **Backlog Reference**: المدرس
- **Requirement Name**: Teacher Role Representation
- **Description**: The system must represent and authenticate Teacher users.
- **Actor**: Teacher
- **Functional Behavior**: Grants full instructional authority over managed physical groups, attendance scanning, evaluations, and online course authoring/publishing.
- **Acceptance Criteria**: Teacher accounts authenticate with role `TEACHER`.
- **Dependencies**: `PRD-009`

---

### 9. Subscriptions System

#### Requirement ID: FR-SUB-001
- **Backlog Reference**: حالة الدفع لكل طالب
- **Requirement Name**: Student Payment Status Tracking
- **Description**: The system must support tracking and viewing the fee payment status for each student per billing period.
- **Actor**: Secretariat / Teacher
- **Functional Behavior**: Authorized staff view and update payment status descriptors and notes for students.
- **Acceptance Criteria**: Payment status records are maintained per student per billing cycle without executing automated merchant transactions.
- **Business Rules**: Unique composite constraint on `(student_id, billing_period)`.
- **Dependencies**: `FR-STU-004`, `FR-USR-001`

---

### 10. Online Learning System (Courses)

#### Requirement ID: FR-OL-001
- **Backlog Reference**: ادارة الدورات التدريبية عبر الإنترنت
- **Requirement Name**: Online Course Authoring & Lifecycle Management
- **Description**: The system must allow teachers to author, manage, structure, and publish independent asynchronous educational courses.
- **Actor**: Teacher / Secretariat
- **Functional Behavior**: Teachers create courses with title, description, subject category, target grade level, publication status (`DRAFT`, `PUBLISHED`, `ARCHIVED`), and display ordering.
- **Acceptance Criteria**:
  1. Teachers can create and update course metadata.
  2. Courses in `DRAFT` status are visible only to authoring teachers and administrators.
  3. Courses in `PUBLISHED` status appear in the public/student Course Catalog.
  4. Students cannot modify course metadata (`403 Forbidden`).
- **Business Rules**: A `Course` is an independent educational entity and is NOT modeled as an `AcademicGroup`.
- **Dependencies**: `FR-USR-004`, `PRD-OL-001`

#### Requirement ID: FR-OL-002
- **Backlog Reference**: هيكلة الوحدات والدروس الرقمية
- **Requirement Name**: Course Module and Lesson Hierarchy Structure
- **Description**: The system must support organizing online courses into an ordered hierarchy of modules/sections and lessons.
- **Actor**: Teacher
- **Functional Behavior**: Teachers create ordered modules within a course (`CourseModule`) and ordered lessons within modules (`CourseLesson`).
- **Acceptance Criteria**:
  1. Modules maintain sequential ordering indices (`order_index`) within the course.
  2. Lessons maintain sequential ordering indices within their parent module.
  3. Deleting a module cleanly cascades to its child lessons only if no student completion records exist.
- **Business Rules**: A `CourseLesson` is educational content consumed asynchronously, whereas a `LessonSession` is a scheduled physical calendar event.
- **Dependencies**: `FR-OL-001`

#### Requirement ID: FR-OL-003
- **Backlog Reference**: الالتحاق بالدورة وصلاحية الوصول
- **Requirement Name**: Course Enrollment & Access Entitlement Verification
- **Description**: The system must manage student course enrollments and enforce server-authoritative access entitlement validation.
- **Actor**: Student / Teacher / Secretariat
- **Functional Behavior**: Students enroll in courses (`CourseEnrollment`), and the system maintains access entitlement status (`CourseAccess` / `CourseSubscription` with states `ACTIVE`, `EXPIRED`, `SUSPENDED`).
- **Acceptance Criteria**:
  1. Enrolled students with active access entitlement can retrieve course lessons, video streams, and assessment assets.
  2. Unenrolled students or students with expired access are denied access with `403 Forbidden`.
  3. Course enrollment is decoupled from physical `GroupEnrollment`.
  4. Course enrollment does NOT grant physical classroom attendance privileges.
- **Business Rules**: `CourseEnrollment` answers "Is this student enrolled?" while `CourseAccess` answers "Is the student currently entitled to consume content?".
- **Dependencies**: `FR-OL-001`, `FR-STU-004`

#### Requirement ID: FR-OL-004
- **Backlog Reference**: تقديم محتوى الدروس الرقمية
- **Requirement Name**: Asynchronous Course Lesson Content Delivery
- **Description**: The system must deliver asynchronous lesson materials, including adaptive video streaming via Bunny Stream and downloadable documents/summaries via Cloudflare R2.
- **Actor**: Student / Teacher
- **Functional Behavior**: Enrolled students stream videos via signed Bunny Stream embed tokens and download PDF summaries via Cloudflare R2 CDN links.
- **Acceptance Criteria**:
  1. Video playback tokens are issued only to authenticated, enrolled students.
  2. Document assets download with correct MIME types and content lengths.
  3. Content delivery operates independently of physical group lesson schedules.
- **Business Rules**: Binary video files are never stored in local SQLite databases.
- **Dependencies**: `FR-OL-002`, `FR-OL-003`, `FR-LES-002`, `FR-LES-003`

#### Requirement ID: FR-OL-005
- **Backlog Reference**: متابعة التقدم في الدورات الرقمية
- **Requirement Name**: Independent Course Progress Tracking & Aggregation
- **Description**: The system must track individual student progress across course lessons and compute overall course completion percentage.
- **Actor**: Student / Teacher / Parent
- **Functional Behavior**: Tracks lesson start state, last playback position in seconds, completion boolean (`is_completed`), and completion timestamp. Computes dynamic course completion percentage based on completed lessons count.
- **Acceptance Criteria**:
  1. Students can resume video playback from their last saved position.
  2. Progress is updated via idempotent progress heartbeat requests.
  3. Course completion percentage is calculated dynamically (`(completed_lessons / total_lessons) * 100`).
  4. Progress records maintain composite uniqueness on `(lesson_id, student_id)`.
- **Business Rules**: Progress events are monotonic; updating progress with an earlier playback position does not overwrite higher completed milestones.
- **Dependencies**: `FR-OL-002`, `FR-OL-003`, `FR-STU-004`

#### Requirement ID: FR-OL-006
- **Backlog Reference**: الواجبات والامتحانات للدورات الرقمية
- **Requirement Name**: Online Course Assessments & Automated Evaluation
- **Description**: The system must allow attaching assignments and examinations directly to online courses or course lessons, receiving student submissions, and executing automated grading for online exams.
- **Actor**: Teacher / Student
- **Functional Behavior**: Teachers author assessments linked to courses/lessons; students submit homework attachments or structured exam answers; system auto-grades exams synchronously.
- **Acceptance Criteria**:
  1. Assessments can be created with course context without requiring a physical `AcademicGroup`.
  2. Auto-grading evaluates exam question answers synchronously upon submission.
  3. Awarded grades appear on student and parent dashboards.
- **Business Rules**: Preserves existing auto-grading logic and single-attempt uniqueness on `(assessment_id, student_id)`.
- **Dependencies**: `FR-OL-002`, `FR-EXM-002`, `FR-EXM-003`, `FR-EXM-007`

#### Requirement ID: FR-OL-007
- **Backlog Reference**: متابعة ولي الامر للتعلم عبر الإنترنت
- **Requirement Name**: Parental Visibility into Online Course Progress
- **Description**: The system must provide verified parents with read-only visibility into their linked children's enrolled online courses, lesson completion rates, and online assessment scores.
- **Actor**: Parent
- **Functional Behavior**: Parents view an Online Learning tab displaying course cards, progress bars, completed lesson checklists, and exam scores.
- **Acceptance Criteria**:
  1. Parent access is strictly read-only and filtered to verified linked children.
  2. Cross-student access attempts are blocked with `403 Forbidden` (BOLA protection).
- **Business Rules**: Parents can distinguish between physical classroom attendance and online course progress.
- **Dependencies**: `FR-STU-003`, `FR-OL-003`, `FR-OL-005`, `FR-OL-006`

#### Requirement ID: FR-OL-008
- **Backlog Reference**: المزامنة والعمل بدون اتصال للدورات الرقمية
- **Requirement Name**: Offline Course Metadata Caching & Progress Outbox Synchronization
- **Description**: The client application shall cache course metadata, module hierarchy, and lesson outlines locally, queue student progress events in a durable local outbox during network dropouts, and synchronize them automatically upon reconnection.
- **Actor**: Student / System
- **Functional Behavior**: The client stores course metadata in IndexedDB/SQLite. When offline, lesson viewing progress events are staged in an outbox queue with client-generated operation UUIDs. Upon reconnection, the background sync worker flushes pending operations to the server sync intake endpoint.
- **Acceptance Criteria**:
  1. Course outline is browsable offline using cached metadata.
  2. Progress events staged offline are dispatched automatically upon network restoration.
  3. Server processes outbox batches idempotently without duplicate records or race conditions.
  4. Server remains authoritative for entitlement and access validation.
- **Business Rules**: Offline local storage is a cache, NEVER an authorization authority. Video streaming requires active connectivity.
- **Dependencies**: `FR-OL-004`, `FR-OL-005`

---

## 5. Functional Requirements Traceability Matrix

| Backlog Item / Domain | Functional Requirement ID | Status |
|---|---|---|
| `حالة الطلاب` | `FR-STU-001` | Defined |
| `المجموعة و الصف` | `FR-STU-002` | Defined |
| `بيانات ولي الامر` | `FR-STU-003` | Defined |
| `بيانات الطالب` | `FR-STU-004` | Defined |
| `تقارير الحضور و الغياب` | `FR-ATT-001` | Defined |
| `تسجيل الغياب` | `FR-ATT-002` | Defined |
| `تسجيل حضور الطلاب` | `FR-ATT-003` | Defined |
| `تسجيل الحضور عبر مسح QR Code` | `FR-ATT-004` | Defined |
| `متابعة مشاهدة المحتوى` | `FR-LES-001` | Defined |
| `رفع الملفات و المراجع و الملخصات` | `FR-LES-002` | Defined |
| `رفع تسجيلات المحاضرات` | `FR-LES-003` | Defined |
| `عرض النتائج لي ولي الامر` | `FR-EXM-001` | Defined |
| `تصحيح الدرجات تلقائي` | `FR-EXM-002` | Defined |
| `تسليم الواجبات و الامتحانات` | `FR-EXM-003` | Defined |
| `رفع الواجبات` | `FR-EXM-004` | Defined |
| `انشاء الواجبات` | `FR-EXM-005` | Defined |
| `رفع الامتحانات` | `FR-EXM-006` | Defined |
| `انشاء الامتحانات` | `FR-EXM-007` | Defined |
| `تقييمات + ملاحظات المدرس` | `FR-PAR-001` | Defined |
| `حالة الواجبات` | `FR-PAR-002` | Defined |
| `درجات الامتحانات` | `FR-PAR-003` | Defined |
| `الحضور و الغياب` | `FR-PAR-004` | Defined |
| `مستوى الطالب` | `FR-PAR-005` | Partially Defined (Rubric TBD) |
| `اشعار قبل الحصة ب ساعه` | `FR-NOT-001` | Defined |
| `اشعار في حالة عدم حل الواجب` | `FR-NOT-002` | Defined |
| `اشعار درجة امتحان الطالب` | `FR-NOT-003` | Defined |
| `اشعار امتحان جديد` | `FR-NOT-004` | Defined |
| `اشعارات في حالة غياب الطالب` | `FR-NOT-005` | Defined |
| `تحديد مواعيد الدروس` | `FR-GRP-001` | Defined |
| `اضافة طلاب` | `FR-GRP-002` | Defined |
| `انشاء مجموعة` | `FR-GRP-003` | Defined |
| `السكرتارية` | `FR-USR-001` | Defined |
| `ولي الامر` | `FR-USR-002` | Defined |
| `الطالب` | `FR-USR-003` | Defined |
| `المدرس` | `FR-USR-004` | Defined |
| `حالة الدفع لكل طالب` | `FR-SUB-001` | Partially Defined (Values TBD) |
| `ادارة الدورات التدريبية عبر الإنترنت` | `FR-OL-001` | Defined |
| `هيكلة الوحدات والدروس الرقمية` | `FR-OL-002` | Defined |
| `الالتحاق بالدورة وصلاحية الوصول` | `FR-OL-003` | Defined |
| `تقديم محتوى الدروس الرقمية` | `FR-OL-004` | Defined |
| `متابعة التقدم في الدورات الرقمية` | `FR-OL-005` | Defined |
| `الواجبات والامتحانات للدورات الرقمية` | `FR-OL-006` | Defined |
| `متابعة ولي الامر للتعلم عبر الإنترنت` | `FR-OL-007` | Defined |
| `المزامنة والعمل بدون اتصال للدورات الرقمية` | `FR-OL-008` | Defined |

---

## 6. Open Product Clarifications

- **Clarification ID**: CLR-001
  - **Related Requirement**: `FR-STU-001`
  - **Question**: What are the specific statuses a student can have?
  - **Reason**: Baseline assumes ACTIVE, INACTIVE, SUSPENDED, GRADUATED.

- **Clarification ID**: CLR-008
  - **Related Requirement**: `FR-LES-002`, `FR-LES-003`, `FR-EXM-004`, `FR-EXM-006`, `FR-OL-004`
  - **Question**: What are the maximum file size limits for uploaded documents and videos?
  - **Reason**: Recommended 50MB for PDFs, Bunny Stream handles large video uploads.

- **Clarification ID**: CLR-012
  - **Related Requirement**: `FR-PAR-005`
  - **Question**: How is the student level calculated or defined?
  - **Reason**: The rubric for "student level" remains open.

- **Clarification ID**: CLR-013
  - **Related Requirement**: `FR-NOT-001..005`
  - **Question**: Through which channels (in-app, SMS, WhatsApp, email) are notifications delivered?
  - **Reason**: In-app is implemented; external dispatch transport remains TBD.

- **Clarification ID**: CLR-017
  - **Related Requirement**: `FR-SUB-001`, `FR-OL-003`
  - **Question**: What are the permissible payment statuses, commercial pricing tiers, and online subscription checkout mechanisms?
  - **Reason**: Commercial payment gateway integration remains TBD.
