import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import PublicAuthLayout from './PublicAuthLayout.jsx';
import { resetPassword } from '../../services/authService.js';
import { getErrorMessage } from '../../config/app.js';

export default function ResetPassword() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const token = params.get('token') || ''; const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setError(''); setBusy(true); const form = new FormData(event.currentTarget); try { await resetPassword({ token, password: form.get('password'), confirmPassword: form.get('confirmPassword') }); navigate('/login', { replace: true, state: { message: 'Password reset successfully. Please sign in.' } }); } catch (requestError) { setError(getErrorMessage(requestError, 'This reset link is invalid or expired.')); } finally { setBusy(false); } }
  return <PublicAuthLayout title="Set a new password" description="Choose a secure password for your WorkNest account." footer={<Link to="/login">Back to sign in</Link>}>{!token && <div className="auth-error">This reset link is missing its token.</div>}<form onSubmit={submit}><label>New password<input type="password" name="password" required minLength="8" disabled={!token} autoFocus placeholder="At least 8 characters" /></label><label>Confirm password<input type="password" name="confirmPassword" required minLength="8" disabled={!token} placeholder="Repeat your password" /></label>{error && <div className="auth-error">{error}</div>}<Button type="submit" className="full" disabled={!token} loading={busy}>Reset password</Button></form></PublicAuthLayout>;
}
