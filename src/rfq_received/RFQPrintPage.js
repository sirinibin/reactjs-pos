import React, { useState, useEffect } from 'react';
import RFQPreviewContent from './RFQPreviewContent';

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
        // Set page title so the generated PDF filename / metadata matches the RFQ code.
        const code = model?.code || model?.rfq_code || '';
        if (code) document.title = code;
        const markReady = () => setTimeout(() => {
            document.body.setAttribute('data-print-ready', 'true');
        }, 800);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(markReady).catch(markReady);
        } else {
            setTimeout(markReady, 1500);
        }
    }, [model]);

    if (error) return <div style={{ color: 'red', padding: '20px' }}>{error}</div>;
    if (!model) return <div style={{ padding: '20px' }}>Loading...</div>;

    return (
        <>
            <style>{`
                html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
                @page { size: A4; margin: 0; }
                * { box-sizing: border-box; }
                /* Guarantee Arabic text is shaped correctly in both screen and print */
                [dir="rtl"], [lang="ar"] {
                    font-family: 'Cairo', 'Noto Naskh Arabic', 'Amiri', sans-serif !important;
                    direction: rtl;
                    unicode-bidi: embed;
                }
                @media print {
                    [dir="rtl"], [lang="ar"] {
                        font-family: 'Cairo', 'Noto Naskh Arabic', 'Amiri', sans-serif !important;
                        direction: rtl !important;
                        unicode-bidi: embed !important;
                    }
                }
            `}</style>
            <RFQPreviewContent rfq={model} />
        </>
    );
}

export default RFQPrintPage;
