# User Personas

## 1. Document Information

- **Document Name**: User Personas
- **Document Type**: UX Documentation
- **Product**: Educational Management System for Teachers and Students (El Awal)
- **Version**: 2.0
- **Status**: Updated Draft — Online Learning Domain Integrated
- **Source of Truth**: Approved Backlog, Functional Requirements Document, and Educational Delivery Models

---

## 2. Persona Overview

This document defines the user personas for the educational management system across two distinct delivery models (**Physical Learning** and **Online Learning**) based on the four confirmed stakeholder roles:

1. **المدرس — Teacher** (`UX-PER-001`)
2. **الطالب — Student** (`UX-PER-002`)
3. **ولي الأمر — Parent** (`UX-PER-003`)
4. **السكرتارية — Secretariat** (`UX-PER-004`)

### Core Domain Principle: Single Student Identity
The system maintains strictly **ONE Student identity** (`Student`). A student is not bifurcated into separate user types. A single student account may hold physical group enrollments (`GroupEnrollment`) and/or online course enrollments (`CourseEnrollment`).

---

## 3. Persona 01 — Teacher

### Basic Information
- **Persona ID**: UX-PER-001
- **Role**: Teacher / المدرس
- **Persona Type**: Primary Educator & Course Creator
- **Demographics**: `TBD — Requires Product Clarification`

### Role in the System
The Teacher represents the educator role within the system, operating across physical classroom cohorts and asynchronous online courses:
- **Physical Learning**:
  - Creating physical educational groups (`انشاء مجموعة`)
  - Adding students to physical groups (`اضافة طلاب`)
  - Scheduling weekly lesson times (`تحديد مواعيد الدروس`)
  - Scanning student QR codes for attendance (`تسجيل الحضور عبر مسح QR Code`)
  - Recording manual attendance and absences (`تسجيل حضور الطلاب`, `تسجيل الغياب`)
  - Generating attendance reports (`تقارير الحضور و الغياب`)
  - Providing evaluations and notes (`تقييمات + ملاحظات المدرس`)
- **Online Learning (Courses)**:
  - Authoring and publishing online courses (`ادارة الدورات التدريبية عبر الإنترنت`)
  - Structuring course modules and lessons (`هيكلة الوحدات والدروس الرقمية`)
  - Uploading lecture recordings and video lessons (`رفع تسجيلات المحاضرات`)
  - Uploading PDF summaries, references, and files (`رفع الملفات و المراجع و الملخصات`)
  - Authoring assignments and auto-graded exams (`انشاء الواجبات`, `انشاء الامتحانات`)
  - Monitoring student course progress and completion rates (`متابعة التقدم في الدورات الرقمية`)

### Goals
- Maximize instructional time in classroom sessions via fast QR roll-call.
- Author and publish structured, engaging online courses with seamless video streaming.
- Easily manage assessments and view auto-graded exam results.
- Track student academic progress and attendance across physical and online learning.

### Needs
- Fast camera-based QR code scanning with instant audio/visual confirmation.
- Intuitive drag-and-drop course builder for organizing modules, lessons, and assets.
- Direct video uploading (Bunny Stream) and PDF document distribution (Cloudflare R2).
- Clear grading dashboards for manual assignment review and automated exam score inspection.

---

## 4. Persona 02 — Student

### Basic Information
- **Persona ID**: UX-PER-002
- **Role**: Student / الطالب
- **Persona Type**: Primary Learner (Physical and/or Online)
- **Demographics**: `TBD — Requires Product Clarification`

### Role in the System
The Student represents the learner role in the system. The same student identity interacts across physical and online workflows:
- **Physical Learning**:
  - Presenting unique QR code badge for physical attendance check-in (`عرض رمز QR الخاص بالطالب`)
  - Viewing physical group timetable and session schedules
  - Accessing classroom summaries and take-home assignments
