import React from "react";
import { Modal, Button } from 'react-bootstrap';
import PurchasePreviewContent from './previewContent.js';

class PurchasePreview extends React.Component {
    state = {
        show: false,
    };

    handleClose = () => {
        this.setState({
            show: false,
        });
    };
    handleShow = () => {
        this.setState({
            show: true,
        });
    };

    render() {
        return <>
            <Button variant="primary" className="btn btn-primary mb-3" onClick={this.handleShow}>
                <i className="bi bi-display"></i> Preview
            </Button>

            <Modal show={this.state.show} scrollable={true} size="xl" onHide={this.handleClose} animation={false}>
                <Modal.Header>
                    <Modal.Title>Purchase Preview</Modal.Title>

                    <div className="col align-self-end text-end">

                        <button
                            type="button"
                            className="btn-close"
                            onClick={this.handleClose}
                            aria-label="Close"
                        ></button>

                    </div>

                </Modal.Header>
                <Modal.Body>
                    <PurchasePreviewContent />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={this.handleClose}>
                        Close
                </Button>
                    <Button variant="primary" onClick={this.handleClose}>
                        Save Changes
                </Button>
                </Modal.Footer>
            </Modal>
        </>;
    }

}

export default PurchasePreview;