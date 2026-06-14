import React, { useState, useEffect } from 'react';
import ReportContent from './reportContent.js';

// ReportPrintPage – rendered by headless Chrome via the Go backend's
// /v1/report/pdf endpoint. It fetches the report data stored under
// a one-time key, renders the report with ReportContent,
// waits for all web fonts to finish loading, then sets data-print-ready="true"
// on the body so that chromedp knows it can capture the PDF.
function ReportPrintPage() {
    const [model, setModel] = useState(null);
    const [modelName, setModelName] = useState('');
    const [fontSizes, setFontSizes] = useState({});
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const key = params.get('key');
        if (!key) {
            setError('No print key provided');
            return;
        }

        fetch(`/v1/report/print-data/${key}`)
            .then(res => {
                if (!res.ok) throw new Error('Print data not found or expired');
                return res.json();
            })
            .then(data => {
                setModelName(data.modelName);
                setFontSizes(data.fontSizes || {});
                setModel(data.model);
            })
            .catch(err => setError('Failed to load print data: ' + err.message));
    }, []);

    // After the data is rendered, wait for all fonts to finish loading,
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
                <ReportContent
                    model={model}
                    invoiceBackground=""
                    whatsAppShare={false}
                    modelName={modelName}
                    selectText={noop}
                    fontSizes={fontSizes}
                    userName=""
                />
            </div>
        </>
    );
}

export default ReportPrintPage;
