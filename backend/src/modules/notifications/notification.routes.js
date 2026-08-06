import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { notificationsList, notificationRead, notificationsReadAll } from '../leaves/leave.controller.js';

const router = Router();
router.use(authenticate, authorize('admin', 'manager', 'employee'));
router.get('/', notificationsList);
router.patch('/:id/read', notificationRead);
router.patch('/read-all', notificationsReadAll);

export default router;
