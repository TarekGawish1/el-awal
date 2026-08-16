# Data Layer Architecture

## 1. Document Information

- **Document Name**: Data Layer Architecture
- **Document Type**: Architecture Documentation
- **Product**: Educational Management System for Teachers and Students
- **Version**: TBD
- **Status**: Draft
- **Source of Truth**: Approved Backlog, Functional Requirements Document, Non-Functional Requirements Document, User Personas, User Scenarios, User Stories, Presentation Layer Architecture, and Business Logic Architecture

---

## 2. Purpose

This document defines the conceptual Data Layer architecture for the educational management system. It identifies the conceptual data domains, confirmed data concepts, and unresolved data architecture decisions. This document does not define concrete database schemas, tables, collections, fields, indexes, or technology selections.

---

## 3. Data Layer Responsibilities

The Data Layer sits conceptually beneath the Business Logic Layer. Its conceptual responsibilities are:
- Representing data concepts required by the confirmed product scope.
- Providing conceptual data persistence and retrieval capabilities to the Business Logic Layer.
- Maintaining data integrity requirements explicitly established by the product scope.

The Data Layer does not define technical storage mechanisms, database engines, or physical schemas.

---

## 4. Data Domains

The conceptual data requirements are organized across the nine product modules:

1. **Student Management**: Conceptual data representing students, parents, student statuses, and groups/classes.
2. **Attendance & Absence**: Conceptual data representing attendance entries, absence entries, and attendance and absence reporting data.
3. **Lectures & Lessons**: Conceptual data representing uploaded educational files, summaries, references, lecture recordings, and content viewing tracking.
4. **Exams & Assignments**: Conceptual data representing assignments, exams, submissions, automatic exam grading results, and academic results.
5. **Parent Student Status**: Conceptual data representing parent-accessible evaluations, notes, exam grades, student levels, assignment statuses, and attendance records.
6. **Notifications**: Conceptual data representing product notification requirements.
7. **Groups Management**: Conceptual data representing educational groups, lesson schedules, and student group additions.
8. **Users & Permissions**: Representation of the four confirmed user roles.
9. **Subscriptions**: Conceptual data representing student payment statuses.

---

## 5. Conceptual Data Entities

### 5.1 Student Management

#### Entity ID: DATA-STU-001
- **Entity Name**: Student Data
- **Related Backlog Item(s)**: `بيانات الطالب`
- **Related Business Logic Concept**: `BLR-STU-001`
- **Description**: Represents the conceptual data associated with a student.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

#### Entity ID: DATA-STU-002
- **Entity Name**: Parent Data
- **Related Backlog Item(s)**: `بيانات ولي الامر`
- **Related Business Logic Concept**: `BLR-STU-002`
- **Description**: Represents the conceptual data associated with a parent.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

#### Entity ID: DATA-STU-003
- **Entity Name**: Student Status Data
- **Related Backlog Item(s)**: `حالة الطلاب`
- **Related Business Logic Concept**: `BLR-STU-003`
- **Description**: Represents the conceptual status of a student.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

---

### 5.2 Attendance & Absence

#### Entity ID: DATA-ATT-001
- **Entity Name**: Attendance and Absence Records
- **Related Backlog Item(s)**: `تسجيل حضور الطلاب`, `تسجيل الغياب`
- **Related Business Logic Concept**: `BLR-ATT-001`
- **Description**: Represents recorded student attendance and absence entries.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

#### Entity ID: DATA-ATT-002
- **Entity Name**: Attendance and Absence Reports Data
- **Related Backlog Item(s)**: `تقارير الحضور و الغياب`
- **Related Business Logic Concept**: `BLR-ATT-002`
- **Description**: Represents attendance and absence reporting data.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

