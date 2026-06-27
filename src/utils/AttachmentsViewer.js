import React, { useState, useEffect, useCallback } from 'react';

/**
 * Read-only attachment viewer with thumbnail grid + lightbox navigation.
 * Props:
 *   images  – string[]  array of image URLs
 *   title   – string    optional section header (default "Attachments")
 */
const AttachmentsViewer = ({ images = [], title = "Attachments" }) => {
    const [open, setOpen] = useState(false);
    const [index, setIndex] = useState(0);

    const prev = useCallback(() => setIndex(i => (i - 1 + images.length) % images.length), [images.length]);
    const next = useCallback(() => setIndex(i => (i + 1) % images.length), [images.length]);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === 'ArrowLeft') prev();
            else if (e.key === 'ArrowRight') next();
            else if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, prev, next]);

    if (!images || images.length === 0) return null;

    return (
        <>
            {/* Thumbnail Grid */}
            <section style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '12px 24px', borderBottom: '1px solid #c3c6d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f2f4f6' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: '26px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#191c1e' }}>
                        <i className="bi bi-paperclip" style={{ marginRight: '8px', color: '#505f76' }}></i>
                        {title}
                    </h3>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#434655' }}>{images.length} file{images.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {images.map((url, i) => (
                        <div
                            key={i}
                            onClick={() => { setIndex(i); setOpen(true); }}
                            style={{ position: 'relative', cursor: 'pointer', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0', transition: 'transform 0.15s, box-shadow 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <img
                                src={url + (url.includes('?') ? '&' : '?') + 'v=view'}
                                alt={`Attachment ${i + 1}`}
                                style={{ width: '120px', height: '120px', objectFit: 'cover', display: 'block' }}
                            />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '11px', textAlign: 'center', padding: '3px 0' }}>
                                {i + 1} / {images.length}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Lightbox */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    {/* Close */}
                    <button
                        onClick={() => setOpen(false)}
                        style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '32px', cursor: 'pointer', lineHeight: 1, zIndex: 1 }}
                    >×</button>

                    {/* Counter */}
                    <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: '14px', fontWeight: 500, background: 'rgba(0,0,0,0.4)', padding: '4px 16px', borderRadius: '20px' }}>
                        {index + 1} / {images.length}
                    </div>

                    {/* Prev */}
                    {images.length > 1 && (
                        <button
                            onClick={e => { e.stopPropagation(); prev(); }}
                            style={{ position: 'absolute', left: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '28px', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        >‹</button>
                    )}

                    {/* Image */}
                    <img
                        onClick={e => e.stopPropagation()}
                        src={images[index] + (images[index].includes('?') ? '&' : '?') + 'v=view'}
                        alt={`Attachment ${index + 1}`}
                        style={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: '6px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)', userSelect: 'none' }}
                    />

                    {/* Next */}
                    {images.length > 1 && (
                        <button
                            onClick={e => { e.stopPropagation(); next(); }}
                            style={{ position: 'absolute', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '28px', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        >›</button>
                    )}

                    {/* Thumbnail strip */}
                    {images.length > 1 && (
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', padding: '8px 12px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', maxWidth: '90vw', overflowX: 'auto' }}
                        >
                            {images.map((url, i) => (
                                <img
                                    key={i}
                                    onClick={() => setIndex(i)}
                                    src={url + (url.includes('?') ? '&' : '?') + 'v=thumb'}
                                    alt=""
                                    style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: i === index ? '2px solid #fff' : '2px solid transparent', opacity: i === index ? 1 : 0.6, transition: 'opacity 0.15s, border 0.15s', flexShrink: 0 }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default AttachmentsViewer;
