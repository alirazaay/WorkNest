import { LoaderCircle } from 'lucide-react';

export default function Button({ children, variant = 'primary', size = 'md', loading = false, className = '', type = 'button', ...props }) {
  const classes = `${variant}-button ${size === 'sm' ? 'small' : ''} ${className}`.trim();
  return <button type={type} className={classes} {...props} disabled={loading || props.disabled}>{loading && <LoaderCircle className="button-spinner" size={15} />}{children}</button>;
}
