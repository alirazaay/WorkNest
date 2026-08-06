# WorkNest
## WorkNest

WorkNest is a React frontend with a separate Express backend.

### Frontend

```powershell
npm install
npm run dev
```

### Backend — Phase 1

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

The health endpoint checks MySQL connectivity and returns `503` when the database is unavailable. Database schema migrations will be added in the next phase.

### Phase 10 local integration

Frontend API configuration is available in [.env.example](D:/WorkNest/.env.example), with the default API base URL set to `http://localhost:5000/api/v1`.

For a complete local stack with MySQL:

```powershell
docker compose up --build -d
cd backend
npm run db:migrate
npm run db:seed:demo
cd ..
npm run dev
```

Demo admin credentials:

```text
admin@acme-demo.local
ChangeMe123!
```

Run the API smoke checks with `backend/scripts/smoke-test.ps1` after the backend is available.
