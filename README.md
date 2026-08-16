# El Awal Educational Management System (منصة الأول التعليمية)

> **Enterprise-Grade Technical Architecture & Specification Baseline for Physical Classroom & Asynchronous Online Learning**

---

## 1. Executive Summary

**El Awal (منصة الأول التعليمية)** is a dual-model educational management platform engineered to support both **Physical Classroom Education** and **Asynchronous Distance Online Learning** without architectural compromise or entity collision.

The platform serves four confirmed educational stakeholder roles:
1. **Teacher / المدرس**: Primary educator managing physical cohorts, authoring online video courses, scanning QR attendance, and evaluating student performance.
2. **Student / الطالب**: Primary learner attending physical sessions with a digital QR badge and/or streaming online course lessons with offline playback progress synchronization.
3. **Parent / Guardian / ولي الأمر**: Academic guardian monitoring physical attendance, teacher qualitative evaluations, exam grades, and online course completion percentages.
4. **Secretariat / السكرتارية**: Operational administrative staff managing student enrollments, cohort rosters, and billing period tuition payment records.

---

## 2. Core Architectural Pillars

### 2.1 Single Student Identity Principle
The system maintains strictly **ONE Student Identity** (`StudentProfile`). A learner is not bifurcated into separate physical vs. online accounts:
```text
Student (Single Identity)
├── Physical Learning Relationships (GroupEnrollment ──► AcademicGroup ──► LessonSession ──► AttendanceRecord)
└── Online Learning Relationships (CourseEnrollment ──► CourseAccess ──► CourseProgress ──► OnlineAssessment)
```

### 2.2 Strict Domain Boundary Separation
- **Physical Learning Domain**: Centered on `AcademicGroup`, `GroupEnrollment`, `LessonSchedule`, `LessonSession`, and `AttendanceRecord`.
- **Online Learning Domain**: Centered on `Course`, `CourseModule`, `CourseLesson`, `CourseEnrollment`, `CourseAccess`, and `CourseProgress`.
- An online `Course` is an independent pedagogical product entity, **never** modeled as another type of `AcademicGroup` or governed by a simple `isOnline` boolean.

### 2.3 QR Attendance Security & Concurrency Invariant
Physical attendance check-in is operated via a **7-tier verification pipeline** (`POST /api/v1/attendance/sessions/:sessionId/scan-qr`):
- Opaque, high-entropy cryptographic QR credential (`qr_code_token`).
- Teacher session ownership verification.
- Session calendar window validity check.
- Physical group membership check (`GroupEnrollment`). Online-only course enrollments are explicitly rejected (`NOT_ENROLLED_IN_GROUP`).
- Idempotent repeat-scan protection backed by PostgreSQL composite unique constraint `uq_session_student`.

### 2.4 Offline-First & Decoupled Media Streaming
- **Local Database (IndexedDB / SQLite)**: Houses strictly structured course metadata and a durable outbox mutation queue.
- **Conflict Resolution**: Monotonic merging (`GREATEST(position)` and logical `OR(completed)`).
- **Server Authority**: The cloud database (Neon PostgreSQL) is the sole authority for entitlement, access control, and grade computation.
- **Decoupled Binary Storage**: Large media assets are stored externally — documents and PDFs on **Cloudflare R2** and adaptive HLS video streams on **Bunny Stream**. Relational tables store zero large binary blobs.

---

## 3. Approved Technology Stack

| Layer | Technology | Architectural Rationale |
|---|---|---|
| **Backend Framework** | **NestJS (Node.js LTS, TypeScript)** | Enterprise Modular Monolith with native DI, strict typing, and declarative interceptors/pipes/guards. |
| **Database & ORM** | **PostgreSQL (v16+) on Neon + Prisma ORM** | ACID transactions, PgBouncer serverless pooling, UUIDv4 keys, JSONB fields, and branch isolation. |
| **Compute & Hosting** | **Hetzner Cloud VPS (Docker + Nginx)** | Dedicated European VPS compute, Nginx reverse proxy, low latency, and predictable performance. |
| **Frontend Framework** | **Next.js (App Router, React 19, TypeScript)** | Hybrid Server/Client Components, bilingual RTL/LTR switching, responsive layouts, and SSR. |
| **Styling & Design** | **Vanilla CSS + CSS Modules + Design Tokens** | Custom high-performance design system with glassmorphic cards, sleek dark/light themes, and micro-animations. |
| **Object Storage** | **Cloudflare R2 + CDN** | Zero-egress fee S3 object store for PDF summaries, references, homework files, and evaluation attachments. |
| **Video Infrastructure** | **Bunny Stream** | Multi-bitrate HLS/DASH video transcoding, signed time-limited embed tokens, and global CDN delivery. |

---

