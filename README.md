# WorkNest

WorkNest is a multi-tenant SaaS Human Resource Management System (HRMS) for managing employees, departments, attendance, leave, payroll, notifications, and performance management from one workspace.

This repository contains a React/Vite frontend and a Node.js/Express API backed by MySQL and Sequelize.

## Objectives

- Keep tenant data isolated across all organization-owned records.
- Provide role-aware HR workflows for administrators, managers, and employees.
- Keep financial and performance calculations authoritative on the backend.
- Preserve auditable history for payroll and performance decisions.
- Provide a practical local development and Docker workflow.

## Key features

- JWT authentication with rotating HTTP-only refresh-token cookies.
- Company registration, invitations, password reset, logout, and session revocation.
- Role-specific dashboards and notification center.
- Department and employee directory management.
- Attendance clock-in/out, status tracking, late detection, and reporting.
- Leave types, balances, requests, approvals, rejection, and cancellation.
- Payroll salary history, components, bonuses, deductions, loans, bank accounts, generation, approval, locking, payslips, PDF output, and bank CSV export.
- Historical HR continuity foundation with source-preserving employee actions and annual performance records for deterministic Training Needs Analysis.
- FairRank performance cycles, goals, evidence, reviews, deterministic scoring, rating bands, equivalence groups, signatures, promotion readiness, rewards, calibration, transparency, fairness flags, notifications, and audit logging.
- Super Admin tenant management and aggregate platform statistics.

## System architecture

```text
Browser
  └─ React 19 + React Router + Axios + Vite
       └─ HTTP JSON / multipart requests
            └─ Express API (Node.js)
                 ├─ Authentication, authorization, validation, rate limiting
                 ├─ Modular domain services and controllers
                 ├─ Sequelize ORM and migration-managed schema
                 └─ MySQL 8.4

Optional services: Redis, SMTP email, Cloudinary-compatible file storage
```

The frontend uses `VITE_API_BASE_URL` and sends access tokens through the Axios client. The backend authenticates requests, derives tenant and role context from the authenticated user, validates input with Zod, executes tenant-scoped service queries, and returns `{ success, data }` responses. Refresh tokens are stored in an HTTP-only cookie and rotated by the API.

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, React Router 7, Vite 8, Axios, Recharts, Lucide React |
| Backend | Node.js, Express 5, Pino, Helmet, CORS, multer |
| Database | MySQL 8.4, Sequelize 6, Sequelize migrations |
| Validation | Zod |
| Authentication | JWT access tokens, rotating HTTP-only refresh cookies, bcryptjs |
| Documents and PDFs | Local uploads, optional Cloudinary driver, PDFKit |
| Optional infrastructure | Redis 7, Nodemailer/SMTP |
| Local orchestration | Docker Compose |

## Prerequisites

- Node.js 22 LTS and npm 10 or newer.
- npm.
- MySQL 8.x, or Docker Desktop with Docker Compose.
- PowerShell for the documented Windows helper scripts.

## Installation

Clone the repository, then install both dependency sets:

```powershell
cd D:\WorkNest
npm install
npm --prefix backend install
```

### Frontend environment

Create or update the root `.env` from `.env.example`:

```powershell
Copy-Item .env.example .env
```

The frontend variable is:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### Backend environment

Create the backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Set the database credentials and replace JWT secrets with private random values. Never commit `.env` files or real credentials. The complete supported variable list is in [backend/.env.example](backend/.env.example).

Important local defaults:

| Variable | Local value |
| --- | --- |
| `PORT` | `5000` |
| `HOST` | `127.0.0.1` |
| `API_PREFIX` | `/api/v1` |
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `3306` |
| `DB_NAME` | `worknest` |
| `CLIENT_URL` | `http://localhost:5173` |
| `CORS_ORIGINS` | `http://localhost:5173` |
| `FILE_STORAGE_DRIVER` | `local` |
| `FILE_STORAGE_ROOT` | `./uploads/documents` |

## Database setup

### Existing MySQL instance

Create the `worknest` database and configure `backend/.env`, then run migrations:

```powershell
cd backend
npm run db:migrate
```

Optional demo data:

```powershell
npm run db:seed:demo
```

The demo seed creates the development workspace described by the seed script. Use credentials defined by the current seed implementation; do not hard-code or reuse demo credentials in production.

