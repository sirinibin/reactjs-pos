import React from "react";
import { Modal, Button, Alert } from "react-bootstrap";
import { useTranslation } from "react-i18next";

function SuccessModal({ show, message, onClose }) {
    const { t } = useTranslation('common');
    return (
        <Modal show={show} onHide={onClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>{t('Success')}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Alert variant="success">{message}</Alert>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>{t('Close')}</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default SuccessModal;
