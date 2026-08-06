import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { activityQuerySchema, trendQuerySchema } from './dashboard.schemas.js';
import { activityHandler, attendanceTrendHandler, headcountHandler, payrollTrendHandler, summaryHandler } from './dashboard.controller.js';

const router = Router();
router.use(authenticate, authorize('admin', 'manager', 'employee'));
router.get('/summary', summaryHandler);
router.get('/attendance-trend', validate(trendQuerySchema, 'query'), attendanceTrendHandler);
router.get('/headcount', authorize('admin', 'manager'), headcountHandler);
router.get('/payroll-trend', authorize('admin'), validate(trendQuerySchema, 'query'), payrollTrendHandler);
router.get('/activity', validate(activityQuerySchema, 'query'), activityHandler);

export default router;
