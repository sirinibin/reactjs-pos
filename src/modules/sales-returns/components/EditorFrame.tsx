import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/Button';
import { ObjectBody, ObjectHeader } from '@/ui/ObjectPage';
import type { IconName } from '@/ui/Icon';
import { fmtMoney } from '@/lib/format';
import '../sales-returns.css';

/** Header + body + mobile save bar shared by the return and non-VAT editors (Ctrl+S, F2, unsaved guard). */
export function EditorFrame({ crumbs, icon, title, pills, side, children, onSave, onSaveNew, onClose, saving, canSave, dirty, total, editing }: {
  crumbs: { label: string; to?: string }[]; icon: IconName; title: ReactNode; pills?: ReactNode; side: ReactNode; children: ReactNode;
  onSave: () => void; onSaveNew?: () => void; onClose: () => void; saving: boolean; canSave: boolean; dirty: boolean; total: number; editing: boolean;
}) {
  const { t } = useTranslation();
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current(); }
      if (e.key === 'F2') { const el = document.getElementById('doc-add-item'); if (el) { e.preventDefault(); el.focus(); } }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
  return (
    <>
      <ObjectHeader
        crumbs={crumbs.map((c) => ({ ...c, label: t(c.label) }))}
        icon={icon}
        title={title}
        pills={pills}
        actions={
          <div className="row doc-actions">
            <Button variant="ghost" onClick={onClose}>{t(dirty ? 'Discard' : 'Close')}</Button>
            {!editing && onSaveNew && <Button onClick={onSaveNew} disabled={!canSave} loading={saving}>{t('Save & new')}</Button>}
            <Button variant="primary" icon="check" onClick={onSave} loading={saving} disabled={!canSave}>
              {t(editing ? 'Save changes' : 'Save')} <kbd className="kbd-inv">Ctrl S</kbd>
            </Button>
          </div>
        }
      />
      <ObjectBody side={<aside className="stack sr-side">{side}</aside>}>{children}</ObjectBody>
      <div className="mbar">
        <div className="t"><span>{t('Total')}</span><b className="num">{fmtMoney(total)}</b></div>
        <Button variant="primary" icon="check" onClick={onSave} loading={saving} disabled={!canSave}>{t('Save')}</Button>
      </div>
    </>
  );
}
