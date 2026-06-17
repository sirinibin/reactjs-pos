import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Modal, Button, Spinner, Form, Badge } from 'react-bootstrap';

const LIMIT = 50;

const WhatsAppContactsModal = forwardRef(({ showToastMessage }, ref) => {
    const [show, setShow] = useState(false);
    const [store, setStore] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');
    const loadingRef = useRef(false);
    const containerRef = useRef(null);
    const sentinelRef = useRef(null);
    const searchTimer = useRef(null);

    useImperativeHandle(ref, () => ({
        open(storeData) {
            setStore(storeData);
            setSearch('');
            setContacts([]);
            setHasMore(false);
            setCurrentPage(1);
            setShow(true);
        }
    }));

    const load = useCallback(async (pg = 1, q = '', append = false) => {
        if (!store || loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                store_id: store.id,
                page: pg,
                limit: LIMIT,
                ...(q ? { search: q } : {}),
            });
            const res = await fetch(`/v1/whatsapp/contacts?${params}`, {
                headers: { Authorization: localStorage.getItem('access_token') },
            });
            const data = await res.json();
            const incoming = data.contacts || [];
            setContacts(prev => append ? [...prev, ...incoming] : incoming);
            setTotalCount(data.total_count || 0);
            setHasMore(pg < (data.total_pages || 0));
            setCurrentPage(pg);
        } catch (e) {
            console.error('load contacts error:', e);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [store]);

    // Load on open
    useEffect(() => {
        if (show && store) load(1, '', false);
    }, [show, store]); // eslint-disable-line react-hooks/exhaustive-deps

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        const sentinel = sentinelRef.current;
        const container = containerRef.current;
        if (!sentinel || !container) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
                    setCurrentPage(prev => {
                        const next = prev + 1;
                        load(next, search, true);
                        return next;
                    });
                }
            },
            { root: container, threshold: 0.1 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, search, load]);

    const latestSearchRef = useRef(0);
    const handleSearch = (val) => {
        setSearch(val);
        setHasMore(false);
        const requestId = Date.now();
        latestSearchRef.current = requestId;
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            if (latestSearchRef.current !== requestId) return;
            setContacts([]);
            load(1, val, false);
        }, 350);
    };

    return (
        <Modal show={show} onHide={() => setShow(false)} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-whatsapp text-success me-2"></i>
                    WhatsApp Contacts
                    {store && <small className="text-muted fs-6 ms-2">— {store.name}</small>}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <div className="d-flex align-items-center gap-2 mb-3">
                    <Form.Control
                        type="text"
                        placeholder="Search by name or number…"
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        autoFocus
                    />
                    <Badge bg="secondary" style={{ whiteSpace: 'nowrap' }}>
                        {contacts.length}{totalCount > contacts.length ? ` / ${totalCount}` : ''} contacts
                    </Badge>
                    {loading && contacts.length === 0 && <Spinner size="sm" animation="border" variant="success" />}
                </div>

                {/* Contact list — infinite scroll */}
                <div
                    ref={containerRef}
                    style={{ height: 420, overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: 6 }}
                >
                    {!loading && contacts.length === 0 && (
                        <div className="text-center text-muted py-5">
                            <i className="bi bi-people" style={{ fontSize: '2rem' }}></i>
                            <p className="mt-2 mb-0">
                                {search ? 'No contacts match your search' : 'No contacts found. Sync to fetch them.'}
                            </p>
                        </div>
                    )}

                    {contacts.map(c => {
                        const name = c.push_name || c.name || c.phone;
                        const isGroup = c.jid?.endsWith('@g.us');
                        const isLid = c.jid?.endsWith('@lid');
                        const avatarColor = isGroup ? 'bg-primary' : 'bg-success';
                        return (
                            <div key={c.jid} className="d-flex align-items-center px-3 py-2"
                                style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <div className={`rounded-circle ${avatarColor} text-white d-flex align-items-center justify-content-center me-3 flex-shrink-0`}
                                    style={{ width: 36, height: 36, fontSize: '0.9em', fontWeight: 600 }}>
                                    {isGroup
                                        ? <i className="bi bi-people-fill" style={{ fontSize: '0.85em' }}></i>
                                        : (name || '?')[0].toUpperCase()
                                    }
                                </div>
                                <div className="flex-grow-1">
                                    <div className="fw-semibold" style={{ fontSize: '0.95em' }}>
                                        {name}
                                        {isGroup && <span className="badge bg-primary ms-2" style={{ fontSize: '0.7em' }}>Group</span>}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.8em' }}>
                                        {isGroup ? 'Group' : isLid ? 'Privacy ID' : `+${c.phone}`}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Sentinel + loading indicator for next page */}
                    <div ref={sentinelRef} style={{ height: 4 }} />
                    {loading && contacts.length > 0 && (
                        <div className="text-center py-3">
                            <Spinner size="sm" variant="success" />
                        </div>
                    )}
                </div>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="outline-secondary" onClick={() => setShow(false)}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
});

export default WhatsAppContactsModal;
