import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ObjectBody, ObjectHeader, type Crumb } from '@/ui/ObjectPage';
import { Button } from '@/ui/Button';
import { Banner } from '@/ui/Misc';
import type { IconName } from '@/ui/Icon';
import { usePageMeta } from '@/shell/Workspace';

/** Ctrl/⌘+S → save. */
export function useCtrlS(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); ref.current(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);
}

/** Editor page chrome: header with Cancel/Save, body + side, mobile save bar, error banner. */
export function FormShell({ title, crumbs, icon, editing, saving, canSave = true, onSave, onCancel, side, errors, children, pills, mobileTotal }: {
  title: string; crumbs: Crumb[]; icon: IconName; editing: boolean; saving: boolean; canSave?: boolean; onSave: () => void; onCancel: () => void;
  side?: ReactNode; errors?: string[]; children: ReactNode; pills?: ReactNode; mobileTotal?: { label: string; value: ReactNode };
}) {
  const { t } = useTranslation();
  usePageMeta(title, editing ? 'edit' : 'plus');
  useCtrlS(() => { if (canSave && !saving) onSave(); });
  const errs = (errors || []).filter(Boolean);
  return (
    <>
      <ObjectHeader crumbs={crumbs} icon={icon} title={title} pills={pills}
        actions={
          <div className="row doc-actions">
            <Button variant="ghost" onClick={onCancel}>{t('Cancel')}</Button>
            <Button variant="primary" icon="check" onClick={onSave} loading={saving} disabled={!canSave}>
              {t(editing ? 'Save changes' : 'Save')} <kbd style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>Ctrl S</kbd>
            </Button>
          </div>
        } />
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }} noValidate>
        <ObjectBody side={side}>
          {errs.length > 0 && (
            <Banner tone="crit"><b>{t('{{n}} error(s) — please fix before saving:', { n: errs.length })}</b> {errs.join(' · ')}</Banner>
          )}
          {children}
        </ObjectBody>
        <button type="submit" hidden />
      </form>
      <div className="mbar">
        <div className="t">{mobileTotal ? <><span>{mobileTotal.label}</span><b className="num">{mobileTotal.value}</b></> : <span>{title}</span>}</div>
        <Button variant="ghost" onClick={onCancel}>{t('Cancel')}</Button>
        <Button variant="primary" icon="check" onClick={onSave} loading={saving} disabled={!canSave}>{t('Save')}</Button>
      </div>
    </>
  );
}
