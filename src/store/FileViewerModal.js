import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import * as XLSX from 'xlsx';

function canPreview(att) {
    const name = (att.filename || '').toLowerCase();
    const mime = (att.content_type || '').toLowerCase();
    return (
        mime.startsWith('image/') ||
        mime.startsWith('video/') ||
        mime.startsWith('audio/') ||
        mime === 'application/pdf' || name.endsWith('.pdf') ||
        mime.startsWith('text/') ||
        name.match(/\.(txt|log|json|xml|html?|css|js|md|csv)$/) ||
        name.match(/\.(xlsx?|csv)$/)
    );
}

export function ViewButton({ att, style, zIndex }) {
    const [show, setShow] = useState(false);
    if (!att.url || !canPreview(att)) return null;
    return (
        <>
            <button
                className="btn btn-sm btn-outline-success"
                style={{ padding: '3px 12px', fontSize: '11px', ...style }}
                onClick={() => setShow(true)}
            >
                <i className="bi bi-eye me-1"></i>View
            </button>
            {show && <FileViewerModal att={att} onHide={() => setShow(false)} zIndex={zIndex} />}
        </>
    );
}

export default function FileViewerModal({ att, onHide, zIndex }) {
    const [content, setContent]   = useState(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState(null);

    const name = (att.filename || '').toLowerCase();
    const mime = (att.content_type || '').toLowerCase();

    const isPDF   = mime === 'application/pdf' || name.endsWith('.pdf');
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');
    const isAudio = mime.startsWith('audio/');
    const isExcel = name.match(/\.(xlsx?|csv)$/);
    const isText  = mime.startsWith('text/') || name.match(/\.(txt|log|json|xml|html?|css|js|md)$/);

    useEffect(() => {
        if (!att.url) return;
        if (isPDF || isImage || isVideo || isAudio) return;
        setLoading(true);
        setContent(null);
        setError(null);

        if (isExcel) {
            fetch(att.url)
                .then(r => r.arrayBuffer())
                .then(buf => {
                    const wb = XLSX.read(buf, { type: 'array' });
                    const sheets = wb.SheetNames.map(sName => ({
                        name: sName,
                        html: XLSX.utils.sheet_to_html(wb.Sheets[sName], { editable: false }),
                    }));
                    setContent({ type: 'excel', sheets, activeSheet: 0 });
                })
                .catch(e => setError(e.message))
                .finally(() => setLoading(false));
        } else if (isText) {
            fetch(att.url)
                .then(r => r.text())
                .then(text => setContent({ type: 'text', value: text }))
                .catch(e => setError(e.message))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
            setContent({ type: 'unsupported' });
        }
    }, [att.url]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Modal show onHide={onHide} size="xl" centered dialogClassName="file-viewer-modal" style={zIndex ? { zIndex } : undefined}>
            <Modal.Header closeButton style={{ padding: '12px 16px' }}>
                <Modal.Title style={{ fontSize: '14px', fontWeight: 600 }}>
                    <i className="bi bi-file-earmark me-2 text-primary"></i>{att.filename || 'File Preview'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: 0, minHeight: '300px', maxHeight: '80vh', overflow: 'auto' }}>
                {loading && (
                    <div className="d-flex align-items-center justify-content-center" style={{ height: '300px' }}>
                        <span className="spinner-border text-primary" />
                    </div>
                )}
                {error && <div className="alert alert-danger m-3">{error}</div>}

                {!loading && isPDF && att.url && (
                    <iframe
                        src={att.url}
                        title={att.filename}
                        style={{ width: '100%', height: '78vh', border: 'none', display: 'block' }}
                    />
                )}

                {!loading && isImage && att.url && (
                    <div style={{ textAlign: 'center', padding: '16px', background: '#f0f0f0', minHeight: '200px' }}>
                        <img src={att.url} alt={att.filename} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '4px' }} />
                    </div>
                )}

                {!loading && isVideo && att.url && (
                    <div style={{ textAlign: 'center', padding: '16px', background: '#000' }}>
                        <video controls style={{ maxWidth: '100%', maxHeight: '75vh' }}>
                            <source src={att.url} type={att.content_type} />
                        </video>
                    </div>
                )}

                {!loading && isAudio && att.url && (
                    <div style={{ padding: '24px', textAlign: 'center' }}>
                        <audio controls style={{ width: '100%' }}>
                            <source src={att.url} type={att.content_type} />
                        </audio>
                    </div>
                )}

                {!loading && content?.type === 'excel' && (
                    <div>
                        {content.sheets.length > 1 && (
                            <div style={{ display: 'flex', gap: '2px', padding: '8px 12px 0', borderBottom: '1px solid #dee2e6', background: '#f8f9fa' }}>
                                {content.sheets.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setContent(c => ({ ...c, activeSheet: i }))}
                                        style={{
                                            padding: '4px 12px', fontSize: '12px', border: '1px solid #dee2e6',
                                            borderBottom: i === content.activeSheet ? '2px solid #0d6efd' : '1px solid #dee2e6',
                                            background: i === content.activeSheet ? '#fff' : '#f8f9fa',
                                            borderRadius: '4px 4px 0 0', cursor: 'pointer',
                                            fontWeight: i === content.activeSheet ? 600 : 400,
                                        }}
                                    >{s.name}</button>
                                ))}
                            </div>
                        )}
                        <div
                            style={{ overflow: 'auto', padding: '12px', maxHeight: '72vh' }}
                            dangerouslySetInnerHTML={{ __html: content.sheets[content.activeSheet]?.html || '' }}
                        />
                        <style>{`
                            .file-viewer-modal table { border-collapse: collapse; font-size: 12px; }
                            .file-viewer-modal table td, .file-viewer-modal table th { border: 1px solid #dee2e6; padding: 4px 8px; white-space: nowrap; }
                            .file-viewer-modal table tr:first-child td { background: #f8f9fa; font-weight: 600; }
                        `}</style>
                    </div>
                )}

                {!loading && content?.type === 'text' && (
                    <pre style={{ padding: '16px', overflowX: 'auto', fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {content.value}
                    </pre>
                )}

                {!loading && content?.type === 'unsupported' && (
                    <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '200px', color: '#6c757d' }}>
                        <span style={{ fontSize: '40px', marginBottom: '12px' }}>📎</span>
                        <div style={{ fontSize: '14px' }}>Preview not available for this file type.</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>Download the file to view it.</div>
                    </div>
                )}
            </Modal.Body>
            {att.url && (
                <Modal.Footer style={{ padding: '8px 16px' }}>
                    <a href={att.url} target="_blank" rel="noreferrer" download={att.filename}
                        className="btn btn-outline-secondary btn-sm">
                        <i className="bi bi-download me-1"></i>Download
                    </a>
                    <button className="btn btn-secondary btn-sm" onClick={onHide}>Close</button>
                </Modal.Footer>
            )}
        </Modal>
    );
}