#### Entity ID: DATA-ATT-003
- **Entity Name**: Student QR Code Attendance Data
- **Related Backlog Item(s)**: `تسجيل الحضور عبر مسح QR Code`
- **Related Business Logic Concept**: `BLR-ATT-003`
- **Description**: Represents the opaque student QR identification credential (`qr_code_token`), scan verification payload, and session attendance check-in record.
- **Known Data**: Unique student QR credential token (`qr_code_token`), lesson session ID (`session_id`), recording method (`QR_SCAN`), recording educator ID (`recorded_by_id`), server timestamp (`recorded_at`).
- **Relationships**: `qr_code_token` is bound 1:1 to `StudentProfile` (`DATA-STU-001`), and session check-ins persist in `attendance_records` (`DATA-ATT-001`) governed by composite unique constraint `(session_id, student_id)`.
- **Data Status**: Defined

---

### 5.3 Lectures & Lessons

#### Entity ID: DATA-LES-001
- **Entity Name**: Educational Content and Lecture Recordings
- **Related Backlog Item(s)**: `رفع الملفات و المراجع و الملخصات`, `رفع تسجيلات المحاضرات`
- **Related Business Logic Concept**: `BLR-LES-001`
- **Description**: Represents educational files, references, summaries, and lecture recordings.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

#### Entity ID: DATA-LES-002
- **Entity Name**: Content Viewing Tracking Data
- **Related Backlog Item(s)**: `متابعة مشاهدة المحتوى`
- **Related Business Logic Concept**: `BLR-LES-002`
- **Description**: Represents tracking data for viewing of educational content.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

---

### 5.4 Exams & Assignments

#### Entity ID: DATA-EXM-001
- **Entity Name**: Assignments and Exams Data
- **Related Backlog Item(s)**: `انشاء الواجبات`, `رفع الواجبات`, `انشاء الامتحانات`, `رفع الامتحانات`
- **Related Business Logic Concept**: `BLR-EXM-001`
- **Description**: Represents created and uploaded homework assignments and examinations.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

#### Entity ID: DATA-EXM-002
- **Entity Name**: Student Submissions Data
- **Related Backlog Item(s)**: `تسليم الواجبات و الامتحانات`
- **Related Business Logic Concept**: `BLR-EXM-002`
- **Description**: Represents student submissions for assignments and exams.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

#### Entity ID: DATA-EXM-003
- **Entity Name**: Automatic Exam Grading & Exam Grades Data
- **Related Backlog Item(s)**: `تصحيح الدرجات تلقائي`, `درجات الامتحانات`
- **Related Business Logic Concept**: `BLR-EXM-003`, `BLR-PAR-001`
- **Description**: Represents graded results produced by automatic exam grading and recorded exam grades.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

#### Entity ID: DATA-EXM-004
- **Entity Name**: Student Academic Results Data
- **Related Backlog Item(s)**: `عرض النتائج لي ولي الامر`
- **Related Business Logic Concept**: `BLR-EXM-004`
- **Description**: Represents student academic results presented to parents.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

---

### 5.5 Parent Student Status

#### Entity ID: DATA-PAR-001
- **Entity Name**: Teacher Evaluations, Notes, and Student Level Data
- **Related Backlog Item(s)**: `تقييمات + ملاحظات المدرس`, `مستوى الطالب`
- **Related Business Logic Concept**: `BLR-PAR-001`
- **Description**: Represents teacher evaluation feedback, notes, and student level information.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

#### Entity ID: DATA-PAR-002
- **Entity Name**: Parent-Visible Status Data
- **Related Backlog Item(s)**: `حالة الواجبات`, `الحضور و الغياب`
- **Related Business Logic Concept**: `BLR-PAR-002`
- **Description**: Represents assignment completion status and attendance/absence data visible to parents.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

---

### 5.6 Notifications

#### Entity ID: DATA-NOT-001
- **Entity Name**: Notification Requirement Data
- **Related Backlog Item(s)**: `اشعار قبل الحصة ب ساعه`, `اشعار في حالة عدم حل الواجب`, `اشعار امتحان جديد`, `اشعار درجة امتحان الطالب`, `اشعارات في حالة غياب الطالب`
- **Related Business Logic Concept**: `BLR-NOT-001`, `BLR-NOT-002`, `BLR-NOT-003`, `BLR-NOT-004`
- **Description**: Represents the conceptual notification requirement.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

