import React, { useRef, useEffect } from "react";
import { Modal } from "react-bootstrap";
import Draggable from "react-draggable";

function DraggableHistoryModal({ show, onClose, title, children }) {
    const dragRef = useRef(null);

    useEffect(() => {
        if (!show) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [show, onClose]);

    return (
        <Modal show={show} size="xl" onHide={onClose} animation={false} scrollable={true}
            backdrop={false}
            keyboard={false}
            centered={false}
            enforceFocus={false}
            dialogAs={({ children: dialogChildren, ...dialogProps }) => (
                <Draggable handle=".modal-header" nodeRef={dragRef}>
                    <div
                        ref={dragRef}
                        className="modal-dialog modal-xl"
                        {...dialogProps}
                        style={{
                            position: "absolute",
                            top: "10%",
                            left: "20%",
                            transform: "translate(-50%, -50%)",
                            margin: "0",
                            zIndex: 1055,
                            width: "65%",
                        }}
                    >
                        <div className="modal-content">{dialogChildren}</div>
                    </div>
                </Draggable>
            )}
        >
            <Modal.Header>
                <Modal.Title>
                    <Modal.Title>{title}</Modal.Title>
                </Modal.Title>
                <div className="col align-self-end text-end">
                    <button
                        type="button"
                        className="btn-close"
                        onClick={onClose}
                        aria-label="Close"
                    ></button>
                </div>
            </Modal.Header>
            <Modal.Body>
                <>{children}</>
            </Modal.Body>
        </Modal>
    );
}

export default DraggableHistoryModal;
