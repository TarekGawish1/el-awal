# Non-Functional Requirements Document

## 1. Document Information
- **Document Name**: Non-Functional Requirements Document
- **Document Type**: Product Documentation
- **Product**: Educational Management System for Teachers and Students (El Awal)
- **Version**: 2.0
- **Status**: Updated Draft — Online Learning Domain Integrated
- **Source of Truth**: Approved Backlog, Architecture Baseline, and Educational Delivery Models

---

## 2. Purpose
This document defines the non-functional quality requirements, performance expectations, security constraints, and operational characteristics of the educational management system across both **Physical Learning** and **Online Learning** delivery models.

---

## 3. Scope
This document covers the non-functional quality attributes applicable across all ten confirmed product modules:
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

## 4. Non-Functional Requirements

### 4.1 Performance & Latency
- **Physical QR Attendance Check-In**: Camera scanning and verification pipeline must complete and return affirmative idempotent confirmation in <500ms under normal connectivity.
- **Online Course Video Playback**: Initial video playback start time must not exceed 2.0 seconds via Bunny Stream global edge network.
- **Course Metadata & Outline Fetching**: Local cached catalog and module queries must resolve in <100ms; remote server queries in <300ms.
- **Progress Sync Intake**: Batch progress synchronization payloads must be ingested, validated, and acknowledged by the backend in <300ms.
- `TBD — Requires Product Clarification`: Peak concurrent student video streaming volume and classroom scanning throughput limits.

---

### 4.2 Security & Authorization
- **Role-Based Access Control (RBAC)**: Strict enforcement across `TEACHER`, `STUDENT`, `PARENT`, and `SECRETARIAT`.
- **Broken Object Level Authorization (BOLA/IDOR) Prevention**:
  - Course content, progress, and assessment submissions are cryptographically and relationally bound to the authenticated user.
  - Parent portal endpoints strictly verify verified `ParentStudentLink` associations.
- **Server Authority Invariant**: Client-side offline state is strictly a non-authoritative cache. The server remains the sole authority for:
  - Course access entitlement verification.
  - Exam auto-grading score calculation.
  - Physical attendance recording and authorization.
- **QR Credential Protection**: Student QR codes utilize high-entropy, opaque tokens with endpoint rate limiting to prevent brute-force enumeration.

---

### 4.3 Availability, Reliability & Offline Resilience
- **Dual Offline Resilience**:
  1. *Physical Attendance*: Teachers can record QR scans offline; scans are buffered in a local outbox and synced idempotently upon reconnection.
  2. *Online Learning*: Students can browse cached course outlines, view cached lesson metadata, and continue offline learning. Progress heartbeat events are queued in a durable outbox (`IndexedDB`/`SQLite`) and synchronized automatically upon reconnection.
- **Video & Large Binary Demarcation**: Video streaming and large file downloads require active network connectivity via Bunny Stream and Cloudflare R2; binary video files are NEVER replicated into local databases.
- **Authoritative Cloud Database**: Neon PostgreSQL serves as the immutable single source of truth.
- `TBD — Requires Product Clarification`: Formal SLA uptime percentages (target 99.9%) and allowable planned maintenance windows.

---

### 4.4 Scalability & Storage Optimization
- **Binary Storage Decoupling**: Database stores structured metadata only; Cloudflare R2 stores PDFs/documents; Bunny Stream stores video files.
- **Normalized Relational Scaling**: PostgreSQL schema uses UUIDv4 primary keys, targeted composite B-tree indexes, and explicit foreign key constraints to support horizontal database read scaling.
- `TBD — Requires Product Clarification`: Specific concurrent user peaks and long-term storage quotas.

---

### 4.5 Usability & Dual-Language Localization
- **Bilingual Interface**: Seamless bidirectional support for Arabic (`RTL`) and English (`LTR`) across physical attendance views, course catalog, lesson player, and parent portal.
- **Interactive Feedback**: Immediate visual/audio feedback for QR scans, video playback resumption, and offline sync status badges.

---

### 4.6 Accessibility
- Interfaces must provide high-contrast readability, clear focus outlines for keyboard navigation, and responsive typography across desktop, tablet, and mobile screens.
- `TBD — Requires Product Clarification`: Formal WCAG 2.1 AA certification requirements.

---

### 4.7 Compatibility & Client Environment
- Modern evergreen web browsers (Chrome, Edge, Safari, Firefox) with WebRTC camera API support for QR scanning, modern HTML5 video players for HLS playback, and IndexedDB for offline outbox storage.

---

### 4.8 Maintainability & Architecture
- Structured as a Modular Monolith in NestJS (backend) and Next.js (frontend), maintaining strict domain boundaries between Physical Groups and Online Courses.

---

### 4.9 Data Integrity & Concurrency Control
- **Physical Attendance Deduplication**: Enforced via PostgreSQL composite unique constraint `uq_session_student`.
- **Course Progress Monotonicity**: Progress tracking prevents out-of-order offline sync events from regressing completed lesson milestones.
- **Assessment Submissions**: Enforced single-attempt constraint on `uq_assessment_student`.

---

### 4.10 Privacy & Data Protection
- Student performance, attendance, and guardian contact records are encrypted in transit (TLS 1.3) and restricted to authorized stakeholders.
- `TBD — Requires Product Clarification`: Specific regulatory privacy frameworks (e.g., GDPR, national student privacy laws) and data retention periods.

---

### 4.11 Backup & Disaster Recovery
- Serverless point-in-time recovery (PITR) and daily automated snapshots supported via Neon PostgreSQL.
- `TBD — Requires Product Clarification`: Exact RPO (Recovery Point Objective) and RTO (Recovery Time Objective) targets.

---

### 4.12 Monitoring & Observability
- Structured JSON application logging with unique request correlation IDs (`x-request-id`) across all API interactions and sync outbox dispatches.

---

## 5. Open Product Clarifications

| Clarification ID | Category | Question | Reason |
| --- | --- | --- | --- |
| CLR-NFR-001 | Performance | What are the peak concurrent video streaming and QR attendance scanning volumes? | Informs CDN edge provisioning and rate limiter tuning. |
| CLR-NFR-002 | Security | What specific two-factor authentication or SSO mechanisms will be adopted for administrative roles? | Guides identity provider integrations. |
| CLR-NFR-003 | Availability | What is the target contractual SLA uptime percentage (e.g., 99.9%)? | Determines multi-region hosting and automated failover strategy. |
| CLR-NFR-004 | Storage | What are the per-course and per-teacher storage quotas for uploaded instructional assets? | Sets object storage budget and billing alerts. |
| CLR-NFR-005 | Privacy | What data retention policies apply to historical student attendance and assessment logs after graduation? | Configures automated database archival pipelines. |
