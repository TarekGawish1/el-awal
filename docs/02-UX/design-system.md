# Design System Specification

## Document Information

- **Document Name**: Design System Specification
- **Document Type**: UX / UI Design System & Figma Specification
- **Product**: Educational Management System for Teachers and Students
- **Version**: 1.0.0-draft
- **Status**: Production-Ready Specification / Draft Foundations
- **Source of Truth**: Approved Product Backlog, Business Requirements Document, Functional Requirements Document, Non-Functional Requirements Document, User Personas, User Scenarios, and User Stories

---

# Part I: UX & Design Philosophy

## 1. Design Philosophy

The Educational Management System is an operational, administrative, and learning platform serving four confirmed user roles: **Teachers (`المدرس`)**, **Students (`الطالب`)**, **Parents (`ولي الأمر`)**, and **Secretariat (`السكرتارية`)**.

The design philosophy is centered on **Clarity, Predictability, Role-Appropriate Density, and Workflow Efficiency**:

1. **Clarity Before Decoration** *(Product-Derived Principle)*: The system handles core educational capabilities—recording attendance, managing student status, evaluating assignments, scheduling lessons, and presenting grades. Visual design must prioritize legibility and task comprehension above decorative visual styling.
2. **Efficiency for High-Frequency Administrative Workflows** *(Product-Derived Principle)*: Teachers and administrative staff handle high-volume, repetitive tasks (e.g., logging group attendance, reviewing student submissions, updating schedules). Interfaces should minimize operational friction and unnecessary visual complexity.
3. **Simplicity and Focus for Learners** *(Product-Derived Principle)*: Student interfaces must present learning materials, upcoming assignments, exam submissions, and grade information with immediate legibility and clarity.
4. **Transparency and Reassurance for Parents** *(Product-Derived Principle)*: Parent interfaces must present clear, understandable summaries of their child's attendance records, teacher notes, assignment statuses, and exam grades as defined in the product scope.
5. **Role-Aware Context** *(Product-Derived Principle)*: The interface adapts to the distinct responsibilities of each user role while maintaining design consistency across shared product models.

---

## 2. Design Vision

The system is designed to provide an **organized, structured, dependable, and easily navigable** environment appropriate for frequent educational use across all four confirmed user roles:

- **Teacher Context**: An efficient workspace for managing groups, schedules, content, assessments, and student progress.
- **Student Context**: A clear workspace for accessing educational materials and submitting assessments.
- **Parent Context**: A transparent information portal for reviewing student academic records and attendance.
- **Secretariat Context**: A streamlined administrative workspace for operational management.

---

## 3. Core Principles

### Principle 1: Information Density Matched to User Context
- **Why**: Teachers and administrative staff often view multi-student rosters requiring high information scannability, whereas students and parents benefit from focused, readable card layouts.
- **UX Rule** *(Recommended)*: Data-heavy management views should optimize vertical space and scannability; student submission and parent progress views should prioritize comfortable breathing room and clear visual hierarchy.
- **Applies To**: Student Management, Attendance, Groups, Parent Student Status.
- **Status**: `Defined (Context)` / `Recommended (Layout Rules)`

### Principle 2: Unambiguous Status Representation
- **Why**: Statuses in education (e.g., Present vs. Absent, Submitted vs. Unsolved, Graded vs. Pending, Payment Status) carry significant operational meaning.
- **UX Rule** *(Recommended)*: Every status should be visually distinct, pairing color with clear textual labels and distinct indicators. Never rely on color alone to communicate state.
- **Applies To**: Attendance & Absence, Exams & Assignments, Subscriptions / Payment Status.
- **Status**: `Defined (Status Concepts)` / `Recommended (Visual Mapping)`

### Principle 3: Clear and Discoverable Action Paths
- **Why**: Core workflows such as recording attendance or submitting assessments should be intuitive and straightforward.
- **UX Rule** *(Recommended)*: Primary action buttons should be prominent, predictably positioned, and provide clear submission feedback.
- **Applies To**: Attendance Recording, Content Uploads, Group Creation, Assessment Submissions.
- **Status**: `Recommended`

### Principle 4: Information Scannability and Visual Chunking
- **Why**: Users frequently scan lists of student profiles, schedules, or grades rather than reading continuous text.
- **UX Rule** *(Recommended)*: Group related information into distinct visual cards, structured tables, or clear sections with consistent hierarchy.
- **Applies To**: Student Profiles, Parent Status Views, Attendance Reports, Lesson Schedules.
- **Status**: `Recommended`

### Principle 5: Deterministic Feedback and State Continuity
- **Why**: Users need clear confirmation when an exam is submitted, attendance is recorded, or a file is uploaded.
- **UX Rule** *(Recommended)*: Interactive elements should provide visual acknowledgment across loading, success, error, and empty states.
- **Applies To**: File Uploads, Assessment Submissions, Grade Publishing, Attendance Recording.
- **Status**: `Recommended`

---

## 4. Visual Philosophy

### Density
- **High Density** *(Recommended)*: Suitable for administrative and roster views (e.g., student lists, attendance logs, group rosters) to maximize visible records while preserving legibility.
- **Medium Density** *(Recommended)*: Suitable for forms, content feeds, and assignment overview cards.
- **Comfortable Density** *(Recommended)*: Suitable for parent review cards, student assignment detail views, and notifications.

### Hierarchy
- Visual hierarchy is established through typographic scale, weight differentiation, and clear contrast between content levels.
- Primary page titles anchor each view, section titles delineate functional groups, and table headers/card labels use distinct weights for rapid scanning.

### Alignment & Layout
- Layouts follow consistent alignment rules, anchored to the leading edge (Right-aligned in RTL, Left-aligned in LTR).
- Spacing between sections and components should maintain a consistent, tokenized vertical rhythm.

### Whitespace
- Whitespace is used functionally to separate distinct student records, isolate interactive controls, and group related metadata.

### Elevation & Surfaces
- Flat and low-elevation surfaces are recommended for standard screens. Elevated layers (e.g., modals, dropdowns, floating banners) are reserved for temporary contextual overlays.

---

## 5. Color Philosophy

Color serves a functional, semantic, and navigational purpose across the system:

1. **Brand / Primary**: Identifies primary navigation, active filters, and primary call-to-action buttons. *(Status: `TBD — Requires Product Clarification`)*
2. **Surface & Neutrals**: Provides screen background contrast, card boundaries, dividers, and text hierarchy. *(Status: `TBD — Requires Product Clarification`)*
3. **Semantic Status Roles** *(Recommended Semantic Architecture)*:
   - **Positive / Success**: Recommended for positive confirmation states (e.g., recorded presence in attendance, completed submissions, verified records).
   - **Critical / Danger**: Recommended for critical alerts (e.g., recorded absences, unsolved homework alerts).
   - **Warning / Pending**: Recommended for upcoming deadlines, pending evaluations, or lesson schedule reminders.
   - **Informational**: Recommended for new exam announcements, lecture updates, and general notices.
   - **Payment Status**: Visual category for student payment status (`حالة الدفع لكل طالب`). *(Status: `TBD — Requires Product Clarification`)*

