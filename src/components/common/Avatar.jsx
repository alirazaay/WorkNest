import { useState } from 'react';

export default function Avatar({ name = '', src, size = 'md' }) {
  const [imageError, setImageError] = useState(false);
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  return src && !imageError ? <img className={`avatar ${size}`} src={src} alt={name} onError={() => setImageError(true)} /> : <span className={`avatar ${size}`} aria-label={name}>{initials}</span>;
}
