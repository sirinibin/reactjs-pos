import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { storeLogoUrl } from '../utils/imageUtils';
import * as XLSX from 'xlsx';
// Renders each page of a PDF (data-URI or /cdn/ URL) as images so html2canvas can capture them.
// pdfjs-dist is loaded lazily (dynamic import) so it is NOT bundled into the main chunk.
// Sets data-pdf-loading on the wrapper while rendering; RFQPreview polls for this attribute.
function PdfPagesRenderer({ dataUri }) {
    const [pages, setPages] = useState([]);
    const wrapperRef = useRef(null);
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        setPages([]);
        (async () => {
            try {
                const pdfjsLib = await import('pdfjs-dist/build/pdf');
                pdfjsLib.GlobalWorkerOptions.workerSrc = (process.env.PUBLIC_URL || '') + '/pdf.worker.js';
                let loadingTask;
                if (dataUri.startsWith('data:')) {
                    const base64 = dataUri.split(',')[1];
                    if (!base64) return;
                    const raw = atob(base64);
                    const uint8 = new Uint8Array(raw.length);
                    for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
                    loadingTask = pdfjsLib.getDocument({ data: uint8 });
                } else {
                    loadingTask = pdfjsLib.getDocument({ url: dataUri });
                }
                const pdf = await loadingTask.promise;
                const imgs = [];
                for (let p = 1; p <= pdf.numPages; p++) {
                    const page = await pdf.getPage(p);
                    const viewport = page.getViewport({ scale: 1.8 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                    imgs.push(canvas.toDataURL('image/png'));
                }
                if (mountedRef.current) setPages(imgs);
            } catch (_) { if (mountedRef.current) setPages([]); }
        })();
        return () => { mountedRef.current = false; };
    }, [dataUri]);
    const loading = pages.length === 0;
    return (
        <div ref={wrapperRef} data-pdf-loading={loading ? 'true' : undefined}>
            {loading
                ? <div style={{ padding: '8px', fontSize: '11px', color: '#666' }}>Loading PDF…</div>
                : pages.map((src, i) => (
                    <img key={i} src={src} alt={`page-${i + 1}`}
                        style={{ width: '100%', display: 'block', marginBottom: i < pages.length - 1 ? '4px' : 0 }} />
                ))
            }
        </div>
    );
}

