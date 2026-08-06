import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { payrollPeriodSchema, payrollRunQuerySchema } from './payroll.schemas.js';
import { csvExport, generateHandler, itemGet, itemPeriodGet, myList, pdfExport, runApprove, runGet, runLock, runsList } from './payroll.controller.js';

const router = Router();
router.use(authenticate);
router.get('/me', authorize('admin', 'manager', 'employee'), myList);
router.get('/', authorize('admin'), validate(payrollRunQuerySchema, 'query'), runsList);
router.post('/generate', authorize('admin'), validate(payrollPeriodSchema), generateHandler);
router.post('/runs', authorize('admin'), validate(payrollPeriodSchema), generateHandler);
router.get('/runs', authorize('admin'), validate(payrollRunQuerySchema, 'query'), runsList);
router.get('/runs/:id', authorize('admin'), runGet);
router.post('/runs/:id/approve', authorize('admin'), runApprove);
router.post('/runs/:id/lock', authorize('admin'), runLock);
router.get('/export/csv', authorize('admin'), csvExport);
router.get('/items/:id/payslip', authorize('admin', 'manager', 'employee'), itemGet);
router.get('/items/:id/pdf', authorize('admin', 'manager', 'employee'), pdfExport);
router.get('/:employeeId/:month/:year', authorize('admin', 'manager', 'employee'), itemPeriodGet);

export default router;
