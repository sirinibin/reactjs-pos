import React, { useState, useEffect } from 'react';
import PreviewContent from './previewContent.js';
import PreviewContentWithSellerInfo from './previewContentWithSellerInfo.js';
import MBDIInvoiceBackground from './../INVOICE.jpg';
import LGKInvoiceBackground from './../LGK_WHATSAPP.png';

function InvoicePrintPage() {
    // InvoicePrintPage – rendered by headless Chrome via the Go backend's
    // /v1/invoice/pdf endpoint.  It fetches the invoice data stored under
    // a one-time key, renders the invoice with PreviewContent, waits for all
    // web fonts to finish loading, then sets data-print-ready="true" on the
    // body so that chromedp knows it can call kjf 
    const [model, setModel] = useState(null);
    const [modelName, setModelName] = useState('');
    const [fontSizes, setFontSizes] = useState({});
    const [invoiceBackground, setInvoiceBackground] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const key = params.get('key');
        if (!key) {
            setError('No print key provided');
            return;
        }

        fetch(`/v1/invoice/print-data/${key}`)
            .then(res => {
                if (!res.ok) throw new Error('Print data not found or expired');
                return res.json();
            })
            .then(data => {
                const m = data.model;
                const mn = data.modelName;
                const fs = data.fontSizes;

                let bg = '';
                if (m?.store?.code === 'MBDI') {
                    bg = MBDIInvoiceBackground;
                } else if (
                    m?.store?.code === 'LGK-SIMULATION' ||
                    m?.store?.code === 'LGK' ||
                    m?.store?.code === 'PH2'
                ) {
                    bg = LGKInvoiceBackground;
                }

                setInvoiceBackground(bg);
                setModelName(mn);
                setFontSizes(fs || {});
                setModel(m);
            })
            .catch(err => setError('Failed to load print data: ' + err.message));
    }, []);

    // After the invoice is rendered, wait for all fonts to finish loading,
    // then signal chromedp that the page is ready to print.
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

    if (error) {
        return <div style={{ color: 'red', padding: '20px' }}>{error}</div>;
    }
    if (!model) {
        return <div style={{ padding: '20px' }}>Loading...</div>;
    }

    const noop = () => { };

    return (
        <>
            <style>{`
            html, body { margin: 0 !important; padding: 0 !important; }
            @page { size: A4; margin: 0; }
        `}</style>
            <div style={{ background: 'white' }}>
                {(!model.store?.settings?.show_seller_info_in_invoice ||
                    modelName === 'stock_transfer' ||
                    modelName === 'whatsapp_stock_transfer') && (
                        <PreviewContent
                            model={model}
                            invoiceBackground={invoiceBackground}
                            whatsAppShare={false}
                            modelName={modelName}
                            selectText={noop}
                            selectQRCode={noop}
                            fontSizes={fontSizes}
                        />
                    )}
                {model.store?.settings?.show_seller_info_in_invoice &&
                    modelName !== 'stock_transfer' &&
                    modelName !== 'whatsapp_stock_transfer' && (
                        <PreviewContentWithSellerInfo
                            model={model}
                            invoiceBackground={invoiceBackground}
                            whatsAppShare={false}
                            modelName={modelName}
                            selectText={noop}
                            selectQRCode={noop}
                            fontSizes={fontSizes}
                        />
                    )}
            </div>
        </>
    );
}

export default InvoicePrintPage;
