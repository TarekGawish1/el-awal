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

*Note*: Payment status values, payment structures, and fee data remain `TBD — Requires Product Clarification`.

---

## 15. Conceptual Relationships

The following potential relationships exist at a conceptual domain level, but no specific cardinality, foreign keys, or database constraints are confirmed:

| Potential Relationship | Status |
| :--- | :--- |
| Student Data ↔ Parent Data | `TBD — Requires Product Clarification` |
| Student Data ↔ Group and Grade/Class | `TBD — Requires Product Clarification` |
| Student Data ↔ Attendance and Absence Records | `TBD — Requires Product Clarification` |
| Student Data ↔ Assignment and Exam Submissions | `TBD — Requires Product Clarification` |
| Student Submissions ↔ Exam Grades | `TBD — Requires Product Clarification` |
| Student Data ↔ Student Payment Status | `TBD — Requires Product Clarification` |
| Group Data ↔ Lesson Schedule Data | `TBD — Requires Product Clarification` |
| Group Data ↔ Student Group Addition Data | `TBD — Requires Product Clarification` |

*Note*: Cardinality, ownership, referential constraints, cascade behaviors, and foreign key structures remain `TBD — Requires Product Clarification` and `TBD — Requires Architecture Decision`.

---

## 16. Data Integrity

Explicit data integrity constraints (such as unique constraints, non-null requirements, foreign keys, and cascading rules) are not defined in the source requirements.

Data integrity rules remain: `TBD — Requires Product Clarification`.

---

## 17. Data Access Boundary

