import Logo from '../../components/common/Logo.jsx';

export default function PublicAuthLayout({ title, description, children, footer }) {
  return <div className="auth-screen"><div className="auth-card public-auth-card"><Logo /><h1>{title}</h1><p>{description}</p>{children}{footer && <div className="auth-footer">{footer}</div>}</div></div>;
}
