import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import PublicAuthLayout from './PublicAuthLayout.jsx';
import { requestPasswordReset } from '../../services/authService.js';
import { getErrorMessage } from '../../config/app.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { await requestPasswordReset(email); setSent(true); } catch (requestError) { setError(getErrorMessage(requestError)); } finally { setBusy(false); } }
  return <PublicAuthLayout title={sent ? 'Check your email' : 'Forgot your password?'} description={sent ? 'If an account exists for that email, a reset link has been sent.' : 'Enter your email and we’ll send you a secure reset link.'} footer={<Link to="/login">← Back to sign in</Link>}>{!sent && <form onSubmit={submit}><label>Email address<input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoFocus placeholder="you@company.com" /></label>{error && <div className="auth-error">{error}</div>}<Button type="submit" className="full" loading={busy}>Send reset link</Button></form>}</PublicAuthLayout>;
}
