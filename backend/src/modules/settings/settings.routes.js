import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { companySettingsSchema, workHoursSchema } from './settings.schemas.js';
import { getSettings, updateCompany, updateWorkHours } from './settings.controller.js';

const router = Router();
router.use(authenticate, authorize('admin'));
router.get('/', getSettings);
router.put('/', validate(companySettingsSchema), updateCompany);
router.patch('/work-hours', validate(workHoursSchema), updateWorkHours);
export default router;
