import React, { useRef, useEffect, useCallback } from "react";
import { Modal } from "react-bootstrap";
import Draggable from "react-draggable";

function DraggableHistoryModal({ show, onClose, title, children }) {
    const dragRef = useRef(null);
    // Inline z-index on the Bootstrap Modal container so the history modal always
    // appears above nested quotation / sales forms regardless of other CSS load order.

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

    // Memoize so Bootstrap Modal sees a stable component reference and never unmounts its children
    // on parent re-renders. dragRef is a ref object (stable), so [] deps is correct.
    const DialogComponent = useCallback(({ children: dialogChildren, ...dialogProps }) => (
        <Draggable handle=".modal-header" nodeRef={dragRef}>
            <div
                ref={dragRef}
                className="modal-dialog modal-xl"
                {...dialogProps}
                style={{
                    position: "fixed",
                    top: "5%",
                    left: "15%",
                    margin: "0",
                    zIndex: 1150,
                    width: "70%",
                    height: "90vh",
                }}
            >
                <div className="modal-content" style={{ height: "100%" }}>{dialogChildren}</div>
            </div>
        </Draggable>
    ), []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
        <style>{`.draggable-history-modal.draggable-history-modal { z-index: 1150 !important; }`}</style>
        <Modal show={show} size="xl" onHide={onClose} animation={false} scrollable={true}
            backdrop={false}
            keyboard={false}
            centered={false}
            enforceFocus={false}
            dialogAs={DialogComponent}
            className="above-sales-modal draggable-history-modal"
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
            <Modal.Body style={{ minHeight: 0, overflowY: "auto" }}>
                <>{children}</>
            </Modal.Body>
        </Modal>
        </>
    );
}

export default DraggableHistoryModal;
