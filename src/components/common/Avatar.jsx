export default function Avatar({ name = '', src, size = 'md' }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  return src ? <img className={`avatar ${size}`} src={src} alt={name} /> : <span className={`avatar ${size}`} aria-label={name}>{initials}</span>;
}
