import React from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';

const InfoDialog = ({ show, message, onClose }) => {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Information</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="mb-0">
          {message}
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default InfoDialog;
