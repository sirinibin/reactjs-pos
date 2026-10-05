import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Field, Input, Select, Textarea, Checkbox, Alert, AsyncMultiSelect } from '../ui';

function emptyValues(fields) {
    const v = {};
    fields.forEach(f => { v[f.name] = f.type === 'checkbox' ? false : f.defaultValue !== undefined ? f.defaultValue : ''; });
    return v;
}

/** Client-side checks mirroring the server's required/format rules. */
export function validateForm(fields, values, t = s => s) {
    const errors = {};
    fields.forEach(f => {
        if (f.hidden && f.hidden(values)) return;
        const v = values[f.name];
        const blank = v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
        if (f.required && blank) {
            errors[f.name] = t(f.requiredMessage || (f.label + ' is required'));
            return;
        }
        if (!blank && f.validate) {
            const msg = f.validate(v, values);
            if (msg) errors[f.name] = t(msg);
        }
    });
    return errors;
}

/**
 * Create / edit dialog driven by a field list. Server-side field errors are
 * shown under the matching field; anything else appears as a banner.
 */
export default function CrudForm({ open, onClose, config, recordId, onSaved }) {
    const { t } = useTranslation('common');
    const fields = config.formFields;
    const [values, setValues] = useState(() => emptyValues(fields));
    const [original, setOriginal] = useState(null);
    const [errors, setErrors] = useState({});
    const [banner, setBanner] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const isEdit = !!recordId;

    useEffect(() => {
        if (!open) return undefined;
        setErrors({});
        setBanner('');
        if (!recordId) {
            setOriginal(null);
            setValues(emptyValues(fields));
            return undefined;
        }
        let cancelled = false;
        setLoading(true);
        config.resource.get(recordId)
            .then(rec => {
                if (cancelled) return;
                setOriginal(rec);
                const v = emptyValues(fields);
                fields.forEach(f => {
                    v[f.name] = f.fromRecord ? f.fromRecord(rec) : rec[f.name] === undefined || rec[f.name] === null ? v[f.name] : rec[f.name];
                    // a reference picker shows its label from the record, not the raw id
                    if (f.labelField && rec[f.labelField]) v[f.labelField] = rec[f.labelField];
                });
                setValues(v);
            })
            .catch(err => { if (!cancelled) setBanner(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, recordId, config.resource, fields]);

    function set(name, value) {
        setValues(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }

    async function submit(e) {
        if (e) e.preventDefault();
        const clientErrors = validateForm(fields, values, t);
        if (Object.keys(clientErrors).length) {
            setErrors(clientErrors);
            return;
        }
        const payload = config.toPayload ? config.toPayload(values, original) : { ...(original || {}), ...values };
        setSaving(true);
        setBanner('');
        try {
            const saved = isEdit ? await config.resource.update(recordId, payload) : await config.resource.create(payload);
            onSaved && onSaved(saved, isEdit);
        } catch (err) {
            const fieldNames = new Set(fields.map(f => f.name));
            const fieldErrors = {};
            const other = [];
            Object.entries(err.errors || {}).forEach(([k, msg]) => {
                if (fieldNames.has(k)) fieldErrors[k] = msg;
                else other.push(msg);
            });
            setErrors(fieldErrors);
            if (other.length || !Object.keys(fieldErrors).length) setBanner(other.join(' ') || err.message);
        } finally {
            setSaving(false);
        }
    }

    const title = isEdit
        ? `${t('Edit')} ${t(config.singular)}${original && original[config.titleField || 'name'] ? ' — ' + original[config.titleField || 'name'] : ''}`
        : `${t('New')} ${t(config.singular)}`;

    const visibleFields = useMemo(() => fields.filter(f => !(f.hidden && f.hidden(values))), [fields, values]);

    return (
        <Modal
            open={open}
            onClose={saving ? undefined : onClose}
            title={title}
            size={config.formSize || undefined}
            closeOnBackdrop={false}
            footer={
                <>
                    <Button onClick={onClose} disabled={saving}>{t('Cancel')}</Button>
                    <Button variant="primary" onClick={submit} loading={saving} disabled={loading}>
                        {isEdit ? t('Save changes') : t('Create')}
                    </Button>
                </>
            }
        >
            {loading ? (
                <div className="erp-muted">{t('Loading…')}</div>
            ) : (
                <form onSubmit={submit} noValidate className="erp-stack" style={{ gap: 14 }}>
                    {banner && <Alert tone="danger">{banner}</Alert>}
                    <div className="erp-form-grid">
                        {visibleFields.map(f => (
                            <Field
                                key={f.name}
                                label={f.type === 'checkbox' ? undefined : t(f.label)}
                                required={f.required}
                                error={errors[f.name]}
                                hint={f.hint ? t(f.hint) : undefined}
                                className={f.wide ? 'is-wide' : undefined}
                            >
                                {renderControl(f, values, set, t)}
                            </Field>
                        ))}
                    </div>
                    {/* lets Enter submit from any input */}
                    <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
                </form>
            )}
        </Modal>
    );
}

function renderControl(f, values, set, t) {
    const value = values[f.name];
    switch (f.type) {
        case 'textarea':
            return <Textarea value={value || ''} placeholder={f.placeholder ? t(f.placeholder) : undefined} onChange={e => set(f.name, e.target.value)} />;
        case 'select':
            return (
                <Select
                    value={value === undefined || value === null ? '' : value}
                    placeholder={f.placeholder !== undefined ? t(f.placeholder) : undefined}
                    options={(typeof f.options === 'function' ? f.options(values) : f.options).map(o => ({ value: o.value, label: t(o.label) }))}
                    onChange={e => set(f.name, e.target.value)}
                />
            );
        case 'checkbox':
            return <Checkbox label={t(f.label)} checked={!!value} onChange={e => set(f.name, e.target.checked)} />;
        case 'number':
            return (
                <Input
                    type="number"
                    inputMode="decimal"
                    value={value === null || value === undefined ? '' : value}
                    onChange={e => set(f.name, e.target.value === '' ? '' : parseFloat(e.target.value))}
                />
            );
        case 'reference':
            // single-value async picker stored as an id; label comes from labelField
            return (
                <AsyncMultiSelect
                    value={value ? [{ id: value, name: values[f.labelField] || value }] : []}
                    loadOptions={f.loadOptions}
                    placeholder={f.placeholder ? t(f.placeholder) : t('Search…')}
                    onChange={sel => {
                        const last = sel[sel.length - 1];
                        set(f.name, last ? last.id : '');
                        if (f.labelField) set(f.labelField, last ? last.name : '');
                    }}
                />
            );
        default:
            return (
                <Input
                    type={f.type || 'text'}
                    dir={f.dir}
                    value={value || ''}
                    placeholder={f.placeholder ? t(f.placeholder) : undefined}
                    autoComplete="off"
                    onChange={e => set(f.name, e.target.value)}
                />
            );
    }
}
