import { logger } from '../config/logger.js';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transport;
function getTransport() {
  if (!env.EMAIL_ENABLED || !env.SMTP_HOST) return null;
  transport ||= nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE, auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined });
  return transport;
}
async function sendEmail({ to, subject, text }) {
  const mailer = getTransport();
  if (!mailer) { logger.info({ to, subject }, 'Email delivery disabled; message logged only'); return; }
  await mailer.sendMail({ from: env.EMAIL_FROM, to, subject, text });
}

// Phase 2 keeps email delivery behind an adapter. Nodemailer/provider wiring
// can be added without changing auth services in the next infrastructure pass.
export async function sendPasswordResetEmail({ email, resetUrl }) {
  await sendEmail({ to: email, subject: 'Reset your WorkNest password', text: `Reset your password here: ${resetUrl}` });
}

export async function sendInvitationEmail({ email, inviteUrl }) {
  await sendEmail({ to: email, subject: 'You have been invited to WorkNest', text: `Activate your WorkNest account here: ${inviteUrl}` });
}

export async function sendLeaveRequestEmail({ tenantId, employeeEmail }) {
  await sendEmail({ to: employeeEmail, subject: 'New WorkNest leave request', text: 'A leave request is awaiting review in WorkNest.' });
}

export async function sendLeaveDecisionEmail({ email, status, comment }) {
  await sendEmail({ to: email, subject: `WorkNest leave request ${status}`, text: `Your leave request was ${status}.${comment ? ` Comment: ${comment}` : ''}` });
}

export async function sendPayrollGeneratedEmail({ email, month, year }) {
  await sendEmail({ to: email, subject: `Your WorkNest payslip for ${month}/${year}`, text: 'Your payslip is available in WorkNest.' });
}
