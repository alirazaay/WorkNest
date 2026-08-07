import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import PublicAuthLayout from './PublicAuthLayout.jsx';
import { login } from '../../services/authService.js';
import { getErrorMessage } from '../../config/app.js';

export default function LoginPage({ onSuccess }) {
  const navigate = useNavigate(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setError(''); setBusy(true); const form = new FormData(event.currentTarget); try { onSuccess(await login({ email: form.get('email'), password: form.get('password') })); } catch (requestError) { setError(getErrorMessage(requestError, 'Unable to sign in. Check your email and password.')); } finally { setBusy(false); } }
  return <PublicAuthLayout title="Welcome back" description="Sign in to continue to your WorkNest workspace." footer={<span>Don’t have an account? <Link to="/register">Register your company</Link></span>}><form onSubmit={submit}><label>Email address<input name="email" type="email" required autoFocus placeholder="you@company.com" /></label><label>Password<input name="password" type="password" required placeholder="Enter your password" /></label><div className="auth-links"><Link to="/forgot-password">Forgot password?</Link></div>{error && <div className="auth-error" role="alert">{error}</div>}<Button className="full" loading={busy}>Sign in <span>→</span></Button></form><button className="auth-back" onClick={() => navigate('/')}>← Back to home</button></PublicAuthLayout>;
}