---

### 5.7 Groups Management

#### Entity ID: DATA-GRP-001
- **Entity Name**: Group and Grade/Class Data
- **Related Backlog Item(s)**: `انشاء مجموعة`, `المجموعة و الصف`
- **Related Business Logic Concept**: `BLR-GRP-001`, `BLR-STU-001`
- **Description**: Represents group and grade/class entities.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

#### Entity ID: DATA-GRP-002
- **Entity Name**: Lesson Schedule Data
- **Related Backlog Item(s)**: `تحديد مواعيد الدروس`
- **Related Business Logic Concept**: `BLR-GRP-001`
- **Description**: Represents scheduled lesson times.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

#### Entity ID: DATA-GRP-003
- **Entity Name**: Student Group Addition Data
- **Related Backlog Item(s)**: `اضافة طلاب`
- **Related Business Logic Concept**: `BLR-GRP-002`
- **Description**: Represents the addition of students to groups.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

---

### 5.8 Users & Permissions

Four user roles are defined by the product scope:
- Teacher (`المدرس`)
- Student (`الطالب`)
- Parent (`ولي الامر`)
- Secretariat (`السكرتارية`)

*Note*: Concrete identity schemas, credential storage, role modeling, and permission structures remain `TBD — Requires Architecture Decision`. Role responsibilities remain `TBD — Requires Product Clarification`.

---

### 5.9 Subscriptions

#### Entity ID: DATA-SUB-001
- **Entity Name**: Student Payment Status Data
- **Related Backlog Item(s)**: `حالة الدفع لكل طالب`
- **Related Business Logic Concept**: `BLR-SUB-001`
- **Description**: Represents student payment status.
- **Known Data**: `TBD — Requires Product Clarification`
- **Relationships**: `TBD — Requires Product Clarification`
- **Data Status**: Partially Defined

---

## 6. Student Management Data

The system represents the following conceptual data concepts:
- Student Data (`بيانات الطالب`)
- Parent Data (`بيانات ولي الامر`)
- Student Status (`حالة الطلاب`)
- Group and Grade/Class (`المجموعة و الصف`)

*Note*: Specific attributes, field definitions, unique identifiers, and relationships remain `TBD — Requires Product Clarification`.

---

## 7. Attendance & Absence Data

The system represents the following conceptual data concepts:
- Attendance and Absence Records (`تسجيل حضور الطلاب`, `تسجيل الغياب`)
- Attendance and Absence Reports Data (`تقارير الحضور و الغياب`)

*Note*: Data structures, timestamps, status values, and report formats remain `TBD — Requires Product Clarification`.

---

## 8. Lectures & Lessons Data

The system represents the following conceptual data concepts:
- Educational Content and Lecture Recordings (`رفع الملفات و المراجع و الملخصات`, `رفع تسجيلات المحاضرات`)
- Content Viewing Tracking Data (`متابعة مشاهدة المحتوى`)

*Note*: File formats, storage metadata, access rules, and viewing metrics remain `TBD — Requires Product Clarification`.

---

## 9. Exams & Assignments Data

The system represents the following conceptual data concepts:
- Created and uploaded assignments and exams (`انشاء الواجبات`, `رفع الواجبات`, `انشاء الامتحانات`, `رفع الامتحانات`)
- Student submissions (`تسليم الواجبات و الامتحانات`)
- Automatic exam grading results and exam grades (`تصحيح الدرجات تلقائي`, `درجات الامتحانات`): Submitted exams are automatically graded.
- Student academic results (`عرض النتائج لي ولي الامر`)

*Note*: Assessment data structures, question formats, scoring scales, and submission payload formats remain `TBD — Requires Product Clarification`.

---

## 10. Parent Student Status Data

The system represents the following conceptual data concepts:
- Teacher evaluations, notes, and student level (`تقييمات + ملاحظات المدرس`, `مستوى الطالب`)
- Parent-visible assignment status and attendance/absence (`حالة الواجبات`, `الحضور و الغياب`)

