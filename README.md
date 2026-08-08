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
7. **Payroll Management:** Salary structure, monthly payroll generation, payslips.
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
