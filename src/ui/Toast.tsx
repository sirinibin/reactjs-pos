import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

type Kind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: Kind; message: string; action?: { label: string; onClick: () => void } }
interface ToastApi {
  success: (m: string, action?: ToastItem['action']) => void;
  error: (m: string) => void;
  info: (m: string, action?: ToastItem['action']) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const push = useCallback((kind: Kind, message: string, action?: ToastItem['action']) => {
    const id = ++seq.current;
    setItems((x) => [...x.slice(-3), { id, kind, message, action }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), action ? 6000 : kind === 'error' ? 6000 : 3200);
  }, []);
  const api = useMemo<ToastApi>(() => ({
    success: (m, a) => push('success', m, a),
    error: (m) => push('error', m),
    info: (m, a) => push('info', m, a),
  }), [push]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite" role="status">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <Icon name={t.kind === 'success' ? 'checkc' : t.kind === 'error' ? 'xc' : 'info'} size="s" />
            <span>{t.message}</span>
            {t.action && (
              <button className="toast-a" onClick={() => { t.action!.onClick(); setItems((x) => x.filter((y) => y.id !== t.id)); }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used inside <ToastProvider>');
  return c;
}