### Docker Compose

The Compose stack exposes MySQL on `3306`, the API on `5000`, and the frontend on `5173`:

```powershell
docker compose up --build -d
docker compose ps
```

The Compose backend is configured for the `mysql` service hostname. Migrations and seeding can be run from the host after MySQL is healthy:

```powershell
cd backend
npm run db:migrate
npm run db:seed:demo
```

Redis is optional and enabled with its Compose profile:

```powershell
docker compose --profile redis up -d redis
```

Schema changes must use Sequelize migrations. Do not use `sequelize.sync({ alter: true })` or destructive sync options.

Useful database commands from `backend`:

```powershell
npm run db:verify
npm run db:verify:performance
npm run db:verify:safety
npm run db:backup
npm run db:restore
npm run db:fresh                 # requires ALLOW_FRESH_DB=true
npm run db:rollback:test        # requires ALLOW_ROLLBACK_TEST=true
```

## Development commands

Run the frontend and backend in separate terminals:

```powershell
# Terminal 1
cd D:\WorkNest
npm run dev

# Terminal 2
cd D:\WorkNest\backend
npm run dev
```

Other commands:

```powershell
# Frontend production build
npm run build

# Backend tests from the repository root
npm run backend:test

# Backend tests directly
cd backend
npm test
```

The frontend is available at `http://localhost:5173`. The API is available at `http://localhost:5000`.

## API documentation

The API prefix is `/api/v1`.

- Liveness: `GET http://localhost:5000/api/v1/health/live`
- Readiness and database check: `GET http://localhost:5000/api/v1/health/ready`
- API documentation index: `GET http://localhost:5000/api/v1/docs`
- OpenAPI JSON: `GET http://localhost:5000/api/v1/docs/openapi.json`

Main route groups:

| Prefix | Scope |
| --- | --- |
| `/auth` | Registration, login, refresh, logout, password and invitations |
| `/departments`, `/employees` | Organization and employee management |
| `/attendance` | Clocking and attendance records |
| `/leaves` | Leave requests, balances, types, and approvals |
| `/payroll` | Salary, components, bonuses, deductions, loans, runs, payslips, and exports |
| `/dashboard` | Role-specific dashboard aggregates |
| `/notifications` | Tenant/user notifications |
| `/settings` | Company and work-hour settings |
| `/performance` | FairRank performance management |
| `/super` | Super Admin tenant operations |
| `/docs` | OpenAPI metadata |

Use the OpenAPI document as the authoritative endpoint contract. Protected requests require a bearer access token unless the endpoint uses the refresh cookie or is public.

## Role-based permissions

| Role | Permissions |
| --- | --- |
| Company Admin (`admin`) | Full tenant administration, employees, departments, payroll actions, settings, performance configuration/calibration/audit, and tenant data within the authenticated tenant |
| Manager (`manager`) | Department-scoped employee, attendance, leave, and performance workflows; no unrestricted tenant administration or payroll administration |
| Employee (`employee`) | Own attendance, leave requests, permitted self reviews/evidence, released own performance results, and own payslips |
| Super Admin (`super_admin`) | Platform tenant management and aggregate statistics; not automatically authorized to view tenant employee or payroll records |

The backend is authoritative for authorization. Tenant IDs are never trusted from frontend input; every tenant-owned query derives scope from the authenticated session. Role checks in the frontend are usability controls, not security boundaries.

## Testing and quality checks

Run the focused FairRank suite:

```powershell
cd backend
node --test (Get-ChildItem test -Filter 'performance-*.test.js').FullName
```

Run all backend tests:

```powershell
npm test
```

Run the project QA and verification commands:

```powershell
npm run qa
npm run db:verify
npm run db:verify:performance
npm run db:verify:safety
```

The test suite covers authentication, validation, tenant isolation, performance scoring, evidence, review permissions, rating bands, equivalence, promotion separation, fairness, transaction boundaries, and database safety. Full browser and database-backed integration coverage requires running the local services with a configured test database.

## Deployment

For a production deployment:

1. Build the frontend with `npm run build` and serve the generated `dist` directory through a production web server.
2. Build and run the backend from `backend/Dockerfile` or use a managed Node.js process.
3. Provision MySQL separately and run `npm run db:migrate` during the release process.
4. Set `NODE_ENV=production`, private JWT secrets, production database credentials, exact CORS origins, secure cookie settings appropriate to the deployment, SMTP configuration if email is enabled, and durable file storage.
5. Run the liveness/readiness checks before routing traffic.
6. Back up the database before migrations and maintain a tested restore process.

