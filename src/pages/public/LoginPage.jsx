import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import { login } from '../../services/authService.js';
import { getErrorMessage } from '../../config/app.js';

export default function LoginPage({ onSuccess }) {
  const navigate = useNavigate();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false);
  async function submit(event) { event.preventDefault(); setError(''); const form = new FormData(event.currentTarget); const email = String(form.get('email') || '').trim().toLowerCase(); const password = String(form.get('password') || ''); if (!email || !password) { setError('Enter your email and password.'); return; } setBusy(true); try { onSuccess(await login({ email, password })); } catch (requestError) { setError(getErrorMessage(requestError, 'Unable to sign in. Check your email and password.')); } finally { setBusy(false); } }
  return <main className="login-reference">
    <section className="login-hero"><div className="login-hero-content"><h1>Empower Your Workforce</h1><p>Streamline your HR processes, manage talent effectively, and build a stronger, more connected organization with WorkNest&apos;s comprehensive suite of tools.</p></div></section>
    <section className="login-panel"><div className="login-content">
      <div className="login-brand"><span className="login-brand-mark"><BriefcaseBusiness size={27} strokeWidth={1.8} /></span><h2>WorkNest</h2><p>Sign in to your account</p></div>
      <form className="login-form" onSubmit={submit}>
        <label>Email Address<div className="login-input-wrap"><Mail size={19} /><input name="email" type="email" required autoFocus placeholder="name@company.com" /></div></label>
        <label className="login-password-label"><span>Password</span><Link to="/forgot-password">Forgot Password?</Link><div className="login-input-wrap"><KeyRound size={19} /><input name="password" type={showPassword ? 'text' : 'password'} required placeholder="••••••••" /><button type="button" className="login-eye" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></label>
        <label className="login-remember"><input type="checkbox" name="remember" /> <span>Remember me for 30 days</span></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <Button type="submit" className="login-submit" loading={busy}>Sign In</Button>
      </form>
      <div className="login-divider"><span>Or continue with</span></div>
      <div className="login-providers"><button type="button"><BriefcaseBusiness size={20} /> SSO</button><button type="button"><KeyRound size={20} /> SAML</button></div>
      <p className="login-register">Don&apos;t have an account? <Link to="/register">Request access</Link></p>
      <nav className="login-footer"><a href="#privacy">Privacy Policy</a><i /> <a href="#terms">Terms of Service</a><i /> <a href="#help">Help Center</a></nav>
    </div></section>
  </main>;
}
