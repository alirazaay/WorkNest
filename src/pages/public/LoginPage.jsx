import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import PublicAuthLayout from './PublicAuthLayout.jsx';
import { login } from '../../services/authService.js';
import { getErrorMessage } from '../../config/app.js';

export default function LoginPage({ onSuccess }) {
  const navigate = useNavigate(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false);
  async function submit(event) { event.preventDefault(); setError(''); const form = new FormData(event.currentTarget); const email = String(form.get('email') || '').trim().toLowerCase(); const password = String(form.get('password') || ''); if (!email || !password) { setError('Enter your email and password.'); return; } setBusy(true); try { onSuccess(await login({ email, password })); } catch (requestError) { setError(getErrorMessage(requestError, 'Unable to sign in. Check your email and password.')); } finally { setBusy(false); } }
  return <PublicAuthLayout title="Welcome back" description="Sign in to continue to your WorkNest workspace." footer={<span>Don’t have an account? <Link to="/register">Register your company</Link></span>}><form onSubmit={submit}><label>Email address<input name="email" type="email" required autoFocus placeholder="you@company.com" /></label><label>Password<div className="password-field"><input name="password" type={showPassword ? 'text' : 'password'} required placeholder="Enter your password" /><button type="button" className="password-toggle" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label><div className="auth-links"><Link to="/forgot-password">Forgot password?</Link></div>{error && <div className="auth-error" role="alert">{error}</div>}<Button type="submit" className="full" loading={busy}>Sign in <span>→</span></Button></form><button type="button" className="auth-back" onClick={() => navigate('/')}>← Back to home</button></PublicAuthLayout>;
}