Do not use the local Compose secrets, development JWT values, demo data, or local filesystem uploads in production.

## Troubleshooting

If the API is stopped, the frontend shows a retryable “Backend unavailable” state instead of repeatedly refreshing the session. Leave balances are requested only for employee accounts or users with an explicit employee profile; administrators without one can still load leave requests and types without a fatal `EMPLOYEE_PROFILE_REQUIRED` error.

### Performance audit returns `Unknown column 'AuditLog.createdAt'`

Restart the backend after updating to the current model code. Audit timestamps are explicitly mapped to the existing `audit_logs.created_at` column; no destructive schema change is required.

### Payroll generation times out

Payroll calculates every active employee and can take longer on larger workspaces. The UI uses a two-minute timeout for generation. Refresh the payroll list before retrying, because a run may already have committed successfully. Backend logs include the duration and completion/failure status without sensitive payroll payloads.

### Import historical continuity data

After applying migrations, use the separate development-only importer:

```powershell
cd backend
$env:ALLOW_CONTINUITY_DATA_SEED="true"
npm run db:seed:continuity-data
```

It creates only the `worknest-historical-test` tenant, supports `CONTINUITY_DATA_DIR` for an alternate source directory, preserves 1–5 ratings and raw action codes, and does not modify the existing FairRank test tenant.

The continuity API exposes employee history, trend timelines, cycle summaries, and explicit cycle links under `/api/v1/performance`. Timeline statuses include `reviewed` and `no_review_data`; missing years are not inferred.

The continuity/TNA backend also provides deterministic development signals and training-need records. Signals are limited to sustained low performance, rating decline, significant decline, and missing review data; the system does not invent unsupported skill diagnoses.

The Performance page exposes Continuity and TNA tabs for authorized managers and administrators, using the live continuity and training-needs APIs with loading, empty, error, and retry states.

The full quality-audit findings and remaining production-readiness actions are recorded in [audit_report.md](audit_report.md).

Latest live verification passed: migrations are up to date; database verification checked 19 tables, 10 indexes, and 9 foreign keys; performance tenant isolation passed for 27/27 tables; database safety passed across 164 backend files.

Goal continuity is explicit: managers can carry incomplete goals into an active future cycle, creating a `previousGoalId` link. Completed goals remain historical. Employees can view their own continuity and development signals through the self-service Performance APIs.

### API cannot connect to MySQL

Check that MySQL is running and that `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `backend/.env` match the database. Then run:

```powershell
cd backend
npm run db:verify
```

### People page shows `Internal server error`

The People directory selects only its required employee columns so it remains readable during a rolling development migration. Apply all pending schema changes from `backend` and restart the API:

```powershell
cd backend
npm run db:migrate
```

If the API was already running before migrations, stop and restart it so the current model definitions are loaded.

### Port already in use

```powershell
netstat -ano | Select-String ':5000.*LISTENING'
netstat -ano | Select-String ':5173.*LISTENING'
Stop-Process -Id <PID> -Force
```

Restart the appropriate service afterward.

### `Route not found`

Confirm the request uses `/api/v1`, check the route in `/api/v1/docs/openapi.json`, and restart the backend after route changes. A stale process can keep an old Express route registry.

### CORS or login failures

Ensure the browser origin exactly matches `CLIENT_URL` and one of the comma-separated `CORS_ORIGINS` values. Confirm that the frontend points to `http://localhost:5000/api/v1` and that cookies are not being blocked by browser policy.

### Database migration or rollback protection

The fresh-database and rollback scripts intentionally require explicit environment flags. Set `ALLOW_FRESH_DB=true` or `ALLOW_ROLLBACK_TEST=true` only in an isolated development/test database.

## Security considerations

- Never commit `.env`, JWT secrets, SMTP passwords, database passwords, tokens, or uploaded files.
- Use long cryptographically random JWT secrets in production.
- Keep refresh tokens HTTP-only and rotate/revoke sessions through the auth API.
- Preserve tenant filters and role authorization in every new service query.
- Validate every request with Zod and never trust client-calculated payroll or performance totals.
- Store financial values as DECIMAL/integer-safe calculations; do not use frontend values as the source of truth.
- Keep locked payroll and finalized performance history immutable through normal actions.
- Do not log tokens, passwords, bank account numbers, or full sensitive payroll payloads.
- Restrict CORS to known frontend origins and run behind HTTPS in production.
- Keep dependency and database backups current and test restoration regularly.

