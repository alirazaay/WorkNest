import { Check, XCircle } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;
  return <div className={`toast toast-${type}`} role="status">{type === 'success' ? <Check size={16} /> : <XCircle size={16} />}{message}{onClose && <button type="button" onClick={onClose} aria-label="Dismiss notification">×</button>}</div>;
}
