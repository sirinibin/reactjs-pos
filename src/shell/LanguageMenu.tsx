import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { LANGUAGES, currentLang, setLanguage } from '@/i18n';

export function LanguageMenu({ variant = 'icon' }: { variant?: 'icon' | 'button' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cur = currentLang();
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      {variant === 'icon'
        ? <IconButton icon="globe" label={t('Language')} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} />
        : <button type="button" className="btn gh sm" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}><Icon name="globe" size="s" />{LANGUAGES.find((l) => l.code === cur)?.native}</button>}
      {open && (
        <div className="menu end" role="menu" aria-label={t('Language')}>
          {LANGUAGES.map((l) => (
            <button key={l.code} role="menuitemradio" aria-checked={l.code === cur} type="button" onClick={() => { setOpen(false); setLanguage(l.code); }}>
              <span lang={l.code === 'hn' ? 'hi' : l.code}>{l.native}</span>
              <span className="muted" style={{ flex: 'none', fontSize: 12 }}>{l.name}</span>
              {l.code === cur && <Icon name="check" size="s" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
