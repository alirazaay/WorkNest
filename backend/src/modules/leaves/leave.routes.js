import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { leaveCalendarSchema, leaveListSchema, leaveRequestSchema, leaveReviewSchema, leaveTypeSchema } from './leave.schemas.js';
import { balancesEmployee, balancesMe, calendar, requestApprove, requestCancel, requestCreate, requestGet, requestReject, requestsList, typesCreate, typesList } from './leave.controller.js';

const router = Router();
router.use(authenticate);

router.get('/types', authorize('admin', 'manager', 'employee'), typesList);
router.post('/types', authorize('admin'), validate(leaveTypeSchema), typesCreate);
router.get('/balances/me', authorize('admin', 'manager', 'employee'), balancesMe);
router.get('/balances/:employeeId', authorize('admin', 'manager'), balancesEmployee);
router.get('/calendar', authorize('admin', 'manager', 'employee'), validate(leaveCalendarSchema, 'query'), calendar);
router.get('/requests', authorize('admin', 'manager', 'employee'), validate(leaveListSchema, 'query'), requestsList);
router.get('/requests/:id', authorize('admin', 'manager', 'employee'), requestGet);
router.post('/requests', authorize('employee', 'manager'), validate(leaveRequestSchema), requestCreate);
router.patch('/requests/:id/approve', authorize('admin', 'manager'), requestApprove);
router.patch('/requests/:id/reject', authorize('admin', 'manager'), validate(leaveReviewSchema), requestReject);
router.patch('/requests/:id/cancel', authorize('employee', 'manager'), requestCancel);

export default router;
