# ⚡ EL-AWAL BACKEND LOAD & STRESS TEST BENCHMARK REPORT
Generated: 2026-10-18T06:45:31.242Z
Target: http://localhost:4000/api/v1

---

## 1. Executive Performance & Capacity Summary
| Metric | Value | Status |
| :--- | :--- | :--- |
| **Max / Average RPS** | **15.2 req/s** | Benchmark Rate |
| **Total Requests Handled** | **6152 requests** | Complete |
| **Success Rate** | **93.71%** (Failures: 6.29%) | 🔴 Degraded |
| **Total Data Throughput** | **34.79 MB** (~0.09 MB/s) | Network IO |
| **Latency Min / Mean** | **0.0ms** / **11567.8ms** | Baseline |
| **Median (p50) Latency** | **4762.0ms** | Half of traffic |
| **90th Percentile (p90)** | **39155.9ms** | Peak traffic |
| **95th Percentile (p95)** | **59999.4ms** | SLA Target (< 1,000ms) |
| **99th Percentile (p99)** | **60000.8ms** | Tail latency |
| **Max Recorded Latency** | **60006.3ms** | Spike ceiling |

---

## 2. Granular Per-Module Latency Breakdown (Ranked)
| Module / Subsystem | Operation | p50 (ms) | p95 (ms) | p99 (ms) | Mean (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Assessments (Auto-Grading)** | Exam Submission | 3529.5 | 59182.0 | 60001.0 | 9085.3 |
| **Assessments (Catalog & Qs)** | Exam Retrieval & Status | 3474.0 | 39299.6 | 60001.0 | 8625.4 |
| **Offline Sync Engine** | Bulk Bootstrap Snapshot | 8001.5 | 59656.2 | 60001.0 | 14607.8 |
| **Offline Sync Engine** | Delta Sync Diff & Mutations | 7866.0 | 60000.0 | 60001.0 | 14646.7 |
| **Payments & Financials** | Matrix Ledger & Analytics | 7857.0 | 53636.8 | 60001.0 | 14263.1 |
| **Payments (Fast-Scan)** | QR Tuition Collection | 6276.5 | 28749.9 | 41083.6 | 9942.4 |
| **Attendance (Fast-Scan)** | Roll-Call QR Scanning | 18351.5 | 60001.0 | 60001.1 | 28022.9 |
| **Attendance (Roster)** | Reports & Student History | 6682.0 | 60001.0 | 60001.0 | 16554.5 |
| **Parent Portal** | Dashboard & Student KPI | 8677.0 | 60001.0 | 60002.0 | 18943.1 |
| **Analytics & Telemetry** | Overview & Geo-Ranking | 98.0 | 38826.4 | 42671.5 | 6435.0 |
| **Online Courses** | Catalog, Viewer & Progress | 8469.0 | 60001.0 | 60001.0 | 16872.0 |
| **Authentication & Profile** | Session Check (/auth/me) | 5318.0 | 34157.3 | 45791.1 | 10094.1 |

---

## 3. High-Concurrency Stress Observations
- Test Profile: **full**
- Virtual Users (VUs): Max ramp achieved
- Global Requests: **6152** requests executed
