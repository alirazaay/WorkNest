import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import PublicAuthLayout from './PublicAuthLayout.jsx';
import { registerCompany } from '../../services/authService.js';
import { getErrorMessage } from '../../config/app.js';

export default function Register({ onSuccess }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setError(''); setBusy(true); const form = new FormData(event.currentTarget); const payload = Object.fromEntries(form.entries()); try { const session = await registerCompany(payload); onSuccess(session); } catch (requestError) { setError(getErrorMessage(requestError, 'Unable to create your workspace.')); } finally { setBusy(false); } }
  return <PublicAuthLayout title="Create your workspace" description="Set up WorkNest for your company in a few minutes." footer={<span>Already have an account? <Link to="/login">Sign in</Link></span>}><form onSubmit={submit}><label>Company name<input name="companyName" required minLength="2" placeholder="Acme Corporation" /></label><label>Industry<select name="industry" defaultValue="Technology"><option>Technology</option><option>Manufacturing</option><option>Healthcare</option><option>Retail</option><option>Education</option><option>Other</option></select></label><label>Company size<select name="companySize" defaultValue="1-10"><option>1-10</option><option>11-50</option><option>51-200</option><option>200+</option></select></label><label>Admin full name<input name="adminName" required minLength="2" placeholder="Your full name" /></label><label>Admin email<input name="adminEmail" required type="email" placeholder="you@company.com" /></label><label>Password<input name="password" required minLength="8" type="password" placeholder="At least 8 characters" /></label><label>Confirm password<input name="confirmPassword" required minLength="8" type="password" placeholder="Repeat your password" /></label><label className="checkbox-field"><input name="termsAccepted" required type="checkbox" /> I agree to the Terms and Conditions</label>{error && <div className="auth-error" role="alert">{error}</div>}<Button className="full" loading={busy}>Create your workspace <span>→</span></Button></form></PublicAuthLayout>;
}