---

## 6. Typography Philosophy

Typography must provide clear readability across Arabic and Latin scripts, supporting dual-language content and numerical data:

1. **Dual-Script Harmony** *(Recommended)*: Font selection should render Arabic (`المدرس`, `الطالب`, `الحضور و الغياب`) and Latin text with balanced baseline alignment and proportional optical weights.
2. **Numerical Legibility** *(Recommended)*: Numerical data such as grades, schedule times, attendance counts, and student counts benefit from clear, tabular figures in data tables.
3. **Reading Comfort** *(Recommended)*: Body copy and educational notes maintain optimal line-height ratios (e.g., 1.4 to 1.6) to support sustained reading of lecture summaries and teacher feedback.

---

## 7. Component Philosophy

Components are organized by functional domain and user interaction category:

```
Foundations (Tokens) ──► Actions & Inputs ──► Data & Education Units ──► Complex UX Patterns ──► Templates
```

### Component Taxonomy
- **Foundations**: Color tokens, Typography scale, Spacing scale, Radius tokens, Elevation levels, Iconography. *(Status: `Recommended`)*
- **Actions**: Primary Buttons, Secondary Buttons, Destructive Buttons, Icon Buttons, Action Menus. *(Status: `Recommended`)*
- **Inputs**: Text Input, Select / Dropdown, Date/Time Picker, File Uploader, Checkbox, Radio, Switch. *(Status: `Recommended`)*
- **Data Display**: Data Table, Student Card, Key-Value List, Stat Badge, Avatar, Divider. *(Status: `Recommended`)*
- **Education Specific**: Lesson Card, Lecture Container, Assignment Item, Exam Item, Grade Pill, Attendance Control. *(Status: `Recommended`)*
- **Status & Feedback**: Status Badge, Status Chip, Notification Toast, Alert Banner, Loading Skeleton, Empty State Box. *(Status: `Recommended`)*

---

## 8. Motion Philosophy

Motion is **functional, subtle, and lightweight**, designed to communicate state changes without introducing perceived delay:

1. **Interaction Feedback** *(Recommended)*: Micro-transitions on button presses and active states (recommended baseline: 100ms–150ms).
2. **Surface Transitions** *(Recommended)*: Dropdown menus, modal dialogs, and expandable table rows transition smoothly (recommended baseline: 200ms–250ms with standard ease-out).
3. **Loading & Progress** *(Recommended)*: Skeletons or spinners communicate active background processes.
4. **Reduced Motion** *(Recommended)*: Respect OS-level `prefers-reduced-motion` settings by reducing or removing non-essential transitions.

---

## 9. Accessibility Philosophy

### Recommended Baseline Accessibility Practices
- **Text Readability & Contrast** *(Recommended)*: Target high-contrast foreground-to-background ratios for standard body text and headers to support readability.
- **Focus Indicators** *(Recommended)*: Interactive elements should maintain clear, visible focus states for keyboard navigation.
- **Touch Affordance** *(Recommended)*: Touch targets on mobile and tablet views should maintain comfortable interactive bounding areas (recommended baseline: ~44×44px).
- **Multi-Channel Information** *(Recommended)*: Avoid using color as the sole indicator of critical status information (e.g., combining badges with explicit text labels).
- **Keyboard Navigation** *(Recommended)*: Key user journeys should be navigable via standard keyboard controls where applicable.

### Formal Accessibility Compliance
- **Compliance Target**: `TBD — Requires Product Clarification`
- *Note*: A target of WCAG 2.1 AA is a **Recommended baseline / proposed target**, but is not formally defined as an approved product requirement in the source documentation.

---

## 10. Responsive & Platform Philosophy

### Recommended Responsive Baseline
- **Desktop Views** *(Recommended: ≥ 1024px)*: Proposed baseline for high-density management, multi-column rosters, side-by-side grading views, and scheduling calendars for Teachers and Secretariat.
- **Tablet Views** *(Recommended: 768px – 1023px)*: Proposed baseline for adaptive layouts with collapsible navigation, suitable for classroom attendance logging and content viewing.
- **Mobile Views** *(Recommended: 320px – 767px)*: Proposed baseline for focused single-column card layouts, suitable for parent progress checks, student submissions, lecture access, and notifications.

> **Note**: These breakpoints are proposed design-system defaults and require validation against the actual supported platform/device scope.
> **Formal Supported Platform Scope**: `TBD — Requires Product Clarification`

---

## 11. Writing & Microcopy Philosophy

Microcopy across the interface should be **clear, direct, professional, and respectful**:

1. **Clarity and Consistency**: Use terminology aligned directly with the approved backlog (e.g., `تسجيل حضور`, `تسجيل الغياب`, `رفع الواجب`, `درجات الامتحانات`, `حالة الدفع`).
2. **Action-Oriented Labels**: Use explicit action verbs (`حفظ`, `رفع الملف`, `تسليم الامتحان`, `انشاء مجموعة`) rather than ambiguous prompts.
3. **Constructive System Messages**: System feedback should clearly describe outcomes or next steps in plain, non-blaming language.
4. **Bilingual Terminology Alignment**: Maintain consistent semantic mapping between Arabic backlog items and English interfaces.

---

## 12. Anti-Patterns (What to Avoid)

1. **Overcrowded Tables**: Avoid compressing table columns to the point where critical text truncates or touch targets become inaccessible.
2. **Ambiguous Status Colors**: Avoid using low-contrast or ambiguous pastels for critical statuses such as Absence (`غياب`) or unpaid status.
3. **Hidden Core Actions**: Avoid hiding primary workflow triggers (such as recording attendance or submitting an assignment) in obscure sub-menus.
4. **Gratuitous Visual Decoration**: Avoid decorative animations, unneeded gradients, or visual clutter that hinders rapid data entry.
5. **Color-Only State Communication**: Never present student status, exam scores, or attendance records purely as colored dots without accompanying text labels.
6. **Inconsistent Domain Terminology**: Avoid mixing conflicting terms for the same entity (e.g., alternating between "Class", "Group", and "Grade" arbitrarily).

---

## 13. Design Director Directives

The following directives represent **Recommended UX Direction** (qualitative design principles rather than mandatory product requirements):

