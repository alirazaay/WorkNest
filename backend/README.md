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

Run foundation tests with `npm test`.

## Endpoints

- `GET /` — service metadata
- `GET /api/v1/health` — API and database health check

The health endpoint intentionally checks MySQL connectivity. It returns `503` when the API is running but the database is unavailable.

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
