import React from 'react';
import { format } from 'date-fns';
import { resolveImageUrl } from '../utils/imageUtils';

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

function RFQPreviewContent({ rfq, store, invoiceBackground, fontSizes = {}, selectText = () => {} }) {
    if (!rfq) return null;

    const fs  = (key) => fontSizes[MODEL + '_' + key]?.size;
    const fnt = fontSizes[MODEL + '_font'] || 'Cairo';
    const showStoreHeader = fontSizes[MODEL + '_storeHeader']?.visible ?? true;
    const marginTop = fontSizes[MODEL + '_marginTop']?.size || '0px';

    const products = rfq.products || [];
    const receivedAt = rfq.received_at
        ? format(new Date(rfq.received_at), 'dd MMM yyyy  h:mm a')
        : '';

    const customerPhone   = rfq.customer_phone || rfq.from_phone || '';
    const customerEmail   = rfq.customer_email  || '';
    const customerCompany = rfq.customer_company || '';
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
                                        src={resolveImageUrl(resolvedStore.logo, resolvedStore.id, 'store') + '?' + Date.now()}
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
                    {customerCompany && <DetailRow label="Company | الشركة" value={customerCompany} />}
                    {customerPhone   && <DetailRow label="Phone | الهاتف"   value={customerPhone} />}
                    {customerEmail   && <DetailRow label="Email | البريد"   value={customerEmail} />}
                    {customerAddress && <DetailRow label="Address | العنوان" value={customerAddress} last />}
                </div>

                {/* ── Products table ────────────────────────────────────────── */}
                {products.length > 0 && (
                    <div
                        className="clickable-text"
                        style={{ overflow: 'hidden', borderRadius: '4px', border: `1px solid ${C.border}` }}
                        onClick={() => selectText('tableBody')}
                    >
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fs('tableBody') || '11px' }}>
                            <thead>
                                <tr
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => { e.stopPropagation(); selectText('tableHead'); }}
                                >
                                    {[
                                        { ar: 'رقم',        en: 'Sn.',         w: '5%'  },
                                        { ar: 'رقم القطعة', en: 'Part No.',     w: '14%' },
                                        { ar: 'وصف',        en: 'Description', w: '35%' },
                                        { ar: 'كمية',       en: 'Qty',         w: '7%'  },
                                        { ar: 'وحدة',       en: 'Unit',        w: '9%'  },
                                        { ar: 'ملاحظات',    en: 'Notes',       w: '30%' },
                                    ].map((col, ci) => (
                                        <th key={ci} style={{
                                            padding: '7px 6px',
                                            width: col.w,
                                            textAlign: 'center',
                                            background: C.headerBg,
                                            color: C.headerText,
                                            borderRight: ci < 5 ? `1px solid ${C.navyLight}` : undefined,
                                            fontSize: fs('tableHead') || '10px',
                                            fontWeight: 600,
                                            lineHeight: 1.4,
                                        }}>
                                            <div dir="rtl" lang="ar" style={{ unicodeBidi: 'embed' }}>{col.ar}</div>
                                            <div>{col.en}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product, index) => (
                                    <tr
                                        key={product.item_code ?? index}
                                        style={{
                                            background: index % 2 === 0 ? '#ffffff' : C.rowAlt,
                                            borderBottom: `1px solid ${C.border}`,
                                        }}
                                    >
                                        <td style={{ padding: '6px', textAlign: 'center', borderRight: `1px solid ${C.border}`, color: '#6b7280', fontWeight: 600 }}>
                                            {index + 1}
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: `1px solid ${C.border}`, color: '#374151' }}>
                                            {product.part_no || product.part_number || ''}
                                        </td>
                                        <td dir="ltr" style={{ padding: '6px 8px', borderRight: `1px solid ${C.border}`, textAlign: 'left', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            <span style={{ display: 'block', fontWeight: 500, color: '#1f2937' }}>{product.name || ''}</span>
                                            {product.name_in_arabic && (
                                                <span dir="rtl" style={{ display: 'block', color: '#6b7280', fontSize: '10px', marginTop: '1px' }}>
                                                    {product.name_in_arabic}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '6px', textAlign: 'center', borderRight: `1px solid ${C.border}`, fontWeight: 600, color: '#1f2937' }}>
                                            {product.quantity > 0 ? product.quantity : 1}
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: `1px solid ${C.border}`, color: '#374151' }}>
                                            {product.unit || ''}
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontSize: fs('tableBody') || '10px' }}>
                                            {product.notes || ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: fs('footer') || '10px',
                        color: C.footerText,
                        paddingLeft: '4px',
                        paddingRight: '4px',
                    }}
                >
                    <span>Generated by StartPOS</span>
                    <span>{new Date().toLocaleString('en-GB')}</span>
                </div>

            </div>
        </div>
    );
}

export default RFQPreviewContent;
