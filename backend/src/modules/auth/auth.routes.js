import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { acceptInvitationSchema, forgotPasswordSchema, inviteSchema, loginSchema, registerSchema, resetPasswordSchema } from './auth.schemas.js';
import { acceptInvitationHandler, forgotPassword, inviteHandler, loginHandler, logoutHandler, me, refreshHandler, register, resetPasswordHandler } from './auth.controller.js';

const router = Router();

router.post('/register-company', validate(registerSchema), register);
router.post('/login', validate(loginSchema), loginHandler);
router.post('/refresh', refreshHandler);
router.post('/refresh-token', refreshHandler);
router.post('/logout', logoutHandler);
router.get('/me', authenticate, me);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPasswordHandler);
router.post('/invitations', authenticate, authorize('admin'), validate(inviteSchema), inviteHandler);
router.post('/invite', authenticate, authorize('admin'), validate(inviteSchema), inviteHandler);
router.post('/invitations/accept', validate(acceptInvitationSchema), acceptInvitationHandler);
router.post('/set-password', validate(acceptInvitationSchema), acceptInvitationHandler);

export default router;
