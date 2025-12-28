import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { Modal, Badge } from 'react-bootstrap';
import { confirm } from 'react-bootstrap-confirmation';

const ImageGallery = forwardRef((props, ref) => {
    const [images, setImages] = useState([]);
    const [modalIndex, setModalIndex] = useState(null);

    const zoomImgRef = useRef(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [translate, setTranslate] = useState({ x: 0, y: 0 });

    useImperativeHandle(ref, () => ({
        open() {
            const formatted = (props.storedImages || []).map(url => ({
                serverUrl: url,
                preview: url,
                status: 'uploaded'
            }));
            setImages(formatted);
        },
        async uploadAllImages() {
            //  await sleep(3000); // Sleep for 2 seconds
            images.forEach(async (img, indexOffset) => {
                if (img.file) {
                    await uploadToServer(img, indexOffset);
                }
            });
        }
    }));

    /* function sleep(ms) {
         return new Promise(resolve => setTimeout(resolve, ms));
     }*/

    const handleImageChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const compressedFiles = await Promise.all(files.map(async (file) => {
            const compressedFile = await imageCompression(file, {
                /* maxSizeMB: 0.3,
                 maxWidthOrHeight: 1024,
                 useWebWorker: true*/
                maxSizeMB: 1.0,               // allow larger target to keep quality
                maxWidthOrHeight: 2048,      // preserve higher resolution
                useWebWorker: true,
                initialQuality: 0.9,         // start with high quality
                fileType: file.type,
            });

            const preview = URL.createObjectURL(compressedFile);
            return { file: compressedFile, preview, status: 'uploading' };
        }));

        const newImages = [...images, ...compressedFiles];
        setImages(newImages);

        compressedFiles.forEach((img, indexOffset) => {
            uploadToServer(img, newImages.length - compressedFiles.length + indexOffset);
        });
    };

    const uploadToServer = async (img, index) => {
        const formData = new FormData();
        if (!props.id) return;

        formData.append('id', props.id);
        formData.append('storeID', props.storeID);
        formData.append('image', img.file);

        try {
            const response = await fetch(`/v1/${props.modelName}/upload-image`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Upload failed");
            const result = await response.json();

            setImages(prev =>
                prev.map((img, i) =>
                    i === index ? { ...img, status: 'uploaded', serverUrl: result.url } : img
                )
            );
        } catch (err) {
            setImages(prev =>
                prev.map((img, i) =>
                    i === index ? { ...img, status: 'error' } : img
                )
            );
        }
    };

    const deleteImage = async (index) => {
        const result = await confirm('Are you sure, you want to delete this image?');
        if (!result) return;

        const img = images[index];
        if (img.serverUrl) {
            await fetch(`/v1/${props.modelName}/delete-image?url=${encodeURIComponent(img.serverUrl)}&id=${encodeURIComponent(props.id)}&storeID=${encodeURIComponent(props.storeID)}`, {
                method: 'POST'
            });
        }
        setImages(images.filter((_, i) => i !== index));

        if (props.handleDelete) {
            props.handleDelete(index);
        }
    };

    const showPrev = () => setModalIndex(modalIndex === 0 ? images.length - 1 : modalIndex - 1);
    const showNext = () => setModalIndex(modalIndex === images.length - 1 ? 0 : modalIndex + 1);

    const zoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
    const zoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 1));
    const resetZoom = () => {
        setZoomLevel(1);
        setTranslate({ x: 0, y: 0 });
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        setDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e) => {
        if (!dragging) return;
        setTranslate((prev) => ({
            x: prev.x + (e.clientX - dragStart.x),
            y: prev.y + (e.clientY - dragStart.y)
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => setDragging(false);

    return (
        <div className="container mt-3">
            <input
                type="file"
                accept="image/*"
                multiple
                className="form-control mb-3"
                onChange={handleImageChange}
            />

            <div className="row">
                {images?.map((img, index) => (
                    <div className="col-6 col-sm-4 col-md-3 mb-3" key={index}>
                        <div className="position-relative border rounded p-1" style={{ cursor: 'pointer' }} onClick={() => setModalIndex(index)}>
                            <img
                                src={img.preview}
                                className="img-fluid rounded"
                                style={{ height: '150px', objectFit: 'cover' }}
                                alt=""
                            />
                            <button
                                type="button"
                                className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteImage(index);
                                }}
                            >
                                &times;
                            </button>
                            <div className="position-absolute bottom-0 start-0 m-1">
                                {img.status === 'uploading' && <Badge bg="warning">Pending</Badge>}
                                {img.status === 'uploaded' && <Badge bg="success">Saved</Badge>}
                                {img.status === 'error' && <Badge bg="danger">Not Saved</Badge>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal show={modalIndex !== null} onHide={() => setModalIndex(null)} size="lg" fullscreen centered>
                <Modal.Header closeButton />
                <Modal.Body
                    className="p-0 d-flex justify-content-center align-items-center position-relative overflow-hidden"
                    style={{ backgroundColor: '#000', height: '100vh' }}
                >
                    {modalIndex !== null && (
                        <>
                            <div
                                className="position-relative d-flex justify-content-center align-items-center"
                                style={{
                                    cursor: zoomLevel > 1 ? 'grab' : 'default',
                                    overflow: 'hidden',
                                    width: '100%',
                                    height: '100%'
                                }}
                                onMouseDown={(e) => zoomLevel > 1 && handleMouseDown(e)}
                                onMouseMove={(e) => zoomLevel > 1 && handleMouseMove(e)}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                <img
                                    ref={zoomImgRef}
                                    src={images[modalIndex].preview}
                                    alt="Zoom"
                                    style={{
                                        transform: `scale(${zoomLevel}) translate(${translate.x}px, ${translate.y}px)`,
                                        transformOrigin: 'center',
                                        transition: dragging ? 'none' : 'transform 0.3s ease',
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        userSelect: 'none',
                                        pointerEvents: 'none',
                                        display: 'block'
                                    }}
                                />
                            </div>

                            <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3 d-flex gap-2">
                                <button className="btn btn-sm btn-light" onClick={zoomIn}>+</button>
                                <button className="btn btn-sm btn-light" onClick={zoomOut}>−</button>
                                <button className="btn btn-sm btn-secondary" onClick={resetZoom}>Reset</button>
                            </div>

                            <button
                                type="button"
                                className="btn btn-secondary position-absolute top-50 start-0 translate-middle-y"
                                onClick={showPrev}
                            >
                                &#8592;
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary position-absolute top-50 end-0 translate-middle-y"
                                onClick={showNext}
                            >
                                &#8594;
                            </button>
                        </>
                    )}
                </Modal.Body>
            </Modal>
        </div>
    );
});

export default ImageGallery;
