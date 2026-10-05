import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';

/** Trap Tab focus inside `root` and restore focus to the opener on unmount. */
function useFocusTrap(open: boolean, root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const el = root.current;
    const focusables = () =>
      Array.from(el?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') || []).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') || focusables()[0];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !el) return;
      const f = focusables();
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [open, root]);
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, footer, width = 560 }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEscape(open, onClose);
  useFocusTrap(open, ref);
  if (!open) return null;
  return createPortal(
    <div className="ov-root">
      <div className="scrim on" onClick={onClose} />
      <div className="modal on" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} style={{ width: `min(${width}px, 100%)` }}>
          <div className="dialog-h">
            <h2>{title}</h2>
            <IconButton icon="x" label="Close" onClick={onClose} />
          </div>
          <div className="dialog-b">{children}</div>
          {footer && <div className="dialog-f">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children, footer, width = 560 }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEscape(open, onClose);
  useFocusTrap(open, ref);
  if (!open) return null;
  return createPortal(
    <div className="ov-root">
      <div className="scrim on" onClick={onClose} />
      <aside ref={ref} className="drawer on" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} style={{ width: `min(${width}px, 100%)` }}>
        <div className="drawer-h">
          <h2>{title}</h2>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>
        <div className="drawer-b">{children}</div>
        {footer && <div className="drawer-f">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}
