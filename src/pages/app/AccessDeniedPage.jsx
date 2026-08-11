import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';

export default function AccessDeniedPage({ title = 'Access denied', message = 'You do not have permission to access this workspace.' }) {
  const navigate = useNavigate();
  return <main className="access-denied-page"><section className="state-message access-denied-state" role="alert"><ShieldAlert size={32} /><h1>{title}</h1><p>{message}</p><Button type="button" onClick={() => navigate('/dashboard')}>Back to overview</Button></section></main>;
}
