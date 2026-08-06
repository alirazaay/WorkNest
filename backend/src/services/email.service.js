import { logger } from '../config/logger.js';

// Phase 2 keeps email delivery behind an adapter. Nodemailer/provider wiring
// can be added without changing auth services in the next infrastructure pass.
export async function sendPasswordResetEmail({ email, resetUrl }) {
  logger.info({ email, resetUrl }, 'Password reset email queued (development adapter)');
}

export async function sendInvitationEmail({ email, inviteUrl }) {
  logger.info({ email, inviteUrl }, 'Invitation email queued (development adapter)');
}