// Parses an Excel data-URI or /cdn/ URL and renders each sheet as a styled table.
function ExcelSheetTable({ dataUri, filename }) {
    const [sheets, setSheets] = useState(null);
    useEffect(() => {
        (async () => {
            try {
                let wb;
                if (dataUri.startsWith('data:')) {
                    const base64 = dataUri.split(',')[1];
                    if (!base64) { setSheets(null); return; }
                    wb = XLSX.read(base64, { type: 'base64' });
                } else {
                    const resp = await fetch(dataUri);
                    const arrayBuf = await resp.arrayBuffer();
                    wb = XLSX.read(new Uint8Array(arrayBuf), { type: 'array' });
                }
                const result = wb.SheetNames.map(name => {
                    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
                    const filtered = rows.filter(r => r.some(c => c !== '' && c !== null && c !== undefined));
                    return { name, rows: filtered };
                }).filter(s => s.rows.length > 0);
                setSheets(result.length > 0 ? result : null);
            } catch (_) { setSheets(null); }
        })();
    }, [dataUri]);

    if (!sheets || sheets.length === 0) return null;

    const headerStyle = {
        background: '#0f3460', color: '#fff',
        padding: '5px 8px', fontSize: '10px', fontWeight: 700,
        border: '1px solid #0f3460', whiteSpace: 'nowrap',
    };
    const cellStyle = {
        padding: '4px 8px', fontSize: '10px', border: '1px solid #cbd5e1',
        verticalAlign: 'top', wordBreak: 'break-word', maxWidth: '220px',
    };

    return (
        <div style={{ marginBottom: '12px' }}>
            {/* File name header */}
            <div style={{ background: '#1d4ed8', color: '#fff', padding: '5px 12px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📊</span>
                <span>{filename || 'Attachment'}</span>
            </div>
            {sheets.map(({ name, rows }, si) => {
                if (rows.length === 0) return null;
                const numCols = Math.max(...rows.map(r => r.length));
                const header = rows[0];
                const body = rows.slice(1);
                return (
                    <div key={si} style={{ overflowX: 'auto', marginBottom: si < sheets.length - 1 ? '8px' : 0 }}>
                        {sheets.length > 1 && (
                            <div style={{ background: '#e2e8f0', padding: '3px 10px', fontSize: '10px', fontWeight: 600, color: '#374151' }}>
                                Sheet: {name}
                            </div>
                        )}
                        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
                            <thead>
                                <tr>
                                    {Array.from({ length: numCols }).map((_, ci) => (
                                        <th key={ci} style={headerStyle}>{header[ci] ?? ''}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {body.map((row, ri) => (
                                    <tr key={ri} style={{ background: ri % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                        {Array.from({ length: numCols }).map((_, ci) => (
                                            <td key={ci} style={cellStyle}>{row[ci] ?? ''}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            })}
        </div>
    );
}

const MODEL = 'rfq_received';

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
    navy:       '#0f3460',
    navyLight:  '#1a4a7a',
    accent:     '#2563eb',
    headerBg:   '#0f3460',
    headerText: '#ffffff',
    labelBg:    '#f0f4f8',
    labelText:  '#374151',
    border:     '#cbd5e1',
    rowAlt:     '#f8fafc',
    rowHover:   '#ffffff',
    instBg:     '#eff6ff',
    instBorder: '#2563eb',
    instText:   '#1e3a5f',
    footerText: '#94a3b8',
    sigBorder:  '#e2e8f0',
};

// Renders product notes as a structured Key/Value table when the text follows
// "Key: Value, Key: Value" format; falls back to plain text otherwise.
function renderProductNotes(notes) {
    if (!notes) return null;
    // Split on commas that are followed by a new "Word(s):" label (lookahead).
    const segments = notes.split(/,\s*(?=[A-Za-z][^,]*:)/);
    const pairs = segments.map(seg => {
        const idx = seg.indexOf(':');
        if (idx > 0) return { k: seg.slice(0, idx).trim(), v: seg.slice(idx + 1).trim() };
        return null;
    }).filter(Boolean);
    if (pairs.length < 2) return <span style={{ fontSize: '11px', lineHeight: 1.5 }}>{notes}</span>;
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
                {pairs.map((p, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#f1f5f9' : '#ffffff' }}>
                        <td style={{ padding: '4px 7px', fontWeight: 700, color: '#1e3a5f', width: '42%', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top', whiteSpace: 'nowrap', letterSpacing: '0.2px' }}>
                            {p.k}
                        </td>
                        <td style={{ padding: '4px 7px', color: '#374151', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top', lineHeight: 1.4 }}>
                            {p.v}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function RFQPreviewContent({ rfq, store, invoiceBackground, fontSizes = {}, selectText = () => {} }) {
    if (!rfq) return null;

    const fs  = (key) => fontSizes[MODEL + '_' + key]?.size;
    const fnt = fontSizes[MODEL + '_font'] || 'Cairo';
    const showStoreHeader = fontSizes[MODEL + '_storeHeader']?.visible ?? true;
    const marginTop = fontSizes[MODEL + '_marginTop']?.size || '0px';

    const products                      = rfq.products || [];
    const attachmentDataURIs            = rfq.attachment_urls || [];
    const additionalAttachmentDataURIs  = rfq.additional_attachment_urls || [];
    const additionalAttachmentFilenames = rfq.additional_attachment_filenames || [];
    const hasAttachments                = attachmentDataURIs.length > 0;
    const hasAdditionalAttachments      = additionalAttachmentDataURIs.length > 0;
    const receivedAt = rfq.received_at
        ? format(new Date(rfq.received_at), 'dd MMM yyyy  h:mm a')
        : '';

    const customerAddress = rfq.customer_address || '';

    const resolvedStore = store || rfq.store;

    const isPrint = window.location.pathname.includes('rfq-print');
    const pageWidth = isPrint ? '774px' : '750px';

    // ── Shared row builder for details table ─────────────────────────────────
    const DetailRow = ({ label, value, last = false }) => (
        <div style={{
            display: 'flex',
            borderBottom: last ? 'none' : `1px solid ${C.border}`,
        }}>
            <div style={{
                width: '32%',
                background: C.labelBg,
                padding: '5px 8px',
                borderRight: `1px solid ${C.border}`,
                color: C.labelText,
                fontWeight: 600,
                fontSize: fs('invoiceDetails') || '11px',
            }}>
                {label}
            </div>
            <div style={{
                width: '68%',
                padding: '5px 8px',
                fontSize: fs('invoiceDetails') || '11px',
                color: '#1f2937',
            }}>
                {value}
            </div>
        </div>
    );

    return (
        <div
            id="printableArea"
            style={{
                fontFamily: fnt,
                backgroundColor: 'white',
                paddingLeft: '0px',
                paddingRight: '0px',
                paddingTop: '0px',
                paddingBottom: '8px',
                marginLeft: 'auto',
                marginRight: 'auto',
                maxWidth: 'none',
                minHeight: '1118px',
                width: pageWidth,
                position: 'relative',
                boxSizing: 'border-box',
            }}
        >
            {/* Invoice background image */}
            {invoiceBackground && (
                <img
                    src={invoiceBackground}
                    style={{
                        position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0,
                        width: '105%', height: '1118px', maxWidth: '105%',
                        objectFit: 'cover', objectPosition: 'top center',
                        zIndex: 0, pointerEvents: 'none',
                    }}
                    alt="Invoice Background"
                />
            )}

            <div style={{ position: 'relative', zIndex: 1 }}>

                {/* ── Store header ──────────────────────────────────────────── */}
                {resolvedStore && showStoreHeader && !invoiceBackground && (
                    <div style={{
                        borderBottom: `3px solid ${C.navy}`,
                        paddingBottom: '10px',
                        marginBottom: '0px',
                        paddingTop: '12px',
                        paddingLeft: '10px',
                        paddingRight: '10px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                            {/* Left — English */}
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                {resolvedStore.store_name && (
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: C.navy, lineHeight: 1.2 }}>
                                        {resolvedStore.store_name}
                                    </div>
                                )}
                                {resolvedStore.name && (
                                    <div style={{ fontSize: fs('storeName') || '13px', fontWeight: 600, color: '#374151', marginTop: '1px' }}>
                                        {resolvedStore.name}
                                    </div>
                                )}
                                {resolvedStore.title && (
                                    <div style={{ fontSize: fs('storeTitle') || '11px', color: '#6b7280', marginTop: '2px' }}>
                                        {resolvedStore.title}
                                    </div>
                                )}
                                <div style={{ marginTop: '4px', fontSize: fs('storeCR') || '10px', color: '#6b7280', lineHeight: 1.6 }}>
                                    {resolvedStore.registration_number && (
                                        <span>C.R. {resolvedStore.registration_number}&nbsp;&nbsp;</span>
                                    )}
                                    {resolvedStore.vat_no && (
                                        <span>VAT {resolvedStore.vat_no}</span>
                                    )}
                                </div>
                            </div>

                            {/* Center — Logo */}
                            <div style={{ flexShrink: 0, textAlign: 'center', padding: '0 16px' }}>
                                {resolvedStore.logo && (
                                    <img
                                        width="72" height="72"
                                        style={{ objectFit: 'contain', objectPosition: 'center', display: 'block' }}
                                        src={storeLogoUrl(resolvedStore)}
                                        alt="Store logo"
                                    />
                                )}
                            </div>

                            {/* Right — Arabic */}
                            <div style={{ flex: 1, textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl" lang="ar">
                                {resolvedStore.store_name_in_arabic && (
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: C.navy, lineHeight: 1.2 }}>
                                        {resolvedStore.store_name_in_arabic}
                                    </div>
                                )}
                                {resolvedStore.name_in_arabic && (
                                    <div style={{ fontSize: fs('storeNameArabic') || '13px', fontWeight: 600, color: '#374151', marginTop: '1px' }}>
                                        {resolvedStore.name_in_arabic}
                                    </div>
                                )}
                                {resolvedStore.title_in_arabic && (
                                    <div style={{ fontSize: fs('storeTitleArabic') || '11px', color: '#6b7280', marginTop: '2px' }}>
                                        {resolvedStore.title_in_arabic}
                                    </div>
                                )}
                                <div style={{ marginTop: '4px', fontSize: fs('storeCRArabic') || '10px', color: '#6b7280', lineHeight: 1.6 }}>
                                    {resolvedStore.registration_number && (
                                        <span>س.ت {resolvedStore.registration_number_in_arabic || resolvedStore.registration_number}&nbsp;&nbsp;</span>
                                    )}
                                    {resolvedStore.vat_no && (
                                        <span>الرقم الضريبي {resolvedStore.vat_no_in_arabic || resolvedStore.vat_no}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Title banner ──────────────────────────────────────────── */}
                <div style={{ marginTop }}>
                    <div
                        className="clickable-text"
                        onClick={() => selectText('invoiceTitle')}
                        style={{
                            background: C.headerBg,
                            color: C.headerText,
                            textAlign: 'center',
                            padding: '10px 16px',
                            letterSpacing: '1px',
                        }}
                    >
                        <div style={{ fontSize: fs('invoiceTitle') || '15px', fontWeight: 700, lineHeight: 1.3 }}>
                            REQUEST FOR QUOTATION
                        </div>
                        <div dir="rtl" lang="ar" style={{ fontSize: fs('invoiceTitle') || '13px', fontWeight: 500, opacity: 0.85, marginTop: '2px', unicodeBidi: 'embed' }}>
                            طلب عرض أسعار
                        </div>
                    </div>
                </div>

                {/* ── Details section ───────────────────────────────────────── */}
                <div
                    className="clickable-text"
                    onClick={() => selectText('invoiceDetails')}
                    style={{
                        margin: '14px 0',
                        border: `1px solid ${C.border}`,
                        borderRadius: '4px',
                        overflow: 'hidden',
                    }}
                >
                    <DetailRow label="RFQ No. | رقم الطلب" value={<strong style={{ color: C.navy }}>{rfq.code || '—'}</strong>} />
                    <DetailRow label="Date | التاريخ" value={receivedAt} />
                    {customerAddress && <DetailRow label="Address | العنوان" value={customerAddress} last />}
                </div>

                {/* ── Attached files (shown in place of products table) ─────── */}
                {hasAttachments && (
                    <div style={{ margin: '0 0 12px 0' }}>
                        {attachmentDataURIs.map((uri, i) => {
                            const isPDF = uri.startsWith('data:application/pdf') || /\.pdf$/i.test(uri);
                            const isImg = /^data:image\//i.test(uri) || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(uri);
                            if (isPDF) {
                                return (
                                    <div key={i} style={{ marginBottom: '8px', border: `1px solid ${C.border}`, borderRadius: '4px', overflow: 'hidden' }}>
                                        <PdfPagesRenderer dataUri={uri} />
                                    </div>
                                );
                            }
                            if (isImg) {
                                return (
                                    <div key={i} style={{ marginBottom: '8px', border: `1px solid ${C.border}`, borderRadius: '4px', overflow: 'hidden', textAlign: 'center' }}>
                                        <img src={uri} alt={`attachment-${i + 1}`} style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                )}

                {/* ── Products table ────────────────────────────────────────── */}
                {!hasAttachments && products.length > 0 && (
                    <div
                        className="clickable-text"
                        style={{ overflow: 'hidden', borderRadius: '4px', border: `2px solid ${C.navy}`, boxShadow: '0 2px 6px rgba(15,52,96,0.08)' }}
                        onClick={() => selectText('tableBody')}
                    >
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fs('tableBody') || '12px' }}>
                            <thead>
                                <tr
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => { e.stopPropagation(); selectText('tableHead'); }}
                                >
                                    {[
                                        { ar: 'رقم',        en: 'Sn.',         w: '4%',  align: 'center' },
                                        { ar: 'رقم القطعة', en: 'Part No.',     w: '13%', align: 'center' },
                                        { ar: 'الاسم والوصف', en: 'Name / Description', w: '33%', align: 'center' },
                                        { ar: 'الكمية',     en: 'Qty',         w: '7%',  align: 'center' },
                                        { ar: 'الوحدة',     en: 'Unit',        w: '9%',  align: 'center' },
                                        { ar: 'الملاحظات',  en: 'Notes',       w: '34%', align: 'center' },
                                    ].map((col, ci) => (
                                        <th key={ci} style={{
                                            padding: '9px 8px',
                                            width: col.w,
                                            textAlign: col.align,
                                            background: C.headerBg,
                                            color: C.headerText,
                                            borderRight: ci < 5 ? `1px solid ${C.navyLight}` : undefined,
                                            fontSize: fs('tableHead') || '11px',
                                            fontWeight: 700,
                                            lineHeight: 1.4,
                                            letterSpacing: '0.3px',
                                        }}>
                                            <div dir="rtl" lang="ar" style={{ unicodeBidi: 'embed', opacity: 0.85, fontSize: '10px', fontWeight: 500 }}>{col.ar}</div>
                                            <div style={{ marginTop: '2px' }}>{col.en}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product, index) => (
                                    <tr
                                        key={product.item_code ?? index}
                                        style={{
                                            background: index % 2 === 0 ? '#ffffff' : '#f4f7fb',
                                            borderBottom: `1px solid ${C.border}`,
                                        }}
                                    >
                                        {/* Sn. */}
                                        <td style={{ padding: '10px 6px', textAlign: 'center', borderRight: `1px solid ${C.border}`, color: '#94a3b8', fontWeight: 700, fontSize: '11px' }}>
                                            {index + 1}
                                        </td>
                                        {/* Part No. */}
                                        <td style={{ padding: '10px 8px', textAlign: 'center', borderRight: `1px solid ${C.border}` }}>
                                            {(product.part_no || product.part_number) ? (
                                                <span style={{
                                                    display: 'inline-block',
                                                    background: '#e8f0fe',
                                                    color: '#1a3d6e',
                                                    border: '1px solid #b3c9f5',
                                                    borderRadius: '4px',
                                                    padding: '2px 7px',
                                                    fontFamily: 'monospace',
                                                    fontSize: fs('tableBody') || '11px',
                                                    fontWeight: 700,
                                                    letterSpacing: '0.4px',
                                                    wordBreak: 'break-all',
                                                }}>
                                                    {product.part_no || product.part_number}
                                                </span>
                                            ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                                        </td>
                                        {/* Name / Description */}
                                        <td dir="ltr" style={{ padding: '10px 10px', borderRight: `1px solid ${C.border}`, textAlign: 'left', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            <span style={{ display: 'block', fontWeight: 600, color: '#111827', fontSize: fs('tableBody') || '12px', lineHeight: 1.4 }}>{product.name || ''}</span>
                                            {product.name_in_arabic && (
                                                <span dir="rtl" style={{ display: 'block', color: '#6b7280', fontSize: '11px', marginTop: '3px', lineHeight: 1.4 }}>
                                                    {product.name_in_arabic}
                                                </span>
                                            )}
                                        </td>
                                        {/* Qty */}
                                        <td style={{ padding: '10px 6px', textAlign: 'center', borderRight: `1px solid ${C.border}` }}>
                                            <span style={{
                                                display: 'inline-block',
                                                background: '#0f3460',
                                                color: '#fff',
                                                borderRadius: '4px',
                                                padding: '3px 9px',
                                                fontWeight: 700,
                                                fontSize: fs('tableBody') || '12px',
                                                minWidth: '28px',
                                                textAlign: 'center',
                                            }}>
                                                {product.quantity > 0 ? product.quantity : 1}
                                            </span>
                                        </td>
                                        {/* Unit */}
                                        <td style={{ padding: '10px 8px', textAlign: 'center', borderRight: `1px solid ${C.border}`, color: '#374151', fontWeight: 600, fontSize: fs('tableBody') || '12px' }}>
                                            {product.unit || <span style={{ color: '#cbd5e1' }}>—</span>}
                                        </td>
                                        {/* Notes */}
                                        <td style={{ padding: '8px 10px', textAlign: 'left', color: '#4b5563', fontSize: fs('tableBody') || '11px', lineHeight: 1.5 }}>
                                            {renderProductNotes(product.notes)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Additional detail files (below products table) ────────── */}
                {hasAdditionalAttachments && (() => {
                    const isImageURI = uri => /^data:image\//i.test(uri) || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(uri);
                    const imgItems = additionalAttachmentDataURIs
                        .map((uri, i) => ({ uri, i, filename: additionalAttachmentFilenames[i] || '' }))
                        .filter(({ uri }) => isImageURI(uri));
                    const nonImgItems = additionalAttachmentDataURIs
                        .map((uri, i) => ({ uri, i, filename: additionalAttachmentFilenames[i] || '' }))
                        .filter(({ uri }) => !isImageURI(uri));
                    return (
                        <div className="additional-attachment" style={{ margin: '12px 0' }}>
                            {/* Section header */}
                            <div style={{
                                background: C.headerBg, color: C.headerText,
                                padding: '4px 10px', fontSize: '9px', fontWeight: 700,
                                letterSpacing: '0.6px', marginBottom: '8px',
                                borderRadius: '3px 3px 0 0',
                            }}>
                                ADDITIONAL DETAILS&nbsp;&nbsp;|&nbsp;&nbsp;
                                <span dir="rtl" lang="ar" style={{ unicodeBidi: 'embed' }}>تفاصيل إضافية</span>
                            </div>

                            {/* Images in a compact 3-column grid */}
                            {imgItems.length > 0 && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: imgItems.length === 1 ? '1fr' : imgItems.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)',
                                    gap: '6px',
                                    marginBottom: nonImgItems.length > 0 ? '10px' : 0,
                                }}>
                                    {imgItems.map(({ uri, i }) => (
                                        <div key={i} style={{
                                            border: `1px solid ${C.border}`,
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            background: '#fafafa',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: '120px',
                                            maxHeight: '220px',
                                        }}>
                                            <img
                                                src={uri}
                                                alt={`additional-${i + 1}`}
                                                style={{ maxWidth: '100%', maxHeight: '220px', display: 'block', objectFit: 'contain' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* PDFs and Excel files at full width */}
                            {nonImgItems.map(({ uri, i, filename }) => {
                                const isPDF = uri.startsWith('data:application/pdf') || /\.pdf$/i.test(uri);
                                const isExcel = /\.(xlsx|xls|csv)$/i.test(filename) || /\.(xlsx|xls|csv)$/i.test(uri) ||
                                    /application\/vnd\.(openxmlformats|ms-excel)/.test(uri) ||
                                    uri.startsWith('data:text/csv');
                                if (isExcel) {
                                    return (
                                        <div key={i} style={{ marginBottom: '10px', border: `1px solid ${C.border}`, borderRadius: '4px', overflow: 'hidden' }}>
                                            <ExcelSheetTable dataUri={uri} filename={filename} />
                                        </div>
                                    );
                                }
                                if (isPDF) {
                                    return (
                                        <div key={i} style={{ marginBottom: '8px', border: `1px solid ${C.border}`, borderRadius: '4px', overflow: 'hidden' }}>
                                            <PdfPagesRenderer dataUri={uri} />
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    );
                })()}

                {/* ── General Instructions ─────────────────────────────────── */}
                {rfq.general_instructions && (
                    <div style={{ margin: '12px 0', border: `1px solid #bfdbfe`, borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ background: '#1d4ed8', color: '#fff', padding: '4px 10px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>ℹ</span>
                            <span>GENERAL INSTRUCTIONS&nbsp;&nbsp;|&nbsp;&nbsp;</span>
                            <span dir="rtl" lang="ar" style={{ unicodeBidi: 'embed' }}>تعليمات عامة</span>
                        </div>
                        <div style={{ background: '#eff6ff', padding: '8px 12px', fontSize: '11px', color: '#1e3a5f', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
                            {rfq.general_instructions}
                        </div>
                    </div>
                )}

                {/* ── Supplier instruction box ──────────────────────────────── */}
                {rfq.code && (
                    <div style={{
                        margin: '16px 0 0 0',
                        border: `1.5px solid ${C.instBorder}`,
                        borderRadius: '4px',
                        overflow: 'hidden',
                    }}>
                        {/* Header bar */}
                        <div style={{
                            background: C.instBorder,
                            color: '#fff',
                            padding: '5px 12px',
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}>
                            <span>ℹ</span>
                            <span>QUOTATION SUBMISSION INSTRUCTIONS&nbsp;&nbsp;|&nbsp;&nbsp;</span>
                            <span dir="rtl" lang="ar" style={{ unicodeBidi: 'embed' }}>تعليمات تقديم عرض الأسعار</span>
                        </div>
                        {/* Body */}
                        <div style={{ background: C.instBg, padding: '10px 14px' }}>
                            <p style={{ margin: 0, lineHeight: 1.65, color: C.instText, fontSize: fs('invoiceDetails') || '11px' }}>
                                Please include the RFQ reference number&nbsp;
                                <strong style={{
                                    background: C.navy, color: '#fff',
                                    padding: '1px 7px', borderRadius: '3px',
                                    fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.5px',
                                }}>{rfq.code}</strong>
                                &nbsp;in your quotation email, WhatsApp message, or document.
                                This ensures your quotation is matched to the correct request promptly.
                            </p>
                            <p dir="rtl" lang="ar" style={{
                                margin: '6px 0 0', lineHeight: 1.65,
                                color: C.instText, direction: 'rtl', textAlign: 'right',
                                fontSize: fs('invoiceDetails') || '11px', unicodeBidi: 'embed',
                            }}>
                                يرجى ذكر رقم الطلب&nbsp;
                                <strong style={{
                                    background: C.navy, color: '#fff',
                                    padding: '1px 7px', borderRadius: '3px',
                                    fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.5px',
                                }}>{rfq.code}</strong>
                                &nbsp;في بريدكم الإلكتروني أو رسالة واتساب أو وثيقة عرض الأسعار،
                                لضمان مطابقة عرضكم بسرعة مع الطلب الصحيح.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Signature section ─────────────────────────────────────── */}
                <div
                    className="clickable-text"
                    onClick={() => selectText('signature')}
                    style={{
                        marginTop: '20px',
                        display: 'flex',
                        gap: '12px',
                        fontSize: fs('signature') || '11px',
                    }}
                >
                    {['Prepared By | أعده', 'Authorized By | اعتمده'].map((label, i) => {
                        const name = i === 0 ? rfq.prepared_by : rfq.authorized_by;
                        return (
                            <div key={i} style={{
                                flex: 1,
                                border: `1px solid ${C.sigBorder}`,
                                borderRadius: '4px',
                                padding: '8px 12px 28px',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontWeight: 700, color: C.navy, fontSize: fs('signature') || '11px', borderBottom: `1px solid ${C.sigBorder}`, paddingBottom: '6px', marginBottom: '4px' }}>
                                    {label}
                                </div>
                                {name && (
                                    <div style={{ color: '#374151', marginTop: '6px', fontSize: fs('signature') || '11px' }}>
                                        {name}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── Footer ───────────────────────────────────────────────── */}
                <div
                    className="clickable-text"
                    onClick={() => selectText('footer')}
                    style={{
                        marginTop: '12px',
                        borderTop: `1px solid ${C.sigBorder}`,
                        paddingTop: '6px',
                        fontSize: fs('footer') || '10px',
                        color: C.footerText,
                    }}
                >
                    {resolvedStore?.settings?.show_address_in_invoice_footer && (
                        <div style={{ color: '#374151', fontWeight: 600, marginBottom: '6px', lineHeight: 1.7 }}>
                            {resolvedStore.national_address && (() => {
                                const na = resolvedStore.national_address;
                                const enLine1 = [na.building_no, na.street_name].filter(Boolean).join(', ');
                                const enLine2 = [na.district_name, na.city_name].filter(Boolean).join(', ');
                                const arLine1 = [na.building_no_arabic, na.street_name_arabic].filter(Boolean).join('، ');
                                const arLine2 = [na.district_name_arabic, na.city_name_arabic].filter(Boolean).join('، ');
                                return (
                                    <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #d1d5db', padding: '5px 8px', marginBottom: '5px' }}>
                                        {/* English — left */}
                                        <div style={{ flex: 1, textAlign: 'left', direction: 'ltr', fontSize: 'inherit' }}>
                                            {enLine1 && <div>{enLine1}</div>}
                                            {enLine2 && <div>{enLine2}</div>}
                                            {na.zipcode && <div>ZIP: {na.zipcode}</div>}
                                        </div>
                                        {/* Vertical separator */}
                                        <div style={{ width: '1px', background: '#d1d5db', margin: '0 10px', alignSelf: 'stretch' }}></div>
                                        {/* Arabic — right */}
                                        <div style={{ flex: 1, textAlign: 'right', direction: 'rtl', fontSize: 'inherit' }}>
                                            {arLine1 && <div>{arLine1}</div>}
                                            {arLine2 && <div>{arLine2}</div>}
                                            {na.zipcode && <div>الرمز البريدي: {na.zipcode_arabic || na.zipcode}</div>}
                                        </div>
                                    </div>
                                );
                            })()}
                            {(resolvedStore.phone || resolvedStore.phone_in_arabic || resolvedStore.email) && (
                                <div style={{ textAlign: 'center' }}>
                                    {[
                                        resolvedStore.phone_in_arabic ? `هاتف: ${resolvedStore.phone_in_arabic}` : null,
                                        resolvedStore.phone ? `Phone: ${resolvedStore.phone}` : null,
                                        resolvedStore.email ? `Email: ${resolvedStore.email}` : null,
                                    ].filter(Boolean).join('  |  ')}
                                </div>
                            )}
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px', paddingRight: '4px' }}>
                        <span>Generated by StartPOS</span>
                        <span>{new Date().toLocaleString('en-GB')}</span>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default RFQPreviewContent;
