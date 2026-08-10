# WorkNest API

Phase 1 foundation for the WorkNest HR platform.

## Setup

1. Create a MySQL database named `worknest`.
2. Copy `.env.example` to `.env` and set the database credentials.
3. Install dependencies with `npm install`.
4. Start the API with `npm run dev`.

To create the Phase 2 auth tables after configuring MySQL:

```powershell
npm run db:migrate
```

The Phase 3 migration adds departments, employees, salary structures, and employee documents. Run the same command after the Phase 2 migration to apply it in order.

Run foundation tests with `npm test`.

## Endpoints

- `GET /` — service metadata
- `GET /api/v1/health` — API and database health check

The health endpoint intentionally checks MySQL connectivity. It returns `503` when the API is running but the database is unavailable.

If a newly added route returns `Route not found`, restart the backend process listening on port `5000`; Express loads route modules at startup.

If `npm run dev` reports `EADDRINUSE`, another API process already owns port `5000`. Stop that exact PID with PowerShell, then rerun `npm run dev`.

Payroll bonus and loan list queries explicitly order by the MySQL `created_at` column. This avoids Sequelize-generated `createdAt` SQL errors with the underscored schema.

The FairRank performance-management Phase 1 audit is maintained in the repository root at `performance_phase1_audit.md`. Performance tables and APIs will be added incrementally in later approved phases.

## FairRank Phase 2

- `GET /api/v1/performance/cycles`
- `POST /api/v1/performance/cycles`
- `GET /api/v1/performance/cycles/:id`
- `PATCH /api/v1/performance/cycles/:id`

Performance cycles are tenant-scoped. Only administrators can create or update cycles. Lifecycle transitions are validated, cycle configuration freezes after activation, and only one active cycle is permitted per tenant/year/type.

## Phase 2 auth endpoints

- `POST /api/v1/auth/register-company`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/invitations`
- `POST /api/v1/auth/invitations/accept`

## Phase 3 organization endpoints

- `GET|POST /api/v1/departments`
- `PATCH|DELETE /api/v1/departments/:id`
- `GET|POST /api/v1/employees`
- `GET|PATCH|DELETE /api/v1/employees/:id`
- `PATCH /api/v1/employees/:id/status`
- `POST /api/v1/employees/:id/salary-structures`
- `POST|GET /api/v1/employees/:id/documents`

Employee document uploads currently use local storage under `backend/uploads/documents`; this should be replaced with object storage before production deployment.

## Phase 4 attendance endpoints

- `POST /api/v1/attendance/clock-in`
- `PATCH /api/v1/attendance/:id/clock-out`
- `GET /api/v1/attendance/me`
- `GET /api/v1/attendance`
- `GET /api/v1/attendance/:employeeId`
- `GET /api/v1/attendance/summary`

## Phase 5 leave and notification endpoints

- `GET|POST /api/v1/leaves/types`
- `GET /api/v1/leaves/balances/me`
- `GET /api/v1/leaves/balances/:employeeId`
- `GET /api/v1/leaves/requests`
- `POST /api/v1/leaves/requests`
- `PATCH /api/v1/leaves/requests/:id/approve`
- `PATCH /api/v1/leaves/requests/:id/reject`
- `PATCH /api/v1/leaves/requests/:id/cancel`
- `GET /api/v1/leaves/calendar`
- `GET /api/v1/leaves/notifications`
- `PATCH /api/v1/leaves/notifications/:id/read`

## Payroll subsystem

- `POST /api/v1/payroll/generate`
- `GET /api/v1/payroll/runs`
- `GET /api/v1/payroll/runs/:id`
- `POST /api/v1/payroll/runs/:id/approve`
- `POST /api/v1/payroll/runs/:id/lock`
- `GET /api/v1/payroll/me`
- `GET /api/v1/payroll/items/:id/payslip`
- `GET /api/v1/payroll/items/:id/pdf`
- `GET /api/v1/payroll/export/csv?runId=:id`
- `GET /api/v1/payroll/salary-structures[/:employeeId]`
- `POST /api/v1/payroll/salary-structures/:employeeId/change`
- `GET|POST /api/v1/payroll/components`
- `PATCH /api/v1/payroll/components/:id`
- `POST /api/v1/payroll/components/:componentId/employees/:employeeId`
- `GET|POST /api/v1/payroll/bonuses`
- `POST /api/v1/payroll/bonuses/:id/approve|reject`
- `GET|POST /api/v1/payroll/deductions`
- `PATCH /api/v1/payroll/deductions/:id`
- `GET|POST /api/v1/payroll/loans`
- `GET /api/v1/payroll/loans/:id/installments`
- `POST /api/v1/payroll/loans/:id/approve|reject`
- `GET|POST /api/v1/payroll/bank-accounts/:employeeId`
- `PATCH /api/v1/payroll/bank-accounts/:id`
- `GET /api/v1/payroll/runs/:id/review`
- `GET /api/v1/payroll/runs/:id/export/bank`
- `GET|POST /api/v1/payroll/tax/:employeeId`
- `POST /api/v1/payroll/adjustments`
- `POST /api/v1/payroll/adjustments/:id/approve`

Bank exports support `standard`, `hbl`, `meezan`, and `ubl` layouts through `?format=`. Locked payroll is not edited directly; corrections are recorded as tenant-scoped payroll adjustments and require approval. Employee tax configuration is effective-dated and becomes a payroll snapshot during generation.

Payroll is generated once per tenant/month/year. Salary structures are effective-dated and changed by closing the previous row before creating a new row. Payroll items snapshot employee, salary, and bank information; line items retain their source type and source ID. Approved bonuses and loan installments are marked processed/deducted transactionally to prevent duplicate inclusion. Bank exports are restricted to approved or locked runs. Locked payroll remains immutable through normal payroll actions; corrections should use a future adjustment workflow.

The subsystem migrations are `20260808000200-add-payroll-subsystem.js` and `20260808000300-add-tax-and-payroll-adjustments.js`. Apply them with `npm run db:migrate`; do not use `sequelize.sync({ alter: true })`. Financial values are stored in MySQL DECIMAL columns. The generation service uses integer-cents arithmetic for its calculations and the server remains authoritative for all calculated totals.

## Phase 7 dashboard endpoints

- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/attendance-trend`
- `GET /api/v1/dashboard/headcount`
- `GET /api/v1/dashboard/payroll-trend`
- `GET /api/v1/dashboard/activity`

