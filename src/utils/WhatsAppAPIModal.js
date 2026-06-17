import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Spinner, Alert, Form, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

// Mounts once, calls onSync immediately, then unmounts. Used to trigger auto-sync
// after a fresh WhatsApp connection without fighting stale closure issues.
function OnceSync({ onSync }) {
    useEffect(() => { onSync(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
}

// ── phone helpers ─────────────────────────────────────────────────────────────

// Normalise any phone to Evolution API format (digits only, no +, no spaces).
// Saudi "05XXXXXXXX" → "9665XXXXXXXX"
// "+XXXXXXXXXXXX"   → "XXXXXXXXXXXX"
// Other formats are returned as-is (digits only).
function normalisePhone(raw) {
    if (!raw) return null;
    let p = raw.trim().replace(/[\s\-().]/g, '');
    if (p.startsWith('+')) p = p.slice(1);
    // Saudi local: 05XXXXXXXX (10 digits) → 9665XXXXXXXX
    if (/^05\d{8}$/.test(p)) return '966' + p.slice(1);
    // Saudi local without leading 0: 5XXXXXXXXX (9 digits)
    if (/^5\d{8}$/.test(p)) return '966' + p;
    return p;
}

function isSaudiLocal(raw) {
    if (!raw) return false;
    const p = raw.trim().replace(/[\s\-.()]/g, '');
    return /^05\d{8}$/.test(p) || /^5\d{8}$/.test(p);
}

function needsCountryCode(raw) {
    if (!raw) return false;
    const p = raw.trim().replace(/[\s\-.()]/g, '');
    // Not a Saudi local and doesn't start with + or 9 or 1 etc.
    if (isSaudiLocal(p)) return false;
    if (p.startsWith('+')) return false;
    if (p.startsWith('966')) return false;
    // Looks like a local number without country code
    return true;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function WhatsAppAPIModal({
    show, onClose,
    pdfBlob, pdfFileName,
    storeId,
    customer,         // { phone, phone2, name }
    defaultCaption,   // optional pre-filled message (document type text)
}) {
    const { t } = useTranslation('common');
    const [caption, setCaption] = useState('');

    // ── Connection state ────────────────────────────────────────────────────
    const [connStatus, setConnStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
    const [connectPhase, setConnectPhase] = useState('idle'); // 'idle' | 'creating' | 'waitingQR' | 'connected' | 'error'
    const [qrBase64, setQrBase64] = useState(null);
    const [connectError, setConnectError] = useState('');
    const connectPollRef = useRef(null);
    const qrCountRef = useRef(0);
    const syncContactsRef = useRef(null);
    const wasDisconnectedRef = useRef(false);
    const [triggerAutoSync, setTriggerAutoSync] = useState(false);

    const stopConnectPoll = useCallback(() => {
        if (connectPollRef.current) { clearInterval(connectPollRef.current); connectPollRef.current = null; }
    }, []);

    const startConnectPoll = useCallback((sid) => {
        stopConnectPoll();
        connectPollRef.current = setInterval(async () => {
            try {
                const statusData = await fetch(`/v1/whatsapp/status?store_id=${sid}`, {
                    headers: { Authorization: localStorage.getItem('access_token') },
                }).then(r => r.json());
                if (statusData.connected) {
                    stopConnectPoll();
                    setConnectPhase('connected');
                    setTimeout(() => {
                        setConnStatus('connected');
                        setConnectPhase('idle');
                        setTriggerAutoSync(true);
                    }, 1500);
                    return;
                }
                const qrData = await fetch(`/v1/whatsapp/qr?store_id=${sid}`, {
                    headers: { Authorization: localStorage.getItem('access_token') },
                }).then(r => r.json());
                if (qrData.base64 && qrData.count !== qrCountRef.current) {
                    qrCountRef.current = qrData.count;
                    setQrBase64(qrData.base64);
                }
            } catch (e) { console.error('connect poll error:', e); }
        }, 3000);
    }, [stopConnectPoll]);

    const handleWhatsAppConnect = useCallback(async () => {
        if (!storeId) return;
        setConnectPhase('creating');
        setConnectError('');
        setQrBase64(null);
        try {
            const res = await fetch('/v1/whatsapp/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') },
                body: JSON.stringify({ store_id: storeId }),
            });
            const data = await res.json();
            if (!res.ok || data.error) { setConnectPhase('error'); setConnectError(data.error || 'Failed'); return; }
            setConnectPhase('waitingQR');
            setTimeout(() => startConnectPoll(storeId), 4000);
        } catch (e) { setConnectPhase('error'); setConnectError(e.message); }
    }, [storeId, startConnectPoll]);

    // ── Option 1: Customer numbers ──────────────────────────────────────────
    const [numbers, setNumbers] = useState([]);      // [{raw, formatted, status, jid}]
    const [sendingCustomer, setSendingCustomer] = useState(false);
    const [customerResult, setCustomerResult] = useState(null);

    // ── Option 2: Store contacts ────────────────────────────────────────────
    const [contacts, setContacts] = useState([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const [contactTotalCount, setContactTotalCount] = useState(0);
    const [contactHasMore, setContactHasMore] = useState(false);
    const numberCheckTimer = useRef(null);
    const contactsLoadingRef = useRef(false);
    const contactsPageRef = useRef(1);
    const contactsContainerRef = useRef(null);
    const CONTACTS_LIMIT = 50;
    const [selected, setSelected] = useState(new Set());
    const [selectedContacts, setSelectedContacts] = useState({}); // jid → contact object
    const [showSelectedPanel, setShowSelectedPanel] = useState(false);
    const [sendingContacts, setSendingContacts] = useState(false);
    const [contactsResult, setContactsResult] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);

    // ── Check a given list of numbers in the background ─────────────────────
    const runCheck = useCallback(async (numsToCheck) => {
        const eligible = numsToCheck.filter(n => n.formatted && !needsCountryCode(n.raw));
        if (!eligible.length) return;

        // Mark eligible ones as 'checking' immediately
        setNumbers(prev => prev.map(n =>
            eligible.find(e => e.raw === n.raw)
                ? { ...n, status: 'checking' }
                : n
        ));

        try {
            const res = await fetch('/v1/whatsapp/check-numbers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') },
                body: JSON.stringify({ store_id: storeId, numbers: eligible.map(n => n.formatted) }),
            });
            if (!res.ok) throw new Error('check-numbers failed');
            const data = await res.json();
            const resultMap = {};
            (Array.isArray(data) ? data : []).forEach(r => { resultMap[r.number] = r; });

            setNumbers(prev => prev.map(n => {
                if (needsCountryCode(n.raw)) return { ...n, status: 'needs_code' };
                const r = resultMap[n.formatted];
                if (!r) return n;
                return { ...n, status: r.exists ? 'valid' : 'invalid', jid: r.jid || null };
            }));
        } catch (e) {
            console.error('check-numbers error:', e);
            setNumbers(prev => prev.map(n =>
                n.status === 'checking' ? { ...n, status: 'unchecked' } : n
            ));
        }
    }, [storeId]);

    // Reset when modal opens — immediately trigger background check
    useEffect(() => {
        if (!show) { stopConnectPoll(); return; }

        // Reset all state
        setCaption('');
        setCustomerResult(null);
        setContactsResult(null);
        setSelected(new Set());
        setSelectedContacts({});
        setShowSelectedPanel(false);
        setContactSearch('');
        setConnStatus('checking');
        wasDisconnectedRef.current = false;
        setConnectPhase('idle');
        setQrBase64(null);
        setConnectError('');
        qrCountRef.current = 0;

        // Check connection status first
        if (storeId) {
            fetch(`/v1/whatsapp/status?store_id=${storeId}`, {
                headers: { Authorization: localStorage.getItem('access_token') },
            })
                .then(r => r.json())
                .then(data => setConnStatus(data.connected ? 'connected' : 'disconnected'))
                .catch(() => setConnStatus('disconnected'));
        }

        const nums = [];
        if (customer?.phone) nums.push({ raw: customer.phone, formatted: normalisePhone(customer.phone), status: 'unchecked', jid: null });
        if (customer?.phone2) nums.push({ raw: customer.phone2, formatted: normalisePhone(customer.phone2), status: 'unchecked', jid: null });
        setNumbers(nums);
        // runCheck is deferred — fires once connStatus becomes 'connected' (see effect below)
    }, [show, customer]); // eslint-disable-line react-hooks/exhaustive-deps

    // Run number check + auto-sync when WhatsApp becomes connected
    useEffect(() => {
        if (connStatus !== 'connected') return;
        // Number validation
        if (numbers.length > 0) {
            const toCheck = numbers.map(n => ({ ...n, status: 'checking' }));
            setNumbers(toCheck);
            runCheck(toCheck);
        }
    }, [connStatus]); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-check after user edits a number field
    const recheckNumber = useCallback((updatedNums) => {
        const toRecheck = updatedNums.filter(n => n.status === 'unchecked' && n.formatted && !needsCountryCode(n.raw));
        if (toRecheck.length) runCheck(toRecheck);
    }, [runCheck]);

    // ── Send to customer numbers ────────────────────────────────────────────
    const sendToCustomer = useCallback(async () => {
        const valid = numbers.filter(n => n.status === 'valid');
        if (!valid.length || !pdfBlob) return;
        setSendingCustomer(true);
        setCustomerResult(null);
        const results = [];
        for (const num of valid) {
            const fd = new FormData();
            fd.append('file', pdfBlob, pdfFileName || 'invoice.pdf');
            fd.append('phone', num.formatted);
            fd.append('caption', caption);
            fd.append('filename', pdfFileName || 'invoice.pdf');
            if (storeId) fd.append('store_id', storeId);
            try {
                const res = await fetch('/v1/whatsapp/send-document', {
                    method: 'POST',
                    headers: { Authorization: localStorage.getItem('access_token') },
                    body: fd,
                });
                const d = await res.json().catch(() => ({}));
                results.push({ phone: num.raw, success: res.ok && d.success, error: d.error });
            } catch (e) {
                results.push({ phone: num.raw, success: false, error: e.message });
            }
        }
        setSendingCustomer(false);
        setCustomerResult(results);
    }, [numbers, pdfBlob, pdfFileName, caption, storeId]);

    // ── Load contacts (append=true → infinite scroll, false → fresh load) ──
    const loadContacts = useCallback(async (page = 1, search = '', append = false) => {
        if (contactsLoadingRef.current) return;
        contactsLoadingRef.current = true;
        setContactsLoading(true);
        try {
            const params = new URLSearchParams({
                store_id: storeId,
                page,
                limit: CONTACTS_LIMIT,
                ...(search ? { search } : {}),
            });
            const res = await fetch(`/v1/whatsapp/contacts?${params}`, {
                headers: { Authorization: localStorage.getItem('access_token') },
            });
            const data = await res.json();
            const newContacts = data.contacts || [];
            if (!append) contactsPageRef.current = page;
            setContacts(prev => append ? [...prev, ...newContacts] : newContacts);
            setContactTotalCount(data.total_count || 0);
            setContactHasMore(page < (data.total_pages || 0));
        } catch (e) {
            console.error('contacts error:', e);
        } finally {
            contactsLoadingRef.current = false;
            setContactsLoading(false);
        }
    }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup connect poll on unmount
    useEffect(() => () => stopConnectPoll(), [stopConnectPoll]);

    const syncContacts = useCallback(async () => {
        if (!storeId || syncing) return;
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch('/v1/whatsapp/sync-contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') },
                body: JSON.stringify({ store_id: storeId }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSyncResult({ ok: true, count: data.count });
                setTimeout(() => setSyncResult(null), 4000);
                setContacts([]);
                loadContacts(1, contactSearch, false);
            } else {
                setSyncResult({ ok: false, error: data.error || 'Sync failed' });
                setTimeout(() => setSyncResult(null), 4000);
            }
        } catch (e) {
            setSyncResult({ ok: false, error: e.message });
            setTimeout(() => setSyncResult(null), 4000);
        } finally {
            setSyncing(false);
        }
    }, [storeId, syncing, contactSearch, loadContacts]);

    // Keep ref current so startConnectPoll can call syncContacts without stale closures
    syncContactsRef.current = syncContacts;


    // Auto-load contacts when modal opens
    useEffect(() => {
        if (!show) return;
        // Show existing contacts immediately, then sync in background.
        loadContacts(1, '', false);
        if (storeId) {
            fetch('/v1/whatsapp/sync-contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') },
                body: JSON.stringify({ store_id: storeId }),
            })
                .then(r => r.json())
                .then(data => { if (data.success) loadContacts(1, '', false); })
                .catch(() => {});
        }
    }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleContactsScroll = useCallback((e) => {
        const el = e.currentTarget;
        if (contactHasMore && !contactsLoadingRef.current &&
            el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
            const next = (contactsPageRef.current || 1) + 1;
            contactsPageRef.current = next;
            loadContacts(next, contactSearch, true);
        }
    }, [contactHasMore, contactSearch, loadContacts]);

    // Debounced search with request-ID tracking (same pattern as product search)
    const searchTimer = React.useRef(null);
    const latestSearchRef = useRef(0);
    const handleContactSearch = (val) => {
        setContactSearch(val);
        setContactHasMore(false);
        const requestId = Date.now();
        latestSearchRef.current = requestId;
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(async () => {
            if (latestSearchRef.current !== requestId) return; // stale — newer search queued
            setContacts([]);
            loadContacts(1, val, false);
        }, 350);
    };

    // ── Send to selected contacts ───────────────────────────────────────────
    const sendToContacts = useCallback(async () => {
        if (!selected.size || !pdfBlob) return;
        setSendingContacts(true);
        setContactsResult(null);
        const targets = contacts.filter(c => selected.has(c.jid));
        const results = [];
        for (const contact of targets) {
            // Regular contacts: bare phone number (e.g. 966501234567).
            // Groups (@g.us) and @lid: pass the full JID — Evolution API requires it.
            const phone = contact.jid?.endsWith('@s.whatsapp.net')
                ? contact.phone
                : contact.jid;
            const displayName = contact.push_name || contact.name || phone;
            const fd = new FormData();
            fd.append('file', pdfBlob, pdfFileName || 'invoice.pdf');
            fd.append('phone', phone);
            fd.append('caption', caption);
            fd.append('filename', pdfFileName || 'invoice.pdf');
            if (storeId) fd.append('store_id', storeId);
            try {
                const res = await fetch('/v1/whatsapp/send-document', {
                    method: 'POST',
                    headers: { Authorization: localStorage.getItem('access_token') },
                    body: fd,
                });
                const d = await res.json().catch(() => ({}));
                results.push({ name: displayName, success: res.ok && d.success, error: d.error, detail: d.detail });
            } catch (e) {
                results.push({ name: displayName, success: false, error: e.message });
            }
        }
        setSendingContacts(false);
        setContactsResult(results);
        setTimeout(() => setContactsResult(null), 5000);
    }, [selected, contacts, pdfBlob, pdfFileName, caption, storeId]);

    const toggleContact = (jid, contactObj) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(jid)) {
                next.delete(jid);
                setSelectedContacts(m => { const n = { ...m }; delete n[jid]; return n; });
            } else {
                next.add(jid);
                if (contactObj) setSelectedContacts(m => ({ ...m, [jid]: contactObj }));
            }
            if (next.size === 0) setShowSelectedPanel(false);
            return next;
        });
    };



    const validNums = numbers.filter(n => n.status === 'valid');

    const totalRecipients = validNums.length + selected.size;
    const isSending = sendingCustomer || sendingContacts;

    const sendAll = async () => {
        if (validNums.length > 0) await sendToCustomer();
        if (selected.size > 0) await sendToContacts();
    };

    return (
        <Modal show={show} onHide={onClose} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-whatsapp text-success me-2"></i>
                    {t("Send via WhatsApp")}
                    {customer?.name && <small className="text-muted fs-6 ms-2">— {customer.name}</small>}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {/* ── Not connected gate ── */}
                {connStatus === 'checking' && (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="success" />
                        <p className="mt-3 text-muted">{t("Checking WhatsApp connection…")}</p>
                    </div>
                )}

                {connStatus === 'disconnected' && (
                    <div className="text-center py-4">
                        {connectPhase === 'idle' && (
                            <>
                                <i className="bi bi-whatsapp text-success" style={{ fontSize: '3rem' }}></i>
                                <p className="mt-3 mb-1 fw-semibold">{t("WhatsApp is not connected")}</p>
                                <p className="text-muted mb-4" style={{ fontSize: '0.9em' }}>
                                    {t("Connect your store's WhatsApp account to send PDFs to contacts.")}
                                </p>
                                <Button variant="success" onClick={handleWhatsAppConnect}>
                                    <i className="bi bi-whatsapp me-2"></i>{t("Connect WhatsApp")}
                                </Button>
                            </>
                        )}
                        {connectPhase === 'creating' && (
                            <>
                                <Spinner animation="border" variant="success" />
                                <p className="mt-3 text-muted">{t("Creating WhatsApp instance…")}</p>
                            </>
                        )}
                        {connectPhase === 'waitingQR' && (
                            <>
                                {qrBase64 ? (
                                    <>
                                        <img src={qrBase64} alt="WhatsApp QR" style={{ width: 220, height: 220, border: '2px solid #25D366', borderRadius: 8 }} />
                                        <p className="mt-2 mb-0 text-muted" style={{ fontSize: '0.85em' }}>
                                            <i className="bi bi-phone me-1"></i>
                                            WhatsApp → Linked Devices → Link a Device → scan above
                                        </p>
                                        <p className="mt-1 mb-0 text-muted" style={{ fontSize: '0.75em' }}>
                                            {t("QR refreshes automatically")} <Spinner size="sm" animation="border" variant="success" className="ms-1" />
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Spinner animation="border" variant="success" />
                                        <p className="mt-3 text-muted">{t("Generating QR code…")}</p>
                                    </>
                                )}
                            </>
                        )}
                        {connectPhase === 'connected' && (
                            <>
                                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                                <p className="mt-3 fw-semibold text-success">{t("WhatsApp Connected!")}</p>
                            </>
                        )}
                        {connectPhase === 'error' && (
                            <>
                                <Alert variant="danger">{connectError}</Alert>
                                <Button variant="success" onClick={handleWhatsAppConnect}>
                                    <i className="bi bi-arrow-repeat me-2"></i>{t("Try Again")}
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {/* ── Normal send UI (only when connected) ── */}
                {connStatus === 'connected' && <>
                {triggerAutoSync && storeId && (
                    <OnceSync onSync={() => {
                        setTriggerAutoSync(false);
                        const doSync = (delay) => new Promise(resolve => {
                            setTimeout(() => {
                                setSyncing(true);
                                fetch('/v1/whatsapp/sync-contacts', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') },
                                    body: JSON.stringify({ store_id: storeId }),
                                })
                                    .then(r => r.json())
                                    .then(data => {
                                        if (data.success) {
                                            setSyncResult({ ok: true, count: data.count });
                                            setTimeout(() => setSyncResult(null), 4000);
                                            contactsLoadingRef.current = false;
                                            setContacts([]);
                                            loadContacts(1, '', false);
                                        }
                                    })
                                    .catch(() => {})
                                    .finally(() => { setSyncing(false); resolve(); });
                            }, delay);
                        });
                        doSync(2000).then(() => doSync(2000));
                    }} />
                )}
                {/* Optional message */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">{t("Message")} <small className="text-muted fw-normal">({t("optional")})</small></Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={2}
                        value={caption}
                        onChange={e => setCaption(e.target.value)}
                        placeholder={t("Leave blank to send PDF only (no text message)")}
                    />
                </Form.Group>

                {/* ── Section 1: Customer Numbers ── */}
                <div className="mb-3">
                    <div className="fw-bold mb-2" style={{ fontSize: '0.9em', color: '#198754' }}>
                        <i className="bi bi-person me-1"></i>{t("Customer's Number")}
                    </div>
                    <div>
                        {numbers.length === 0 && (
                            <Alert variant="warning">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                {t("No phone number found for this customer.")}
                            </Alert>
                        )}

                        {numbers.map((num, i) => (
                            <div key={i} className="d-flex align-items-center gap-2 mb-2">
                                <Form.Control
                                    value={num.raw}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const updated = numbers.map((n, idx) => idx === i
                                            ? { ...n, raw: val, formatted: normalisePhone(val), status: 'unchecked', jid: null }
                                            : n
                                        );
                                        setNumbers(updated);
                                        clearTimeout(numberCheckTimer.current);
                                        numberCheckTimer.current = setTimeout(() => recheckNumber(updated), 600);
                                    }}
                                    placeholder={t("Phone number")}
                                    style={{ maxWidth: 220 }}
                                />
                                <span className="text-muted" style={{ fontSize: '0.8em', minWidth: 130 }}>
                                    {num.formatted ? `+${num.formatted}` : '—'}
                                </span>
                                {num.status === 'checking' && <Spinner size="sm" animation="border" variant="secondary" />}
                                {num.status === 'valid' && <Badge bg="success"><i className="bi bi-check-circle me-1"></i>{t("Has WhatsApp")}</Badge>}
                                {num.status === 'invalid' && <Badge bg="danger"><i className="bi bi-x-circle me-1"></i>{t("No WhatsApp")}</Badge>}
                                {num.status === 'needs_code' && (
                                    <Badge bg="warning" text="dark">
                                        <i className="bi bi-info-circle me-1"></i>{t("Add country code (e.g. +91)")}
                                    </Badge>
                                )}
                                <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => setNumbers(prev => prev.filter((_, idx) => idx !== i))}
                                    title={t("Remove")}
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
                            </div>
                        ))}

                        <div className="d-flex gap-2 mt-2">
                            <Button variant="outline-secondary" size="sm" onClick={() => {
                                const updated = [...numbers, { raw: '', formatted: '', status: 'unchecked', jid: null }];
                                setNumbers(updated);
                            }}>
                                <i className="bi bi-plus me-1"></i>{t("Add number")}
                            </Button>
                        </div>

                        {numbers.some(n => n.status === 'invalid') && (
                            <Alert variant="warning" className="mt-2 py-2 mb-0" style={{ fontSize: '0.85em' }}>
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                {t("Some numbers don't have WhatsApp. Only verified numbers will receive the PDF.")}
                            </Alert>
                        )}

                        {customerResult && (
                            <div className="mt-2">
                                {customerResult.map((r, i) => (
                                    <Alert key={i} variant={r.success ? 'success' : 'danger'} className="py-1 mb-1" style={{ fontSize: '0.85em' }}>
                                        {r.success
                                            ? <><i className="bi bi-check-circle me-1"></i>{r.phone} — {t("PDF sent!")}</>
                                            : <><i className="bi bi-x-circle me-1"></i>{r.phone} — {r.error}</>
                                        }
                                    </Alert>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <hr className="my-3" />

                {/* ── Send PDF button ── */}
                <div className="d-flex align-items-center justify-content-end gap-2 mb-3">
                    <Button
                        variant="success"
                        disabled={isSending || totalRecipients === 0}
                        onClick={sendAll}
                    >
                        {isSending
                            ? <><Spinner size="sm" className="me-1" />{t("Sending…")}</>
                            : <>
                                <i className="bi bi-file-earmark-pdf me-1"></i>
                                {t("Send PDF")}
                                {totalRecipients > 0 && ` (${totalRecipients})`}
                              </>
                        }
                    </Button>
                </div>

                {contactsResult && (
                    <div className="mb-2" style={{ maxHeight: 120, overflowY: 'auto' }}>
                        {contactsResult.map((r, i) => (
                            <Alert key={i} variant={r.success ? 'success' : 'danger'} className="py-1 mb-1" style={{ fontSize: '0.85em' }}>
                                {r.success
                                    ? <><i className="bi bi-check-circle me-1"></i>{r.name} — {t("sent!")}</>
                                    : <><i className="bi bi-x-circle me-1"></i>{r.name} — {r.error}{r.detail ? `: ${typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail)}` : ''}</>
                                }
                            </Alert>
                        ))}
                    </div>
                )}

                {/* ── Section 2: Store Contacts ── */}
                <div>
                    <div className="fw-bold mb-2" style={{ fontSize: '0.9em', color: '#198754' }}>
                        <i className="bi bi-people me-1"></i>{t("Store Contacts")}
                    </div>
                    <div>
                        {/* Search + controls */}
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <Form.Control
                                type="text"
                                placeholder={t("Search contacts…")}
                                value={contactSearch}
                                onChange={e => handleContactSearch(e.target.value)}
                                size="sm"
                            />
                            {selected.size > 0 && (
                                <Badge bg="success" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    onClick={() => setShowSelectedPanel(p => !p)}>
                                    {selected.size} {t("selected")} <i className={`bi bi-chevron-${showSelectedPanel ? 'up' : 'down'} ms-1`} style={{ fontSize: '0.75em' }}></i>
                                </Badge>
                            )}
                            <Button variant="outline-success" disabled={syncing}
                                title={t("Re-sync contacts from WhatsApp")}
                                onClick={syncContacts}
                                style={{ whiteSpace: 'nowrap' }}>
                                {syncing
                                    ? <Spinner size="sm" animation="border" />
                                    : <span className="d-inline-flex align-items-center gap-1">
                                        <i className="bi bi-whatsapp" style={{ fontSize: '1.1em' }}></i>
                                        <i className="bi bi-arrow-repeat" style={{ fontSize: '1.1em' }}></i>
                                      </span>
                                }
                            </Button>
                        </div>
                        {syncResult && (
                            <Alert variant={syncResult.ok ? 'success' : 'danger'} className="py-1 mb-2" style={{ fontSize: '0.8em' }}>
                                {syncResult.ok
                                    ? <><i className="bi bi-check-circle me-1"></i>{syncResult.count} {t("contacts synced")}</>
                                    : <><i className="bi bi-x-circle me-1"></i>{syncResult.error}</>
                                }
                            </Alert>
                        )}

                        {/* Selected contacts panel */}
                        {showSelectedPanel && selected.size > 0 && (
                            <div className="mb-2 p-2" style={{ border: '1px solid #dee2e6', borderRadius: 6, maxHeight: 160, overflowY: 'auto', background: '#f8f9fa' }}>
                                {Object.values(selectedContacts).map(c => (
                                    <div key={c.jid} className="d-flex align-items-center justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                                        <span style={{ fontSize: '0.85em' }}>{c.push_name || c.name || c.phone}</span>
                                        <button className="btn btn-sm p-0 ms-2 text-danger" style={{ lineHeight: 1 }}
                                            onClick={() => toggleContact(c.jid)}>
                                            <i className="bi bi-x-lg" style={{ fontSize: '0.8em' }}></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Contacts list — infinite scroll */}
                        <div
                            ref={contactsContainerRef}
                            style={{ height: 300, overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: 6 }}
                            onScroll={handleContactsScroll}
                        >
                            {contactsLoading && contacts.length === 0 && (
                                <div className="d-flex align-items-center justify-content-center" style={{ height: '100%' }}>
                                    <Spinner variant="success" />
                                </div>
                            )}
                            {!contactsLoading && contacts.length === 0 && (
                                <div className="text-center py-4">
                                    <p className="text-muted mb-2">
                                        {contactSearch
                                            ? t("No contacts match your search")
                                            : t("No contacts found. Make sure WhatsApp is connected and contacts are synced.")
                                        }
                                    </p>
                                    <Button size="sm" variant="outline-primary" onClick={() => loadContacts(1, '', false)}>
                                        {t("Reload")}
                                    </Button>
                                </div>
                            )}
                            {contacts.map(c => {
                                const name = c.push_name || c.name || c.phone;
                                const checked = selected.has(c.jid);
                                const isGroup = c.jid?.endsWith('@g.us');
                                const isLid = c.jid?.endsWith('@lid');
                                return (
                                    <div
                                        key={c.jid}
                                        className={`d-flex align-items-center gap-2 px-3 py-2 ${checked ? 'bg-success bg-opacity-10' : ''}`}
                                        style={{ cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                                        onClick={() => toggleContact(c.jid, c)}
                                    >
                                        <Form.Check
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleContact(c.jid, c)}
                                            onClick={e => e.stopPropagation()}
                                        />
                                        <div className="flex-grow-1">
                                            <div style={{ fontWeight: checked ? 600 : 400 }}>
                                                {isGroup && <i className="bi bi-people-fill text-primary me-1" style={{ fontSize: '0.85em' }}></i>}
                                                {name}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.8em' }}>
                                                {isGroup ? 'Group' : isLid ? 'Privacy ID' : `+${c.phone}`}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {contactsLoading && contacts.length > 0 && (
                                <div className="text-center py-2">
                                    <Spinner size="sm" variant="success" />
                                </div>
                            )}
                        </div>

                        {contactTotalCount > 0 && (
                            <div className="text-muted mt-1" style={{ fontSize: '0.8em' }}>
                                {contacts.length} / {contactTotalCount} {t("contacts")}
                            </div>
                        )}

                    </div>
                </div>
                </>}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="outline-secondary" onClick={onClose}>{t("Close")}</Button>
            </Modal.Footer>
        </Modal>
    );
}