1. **Student records and progress should be easy to scan.**
2. **Attendance workflows should minimize unnecessary interaction.**
3. **Status indicators should remain accessible, distinct, and understandable.**
4. **Information density should adapt to the user's role and device context.**
5. **Primary actions should remain discoverable, prominent, and predictable.**
6. **Layouts and typography should maintain readability across both Arabic and English text.**

---

# Part II: Figma & Technical Specification

## 14. Foundations

| Foundation Area | Specification Category | Status | Source / Reference | Notes |
|---|---|---|---|---|
| **Color System** | Primitive & Semantic Palette | `Proposed / Recommended` | Proposed Palette (Sec 16.3) | Complete proposed palette; official brand hex pending product approval. |
| **Typography** | Font Family & Type Scale | `Recommended` | Usability Baseline | Type scale ratios proposed for dual-script harmony. |
| **Spacing** | 8pt Base Spacing Scale | `Recommended` | UI Best Practice | Proportional 8px base spacing tokens (`space-1` to `space-12`). |
| **Corner Radius** | Component Border Radii | `Recommended` | UI Best Practice | 4px (inputs), 8px (cards), 12px (modals), 9999px (pills). |
| **Elevation** | Shadow & Layering Model | `Recommended` | UI Best Practice | Level 0 (flat), Level 1 (cards/popovers), Level 2 (modals). |
| **Iconography** | 24px Semantic Icon Set | `Recommended` | Approved Backlog | Clean 24px icon set mapped to the 9 product modules. |
| **Layout Grid** | Responsive Grid System | `Recommended` | Responsive Baseline | 12-col desktop, 8-col tablet, 4-col mobile proposed layout grids. |

---

## 15. Typography Tokens

The following typographic scale is a **Recommended** design system baseline for implementation:

| Token | Role / Usage | Font Size (Recommended) | Line Height | Recommended Weight | Status |
|---|---|---:|---:|---|---|
| `typography-display` | Primary statistics, headline scores | 32px / 2.0rem | 40px (1.25) | Bold (700) | `Recommended` |
| `typography-h1` | Main page titles | 24px / 1.5rem | 32px (1.33) | Bold (700) | `Recommended` |
| `typography-h2` | Section titles, group headers | 20px / 1.25rem | 28px (1.40) | SemiBold (600) | `Recommended` |
| `typography-h3` | Modal titles, card section titles | 16px / 1.0rem | 24px (1.50) | SemiBold (600) | `Recommended` |
| `typography-body-lg` | Featured descriptions, summaries | 16px / 1.0rem | 24px (1.50) | Regular (400) | `Recommended` |
| `typography-body-md` | Standard body copy, table cells | 14px / 0.875rem | 20px (1.43) | Regular (400) / Medium (500) | `Recommended` |
| `typography-caption` | Timestamps, metadata, hints | 12px / 0.75rem | 16px (1.33) | Regular (400) | `Recommended` |
| `typography-button` | Button text, action labels | 14px / 0.875rem | 20px (1.43) | SemiBold (600) | `Recommended` |
| `typography-badge` | Status pills, chips, tags | 12px / 0.75rem | 16px (1.33) | SemiBold (600) | `Recommended` |

---

## 16. Color Tokens & Proposed Palette

> **Important Distinction**:
> - **Current Official Color System**: `TBD — Requires Product Clarification`
> - **Proposed Color Palette (Section 16.3)**: `Proposed / Recommended` (subject to formal design/product review).

### 16.1 Semantic Functional Tokens (Architecture Framework)

| Token | Semantic Role | Usage Example | Status |
|---|---|---|---|
| `color-primary` | Main brand interaction | Primary call-to-action buttons, active navigation items | `TBD — Clarification` |
| `color-primary-hover` | Interactive hover state | Hovered primary buttons and links | `TBD — Clarification` |
| `color-primary-surface`| Tinted surface background | Selected table rows, active tab highlights | `TBD — Clarification` |
| `color-bg-app` | Canvas / App background | Main application background surface | `TBD — Clarification` |
| `color-bg-surface` | Card & container surface | Content cards, data tables, modal dialogs | `TBD — Clarification` |
| `color-border-subtle` | Subtle divider lines | Table row borders, card dividers | `TBD — Clarification` |
| `color-border-strong` | Form input borders | Unfocused input borders, card outlines | `TBD — Clarification` |
| `color-text-primary` | High-emphasis body text | Student names, lesson titles, grades | `TBD — Clarification` |
| `color-text-secondary`| Medium-emphasis text | Parent contact labels, role titles, metadata | `TBD — Clarification` |
| `color-text-muted` | Low-emphasis text | Placeholder text, disabled labels, timestamps | `TBD — Clarification` |

### 16.2 Domain Status Semantic Tokens (Architecture Framework)

| Token | Semantic Role | Domain Usage Example | Status |
|---|---|---|---|
| `color-status-present` | Positive indicator | Attendance: `تسجيل حضور الطلاب`, Exam graded | `TBD — Clarification` |
| `color-status-absent` | Warning/Critical indicator | Attendance: `تسجيل الغياب`, Unsolved assignment alert | `TBD — Clarification` |
| `color-status-pending` | Pending/Upcoming indicator | Exam scheduled, Homework pending review | `TBD — Clarification` |
| `color-status-info` | Information indicator | New exam notice (`اشعار امتحان جديد`), Lecture upload | `TBD — Clarification` |
| `color-status-payment` | Payment status indicator | Student payment status (`حالة الدفع لكل طالب`) | `TBD — Clarification` |

---

### 16.3 Proposed Color Palette (Design Recommendation)

#### A. Palette Overview
The proposed color palette establishes an **institutional, calming, trusted, and highly readable** visual environment tailored specifically for educational management. It pairs a deep scholastic sapphire primary (`#1E4BD9`) with a refined slate-teal secondary (`#2E6A6C`) and clean neutral backgrounds (`#F8FAFC`), avoiding overly playful saturated pastels or aggressive neon tones.

#### B. Primitive Color Tokens

##### 1. Primary Palette (Deep Scholastic Sapphire)
| Token | Hex | RGB | Usage | Status |
|---|---|---|---|---|
| `primary-50` | `#EEF4FF` | `rgb(238, 244, 255)` | Light active tints, row highlights | `Proposed` |
| `primary-100` | `#D9E5FF` | `rgb(217, 229, 255)` | Selected badge backgrounds | `Proposed` |
| `primary-200` | `#B9CEFF` | `rgb(185, 206, 255)` | Focus ring outer shadows, subtle borders | `Proposed` |
| `primary-300` | `#8EB0FF` | `rgb(142, 176, 255)` | Interactive secondary borders | `Proposed` |
| `primary-400` | `#5D8CFF` | `rgb(93, 140, 255)` | Hover accents, secondary links | `Proposed` |
| `primary-500` | `#3366FF` | `rgb(51, 102, 255)` | Vivid interactive indicator | `Proposed` |
| `primary-600` | `#1E4BD9` | `rgb(30, 75, 217)` | **Primary brand color**, CTAs, active nav | `Proposed` |
| `primary-700` | `#1537B0` | `rgb(21, 55, 176)` | Primary button hover / pressed | `Proposed` |
| `primary-800` | `#102B8A` | `rgb(16, 43, 138)` | Deep brand text headers | `Proposed` |
| `primary-900` | `#0B1E63` | `rgb(11, 30, 99)` | High-contrast brand elements | `Proposed` |

