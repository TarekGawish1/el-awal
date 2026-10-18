# ⚡ EL-AWAL BACKEND LOAD & STRESS TEST BENCHMARK REPORT
Generated: 2026-10-18T08:07:01.060Z
Target: http://localhost:4000/api/v1

---

## 1. Executive Performance & Capacity Summary
| Metric | Value | Status |
| :--- | :--- | :--- |
| **Max / Average RPS** | **22.0 req/s** | Benchmark Rate |
| **Total Requests Handled** | **8927 requests** | Complete |
| **Success Rate** | **99.16%** (Failures: 0.84%) | 🟢 Excellent |
| **Total Data Throughput** | **53.77 MB** (~0.13 MB/s) | Network IO |
| **Latency Min / Mean** | **0.0ms** / **8591.4ms** | Baseline |
| **Median (p50) Latency** | **3432.9ms** | Half of traffic |
| **90th Percentile (p90)** | **24100.4ms** | Peak traffic |
| **95th Percentile (p95)** | **34708.6ms** | SLA Target (< 1,000ms) |
| **99th Percentile (p99)** | **58769.0ms** | Tail latency |
| **Max Recorded Latency** | **60009.5ms** | Spike ceiling |

---

## 2. Granular Per-Module Latency Breakdown (Ranked)
| Module / Subsystem | Operation | p50 (ms) | p95 (ms) | p99 (ms) | Mean (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Assessments (Auto-Grading)** | Exam Submission | 13978.0 | 34058.2 | 44645.1 | 14321.4 |
| **Assessments (Catalog & Qs)** | Exam Retrieval & Status | 5514.0 | 28816.2 | 42579.9 | 9302.3 |
| **Offline Sync Engine** | Bulk Bootstrap Snapshot | 9690.0 | 44694.6 | 50814.6 | 13301.7 |
| **Offline Sync Engine** | Delta Sync Diff & Mutations | 10963.0 | 47141.6 | 58126.5 | 15318.9 |
| **Payments & Financials** | Matrix Ledger & Analytics | 11411.0 | 37799.0 | 53342.2 | 13682.3 |
| **Payments (Fast-Scan)** | QR Tuition Collection | 12336.0 | 30337.4 | 38193.0 | 12718.9 |
| **Attendance (Fast-Scan)** | Roll-Call QR Scanning | 9463.5 | 42282.6 | 48116.1 | 13529.7 |
| **Attendance (Roster)** | Reports & Student History | 5220.0 | 39849.8 | 46173.4 | 9609.5 |
| **Parent Portal** | Dashboard & Student KPI | 2694.0 | 41359.1 | 60001.0 | 9062.2 |
| **Analytics & Telemetry** | Overview & Geo-Ranking | 700.5 | 60001.0 | 60001.4 | 15700.9 |
| **Online Courses** | Catalog, Viewer & Progress | 4575.0 | 38414.5 | 52355.2 | 10506.4 |
| **Authentication & Profile** | Session Check (/auth/me) | 5559.0 | 20792.5 | 35192.5 | 7888.0 |

---

## 3. High-Concurrency Stress Observations
- Test Profile: **full**
- Virtual Users (VUs): Max ramp achieved
- Global Requests: **8927** requests executed
