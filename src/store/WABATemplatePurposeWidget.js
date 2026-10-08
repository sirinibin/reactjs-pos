import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from 'react-bootstrap';

/**
 * Lets the user pick which WABA template to use for each purpose:
 *   - RFQ to Supplier
 *   - Invoice Share
 *
 * Props:
 *   storeId         - store _id string
 *   settings        - formData.settings object (read-only)
 *   onSettingsChange - callback({ waba_template_rfq_supplier, waba_template_invoice_share })
 */
function WABATemplatePurposeWidget({ storeId, settings, onSettingsChange }) {
    const { t } = useTranslation('common');
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchTemplates = () => {
        if (!storeId) return;
        setLoading(true);
        setError('');
        fetch(`/v1/rfq-bot/waba-templates?store_id=${storeId}`, {
            headers: { Authorization: localStorage.getItem('access_token') }
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) { setError(data.error); return; }
                setTemplates(data.templates || []);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };

    // Auto-fetch when store is saved (has ID) and WABA is configured
    useEffect(() => {
        if (storeId && settings && settings.bot_waba_business_account_id) {
            fetchTemplates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    const templateOptions = templates.map(t => (
        <option key={`${t.name}__${t.language}`} value={t.name}>
            {t.name} ({t.language})
        </option>
    ));

    const canFetch = !!(storeId && settings && settings.bot_waba_business_account_id);

    return (
        <div style={{ marginTop: '16px', borderTop: '1px solid #e9ecef', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>
                    <i className="bi bi-card-list me-2 text-primary"></i>
                    {t('Message Template Purposes')}
                </span>
                <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={!canFetch || loading}
                    onClick={fetchTemplates}
                    title={!canFetch ? t('Save store with WABA Business Account ID first') : ''}
                >
                    {loading ? <Spinner animation="border" size="sm" /> : <i className="bi bi-arrow-clockwise"></i>}
                    {' '}{t('Load Templates')}
                </button>
            </div>

            {error && (
                <div className="alert alert-danger py-1 px-2 mb-2" style={{ fontSize: '12px' }}>{error}</div>
            )}

            {templates.length === 0 && !loading && (
                <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
                    {canFetch
                        ? t('Click "Load Templates" to fetch approved templates from Meta.')
                        : t('Save the store with WABA Business Account ID to load templates.')}
                </p>
            )}

            <div className="row g-3">
                <div className="col-md-6">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>
                        {t('RFQ to Supplier Template')}
                    </label>
                    {templates.length > 0 ? (
                        <select
                            className="form-select form-select-sm"
                            value={settings.waba_template_rfq_supplier || ''}
                            onChange={e => onSettingsChange({ waba_template_rfq_supplier: e.target.value })}
                        >
                            <option value="">{t('— No template (send plain text) —')}</option>
                            {templateOptions}
                        </select>
                    ) : (
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder={t('Template name (e.g. rfq_to_supplier)')}
                            value={settings.waba_template_rfq_supplier || ''}
                            onChange={e => onSettingsChange({ waba_template_rfq_supplier: e.target.value })}
                        />
                    )}
                    <small className="text-muted">{t('Used when sending RFQ to suppliers')}</small>
                </div>

                <div className="col-md-6">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>
                        {t('Invoice Share Template')}
                    </label>
                    {templates.length > 0 ? (
                        <select
                            className="form-select form-select-sm"
                            value={settings.waba_template_invoice_share || ''}
                            onChange={e => onSettingsChange({ waba_template_invoice_share: e.target.value })}
                        >
                            <option value="">{t('— No template (send plain text) —')}</option>
                            {templateOptions}
                        </select>
                    ) : (
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder={t('Template name (e.g. invoice_share)')}
                            value={settings.waba_template_invoice_share || ''}
                            onChange={e => onSettingsChange({ waba_template_invoice_share: e.target.value })}
                        />
                    )}
                    <small className="text-muted">{t('Used when sharing invoices with customers')}</small>
                </div>
            </div>
        </div>
    );
}

export default WABATemplatePurposeWidget;
