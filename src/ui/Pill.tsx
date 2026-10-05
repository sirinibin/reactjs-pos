import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type Tone = 'good' | 'warn' | 'crit' | 'info' | 'neutral';
const DEFAULT_ICON: Record<Tone, IconName> = { good: 'checkc', warn: 'clock', crit: 'alert', info: 'info', neutral: 'clock' };

/** Status pill — always icon + label so status never relies on colour alone. */
export function Pill({ tone, icon, children, title }: { tone: Tone; icon?: IconName; children: ReactNode; title?: string }) {
  return (
    <span className={`pill ${tone}`} title={title}>
      <Icon name={icon || DEFAULT_ICON[tone]} />
      {children}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>;
}
