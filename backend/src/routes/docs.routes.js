import { Router } from 'express';

const router = Router();
const security = [{ bearerAuth: [] }];
const jsonResponse = (description = 'Successful response') => ({ description, content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' } } } } } });

const openapi = {
  openapi: '3.0.3', info: { title: 'WorkNest API', version: '0.1.0', description: 'Multi-tenant HR management API.' }, servers: [{ url: '/api/v1' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/health/live': { get: { summary: 'Liveness check', responses: { 200: jsonResponse() } } },
    '/health/ready': { get: { summary: 'Readiness and database check', responses: { 200: jsonResponse(), 503: jsonResponse('Database unavailable') } } },
    '/auth/register-company': { post: { summary: 'Register a tenant and admin', responses: { 201: jsonResponse('Workspace created') } } },
    '/auth/login': { post: { summary: 'Login', responses: { 200: jsonResponse() } } },
    '/auth/refresh': { post: { summary: 'Rotate refresh session', responses: { 200: jsonResponse() } } },
    '/auth/logout': { post: { security, summary: 'Revoke refresh session', responses: { 204: { description: 'Logged out' } } } },
    '/departments': { get: { security, summary: 'List departments', responses: { 200: jsonResponse() } }, post: { security, summary: 'Create department', responses: { 201: jsonResponse() } } },
    '/employees': { get: { security, summary: 'List employees', responses: { 200: jsonResponse() } }, post: { security, summary: 'Create employee', responses: { 201: jsonResponse() } } },
    '/attendance/clock-in': { post: { security, summary: 'Clock in', responses: { 201: jsonResponse() } } },
    '/attendance/:id/clock-out': { patch: { security, summary: 'Clock out', responses: { 200: jsonResponse() } } },
    '/leaves/requests': { get: { security, summary: 'List leave requests', responses: { 200: jsonResponse() } }, post: { security, summary: 'Submit leave request', responses: { 201: jsonResponse() } } },
    '/leaves/requests/{id}/approve': { patch: { security, summary: 'Approve leave request', responses: { 200: jsonResponse() } } },
    '/leaves/requests/{id}/reject': { patch: { security, summary: 'Reject leave request', responses: { 200: jsonResponse() } } },
    '/payroll/generate': { post: { security, summary: 'Generate monthly payroll', responses: { 201: jsonResponse() } } },
    '/payroll/runs': { get: { security, summary: 'List payroll runs', responses: { 200: jsonResponse() } } },
    '/dashboard/summary': { get: { security, summary: 'Role-specific dashboard summary', responses: { 200: jsonResponse() } } },
    '/super/stats': { get: { security, summary: 'Platform statistics', responses: { 200: jsonResponse() } } },
    '/super/tenants': { get: { security, summary: 'List tenants', responses: { 200: jsonResponse() } } }
  }
};

router.get('/openapi.json', (req, res) => res.json(openapi));
router.get('/', (req, res) => res.json({ success: true, data: { specification: `${req.baseUrl}/openapi.json`, message: 'Use the OpenAPI document with Swagger UI or Postman.' } }));

export default router;
