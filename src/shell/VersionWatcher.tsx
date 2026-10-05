import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/ui/Toast';

/** Detect a new deployment (index.html asset fingerprint changes) and offer a reload (admin.md §1.7). */
export async function assetFingerprint(): Promise<string> {
  const r = await fetch(`/index.html?_=${Date.now()}`, { cache: 'no-store' });
  const html = await r.text();
  return (html.match(/\/assets\/[^"']+\.(?:js|css)/g) || []).sort().join('|');
}

export function VersionWatcher() {
  const { t } = useTranslation();
  const toast = useToast();
  const base = useRef<string | null>(null);
  const shown = useRef(false);
  useEffect(() => {
    const check = async () => {
      try {
        const fp = await assetFingerprint();
        if (!fp) return;
        if (base.current === null) base.current = fp;
        else if (fp !== base.current && !shown.current) {
          shown.current = true;
          toast.info(t('A new version of StartERP is available.'), { label: t('Refresh now'), onClick: () => window.location.reload() });
        }
      } catch { /* offline */ }
    };
    check();
    const h = setInterval(check, 10 * 60 * 1000);
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(h); document.removeEventListener('visibilitychange', onVis); };
  }, [t, toast]);
  return null;
}
