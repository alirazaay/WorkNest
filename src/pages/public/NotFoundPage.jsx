import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';

export default function NotFoundPage({ authenticated }) { const navigate = useNavigate(); return <main className="not-found-page"><div className="not-found-mark">404</div><div className="eyebrow">WorkNest</div><h1>Page not found</h1><p>The page you’re looking for does not exist or may have moved.</p><Button onClick={() => navigate(authenticated ? '/dashboard' : '/')}>{authenticated ? 'Back to dashboard' : 'Back to home'}</Button></main>; }
