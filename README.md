# WorkNest — SaaS HR Management Platform

*"One platform. Every team. Total HR control."*

WorkNest is a cloud-based, multi-tenant Software-as-a-Service (SaaS) Human Resource Management System (HRMS) built with React (Vite) on the frontend and Node.js/Express on the backend. It allows multiple companies to independently manage their entire workforce — from hiring and onboarding to attendance, leave approvals, payroll generation, and analytics — all within a single shared platform while keeping each company's data fully isolated.

## Project Status
**All phases and modules defined in the `WorkNest_Project_Proposal.md` have been successfully implemented.**
The system fully supports the multi-tenancy model and role-based access control (Super Admin, Company Admin, Manager, and Employee).

### Implemented Modules:
1. **Authentication & Onboarding:** Complete with JWT and role-based protection.
2. **Dashboard:** Role-specific KPIs, charts, and activity feeds.
3. **Department Management:** Full CRUD operations for company departments.
4. **Employee Management:** Directory, profiles, status tracking.
5. **Attendance Management:** Clock in/out widget, monthly heatmap, attendance logs.
6. **Leave Management:** Leave requests, balance tracking, approval pipelines.
7. **Payroll Management:** Effective-dated salary history, configurable salary components, bonuses, deductions, loans/installments, bank accounts, monthly payroll generation, review, approval, locking, payslips, and bank CSV export.
8. **Notifications:** In-app notification bell and alerts.
9. **Company Settings:** Company profile, work hours, subscription management.
10. **Super Admin Panel:** Oversee all tenants and platform statistics.

## Getting Started

WorkNest comprises a React frontend and a separate Express backend.

### Prerequisites
- Node.js (v18+)
- MySQL (or Docker to run the database)

### Complete Local Stack (Docker)

For a complete local stack with MySQL via Docker Compose:

```powershell
docker compose up --build -d
cd backend
npm run db:migrate
npm run db:seed:demo
cd ..
npm run dev
```

### Manual Setup

#### Backend Setup

```powershell
cd backend
Copy-Item .env.example .env
# Set DB credentials in backend/.env
npm install
npm run dev
```

Available backend endpoints:
- `GET http://localhost:5000/`
- `GET http://localhost:5000/api/v1/health`

#### Frontend Setup

Frontend API configuration is available in `.env.example`, with the default API base URL set to `http://localhost:5000/api/v1`.

```powershell
npm install
npm run dev
```

### Demo Credentials

You can use the following credentials to access the seeded demo company:

```text
Email: admin@acme-demo.local
Password: ChangeMe123!
```

## Testing

Run the API smoke checks with `backend/scripts/smoke-test.ps1` after the backend is available.

### Current UI and Reliability Notes

- The login page uses a responsive split-screen design with email/password validation, password visibility control, rate-limit feedback, and mobile viewport handling.
- The WorkNest favicon is available at `public/worknest-favicon.svg` and is linked from `index.html`.
- Long forms inside shared modals use an internal scrollbar so employee, department, leave, payroll, settings, and profile forms remain usable on short screens.
- The Overview dashboard has responsive KPI cards, charts, quick actions, widget-level retry states, empty states, and dynamic greetings.
- Notifications are served from `GET /api/v1/notifications`; notification ordering uses the database `created_at` column.
- The backend uses validated request data through `req.validated`, tenant-scoped queries, JWT access tokens, rotated HTTP-only refresh cookies, and environment-specific authentication rate limits.
- Payroll-owned records are tenant-scoped and use additive Sequelize migrations. Payroll generation snapshots employee/salary/payment data, records source-linked earnings and deductions, prevents duplicate bonus/loan processing, and keeps locked runs immutable through normal API actions.
- Payroll list queries use the database's underscored timestamp fields (`created_at`) so bonus and loan configuration panels do not cause the main Payroll page to fail.
- WorkNest FairRank Phase 1 audit is documented in [performance_phase1_audit.md](performance_phase1_audit.md). Performance implementation is intentionally staged and has not yet changed the existing modules.
- FairRank Phase 2 adds tenant-scoped performance-cycle lifecycle APIs under `/api/v1/performance/cycles`.
- FairRank Phase 3 adds tenant-scoped criteria and role-specific template APIs with draft weight assembly, 100% activation validation, and frozen active configuration.
- FairRank Phase 4 adds tenant-scoped employee goals/KPIs with measurable targets, progress validation, cycle freezing, manager department scoping, employee self-access, and audit logging. Endpoints are available under `/api/v1/performance/goals` and `/api/v1/performance/employees/:employeeId/goals`.
- FairRank Phase 5 adds tenant-scoped performance evidence with optional PDF/image attachments, goal/criterion references, verification status, employee self-access, manager department scoping, secure attachment metadata responses, and audit logging.
- FairRank Phase 6 adds role-scoped appraisal reviews and criterion scores. Review creation derives verified evidence counts on the server, prevents duplicate review types per employee/cycle, and submission freezes the review with an audit record. Score calculation and rating bands remain separate later phases.
- FairRank Phase 7 adds deterministic server-side weighted score calculation and immutable employee/cycle score snapshots. Submitted manager/final reviews are selected by priority, verified evidence counts are preserved in calculation details, and existing snapshots are never overwritten. Rating-band assignment remains reserved for Phase 8.
- FairRank Phase 8 adds tenant-configurable rating bands with overlap protection. Score generation snapshots the matching band name and ID into the calculation details, so later band configuration changes do not rewrite historical performance results.
- FairRank Phase 9 adds configurable equivalence thresholds and persisted equivalence groups. Scores are grouped only within the same rating band when their spread is within the configured threshold; the system recognizes equivalent performance instead of generating forced rankings.
- FairRank Phase 10 adds deterministic, tenant-configurable Performance Signatures. Signature labels are selected from criterion categories and stored with strongest factors and source snapshot details; no AI or random labeling is used.
- FairRank Phase 11 adds a separate Advancement Readiness layer with configurable promotion profiles, weighted readiness criteria, server-calculated recommendations, and immutable assessment snapshots. Promotion readiness never changes the employee's annual performance score or rating.
- FairRank Phase 12 adds a separate reward recommendation and approval layer for increments, bonuses, promotions, recognition, and development opportunities. Reward decisions are independently stored and never downgrade or rewrite performance ratings.
- FairRank Phase 13 adds an auditable calibration workspace with evidence coverage, equivalence context, confirmation/clarification actions, and justified manual overrides. Overrides persist previous and new values and never silently rewrite score snapshots.
- FairRank Phase 14 adds tenant-configurable Blind Calibration Mode. When enabled, calibration responses redact employee identity fields while retaining role, department, scores, evidence, and equivalence context; only an explicitly requested admin reveal returns identity.
- FairRank Phase 15 adds immutable explainable appraisal reports that separate performance conclusions from promotion conclusions and preserve score breakdowns, evidence coverage, equivalence results, and performance signatures.
- FairRank Phase 16 adds evidence coverage and confidence classification. Scores are labeled high, moderate, or low confidence from supporting evidence coverage; confidence is exposed to HR without automatically reducing the performance score.
- FairRank Phase 17 adds deterministic fairness flags for inconsistent appraisal patterns. Flags identify review/evidence/reward anomalies for HR investigation and do not make legal or bias-elimination claims.
- Payroll also supports effective-dated tax configuration, approved adjustments for locked runs, and standard/HBL/Meezan/UBL bank-export layouts. The UI exposes payroll configuration and the backend endpoints remain authoritative for all financial values.