## Project structure

```text
WorkNest/
├─ src/                         # React frontend
│  ├─ components/               # Shared UI components
│  ├─ context/                  # Authentication/session context
│  ├─ pages/                    # Public and protected pages
│  ├─ routes/                   # Protected and role route guards
│  ├─ services/                 # Axios/API clients
│  ├─ styles/                   # Global and module styles
│  └─ main.jsx                  # Frontend entry point and route tree
├─ backend/
│  ├─ src/
│  │  ├─ modules/               # Auth, organization, attendance, leave, payroll, performance, etc.
│  │  ├─ database/models/       # Sequelize models and associations
│  │  ├─ database/migrations/   # Versioned schema changes
│  │  ├─ middleware/            # Auth, authorization, validation, errors
│  │  ├─ routes/                # API route composition and OpenAPI metadata
│  │  └─ server.js              # API process entry point
│  ├─ scripts/                  # Migration, verification, backup, and QA helpers
│  └─ test/                     # Backend unit and regression tests
├─ public/                      # Static frontend assets and favicon
├─ docker-compose.yml           # Local MySQL/API/frontend stack
├─ Dockerfile.frontend         # Frontend container image
├─ WorkNest_Project_Proposal.md # Product proposal
└─ README.md
```

## Contribution guidelines

1. Create a focused branch for the change.
2. Preserve existing tenant isolation, authorization, validation, and response formats.
3. Use Sequelize migrations for schema changes; never alter production schema with `sync({ alter: true })`.
4. Add or update tests for changed behavior.
5. Run the frontend build, relevant backend tests, and database verification commands.
6. Update this README when commands, ports, environment variables, routes, or operational behavior change.
7. Keep commits focused and do not include secrets, generated `dist` artifacts, uploaded files, or local environment files.

## License

No license file is currently included in the repository. Until a license is added by the project owner, treat the code as proprietary and obtain permission before redistribution or commercial use.

## Kaggle development-data importer

The repository includes `backend/data/kaggle/Employee_Performance_Dataset.csv` and a development-only importer that creates realistic FairRank source records in an isolated tenant. It does not insert final scores, rating bands, equivalence groups, signatures, or promotion results directly; those are generated by the existing FairRank services.

Run it only against a development database:

```powershell
cd D:\WorkNest\backend
$env:ALLOW_TEST_DATA_SEED="true"
npm run db:seed:test-data
```

The importer refuses production mode, resets only `worknest-test-corporation`, uses bcrypt-hashed development credentials, validates/reports rejected rows, and writes the ignored `backend/data/kaggle/last-import-report.json` report. The generated admin account is `admin@test.worknest.local`; the password is printed only by the local command and is `WorkNestTestOnly123!` for development use.

Mappings include Task Completion to goals, KPI/attendance/peer/training/manager values to review criteria, and Work Hours Logged to supporting evidence context. Kaggle `Performance Score` and `Promotion Eligibility` remain reference-only. The importer also creates four deterministic edge employees targeting approximately 94.7, 94.5, 94.3, and 91.0 calculated scores for equivalence testing.

## Payroll integrity verification

Run this from `backend` against the configured development or staging MySQL database:

```powershell
node scripts/verify-payroll-integrity.js
# or
npm run db:verify:payroll
```

The verifier checks payroll tables, tenant keys, unique period/item constraints, duplicate records, parent-run total reconciliation, and supported statuses. Payroll uses integer cents for calculations, DECIMAL columns for persistence, transactional review/approval/locking, and audited locked-payroll adjustments.

The FairRank equivalence-group view now exposes a functional Info action for each group. It opens the tenant-scoped group members, score spread, rating band, and threshold from the existing equivalence API.

## Using FairRank

