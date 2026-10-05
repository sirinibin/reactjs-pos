import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Drawer, Button, KeyValue, Alert, Badge, Panel } from '../ui';
import { formatStoreDateTime } from '../format';

/** Read-only record drawer with the record's fields and its audit trail. */
export default function CrudView({ open, onClose, config, recordId, onEdit }) {
    const { t } = useTranslation('common');
    const [record, setRecord] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open || !recordId) return undefined;
        let cancelled = false;
        setRecord(null);
        setError('');
        config.resource.get(recordId)
            .then(r => { if (!cancelled) setRecord(r); })
            .catch(err => { if (!cancelled) setError(err.message); });
        return () => { cancelled = true; };
    }, [open, recordId, config.resource]);

    const title = record ? (record[config.titleField || 'name'] || t(config.singular)) : t(config.singular);

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={title}
            footer={
                <>
                    <Button onClick={onClose}>{t('Close')}</Button>
                    {config.actions.edit !== false && record && !record.deleted && (
                        <Button variant="primary" icon={Pencil} onClick={() => onEdit(record.id)}>{t('Edit')}</Button>
                    )}
                </>
            }
        >
            {error && <Alert tone="danger">{error}</Alert>}
            {!record && !error && <div className="erp-muted">{t('Loading…')}</div>}
            {record && (
                <div className="erp-stack">
                    {record.deleted && <div><Badge tone="danger">{t('Deleted')}</Badge></div>}
                    <Panel title={t('Details')}>
                        <KeyValue items={config.viewItems(record, t)} />
                    </Panel>
                    <Panel title={t('Record history')}>
                        <KeyValue
                            items={[
                                { label: t('Created By'), value: record.created_by_name },
                                { label: t('Created At'), value: formatStoreDateTime(record.created_at) },
                                { label: t('Updated By'), value: record.updated_by_name },
                                { label: t('Updated At'), value: formatStoreDateTime(record.updated_at) },
                                record.deleted ? { label: t('Deleted By'), value: record.deleted_by_user && record.deleted_by_user.name } : null,
                                record.deleted ? { label: t('Deleted At'), value: formatStoreDateTime(record.deleted_at) } : null,
                            ]}
                        />
                    </Panel>
                </div>
            )}
        </Drawer>
    );
}