*Note*: Evaluation structures, scoring rubrics, and level metrics remain `TBD — Requires Product Clarification`.

---

## 11. Notification Data

The system represents the following conceptual notification requirements:
- Lesson reminder notification requirement (`اشعار قبل الحصة ب ساعه`)
- Unsolved homework notification requirement (`اشعار في حالة عدم حل الواجب`)
- New exam notification requirement (`اشعار امتحان جديد`)
- Exam grade notification requirement (`اشعار درجة امتحان الطالب`)
- Student absence notification requirement (`اشعارات في حالة غياب الطالب`)

*Note*: Notification data structures, message formats, recipient references, and delivery states remain `TBD — Requires Product Clarification`.

---

## 12. Groups Management Data

The system represents the following conceptual data concepts:
- Group and grade/class definitions (`انشاء مجموعة`, `المجموعة و الصف`)
- Scheduled lesson times (`تحديد مواعيد الدروس`)
- Adding students to groups (`اضافة طلاب`)

*Note*: Group structures, schedule formats, and capacity constraints remain `TBD — Requires Product Clarification`.

---

## 13. Users & Permissions Data

The system scope defines four confirmed user roles:
1. Teacher (`المدرس`)
2. Student (`الطالب`)
3. Parent (`ولي الامر`)
4. Secretariat (`السكرتارية`)

*Note*: User identity schemas, authentication mechanisms, and authorization structures remain `TBD — Requires Architecture Decision`. Role responsibilities remain `TBD — Requires Product Clarification`.

---

## 14. Subscription / Payment Data

The system represents the following conceptual data concept:
- Student payment status (`حالة الدفع لكل طالب`)
- Tracks physical tuition fee payment records per billing period without payment gateway processing.

---

## 15. Online Learning Data Entities

### Entity ID: DATA-OL-001 — Course & Module Structure Data
- **Related Backlog Item(s)**: `ادارة الدورات التدريبية عبر الإنترنت`, `هيكلة الوحدات والدروس الرقمية`
- **Related Business Logic**: `BLR-OL-001`, `BLR-OL-002`
- **Description**: Conceptual data representing independent online courses, structured modules, and sequenced lessons.

### Entity ID: DATA-OL-002 — Course Enrollment & Entitlement Data
- **Related Backlog Item(s)**: `الالتحاق بالدورة وصلاحية الوصول`
- **Related Business Logic**: `BLR-OL-003`
- **Description**: Conceptual data representing student digital enrollments and active course access validity periods (`CourseAccess`).

### Entity ID: DATA-OL-003 — Course Lesson Progress Data
- **Related Backlog Item(s)**: `متابعة التقدم في الدورات الرقمية`
- **Related Business Logic**: `BLR-OL-005`, `BLR-OL-006`
- **Description**: Conceptual data capturing last playback timestamps, completion flags, and dynamic course percentage metrics.

### Entity ID: DATA-OL-004 — Video Stream & Document References Data
- **Related Backlog Item(s)**: `تقديم محتوى الدروس الرقمية`
- **Related Business Logic**: `BLR-OL-004`
- **Description**: Conceptual data references for Bunny Stream video IDs and Cloudflare R2 file storage keys.

### Entity ID: DATA-OL-005 — Online Assessment & Graded Submissions Data
- **Related Backlog Item(s)**: `أداء امتحان الدورة الرقمية`
- **Related Business Logic**: `BLR-OL-007`
- **Description**: Conceptual data representing quizzes, assignments, and auto-graded exam submissions attached to online course lessons.

### Entity ID: DATA-OL-006 — Offline Progress Outbox Operations Data
- **Related Backlog Item(s)**: `المزامنة والعمل بدون اتصال للدورات الرقمية`
- **Related Business Logic**: `BLR-OL-008`
- **Description**: Conceptual data representing offline staged progress events queued with unique operation UUIDs for background synchronization.

---

## 16. Conceptual Relationships

