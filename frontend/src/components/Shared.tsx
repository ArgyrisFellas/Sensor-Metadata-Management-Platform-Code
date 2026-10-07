import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, X } from 'lucide-react';
import type { User } from '../lib/types';

export const UserContext = createContext<User | null>(null);
export function useUser() { const user = useContext(UserContext); if (!user) throw new Error('Authentication required'); return user; }
export const NoticeContext = createContext<(message: string) => void>(() => {});
export function useNotice() { return useContext(NoticeContext); }
export function NoticeProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  useEffect(() => { if (message) { const timer = window.setTimeout(() => setMessage(''), 5500); return () => window.clearTimeout(timer); } }, [message]);
  return <NoticeContext.Provider value={setMessage}>{children}{message && <div className="toast" role="status"><CheckCircle2 size={19}/>{message}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setMessage('')}><X size={17}/></button></div>}</NoticeContext.Provider>;
}
export function ErrorMessage({ error }: { error: unknown }) { return error ? <div className="error-message" role="alert"><AlertCircle size={18}/><span>{error instanceof Error ? error.message : String(error)}</span></div> : null; }
export function Loading({ label = 'Loading your workspace…' }: { label?: string }) { return <div className="loading" role="status"><LoaderCircle className="spin" size={24}/><span>{label}</span></div>; }
export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{children}</p>{action}</div>; }
export function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) { return <header className="page-heading"><div><div className="eyebrow">{eyebrow || 'YOUR WORKSPACE'}</div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</header>; }
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => dialog.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus(), 0);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
      if (event.key !== 'Tab') return;
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]') || []).filter(el => el.offsetParent !== null);
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { window.clearTimeout(timer); document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={id} className={`modal ${wide ? 'modal-wide' : ''}`}><header className="modal-header"><h2 id={id}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></header>{children}</div></div>;
}
export function dateLabel(value: unknown, full = false) { if (!value) return '—'; const date = new Date(String(value)); if (Number.isNaN(date.getTime())) return String(value); return full ? date.toLocaleString() : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
export function titleCase(value: unknown) { return String(value || '').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase()); }
