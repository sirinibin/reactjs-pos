import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { IconButton } from '@/ui/Button';
import { Spinner } from '@/ui/Misc';
import { Icon } from '@/ui/Icon';
import { STAGE_LABELS, TERMINAL_STAGES } from '../logic';

export interface Progress { rfq_id?: string; stage: string; percent?: number; message?: string; code?: string }

/** Floating panel for the background AI pipeline (SSE rfq_progress); auto-clears 5 s after a terminal stage. */
export function LiveProgress({ progress, onClose }: { progress: Progress | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [p, setP] = useState(progress);
  useEffect(() => setP(progress), [progress]);
  useEffect(() => {
    if (!p || !TERMINAL_STAGES.has(p.stage)) return;
    const h = setTimeout(onClose, 5000);
    return () => clearTimeout(h);
  }, [p, onClose]);
  if (!p) return null;
  const done = TERMINAL_STAGES.has(p.stage);
  return (
    <div className="pr-live" role="status" aria-live="polite">
      {done ? <Icon name={p.stage === 'failed' ? 'alert' : 'checkc'} /> : <Spinner />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{t(STAGE_LABELS[p.stage] || p.stage)}</b>
        {p.message && <div className="muted" style={{ fontSize: 12 }}>{p.message}</div>}
        {!done && (p.percent || 0) > 0 && <div className="pr-bar"><i style={{ width: `${p.percent}%` }} /></div>}
        {p.rfq_id && <Link to={`/procurement/rfq/${p.rfq_id}`} className="link" style={{ fontSize: 12 }}>{t('Open RFQ')}</Link>}
      </div>
      <IconButton icon="x" label={t('Dismiss')} onClick={onClose} />
    </div>
  );
}
