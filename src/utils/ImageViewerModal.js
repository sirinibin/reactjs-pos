import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Modal } from 'react-bootstrap';

const ImageViewerModal = forwardRef((props, ref) => {
    const [index, setIndex] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOrigin = useRef(null);

    const images = props.images || [];

    const resetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    useImperativeHandle(ref, () => ({
        open(startIndex = 0) {
            setIndex(startIndex);
            resetView();
        },
        close() {
            setIndex(null);
            resetView();
        }
    }));

    const showPrev = () => {
        if (images.length > 0) {
            setIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
            resetView();
        }
    };

    const showNext = () => {
        if (images.length > 0) {
            setIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
            resetView();
        }
    };

    const zoomIn = () => setZoom((z) => Math.round((Math.min(z + 0.25, 3)) * 100) / 100);

    const zoomOut = () => {
        setZoom((z) => {
            const next = Math.round((Math.max(z - 0.25, 1)) * 100) / 100;
            if (next === 1) setPan({ x: 0, y: 0 });
            return next;
        });
    };

    const resetZoom = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const handleClose = () => {
        setIndex(null);
        resetView();
    };

    const handleMouseDown = (e) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsDragging(true);
        dragOrigin.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            panX: pan.x,
            panY: pan.y,
        };
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !dragOrigin.current) return;
        const dx = e.clientX - dragOrigin.current.mouseX;
        const dy = e.clientY - dragOrigin.current.mouseY;
        setPan({
            x: dragOrigin.current.panX + dx,
            y: dragOrigin.current.panY + dy,
        });
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            dragOrigin.current = null;
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setIndex(null);
                resetView();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    const cursor = zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default';

    return (
        <Modal show={index !== null} onHide={handleClose} centered size="lg" fullscreen className={`above-sales-modal${props.modalClassName ? ' ' + props.modalClassName : ''}`}>
            <Modal.Header closeButton />
            <Modal.Body
                className="p-0 d-flex justify-content-center align-items-center position-relative"
                style={{
                    backgroundColor: '#000',
                    color: '#fff',
                    height: '100vh',
                    overflow: 'hidden',
                    cursor,
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {images.length === 0 ? (
                    <h4 className="text-white">No images to display</h4>
                ) : (
                    <>
                        <img
                            src={images[index]}
                            alt="zoomed"
                            draggable={false}
                            onMouseDown={handleMouseDown}
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transformOrigin: 'center center',
                                transition: isDragging ? 'none' : 'transform 0.2s ease',
                                maxWidth: '100%',
                                maxHeight: '100%',
                                userSelect: 'none',
                                willChange: 'transform',
                                backfaceVisibility: 'hidden',
                                perspective: '1000px',
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
