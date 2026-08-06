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
