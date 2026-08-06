import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import organizationRoutes from '../modules/organization/organization.routes.js';
import attendanceRoutes from '../modules/attendance/attendance.routes.js';
import leaveRoutes from '../modules/leaves/leave.routes.js';
import notificationRoutes from '../modules/notifications/notification.routes.js';
import payrollRoutes from '../modules/payroll/payroll.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import superAdminRoutes from '../modules/super-admin/super-admin.routes.js';

const router = Router();
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/', organizationRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leaves', leaveRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payroll', payrollRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/super', superAdminRoutes);

export default router;
