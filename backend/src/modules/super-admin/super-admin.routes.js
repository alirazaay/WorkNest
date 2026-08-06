import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { tenantListSchema } from './super-admin.schemas.js';
import { stats, tenantDeactivate, tenantGet, tenantReactivate, tenantsList } from './super-admin.controller.js';

const router = Router();
router.use(authenticate, authorize('super_admin'));
router.get('/stats', stats);
router.get('/tenants', validate(tenantListSchema, 'query'), tenantsList);
router.get('/tenants/:id', tenantGet);
router.patch('/tenants/:id/deactivate', tenantDeactivate);
router.patch('/tenants/:id/reactivate', tenantReactivate);

export default router;
