import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner, Alert } from 'react-bootstrap';

function WABATemplateTesterWidget({ storeId, settings }) {
    const { t } = useTranslation('common');
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [vars, setVars] = useState({});
    const [docFiles, setDocFiles] = useState({}); // key → { file, mediaId, filename, uploading, error }
    const [toPhone, setToPhone] = useState('');
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);

    const canFetch = !!(storeId && settings && settings.bot_waba_business_account_id);

    const fetchTemplates = () => {
        if (!canFetch) return;
        setLoading(true);
        setFetchError('');
        setTemplates([]);
        setSelectedTemplate(null);
        setVars({});
        setDocFiles({});
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

    // Extract named or numbered placeholders from text: {{name}} or {{1}}
    const extractPlaceholders = (text) =>
        [...(text || '').matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);

    const handleSelectTemplate = (name) => {
        const tpl = templates.find(t => t.name === name) || null;
        setSelectedTemplate(tpl);
        setVars({});
        setDocFiles({});
        setSendResult(null);
    };

    // Upload a file to Meta and store the media_id
    const handleFileUpload = async (compKey, file) => {
        setDocFiles(prev => ({ ...prev, [compKey]: { file, uploading: true, mediaId: '', filename: file.name, error: '' } }));
        try {
            const fd = new FormData();
            fd.append('file', file);
            const resp = await fetch(`/v1/rfq-bot/upload-media?store_id=${storeId}`, {
                method: 'POST',
                headers: { Authorization: localStorage.getItem('access_token') },
                body: fd,
            });
            const data = await resp.json();
            if (data.media_id) {
                setDocFiles(prev => ({ ...prev, [compKey]: { file, uploading: false, mediaId: data.media_id, filename: data.filename || file.name, error: '' } }));
            } else {
                setDocFiles(prev => ({ ...prev, [compKey]: { file, uploading: false, mediaId: '', filename: file.name, error: data.error || 'Upload failed' } }));
            }
        } catch (e) {
            setDocFiles(prev => ({ ...prev, [compKey]: { file, uploading: false, mediaId: '', filename: file.name, error: e.message } }));
        }
    };

    const buildComponents = () => {
        if (!selectedTemplate) return [];
        const components = [];
        for (const comp of selectedTemplate.components) {
            const type = (comp.type || '').toLowerCase();
            if (type === 'header') {
                const fmt = (comp.format || '').toUpperCase();
                if (fmt === 'DOCUMENT') {
                    const doc = docFiles[`header_doc`];
                    if (doc && doc.mediaId) {
                        components.push({
                            type: 'HEADER',
                            parameters: [{ type: 'document', document: { id: doc.mediaId, filename: doc.filename } }]
                        });
                    }
                } else if (fmt === 'IMAGE') {
                    const img = docFiles[`header_img`];
                    if (img && img.mediaId) {
                        components.push({
                            type: 'HEADER',
                            parameters: [{ type: 'image', image: { id: img.mediaId } }]
                        });
                    }
                } else if (fmt === 'TEXT' || comp.text) {
                    const placeholders = extractPlaceholders(comp.text);
                    if (placeholders.length > 0) {
                        const isNamed = placeholders.some(p => isNaN(p));
                        const parameters = placeholders.map(p => {
                            const param = { type: 'text', text: vars[`header_${p}`] || '' };
                            if (isNamed) param.parameter_name = p;
                            return param;
                        });
                        components.push({ type: 'HEADER', parameters });
                    }
                }
            } else if (type === 'body') {
                const placeholders = extractPlaceholders(comp.text);
                if (placeholders.length > 0) {
                    const isNamed = placeholders.some(p => isNaN(p));
                    const parameters = placeholders.map(p => {
                        const param = { type: 'text', text: vars[`body_${p}`] || '' };
                        if (isNamed) param.parameter_name = p;
                        return param;
                    });
                    components.push({ type: 'BODY', parameters });
                }
            }
        }
        return components;
    };

    // Build live preview: replace {{var}} with filled value or highlighted placeholder
    const buildPreview = (text) => {
        if (!text) return text;
        return text.replace(/\{\{(\w+)\}\}/g, (_, p) => {
            const section = 'body';
            const val = vars[`${section}_${p}`];
            return val ? `*${val}*` : `[${p}]`;
        });
    };

    const handleSend = async () => {
        if (!toPhone || !selectedTemplate) return;

        // Validate required media headers before sending
        for (const comp of selectedTemplate.components) {
            const type = (comp.type || '').toLowerCase();
            const fmt = (comp.format || '').toUpperCase();
            if (type === 'header' && fmt === 'DOCUMENT') {
                const doc = docFiles['header_doc'];
                if (!doc || !doc.mediaId) {
                    setSendResult({ success: false, message: t('Please upload a PDF document for the template header before sending.') });
                    return;
                }
            } else if (type === 'header' && fmt === 'IMAGE') {
                const img = docFiles['header_img'];
                if (!img || !img.mediaId) {
                    setSendResult({ success: false, message: t('Please upload an image for the template header before sending.') });
                    return;
                }
            }
        }

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

    if (!canFetch) {
        return (
            <p style={{ fontSize: '12px', color: '#6c757d', margin: 0 }}>
                {t('Save the WABA Business Account ID above to use the template tester.')}
            </p>
        );
    }

    // Collect all variable inputs needed
    const varInputs = [];
    const docInputs = [];
    if (selectedTemplate) {
        for (const comp of selectedTemplate.components) {
            const type = (comp.type || '').toLowerCase();
            if (type === 'header') {
                const fmt = (comp.format || '').toUpperCase();
                if (fmt === 'DOCUMENT') {
                    docInputs.push({ key: 'header_doc', label: t('Header Document (PDF)'), accept: '.pdf,application/pdf' });
                } else if (fmt === 'IMAGE') {
                    docInputs.push({ key: 'header_img', label: t('Header Image'), accept: 'image/*' });
                } else {
                    extractPlaceholders(comp.text).forEach(p =>
                        varInputs.push({ key: `header_${p}`, label: `Header: ${p}` })
                    );
                }
            } else if (type === 'body') {
                extractPlaceholders(comp.text).forEach(p =>
                    varInputs.push({ key: `body_${p}`, label: p })
                );
            }
        }
    }

    return (
        <div>
            {/* Fetch button */}
            <div className="d-flex align-items-center gap-2 mb-3">
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={fetchTemplates} disabled={loading}>
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

                    {selectedTemplate && (
                        <div className="row g-3">
                            {/* Left: inputs */}
                            <div className="col-md-6">
                                {/* File/media inputs */}
                                {docInputs.map(d => (
                                    <div className="mb-2" key={d.key}>
                                        <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: 600 }}>{d.label}</label>
                                        <input
                                            type="file"
                                            className="form-control form-control-sm"
                                            accept={d.accept}
                                            onChange={e => e.target.files[0] && handleFileUpload(d.key, e.target.files[0])}
                                        />
                                        {docFiles[d.key]?.uploading && (
                                            <small className="text-muted"><Spinner animation="border" size="sm" className="me-1" />{t('Uploading…')}</small>
                                        )}
                                        {docFiles[d.key]?.mediaId && (
                                            <small className="text-success"><i className="bi bi-check-circle me-1"></i>{t('Uploaded:')} {docFiles[d.key].filename}</small>
                                        )}
                                        {docFiles[d.key]?.error && (
                                            <small className="text-danger">{docFiles[d.key].error}</small>
                                        )}
                                    </div>
                                ))}

                                {/* Text variable inputs */}
                                {varInputs.length > 0 && (
                                    <div className="mb-2">
                                        <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: 600 }}>{t('Fill in Variables')}</label>
                                        {varInputs.map(v => (
                                            <div className="mb-2" key={v.key}>
                                                <label className="form-label mb-0" style={{ fontSize: '11px', color: '#555' }}>{v.label}</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder={v.label}
                                                    value={vars[v.key] || ''}
                                                    onChange={e => setVars({ ...vars, [v.key]: e.target.value })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* To phone + send */}
                                <div className="mb-2">
                                    <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: 600 }}>{t('Send to Phone (with country code)')}</label>
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
                                    {' '}{t('Send Test')}
                                </button>

                                {sendResult && (
                                    <Alert variant={sendResult.success ? 'success' : 'danger'} className="py-1 px-2 mt-2 mb-0" style={{ fontSize: '12px' }}>
                                        {sendResult.message}
                                    </Alert>
                                )}
                            </div>

                            {/* Right: live preview */}
                            <div className="col-md-6">
                                <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: 600 }}>{t('Preview')}</label>
                                <div style={{ background: '#e9f5d0', borderRadius: '8px', padding: '12px', fontSize: '13px', lineHeight: '1.6', minHeight: '120px', border: '1px solid #c3e6a0' }}>
                                    {selectedTemplate.components.map((comp, i) => {
                                        const type = (comp.type || '').toUpperCase();
                                        const fmt = (comp.format || '').toUpperCase();
                                        if (type === 'HEADER') {
                                            if (fmt === 'DOCUMENT') {
                                                const doc = docFiles['header_doc'];
                                                return (
                                                    <div key={i} style={{ marginBottom: '8px', color: '#555', fontSize: '11px' }}>
                                                        <i className="bi bi-file-earmark-pdf text-danger me-1"></i>
                                                        {doc?.filename || t('(PDF not uploaded yet)')}
                                                    </div>
                                                );
                                            }
                                            if (comp.text) return <div key={i} style={{ fontWeight: 700, marginBottom: '8px' }}>{buildPreview(comp.text)}</div>;
                                            return null;
                                        }
                                        if (type === 'BODY') {
                                            return (
                                                <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                    {buildPreview(comp.text)}
                                                </div>
                                            );
                                        }
                                        if (type === 'FOOTER') {
                                            return <div key={i} style={{ marginTop: '8px', fontSize: '11px', color: '#888' }}>{comp.text}</div>;
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default WABATemplateTesterWidget;
