import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner, Alert } from 'react-bootstrap';

/**
 * Lets the user fetch approved WABA templates, pick one, fill in its variables,
 * and send a test message to any phone number.
 *
 * Props:
 *   storeId  - store _id string
 *   settings - formData.settings (for checking if WABA is configured)
 */
function WABATemplateTesterWidget({ storeId, settings }) {
    const { t } = useTranslation('common');
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [vars, setVars] = useState({}); // { "header_1": "...", "body_1": "..." }
    const [toPhone, setToPhone] = useState('');
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState(null); // { success, message }

    const canFetch = !!(storeId && settings && settings.bot_waba_business_account_id);

    const fetchTemplates = () => {
        if (!canFetch) return;
        setLoading(true);
        setFetchError('');
        setTemplates([]);
        setSelectedTemplate(null);
        setVars({});
        setSendResult(null);
        fetch(`/v1/rfq-bot/waba-templates?store_id=${storeId}`, {
            headers: { Authorization: localStorage.getItem('access_token') }
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) { setFetchError(data.error); return; }
                setTemplates(data.templates || []);
            })
            .catch(e => setFetchError(e.message))
            .finally(() => setLoading(false));
    };

    // Extract variable placeholders from component text (e.g. {{1}}, {{2}})
    const extractPlaceholders = (text) => {
        const matches = [...(text || '').matchAll(/\{\{(\d+)\}\}/g)];
        return matches.map(m => m[1]);
    };

    const handleSelectTemplate = (name) => {
        const tpl = templates.find(t => t.name === name) || null;
        setSelectedTemplate(tpl);
        setVars({});
        setSendResult(null);
    };

    // Build components array for the API from the selected template + filled vars
    const buildComponents = () => {
        if (!selectedTemplate) return [];
        const components = [];
        for (const comp of selectedTemplate.components) {
            const type = (comp.type || '').toLowerCase();
            if (type !== 'header' && type !== 'body' && type !== 'button') continue;
            const placeholders = extractPlaceholders(comp.text);
            if (placeholders.length === 0) continue;
            const parameters = placeholders.map(idx => ({
                type: 'text',
                text: vars[`${type}_${idx}`] || `{{${idx}}}`
            }));
            components.push({ type: type.toUpperCase(), parameters });
        }
        return components;
    };

    const handleSend = async () => {
        if (!toPhone || !selectedTemplate) return;
        setSending(true);
        setSendResult(null);
        try {
            const resp = await fetch('/v1/rfq-bot/waba-test-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('access_token')
                },
                body: JSON.stringify({
                    store_id: storeId,
                    to: toPhone.replace(/\D/g, ''),
                    template_name: selectedTemplate.name,
                    language_code: selectedTemplate.language || 'en',
                    components: buildComponents()
                })
            });
            const data = await resp.json();
            if (data.sent) {
                setSendResult({ success: true, message: t('Message sent successfully!') });
            } else {
                setSendResult({ success: false, message: data.error || t('Failed to send') });
            }
        } catch (e) {
            setSendResult({ success: false, message: e.message });
        } finally {
            setSending(false);
        }
    };

    const allVarsForTemplate = () => {
        if (!selectedTemplate) return [];
        const all = [];
        for (const comp of selectedTemplate.components) {
            const type = (comp.type || '').toLowerCase();
            const placeholders = extractPlaceholders(comp.text);
            for (const idx of placeholders) {
                all.push({ key: `${type}_${idx}`, label: `${comp.type} {{${idx}}}`, hint: comp.text });
            }
        }
        return all;
    };

    if (!canFetch && !loading) {
        return (
            <p style={{ fontSize: '12px', color: '#6c757d', margin: 0 }}>
                {t('Configure and save WABA Business Account ID above to use the template tester.')}
            </p>
        );
    }

    return (
        <div>
            {/* Fetch button */}
            <div className="d-flex align-items-center gap-2 mb-3">
                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={fetchTemplates}
                    disabled={loading}
                >
                    {loading ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-arrow-clockwise me-1"></i>}
                    {t('Fetch Approved Templates')}
                </button>
                {templates.length > 0 && (
                    <span className="badge bg-success">{templates.length} {t('templates')}</span>
                )}
            </div>

            {fetchError && <Alert variant="danger" className="py-1 px-2 mb-2" style={{ fontSize: '12px' }}>{fetchError}</Alert>}

            {templates.length > 0 && (
                <div>
                    {/* Template selector */}
                    <div className="mb-3">
                        <label className="form-label" style={{ fontSize: '13px', fontWeight: 500 }}>{t('Select Template')}</label>
                        <select
                            className="form-select form-select-sm"
                            value={selectedTemplate ? selectedTemplate.name : ''}
                            onChange={e => handleSelectTemplate(e.target.value)}
                        >
                            <option value="">{t('— Pick a template —')}</option>
                            {templates.map(tpl => (
                                <option key={`${tpl.name}__${tpl.language}`} value={tpl.name}>
                                    {tpl.name} | {tpl.category} | {tpl.language}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Template preview */}
                    {selectedTemplate && (
                        <div className="mb-3 p-2 rounded" style={{ background: '#f8f9fa', border: '1px solid #dee2e6', fontSize: '12px' }}>
                            {selectedTemplate.components.map((comp, i) => (
                                <div key={i} className="mb-1">
                                    <strong style={{ color: '#555' }}>[{comp.type}]</strong>{' '}
                                    <span style={{ color: '#333' }}>{comp.text || comp.format || ''}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Variable inputs */}
                    {selectedTemplate && allVarsForTemplate().length > 0 && (
                        <div className="mb-3">
                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 500 }}>{t('Fill in Variables')}</label>
                            <div className="row g-2">
                                {allVarsForTemplate().map(v => (
                                    <div className="col-md-6" key={v.key}>
                                        <label className="form-label mb-0" style={{ fontSize: '11px', color: '#555' }}>{v.label}</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder={v.hint ? v.hint.substring(0, 40) : v.label}
                                            value={vars[v.key] || ''}
                                            onChange={e => setVars({ ...vars, [v.key]: e.target.value })}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* To phone + send */}
                    {selectedTemplate && (
                        <div className="d-flex align-items-end gap-2 mb-2">
                            <div style={{ flex: 1 }}>
                                <label className="form-label" style={{ fontSize: '13px', fontWeight: 500 }}>{t('Send to Phone (with country code)')}</label>
                                <input
                                    type="tel"
                                    className="form-control form-control-sm"
                                    placeholder="966501234567"
                                    value={toPhone}
                                    onChange={e => setToPhone(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-success btn-sm"
                                disabled={!toPhone || sending}
                                onClick={handleSend}
                            >
                                {sending ? <Spinner animation="border" size="sm" /> : <i className="bi bi-send-fill me-1"></i>}
                                {t('Send Test')}
                            </button>
                        </div>
                    )}

                    {sendResult && (
                        <Alert variant={sendResult.success ? 'success' : 'danger'} className="py-1 px-2 mb-0" style={{ fontSize: '12px' }}>
                            {sendResult.message}
                        </Alert>
                    )}
                </div>
            )}
        </div>
    );
}

export default WABATemplateTesterWidget;