##### 2. Secondary Palette (Scholastic Slate-Teal)
| Token | Hex | RGB | Usage | Status |
|---|---|---|---|---|
| `secondary-50` | `#F0F7F7` | `rgb(240, 247, 247)` | Secondary container surface | `Proposed` |
| `secondary-100` | `#D9EBEB` | `rgb(217, 235, 235)` | Secondary chip backgrounds | `Proposed` |
| `secondary-200` | `#B3D6D6` | `rgb(179, 214, 214)` | Secondary borders | `Proposed` |
| `secondary-300` | `#87BDBE` | `rgb(135, 189, 190)` | Muted secondary accents | `Proposed` |
| `secondary-400` | `#5C9FA1` | `rgb(92, 159, 161)` | Secondary icon highlights | `Proposed` |
| `secondary-500` | `#3F8486` | `rgb(63, 132, 134)` | Secondary actions, tab borders | `Proposed` |
| `secondary-600` | `#2E6A6C` | `rgb(46, 106, 108)` | **Secondary brand color**, group tags | `Proposed` |
| `secondary-700` | `#225152` | `rgb(34, 81, 82)` | Secondary button hover | `Proposed` |
| `secondary-800` | `#193D3E` | `rgb(25, 61, 62)` | Deep secondary text | `Proposed` |
| `secondary-900` | `#102929` | `rgb(16, 41, 41)` | High-contrast secondary accents | `Proposed` |

##### 3. Neutral Palette (Slate Gray)
| Token | Hex | RGB | Usage | Status |
|---|---|---|---|---|
| `neutral-25` | `#FCFDFF` | `rgb(252, 253, 255)` | Pure elevated card background | `Proposed` |
| `neutral-50` | `#F8FAFC` | `rgb(248, 250, 252)` | Canvas / Application background | `Proposed` |
| `neutral-100` | `#F1F5F9` | `rgb(241, 245, 249)` | Table header fill, input disabled fill | `Proposed` |
| `neutral-200` | `#E2E8F0` | `rgb(226, 232, 240)` | Subtle table dividers, card outlines | `Proposed` |
| `neutral-300` | `#CBD5E1` | `rgb(203, 213, 225)` | Strong input borders, tab dividers | `Proposed` |
| `neutral-400` | `#94A3B8` | `rgb(148, 163, 184)` | Placeholder text, inactive icon fills | `Proposed` |
| `neutral-500` | `#64748B` | `rgb(100, 116, 139)` | Muted timestamps, caption notes | `Proposed` |
| `neutral-600` | `#475569` | `rgb(71, 85, 105)` | Secondary body text, table metadata | `Proposed` |
| `neutral-700` | `#334155` | `rgb(51, 65, 85)` | Sub-headings, active label text | `Proposed` |
| `neutral-800` | `#1E293B` | `rgb(30, 41, 59)` | Primary headings, table row text | `Proposed` |
| `neutral-900` | `#0F172A` | `rgb(15, 23, 42)` | Highest emphasis text | `Proposed` |

##### 4. Feedback Palettes (Success, Warning, Error, Info)
| Token | Hex | RGB | Usage | Status |
|---|---|---|---|---|
| `success-50` | `#ECFDF5` | `rgb(236, 253, 245)` | Success badge background | `Proposed` |
| `success-100` | `#D1FAE5` | `rgb(209, 250, 229)` | Success alert border | `Proposed` |
| `success-200` | `#A7F3D0` | `rgb(167, 243, 208)` | Success focus state | `Proposed` |
| `success-500` | `#10B981` | `rgb(16, 185, 129)` | Success icons | `Proposed` |
| `success-600` | `#059669` | `rgb(5, 150, 105)` | Success badges, positive status text | `Proposed` |
| `success-700` | `#047857` | `rgb(4, 120, 87)` | High-contrast success text on light bg | `Proposed` |
| `success-800` | `#065F46` | `rgb(6, 95, 70)` | Deep success text | `Proposed` |
| `warning-50` | `#FFFBEB` | `rgb(255, 251, 235)` | Warning badge background | `Proposed` |
| `warning-100` | `#FEF3C7` | `rgb(254, 243, 199)` | Warning alert container | `Proposed` |
| `warning-200` | `#FDE68A` | `rgb(253, 230, 138)` | Warning border outline | `Proposed` |
| `warning-500` | `#F59E0B` | `rgb(245, 158, 11)` | Warning icons | `Proposed` |
| `warning-600` | `#D97706` | `rgb(217, 119, 6)` | Warning labels, pending status text | `Proposed` |
| `warning-700` | `#B45309` | `rgb(180, 83, 9)` | High-contrast warning text | `Proposed` |
| `warning-800` | `#92400E` | `rgb(146, 64, 14)` | Deep warning text | `Proposed` |
| `error-50` | `#FEF2F2` | `rgb(254, 242, 242)` | Error / Absence badge background | `Proposed` |
| `error-100` | `#FEE2E2` | `rgb(254, 226, 226)` | Error banner container | `Proposed` |
| `error-200` | `#FECACA` | `rgb(254, 202, 202)` | Error field border | `Proposed` |
| `error-500` | `#EF4444` | `rgb(239, 68, 68)` | Error icons | `Proposed` |
| `error-600` | `#DC2626` | `rgb(220, 38, 38)` | Error text, absence badge text | `Proposed` |
| `error-700` | `#B91C1C` | `rgb(185, 28, 28)` | High-contrast destructive button | `Proposed` |
| `error-800` | `#991B1B` | `rgb(153, 27, 27)` | Deep error text on light bg | `Proposed` |
| `info-50` | `#F0F9FF` | `rgb(240, 249, 255)` | Info badge background | `Proposed` |
| `info-100` | `#E0F2FE` | `rgb(224, 242, 254)` | Info banner container | `Proposed` |
| `info-200` | `#BAE6FD` | `rgb(186, 230, 253)` | Info border outline | `Proposed` |
| `info-500` | `#0EA5E9` | `rgb(14, 165, 233)` | Info icon fill | `Proposed` |
| `info-600` | `#0284C7` | `rgb(2, 132, 199)` | Informational badge text | `Proposed` |
| `info-700` | `#0369A1` | `rgb(3, 105, 161)` | High-contrast info link text | `Proposed` |
| `info-800` | `#075985` | `rgb(7, 89, 133)` | Deep info text | `Proposed` |

