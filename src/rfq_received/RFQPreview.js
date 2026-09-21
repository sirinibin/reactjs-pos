import React, { useRef, useState, forwardRef, useImperativeHandle, useCallback, useEffect, useMemo } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import html2pdf from 'html2pdf.js';
import { resolveImageUrl } from '../utils/imageUtils';
import { fetchStore } from '../utils/storeUtils';
import RFQPreviewContent from './RFQPreviewContent';
import "../order/print.css";

const MODEL = 'rfq_received';

const RFQPreview = forwardRef((props, ref) => {
    const { t } = useTranslation('common');

    // ── modal state ──────────────────────────────────────────────────────────
    const [show, setShow]                   = useState(false);
    useEffect(() => {
        if (!show) return;
        const apply = () => {
            const el = document.querySelector('.modal.order-preview-wrap');
            if (el) el.style.setProperty('z-index', '1600', 'important');
        };
        apply();
        const t = setTimeout(apply, 80);
        return () => clearTimeout(t);
    }, [show]);
    const [rfq, setRfq]                     = useState(null);
    const [store, setStore]                 = useState(null);
    const [invoiceBackground, setInvoiceBackground] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isProcessing, setIsProcessing]   = useState(false);
    const [downloadFlash, setDownloadFlash] = useState(null);
    const printAreaRef = useRef();

    // ── font / layout settings ───────────────────────────────────────────────
    const defaultFontSizes = useMemo(() => ({
        font:        'Cairo',
        storeHeader: { visible: true },
        marginTop:   { value: 0,   unit: 'px', size: '0px',   step: 3  },
        invoiceTitle:   { value: 3,   unit: 'mm', size: '3mm',   step: 0.1 },
        invoiceDetails: { value: 2.2, unit: 'mm', size: '2.2mm', step: 0.1 },
        tableHead:      { value: 2.2, unit: 'mm', size: '2.2mm', step: 0.1 },
        tableBody:      { value: 2.2, unit: 'mm', size: '2.2mm', step: 0.1 },
        signature:      { value: 2.2, unit: 'mm', size: '2.2mm', step: 0.1 },
        footer:         { value: 2.2, unit: 'mm', size: '2.2mm', step: 0.1 },
    }), []);

    const [fontSizes, setFontSizes] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('fontSizes') || '{}');
            const merged = {};
            for (const key in defaultFontSizes) {
                merged[MODEL + '_' + key] = stored[MODEL + '_' + key] ?? defaultFontSizes[key];
            }
            return { ...stored, ...merged };
        } catch (_) { return {}; }
    });

    const printSettingsSaveTimer = useRef(null);

    const savePrintSettingsToServerDebounced = useCallback((fsData) => {
        const storeSettings = (() => { try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; } })();
        if (!storeSettings?.save_print_settings_to_server) return;
        const storeId = localStorage.getItem('store_id');
        const token   = localStorage.getItem('access_token');
        if (!storeId || !token) return;
        if (printSettingsSaveTimer.current) clearTimeout(printSettingsSaveTimer.current);
        printSettingsSaveTimer.current = setTimeout(() => {
            fetch('/v1/store/' + storeId + '/print-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({ print_settings: fsData }),
            }).catch(() => {});
        }, 1500);
    }, []);

    const saveFS = useCallback((fs) => {
        setFontSizes({ ...fs });
        try { localStorage.setItem('fontSizes', JSON.stringify(fs)); } catch (_) {}
        savePrintSettingsToServerDebounced(fs);
    }, [savePrintSettingsToServerDebounced]);

    // ensure defaults are written once, then optionally load from server
    useEffect(() => {
        setFontSizes(prev => {
            const stored = (() => { try { return JSON.parse(localStorage.getItem('fontSizes') || '{}'); } catch (_) { return {}; } })();
            const next = { ...stored };
            for (const key in defaultFontSizes) {
                const k = MODEL + '_' + key;
                if (!next[k]) next[k] = defaultFontSizes[key];
            }
            try { localStorage.setItem('fontSizes', JSON.stringify(next)); } catch (_) {}

            // Load from server if flag enabled — server wins
            const _ss = (() => { try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; } })();
            if (_ss?.save_print_settings_to_server) {
                const _storeId = localStorage.getItem('store_id');
                const _token   = localStorage.getItem('access_token');
                if (_storeId && _token) {
                    fetch('/v1/store/' + _storeId, { headers: { 'Authorization': _token } })
                        .then(r => r.json())
                        .then(data => {
                            const serverPS = data?.result?.settings?.print_settings;
                            if (serverPS && Object.keys(serverPS).length > 0) {
                                const merged = { ...next, ...serverPS };
                                setFontSizes({ ...merged });
                                try { localStorage.setItem('fontSizes', JSON.stringify(merged)); } catch (_) {}
                            }
                        }).catch(() => {});
                }
            }

            return next;
        });
    }, [defaultFontSizes]); // eslint-disable-line react-hooks/exhaustive-deps

    const [showSlider, setShowSlider]     = useState(false);
    const [selectedText, setSelectedText] = useState('');

    const selectText = useCallback((name) => {
        setSelectedText(name);
        if (!fontSizes[MODEL + '_' + name]) {
            fontSizes[MODEL + '_' + name] = defaultFontSizes[name];
        }
        setShowSlider(true);
    }, [fontSizes, defaultFontSizes]);

    const increment = useCallback(() => {
        if (!selectedText) return;
        const k = MODEL + '_' + selectedText;
        if (!fontSizes[k]) fontSizes[k] = defaultFontSizes[selectedText];
        fontSizes[k].value = parseFloat((fontSizes[k].value + fontSizes[k].step).toFixed(2));
        fontSizes[k].size  = fontSizes[k].value + fontSizes[k].unit;
        saveFS(fontSizes);
    }, [fontSizes, selectedText, defaultFontSizes, saveFS]);

    const decrement = useCallback(() => {
        if (!selectedText) return;
        const k = MODEL + '_' + selectedText;
        if (!fontSizes[k]) fontSizes[k] = defaultFontSizes[selectedText];
        fontSizes[k].value = parseFloat((fontSizes[k].value - fontSizes[k].step).toFixed(2));
        fontSizes[k].size  = fontSizes[k].value + fontSizes[k].unit;
        saveFS(fontSizes);
    }, [fontSizes, selectedText, defaultFontSizes, saveFS]);

    const incrementSize = useCallback((key) => {
        if (!fontSizes[key]) fontSizes[key] = defaultFontSizes[key.replace(MODEL + '_', '')];
        fontSizes[key].value = parseFloat((fontSizes[key].value + fontSizes[key].step).toFixed(2));
        fontSizes[key].size  = fontSizes[key].value + fontSizes[key].unit;
        saveFS(fontSizes);
    }, [fontSizes, defaultFontSizes, saveFS]);

    const decrementSize = useCallback((key) => {
        if (!fontSizes[key]) fontSizes[key] = defaultFontSizes[key.replace(MODEL + '_', '')];
        fontSizes[key].value = parseFloat((fontSizes[key].value - fontSizes[key].step).toFixed(2));
        fontSizes[key].size  = fontSizes[key].value + fontSizes[key].unit;
        saveFS(fontSizes);
    }, [fontSizes, defaultFontSizes, saveFS]);

    const fonts = [
        { label: 'Cairo',               value: 'Cairo' },
        { label: 'Arial',               value: 'Arial' },
        { label: 'Tahoma',              value: 'Tahoma' },
        { label: 'Calibri Light',       value: 'Calibri Light' },
        { label: 'IBM Plex Sans Arabic Regular', value: 'IBM Plex Sans Arabic Regular' },
        { label: 'Sakkal Majalla',      value: 'Sakkal Majalla' },
        { label: 'Noto Naskh Regular',  value: 'Noto Naskh Regular' },
        { label: 'Amiri',               value: 'Amiri' },
        { label: 'Tajawal',             value: 'Tajawal' },
        { label: 'Almarai',             value: 'Almarai' },
    ];

    // ── store fetch ──────────────────────────────────────────────────────────
    const getStore = useCallback(async (storeId) => {
        try {
            const storeData = await fetchStore(storeId);
            if (storeData) {
                setStore(storeData);
                if (storeData.invoice_background) {
                    setInvoiceBackground(resolveImageUrl(storeData.invoice_background, storeData.id, 'store'));
                } else {
                    setInvoiceBackground('');
                }
            }
        } catch (_) {}
    }, []);

    // ── imperative open ──────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        async open(rfqModel) {
            setRfq(rfqModel);
            setStore(null);
            setInvoiceBackground('');
            setDownloadFlash(null);
            setShow(true);
            if (rfqModel?.store_id) await getStore(rfqModel.store_id);
        },
    }));

    const handleClose = useCallback(() => {
        if (!isDownloading && !isProcessing) setShow(false);
    }, [isDownloading, isProcessing]);

    const getFileName = useCallback(() => `RFQ-${rfq?.code || rfq?.id || 'rfq'}`, [rfq]);

    // ── PDF / Print ──────────────────────────────────────────────────────────
    const pdfSettings = useCallback((fileName) => ({
        margin: 0,
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }), []);

    const waitForPdfRender = useCallback((element, timeout = 15000) => new Promise(resolve => {
        const start = Date.now();
        const check = () => {
            if (!element.querySelector('[data-pdf-loading="true"]')) { resolve(); return; }
            if (Date.now() - start > timeout) { resolve(); return; }
            setTimeout(check, 200);
        };
        check();
    }), []);

    const handleDownload = useCallback(async () => {
        const element = printAreaRef.current;
        if (!element) return;
        setIsDownloading(true);
        setDownloadFlash(null);
        try {
            await waitForPdfRender(element);
            const fileName = getFileName();
            const pdfBlob = await html2pdf().set(pdfSettings(fileName)).from(element).outputPdf('blob');
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url; a.download = `${fileName}.pdf`;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
            setDownloadFlash({ variant: 'success', message: t('PDF downloaded successfully.') });
            setTimeout(() => setDownloadFlash(null), 5000);
        } catch (err) {
            setDownloadFlash({ variant: 'danger', message: 'PDF failed: ' + (err?.message || String(err)) });
        } finally { setIsDownloading(false); }
    }, [getFileName, pdfSettings, t, waitForPdfRender]);

    const handlePrint = useCallback(async () => {
        const element = printAreaRef.current;
        if (!element) return;
        setIsProcessing(true);
        try {
            await waitForPdfRender(element);
            const output = await html2pdf().from(element).set(pdfSettings(getFileName())).outputPdf('bloburl');
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = output;
            document.body.appendChild(iframe);
            iframe.onload = () => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); };
        } catch (err) {
            alert('Print failed: ' + (err?.message || String(err)));
        } finally { setIsProcessing(false); }
    }, [getFileName, pdfSettings, waitForPdfRender]);

    // ── render ───────────────────────────────────────────────────────────────
    return (
        <Modal show={show} scrollable size="xl" fullscreen onHide={handleClose} animation={false} className="order-preview-wrap" dir="ltr">

            {/* Flash banner */}
            {downloadFlash && (
                <div className={`alert alert-${downloadFlash.variant} alert-dismissible mb-0 rounded-0`} role="alert"
                    style={{ position: 'sticky', top: 0, zIndex: 1060, fontSize: '0.9rem' }}>
                    <i className="bi bi-download me-2" />
                    {downloadFlash.message}
                    <button type="button" className="btn-close" onClick={() => setDownloadFlash(null)} aria-label="Close" />
                </div>
            )}

            {/* ── Dark gradient header (type2) ── */}
            <div style={{ background: 'linear-gradient(135deg,#1a3a5c 0%,#2d6a9f 100%)', padding: '0', borderBottom: '1px solid #15304e', flexShrink: 0 }}>

                {/* Top bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="bi bi-file-earmark-text" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px' }} />
                        <span style={{ color: '#fff', fontWeight: '700', fontSize: '15px', letterSpacing: '0.3px' }}>
                            {rfq?.code ? `RFQ # ${rfq.code}` : t('RFQ Preview')}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* PDF */}
                        <Button size="sm" className="d-flex align-items-center gap-1" disabled={isDownloading || isProcessing}
                            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontWeight: '600' }}
                            onClick={handleDownload}>
                            {isDownloading
                                ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden />
                                : <><i className="bi bi-file-earmark-arrow-down" /> PDF</>}
                        </Button>
                        {/* Print */}
                        <Button size="sm" className="d-flex align-items-center gap-1" disabled={isDownloading || isProcessing}
                            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontWeight: '600' }}
                            onClick={handlePrint}>
                            {isProcessing
                                ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden />
                                : <><i className="bi bi-printer" /> {t('Print')}</>}
                        </Button>
                        <button className="btn-close btn-close-white" onClick={handleClose} aria-label={t('Close')} style={{ opacity: 0.8 }} />
                    </div>
                </div>

                {/* Bottom controls strip */}
                <div style={{ background: 'rgba(0,0,0,0.18)', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>

                    {/* Font size slider — appears when a section is clicked */}
                    {showSlider && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.12)', borderRadius: '6px', padding: '3px 8px' }}>
                            <button className="btn btn-sm" style={{ color: '#fff', padding: '0 4px' }} onClick={decrement}>−</button>
                            <span style={{ color: '#fff', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                {t('Font Size')}: {fontSizes[MODEL + '_' + selectedText]?.size}
                            </span>
                            <button className="btn btn-sm" style={{ color: '#fff', padding: '0 4px' }} onClick={increment}>+</button>
                            <button className="btn-close btn-close-white ms-1" style={{ fontSize: '10px', opacity: 0.7 }} onClick={() => setShowSlider(false)} />
                        </div>
                    )}

                    {/* Font selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="bi bi-type" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }} />
                        <select value={fontSizes[MODEL + '_font'] || 'Cairo'}
                            onChange={(e) => { fontSizes[MODEL + '_font'] = e.target.value; saveFS(fontSizes); }}
                            style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', minWidth: '130px' }}>
                            {fonts.map(f => <option key={f.value} value={f.value} style={{ background: '#1a3a5c', color: '#fff' }}>{f.label}</option>)}
                        </select>
                    </div>

                    {/* Show Store Header */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0 }}>
                        <input type="checkbox" className="form-check-input" style={{ margin: 0 }}
                            checked={fontSizes[MODEL + '_storeHeader']?.visible ?? true}
                            onChange={() => {
                                fontSizes[MODEL + '_storeHeader'] = {
                                    ...(fontSizes[MODEL + '_storeHeader'] || {}),
                                    visible: !fontSizes[MODEL + '_storeHeader']?.visible,
                                };
                                saveFS(fontSizes);
                            }} />
                        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', whiteSpace: 'nowrap' }}>{t('Show Store Header')}</span>
                    </label>

                    {/* Margin Top */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.12)', borderRadius: '6px', padding: '3px 8px' }}>
                        <button className="btn btn-sm" style={{ color: '#fff', padding: '0 4px' }} onClick={() => decrementSize(MODEL + '_marginTop')}>−</button>
                        <span style={{ color: '#fff', fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {t('Margin Top')}: {fontSizes[MODEL + '_marginTop']?.size}
                        </span>
                        <button className="btn btn-sm" style={{ color: '#fff', padding: '0 4px' }} onClick={() => incrementSize(MODEL + '_marginTop')}>+</button>
                    </div>

                </div>
            </div>

            <Modal.Body>
                <div ref={printAreaRef} className="print-area" id="print-area">
                    <RFQPreviewContent
                        rfq={rfq}
                        store={store}
                        invoiceBackground={invoiceBackground}
                        fontSizes={fontSizes}
                        selectText={selectText}
                    />
                </div>
            </Modal.Body>
            <Modal.Footer />
        </Modal>
    );
});

export default RFQPreview;
