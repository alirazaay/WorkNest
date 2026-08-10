import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { cycleCreate, cycleGet, cyclesList, cycleUpdate } from './performance.controller.js';
import { performanceCycleCreateSchema, performanceCycleQuerySchema, performanceCycleUpdateSchema } from './performance.schemas.js';

const router = Router();
router.use(authenticate);
router.get('/cycles', authorize('admin', 'manager', 'employee'), validate(performanceCycleQuerySchema, 'query'), cyclesList);
router.post('/cycles', authorize('admin'), validate(performanceCycleCreateSchema), cycleCreate);
router.get('/cycles/:id', authorize('admin', 'manager', 'employee'), cycleGet);
router.patch('/cycles/:id', authorize('admin'), validate(performanceCycleUpdateSchema), cycleUpdate);
export default router;