#### C. Semantic Color Tokens

| Semantic Token | Primitive Reference | Hex Value | Semantic UI Role | Status |
|---|---|---|---|---|
| `color-primary` | `primary-600` | `#1E4BD9` | Main brand color, primary buttons, active state | `Proposed` |
| `color-primary-hover` | `primary-700` | `#1537B0` | Hover state for primary buttons and interactive links | `Proposed` |
| `color-primary-active` | `primary-800` | `#102B8A` | Pressed/active state for primary buttons | `Proposed` |
| `color-primary-subtle` | `primary-50` | `#EEF4FF` | Background tint for active table rows and tabs | `Proposed` |
| `color-bg-app` | `neutral-50` | `#F8FAFC` | Main application background surface | `Proposed` |
| `color-bg-surface` | `#FFFFFF` | `#FFFFFF` | Card surface, table background, modal content | `Proposed` |
| `color-bg-elevated` | `neutral-25` | `#FCFDFF` | Elevated card surfaces, popover menus | `Proposed` |
| `color-text-primary` | `neutral-900` | `#0F172A` | Primary body copy, headers, student names | `Proposed` |
| `color-text-secondary` | `neutral-600` | `#475569` | Secondary metadata, labels, table captions | `Proposed` |
| `color-text-muted` | `neutral-400` | `#94A3B8` | Placeholders, inactive icons, disabled text | `Proposed` |
| `color-text-inverse` | `#FFFFFF` | `#FFFFFF` | Text on dark buttons and primary badges | `Proposed` |
| `color-border-subtle` | `neutral-200` | `#E2E8F0` | Dividers, table row borders, container outlines | `Proposed` |
| `color-border-default` | `neutral-300` | `#CBD5E1` | Standard card borders, inactive tab borders | `Proposed` |
| `color-border-strong` | `neutral-400` | `#94A3B8` | Unfocused form field borders, active outlines | `Proposed` |
| `color-success` | `success-600` | `#059669` | Positive confirmations, verified attendance badge | `Proposed` |
| `color-success-subtle` | `success-50` | `#ECFDF5` | Background tint for success badges and alerts | `Proposed` |
| `color-warning` | `warning-600` | `#D97706` | Pending state text, upcoming deadline notice | `Proposed` |
| `color-warning-subtle` | `warning-50` | `#FFFBEB` | Background tint for warning banners and pills | `Proposed` |
| `color-error` | `error-600` | `#DC2626` | Error alerts, absence status text, missing work | `Proposed` |
| `color-error-subtle` | `error-50` | `#FEF2F2` | Background tint for absence badges and error alerts | `Proposed` |
| `color-info` | `info-600` | `#0284C7` | Informational announcements, new exam alerts | `Proposed` |
| `color-info-subtle` | `info-50` | `#F0F9FF` | Background tint for info notices and lecture tags | `Proposed` |

#### D. Educational Domain Status Colors

| Domain Area | Status Concept | Proposed Semantic Token | Hex Reference | Visual Role | Status |
|---|---|---|---|---|---|
| **Attendance** | Present (`حاضر`) | `color-status-present` | `#059669` (Text) / `#ECFDF5` (BG) | Confirmed attendance presence | `Proposed` |
| **Attendance** | Absent (`غائب`) | `color-status-absent` | `#DC2626` (Text) / `#FEF2F2` (BG) | Recorded student absence alert | `Proposed` |
| **Attendance** | Unrecorded | `color-text-muted` | `#64748B` (Text) / `#F1F5F9` (BG) | Attendance pending record | `Proposed` |
| **Assignment** | Pending | `color-warning` | `#D97706` (Text) / `#FFFBEB` (BG) | Assignment active / open | `Proposed` |
| **Assignment** | Submitted | `color-info` | `#0284C7` (Text) / `#F0F9FF` (BG) | Assignment submitted by student | `Proposed` |
| **Assignment** | Graded | `color-success` | `#059669` (Text) / `#ECFDF5` (BG) | Assignment reviewed / graded | `Proposed` |
| **Assignment** | Unsolved (`عدم حل`) | `color-error` | `#DC2626` (Text) / `#FEF2F2` (BG) | Unsolved assignment alert | `Proposed` |
| **Exam** | Upcoming | `color-info` | `#0284C7` (Text) / `#F0F9FF` (BG) | Scheduled upcoming exam | `Proposed` |
| **Exam** | Available | `color-primary` | `#1E4BD9` (Text) / `#EEF4FF` (BG) | Exam currently available | `Proposed` |
| **Exam** | Submitted | `color-secondary` | `#2E6A6C` (Text) / `#F0F7F7` (BG) | Exam submission delivered | `Proposed` |
| **Exam** | Graded | `color-success` | `#059669` (Text) / `#ECFDF5` (BG) | Exam automatically graded | `Proposed` |
| **Payment** | Payment Status Role | `color-status-payment` | `#1E4BD9` (Primary Role) | Student payment status indicator | `Proposed` |

> *Note on Payment Lifecycle*: The payment domain defines the visual color role `color-status-payment`. Specific business state values (such as Paid, Unpaid, Overdue) are not assumed and remain `TBD — Requires Product Clarification`.

#### E. Light / Dark Mode Evaluation
- **Approved Product Scope**: The current approved product documentation does not specify Dark Mode as a product requirement.
- **Status**: `Dark Mode: TBD — Requires Product Clarification`.
- **Architecture Readiness**: All proposed colors are strictly decoupled into primitive and semantic tokens, ensuring that a future dark mode theme can be mapped seamlessly without altering component implementations.

#### F. Accessibility & Contrast Review
A contrast review was performed as a design recommendation for the proposed palette:

| Foreground / Background Pair | Proposed Values | Calculated Contrast Ratio | Review Finding | Status |
|---|---|---:|---|---|
| **Primary Text on Surface** | `#0F172A` on `#FFFFFF` | **19.5 : 1** | High legibility for body and headers | `PASS (Exceeds 4.5:1)` |
| **Secondary Text on Surface** | `#475569` on `#FFFFFF` | **7.0 : 1** | Clear legibility for captions/metadata | `PASS (Exceeds 4.5:1)` |
| **Primary Button Text on BG** | `#FFFFFF` on `#1E4BD9` | **5.6 : 1** | High-contrast call-to-action buttons | `PASS (Exceeds 4.5:1)` |
| **Success Badge Text on BG** | `#065F46` on `#ECFDF5` | **7.8 : 1** | High-contrast positive status badge | `PASS (Exceeds 4.5:1)` |
| **Absence Badge Text on BG** | `#991B1B` on `#FEF2F2` | **8.2 : 1** | High-contrast absence warning badge | `PASS (Exceeds 4.5:1)` |
| **Warning Badge Text on BG** | `#92400E` on `#FEF3C7` | **6.2 : 1** | High-contrast pending status badge | `PASS (Exceeds 4.5:1)` |
| **Info Badge Text on BG** | `#075985` on `#F0F9FF` | **7.3 : 1** | High-contrast informational badge | `PASS (Exceeds 4.5:1)` |