- **Online Learning**:
  - Browsing the Course Catalog and enrolling in online courses (`الالتحاق بالدورة`)
  - Streaming lesson videos on-demand with playback resumption
  - Downloading lesson PDF summaries and reference sheets
  - Taking online assignments and auto-graded examinations (`تسليم الواجبات و الامتحانات`)
  - Tracking course completion progress and viewing exam grades
  - Caching course metadata for offline browsing and syncing progress upon reconnecting

### Goals
- Check into physical classes quickly with digital QR badge.
- Learn at own pace by streaming online course lessons anytime, anywhere.
- Submit homework assignments and receive immediate scores on auto-graded exams.
- Seamlessly transition between online and offline learning environments without losing progress.

### Needs
- Accessible digital student card with high-contrast QR code display.
- Modern, distraction-free video lesson player with speed control and progress indicators.
- Clear assessment submission deadlines and instant feedback on exam results.
- Resilient offline caching of course outlines and automatic background progress sync.

---

## 5. Persona 03 — Parent

### Basic Information
- **Persona ID**: UX-PER-003
- **Role**: Parent / Guardian / ولي الأمر
- **Persona Type**: Academic Monitor
- **Demographics**: `TBD — Requires Product Clarification`

### Role in the System
The Parent represents the guardian monitoring linked students across physical and online domains:
- **Physical Learning Monitoring**:
  - Viewing physical group attendance, presence logs (including QR scan timestamps), and absence records (`الحضور و الغياب`)
  - Receiving real-time absence alerts (`اشعارات في حالة غياب الطالب`)
  - Reviewing teacher evaluations, qualitative notes, and student level (`تقييمات + ملاحظات المدرس`, `مستوى الطالب`)
- **Online Learning Monitoring**:
  - Viewing enrolled online courses for each linked child (`متابعة التعلم عبر الإنترنت`)
  - Tracking course progress bars, completed lesson checklists, and viewing history
  - Reviewing online assessment scores, passing statuses, and homework completion states

### Goals
- Maintain transparent, real-time oversight of child's physical attendance and safety.
- Stay informed about child's online course completion and digital engagement.
- Review exam grades, teacher feedback, and pending homework deadlines.

### Needs
- Dedicated bilingual parent dashboard with multi-child switcher.
- Clear tabbed separation between Physical Classroom Standing and Online Course Progress.
- Instant push/in-app notifications for absences, unsolved homework, and released exam grades.

---

## 6. Persona 04 — Secretariat

### Basic Information
- **Persona ID**: UX-PER-004
- **Role**: Secretariat / Administrative Staff / السكرتارية
- **Persona Type**: Operational Administrator
- **Demographics**: `TBD — Requires Product Clarification`

### Role in the System
The Secretariat represents administrative staff managing operational workflows:
- Registering student profiles and parent contact data (`بيانات الطالب`, `بيانات ولي الامر`)
- Managing physical group rosters and adding students to cohorts (`اضافة طلاب`)
- Managing student online course enrollments and access permissions (`الالتحاق بالدورة`)
- Tracking individual student payment status per billing cycle (`حالة الدفع لكل طالب`)
- Supporting teachers with attendance reporting and student record updates

### Goals
- Maintain accurate student demographic records and parent contact linkages.
- Efficiently allocate students to physical groups and online courses.
- Keep transparent records of student payment standings without complex billing friction.

### Needs
- Bulk student enrollment and roster management tools.
- Clear payment status tracking table with quick status filters and administrative note fields.
- Fast student profile search and QR badge reissuance tools.

---

## 7. Open Persona Clarifications

| Clarification ID | Persona | Question | Status |
|---|---|---|---|
| CLR-PER-001 | Teacher vs. Secretariat | What are the exact division boundaries for course creation and student enrollment? | `TBD — Requires Product Clarification` |
| CLR-PER-002 | Student | What are the approved file formats and maximum upload sizes for student homework submissions? | `TBD — Requires Product Clarification` |
| CLR-PER-003 | Parent | Will parents receive credentials directly or link to students via invitation codes? | `TBD — Requires Product Clarification` |
| CLR-PER-004 | Secretariat | What specific fee collection reports or export capabilities does Secretariat require? | `TBD — Requires Product Clarification` |
