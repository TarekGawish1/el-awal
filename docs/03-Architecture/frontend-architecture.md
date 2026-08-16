# Frontend Architecture Specification

## 1. Document Information

- **Document Name**: Frontend Architecture Specification (مخطط بنية الواجهة الأمامية)
- **Document Type**: Technical Architecture / Frontend Implementation Blueprint
- **Product**: Educational Management System for Teachers and Students (El Awal / منصة الأول التعليمية)
- **Version**: 1.0.0
- **Status**: Approved Baseline
- **Technology Stack**:
  - **Framework**: Next.js (App Router, React 19, TypeScript)
  - **Styling**: Vanilla CSS & CSS Modules leveraging the [El Awal Design System](file:///d:/el_awal/docs/02-UX/design-system.md) (Design Tokens, Glassmorphism, Sleek Dark/Light Modes, Micro-animations)
  - **Server State & Data Fetching**: TanStack Query (React Query) / Next.js Server Components with cached fetch
  - **Client State**: Zustand / React Context for lightweight UI and camera scanner state
  - **Form Validation**: React Hook Form + Zod (Strictly mirrored to backend NestJS DTOs)
  - **Typography & Localization**: Bilingual Arabic (Primary RTL) & English (LTR) via Google Fonts (`Cairo` / `Outfit` / `Inter`)
  - **Icons**: Lucide Icons / SVG Icon System
- **Source of Truth**:
  - [Business Requirements](file:///d:/el_awal/docs/01-PRD/business-requirements.md)
  - [Product Requirements](file:///d:/el_awal/docs/01-PRD/product-requirements.md)
  - [Functional Requirements](file:///d:/el_awal/docs/01-PRD/functional-requirements.md)
  - [Non-Functional Requirements](file:///d:/el_awal/docs/01-PRD/non-functional-requirements.md)
  - [User Personas](file:///d:/el_awal/docs/02-UX/user-personas.md)
  - [User Scenarios](file:///d:/el_awal/docs/02-UX/user-scenarios.md)
  - [User Stories](file:///d:/el_awal/docs/02-UX/user-stories.md)
  - [Design System Specification](file:///d:/el_awal/docs/02-UX/design-system.md)
  - [Backend Architecture](file:///d:/el_awal/docs/03-Architecture/backend-architecture.md)
  - [Backend Implementation Architecture](file:///d:/el_awal/docs/03-Architecture/backend-implementation-architecture.md)
  - [Database Design](file:///d:/el_awal/docs/03-Architecture/database-design.md)
  - [Business Logic Architecture](file:///d:/el_awal/docs/03-Architecture/business-logic.md)
  - [API Design Specification](file:///d:/el_awal/docs/03-Architecture/api-design.md)
  - [Test Plan & Test Cases](file:///d:/el_awal/docs/04-Test/test-cases.md)

---

## 2. Frontend Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NEXT.JS CLIENT PLATFORM                           │
│  - App Router (app/) Architecture with Nested Layouts & Route Groups        │
│  - Hybrid Server / Client Component Boundaries                              │
│  - Bilingual RTL / LTR Directional Switching (dir="rtl", lang="ar")        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         ▼                                                           ▼
┌─────────────────────────────────────────┐ ┌─────────────────────────────────────────┐
│       SERVER COMPONENTS (RSC)           │ │        CLIENT COMPONENTS ('use client') │
│  - Initial Data Hydration & Layouts     │ │  - Interactive Forms & Step Wizards     │
│  - Static Asset Delivery & SEO Metadata │ │  - Camera Viewfinder & QR Scanner Feed  │
│  - Pre-rendered Shells & Skeletons      │ │  - Interactive Exam Countdown & Answering│
│  - Zero Client JavaScript Overhead      │ │  - Real-Time Toast / Sound Feedback     │
└────────────────────┬────────────────────┘ └────────────────────┬────────────────────┘
                     │                                           │
                     └─────────────────────┬─────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            APPLICATION CORE LAYER                           │
│  - Centralized API Client (Typed DTO Requests over HTTPS / TLS 1.3)          │
│  - Session Hydration & In-Memory JWT Access Token Storage                   │
│  - Server State Management (TanStack Query Caching, Mutations, Invalidation)│
│  - Client State (Camera Scanner Lifecycle, UI Modals, Active Filter Drawer) │
│  - Direct-to-R2 File Uploader & Signed Bunny Stream Player Integration      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / JSON (/api/v1)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NestJS Backend API Gateway                           │
│                (Hetzner VPS + Prisma + Neon PostgreSQL)                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Core Architectural Principles
1. **API-Centric Decoupling**: The Next.js frontend has **zero** direct database access. All data querying, mutations, and domain rules are strictly channeled through the verified `/api/v1` REST API contract.
2. **Client-Side Authorization is UI-Only**: Role checks and route guards on the frontend provide user experience tailoring and navigation protection. The backend NestJS API remains the **sole authoritative security and data-integrity boundary**.
3. **Optimized Server/Client Boundaries**: Server Components are utilized by default for layout shells, initial pre-renders, and public landing views. Client components (`'use client'`) are strictly scoped to interactive controls (camera scanner, countdown timers, assessment radio groups, and modal drawers).
4. **Resilient Offline & Hardware Degradation**: Camera scanner interfaces handle permission denials, device orientation shifts, hardware unavailability, and network timeouts with explicit graceful recovery UIs.

---

## 3. Next.js Application Structure

```text
src/
├── app/                              # Next.js App Router root
│   ├── layout.tsx                    # Root HTML shell, fonts (Cairo/Inter), RTL dir provider
│   ├── globals.css                   # Core Design Tokens, CSS reset, theme variables
│   ├── not-found.tsx                 # Global 404 handler
│   ├── error.tsx                     # Global error boundary handler
│   ├── loading.tsx                   # Global suspense loading fallback
│   │
│   ├── (auth)/                       # Public Authentication Route Group
│   │   ├── login/
│   │   │   └── page.tsx              # Role-aware login screen (Email/Phone + Password)
│   │   └── layout.tsx                # Centered glassmorphic card layout
│   │
│   ├── (dashboard)/                  # Authenticated Portal Route Group
│   │   ├── layout.tsx                # Authenticated portal shell (Sidebar, Header, Notifications)
│   │   │
│   │   ├── teacher/                  # Teacher Portal Routes
│   │   │   ├── dashboard/page.tsx    # Teacher overview & quick action hub
│   │   │   ├── groups/
│   │   │   │   ├── page.tsx          # Group list & creation drawer
│   │   │   │   └── [groupId]/
│   │   │   │       ├── page.tsx      # Group details, timetable & roster
│   │   │   │       ├── sessions/page.tsx # Session history & calendar
│   │   │   │       └── content/page.tsx  # Group educational files & video manager
│   │   │   ├── attendance/
│   │   │   │   ├── page.tsx          # Attendance session selector & reports
│   │   │   │   └── [sessionId]/
│   │   │   │       └── scan/page.tsx # Camera QR Scanner Viewfinder & Live Roster
│   │   │   ├── assessments/
│   │   │   │   ├── page.tsx          # Assignment & Exam management list
│   │   │   │   ├── create/page.tsx   # Structured Question Bank Builder
│   │   │   │   └── [assessmentId]/
│   │   │   │       └── submissions/page.tsx # Student submissions & grading review
│   │   │   ├── students/page.tsx     # Student enrollment & profile management
│   │   │   └── subscriptions/page.tsx# Student payment status tracking table
│   │   │
│   │   ├── secretariat/              # Secretariat Portal Routes
│   │   │   ├── dashboard/page.tsx    # Administrative operations hub
│   │   │   ├── enrollment/page.tsx   # Student registration & QR badge generation
│   │   │   ├── schedules/page.tsx    # Master timetable editor
│   │   │   └── payments/page.tsx     # Student payment status logging
│   │   │
│   │   ├── student/                  # Student Portal Routes
│   │   │   ├── dashboard/page.tsx    # Student portal hub, upcoming classes, progress
│   │   │   ├── qr-card/page.tsx      # Digital Student QR Attendance Card
│   │   │   ├── lessons/
│   │   │   │   ├── page.tsx          # Educational files, summaries, recordings
│   │   │   │   └── [contentId]/page.tsx # PDF Reader & Signed Video Player
│   │   │   ├── assessments/
│   │   │   │   ├── page.tsx          # Active assignments & exams
│   │   │   │   └── [assessmentId]/
│   │   │   │       ├── take/page.tsx # Interactive Exam Runner & Auto-Submitter
│   │   │   │       └── result/page.tsx # Immediate Grading Result & Score Report
│   │   │   └── grades/page.tsx       # Historical academic results & transcripts
│   │   │
│   │   └── parent/                   # Parent Portal Routes
│   │       ├── dashboard/page.tsx    # Linked children overview & summary cards
│   │       └── child/[studentId]/
│   │           ├── overview/page.tsx # Consolidated child academic dashboard
│   │           ├── grades/page.tsx   # Exam grades & teacher evaluations
│   │           ├── homework/page.tsx # Assignment completion ratios
│   │           └── attendance/page.tsx# Monthly attendance calendar & absence log
│   │
│   └── api/                          # Next.js Route Handlers (Edge proxies / BFF if needed)
│       └── health/route.ts
│
├── components/                       # Reusable UI component inventory
│   ├── ui/                           # Primitives (Buttons, Inputs, Modals, Cards, Badges)
│   ├── layout/                       # AppSidebar, Header, Breadcrumbs, UserDropdown
│   ├── scanner/                      # CameraViewfinder, LaserOverlay, ScanFeedbackBanner
│   ├── media/                        # PdfViewer, BunnyVideoPlayer, FileDownloadButton
│   ├── assessments/                  # QuestionCard, OptionSelector, TimerCountdown
│   └── feedback/                     # ToastNotification, LoadingSpinner, EmptyState, ErrorBanner
│
├── features/                         # Encapsulated domain feature components & hooks
│   ├── auth/                         # LoginForm, useAuth, AuthContext
│   ├── attendance/                   # QrScannerModal, LiveAttendanceRoster, ManualAttendanceTable
│   ├── students/                     # StudentQrCard, EnrollmentForm, QrRegenerateButton
│   ├── assessments/                  # AssessmentBuilder, ExamRunner, GradeSummaryCard
│   ├── content/                      # DirectUploader, ContentGrid, ProgressTracker
│   └── parent-portal/                # ChildSelector, AcademicRadarChart, AbsenceAlertCard
│
├── lib/                              # Core utilities, API client, and external SDK wrappers
│   ├── api/
│   │   ├── client.ts                 # Axios / Fetch client with interceptors & correlation ID
│   │   ├── endpoints.ts              # Canonical API route constants
│   │   └── errors.ts                 # Problem Details parser & domain error mapping
│   ├── storage/
│   │   └── r2-uploader.ts            # Browser direct-to-R2 PUT upload helper
│   ├── audio/
│   │   └── sound-effects.ts          # Beep audio synthesis for scanner success/error
│   └── utils/
│       ├── cn.ts                     # Class name merging utility
│       ├── formatters.ts             # Arabic dates, percentages, currency formatters
│       └── storage.ts                # Session storage token accessor
│
├── hooks/                            # Shared React custom hooks
│   ├── use-qr-scanner.ts             # Camera lifecycle, frame decoding, debounce manager
│   ├── use-countdown.ts              # Exam timer countdown hook
│   ├── use-media-query.ts            # Responsive breakpoint detection
│   └── use-direction.ts              # RTL / LTR layout direction hook
│
├── stores/                           # Global client UI state stores (Zustand)
│   ├── auth-store.ts                 # In-memory JWT access token & user profile
│   └── scanner-store.ts              # Temporary camera state & active scan session cache
│
├── types/                            # TypeScript interfaces mirroring API contracts
│   ├── api.types.ts                  # ApiResponse<T>, PaginatedResponse<T>, ApiError
│   ├── auth.types.ts                 # UserProfile, UserRole, LoginCredentials
│   ├── attendance.types.ts           # AttendanceRecord, QrScanResult, SessionStats
│   ├── assessment.types.ts           # Assessment, Question, Submission, GradingResult
│   └── content.types.ts              # EducationalContent, ContentProgress, PresignedUrl
│
└── schemas/                          # Zod validation schemas mirroring NestJS DTOs
    ├── auth.schema.ts
    ├── student.schema.ts
    ├── group.schema.ts
    └── assessment.schema.ts
```

---

## 4. Role-Based Application Architecture

### 4.1 Role Matrix & Frontend Access Boundaries
The frontend tailors views, navigation trees, and action buttons to the authenticated user's role:

| Capability / Route Area | `TEACHER` (`المدرس`) | `SECRETARIAT` (`السكرتارية`) | `STUDENT` (`الطالب`) | `PARENT` (`ولي الأمر`) |
|---|---|---|---|---|
| **Teacher Dashboard & Analytics** | Full Access | View / Support | Denied (403) | Denied (403) |
| **Group Setup & Timetables** | Full Access | Full Access | Denied (403) | Denied (403) |
| **QR Camera Attendance Scanner** | Full Access | Full Access | Denied (403) | Denied (403) |
| **Manual Roll-Call Fallback** | Full Access | Full Access | Denied (403) | Denied (403) |
| **Content Upload & Video Publishing** | Full Access | Denied | Denied (403) | Denied (403) |
| **Assessment & Exam Authoring** | Full Access | Denied | Denied (403) | Denied (403) |
| **Student Digital QR Attendance Card** | View / Print | View / Print | View Personal Card | View Child Card |
| **Exam Taking & Auto-Grading** | Preview Only | Denied | Take / Submit | Denied |
| **Educational Materials & Video Player**| Manage | Denied | Access Enrolled Cohort | Denied |
| **Parent Child Academic Dashboard** | Denied | Denied | Denied (403) | Full Access (Linked Children) |
| **Payment Status Management** | View / Update | View / Update | View Personal Status | View Child Status |

### 4.2 Frontend Authorization as UX Boundary
- **Non-Security Boundary**: Frontend route guards (`middleware.ts` and `<RoleGuard>`) solely provide routing convenience and clean UX.
- **Backend Authoritative Enforcement**: If a student crafts a direct HTTP request to a teacher endpoint, the backend `RolesGuard` and `ResourceOwnershipGuard` unconditionally reject the transaction with `403 Forbidden`.

---

## 5. Routing Architecture

### 5.1 Route Tree Specification
```text
/ (Root)                                 -> Redirects to /login or role dashboard
├── /login                               -> Public Authentication screen
├── /unauthorized                        -> 403 Access Denied presentation screen
│
├── /teacher                             -> Protected (Roles: TEACHER)
│   ├── /dashboard                       -> Analytics, upcoming sessions, recent activity
│   ├── /groups                          -> Academic groups management
│   │   └── /[groupId]                   -> Group hub (Roster, Timetable, Materials)
│   ├── /attendance                      -> Session selector & report generation
│   │   └── /[sessionId]/scan            -> Camera QR Scanner Viewfinder
│   ├── /assessments                     -> Assignments & Exams list
│   │   ├── /create                      -> Structured Exam Builder
│   │   └── /[assessmentId]/submissions  -> Submissions & auto-grade review
│   └── /students                        -> Student directory & QR code badge generator
│
├── /secretariat                         -> Protected (Roles: SECRETARIAT)
│   ├── /dashboard                       -> Operational summary
│   ├── /enrollment                      -> Student registration wizard & QR pass print
│   ├── /schedules                       -> Center timetable manager
│   └── /payments                        -> Student fee & payment status logging
│
├── /student                             -> Protected (Roles: STUDENT)
│   ├── /dashboard                       -> Student home, timetable, upcoming exams
│   ├── /qr-card                         -> Fullscreen High-Contrast Digital QR Badge
│   ├── /lessons                         -> Educational content & PDF summary viewer
│   │   └── /[contentId]                 -> Video player / PDF document reader
│   ├── /assessments                     -> Active homework & scheduled exams
│   │   └── /[assessmentId]/take         -> Protected Exam Runner Interface
│   └── /grades                          -> Transcripts & graded assessment feedback
│
└── /parent                              -> Protected (Roles: PARENT)
    ├── /dashboard                       -> Children selector & high-level indicators
    └── /child/[studentId]
        ├── /overview                    -> Academic level radar, evaluations, grades
        ├── /homework                    -> Homework completion tracking
        └── /attendance                  -> Monthly session attendance / absence history
```

---

## 6. Authentication Architecture

```text
┌──────────────┐                  ┌─────────────────┐                  ┌──────────────┐
│ Next.js Page │                  │ API Client Layer │                  │ NestJS /auth │
└──────┬───────┘                  └────────┬────────┘                  └──────┬───────┘
       │ 1. Submit Credentials             │                                  │
       ├──────────────────────────────────>│ 2. POST /api/v1/auth/login       │
       │                                   ├─────────────────────────────────>│
       │                                   │ 3. Returns { accessToken, user } │
       │                                   │<─────────────────────────────────┤
       │ 4. Hydrate AuthStore (In-Memory)  │                                  │
       │<──────────────────────────────────┤                                  │
       │ 5. Redirect to Role Dashboard     │                                  │
       │                                   │                                  │
       │ 6. Future API Requests            │                                  │
       ├──────────────────────────────────>│ 7. Attach 'Authorization: Bearer'│
       │                                   ├─────────────────────────────────>│
       │                                   │ 8. 401 Unauthorized Response     │
       │                                   │<─────────────────────────────────┤
       │ 9. Invalidate Session & Redirect  │                                  │
       │<──────────────────────────────────┤                                  │
```

### 6.1 Token Storage & Expiration Handling
- **Storage**: The signed JWT access token is stored **in-memory** within the Zustand `auth-store` and synchronized with an `HttpOnly` / Secure session cookie for Server Component hydration.
- **401 Interception**: When an API request returns `401 Unauthorized`, the client interceptor clears stored state, cancels pending queries, and smoothly navigates the user to `/login?expired=true`.
- **Refresh Token Decision**: `TBD — Requires Architecture Decision` (Mirrored from backend; current baseline requires clean credential re-login upon token expiration).

---

## 7. API Client Architecture

### 7.1 Centralized HTTP Client (`lib/api/client.ts`)
The frontend communicates with the NestJS backend via a standardized, typed client instance:
- **Base URL**: Set dynamically via `process.env.NEXT_PUBLIC_API_URL` (Default: `http://localhost:3000/api/v1`).
- **Correlation Tracing**: Generates a unique UUIDv4 `X-Correlation-Id` on every request to link frontend transactions to backend Pino logs.
- **Global Error Normalization**: Transforms RFC 7807 problem payloads into typed `ApiError` domain models with field-level validation dictionaries.
- **Request Timeout**: Configured with an 8000ms timeout threshold, returning graceful network failure states.

---

## 8. Server State Management

### 8.1 TanStack Query (React Query) Architecture
All server-originated data is managed as asynchronous query caches:
- **Query Keys Strategy**: Hierarchical, deterministic keys:
  - `['groups', teacherId]`
  - `['group', groupId]`
  - `['attendance', 'session', sessionId]`
  - `['parent', 'child', studentId, 'overview']`
- **Cache Invalidation on Mutation**:
  - `POST /attendance/sessions/:sessionId/scan-qr` $\rightarrow$ Invalidates `['attendance', 'session', sessionId]`.
  - `POST /assessments/:id/submit` $\rightarrow$ Invalidates `['assessments', studentId]` and `['grades', studentId]`.
  - `PATCH /subscriptions/students/:id/payment-status` $\rightarrow$ Invalidates `['students', studentId]` and `['subscriptions']`.
- **Optimistic Updates**: Applied **only** on non-critical UI states (e.g. marking notification as read). Critical operations (QR attendance check-ins and exam grading) **never** use optimistic updates to avoid false positives.

---

## 9. Client State Management

| State Category | Storage / Engine | Example Usage |
|---|---|---|
| **Server Cache** | TanStack Query | Student rosters, session attendance lists, exam questions, grade history |
| **Session State** | Zustand / Cookie | Current authenticated user profile, active JWT token |
| **URL State** | Next.js `useSearchParams` | Table pagination (`?page=2`), active tab (`?tab=homework`), filter keywords |
| **Form State** | React Hook Form | New student enrollment wizard, exam question builder |
| **Transient Scanner State** | Local React Hook / Zustand | Active camera stream, laser animation frame, scan debounce cooldown |

---

## 10. Forms & Validation

### 10.1 Schema-Driven Validation Pattern
Every frontend form is validated using **Zod** schemas that strictly mirror the backend `class-validator` DTOs:
```typescript
// Architectural Recipe: DTO-Aligned Zod Validation Schema
export const CreateStudentSchema = z.object({
  fullName: z.string().min(3, 'الاسم يجب ألا يقل عن 3 أحرف'),
  email: z.string().email('بريد إلكتروني غير صالح'),
  phone: z.string().regex(/^\+201[0-2,5]{1}[0-9]{8}$/, 'رقم هاتف مصري غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب ألا تقل عن 8 أحرف'),
  gradeLevel: z.string().min(1, 'يرجى اختيار الصف الدراسي'),
  studentCode: z.string().optional(),
  groupId: z.string().uuid('معرف المجموعة غير صالح'),
  parent: z.object({
    fullName: z.string().min(3, 'اسم ولي الأمر مطلوب'),
    phone: z.string().regex(/^\+201[0-2,5]{1}[0-9]{8}$/, 'رقم هاتف ولي الأمر غير صالح'),
    relationshipType: z.enum(['Father', 'Mother', 'Guardian']),
  }),
});
```

---

## 11. QR Attendance Frontend Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                 QR ATTENDANCE SCANNER LIFECYCLE (TEACHER VIEW)              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1. Teacher opens /[sessionId]/scan
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Camera Initialization & Permissions                                      │
│    - Checks navigator.mediaDevices.getUserMedia support                     │
│    - Requests Environment / Back Facing Camera (`facingMode: 'environment'`)│
│    - Handles Permission Denied -> Displays explicit permission guide UI     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 2. Camera Stream Active
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. Optical Frame Processing & Debounce Filter                               │
│    - Captures video frame -> Decodes QR string                              │
│    - Client-Side Debounce: Ignores identical token within 3000ms cooldown   │
│    - Plays optical scanning laser micro-animation                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 3. Submits Payload to API
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. API Dispatch: POST /api/v1/attendance/sessions/:sessionId/scan-qr        │
│    - Request Body: { qrCodeToken: decodedToken }                            │
│    - Scanner UI switches to "Verifying..." pulse state                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        │                                                             │
        ▼ (200 OK: isDuplicate = false)                               ▼ (200 OK: isDuplicate = true)
┌─────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│ State A: Success — First Scan           │   │ State B: Warning — Repeated Scan        │
│ - Green flash overlay & success chime   │   │ - Yellow badge: "Already Recorded"      │
│ - Displays student card & timestamp     │   │ - Preserves original recordedAt time    │
│ - Session present counter increments +1 │   │ - Zero duplicate DB record created      │
└─────────────────────────────────────────┘   └─────────────────────────────────────────┘
        │                                                             │
        ├──────────────────────────────┬──────────────────────────────┤
        ▼ (422: GROUP_ENROLLMENT_MISMATCH)                            ▼ (404 / 400: Invalid Token)
┌─────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│ State C: Alert — Group Mismatch         │   │ State D: Error — Invalid / Tampered QR  │
│ - Orange warning banner & buzz sound    │   │ - Red error alert: "Unrecognized Badge" │
│ - Displays student name & ACTUAL group  │   │ - Re-arms viewfinder after 2000ms       │
│ - Zero attendance recorded for session  │   │ - Prompts teacher to check enrollment   │
└─────────────────────────────────────────┘   └─────────────────────────────────────────┘
```

### 11.1 Key Frontend Scanner Invariants
- **Non-Authority**: The frontend scanner **never** marks attendance locally or crafts fake payloads. It acts purely as an optical capture terminal forwarding raw strings to the backend.
- **Offline Staging & Outbox**: Under offline conditions, valid scans are staged in the local database with `PENDING_SYNC` status and queued in the durable outbox for automatic background dispatch upon reconnection ([offline-first-sync-architecture.md](file:///d:/el_awal/docs/03-Architecture/offline-first-sync-architecture.md)).
- **Audio Synthesis**: Emits synthesized web audio frequencies (e.g. 880Hz high beep for success, 220Hz low tone for error) for instant classroom sensory feedback.
- **Continuous Scanner Flow**: The camera stream remains uninterrupted during scan evaluation; feedback overlays automatically dismiss after 2500ms to allow scanning the next student in the queue.

---

## 12. Student QR Card Component

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DIGITAL STUDENT QR ATTENDANCE CARD                    │
├─────────────────────────────────────────────────────────────────────────────┤
│   [Logo: El Awal / الأول]                   [Student Photo / Placeholder]  │
│                                                                             │
│   الطالب: محمود أحمد علي                     الصف: الثالث الثانوي             │
│   كود الطالب: STU-2026-104                  المجموعة: مجموعة أ               │
│                                                                             │
│                        ┌───────────────────────┐                            │
│                        │   ████████  ██  ████  │                            │
│                        │   ██    ██  ██    ██  │                            │
│                        │   ████████  ██  ████  │                            │
│                        │       ██  ████  ██    │                            │
│                        │   ██  ████  ████████  │                            │
│                        └───────────────────────┘                            │
│                         [High-Contrast SVG Render]                          │
│                                                                             │
│   [!] هذا الكود مخصص لتسجيل الحضور في الحصة بواسطة المدرس                   │
│   [زر: تكبير الرمز للشاشة الكاملة]     [زر: طباعة بطاقة الطالب (PDF/Print)]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Rendering**: Generates clean vector SVG QR codes from the student's provisioned `qr_code_token` with maximum error correction (Level H) for scanning off damaged/cracked phone screens.
- **Fullscreen Display**: One-tap button expands QR badge to 100% screen brightness and maximum dimensions for rapid optical recognition in dark lecture halls.

---

## 13. File Upload Architecture (Cloudflare R2 Direct Upload)

```text
Teacher Selects File (PDF / Summary)
        │
        ▼
1. Client validates file size (<50MB) and MIME type (application/pdf)
        │
        ▼
2. POST /api/v1/uploads/presigned-url { fileName, contentType, fileSize, category: "SUMMARIES" }
        │
        ▼
3. NestJS returns { fileKey, uploadUrl, publicCdnUrl }
        │
        ▼
4. Client executes HTTP PUT uploadUrl with raw File binary (Direct to Cloudflare R2)
   - Tracks upload percentage via XMLHttpRequest / Axios onUploadProgress
   - Displays animated progress bar
        │
        ▼
5. Upon 200 OK from R2 -> Client calls POST /api/v1/content with metadata & publicCdnUrl
        │
        ▼
6. Content item appears in Group Materials list in real time
```

---

## 14. Video Streaming Architecture (Bunny Stream)

- **Teacher Publishing**: Client requests video upload authorization grant; video binaries upload directly to Bunny Stream transcoding pipelines.
- **Student Playback (`components/media/BunnyVideoPlayer.tsx`)**:
  - Fetches signed tokenized embed URL from `/api/v1/content/:id`.
  - Embeds responsive, adaptive HLS player with playback speed controls (0.75x, 1.0x, 1.25x, 1.5x, 2.0x).
  - Periodically sends viewing progress checkpoints (`POST /api/v1/content/:id/progress`) every 30 seconds.

---

## 15. Educational Content Frontend Module

- **Content Grid & Filter**: Categorized tabs for `All`, `Summaries` (ملخصات), `References` (مراجع), and `Recorded Lectures` (محاضرات مسجلة).
- **In-App PDF Viewer**: Secure canvas-based PDF reader with zoom, page navigation, and printable toggles.
- **Progress Badges**: Visual indicator (`100% مكتمل` / `قيد المشاهدة`) showing student completion state.

---

## 16. Assessment & Automated Exam Frontend Architecture

### 16.1 Structured Exam Builder (Teacher View)
- Drag-and-drop question reordering with point assignment per question.
- Multiple-choice option authoring with radio selector marking the single correct answer.
- Real-time total score calculator validating that question points sum to `totalScore`.

### 16.2 Exam Runner & Auto-Grading (Student View)
- **Zero Answer-Key Leakage**: Student query response contains only questions and choices. `correctAnswer` is strictly omitted from the client payload.
- **Timer & Auto-Submit**: Visual countdown clock; when timer reaches `00:00`, the form freezes and automatically dispatches answers to `POST /api/v1/assessments/:id/submit`.
- **Immediate Feedback Presentation**: Renders instant evaluation card with final score, percentage, pass/fail badge, and question-by-question review.

---

## 17. Parent Portal Frontend Architecture

- **Child Context Selector**: Multi-child dropdown switcher for guardians with more than one enrolled student.
- **Academic Radar & KPI Cards**:
  - Attendance Rate percentage gauge with color thresholds (Green $\ge 90\%$, Yellow $75-89\%$, Red $<75\%$).
  - Homework completion status ratio (e.g. `12 / 12 تم التسليم`).
  - Recent exam score trend graph.
  - Teacher notes and evaluated Student Level (`ممتاز`, `جيد جداً`).

---

## 18. Notifications Frontend Architecture

- **Unread Badge Counter**: Real-time counter badge in application header.
- **Notification Drawer**: Categorized stream highlighting:
  - ⏰ *1-Hour Lesson Reminder*
  - 📝 *Unsolved Homework Warning*
  - 🏆 *New Exam Grade Available*
  - ⚠️ *Student Absence Alert*
- **One-Click Read Acknowledgment**: Clicking an alert marks it read via `PATCH /api/v1/notifications/:id/read` and navigates directly to the relevant resource.

---

## 19. Responsive Architecture & Viewport Breakpoints

The application implements a mobile-first responsive architecture utilizing CSS design tokens:

```css
/* Responsive Breakpoint Matrix */
--breakpoint-sm: 640px;   /* Mobile Devices */
--breakpoint-md: 768px;   /* Tablets & iPads */
--breakpoint-lg: 1024px;  /* Small Laptops & Desktops */
--breakpoint-xl: 1280px;  /* Standard Desktop Monitors */
--breakpoint-2xl: 1536px; /* Ultra-Wide Displays */
```

- **Mobile Viewport (<768px)**:
  - Collapsible bottom navigation bar for Students and Parents.
  - Fullscreen Camera Viewfinder for Teachers.
  - Stacked cards for student rosters and attendance lists.
- **Tablet & Desktop (>=768px)**:
  - Persistent collapsible sidebar with glassmorphic backdrop filter.
  - Split-screen QR scanner (Camera on left, Live Attendance Roster on right).

---

## 20. Accessibility (a11y) & Localization Standards

- **RTL-First Typography**: Native Arabic directionality (`dir="rtl"`) with `Cairo` font optimized for legibility. Seamless LTR toggle for English views.
- **WCAG 2.1 AA Compliance**:
  - Minimum contrast ratio of 4.5:1 for normal text and 3:1 for large headers.
  - Visible keyboard focus rings (`:focus-visible`) on all interactive buttons and inputs.
  - `aria-live="polite"` regions for scanner feedback announcements and live attendance count increments.
- **Reduced Motion**: Respects `@media (prefers-reduced-motion: reduce)` by disabling non-essential transition animations.

---

## 21. Error Handling Architecture

| HTTP Status | Domain Error Code | Frontend UX Behavior |
|---|---|---|
| `400 Bad Request` | `VALIDATION_FAILED` | Inlines field-level errors directly below corresponding form input fields. |
| `401 Unauthorized`| `TOKEN_EXPIRED` | Flushes session cache and smoothly redirects to `/login?expired=true`. |
| `403 Forbidden` | `FORBIDDEN_RESOURCE` | Displays branded access denied screen with button to return to dashboard. |
| `404 Not Found` | `RESOURCE_NOT_FOUND` | Renders friendly 404 empty state card with search/back options. |
| `409 Conflict` | `DUPLICATE_RESOURCE` | Shows contextual toast explaining conflict (e.g. "Student already enrolled"). |
| `422 Unprocessable`| `GROUP_ENROLLMENT_MISMATCH`| Displays prominent orange alert modal detailing student name and assigned cohort. |
| `429 Too Many` | `RATE_LIMIT_EXCEEDED` | Displays cooldown timer toast ("Too many requests. Please wait 10 seconds"). |
| `500 Server Error`| `INTERNAL_ERROR` | Renders sanitized error recovery boundary with "Retry" action button. |

---

## 22. Loading, Empty & Error State Design System

- **Skeleton Screens**: Shimmering card and table row skeletons matching exact component geometry during initial load.
- **Empty States**: Illustrative SVG icons with positive guidance (e.g. "No exams published yet — click below to create your first exam").
- **Error Boundaries**: Granular React Error Boundaries wrapping individual widgets so that a failure in one panel does not crash the entire page.

---

## 23. Security Architecture

- **No Secrets in Client Bundle**: All API secret keys, database credentials, and service tokens are quarantined to server environment variables. Zero sensitive strings are prefixed with `NEXT_PUBLIC_`.
- **XSS & Content Security**: React's built-in JSX escaping prevents script injection; HTML rendering is strictly prohibited on user-generated inputs.
- **Stateless Tokens**: In-memory token storage prevents cross-tab script token harvesting via `localStorage`.

---

## 24. Performance Architecture

- **Code Splitting & Route Chunking**: Next.js App Router automatically splits JavaScript bundles per route segment.
- **Dynamic Imports (`next/dynamic`)**: Heavy components (Camera QR Scanner, PDF Viewer, Chart libraries) are dynamically loaded on-demand.
- **Image Optimization**: Utilizes `next/image` with WebP compression and responsive `srcset` generation.
- **Scanner CPU Throttling**: Limits camera frame analysis to 10 FPS (100ms interval) to prevent mobile device thermal throttling and battery drain.

---

## 25. Observability & Telemetry

- **Correlation ID Propagation**: Every client API call injects an `X-Correlation-Id` header to allow end-to-end tracing in backend server logs.
- **Client Error Logging**: Uncaught React boundary errors and camera initialization failures log structured diagnostics to the browser console and error reporting endpoint.

---

## 26. Testing & Quality Assurance Architecture

### 26.1 Testing Pyramid
1. **Unit Tests (Vitest / Jest + React Testing Library)**:
   - DTO validation schemas (`schemas/`).
   - Utility formatters and crypto token validators (`lib/utils/`).
   - Reducer and state transitions in `auth-store` and `scanner-store`.
2. **Component & Integration Tests**:
   - `StudentQrCard.test.tsx`: Validates vector rendering and token independence.
   - `QuestionCard.test.tsx`: Validates radio option selection and score aggregation.
   - `CameraViewfinder.test.tsx`: Validates permission fallback and error handling.
3. **End-to-End Tests (Playwright / Cypress)**:
   - Covers all 10 verified QA test scenarios from [test-cases.md](file:///d:/el_awal/docs/04-Test/test-cases.md):
     - `TC-ATT-004`: Student QR badge generation and rendering.
     - `TC-ATT-005`: Teacher QR camera scan and instant roster update.
     - `TC-ATT-006`: Duplicate scan idempotency UI verification.
     - `TC-ATT-007`: Cross-group mismatch alert UI verification.
     - `TC-EXM-004`: Student exam runner submission and immediate auto-grading score display.

---

## 27. Environment Configuration

| Variable | Environment | Scope | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | All | Public / Client | Base URL for the NestJS REST API (e.g. `https://api.elawal.edu/api/v1`). |
| `NEXT_PUBLIC_CDN_URL` | All | Public / Client | Cloudflare CDN root URI for educational asset downloads. |
| `NEXT_PUBLIC_BUNNY_STREAM_URL` | All | Public / Client | Bunny Stream embed base URI for video playback. |
| `NEXT_PUBLIC_APP_NAME` | All | Public / Client | Branded platform title (`منصة الأول التعليمية`). |

---

## 28. Architectural Decision Records (ADRs)

### ADR-FE-001: Next.js App Router as Core Framework
- **Decision**: Adopt Next.js App Router with Server/Client Component split.
- **Rationale**: Provides native hybrid rendering, streaming SSR, built-in SEO metadata, and zero-JS layouts.

### ADR-FE-002: In-Memory Access Token with HttpOnly Session Cookie
- **Decision**: Store Bearer JWT access tokens in-memory in Zustand, hydrated via HttpOnly session cookies.
- **Rationale**: Mitigates XSS token extraction vulnerabilities associated with `localStorage`.

### ADR-FE-003: Direct-to-R2 Client Upload Pattern
- **Decision**: Perform multi-megabyte file uploads directly from browser to Cloudflare R2 via presigned URLs.
- **Rationale**: Eliminates RAM buffering on the Hetzner VPS and drastically speeds up upload speeds for teachers.

### ADR-FE-005: Client-Side Offline Outbox & Background Sync Store
- **Decision**: Use IndexedDB (via `idb-keyval` / `dexie`) to store cached course metadata and stage lesson progress events in a durable outbox queue.
- **Rationale**: Enables seamless offline learning continuity; network reconnection triggers automatic idempotent background syncing to `/api/v1/sync/progress`.

---

## 29. Complete Bidirectional Traceability Matrix

| Backlog Item / Domain | Functional Requirement | User Story | API Endpoint URI | Frontend Component / Page Route | QA Test Case |
|---|---|---|---|---|---|
| `بيانات الطالب` | `FR-STU-004` | `US-STU-001` | `/api/v1/students` | `/teacher/students`, `/student/dashboard` | `TC-STU-001` |
| `حالة الطلاب` | `FR-STU-001` | `US-STU-003` | `/api/v1/students/:id` | `/teacher/students/[id]` | `TC-STU-003` |
| `بيانات ولي الامر` | `FR-STU-003` | `US-STU-002` | `/api/v1/parent-portal/students/:id/overview` | `/parent/child/[id]/overview` | `TC-STU-002` |
| `المجموعة و الصف` | `FR-STU-002`, `FR-GRP-003` | `US-GRP-001` | `/api/v1/groups` | `/teacher/groups`, `/teacher/groups/[id]` | `TC-GRP-001` |
| `تحديد مواعيد الدروس` | `FR-GRP-001` | `US-GRP-001` | `/api/v1/groups/:id/schedules` | `/teacher/groups/[id]/schedules` | `TC-GRP-002` |
| `اضافة طلاب` | `FR-GRP-002` | `US-GRP-002` | `/api/v1/groups/:id/students` | `/teacher/groups/[id]/roster` | `TC-GRP-003` |
| `تسجيل حضور الطلاب` | `FR-ATT-003` | `US-ATT-001` | `/api/v1/attendance/sessions/:sessionId/manual` | `/teacher/attendance/[sessionId]/manual` | `TC-ATT-001` |
| `تسجيل الغياب` | `FR-ATT-002` | `US-ATT-001` | `/api/v1/attendance/sessions/:sessionId/manual` | `/teacher/attendance/[sessionId]/manual` | `TC-ATT-002` |
| `تقارير الحضور و الغياب` | `FR-ATT-001` | `US-ATT-002` | `/api/v1/attendance/reports` | `/teacher/attendance/reports` | `TC-ATT-003` |
| `تسجيل الحضور عبر مسح QR Code` | `FR-ATT-004` | `US-ATT-003` | `/api/v1/attendance/sessions/:sessionId/scan-qr` | `/teacher/attendance/[sessionId]/scan`, `/student/qr-card` | `TC-ATT-004..010` |
| `رفع الملفات و المراجع و الملخصات` | `FR-LES-002` | `US-LES-001` | `/api/v1/content`, `/api/v1/uploads/presigned-url` | `/teacher/groups/[id]/content`, `/student/lessons` | `TC-LES-001` |
| `رفع تسجيلات المحاضرات` | `FR-LES-003` | `US-LES-001` | `/api/v1/content` | `/teacher/groups/[id]/content`, `/student/lessons/[id]` | `TC-LES-002` |
| `متابعة مشاهدة المحتوى` | `FR-LES-001` | `US-LES-002` | `/api/v1/content/:id/progress` | `/student/lessons/[id]` (`BunnyVideoPlayer`) | `TC-LES-003` |
| `انشاء الواجبات` | `FR-EXM-005` | `US-EXM-001` | `/api/v1/assessments` | `/teacher/assessments/create` | `TC-EXM-001` |
| `رفع الواجبات` | `FR-EXM-004` | `US-EXM-001` | `/api/v1/assessments` | `/teacher/assessments/create` | `TC-EXM-001` |
| `انشاء الامتحانات` | `FR-EXM-007` | `US-EXM-001` | `/api/v1/assessments` | `/teacher/assessments/create` (`AssessmentBuilder`) | `TC-EXM-002` |
| `رفع الامتحانات` | `FR-EXM-006` | `US-EXM-001` | `/api/v1/assessments` | `/teacher/assessments/create` | `TC-EXM-002` |
| `تسليم الواجبات و الامتحانات` | `FR-EXM-003` | `US-EXM-002` | `/api/v1/assessments/:id/submit` | `/student/assessments/[id]/take` (`ExamRunner`) | `TC-EXM-003` |
| `تصحيح الدرجات تلقائي` | `FR-EXM-002` | `US-EXM-003` | `/api/v1/assessments/:id/submit` | `/student/assessments/[id]/result` | `TC-EXM-004` |
| `عرض النتائج لي ولي الامر` | `FR-EXM-001` | `US-EXM-004` | `/api/v1/parent-portal/students/:id/overview` | `/parent/child/[id]/grades` | `TC-EXM-005` |
| `تقييمات + ملاحظات المدرس` | `FR-PAR-001` | `US-PAR-001` | `/api/v1/parent-portal/students/:id/overview` | `/parent/child/[id]/overview` | `TC-PAR-001` |
| `مستوى الطالب` | `FR-PAR-005` | `US-PAR-001` | `/api/v1/parent-portal/students/:id/overview` | `/parent/child/[id]/overview` | `TC-PAR-003` |
| `درجات الامتحانات` | `FR-PAR-003` | `US-PAR-001` | `/api/v1/parent-portal/students/:id/overview` | `/parent/child/[id]/grades` | `TC-PAR-002` |
| `حالة الواجبات` | `FR-PAR-002` | `US-PAR-002` | `/api/v1/parent-portal/students/:id/overview` | `/parent/child/[id]/homework` | `TC-PAR-004` |
| `الحضور و الغياب` | `FR-PAR-004` | `US-PAR-002` | `/api/v1/parent-portal/students/:id/overview` | `/parent/child/[id]/attendance` | `TC-PAR-005` |
| `اشعار قبل الحصة ب ساعه` | `FR-NOT-001` | `US-NOT-001` | `/api/v1/notifications` | `/components/layout/NotificationDrawer` | `TC-NOT-001` |
| `اشعار في حالة عدم حل الواجب` | `FR-NOT-002` | `US-NOT-002` | `/api/v1/notifications` | `/components/layout/NotificationDrawer` | `TC-NOT-002` |
| `اشعار امتحان جديد` | `FR-NOT-004` | `US-NOT-003` | `/api/v1/notifications` | `/components/layout/NotificationDrawer` | `TC-NOT-003` |
| `اشعار درجة امتحان الطالب` | `FR-NOT-003` | `US-NOT-003` | `/api/v1/notifications` | `/components/layout/NotificationDrawer` | `TC-NOT-004` |
| `اشعارات في حالة غياب الطالب` | `FR-NOT-005` | `US-NOT-004` | `/api/v1/notifications` | `/parent/child/[id]/attendance`, `NotificationDrawer` | `TC-NOT-005` |
| `حالة الدفع لكل طالب` | `FR-SUB-001` | `US-SUB-001` | `/api/v1/subscriptions/students/:id/payment-status` | `/teacher/subscriptions`, `/secretariat/payments` | `TC-SUB-001` |
| `ادارة ونشر الدورات الرقمية`| `FR-OL-001` | `US-OL-001` | `/api/v1/courses`, `/api/v1/courses/:id` | `/courses`, `/teacher/courses`, `/teacher/courses/[id]/edit` | `TC-OL-001..002` |
| `هيكلة الوحدات والدروس` | `FR-OL-002` | `US-OL-001` | `/api/v1/courses/:id/modules`, `/api/v1/courses/modules/:id/lessons` | `/teacher/courses/[id]/builder` | `TC-OL-003..004` |
| `الالتحاق بالدورة وصلاحية الوصول`| `FR-OL-003` | `US-OL-002` | `/api/v1/courses/:id/enroll`, `/api/v1/courses/my-courses` | `/courses/[id]`, `/student/my-courses` | `TC-OL-005..007` |
| `مشاهدة الدرس والوسائط` | `FR-OL-004` | `US-OL-003` | `/api/v1/courses/lessons/:lessonId` | `/courses/[id]/lessons/[lessonId]` (`CoursePlayer`) | `TC-OL-008..009` |
| `متابعة واستئناف التقدم` | `FR-OL-005` | `US-OL-004` | `/api/v1/courses/lessons/:lessonId/progress` | `/courses/[id]/lessons/[lessonId]`, `/student/my-courses` | `TC-OL-010..011` |
| `أداء امتحان الدورة الرقمية` | `FR-OL-006` | `US-OL-006` | `/api/v1/assessments/:id/submit` | `/courses/[id]/exams/[examId]` | `TC-OL-012..013` |
| `متابعة ولي الامر للدورات` | `FR-OL-007` | `US-OL-007` | `/api/v1/parent-portal/students/:studentId/courses` | `/parent/child/[id]/courses` | `TC-OL-014..015` |
| `المزامنة والعمل بدون اتصال` | `FR-OL-008` | `US-OL-005` | `/api/v1/sync/progress` | `/components/offline/SyncStatusBadge`, `offline-sync-worker` | `TC-OL-016..018` |

---

## 30. Open Architectural Decisions & Product Clarifications (`TBD`)

1. **`TBD — Frontend Refresh Token Mechanism`**: Architecture decision on whether to implement automated silent token refresh via Axios response interceptors once the backend refresh endpoint is finalized.
2. **`TBD — Commercial Checkout UI`**: Checkout flow and payment modal components remain deferred until payment gateways are defined.
3. **`TBD — Sound Theme Customization`**: Product decision on allowing teachers to select custom audio chimes for successful QR check-in events.

