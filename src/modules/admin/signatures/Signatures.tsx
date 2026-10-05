import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth, useStoreId } from '@/auth/AuthContext';
import { ListPage, type ListConfig } from '@/framework/ListPage';
import { EntityForm, type FieldDef } from '@/framework/EntityForm';
import { IconButton } from '@/ui/Button';
import { useConfirm } from '@/ui/Misc';
import { useToast } from '@/ui/Toast';
import { fmtDate } from '@/lib/format';
import { t as tt } from '@/i18n';
import { resolveImageUrl } from '../lib/storeForm';
import { ImagePicker } from '../components/kit';
import '../admin.css';

export const SIGNATURE = '/v1/signature';
type Sig = { id: string; name: string; signature?: string; store_id?: string; created_by_name?: string; created_at?: string; updated_at?: string };

export const sigUrl = (s: Sig, storeId: string) => {
  const u = resolveImageUrl(s.signature, s.store_id || storeId, 'signatures');
  return u && s.updated_at ? `${u}?v=${new Date(s.updated_at).getTime()}` : u;
};

export function signaturesListConfig(o: { storeId: string; onCreate?: () => void; onEdit?: (s: Sig) => void; onDelete?: (s: Sig) => void }): ListConfig<Sig> {
  return {
    title: 'Signatures',
    subtitle: 'Signature images printed on quotations, invoices and receipts',
    icon: 'edit',
    endpoint: SIGNATURE,
    resource: 'signatures',
    defaultSort: { key: 'created_at', dir: -1 },
    searchKey: 'name',
    searchPlaceholder: 'Search signature name…',
    onCreate: o.onCreate,
    createLabel: 'New signature',
    onRowClick: o.onEdit,
    filters: [{ id: 'created', label: 'Created', type: 'daterange', fromKey: 'created_at_from', toKey: 'created_at_to' }],
    columns: [
      { key: 'img', header: tt('Signature'), render: (r) => (r.signature ? <img className="adm-sig" src={sigUrl(r, o.storeId)} alt={r.name} loading="lazy" /> : <span className="muted">—</span>) },
      { key: 'name', header: tt('Name'), sortKey: 'name', render: (r) => <b><bdi>{r.name}</bdi></b> },
      { key: 'by', header: tt('Created by'), hideBelow: 'md', render: (r) => r.created_by_name || '—' },
      { key: 'at', header: tt('Created'), sortKey: 'created_at', render: (r) => <span className="num">{fmtDate(r.created_at)}</span> },
    ],
    rowActions: o.onDelete ? (r) => <IconButton icon="trash" label={`${tt('Delete')} ${r.name}`} onClick={() => o.onDelete!(r)} /> : undefined,
    mobileCard: (r) => ({ title: <bdi>{r.name}</bdi>, subtitle: r.created_by_name, meta: fmtDate(r.created_at), amount: r.signature ? <img className="adm-sig" style={{ width: 80, height: 40 }} src={sigUrl(r, o.storeId)} alt="" /> : undefined }),
  };
}

export function SignaturesPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const storeId = useStoreId();
  const { can } = useAuth();
  const [editing, setEditing] = useState<Sig | null | undefined>(undefined);
  const [confirmEl, ask] = useConfirm();

  const del = async (s: Sig) => {
    if (!(await ask(t('Delete signature “{{name}}”?', { name: s.name }), { danger: true, confirmLabel: t('Delete') }))) return;
    try {
      await api.del(`${SIGNATURE}/${s.id}`, { search: { store_id: storeId } });
      toast.success(t('Signature deleted'));
      qc.invalidateQueries({ queryKey: [SIGNATURE] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const existing = editing || null;
  // Stable field defs: EntityForm resets its values whenever `fields` changes identity.
  const fields = useMemo<FieldDef[]>(() => [
    { name: 'name', label: 'Name', type: 'text', required: true, span: 2, placeholder: 'e.g. Sales manager' },
    {
      name: 'signature_content', label: 'Signature image', type: 'custom', span: 2,
      render: (v, set) => (
        <ImagePicker label={t('Signature image')} maxBytes={1024 * 1024} fit={[600, 300]} accept="image/png,image/jpeg,image/webp,image/gif"
          url={v || (existing ? sigUrl(existing, storeId) : '')} pending={!!v}
          hint={t('A transparent PNG of the handwritten signature works best.')}
          onPick={set} />
      ),
    },
  ], [existing, storeId, t]);

  return (
    <>
      <ListPage config={signaturesListConfig({
        storeId,
        onCreate: () => setEditing(null),
        onEdit: can('signatures', 'update') ? (s) => setEditing(s) : undefined,
        onDelete: can('signatures', 'delete') ? del : undefined,
      })} />
      <EntityForm
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        endpoint={SIGNATURE}
        title={existing ? 'Edit signature' : 'New signature'}
        fields={fields}
        initial={existing}
        validate={(v): Record<string, string> => (!existing && !v.signature_content ? { signature_content: t('Signature is required') } : {})}
        toBody={(b) => (b.signature_content ? b : { name: b.name })}
      />
      {confirmEl}
    </>
  );
}
