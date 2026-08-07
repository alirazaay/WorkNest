import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({ items = [] }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb">{items.map((item, index) => <span key={`${item.label}-${index}`} className={index === items.length - 1 ? 'current' : ''}>{index > 0 && <ChevronRight size={13} />}{item.href && index !== items.length - 1 ? <a href={item.href}>{item.label}</a> : item.label}</span>)}</nav>;
}
