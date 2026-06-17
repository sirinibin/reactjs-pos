import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';

const POLL_INTERVAL_MS = 3000;

const WhatsAppConnect = forwardRef(({ onConnected, onDisconnected, showToastMessage }, ref) => {
    const [show, setShow] = useState(false);
    const [store, setStore] = useState(null);
    const [phase, setPhase] = useState('idle'); // idle | creating | waitingQR | connected | error
    const [qrBase64, setQrBase64] = useState(null);
    const [qrCount, setQrCount] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const pollRef = useRef(null);

    useImperativeHandle(ref, () => ({
        open(storeData) {
            setStore(storeData);
            setPhase('idle');
            setQrBase64(null);
            setQrCount(0);
            setErrorMsg('');
            setShow(true);
        }
    }));

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const handleClose = useCallback(() => {
        stopPolling();
        setShow(false);
    }, [stopPolling]);

    // Poll QR + status after instance is created
    const startPolling = useCallback((storeId) => {
        stopPolling();
        pollRef.current = setInterval(async () => {
            try {
                // Check connection status first
                const statusRes = await fetch(`/v1/whatsapp/status?store_id=${storeId}`, {
                    headers: { Authorization: localStorage.getItem('access_token') }
                });
                const statusData = await statusRes.json();

                if (statusData.connected) {
                    stopPolling();
                    setPhase('connected');
                    if (showToastMessage) showToastMessage('WhatsApp connected successfully!', 'success');
                    if (onConnected) onConnected(storeId);
                    setTimeout(() => setShow(false), 2000);
                    return;
                }

                // Fetch fresh QR
                const qrRes = await fetch(`/v1/whatsapp/qr?store_id=${storeId}`, {
                    headers: { Authorization: localStorage.getItem('access_token') }
                });
                const qrData = await qrRes.json();
                if (qrData.base64 && qrData.count !== qrCount) {
                    setQrBase64(qrData.base64);
                    setQrCount(qrData.count);
                }
            } catch (e) {
                console.error('WhatsApp poll error:', e);
            }
        }, POLL_INTERVAL_MS);
    }, [stopPolling, qrCount, onConnected, showToastMessage]);

    // Cleanup on unmount
    useEffect(() => () => stopPolling(), [stopPolling]);

    const handleConnect = useCallback(async () => {
        if (!store) return;
        setPhase('creating');
        setErrorMsg('');
        setQrBase64(null);

        try {
            const res = await fetch('/v1/whatsapp/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('access_token'),
                },
                body: JSON.stringify({ store_id: store.id, phone: store.phone }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setPhase('error');
                setErrorMsg(data.error || 'Failed to create WhatsApp instance');
                return;
            }

            setPhase('waitingQR');
            // Small delay so Baileys generates the first QR
            setTimeout(() => startPolling(store.id), 4000);
        } catch (e) {
            setPhase('error');
            setErrorMsg('Could not reach server: ' + e.message);
        }
    }, [store, startPolling]);

    const handleDisconnect = useCallback(async () => {
        if (!store) return;
        try {
            const res = await fetch(`/v1/whatsapp/disconnect?store_id=${store.id}`, {
                method: 'DELETE',
                headers: { Authorization: localStorage.getItem('access_token') },
            });
            const data = await res.json();
            if (data.success) {
                if (showToastMessage) showToastMessage('WhatsApp disconnected', 'success');
                if (onDisconnected) onDisconnected(store.id);
                handleClose();
            }
        } catch (e) {
            if (showToastMessage) showToastMessage('Disconnect failed: ' + e.message, 'danger');
        }
    }, [store, onDisconnected, showToastMessage, handleClose]);

    const title = () => {
        if (phase === 'connected') return 'WhatsApp Connected!';
        if (phase === 'waitingQR') return 'Scan QR Code';
        return 'Connect WhatsApp';
    };

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-whatsapp text-success me-2"></i>
                    {title()} {store && <small className="text-muted fs-6 ms-1">— {store.name}</small>}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="text-center py-4">
                {phase === 'idle' && (
                    <>
                        <i className="bi bi-whatsapp text-success" style={{ fontSize: '3rem' }}></i>
                        <p className="mt-3 mb-0">
                            Connect <strong>{store?.phone || 'your WhatsApp number'}</strong> to this store.<br />
                            <small className="text-muted">A QR code will appear — scan it with WhatsApp on your phone.</small>
                        </p>
                    </>
                )}

                {phase === 'creating' && (
                    <>
                        <Spinner animation="border" variant="success" />
                        <p className="mt-3 mb-0 text-muted">Creating WhatsApp instance…</p>
                    </>
                )}

                {phase === 'waitingQR' && (
                    <>
                        {qrBase64 ? (
                            <>
                                <img
                                    src={qrBase64}
                                    alt="WhatsApp QR Code"
                                    style={{ width: 220, height: 220, border: '2px solid #25D366', borderRadius: 8 }}
                                />
                                <p className="mt-2 mb-0 text-muted" style={{ fontSize: '0.8em' }}>
                                    <i className="bi bi-phone me-1"></i>
                                    WhatsApp → Linked Devices → Link a Device → scan above
                                </p>
                                <p className="mt-1 mb-0 text-muted" style={{ fontSize: '0.75em' }}>
                                    QR refreshes automatically · checking connection…
                                    <Spinner animation="border" size="sm" variant="success" className="ms-1" />
                                </p>
                            </>
                        ) : (
                            <>
                                <Spinner animation="border" variant="success" />
                                <p className="mt-3 mb-0 text-muted">Generating QR code…</p>
                            </>
                        )}
                    </>
                )}

                {phase === 'connected' && (
                    <>
                        <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                        <p className="mt-3 mb-0 text-success fw-bold">WhatsApp connected successfully!</p>
                        <p className="text-muted" style={{ fontSize: '0.85em' }}>
                            PDF invoices will now be sent as file attachments via WhatsApp.
                        </p>
                    </>
                )}

                {phase === 'error' && (
                    <Alert variant="danger" className="text-start">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {errorMsg}
                    </Alert>
                )}
            </Modal.Body>

            <Modal.Footer>
                {phase === 'idle' && (
                    <Button variant="success" onClick={handleConnect}>
                        <i className="bi bi-whatsapp me-1"></i>Connect WhatsApp
                    </Button>
                )}
                {phase === 'waitingQR' && (
                    <Button variant="outline-danger" size="sm" onClick={handleClose}>
                        Cancel
                    </Button>
                )}
                {phase === 'connected' && (
                    <Button variant="outline-danger" size="sm" onClick={handleDisconnect}>
                        <i className="bi bi-x-circle me-1"></i>Disconnect
                    </Button>
                )}
                {phase === 'error' && (
                    <>
                        <Button variant="success" onClick={handleConnect}>
                            <i className="bi bi-arrow-clockwise me-1"></i>Try again
                        </Button>
                        <Button variant="outline-secondary" onClick={handleClose}>Close</Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
});

export default WhatsAppConnect;