## 4. Product Modules & Domain Mapping

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 EL AWAL PLATFORM                                 │
├────────────────────────────────────────┬─────────────────────────────────────────┤
│        PHYSICAL LEARNING DOMAIN        │          ONLINE LEARNING DOMAIN         │
├────────────────────────────────────────┼─────────────────────────────────────────┤
│ 1. Student Management (Profiles/Links) │ 10. Online Learning / Courses            │
│ 2. Attendance & Absence (QR Scan/Roll) │   - Course Catalog & Discovery          │
│ 7. Groups Management (Cohorts/Schedules│   - Module & Lesson Outline Hierarchy   │
│ 9. Subscriptions (Tuition Fee Tracking)│   - Course Access Entitlements          │
├────────────────────────────────────────┴─────────────────────────────────────────┤
│                             SHARED CROSS-DOMAIN CAPABILITIES                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 3. Lectures & Educational Content (Polymorphic R2 / Bunny Stream Attachments)   │
│ 4. Exams & Assignments (Question Banking, Submissions, Auto-Grading Engine)     │
│ 5. Parent Student Status (Consolidated Physical & Online Monitoring Portal)      │
│ 6. Notifications (In-App Alerts, Lesson Reminders, Grade Notices, Absences)     │
│ 8. Users & Permissions (Role-Based Access Control: Teacher, Student, Parent, Sec)│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Comprehensive Documentation Sitemap

```text
d:/el_awal/
├── README.md                                          # System Overview & Architecture Summary
│
├── docs/
│   ├── 01-PRD/                                        # Product Requirements Documentation
│   │   ├── business-requirements.md                   # Dual Delivery Models, BR-OL-001..005, Business Objectives
│   │   ├── product-requirements.md                    # Core Principles, PRD-OL-001..007, AC-OL-001..012
│   │   ├── functional-requirements.md                 # System Capabilities, FR-OL-001..008, Attendance Boundaries
│   │   ├── non-functional-requirements.md             # Performance, Streaming Latency, Server Authority, Security
│   │   └── use-cases.md                               # Preconditions, Main Flows, UC-OL-001..006
│   │
│   ├── 02-UX/                                         # User Experience & Design Documentation
│   │   ├── user-personas.md                           # 4 Personas (Teacher, Student, Parent, Secretariat)
│   │   ├── user-scenarios.md                          # Scenarios SC-STU-001..SC-OL-007
│   │   ├── user-stories.md                            # User Stories US-STU-001..US-OL-007
│   │   └── design-system.md                           # Tokens, Glassmorphism, Video Player & Catalog UI Templates
│   │
│   ├── 03-Architecture/                               # Technical Architecture Specifications
│   │   ├── database-design.md                         # 26 Relational Tables, Constraints, ERD, Index Strategy
│   │   ├── data-layer.md                              # Conceptual Data Entities DATA-STU-001..DATA-OL-006
│   │   ├── business-logic.md                          # Business Rules BLR-STU-001..BLR-OL-008
│   │   ├── backend-architecture.md                    # Modular Monolith Topology, Pipelines, Storage Handshakes
│   │   ├── backend-implementation-architecture.md     # Directory Layout, NestJS Services, DTO Contracts
│   │   ├── api-design.md                              # 42 REST Endpoints, ProblemDetails, Traceability Matrix
│   │   ├── frontend-architecture.md                   # Next.js App Router, Component Split, State & Query Store
│   │   ├── presentation-layer.md                      # UI Capabilities PL-STU-001..PL-OL-007
│   │   └── offline-first-sync-architecture.md         # Local Storage Boundary, Conflict Resolution, Sync Protocol
│   │
│   └── 04-Test/                                       # Quality Assurance & Testing Documentation
│       ├── test-plan.md                               # Quality Strategy, Test Levels, Domain Boundary Test Suite
│       └── test-cases.md                              # 57 Formal Test Cases (TC-STU-001..TC-OL-018)
```

---

## 6. Verification & Quality Assurance Baseline

Every documented requirement and architectural invariant is backed by formal, deterministic test cases:
- **QR Attendance Pipeline**: `TC-ATT-004` through `TC-ATT-010`, `TC-OFF-001` through `TC-OFF-005`
- **Online Course Lifecycle**: `TC-OL-001` through `TC-OL-003`
- **Enrollment & Access Entitlement**: `TC-OL-004`, `TC-OL-005`
- **Domain Boundary & Attendance Isolation**: `TC-OL-006` (Online enrollment rejected in QR check-in)
- **Single Student Identity**: `TC-OL-007` (Dual physical & online enrollments on unified student account)
- **Video Lesson Playback & Resume**: `TC-OL-008`, `TC-OL-009`
- **Dynamic Course Completion Calculation**: `TC-OL-010`
- **Online Assessment Auto-Grading & Single Attempt**: `TC-OL-011`
- **Parent Portal Monitoring & IDOR Protection**: `TC-OL-012`, `TC-OL-013`
- **Offline Outbox & Monotonic Sync**: `TC-OL-014` through `TC-OL-018`
