import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { session } from '@/api/session';
import { Pill } from '@/ui/Pill';
import { Icon } from '@/ui/Icon';
import { IconButton } from '@/ui/Button';
import { Banner } from '@/ui/Misc';
import { Field, Select } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { AI_PROVIDERS, fileCapabilityLabel, firstConfiguredProvider, modelsForProvider, providerHasKey } from '../providers';
import { sseUrl } from '../api';
import { statusMeta, fmtBytes } from '../logic';
import '../procurement.css';

export function RfqStatusPill({ status }: { status?: string }) {
  const { t } = useTranslation();
  const m = statusMeta(status);
  return <Pill tone={m.tone} icon={m.icon}>{t(m.label)}</Pill>;
}

/** Live server-sent events for the store (§2a). Handlers are read through a ref so callers needn't memoise. */
export function useRfqEvents(storeId: string | undefined, handlers: Record<string, (data: any) => void>) {
  const ref = useRef(handlers);
  ref.current = handlers;
  const events = Object.keys(handlers).sort().join(',');
  useEffect(() => {
    if (!storeId || typeof EventSource === 'undefined') return;
    let es: EventSource;
    try { es = new EventSource(sseUrl(storeId)); } catch { return; }
    const names = events.split(',').filter(Boolean);
    const fns = names.map((n) => {
      const fn = (e: MessageEvent) => {
        let d: any = {};
        try { d = e.data ? JSON.parse(e.data) : {}; } catch { d = {}; }
        ref.current[n]?.(d);
      };
      es.addEventListener(n, fn as EventListener);
      return [n, fn] as const;
    });
    return () => { fns.forEach(([n, fn]) => es.removeEventListener(n, fn as EventListener)); es.close(); };
  }, [storeId, events]);
}

const PROV_KEY = '_rfq_extract_provider';
const MODEL_KEY = '_rfq_extract_model';

/** Provider + model selects, persisted per browser (§10.12); warns when the provider has no key. */
export function useAiChoice() {
  const { store } = useAuth();
  const settings = store?.settings;
  const [provider, setProviderState] = useState(() => session.get(PROV_KEY) || firstConfiguredProvider(settings).value);
  const [model, setModelState] = useState(() => session.get(MODEL_KEY) || modelsForProvider(session.get(PROV_KEY) || firstConfiguredProvider(settings).value)[0]?.value || '');
  const setProvider = (p: string) => { setProviderState(p); session.set(PROV_KEY, p); const m = modelsForProvider(p)[0]?.value || ''; setModelState(m); session.set(MODEL_KEY, m); };
  const setModel = (m: string) => { setModelState(m); session.set(MODEL_KEY, m); };
  return { provider, model, setProvider, setModel, hasKey: providerHasKey(provider, settings) };
}

export function AiPicker({ ai, compact }: { ai: ReturnType<typeof useAiChoice>; compact?: boolean }) {
  const { t } = useTranslation();
  const { store } = useAuth();
  const models = modelsForProvider(ai.provider);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className={compact ? 'row' : 'grid-2c'} style={compact ? { flexWrap: 'wrap' } : undefined}>
        <Field label={t('AI provider')}>{(id) => (
          <Select id={id} value={ai.provider} onChange={(e) => ai.setProvider(e.target.value)} options={AI_PROVIDERS.map((p) => ({ value: p.value, label: `${p.label}${providerHasKey(p.value, store?.settings) ? ' ✓' : ''}` }))} />
        )}</Field>
        <Field label={t('Model')}>{(id) => (
          <Select id={id} value={ai.model} onChange={(e) => ai.setModel(e.target.value)} options={models.map((m) => ({ value: m.value, label: `${m.label} · ${m.costLabel}${fileCapabilityLabel(m)}` }))} />
        )}</Field>
      </div>
      {!ai.hasKey && <Banner tone="warn">{t('No API key is saved for this provider. Add it under Procurement settings → AI models, or extraction will fail.')}</Banner>}
    </div>
  );
}

/** Drop zone + file list. */
export function FileDrop({ files, onChange, accept, label, multiple = true, hint }: { files: File[]; onChange: (f: File[]) => void; accept?: string; label: string; multiple?: boolean; hint?: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const add = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    const exts = (accept || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    const ok = exts.length ? arr.filter((f) => exts.some((e) => f.name.toLowerCase().endsWith(e))) : arr;
    if (ok.length < arr.length) toast.error(t('Some files were skipped (unsupported type).'));
    onChange(multiple ? [...files, ...ok] : ok.slice(0, 1));
  };
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className={`pr-drop${over ? ' over' : ''}`} role="button" tabIndex={0} aria-label={label}
        onClick={() => input.current?.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}>
        <Icon name="upload" />
        <span><b>{label}</b><br /><span className="muted">{hint || t('Drop files here or click to browse')}{accept ? ` · ${accept}` : ''}</span></span>
        <input ref={input} type="file" hidden multiple={multiple} accept={accept} onChange={(e) => { add(e.target.files); e.target.value = ''; }} data-testid={`file-${label}`} />
      </div>
      {files.length > 0 && (
        <ul className="pr-files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}><Icon name="file" size="s" /><bdi>{f.name}</bdi><span className="muted num">{fmtBytes(f.size)}</span>
              <IconButton icon="x" label={`${t('Remove')} ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Editable list of string chips (categories, markets, keywords…). Enter adds, duplicates ignored. */
export function ChipsInput({ value, onChange, placeholder, label, normalize }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; label: string; normalize?: (s: string) => string }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = (normalize ? normalize(draft) : draft).trim();
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div className="pr-chips">
      {value.map((c) => (
        <span className="tag" key={c}><bdi>{c}</bdi><button type="button" className="pr-x" aria-label={`${t('Remove')} ${c}`} onClick={() => onChange(value.filter((x) => x !== c))}>×</button></span>
      ))}
      <input className="inp" aria-label={label} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} onBlur={add} />
    </div>
  );
}

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  return <IconButton icon="copy" label={label || t('Copy')} onClick={() => { navigator.clipboard?.writeText(text).then(() => toast.success(t('Copied')), () => toast.error(t('Copy failed'))); }} />;
}

export function Section({ title, children, actions }: { title: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      <div className="card-h"><h3>{title}</h3><span className="spacer" />{actions}</div>
      <div className="card-b">{children}</div>
    </section>
  );
}