### Verification Commands

```powershell
# Frontend production build
npm run build

# Backend database verification
cd backend
node scripts/verify-database.js

# Backend syntax check
Get-ChildItem src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }

# Payroll migration
npm run db:migrate
```

The local development servers use port `5173` for the frontend and port `5000` for the API. If another project is already using either port, stop that process before starting WorkNest to avoid serving the wrong application.

## FairRank Phase 18 frontend

The protected `/performance` workspace provides API-backed FairRank views for overview, cycles, criteria/templates, goals, evidence, reviews, calibration, equivalence groups, promotion readiness, and rewards. The page uses the existing WorkNest shell, role-aware tabs, responsive layouts, real loading/error/empty states, and an administrator cycle-creation form. It does not fabricate performance records; values are loaded from `/api/v1/performance`.

## FairRank Phase 19 employee transparency

Employees can use the FairRank `My Performance` view to read only their own released appraisal reports, criterion breakdowns, completed goals, achievements, and released manager feedback. Unreleased reviews, calibration notes, other employees' data, salary information, and promotion details are not returned by the employee transparency API.

## FairRank Phase 20 notifications

FairRank lifecycle events now use the existing tenant-scoped notification system. Managers are notified when reviews enter the review stage, HR is notified when calibration starts, employees are notified when finalized explanations are released, and employees receive notices for calibration clarification requests or rating updates. Performance notifications link back to the FairRank workspace.

## FairRank Phase 21 audit logging

Sensitive FairRank mutations continue to write to the existing `audit_logs` table. Administrators can review a tenant-scoped FairRank audit timeline from the Audit log tab; it shows action, actor, entity, timestamp, request ID, and IP metadata without exposing private before/after appraisal payloads.

## FairRank Phase 22 tenant isolation

All 23 FairRank-owned tables now carry a direct `tenant_id`, including equivalence members and promotion-readiness criteria that were previously scoped only through parent records. The backend verification command `node backend/scripts/verify-performance-isolation.js` checks this invariant against the live MySQL schema.

## FairRank Phase 23 role permissions

FairRank permissions now enforce the product role model: admins manage configuration, calibration, finalization, rewards, and audit history; managers work only with authorized department employees; employees can submit/access permitted self-appraisal data and only released performance results; and Super Admin is not included in FairRank employee-data routes. Employee score, signature, promotion-readiness, explanation, and manager-feedback reads are release-gated.

## FairRank Phase 24 API design

The canonical employee transparency contract remains `GET /api/v1/performance/me`, which avoids duplicating `/me/reviews` and `/me/goals`. FairRank comparison is now available through `POST /api/v1/performance/compare` for admins and managers, accepts 2–5 employee IDs plus a cycle, and returns scores, bands, signatures, equivalence status, spread, and threshold without creating an artificial rank.

After adding backend routes, restart the API process so its in-memory Express route registry reloads. A stale process on port `5000` can return `Route not found` even when the route exists in source code.

If `npm run dev` reports `EADDRINUSE`, find and stop the listener before starting the watcher:

```powershell
netstat -ano | Select-String ':5000.*LISTENING'
Stop-Process -Id <PID> -Force
cd backend
npm run dev
```