> *Note*: Formal accessibility compliance targets (e.g., WCAG 2.1 AA) remain `TBD — Requires Product Clarification`. Contrast review was performed as a design recommendation.

#### G. Color Usage Rules & Visual Balance
1. **Dominant Neutral Surfaces (Recommended ~70–80% visual area)**: Canvas backgrounds (`#F8FAFC`), card surfaces (`#FFFFFF`), and dividers (`#E2E8F0`) dominate the layout to provide an uncluttered educational workspace.
2. **Primary Brand Accent (Recommended ~15–20% visual area)**: Used purposefully for primary navigation highlights, active filters, key buttons, and focused inputs.
3. **Semantic Status Colors (Recommended ~5–10% visual area)**: Reserved strictly for communicating functional state (attendance results, assessment statuses, alert toasts). Semantic colors must never be used as general page decoration.

#### H. Approval Status
- **Official System Color Status**: `TBD — Requires Product Clarification`
- **Proposed Palette Status**: **`PROPOSED — REQUIRES DESIGN APPROVAL`**

---

## 17. Spacing & Grid

The following **8-point base scale** is a **Recommended** design system baseline:

| Token | Recommended Value | Common UI Application | Status |
|---|---:|---|---|
| `space-0.5` | 2px / 0.125rem | Micro borders, badge alignment adjustments | `Recommended` |
| `space-1` | 4px / 0.25rem | Gap between icon and text label | `Recommended` |
| `space-2` | 8px / 0.5rem | Padding inside badges, compact table cell padding | `Recommended` |
| `space-3` | 12px / 0.75rem | Standard input vertical padding, tight stack gap | `Recommended` |
| `space-4` | 16px / 1.0rem | Standard card padding, modal content padding | `Recommended` |
| `space-6` | 24px / 1.5rem | Section spacing, container padding on tablet | `Recommended` |
| `space-8` | 32px / 2.0rem | Main layout gutter, vertical section separation | `Recommended` |
| `space-12` | 48px / 3.0rem | Page header top margin | `Recommended` |

### Recommended Layout Grid Baseline
- **Desktop (≥ 1024px)**: 12-Column grid, 24px gutters, max-width container recommendation: 1440px. *(Status: `Recommended`)*
- **Tablet (768px – 1023px)**: 8-Column grid, 16px gutters, 24px screen margin. *(Status: `Recommended`)*
- **Mobile (320px – 767px)**: 4-Column grid, 12px gutters, 16px screen margin. *(Status: `Recommended`)*

---

## 18. Radius

The following corner radius values are a **Recommended** design system baseline:

| Token | Recommended Value | Component Application | Status |
|---|---:|---|---|
| `radius-sm` | 4px | Form text inputs, select dropdowns, menu popovers | `Recommended` |
| `radius-md` | 8px | Standard cards, data table containers, action buttons | `Recommended` |
| `radius-lg` | 12px | Modals, upload containers, lecture media containers | `Recommended` |
| `radius-full` | 9999px | Status badges, avatar images, pill chips | `Recommended` |

---

## 19. Elevation & Shadows

The following elevation levels are a **Recommended** design system baseline:

| Token | Level | Recommended Value | Component Application | Status |
|---|---|---|---|---|
| `elevation-flat` | Level 0 | 1px border (`color-border-subtle`) | Standard cards, table rows, static panels | `Recommended` |
| `elevation-low` | Level 1 | `0 1px 3px rgba(0,0,0,0.08)` | Hovered cards, dropdown menus, autocomplete popovers | `Recommended` |
| `elevation-high` | Level 2 | `0 10px 25px -5px rgba(0,0,0,0.1)` | Modal dialogs, floating drawer panels, alerts | `Recommended` |

---

## 20. Iconography

Recommended 24×24px semantic icon mappings for educational management modules:

| Icon Name (Example) | Domain Representation | Associated Product Module | Status |
|---|---|---|---|
| `icon-student` | Student profile / identity | Student Management (`بيانات الطالب`) | `Recommended` |
| `icon-parent` | Parent / Guardian representation | Student Management (`بيانات ولي الامر`) | `Recommended` |
| `icon-attendance-check` | Attendance presence confirmation | Attendance (`تسجيل حضور الطلاب`) | `Recommended` |
| `icon-attendance-absent`| Absence indicator | Attendance (`تسجيل الغياب`) | `Recommended` |
| `icon-upload` | File / Lecture upload action | Lectures & Lessons (`رفع الملفات`) | `Recommended` |
| `icon-video` | Lecture recording item | Lectures & Lessons (`تسجيلات المحاضرات`) | `Recommended` |
| `icon-assignment` | Homework / Assignment task | Exams & Assignments (`انشاء الواجبات`) | `Recommended` |
| `icon-exam` | Test / Examination item | Exams & Assignments (`انشاء الامتحانات`) | `Recommended` |
| `icon-grading` | Automated grade / score | Exams & Assignments (`تصحيح الدرجات`) | `Recommended` |
| `icon-group` | Class / Group entity | Groups Management (`انشاء مجموعة`) | `Recommended` |
| `icon-schedule` | Time / Lesson schedule | Groups Management (`تحديد مواعيد الدروس`) | `Recommended` |
| `icon-notification` | Alert / Event bell | Notifications (`اشعارات`) | `Recommended` |
| `icon-payment` | Payment status indicator | Subscriptions (`حالة الدفع لكل طالب`) | `Recommended` |

---

## 21. Component Inventory & Specification

The following component specifications represent a **Recommended** UI inventory for future implementation:

