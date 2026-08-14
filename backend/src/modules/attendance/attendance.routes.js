import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { attendanceQuerySchema, attendanceSummarySchema } from './attendance.schemas.js';
import { gpsClockInSchema } from './location.schemas.js';
import { clockInHandler, clockOutHandler, employeeHandler, gpsClockInHandler, listHandler, myHandler, summaryHandler } from './attendance.controller.js';

const router = Router();
router.use(authenticate);

router.post('/clock-in', authorize('admin', 'manager', 'employee'), clockInHandler);
router.post('/clock-in/gps', authorize('admin', 'manager', 'employee'), validate(gpsClockInSchema), gpsClockInHandler);
router.post('/clockin', authorize('admin', 'manager', 'employee'), clockInHandler);
router.patch('/:id/clock-out', authorize('admin', 'manager', 'employee'), clockOutHandler);
router.patch('/clockout/:id', authorize('admin', 'manager', 'employee'), clockOutHandler);
router.get('/me', authorize('admin', 'manager', 'employee'), validate(attendanceQuerySchema, 'query'), myHandler);
router.get('/summary', authorize('admin', 'manager'), validate(attendanceSummarySchema, 'query'), summaryHandler);
router.get('/:employeeId', authorize('admin', 'manager'), validate(attendanceQuerySchema, 'query'), employeeHandler);
router.get('/', authorize('admin', 'manager'), validate(attendanceQuerySchema, 'query'), listHandler);

export default router;