1. Sign in as an administrator or manager and open **FairRank** from the sidebar.
2. Create a cycle as an administrator, configure criteria and a template whose weights total exactly 100%, then activate the cycle.
3. Add goals and evidence, create the permitted self/manager reviews, and submit them.
4. As administrator, use **Calculate scores** after reviews are submitted. Scores are calculated by the backend; clients cannot provide final scores.
5. Use **Calibration** for HR review, then generate explanations, signatures, and fairness flags where applicable.
6. Open **FairRank**, choose a cycle, and use **Recalculate groups**. Select **Info** on a group to inspect its members, rating band, threshold, and score spread.
7. Use **Compare** for 2–5 employees. Use **Readiness**, **Rewards**, **Continuity**, and **TNA** for their separate decisions and development context.
8. Complete the cycle only after review and calibration. Employees see released results only when the cycle is `completed` or `archived`.

Managers are restricted to their department. Employees can access only their own permitted data. FairRank equivalence is a grouping aid, not forced ranking, and promotion readiness is intentionally separate from performance scoring.

Cycle names must contain at least three characters. The create-cycle dialog displays validation and API errors inline.

## Shared application shell

All authenticated pages render through `src/components/common/AppShell.jsx`. The shell owns the shared `Sidebar`, `Topbar`, mobile menu state, navigation callbacks, and logout flow. Do not add page-level sidebar markup. The sidebar keeps role-filtered navigation scrollable while its account and sign-out controls remain pinned at the bottom on desktop and mobile.

## Attendance Phase 1

The attendance foundation now uses transactional, tenant-scoped clock-in and clock-out mutations with row locking, duplicate protection, and audit events. The frontend uses the canonical `clockIn`/`clockOut` fields and the existing `PATCH /api/v1/attendance/:id/clock-out` endpoint. Shift, GPS, QR, biometric, and calendar enhancements are planned for later attendance phases.

Attendance Phase 2 adds tenant-scoped shifts, weekly schedules, effective-dated employee shift assignments, admin APIs, and an admin shift-management screen at `/attendance/shifts`.

Attendance Phase 3 derives late minutes, worked minutes, and overtime minutes from the effective shift assignment on the backend. Attendance records snapshot the shift timing rules used for the calculation, including overnight support, so later shift edits do not rewrite historical calculations.

Attendance Phase 4 adds the tenant-scoped calendar at `/attendance/calendar`. It derives Present, Late, Overtime, Absent, Leave, Holiday, Half Day, and Day off states from real attendance, approved leave, holidays, and schedules without fabricating attendance rows.

Attendance Phase 5 adds GPS clock-in through `/api/v1/attendance/clock-in/gps`. Admins configure allowed locations under `/attendance/shifts`; the backend validates tenant ownership, GPS accuracy, Haversine distance, active location status, and duplicate attendance before accepting the record.

Attendance Phase 9 refines the frontend experience with a today-status panel, source/shift context, late and overtime visibility, richer status filters, responsive loading skeletons, actionable empty states, and navigation between table, calendar, and shift-management views.

### Attendance Phase 10 — security, performance, and QA

### Deferred attendance features

QR Code Attendance is intentionally deferred. No QR token tables, endpoints, UI, or feature flags have been added. It should remain unavailable until explicitly scheduled for implementation.

Biometric Attendance is also deferred. No biometric device tables, provider adapters, ingestion endpoints, or biometric data storage have been added. Face recognition remains future-only and is not implemented.

### Phase 8 — Face recognition boundary

Phase 8 is intentionally closed as a future-only boundary. WorkNest currently accepts only web and GPS attendance sources. Any future face-recognition implementation must be introduced behind explicit tenant configuration, provider contracts, consent/privacy controls, retention rules, and security review. No face templates, images, embeddings, or recognition endpoints exist today.
### Attendance Phase 10 — security, performance, and QA

Phase 10 completed the final static hardening pass for attendance. Mutations remain transactional and tenant-scoped; role authorization, duplicate clock prevention, GPS validation, audit logging, and backend-derived shift calculations are covered by the test suite. The historical continuity importer syntax issue was corrected, and the backend test command now targets `test/` so guarded operational scripts are not auto-discovered. Zod v4-compatible shift update schemas derive partial objects before applying cross-field refinements.

Verification: `node --test test` passed 76 tests with 0 failures; `npm.cmd run build` passed; database schema, tenant-isolation, and safety verification passed; and `node --check scripts/historical-data/import-historical-hr.js` passed. Live browser/API checks require running services. QR and biometric attendance remain intentionally deferred.