Dashboard responses are tenant-scoped and narrowed to the manager's department or the employee's own records where applicable. Notification list responses include `items` and `unreadCount`.

## Phase 8 Super Admin endpoints

- `GET /api/v1/super/stats`
- `GET /api/v1/super/tenants`
- `GET /api/v1/super/tenants/:id`
- `PATCH /api/v1/super/tenants/:id/deactivate`
- `PATCH /api/v1/super/tenants/:id/reactivate`

Super Admin tenant detail returns workspace metadata and aggregate counts only; it does not expose individual employee records.

## Phase 9 hardening

- `GET /api/v1/health/live` — process liveness
- `GET /api/v1/health/ready` — database readiness
- `GET /api/v1/docs/openapi.json` — OpenAPI document
- Global and authentication-specific rate limits
- Request IDs returned through `x-request-id`
- Audit log migration for sensitive actions
- Docker image definition in `Dockerfile`
- MySQL backup script in `scripts/backup.ps1`
- GitHub Actions backend checks in `.github/workflows/backend.yml`

Apply the audit-log migration with:

```powershell
npm run db:migrate
```

Run backups from an environment with `mysqldump` installed:

```powershell
./scripts/backup.ps1 -OutputDirectory ./backups
```

## Phase 11 environment setup

Use `.env.example` for a local host setup or `.env.docker.example` when running Docker Compose. SMTP, Redis, and cloud storage are optional; email falls back to structured logging when `EMAIL_ENABLED=false`, and Redis is available through the Compose `redis` profile.

```powershell
docker compose up --build -d
docker compose --profile redis up -d redis
Copy-Item .env.docker.example .env
npm run db:migrate
npm run db:seed:demo
./scripts/verify-environment.ps1
```

## Phase 12 database initialization and verification

```powershell
npm run db:migrate
npm run db:seed:demo
npm run db:verify
```

The verification command checks the expected tables, indexes, foreign keys, and core constraints. To test a fresh local database, set `ALLOW_FRESH_DB=true` and run `npm run db:fresh`. To test the latest migration rollback/re-apply, set `ALLOW_ROLLBACK_TEST=true` and run `npm run db:rollback:test`.

Create and restore backups with:

```powershell
npm run db:backup
npm run db:restore -- -BackupFile ./backups/worknest-YYYYMMDD-HHMMSS.sql -ConfirmRestore
```
