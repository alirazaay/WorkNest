import { X } from 'lucide-react';

export default function Modal({ open, title, description, onClose, children, width = 'md' }) {
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose?.()}><section className={`modal modal-${width}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button type="button" className="modal-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}{children}</section></div>;
}
