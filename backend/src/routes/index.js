import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import organizationRoutes from '../modules/organization/organization.routes.js';
import attendanceRoutes from '../modules/attendance/attendance.routes.js';

const router = Router();
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/', organizationRoutes);
router.use('/attendance', attendanceRoutes);

export default router;
