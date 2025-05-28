import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Modal } from 'react-bootstrap';

const ImageViewerModal = forwardRef((props, ref) => {
    const [index, setIndex] = useState(null);
    const [zoom, setZoom] = useState(1);

    const images = props.images || [];

    useImperativeHandle(ref, () => ({
        open(startIndex = 0) {
            if (images.length > 0) {
                setIndex(startIndex);
                setZoom(1);
            } else {
                setIndex(0); // Still open modal even if no images
                setZoom(1);
            }
        },
        close() {
            setIndex(null);
            setZoom(1);
        }
    }));

    const showPrev = () => {
        if (images.length > 0) {
            setIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
            setZoom(1);
        }
    };

    const showNext = () => {
        if (images.length > 0) {
            setIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
            setZoom(1);
        }
    };

    const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
    const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 1));
    const resetZoom = () => setZoom(1);

    const handleClose = () => {
        setIndex(null);
        setZoom(1);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setIndex(null);
                setZoom(1);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <Modal show={index !== null} onHide={handleClose} centered size="lg" fullscreen>
            <Modal.Header closeButton />
            <Modal.Body
                className="p-0 d-flex justify-content-center align-items-center position-relative"
                style={{ backgroundColor: '#000', color: '#fff', height: '100vh' }}
            >
                {images.length === 0 ? (
                    <h4 className="text-white">No images to display</h4>
                ) : (
                    <>
                        <img
                            src={images[index]}
                            alt=""
                            style={{
                                transform: `scale(${zoom})`,
                                transition: 'transform 0.3s ease',
                                maxWidth: '100%',
                                maxHeight: '100%',
                                userSelect: 'none',
                            }}
                        />

                        <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3 d-flex gap-2">
                            <button className="btn btn-sm btn-light" onClick={zoomIn}>+</button>
                            <button className="btn btn-sm btn-light" onClick={zoomOut}>−</button>
                            <button className="btn btn-sm btn-secondary" onClick={resetZoom}>Reset</button>
                        </div>

                        <button className="btn btn-secondary position-absolute top-50 start-0 translate-middle-y" onClick={showPrev}>
                            &#8592;
                        </button>
                        <button className="btn btn-secondary position-absolute top-50 end-0 translate-middle-y" onClick={showNext}>
                            &#8594;
                        </button>
                    </>
                )}
            </Modal.Body>
        </Modal>
    );
});

export default ImageViewerModal;
