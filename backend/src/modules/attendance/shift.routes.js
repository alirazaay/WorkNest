import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { shiftAssignmentCreateSchema, shiftAssignmentUpdateSchema, shiftCreateSchema, shiftScheduleSchema, shiftUpdateSchema } from './shift.schemas.js';
import { assignEmployeeShiftHandler, createShiftHandler, getShiftScheduleHandler, listEmployeeAssignmentsHandler, listShiftsHandler, replaceShiftScheduleHandler, updateEmployeeShiftHandler, updateShiftHandler } from './shift.controller.js';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/', listShiftsHandler);
router.post('/', validate(shiftCreateSchema), createShiftHandler);
router.patch('/:id', validate(shiftUpdateSchema), updateShiftHandler);
router.get('/:id/schedule', getShiftScheduleHandler);
router.put('/:id/schedule', validate(shiftScheduleSchema), replaceShiftScheduleHandler);
router.get('/employees/:employeeId/assignments', listEmployeeAssignmentsHandler);
router.post('/employees/:employeeId/assignments', validate(shiftAssignmentCreateSchema), assignEmployeeShiftHandler);
router.patch('/employees/:employeeId/assignments/:assignmentId', validate(shiftAssignmentUpdateSchema), updateEmployeeShiftHandler);

export default router;
