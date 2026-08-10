# WorkNest FairRank — Phase 1 Audit

Date: 2026-08-10

## 1. Existing reusable structures

### Backend architecture

- Express modular routing is mounted from `backend/src/routes/index.js`.
- Modules are separated into authentication, organization, attendance, leave, notifications, dashboard, payroll, settings, and super-admin areas.
- Sequelize models are registered centrally in `backend/src/database/models/index.js`.
- Database changes use ordered Sequelize migrations. `sequelize.sync({ alter: true })` is not used.
- Controllers use a consistent `try/catch/next` pattern and return `{ success: true, data }` responses.
- Zod validation is applied through `backend/src/middleware/validate.js`, which stores sanitized values in `req.validated`.

### Identity, tenancy, and permissions

- `User` contains `tenantId`, `role`, `status`, identity, and avatar information.
- `Employee` links a user to a tenant, department, employee code, designation, and employment status.
- `Department` is tenant-scoped and linked to employees.
- `authenticate` derives tenant and role from the verified JWT and database user. It does not trust a tenant ID supplied by the frontend.
- `authorize` provides role allow-lists for routes.
- Existing roles are `super_admin`, `admin`, `manager`, and `employee` (with the project also supporting the `super-admin` spelling in one route guard).
- Existing organization and dashboard services demonstrate tenant-scoped queries and manager/employee scope rules that can be reused for performance access control.

### Audit, notifications, and UI

- `audit_logs` and `recordAudit()` already support tenant, actor, action, entity, before/after JSON, IP, and request ID.
- Notifications already support tenant/user ownership, read state, entity references, and the `/api/v1/notifications` API.
- The frontend uses React Router, shared page shells, `api` Axios service, shared loading/error/toast components, and the existing WorkNest visual system.
- No performance navigation route or performance UI component currently exists.

## 2. Missing performance entities

No performance-specific Sequelize models, migrations, services, controllers, routes, validators, or pages were found.

Required new domain areas:

1. Performance cycles
2. Criteria, templates, and template criteria
3. Goals/KPIs
4. Evidence and verification
5. Reviews and criterion scores
6. Score snapshots and rating bands
7. Equivalence groups and members
8. Deterministic performance signatures
9. Promotion profiles, readiness criteria, and assessments
10. Reward recommendations
11. Calibration and manual override records
12. Evidence/fairness flags
13. Tenant configuration for blind review and equivalence threshold

Every performance-owned table must include `tenant_id`. Historical review, score, calibration, and reward records must be versioned or finalized rather than physically deleted.

## 3. Required migrations

Use additive migrations in this order:

- `create-performance-cycles-and-settings`
- `create-performance-criteria-and-templates`
- `create-performance-goals-and-evidence`
- `create-performance-reviews-and-scores`
- `create-performance-bands-and-snapshots`
- `create-performance-equivalence-groups`
- `create-performance-signatures`
- `create-promotion-profiles-and-assessments`
- `create-performance-rewards-and-calibration`
- `create-performance-flags`

Important constraints:

- Unique tenant/year/cycle identity where appropriate.
- Only one active cycle per tenant/year/type.
- Criteria weights must total exactly 100% before a template can be activated.
- Criteria/template configuration becomes immutable once a cycle reaches review.
- Evidence, score snapshots, calibration overrides, and finalized reviews must remain historically readable.
- Foreign keys and tenant-aware indexes must be created for every relationship.

## 4. Required APIs

The performance module should be mounted at `/api/v1/performance` and follow current response, validation, authentication, and authorization conventions.

Initial API groups:

- Cycles: list, create, view, update, activate, close/archive
- Templates: list, create, view, update, criteria assignment, weight validation
- Goals: list, create, update, employee goals
- Evidence: create, list, verify/reject
- Reviews: list, create, view, submit
- Scores: employee score, cycle calculation, snapshot retrieval
- FairRank: equivalence groups, recalculation, employee comparison
- Calibration: workspace, confirm, request clarification, justified override
- Promotion: profiles, readiness criteria, assessments, employee readiness
- Rewards: recommendations, approval, status history
- Employee APIs: own goals, evidence, reviews, and released appraisal only

Role boundaries:

- Admin/HR: configure, calibrate, finalize, and manage promotion/reward workflows.
- Manager: only authorized team goals, evidence, and reviews.
- Employee: own goals/evidence/self-review and released own appraisal.
- Super Admin: no detailed employee appraisal access by default.

## 5. Required frontend pages

Add a dedicated protected `/performance` area using the current WorkNest shell:

1. Performance Overview
2. Performance Cycles
3. Templates and criteria weights
4. Employee Goals/KPIs
5. My Performance
6. Manager Reviews
7. Calibration Workspace
8. FairRank Comparison
9. Advancement Readiness
10. Final Appraisal Report

All screens need role-based visibility, loading states, empty states, retry states, confirmation dialogs for finalization/overrides, and clear separation between:

- Annual performance result
- Promotion readiness
- Reward recommendation

## 6. Implementation plan

### Phase B — Database and models

Create migrations, models, associations, tenant indexes, and immutable/finalized status fields.

### Phase C — Cycles and templates

Implement cycle lifecycle, role-specific templates, criteria, weight validation, and review-stage configuration freeze.

### Phase D — Goals and evidence

Implement measurable goals, evidence attachments/references, verification, and evidence coverage calculations.

### Phase E — Reviews and calculation

Implement self/manager reviews, criterion scores, deterministic weighted score calculation, rating snapshots, and server-side authority.

### Phase F — Bands and FairRank

Implement configurable rating bands, equivalence threshold, grouping, and no-forced-ranking behavior.

### Phase G — Performance signatures

Implement deterministic signature rules based on strongest weighted criteria; no random or silent AI ratings.

### Phase H — Calibration

Implement review workspace, evidence visibility, justified overrides, audit history, and optional blind mode.

### Phase I — Promotion readiness

Implement independent promotion profiles, readiness criteria, gap analysis, and separate recommendations.

### Phase J — Rewards

Implement reward recommendations without changing performance ratings when budget or opportunity slots are limited.

### Phase K — Employee transparency

Implement released appraisal reports with strict self-only access and confidentiality rules.

### Phase L — Notifications and audit

Add cycle, review, calibration, override, release, and pending-action notifications plus complete audit coverage.

### Phase M — Testing and QA

Test tenant isolation, roles, 100% weights, score calculations, snapshots, equivalence, signatures, promotion separation, overrides, and finalized-cycle immutability.

## Phase 1 conclusion

WorkNest has a suitable multi-tenant modular foundation for FairRank. The safest implementation is a new `performance` module that reuses existing authentication, tenant scope, Zod validation, audit logs, notifications, employee/department relationships, and frontend page infrastructure. No performance code should be duplicated into payroll, dashboard, or organization modules.

Phase 2 should begin with the performance-cycle schema and lifecycle APIs.
