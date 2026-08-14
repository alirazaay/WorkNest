import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { locationCreateSchema, locationUpdateSchema } from './location.schemas.js';
import { locationCreateHandler, locationDeleteHandler, locationUpdateHandler, locationsListHandler } from './location.controller.js';

const router = Router();
router.use(authenticate);
router.get('/', authorize('admin', 'manager', 'employee'), locationsListHandler);
router.post('/', authorize('admin'), validate(locationCreateSchema), locationCreateHandler);
router.patch('/:id', authorize('admin'), validate(locationUpdateSchema), locationUpdateHandler);
router.delete('/:id', authorize('admin'), locationDeleteHandler);
export default router;
