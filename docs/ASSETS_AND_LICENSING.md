# El Awal Educational Platform — Media Assets & Licensing Manifest
**سجل حقوق الملكية الفكرية وتراخيص الوسائط لمنصة الأول التعليمية**

---

## 1. Executive Summary & Ownership Statement

All educational materials, recorded video lectures, graphic lecture notes, printed booklets, questions, and curriculum summaries presented on **El Awal (منصة الأول التعليمية)** are the exclusive intellectual property of **Mr. Ahmed Gharib** and **El Awal Educational Organization**.

- **Copyright Notice**: `Copyright © 2024-2026 Mr. Ahmed Gharib & El Awal Platform. All Rights Reserved.`
- **Jurisdiction & Governing Laws**: Protected under Egyptian Intellectual Property Rights Law No. 82 of 2002 and international copyright conventions (Berne Convention, WIPO).
- **Prohibited Acts**: Any unauthorized recording, digital ripping, duplication, watermark removal, distribution via Telegram/Facebook/YouTube, or public sharing of these proprietary assets is strictly prohibited and subject to civil damages and criminal prosecution.

---

## 2. Comprehensive Repository Media Inventory

| Asset Name / Path | Content Description | Source / Origin | License / Usage Rights | Commercial Clearance Status |
|---|---|---|---|---|
| `/public/teacher-photo.webp` | Official portrait cutout of Mr. Ahmed Gharib (Hero section LCP asset) | Direct professional studio photography commissioned by El Awal | Owned exclusively by Mr. Ahmed Gharib & El Awal | Fully Verified & Cleared |
| `/public/about-us/frame_*.webp` (32 frames) | Sequential classroom lecture photography showing student interactions & chalkboards | On-location photography in El Awal physical centers | Owned exclusively by El Awal | Fully Verified & Cleared (Photo release on file) |
| `/public/hero-sequence/frame_*.webp` (22 frames) | Canvas video sequence of teacher lectures | High-speed video capture filmed specifically for the platform | Owned exclusively by El Awal | Fully Verified & Cleared |
| `/public/noise.svg` | Subtle SVG noise texture for dark glassmorphism | Handcrafted SVG math/noise filter | Custom created / Public Domain equivalent (CC0) | Cleared |
| `/public/favicon.ico`, `/favicon.svg` | Official logo badge & brand icon | Custom vector graphic designed by TAD X for El Awal | Commercial assignment from TAD X to El Awal | Fully Verified & Cleared |
| `/public/icons/icon-192x192.png`, `/public/icons/icon-512x512.png` | PWA installation app icons | Custom vector graphic derived from official logo | Owned exclusively by El Awal | Fully Verified & Cleared |

---

## 3. Third-Party Code, Fonts & Icon Libraries

| Library / Resource | Purpose in Platform | Source URL | Applicable Open-Source License | Attribution Requirement Status |
|---|---|---|---|---|
| **Lucide React (`lucide-react`)** | UI icons across admin, teacher, student and landing portals | `https://github.com/lucide-icons/lucide` | **ISC License** | Compliant (Permits commercial web use) |
| **Cairo Font (`next/font/google`)** | Primary Arabic typography | Google Fonts (Self-hosted at build time by Next.js) | **SIL Open Font License 1.1** | Compliant (Zero third-party tracking) |
| **Inter Font (`next/font/google`)** | Secondary Latin typography & numerals | Google Fonts (Self-hosted at build time by Next.js) | **SIL Open Font License 1.1** | Compliant (Zero third-party tracking) |
| **Framer Motion (`framer-motion`)** | Micro-animations and page transitions | `https://github.com/motiondivision/motion` | **MIT License** | Compliant |
| **Microsoft Clarity (`@microsoft/clarity`)** | Optional behavioral telemetry & heatmaps | Microsoft Clarity SDK | **Proprietary Microsoft Free Tier Terms** | Compliant (Gated behind explicit Cookie Consent) |

---

## 4. Third-Party Embed & Streaming Security Policy

1. **Bunny Stream Video CDN**:
   - Videos are streamed via adaptive multi-bitrate HLS/DASH.
   - Tokens are cryptographically signed with short TTLs (Time-To-Live) and bound to the authenticated student's session.
   - Direct MP4 downloading is disabled on Bunny Stream pull zones.
2. **Cloudflare R2 Object Store**:
   - PDFs, booklets, and exam solution sheets are served via presigned URLs or zero-egress Cloudflare CDN with anti-hotlinking rules.
3. **Iframes & Sandbox Rules**:
   - Any external educational preview iframe includes:
     - `loading="lazy"`
     - `referrerPolicy="strict-origin-when-cross-origin"`
     - Meaningful `title` attribute for screen readers.

---

## 5. Compliance & Licensing Audit Checklist

- [x] **Zero Stock Image Infringements**: No unlicensed watermarked stock photos (Shutterstock, Getty Images, iStock) exist in the repository.
- [x] **GDPR/ePrivacy Font Leak Check**: Fonts (`Cairo` & `Inter`) are imported via Next.js `next/font/google` which bundles and self-hosts font binaries locally during build, preventing user IP leak to third-party Google font servers.
- [x] **Student Data in Media**: All student testimonials rendered on the landing page are dynamic records from `testimonialsApi.getPublic`, submitted with student permission.
- [x] **Tracking Gating**: Microsoft Clarity is completely disabled until the user explicitly opts into "Analytics" in the Cookie Consent Banner.
- [x] **Commercial Registration & Statutory Disclosure**: Business registration `482-910-335`, physical center addresses, and working hours are permanently embedded into the site footer and legal notices.