| Potential Relationship | Status |
| :--- | :--- |
| Student Data ↔ Parent Data | Confirmed N:M Linkage |
| Student Data ↔ Physical Group Enrollment | Confirmed 1:N Membership |
| Student Data ↔ Attendance Records | Confirmed 1:N Log (Physical Only) |
| Student Data ↔ Online Course Enrollment | Confirmed 1:N Enrollment (Independent of Physical Groups) |
| Course Enrollment ↔ Course Access Entitlement | Confirmed 1:1 Entitlement |
| Course Lesson ↔ Course Progress Log | Confirmed 1:N Progress Log |
| Student Data ↔ Assignment and Exam Submissions | Confirmed 1:N Submissions |
| Student Data ↔ Student Payment Status | Confirmed 1:N Physical Tuition Records |

---

## 17. Data Integrity

Explicit data integrity constraints enforce:
1. **Single Student Identity**: One learner identity across physical groups and online courses.
2. **Domain Separation**: Online course enrollments do NOT grant physical QR attendance rights.
3. **Monotonic Progress**: Progress updates merge maximum playback positions and logical OR of completed states.
4. **Server Authority**: The backend PostgreSQL database is the sole authority for course entitlement and grades.

---

## 18. Data Access Boundary

```text
+-------------------------------------------------------+
|                  Presentation Layer                   |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|             Business Logic / Application Layer        |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|                      Data Layer                       |
|   (PostgreSQL Server Database ↕ Local Client Cache)   |
+-------------------------------------------------------+
```

- The Presentation Layer interacts exclusively via the Application Layer API.
- Local client storage (IndexedDB/SQLite) serves as a read-only metadata cache and durable write-outbox, never an authorization authority.

---

## 19. Data Layer Traceability

