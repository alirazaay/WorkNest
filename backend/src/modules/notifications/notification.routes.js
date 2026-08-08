import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { notificationsList, notificationRead, notificationsReadAll } from '../leaves/leave.controller.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

const notificationQuerySchema = z.object({ limit: z.coerce.number().int().positive().max(100).optional() });

const router = Router();
router.use(authenticate, authorize('admin', 'manager', 'employee'));
router.patch('/read-all', notificationsReadAll);
router.get('/', validate(notificationQuerySchema, 'query'), notificationsList);
router.patch('/:id/read', notificationRead);

export default router;
