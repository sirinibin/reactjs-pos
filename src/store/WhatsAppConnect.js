import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from "react-i18next";
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';
import { watchWhatsAppConnect } from '../utils/whatsAppConnectPush';

const WhatsAppConnect = forwardRef(({ onConnected, onDisconnected, showToastMessage }, ref) => {
    const { t } = useTranslation('common');
    const [show, setShow] = useState(false);
    const [store, setStore] = useState(null);
    const [phase, setPhase] = useState('idle'); // idle | creating | waitingQR | connected | error
    const [qrBase64, setQrBase64] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const watchRef = useRef(null);

    useImperativeHandle(ref, () => ({
        open(storeData) {
            setStore(storeData);
            setPhase('idle');
            setQrBase64(null);
            setErrorMsg('');
            setShow(true);
        }
    }));

    const stopWatch = useCallback(() => {
        if (watchRef.current) {
            watchRef.current.stop();
            watchRef.current = null;
        }
    }, []);

    const handleClose = useCallback(() => {
        stopWatch();
        setShow(false);
    }, [stopWatch]);

    // The server pushes each new QR and the moment the phone is linked.
    const startWatch = useCallback((storeId) => {
        stopWatch();
        watchRef.current = watchWhatsAppConnect(storeId, {
            onQR: (base64) => setQrBase64(base64),
            onConnected: () => {
                stopWatch();
                setPhase('connected');
                if (showToastMessage) showToastMessage(t('WhatsApp connected successfully!'), 'success');
                if (onConnected) onConnected(storeId);
                setTimeout(() => setShow(false), 2000);
            },
            onExpired: () => {
                stopWatch();
                setPhase('error');
                setErrorMsg(t('The QR code expired. Please try again.'));
            },
        });
    }, [stopWatch, onConnected, showToastMessage, t]);

    // Cleanup on unmount
    useEffect(() => () => stopWatch(), [stopWatch]);

    const handleConnect = useCallback(async () => {
        if (!store) return;
        setPhase('creating');
        setErrorMsg('');
        setQrBase64(null);
        startWatch(store.id); // listen before asking, so no push is missed

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
                stopWatch();
                setPhase('error');
                setErrorMsg(data.error || 'Failed to create WhatsApp instance');
                return;
            }

            setPhase('waitingQR');
        } catch (e) {
            stopWatch();
            setPhase('error');
            setErrorMsg('Could not reach server: ' + e.message);
        }
    }, [store, startWatch, stopWatch]);

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
        if (phase === 'connected') return t('WhatsApp Connected!');
        if (phase === 'waitingQR') return t('Scan QR Code');
        return t('Connect WhatsApp');
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
                            {t('Connect')} <strong>{store?.phone || t('your WhatsApp number')}</strong> {t('to this store.')}<br />
                            <small className="text-muted">{t('A QR code will appear — scan it with WhatsApp on your phone.')}</small>
                        </p>
                    </>
                )}

                {phase === 'creating' && (
                    <>
                        <Spinner animation="border" variant="success" />
                        <p className="mt-3 mb-0 text-muted">{t('Creating WhatsApp instance…')}</p>
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
                                    {t('WhatsApp → Linked Devices → Link a Device → scan above')}
                                </p>
                                <p className="mt-1 mb-0 text-muted" style={{ fontSize: '0.75em' }}>
                                    {t('QR refreshes automatically · checking connection…')}
                                    <Spinner animation="border" size="sm" variant="success" className="ms-1" />
                                </p>
                            </>
                        ) : (
                            <>
                                <Spinner animation="border" variant="success" />
                                <p className="mt-3 mb-0 text-muted">{t('Generating QR code…')}</p>
                            </>
                        )}
                    </>
                )}

                {phase === 'connected' && (
                    <>
                        <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                        <p className="mt-3 mb-0 text-success fw-bold">{t('WhatsApp connected successfully!')}</p>
                        <p className="text-muted" style={{ fontSize: '0.85em' }}>
                            {t('PDF invoices will now be sent as file attachments via WhatsApp.')}
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
                        <i className="bi bi-whatsapp me-1"></i>{t('Connect WhatsApp')}
                    </Button>
                )}
                {phase === 'waitingQR' && (
                    <Button variant="outline-danger" size="sm" onClick={handleClose}>
                        {t('Cancel')}
                    </Button>
                )}
                {phase === 'connected' && (
                    <Button variant="outline-danger" size="sm" onClick={handleDisconnect}>
                        <i className="bi bi-x-circle me-1"></i>{t('Disconnect')}
                    </Button>
                )}
                {phase === 'error' && (
                    <>
                        <Button variant="success" onClick={handleConnect}>
                            <i className="bi bi-arrow-clockwise me-1"></i>{t('Try again')}
                        </Button>
                        <Button variant="outline-secondary" onClick={handleClose}>{t('Close')}</Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
});

export default WhatsAppConnect;
