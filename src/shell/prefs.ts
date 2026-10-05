import { KEYS, session } from '@/api/session';

export type Theme = 'light' | 'dark' | 'system';
export function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = t;
  session.set(KEYS.theme, t);
}
export const getTheme = (): Theme => (session.get(KEYS.theme) as Theme) || 'system';
export const isDark = () => {
  const t = getTheme();
  return t === 'dark' || (t === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
};

export type Density = 'comfortable' | 'compact';
export function applyDensity(d: Density) {
  document.documentElement.dataset.density = d;
  session.set(KEYS.density, d);
}
export const getDensity = (): Density => (session.get(KEYS.density) as Density) || 'comfortable';
