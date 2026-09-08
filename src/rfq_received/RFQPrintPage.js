import React, { useState, useEffect } from 'react';

function RFQPrintPage() {
    const [model, setModel] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        document.documentElement.setAttribute('dir', 'ltr');
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const key = params.get('key');
        if (!key) { setError('No print key provided'); return; }

        fetch(`/v1/rfq/print-data/${key}`)
            .then(res => {
                if (!res.ok) throw new Error('Print data not found or expired');
                return res.json();
            })
            .then(data => setModel(data.model))
            .catch(err => setError('Failed to load print data: ' + err.message));
    }, []);

    useEffect(() => {
        if (!model) return;
        const markReady = () => {
            setTimeout(() => {
                document.body.setAttribute('data-print-ready', 'true');
            }, 800);
        };
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(markReady).catch(markReady);
        } else {
            setTimeout(markReady, 1500);
        }
    }, [model]);

    if (error) return <div style={{ color: 'red', padding: '20px' }}>{error}</div>;
    if (!model) return <div style={{ padding: '20px' }}>Loading...</div>;

    const rfq = model;
    const products = rfq.products || [];
    const receivedAt = rfq.received_at
        ? new Date(rfq.received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';

    const statusColors = {
        ready_to_send: { bg: '#d1fae5', color: '#065f46' },
        forwarded:     { bg: '#dbeafe', color: '#1e40af' },
        failed:        { bg: '#fee2e2', color: '#991b1b' },
        processing:    { bg: '#fef3c7', color: '#92400e' },
        received:      { bg: '#f1f5f9', color: '#475569' },
    };
    const sc = statusColors[rfq.status] || { bg: '#f1f5f9', color: '#475569' };

    const customerName = rfq.customer_name || rfq.from_name || '';
    const customerPhone = rfq.customer_phone || rfq.from_phone || '';

    return (
        <>
            <style>{`
                html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
                @page { size: A4; margin: 0; }
                * { box-sizing: border-box; }
            `}</style>
            <div style={{
                background: 'white',
                padding: '28px 36px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '13px',
                color: '#1e293b',
                minHeight: '297mm',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '3px solid #1d4ed8',
                    paddingBottom: '14px',
                    marginBottom: '20px',
                }}>
                    <div>
                        <div style={{ fontSize: '22px', fontWeight: '700', color: '#1d4ed8', letterSpacing: '-0.3px' }}>
                            REQUEST FOR QUOTATION
                        </div>
                        {rfq.code && (
                            <div style={{ fontSize: '15px', fontWeight: '600', color: '#374151', marginTop: '4px' }}>
                                # {rfq.code}
                            </div>
                        )}
                        {receivedAt && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                                Date: {receivedAt}
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{
                            display: 'inline-block',
                            padding: '5px 14px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '700',
                            letterSpacing: '0.5px',
                            background: sc.bg,
                            color: sc.color,
                        }}>
                            {(rfq.status || '').replace(/_/g, ' ').toUpperCase()}
                        </span>
                        {rfq.source && (
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '5px' }}>
                                via {rfq.source}
                            </div>
                        )}
                    </div>
                </div>

                {/* Customer Info */}
                {(customerName || customerPhone || rfq.customer_email || rfq.customer_company || rfq.customer_address) && (
                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '12px 16px',
                        marginBottom: '20px',
                    }}>
                        <div style={{
                            fontWeight: '700',
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            color: '#94a3b8',
                            marginBottom: '10px',
                            letterSpacing: '0.8px',
                        }}>
                            Customer Information
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 32px' }}>
                            {customerName && (
                                <div>
                                    <span style={{ color: '#64748b', fontSize: '11px' }}>Name: </span>
                                    <strong style={{ fontSize: '13px' }}>{customerName}</strong>
                                </div>
                            )}
                            {customerPhone && (
                                <div>
                                    <span style={{ color: '#64748b', fontSize: '11px' }}>Phone: </span>
                                    <span>{customerPhone}</span>
                                </div>
                            )}
                            {rfq.customer_email && (
                                <div>
                                    <span style={{ color: '#64748b', fontSize: '11px' }}>Email: </span>
                                    <span>{rfq.customer_email}</span>
                                </div>
                            )}
                            {rfq.customer_company && (
                                <div>
                                    <span style={{ color: '#64748b', fontSize: '11px' }}>Company: </span>
                                    <span>{rfq.customer_company}</span>
                                </div>
                            )}
                            {rfq.customer_address && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ color: '#64748b', fontSize: '11px' }}>Address: </span>
                                    <span>{rfq.customer_address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Products Table */}
                {products.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{
                            fontWeight: '700',
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            color: '#94a3b8',
                            marginBottom: '8px',
                            letterSpacing: '0.8px',
                        }}>
                            Products Requested
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#1d4ed8', color: 'white' }}>
                                    <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: '600', width: '32px' }}>#</th>
                                    <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: '600', width: '130px' }}>Part No.</th>
                                    <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: '600' }}>Product / Description</th>
                                    <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '600', width: '55px' }}>Qty</th>
                                    <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: '600', width: '65px' }}>Unit</th>
                                    <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: '600', width: '150px' }}>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p, i) => (
                                    <tr key={i} style={{
                                        background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                                        borderBottom: '1px solid #e2e8f0',
                                    }}>
                                        <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{i + 1}</td>
                                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px', color: '#374151' }}>
                                            {p.part_no || '—'}
                                        </td>
                                        <td style={{ padding: '8px 10px', fontWeight: p.name ? '500' : '400', color: p.name ? '#1e293b' : '#94a3b8' }}>
                                            {p.name || '—'}
                                        </td>
                                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>
                                            {p.quantity > 0 ? p.quantity : 1}
                                        </td>
                                        <td style={{ padding: '8px 10px', color: '#374151' }}>
                                            {p.unit || '—'}
                                        </td>
                                        <td style={{ padding: '8px 10px', color: '#6b7280', fontSize: '11px' }}>
                                            {p.notes || ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Text Content */}
                {rfq.text_content && (
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{
                            fontWeight: '700',
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            color: '#94a3b8',
                            marginBottom: '8px',
                            letterSpacing: '0.8px',
                        }}>
                            Original Message
                        </div>
                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '12px 16px',
                            whiteSpace: 'pre-wrap',
                            color: '#374151',
                            lineHeight: '1.6',
                            fontSize: '12px',
                        }}>
                            {rfq.text_content}
                        </div>
                    </div>
                )}

                {/* Signature area */}
                <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                    {['Prepared By', 'Authorized By'].map(label => (
                        <div key={label}>
                            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', color: '#64748b', fontSize: '11px' }}>
                                {label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: '28px',
                    paddingTop: '10px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#94a3b8',
                    fontSize: '10px',
                }}>
                    <div>Generated by StartPOS</div>
                    <div>{new Date().toLocaleString('en-GB')}</div>
                </div>
            </div>
        </>
    );
}

export default RFQPrintPage;
