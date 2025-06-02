// WhatsAppModal.js
import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const WhatsAppModal = ({ show, onClose, onChoice, defaultNumber, defaultMessage }) => {
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
                <Modal.Title>Send WhatsApp Message</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group>
                    <Form.Label className="fw-bold" >Message</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here"
                    />
                    <Form.Label className="fw-bold mt-2" >WhatsApp Number(with country code, e.g., 9665xxxxxxxx)</Form.Label>
                    <Form.Control
                        type="text"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="e.g., 9665xxxxxxxx"
                    />
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" disabled={!number} onClick={handleSendToNumber}>
                    Send to this number
                </Button>
                <Button variant="secondary" onClick={handleSendToContacts}>
                    Send to WhatsApp contacts
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default WhatsAppModal;
