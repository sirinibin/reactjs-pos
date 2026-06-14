// WhatsAppModal.js
import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
//import jsPDF from "jspdf";
//import html2canvas from "html2canvas";


const WhatsAppModal = ({ show, onClose, onChoice, defaultNumber, defaultMessage, hideMessage }) => {
    const { t } = useTranslation('common');
    const [number, setNumber] = React.useState(defaultNumber || "");
    const [message, setMessage] = React.useState(defaultMessage || "");

    React.useEffect(() => {
        setNumber(defaultNumber || "");
    }, [defaultNumber]);

    React.useEffect(() => {
        setMessage(defaultMessage || "");
    }, [defaultMessage]);

    const handleSendToNumber = () => {
        onChoice?.({ type: 'number', number, message });
        onClose();
    };

    const handleSendToContacts = () => {
        onChoice?.({ type: 'contacts', message });
        onClose();
    };

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
            </Modal.Body>
            <Modal.Footer>
                <Button variant="success" disabled={!number} onClick={handleSendToNumber}>
                    <i className="bi bi-whatsapp me-1"></i>{t("Send to this number")}
                </Button>
                <Button variant="outline-success" onClick={handleSendToContacts}>
                    <i className="bi bi-whatsapp me-1"></i>{t("Send to WhatsApp contacts")}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default WhatsAppModal;
