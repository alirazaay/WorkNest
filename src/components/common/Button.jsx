import { LoaderCircle } from 'lucide-react';

export default function Button({ children, variant = 'primary', size = 'md', loading = false, className = '', ...props }) {
  const classes = `${variant}-button ${size === 'sm' ? 'small' : ''} ${className}`.trim();
  return <button className={classes} disabled={loading || props.disabled} {...props}>{loading && <LoaderCircle className="button-spinner" size={15} />}{children}</button>;
}