The system maintains a clean layered architectural boundary:

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
+-------------------------------------------------------+
```

- The Presentation Layer does not directly access the Data Layer.
- The Business Logic Layer is the conceptual consumer of the Data Layer.
- Specific data access patterns and abstractions remain `TBD — Requires Architecture Decision`.

---

## 18. Data Lifecycle

Lifecycle definitions (such as creation, modification, archival, retention, and deletion rules) for domain entities are not specified in the source documentation.

Data lifecycle rules remain: `TBD — Requires Product Clarification`.

---

## 19. Backup & Recovery

Backup schedules, recovery time objectives (RTO), recovery point objectives (RPO), and retention policies are not specified in the current documentation.

Backup and recovery architecture remains: `TBD — Requires Architecture Decision`.

---

## 20. Data Security & Privacy

Data protection requirements, encryption at rest/in transit, access auditing, and privacy compliance mechanisms are not specified in the source documentation.

Data security architecture remains: `TBD — Requires Architecture Decision`.

---

## 21. Storage Architecture Decision

Selection of database technologies, persistence paradigms, file storage systems, and hosting infrastructure is uncommitted.

Storage architecture decision remains: `TBD — Requires Architecture Decision`.

---

## 22. Open Architecture Decisions

The following technical data architecture decisions must be resolved:

1. **Database Technology Selection**: `TBD — Requires Architecture Decision`
2. **Data Modeling Approach**: `TBD — Requires Architecture Decision`
3. **Data Access Abstraction**: `TBD — Requires Architecture Decision`
4. **File & Binary Content Storage**: `TBD — Requires Architecture Decision`
5. **Notification Data Persistence**: `TBD — Requires Architecture Decision`
6. **Data Validation Architecture**: `TBD — Requires Architecture Decision`
7. **Backup & Disaster Recovery Strategy**: `TBD — Requires Architecture Decision`
8. **Data Security & Encryption**: `TBD — Requires Architecture Decision`
9. **Data Retention & Archival Strategy**: `TBD — Requires Architecture Decision`
10. **Transaction & Consistency Management**: `TBD — Requires Architecture Decision`

---

## 23. Data Layer Traceability

| Backlog Item | Business Logic Concept | Data Entity | Status |
| :--- | :--- | :--- | :--- |
| حالة الطلاب | `BLR-STU-003` | `DATA-STU-003` — Student Status Data | Partially Defined |
| المجموعة و الصف | `BLR-STU-001` | `DATA-GRP-001` — Group and Grade/Class Data | Partially Defined |
| بيانات ولي الامر | `BLR-STU-002` | `DATA-STU-002` — Parent Data | Partially Defined |
| بيانات الطالب | `BLR-STU-001` | `DATA-STU-001` — Student Data | Partially Defined |
| تقارير الحضور و الغياب | `BLR-ATT-002` | `DATA-ATT-002` — Attendance and Absence Reports Data | Partially Defined |
| تسجيل الغياب | `BLR-ATT-001` | `DATA-ATT-001` — Attendance and Absence Records | Partially Defined |
| تسجيل حضور الطلاب | `BLR-ATT-001` | `DATA-ATT-001` — Attendance and Absence Records | Partially Defined |
| متابعة مشاهدة المحتوى | `BLR-LES-002` | `DATA-LES-002` — Content Viewing Tracking Data | Partially Defined |
| رفع الملفات و المراجع و الملخصات | `BLR-LES-001` | `DATA-LES-001` — Educational Content and Lecture Recordings | Partially Defined |
| رفع تسجيلات المحاضرات | `BLR-LES-001` | `DATA-LES-001` — Educational Content and Lecture Recordings | Partially Defined |
| عرض النتائج لي ولي الامر | `BLR-EXM-004` | `DATA-EXM-004` — Student Academic Results Data | Partially Defined |
| تصحيح الدرجات تلقائي | `BLR-EXM-003` | `DATA-EXM-003` — Automatic Exam Grading & Exam Grades Data | Partially Defined |
| تسليم الواجبات و الامتحانات | `BLR-EXM-002` | `DATA-EXM-002` — Student Submissions Data | Partially Defined |
| رفع الواجبات | `BLR-EXM-001` | `DATA-EXM-001` — Assignments and Exams Data | Partially Defined |
| انشاء الواجبات | `BLR-EXM-001` | `DATA-EXM-001` — Assignments and Exams Data | Partially Defined |
| رفع الامتحانات | `BLR-EXM-001` | `DATA-EXM-001` — Assignments and Exams Data | Partially Defined |
| انشاء الامتحانات | `BLR-EXM-001` | `DATA-EXM-001` — Assignments and Exams Data | Partially Defined |
| تقييمات + ملاحظات المدرس | `BLR-PAR-001` | `DATA-PAR-001` — Teacher Evaluations, Notes, and Student Level Data | Partially Defined |
| حالة الواجبات | `BLR-PAR-002` | `DATA-PAR-002` — Parent-Visible Status Data | Partially Defined |
| درجات الامتحانات | `BLR-PAR-001` | `DATA-EXM-003` — Automatic Exam Grading & Exam Grades Data | Partially Defined |
| الحضور و الغياب | `BLR-PAR-002` | `DATA-ATT-001` — Attendance and Absence Records | Partially Defined |
| مستوى الطالب | `BLR-PAR-001` | `DATA-PAR-001` — Teacher Evaluations, Notes, and Student Level Data | Partially Defined |
| اشعار قبل الحصة ب ساعه | `BLR-NOT-001` | `DATA-NOT-001` — Notification Requirement Data | Partially Defined |
| اشعار في حالة عدم حل الواجب | `BLR-NOT-002` | `DATA-NOT-001` — Notification Requirement Data | Partially Defined |
| اشعار درجة امتحان الطالب | `BLR-NOT-003` | `DATA-NOT-001` — Notification Requirement Data | Partially Defined |
| اشعار امتحان جديد | `BLR-NOT-003` | `DATA-NOT-001` — Notification Requirement Data | Partially Defined |
| اشعارات في حالة غياب الطالب | `BLR-NOT-004` | `DATA-NOT-001` — Notification Requirement Data | Partially Defined |
| تحديد مواعيد الدروس | `BLR-GRP-001` | `DATA-GRP-002` — Lesson Schedule Data | Partially Defined |
| اضافة طلاب | `BLR-GRP-002` | `DATA-GRP-003` — Student Group Addition Data | Partially Defined |
| انشاء مجموعة | `BLR-GRP-001` | `DATA-GRP-001` — Group and Grade/Class Data | Partially Defined |
| السكرتارية | `BLR-USR-001` | N/A — User Role Definition | Partially Defined |
| ولي الامر | `BLR-USR-001` | N/A — User Role Definition | Partially Defined |
| الطالب | `BLR-USR-001` | N/A — User Role Definition | Partially Defined |
| المدرس | `BLR-USR-001` | N/A — User Role Definition | Partially Defined |
| حالة الدفع لكل طالب | `BLR-SUB-001` | `DATA-SUB-001` — Student Payment Status Data | Partially Defined |
