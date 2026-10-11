import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from "react-i18next";
import { Spinner, Badge, Alert } from 'react-bootstrap';
import { watchWhatsAppConnect } from '../utils/whatsAppConnectPush';


/**
 * Inline WhatsApp connect widget for the Procurement tab.
 *
 * Props:
 *   storeId        - store _id string
 *   endpointBase   - "/v1/rfq-bot" | "/v1/rfq-store"
 *   label          - human-readable label
 *   phone          - controlled phone value (QR mode only)
 *   onPhoneChange  - callback(newPhone) (QR mode only)
 *   onStatusChange - optional callback(connected: bool)
 *   useWABA        - if true, use official Meta Cloud API (no QR); default false (QR/Baileys)
 */
function ProcurementWhatsAppWidget({ storeId, endpointBase, label, phone, onPhoneChange, onStatusChange, useWABA }) {
    const { t } = useTranslation('common');
    const [phase, setPhase] = useState('idle'); // idle | creating | waitingQR | connected | error | checking
    const [qrBase64, setQrBase64] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [connectedPhone, setConnectedPhone] = useState('');
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const watchRef = useRef(null);

    const stopWatch = useCallback(() => {
        if (watchRef.current) { watchRef.current.stop(); watchRef.current = null; }
    }, []);

    useEffect(() => () => stopWatch(), [stopWatch]);

    // Check existing connection on mount / storeId change
    useEffect(() => {
        if (!storeId) return;
        setPhase('checking');
        fetch(`${endpointBase}/status?store_id=${storeId}`, {
            headers: { Authorization: localStorage.getItem('access_token') }
        })
            .then(r => r.json())
            .then(data => {
                if (data.connected) {
                    setPhase('connected');
                    setConnectedPhone(data.phone || '');
                    if (onStatusChange) onStatusChange(true);
                } else {
                    setPhase('idle');
                    if (onStatusChange) onStatusChange(false);
                }
            })
            .catch(() => setPhase('idle'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, endpointBase]);

    // QR connect: the server pushes each new QR and the moment the phone is linked.
    const startWatch = useCallback(() => {
        stopWatch();
        watchRef.current = watchWhatsAppConnect(storeId, {
            onQR: (base64) => setQrBase64(base64),
            onConnected: (connectedTo) => {
                stopWatch();
                setPhase('connected');
                setConnectedPhone(connectedTo);
                if (onStatusChange) onStatusChange(true);
            },
            onExpired: () => {
                stopWatch();
                setPhase('error');
                setErrorMsg(t('The QR code expired. Please try again.'));
            },
        });
    }, [storeId, stopWatch, onStatusChange, t]);

    // WABA (Official Meta Cloud API) connect — no QR
    const handleConnectWABA = useCallback(async () => {
        if (!storeId) return;
        setPhase('creating');
        setErrorMsg('');
        try {
            const res = await fetch(`${endpointBase}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('access_token'),
                },
                body: JSON.stringify({ store_id: storeId, phone_number_id: phoneNumberId, access_token: accessToken }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setPhase('error');
                setErrorMsg(data.error || 'Failed to connect');
                return;
            }
            // The server checked the credentials with Meta before saving them.
            setPhase('connected');
            setConnectedPhone(data.phone || '');
            if (onStatusChange) onStatusChange(true);
        } catch (e) {
            setPhase('error');
            setErrorMsg('Cannot reach server: ' + e.message);
        }
    }, [storeId, phoneNumberId, accessToken, endpointBase, onStatusChange]);

    // QR / Baileys connect
    const handleConnect = useCallback(async () => {
        if (!storeId) return;
        setPhase('creating');
        setErrorMsg('');
        setQrBase64(null);
        startWatch(); // listen before asking, so no push is missed
        try {
            const res = await fetch(`${endpointBase}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('access_token'),
                },
                body: JSON.stringify({ store_id: storeId, phone }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                stopWatch();
                setPhase('error');
                setErrorMsg(data.error || 'Failed to create instance');
                return;
            }
            setPhase('waitingQR');
        } catch (e) {
            stopWatch();
            setPhase('error');
            setErrorMsg('Cannot reach server: ' + e.message);
        }
    }, [storeId, phone, endpointBase, startWatch, stopWatch]);

    const handleDisconnect = useCallback(async () => {
        try {
            const res = await fetch(`${endpointBase}/disconnect?store_id=${storeId}`, {
                method: 'DELETE',
                headers: { Authorization: localStorage.getItem('access_token') },
            });
            const data = await res.json();
            if (data.success) {
                setPhase('idle');
                setQrBase64(null);
                setConnectedPhone('');
                if (onStatusChange) onStatusChange(false);
            }
        } catch (e) {
            setErrorMsg('Disconnect failed: ' + e.message);
        }
    }, [storeId, endpointBase, onStatusChange]);

    const isConnecting = phase === 'creating' || phase === 'waitingQR';

    const statusBadge = () => {
        if (phase === 'connected') return <Badge bg="success" className="ms-2"><i className="bi bi-check-circle me-1"></i>{t('Connected')} {connectedPhone && `(${connectedPhone})`}</Badge>;
        if (phase === 'checking') return <Badge bg="secondary" className="ms-2">{t('Checking…')}</Badge>;
        if (isConnecting) return <Badge bg="warning" text="dark" className="ms-2">{useWABA && phase === 'waitingQR' ? t('Verifying…') : t('Connecting…')}</Badge>;
        return <Badge bg="secondary" className="ms-2">{t('Not Connected')}</Badge>;
    };

    const cardStyle = {
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        background: phase === 'connected' ? '#f0faf3' : '#f8f9fa',
    };

    return (
        <div style={cardStyle}>
            <div className="d-flex align-items-center mb-2" style={{ gap: '8px' }}>
                <i className="bi bi-whatsapp text-success" style={{ fontSize: '1.25rem' }}></i>
                <strong>{label}</strong>
                {statusBadge()}
                {useWABA && <Badge bg="info" className="ms-1" style={{ fontSize: '10px' }}>Official API</Badge>}
            </div>

            {/* ── Official WABA mode ── */}
            {useWABA && phase !== 'connected' && (
                <div className="mb-2">
                    <div className="mb-2" style={{ maxWidth: '420px' }}>
                        <input
                            type="text"
                            className="form-control form-control-sm mb-2"
                            placeholder={t('Phone Number ID (from Meta Business Manager)')}
                            value={phoneNumberId}
                            onChange={e => setPhoneNumberId(e.target.value)}
                            disabled={isConnecting}
                        />
                        <input
                            type="password"
                            className="form-control form-control-sm mb-1"
                            placeholder={t('System User Access Token')}
                            value={accessToken}
                            onChange={e => setAccessToken(e.target.value)}
                            disabled={isConnecting}
                        />
                        <div style={{ fontSize: '11px', color: '#6c757d', lineHeight: '1.5' }}>
                            <strong>{t('How to get an access token:')}</strong>{' '}
                            {t('Go to')}{' '}
                            <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noreferrer">
                                Meta Business Manager → System Users
                            </a>
                            {' → '}{t('create or select a System User → click "Generate New Token" → choose your App → grant')}
                            {' '}<code>whatsapp_business_messaging</code>{' '}{t('and')}{' '}<code>whatsapp_business_management</code>{' '}
                            {t('permissions → copy the token.')}{' '}
                            <strong>{t('Use a never-expiring System User token, not a temporary Page token.')}</strong>
                        </div>
                    </div>
                    {(phase === 'idle' || phase === 'error') && (
                        <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={handleConnectWABA}
                            disabled={!phoneNumberId || !accessToken}
                        >
                            <i className="bi bi-whatsapp me-1"></i>{t('Connect via Official API')}
                        </button>
                    )}
                    {isConnecting && (
                        <div className="d-flex align-items-center gap-2">
                            <div className="text-muted small">
                                <Spinner animation="border" size="sm" className="me-1" />
                                {phase === 'creating' ? t('Connecting to WhatsApp Business API…') : t('Verifying with Meta…')}
                            </div>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { stopWatch(); setPhase('idle'); }}>
                                {t('Cancel')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── QR / Baileys mode ── */}
            {!useWABA && phase !== 'connected' && (
                <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder={t('Phone number (international, e.g. 966501234567)')}
                        value={phone || ''}
                        onChange={e => onPhoneChange && onPhoneChange(e.target.value)}
                        style={{ maxWidth: '280px' }}
                        disabled={isConnecting}
                    />
                    {(phase === 'idle' || phase === 'error') && (
                        <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={handleConnect}
                            disabled={!phone}
                        >
                            <i className="bi bi-whatsapp me-1"></i>{t('Connect')}
                        </button>
                    )}
                    {isConnecting && (
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { stopWatch(); setPhase('idle'); }}>
                            {t('Cancel')}
                        </button>
                    )}
                </div>
            )}

            {!useWABA && phase === 'creating' && (
                <div className="text-muted small"><Spinner animation="border" size="sm" className="me-1" />{t('Creating WhatsApp instance…')}</div>
            )}

            {!useWABA && phase === 'waitingQR' && (
                <div className="text-center" style={{ maxWidth: '260px' }}>
                    {qrBase64 ? (
                        <>
                            <img src={qrBase64} alt="QR" style={{ width: 200, height: 200, border: '2px solid #25D366', borderRadius: 6 }} />
                            <div className="text-muted small mt-1">
                                {t('WhatsApp → Linked Devices → Link a Device → scan')}
                                <Spinner animation="border" size="sm" variant="success" className="ms-1" />
                            </div>
                        </>
                    ) : (
                        <div className="text-muted small"><Spinner animation="border" size="sm" variant="success" className="me-1" />{t('Generating QR code…')}</div>
                    )}
                </div>
            )}

            {phase === 'connected' && (
                <div className="d-flex align-items-center gap-2">
                    <span className="text-success small">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        {t('WhatsApp number {{phone}} is connected.', { phone: connectedPhone || phone })}
                    </span>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleDisconnect}>
                        <i className="bi bi-x-circle me-1"></i>{t('Disconnect')}
                    </button>
                </div>
            )}

            {phase === 'error' && (
                <Alert variant="danger" className="py-2 px-3 small mb-0 mt-1">
                    <i className="bi bi-exclamation-triangle me-1"></i>{errorMsg}
                    <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={useWABA ? handleConnectWABA : handleConnect}>{t('Retry')}</button>
                </Alert>
            )}
        </div>
    );
}

export default ProcurementWhatsAppWidget;
