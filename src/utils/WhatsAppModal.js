// WhatsAppModal.js
import React from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const WhatsAppModal = ({ show, onClose, onChoice, onSendDirect, defaultNumber, defaultMessage, hideMessage }) => {
    const { t } = useTranslation('common');
    const [number, setNumber] = React.useState(defaultNumber || "");
    const [message, setMessage] = React.useState(defaultMessage || "");
    const [isSendingDirect, setIsSendingDirect] = React.useState(false);
    const [directResult, setDirectResult] = React.useState(null); // { success, message }

    React.useEffect(() => {
        setNumber(defaultNumber || "");
    }, [defaultNumber]);

    React.useEffect(() => {
        setMessage(defaultMessage || "");
    }, [defaultMessage]);

    // Reset state when modal opens
    React.useEffect(() => {
        if (show) {
            setIsSendingDirect(false);
            setDirectResult(null);
        }
    }, [show]);

    const handleSendToNumber = () => {
        onChoice?.({ type: 'number', number, message });
        onClose();
    };

    const handleSendToContacts = () => {
        onChoice?.({ type: 'contacts', message });
        onClose();
    };

    const handleSendDirect = async () => {
        if (!number) return;
        setIsSendingDirect(true);
        setDirectResult(null);
        try {
            await onSendDirect?.({ number, message });
            setDirectResult({ success: true, message: t("PDF sent successfully via WhatsApp!") });
            setTimeout(() => onClose(), 1800);
        } catch (err) {
            setDirectResult({ success: false, message: err?.message || t("Failed to send PDF. Make sure Evolution API is running and WhatsApp is connected.") });
        } finally {
            setIsSendingDirect(false);
        }
    };

    const hasDirect = !!onSendDirect;

    return (
        <Modal show={show} onHide={onClose} centered>
            <Modal.Header closeButton>
                <Modal.Title><i className="bi bi-whatsapp text-success me-2"></i>{t("Send WhatsApp Message")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group>
                    {hideMessage ? (
                        message && (() => {
                            const urlMatch = message.match(/https?:\/\/\S+/);
                            const url = urlMatch ? urlMatch[0] : null;
                            const text = url ? message.replace(url, '').replace(/\n$/, '') : message;
                            return (
                                <div className="alert alert-success py-2 mb-3" style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>
                                    <i className="bi bi-file-earmark-pdf text-danger me-1"></i>
                                    {text}
                                    {url && (
                                        <>
                                            {'\n'}
                                            <a href={url} target="_blank" rel="noreferrer" className="fw-bold text-success">
                                                <i className="bi bi-download me-1"></i>{url}
                                            </a>
                                        </>
                                    )}
                                </div>
                            );
                        })()
                    ) : (
                        <>
                            <Form.Label className="fw-bold" >{t("Message")}</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={t("Type your message here")}
                            />
                        </>
                    )}
                    <Form.Label className="fw-bold mt-2" >{t("WhatsApp Number(with country code, e.g., 9665xxxxxxxx)")}</Form.Label>
                    <Form.Control
                        type="text"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder={t("e.g., 9665xxxxxxxx")}
                    />
                </Form.Group>

                {directResult && (
                    <Alert variant={directResult.success ? "success" : "danger"} className="mt-3 mb-0 py-2" style={{ fontSize: '0.85em' }}>
                        <i className={`bi ${directResult.success ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-1`}></i>
                        {directResult.message}
                    </Alert>
                )}
            </Modal.Body>
            <Modal.Footer className="flex-wrap gap-2">
                {hasDirect && (
                    <Button
                        variant="success"
                        disabled={!number || isSendingDirect}
                        onClick={handleSendDirect}
                        title={t("Send PDF as file attachment via Evolution API")}
                    >
                        {isSendingDirect ? (
                            <><Spinner animation="border" size="sm" className="me-1" />{t("Sending...")}</>
                        ) : (
                            <><i className="bi bi-file-earmark-pdf me-1"></i>{t("Send PDF (Attached)")}</>
                        )}
                    </Button>
                )}
                <Button variant={hasDirect ? "outline-success" : "success"} disabled={!number} onClick={handleSendToNumber}>
                    <i className="bi bi-whatsapp me-1"></i>{t("Open in WhatsApp")}
                </Button>
                <Button variant="outline-secondary" onClick={handleSendToContacts}>
                    <i className="bi bi-whatsapp me-1"></i>{t("Send to contacts")}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default WhatsAppModal;