| Backlog Item / Domain | Business Logic Concept | Data Entity | Status |
| :--- | :--- | :--- | :--- |
| `حالة الطلاب` | `BLR-STU-003` | `DATA-STU-003` — Student Status Data | Defined |
| `المجموعة و الصف` | `BLR-STU-001` | `DATA-GRP-001` — Group and Grade/Class Data | Defined |
| `بيانات ولي الامر` | `BLR-STU-002` | `DATA-STU-002` — Parent Data | Defined |
| `بيانات الطالب` | `BLR-STU-001` | `DATA-STU-001` — Student Data | Defined |
| `تقارير الحضور و الغياب` | `BLR-ATT-002` | `DATA-ATT-002` — Attendance and Absence Reports Data | Defined |
| `تسجيل الغياب` | `BLR-ATT-001` | `DATA-ATT-001` — Attendance and Absence Records | Defined |
| `تسجيل حضور الطلاب` | `BLR-ATT-001` | `DATA-ATT-001` — Attendance and Absence Records | Defined |
| `تسجيل الحضور عبر مسح QR Code` | `BLR-ATT-003` | `DATA-ATT-003` — Student QR Code Attendance Data | Defined |
| `متابعة مشاهدة المحتوى` | `BLR-LES-002` | `DATA-LES-002` — Content Viewing Tracking Data | Defined |
| `رفع الملفات و المراجع و الملخصات` | `BLR-LES-001` | `DATA-LES-001` — Educational Content and Lecture Recordings | Defined |
| `رفع تسجيلات المحاضرات` | `BLR-LES-001` | `DATA-LES-001` — Educational Content and Lecture Recordings | Defined |
| `عرض النتائج لي ولي الامر` | `BLR-EXM-004` | `DATA-EXM-004` — Student Academic Results Data | Defined |
| `تصحيح الدرجات تلقائي` | `BLR-EXM-003` | `DATA-EXM-003` — Automatic Exam Grading & Exam Grades Data | Defined |
| `تسليم الواجبات و الامتحانات` | `BLR-EXM-002` | `DATA-EXM-002` — Student Submissions Data | Defined |
| `رفع الواجبات` | `BLR-EXM-001` | `DATA-EXM-001` — Assignments and Exams Data | Defined |
| `انشاء الواجبات` | `BLR-EXM-001` | `DATA-EXM-001` — Assignments and Exams Data | Defined |
| `رفع الامتحانات` | `BLR-EXM-001` | `DATA-EXM-001` — Assignments and Exams Data | Defined |
| `انشاء الامتحانات` | `BLR-EXM-001` | `DATA-EXM-001` — Assignments and Exams Data | Defined |
| `تقييمات + ملاحظات المدرس` | `BLR-PAR-001` | `DATA-PAR-001` — Teacher Evaluations, Notes, and Student Level Data | Defined |
| `حالة الواجبات` | `BLR-PAR-002` | `DATA-PAR-002` — Parent-Visible Status Data | Defined |
| `درجات الامتحانات` | `BLR-PAR-001` | `DATA-EXM-003` — Automatic Exam Grading & Exam Grades Data | Defined |
| `الحضور و الغياب` | `BLR-PAR-002` | `DATA-ATT-001` — Attendance and Absence Records | Defined |
| `مستوى الطالب` | `BLR-PAR-001` | `DATA-PAR-001` — Teacher Evaluations, Notes, and Student Level Data | Defined |
| `اشعار قبل الحصة ب ساعه` | `BLR-NOT-001` | `DATA-NOT-001` — Notification Requirement Data | Defined |
| `اشعار في حالة عدم حل الواجب` | `BLR-NOT-002` | `DATA-NOT-001` — Notification Requirement Data | Defined |
| `اشعار درجة امتحان الطالب` | `BLR-NOT-003` | `DATA-NOT-001` — Notification Requirement Data | Defined |
| `اشعار امتحان جديد` | `BLR-NOT-003` | `DATA-NOT-001` — Notification Requirement Data | Defined |
| `اشعارات في حالة غياب الطالب` | `BLR-NOT-004` | `DATA-NOT-001` — Notification Requirement Data | Defined |
| `تحديد مواعيد الدروس` | `BLR-GRP-001` | `DATA-GRP-002` — Lesson Schedule Data | Defined |
| `اضافة طلاب` | `BLR-GRP-002` | `DATA-GRP-003` — Student Group Addition Data | Defined |
| `انشاء مجموعة` | `BLR-GRP-001` | `DATA-GRP-001` — Group and Grade/Class Data | Defined |
| `السكرتارية` | `BLR-USR-001` | N/A — User Role Definition | Defined |
| `ولي الامر` | `BLR-USR-001` | N/A — User Role Definition | Defined |
| `الطالب` | `BLR-USR-001` | N/A — User Role Definition | Defined |
| `المدرس` | `BLR-USR-001` | N/A — User Role Definition | Defined |
| `حالة الدفع لكل طالب` | `BLR-SUB-001` | `DATA-SUB-001` — Student Payment Status Data | Defined |
| `ادارة ونشر الدورات الرقمية`| `BLR-OL-001` | `DATA-OL-001` — Course & Module Structure Data | Defined |
| `هيكلة الوحدات والدروس` | `BLR-OL-002` | `DATA-OL-001` — Course & Module Structure Data | Defined |
| `الالتحاق بالدورة وصلاحية الوصول`| `BLR-OL-003` | `DATA-OL-002` — Course Enrollment & Entitlement Data | Defined |
| `مشاهدة الدروس والوسائط` | `BLR-OL-004` | `DATA-OL-004` — Video Stream & Document References Data | Defined |
| `متابعة واستئناف التقدم` | `BLR-OL-005` | `DATA-OL-003` — Course Lesson Progress Data | Defined |
| `حساب نسبة اتمام الدورة` | `BLR-OL-006` | `DATA-OL-003` — Course Lesson Progress Data | Defined |
| `امتحان الدورة والتصحيح التلقائي`| `BLR-OL-007` | `DATA-OL-005` — Online Course Assessment Data | Defined |
| `المزامنة والعمل بدون اتصال` | `BLR-OL-008` | `DATA-OL-006` — Offline Progress Outbox Operations Data | Defined |

