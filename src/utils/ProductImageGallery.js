import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { Modal, Badge, Spinner } from 'react-bootstrap';
import { confirm } from 'react-bootstrap-confirmation';

const ProductImageGallery = ({ productID, storeID, storedImages }) => {
    const [images, setImages] = useState([]); // { preview, file?, status: 'uploading'|'uploaded'|'error', serverUrl? }
    const [modalIndex, setModalIndex] = useState(null);

    useEffect(() => {
        console.log("storedImages:", storedImages);

        const formatted = (storedImages || []).map(url => ({
            serverUrl: url,
            preview: url,
            status: 'uploaded'
        }));
        console.log("formatted:", formatted);
        setImages(formatted);
    }, [storedImages]);

    const handleImageChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const compressedFiles = await Promise.all(files.map(async (file) => {
            const compressedFile = await imageCompression(file, {
                maxSizeMB: 0.3,
                maxWidthOrHeight: 1024,
                useWebWorker: true,
            });

            const preview = URL.createObjectURL(compressedFile);
            return { file: compressedFile, preview, status: 'uploading' };
        }));

        // Optimistically add to UI
        const newImages = [...images, ...compressedFiles];
        setImages(newImages);

        // Upload each compressed image
        compressedFiles.forEach((img, indexOffset) => {
            uploadToServer(img, newImages.length - compressedFiles.length + indexOffset);
        });
    };

    const uploadToServer = async (img, index) => {
        const formData = new FormData();
        formData.append('productID', productID);
        formData.append('storeID', storeID);
        formData.append('image', img.file);

        try {
            const response = await fetch('/v1/product/upload-image', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Upload failed");
            const result = await response.json();

            // Update image status in UI
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
        if (!result) {
            return
        }


        const img = images[index];
        if (img.serverUrl) {
            await fetch(`/v1/product/delete-image?url=${encodeURIComponent(img.serverUrl)}&productID=${encodeURIComponent(productID)}&storeID=${encodeURIComponent(storeID)}`, {
                method: 'POST',
            });
        }
        setImages(images.filter((_, i) => i !== index));
    };

    const showPrev = () =>
        setModalIndex(modalIndex === 0 ? images.length - 1 : modalIndex - 1);
    const showNext = () =>
        setModalIndex(modalIndex === images.length - 1 ? 0 : modalIndex + 1);

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
                                style={{ height: '150px', objectFit: 'cover', }}

                                alt=""
                            />
                            <button
                                type="button"
                                className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteImage(index)
                                }}
                            >
                                &times;
                            </button>

                            <div className="position-absolute bottom-0 start-0 m-1">
                                {img.status === 'uploading' && (
                                    <Spinner animation="border" size="sm" variant="primary" />
                                )}
                                {img.status === 'uploaded' && (
                                    <Badge bg="success">Saved</Badge>
                                )}
                                {img.status === 'error' && (
                                    <Badge bg="danger">Not Saved</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal show={modalIndex !== null} onHide={() => setModalIndex(null)} size="lg" centered>
                <Modal.Header closeButton />
                <Modal.Body className="p-0 text-center position-relative">
                    {modalIndex !== null && (
                        <>
                            <img
                                src={images[modalIndex].preview}
                                alt="Zoom"
                                className="img-fluid"
                                style={{ maxHeight: '80vh', maxWidth: '100%' }}
                            />
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
};

export default ProductImageGallery;
