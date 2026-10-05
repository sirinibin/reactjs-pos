import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';
import { Modal } from './Overlay';

export function Tabs<T extends string>({ tabs, value, onChange, className = 'otabs', label }: {
  tabs: { id: T; label: ReactNode; count?: number | string; hidden?: boolean }[];
  value: T; onChange: (v: T) => void; className?: string; label?: string;
}) {
  return (
    <div className={className} role="tablist" aria-label={label}>
      {tabs.filter((t) => !t.hidden).map((t) => (
        <button key={t.id} role="tab" type="button" aria-selected={t.id === value} onClick={() => onChange(t.id)}>
          <span>{t.label}</span>
          {t.count !== undefined && <span className="c num">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 10 }: { width?: number | string; height?: number }) {
  return <div className="sk" style={{ width, height }} aria-hidden />;
}

export function EmptyState({ icon = 'inbox', title, children, action }: { icon?: IconName; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-ic"><Icon name={icon} /></div>
      <div className="empty-t">{title}</div>
      {children && <div className="empty-d">{children}</div>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div className="banner crit" role="alert">
      <Icon name="xc" size="s" />
      <div style={{ flex: 1 }}><b>Couldn’t load this data.</b> {msg}</div>
      {onRetry && <Button size="sm" icon="refresh" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Banner({ tone, children, icon }: { tone: 'info' | 'warn' | 'crit' | 'good'; children: ReactNode; icon?: IconName }) {
  const ic: IconName = icon || (tone === 'crit' ? 'xc' : tone === 'warn' ? 'alert' : tone === 'good' ? 'checkc' : 'info');
  return (
    <div className={`banner ${tone}`} role={tone === 'crit' ? 'alert' : undefined}>
      <Icon name={ic} size="s" />
      <div>{children}</div>
    </div>
  );
}

/** Imperative-style confirm dialog; returns [element, ask(): Promise<boolean>]. */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; body?: ReactNode; danger?: boolean; confirmLabel?: string; resolve: (v: boolean) => void } | null>(null);
  const ask = (title: string, opts: { body?: ReactNode; danger?: boolean; confirmLabel?: string } = {}) =>
    new Promise<boolean>((resolve) => setState({ title, ...opts, resolve }));
  const close = (v: boolean) => { state?.resolve(v); setState(null); };
  const el = (
    <Modal open={!!state} onClose={() => close(false)} title={state?.title || ''} width={440}
      footer={<>
        <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
        <Button variant={state?.danger ? 'danger' : 'primary'} className={state?.danger ? 'danger-solid' : undefined} onClick={() => close(true)} data-autofocus>
          {state?.confirmLabel || 'Confirm'}
        </Button>
      </>}>
      {state?.body}
    </Modal>
  );
  return [el, ask] as const;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <span className="spin" role="status" aria-label={label} />;
}
