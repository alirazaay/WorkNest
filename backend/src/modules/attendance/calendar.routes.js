import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { calendarQuerySchema, holidayCreateSchema, holidayUpdateSchema } from './calendar.schemas.js';
import { calendarHandler, holidayCreateHandler, holidayDeleteHandler, holidayUpdateHandler, holidaysListHandler } from './calendar.controller.js';

const router = Router();
router.use(authenticate);
router.get('/', authorize('admin', 'manager', 'employee'), validate(calendarQuerySchema, 'query'), calendarHandler);
router.get('/holidays', authorize('admin', 'manager', 'employee'), holidaysListHandler);
router.post('/holidays', authorize('admin'), validate(holidayCreateSchema), holidayCreateHandler);
router.patch('/holidays/:id', authorize('admin'), validate(holidayUpdateSchema), holidayUpdateHandler);
router.delete('/holidays/:id', authorize('admin'), holidayDeleteHandler);
export default router;
