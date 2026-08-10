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

After adding backend routes, restart the API process so its in-memory Express route registry reloads. A stale process on port `5000` can return `Route not found` even when the route exists in source code.

If `npm run dev` reports `EADDRINUSE`, find and stop the listener before starting the watcher:

```powershell
netstat -ano | Select-String ':5000.*LISTENING'
Stop-Process -Id <PID> -Force
cd backend
npm run dev
```
