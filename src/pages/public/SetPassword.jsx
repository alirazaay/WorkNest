import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import PublicAuthLayout from './PublicAuthLayout.jsx';
import { acceptInvitation } from '../../services/authService.js';
import { getErrorMessage } from '../../config/app.js';

export default function SetPassword() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const token = params.get('token') || ''; const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setError(''); setBusy(true); const form = new FormData(event.currentTarget); try { await acceptInvitation({ token, name: form.get('name'), password: form.get('password'), confirmPassword: form.get('confirmPassword') }); navigate('/login', { replace: true, state: { message: 'Account activated. You can now sign in.' } }); } catch (requestError) { setError(getErrorMessage(requestError, 'This invitation is invalid or expired.')); } finally { setBusy(false); } }
  return <PublicAuthLayout title="Activate your account" description="Set your password to join your WorkNest workspace." footer={<Link to="/login">Already activated? Sign in</Link>}>{!token && <div className="auth-error">This invitation link is missing its token.</div>}<form onSubmit={submit}><label>Full name<input name="name" required minLength="2" disabled={!token} placeholder="Your full name" /></label><label>Password<input name="password" type="password" required minLength="8" disabled={!token} placeholder="At least 8 characters" /></label><label>Confirm password<input name="confirmPassword" type="password" required minLength="8" disabled={!token} placeholder="Repeat your password" /></label>{error && <div className="auth-error">{error}</div>}<Button type="submit" className="full" disabled={!token} loading={busy}>Activate account</Button></form></PublicAuthLayout>;
}
