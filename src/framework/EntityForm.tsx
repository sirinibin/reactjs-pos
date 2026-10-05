import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/api/client';
import { useSave } from '@/api/hooks';
import { Field, Input, Select, Textarea, Checkbox } from '@/ui/Field';
import { AsyncPicker, type PickerOption } from '@/ui/AsyncPicker';
import { Drawer, Modal } from '@/ui/Overlay';
import { Button } from '@/ui/Button';
import { Banner } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { parseNumber } from '@/lib/format';

export type FieldDef =
  | { name: string; label: string; type: 'text' | 'email' | 'tel' | 'password' | 'date'; required?: boolean; hint?: string; placeholder?: string; span?: 1 | 2; dir?: 'rtl' | 'ltr'; maxLength?: number }
  | { name: string; label: string; type: 'number'; required?: boolean; hint?: string; min?: number; max?: number; step?: number; span?: 1 | 2 }
  | { name: string; label: string; type: 'textarea'; required?: boolean; hint?: string; span?: 1 | 2; dir?: 'rtl' | 'ltr' }
  | { name: string; label: string; type: 'select'; options: { value: string; label: string }[]; required?: boolean; hint?: string; span?: 1 | 2; placeholder?: string }
  | { name: string; label: string; type: 'checkbox'; hint?: string; span?: 1 | 2 }
  | { name: string; label: string; type: 'picker'; load: (q: string, s: AbortSignal) => Promise<PickerOption[]>; labelField?: string; required?: boolean; hint?: string; span?: 1 | 2 }
  | { name: string; label: string; type: 'custom'; render: (v: any, set: (v: any) => void, values: Record<string, any>) => ReactNode; span?: 1 | 2; required?: boolean };

export interface EntityFormProps {
  open: boolean;
  onClose: () => void;
  endpoint: string;
  title: string;
  fields: FieldDef[];
  initial?: Record<string, any> | null;
  /** Transform values before POST/PUT. */
  toBody?: (v: Record<string, any>) => Record<string, any>;
  onSaved?: (rec: any) => void;
  validate?: (v: Record<string, any>) => Record<string, string>;
  modal?: boolean;
  invalidate?: string[];
}

/** Schema-driven create/edit form for master data (categories, brands, warehouses…). */
export function EntityForm(p: EntityFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const save = useSave(p.endpoint, { invalidate: p.invalidate });
  const blank = useMemo(() => Object.fromEntries(p.fields.map((f) => [f.name, f.type === 'checkbox' ? false : f.type === 'picker' ? null : ''])), [p.fields]);
  const [v, setV] = useState<Record<string, any>>(blank);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const editing = !!p.initial?.id;

  useEffect(() => {
    if (!p.open) return;
    const init: Record<string, any> = { ...blank };
    if (p.initial) {
      for (const f of p.fields) {
        const raw = p.initial[f.name];
        if (f.type === 'picker') init[f.name] = raw ? { id: raw, label: p.initial[f.labelField || f.name.replace(/_id$/, '_name')] || raw, data: null } : null;
        else init[f.name] = raw ?? init[f.name];
      }
    }
    setV(init);
    setErrs({});
    // Reset only when the form opens or switches record — callers needn't memoise fields/initial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.open, p.initial?.id]);

  const set = (k: string, val: any) => { setV((x) => ({ ...x, [k]: val })); if (errs[k]) setErrs((e) => ({ ...e, [k]: '' })); };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const local: Record<string, string> = {};
    p.fields.forEach((f) => {
      if ('required' in f && f.required) {
        const val = v[f.name];
        if (val === '' || val === null || val === undefined) local[f.name] = t('{{f}} is required', { f: t(f.label) });
      }
    });
    Object.assign(local, p.validate?.(v) || {});
    if (Object.values(local).some(Boolean)) { setErrs(local); return; }
    const body: Record<string, any> = {};
    p.fields.forEach((f) => {
      const val = v[f.name];
      // Empty number fields are sent as null so toBody (or the server) can apply its default.
      if (f.type === 'number') body[f.name] = val === '' || val === null || val === undefined ? null : parseNumber(val);
      else if (f.type === 'picker') body[f.name] = val?.id || null;
      else body[f.name] = typeof val === 'string' ? val.trim() : val;
    });
    try {
      const rec = await save.mutateAsync({ id: p.initial?.id, body: p.toBody ? p.toBody(body) : body });
      toast.success(editing ? t('Saved') : t('Created'));
      p.onSaved?.(rec);
      p.onClose();
    } catch (err) {
      if (err instanceof ApiError) setErrs({ ...err.errors });
      else toast.error((err as Error).message);
    }
  };

  const known = new Set(p.fields.map((f) => f.name));
  const otherErrors = Object.entries(errs).filter(([k, m]) => m && !known.has(k));
  const W = p.modal ? Modal : Drawer;

  return (
    <W open={p.open} onClose={p.onClose} title={t(p.title)} width={p.modal ? 560 : 520}
      footer={<>
        <Button variant="ghost" onClick={p.onClose}>{t('Cancel')}</Button>
        <Button variant="primary" icon="check" loading={save.isPending} onClick={() => submit()}>{editing ? t('Save changes') : t('Create')}</Button>
      </>}>
      <form onSubmit={submit} noValidate className="grid-2c">
        {otherErrors.length > 0 && <div style={{ gridColumn: '1/-1' }}><Banner tone="crit">{otherErrors.map(([, m]) => m).join(' · ')}</Banner></div>}
        {p.fields.map((f) => (
          <Field key={f.name} label={f.type === 'checkbox' ? undefined : t(f.label)} required={'required' in f && f.required} hint={'hint' in f && f.hint ? t(f.hint) : undefined} error={errs[f.name]}
            className={f.span === 2 || f.type === 'textarea' ? 'span2' : undefined}>
            {(id, d) => {
              const common = { id, 'aria-describedby': d, invalid: !!errs[f.name] };
              switch (f.type) {
                case 'textarea': return <Textarea {...common} dir={f.dir} value={v[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} />;
                case 'select': return <Select {...common} value={v[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} options={f.options.map((o) => ({ ...o, label: t(o.label) }))} placeholder={f.placeholder !== undefined ? t(f.placeholder) : undefined} />;
                case 'checkbox': return <Checkbox id={id} label={t(f.label)} checked={!!v[f.name]} onChange={(e) => set(f.name, e.target.checked)} />;
                case 'number': return <Input {...common} inputMode="decimal" value={v[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} className="num" />;
                case 'picker': return <AsyncPicker id={id} aria-describedby={d} invalid={!!errs[f.name]} value={v[f.name]} onChange={(o) => set(f.name, o)} load={f.load} eager clearable placeholder={t('Search…')} />;
                case 'custom': return f.render(v[f.name], (x) => set(f.name, x), v);
                default: return <Input {...common} type={f.type} dir={'dir' in f ? f.dir : undefined} maxLength={'maxLength' in f ? f.maxLength : undefined} placeholder={'placeholder' in f && f.placeholder ? t(f.placeholder) : undefined} value={v[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} />;
              }
            }}
          </Field>
        ))}
        <button type="submit" hidden />
      </form>
    </W>
  );
}