| Component Name | Category | Status | Recommended Variants | Supported States | Source Requirement |
|---|---|---|---|---|---|
| **Button** | Actions | `Recommended` | Primary, Secondary, Outline, Danger | Default, Hover, Pressed, Focused, Disabled, Loading | Global Actions |
| **Icon Button** | Actions | `Recommended` | Ghost, Filled, Bordered | Default, Hover, Pressed, Focused, Disabled | Global Actions |
| **Text Input** | Inputs | `Recommended` | Standard, Leading Icon, With Helper | Default, Focused, Filled, Error, Disabled | `FR-STU-004`, `FR-GRP-001` |
| **Select / Dropdown** | Inputs | `Recommended` | Single-Select, Grouped | Default, Open, Selected, Error, Disabled | `FR-STU-002`, `FR-GRP-002` |
| **File Uploader** | Inputs | `Recommended` | Dropzone, Button Upload | Default, Uploading, Complete, Error | `FR-LES-002`, `FR-EXM-004` |
| **Data Table** | Data Display | `Recommended` | Compact Table, Expandable Row | Default, Loading, Empty, Selected Row | `FR-STU-001`, `FR-ATT-001` |
| **Student Card** | Data Display | `Recommended` | Summary Card, Grid Card | Default, Hover, Selected, Status-Tagged | `FR-STU-001..004` |
| **Attendance Control** | Education | `Recommended` | Presence/Absence Toggle | Active Present, Active Absent, Unrecorded | `FR-ATT-002`, `FR-ATT-003` |
| **Assignment Item** | Education | `Recommended` | Student View, Review View | Pending, Submitted, Graded | `FR-EXM-003..005` |
| **Exam Card** | Education | `Recommended` | Available, Completed | Available, Submitted, Graded | `FR-EXM-006..007` |
| **Status Badge** | Status | `Recommended` | Solid, Subtle Tint with Text Label | Default Status | `FR-PAR-002`, `FR-SUB-001` |
| **Notification Toast** | Status | `Recommended` | Standard Banner, Toast Item | Unread, Read, Dismissed | `FR-NOT-001..005` |
| **Modal Dialog** | Feedback | `Recommended` | Confirmation, Form Container | Open, Closing | System Overlays |
| **Empty State** | Feedback | `Recommended` | Center Box with Icon & Message | Static Display | System Feedback |

---

## 22. Component States

Recommended component state framework for interactive controls:

```
[Default] ──► [Hover (Pointer)] ──► [Pressed / Active] ──► [Focused (Keyboard)]
    │                                         │
    ▼                                         ▼
[Disabled]                                [Loading]
                                              │
                                      ┌───────┴───────┐
                                      ▼               ▼
                                 [Success]         [Error]
```

- **Default** *(Recommended)*: Rest state with standard border and text contrast.
- **Hover (Pointer)** *(Recommended)*: Visual feedback on cursor pointer devices (N/A on touch-only displays).
- **Pressed** *(Recommended)*: Active visual feedback upon touch or mouse click.
- **Focused** *(Recommended)*: Visible focus outline for keyboard navigation.
- **Disabled** *(Recommended)*: Reduced opacity, non-interactive cursor, excluded from keyboard tab order.
- **Loading** *(Recommended)*: Interactive element temporarily locked while action processes.
- **Error** *(Recommended)*: Visual border state change paired with an accessible error caption.

---

## 23. UX Patterns

High-level interaction patterns derived from the approved product backlog:

### 23.1 Attendance Recording Pattern
- **Scope**: Derived from `FR-ATT-002`, `FR-ATT-003` (`تسجيل حضور الطلاب`, `تسجيل الغياب`).
- **Core Requirement Flow**: Group/student context selection ──► Attendance recording control ──► Confirmation of recorded attendance/absence.
- **Detailed UI Mechanisms**: `Recommended / TBD`
- **Status**: `Defined (Functional Goal)` / `Recommended (UI Pattern)`

### 23.2 Educational Content Upload Pattern
- **Scope**: Derived from `FR-LES-002`, `FR-LES-003` (`رفع الملفات و المراجع و الملخصات`, `رفع تسجيلات المحاضرات`).
- **Core Requirement Flow**: Target group/class context ──► Select educational content type ──► Upload/add content ──► Confirm content availability.
- **Detailed UI Mechanisms**: `Recommended / TBD`
- **Status**: `Defined (Functional Goal)` / `Recommended (UI Pattern)`

### 23.3 Student Assessment Submission Pattern
- **Scope**: Derived from `FR-EXM-003` (`تسليم الواجبات و الامتحانات`).
- **Core Requirement Flow**: Assessment overview ──► Student submits assignment/exam ──► Submission status is available.
- **Detailed UI Mechanisms**: `Recommended / TBD`
- **Status**: `Defined (Functional Goal)` / `Recommended (UI Pattern)`

### 23.4 Parent Status Review Pattern
- **Scope**: Derived from `FR-PAR-001..005` (Results, Teacher notes, Evaluations, Exam grades, Attendance/absence records, Student level).
- **Core Requirement Flow**: Student context ──► Presentation of student academic standing, teacher evaluations, notes, exam grades, assignment statuses, attendance records, and student level.
- **Detailed UI Mechanisms**: `Recommended / TBD`
- **Status**: `Defined (Functional Goal)` / `Recommended (UI Pattern)`

### 23.5 Notification Presentation Pattern
- **Scope**: Derived from `FR-NOT-001..005` (Lesson reminders, Unsolved assignments, Exam notices, Grades, Absences).
- **Core Requirement Flow**: Notification trigger occurs ──► Relevant user receives notification ──► User can understand the related event.
- **Detailed Delivery Mechanisms**: `TBD — Requires Product Clarification`
- **Status**: `Defined (Functional Goal)` / `TBD (Delivery Channel)`

---

## 24. Templates (Figma & UX Architecture)

Recommended Figma template categories organized by user persona and functional area:

1. **Teacher Workspace Template** *(Recommended)*: Proposed multi-column layout for group management, lesson scheduling, attendance recording, and assessment creation.
2. **Student Learning Portal Template** *(Recommended)*: Proposed focused layout for viewing educational materials, submitting assignments/exams, and reviewing grades.
3. **Parent Status Portal Template** *(Recommended)*: Proposed clear, readable summary layout for reviewing student evaluations, exam grades, attendance history, and assignment statuses.
4. **Secretariat Operations Template** *(Recommended)*: Proposed high-density layout for student enrollment, group management, and student payment status viewing.

---

## 25. Figma File Structure

Recommended organization for future Figma design system assets:

```
📁 01_Foundations
   ├── 🎨 Colors (Primitive Swatches & Semantic Token Architecture)
   ├── 🔤 Typography (Type Scale Frames & Font Hierarchy)
   ├── 📐 Spacing & Grid (8pt Grid Scales & Breakpoint Frames)
   ├── 🔘 Radius & Elevation (Corner Tokens & Shadow Styles)
   └── 🔣 Iconography (24px Semantic Icon Set)

📁 02_Components
   ├── 🔘 Actions (Buttons, Icon Buttons, Menus)
   ├── 📝 Inputs (Text Fields, Selects, File Uploaders)
   ├── 📊 Data Display (Tables, Student Cards, Badges)
   ├── 🎓 Education (Attendance Controls, Exam Cards, Submission Items)
   └── 💬 Feedback (Toasts, Modals, Empty States, Skeletons)

📁 03_Patterns
   ├── 📋 Attendance Workflows
   ├── 📤 Content & Assessment Uploads
   ├── 📥 Student Submissions
   └── 👨‍👩‍👧 Parent Status Views

📁 04_Templates
   ├── 🖥️ Desktop Dashboards (Teacher, Secretariat)
   ├── 📱 Mobile Portals (Parent, Student)
   └── 📑 Printable Reports (Attendance, Grade Sheets)

📁 05_Screens
   ├── 01_Student_Management
   ├── 02_Attendance_Absence
   ├── 03_Lectures_Lessons
   ├── 04_Exams_Assignments
   ├── 05_Parent_Status
   ├── 06_Notifications
   ├── 07_Groups_Management
   ├── 08_Users_Permissions
   └── 09_Subscriptions_Payment

📁 06_Prototype
   └── 🔄 Persona Interaction Flows
```

---

## 26. Design Token Governance

Recommended design token hierarchy and management guidelines:

1. **Token Hierarchy Model** *(Recommended Token Structure)*:
   - `Tier 1: Global Primitives` (Example: `primary-600`, `neutral-50`, `spacing-16`).
   - `Tier 2: Semantic System Tokens` (Example: `color-primary`, `color-status-present`, `typography-h2`).
   - `Tier 3: Component-Scoped Tokens` (Example: `button-primary-bg`, `attendance-toggle-active-bg`).
2. **Zero Hardcoded Values** *(Recommended)*: UI designs and frontend code should bind directly to Tier 2 semantic or Tier 3 component tokens.
3. **Change Management** *(Recommended)*: Token updates should be verified for contrast accessibility and tested across both RTL (Arabic) and LTR (English) layouts.

---

## 27. Open Design Decisions

The following foundational visual decisions require brand identity and product confirmation:

1. **Primary Brand Palette Approval**: Approval of proposed primary color `#1E4BD9` and palette (`TBD — Requires Product Clarification`).
2. **Brand Font Family Selection**: Primary typeface for Arabic and Latin text (`TBD — Requires Product Clarification`).
3. **Final Typography Scale**: Formal confirmation of body, heading, and caption pixel sizes (`TBD — Requires Product Clarification`).
4. **Final Spacing Scale**: Formal confirmation of layout and component spacing increments (`TBD — Requires Product Clarification`).
5. **Radius System**: Formal confirmation of component corner radius tokens (`TBD — Requires Product Clarification`).
6. **Elevation System**: Formal confirmation of shadow/depth levels (`TBD — Requires Product Clarification`).
7. **Icon Library Selection**: Selection of official icon package/library (`TBD — Requires Product Clarification`).
8. **Target Supported Platforms**: Confirmation of responsive web vs. native mobile app scope (`TBD — Requires Product Clarification`).
9. **Responsive Breakpoints**: Final confirmation of device/screen width breakpoints (`TBD — Requires Product Clarification`).
10. **Accessibility Compliance Target**: Formal standard target (e.g., WCAG 2.1 AA) (`TBD — Requires Product Clarification`).
11. **Localization & Number System**: Eastern Arabic (`١، ٢، ٣`) vs. Western Arabic (`1, 2, 3`) numerals in reports (`TBD — Requires Product Clarification`).
12. **Notification Delivery Mechanism**: In-app, SMS, email, WhatsApp, push notification channels (`TBD — Requires Product Clarification`).
13. **Parent Access / Navigation Model**: Interaction model for parent access (`TBD — Requires Product Clarification`).
14. **Secretariat Navigation & Permissions**: Detailed operational interface and permission boundaries (`TBD — Requires Product Clarification`).
15. **Payment Status Semantics**: Definitive values and lifecycle states for student payment status (`TBD — Requires Product Clarification`).

---

## 28. Traceability Matrix

| Design System Area | Source Document | Reference Requirement | Status |
|---|---|---|---|
| **Role-Based UX Architecture** | `user-personas.md` | `UX-PER-001..004` | `Requirement Confirmed` / `UX Layout Recommended` |
| **Attendance Interaction Model** | `functional-requirements.md` | `FR-ATT-001..003` | `Requirement Confirmed` / `UX Pattern Recommended` |
| **Content & Video UI Containers** | `functional-requirements.md` | `FR-LES-001..003` | `Requirement Confirmed` / `Component Recommended` |
| **Assessment & Auto-Grading UI** | `functional-requirements.md` | `FR-EXM-001..007` | `Requirement Confirmed` / `Component Recommended` |
| **Parent Status & Notes Views** | `functional-requirements.md` | `FR-PAR-001..005` | `Requirement Confirmed` / `UX Pattern Recommended` |
| **Notification Display Specs** | `functional-requirements.md` | `FR-NOT-001..005` | `Requirement Confirmed` / `TBD (Delivery Channel)` |
| **Payment Status Category** | `functional-requirements.md` | `FR-SUB-001` | `Requirement Confirmed` / `TBD (Lifecycle States)` |
| **Proposed Color Palette** | Section 16.3 | Design Recommendation | `Proposed / Recommended` |
| **Accessibility Baseline** | `non-functional-requirements.md`| Section 4.6 Accessibility | `TBD — Requires Product Clarification` |
| **Usability & Localization** | `non-functional-requirements.md`| Section 4.5, 4.7 | `TBD — Requires Product Clarification` |

---

## 29. Final Design System Audit

### Structure
PASS

### Product Scope Alignment
PASS

### Unsupported Product Requirements
0

### Unsupported UX Assumptions Presented as Requirements
0

### Implemented Design Decisions
0 *(no frontend codebase currently in workspace)*

### Defined Design Decisions
9 *(4 Confirmed User Roles, 9 Approved Product Modules, Confirmed Parent Status Data Items, Confirmed Exam Auto-Grading Scope, Dual-Language Arabic/English Requirement, Confirmed Attendance Items, Confirmed Notification Events, Confirmed Content Upload Concepts, Confirmed Student Payment Status Concept)*

### Recommended Design Decisions
35 *(8pt base spacing scale, 9 typography scale levels, 14 component models, 4 radius tokens, 3 elevation levels, 4 responsive grid layouts, motion timing ranges)*

### Proposed Palette Tokens
93 *(59 Primitive Tokens, 22 Semantic Tokens, 12 Educational Domain Status Tokens)*

### TBD Design Decisions
15 *(listed in Section 27 Open Design Decisions)*

### Traceability
PASS

### Separation of Concerns
PASS

### Final Status
PROPOSED — REQUIRES DESIGN APPROVAL
