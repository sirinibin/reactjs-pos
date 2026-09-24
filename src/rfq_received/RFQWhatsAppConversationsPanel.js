import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WhatsAppChatModal } from '../store/ConversationModal';

/**
 * RFQWhatsAppConversationsPanel
 * Shows WhatsApp conversation threads filtered to a specific list of phones.
 * Used in Send modal, ForwardDetail, and EmailDetailModal for Supplier / Customer tabs.
 *
 * Props:
 *   phones      – string[] of phone numbers to show conversations for
 *   phoneLabels – { [phone]: string } optional display names for each phone
 *   storeId     – store ID
 *   chatZIndex  – z-index to pass to WhatsAppChatModal (default 20000)
 *   emptyMessage – string shown when phones is empty / null
 */
export default function RFQWhatsAppConversationsPanel({ phones, phoneLabels, storeId, chatZIndex, emptyMessage, onUnreadCount, onEditSupplier, initialChatPhone }) {
    const token = localStorage.getItem('access_token');
    const [threads, setThreads]     = useState(null); // null = not loaded yet
    const [loading, setLoading]     = useState(false);
    const [chatPhone, setChatPhone] = useState(null);
    const [newPhone, setNewPhone]   = useState('');
    const newPhoneRef = useRef(null);
    const initialChatOpened = useRef(false);
    const lastInitialChatPhone = useRef(null);

    const load = useCallback(async () => {
        if (!storeId || !phones || phones.length === 0) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                store_id: storeId,
                type:     'whatsapp',
                limit:    '100',
                phones:   phones.join(','),
            });
            const res  = await fetch(`/v1/procurement-message-threads?${params}`, { headers: { Authorization: token } });
            const data = await res.json();
            const fetched = data.threads || [];
            setThreads(fetched);
            if (onUnreadCount) {
                onUnreadCount(fetched.reduce((sum, t) => sum + (t.unread_count || 0), 0));
            }
        } catch (_) { setThreads([]); if (onUnreadCount) onUnreadCount(0); }
        setLoading(false);
    }, [storeId, phones, token]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { load(); }, [load]);

    // Auto-open a specific chat when initialChatPhone is given (e.g. opened from header notification).
    // Reset the guard whenever initialChatPhone changes so a new notification always auto-opens.
    useEffect(() => {
        if (initialChatPhone !== lastInitialChatPhone.current) {
            initialChatOpened.current = false;
            lastInitialChatPhone.current = initialChatPhone;
        }
        if (!initialChatPhone || initialChatOpened.current || threads === null) return;
        initialChatOpened.current = true;
        setChatPhone(initialChatPhone.replace(/^\+/, ''));
    }, [threads, initialChatPhone]);

    const openChat = (phone) => {
        if (phone) setChatPhone(phone.replace(/^\+/, ''));
    };

    const openNew = () => {
        const p = newPhone.trim();
        if (!p) return;
        openChat(p);
        setNewPhone('');
    };

    if (!phones || phones.length === 0) {
        return (
            <div className="text-muted text-center py-5" style={{ fontSize: 13 }}>
                <i className="bi bi-telephone-x" style={{ fontSize: 28, display: 'block', marginBottom: 8, color: '#adb5bd' }}></i>
                {emptyMessage || 'No phone numbers available for this contact.'}
            </div>
        );
    }

    // Build list: only phones that have a thread (have message history)
    const threadByPhone = {};
    (threads || []).forEach(t => { threadByPhone[t.contact_phone] = t; });
    const normalise = p => p ? p.replace(/^\+/, '') : p;
    const rows = phones
        .map(phone => {
            const norm = normalise(phone);
            const thread = threadByPhone[norm] || threadByPhone[phone];
            return { phone, norm, thread, label: phoneLabels?.[phone] || phoneLabels?.[norm] || thread?.sender_name || phone };
        })
        .filter(row => row.thread); // only show phones with existing message history

    const hasLoaded = threads !== null;

    return (
        <div>
            {loading && (
                <div className="text-center py-3">
                    <span className="spinner-border spinner-border-sm text-success me-2" />
                    Loading conversations…
                </div>
            )}

            {!loading && hasLoaded && rows.length === 0 && (
                <div className="text-muted text-center py-4" style={{ fontSize: 13 }}>
                    <i className="bi bi-chat-dots" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: '#adb5bd' }}></i>
                    No conversations yet with the linked contacts.
                </div>
            )}

            {!loading && rows.length > 0 && (
                <div style={{ border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
                    {rows.map(({ phone, thread, label }, idx) => (
                        <div
                            key={phone}
                            className="d-flex align-items-center gap-3 px-3 py-2"
                            style={{
                                cursor: 'pointer',
                                borderBottom: idx < rows.length - 1 ? '1px solid #f0f0f0' : 'none',
                                background: '#fff',
                                transition: 'background 0.12s',
                            }}
                            onClick={() => openChat(phone)}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fdf8'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: '#25D366',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', flexShrink: 0, fontSize: 16,
                            }}>
                                <i className="bi bi-whatsapp"></i>
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                                {phone !== label && (
                                    <div style={{ fontSize: 11, color: '#6c757d' }}>{phone}</div>
                                )}
                                <div style={{ fontSize: 11, color: '#6c757d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                                    {thread.last_message_text || '—'}
                                </div>
                            </div>

                            {/* Right side: unread + date + open + edit btns */}
                            <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                                {thread.unread_count > 0 && (
                                    <span className="badge bg-success rounded-pill" style={{ fontSize: 10 }}>{thread.unread_count}</span>
                                )}
                                {thread.last_message_date && (
                                    <div style={{ fontSize: 10, color: '#6c757d' }}>
                                        {new Date(thread.last_message_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                    </div>
                                )}
                                <div className="d-flex gap-1">
                                    {onEditSupplier && (
                                        <button
                                            className="btn btn-sm btn-outline-secondary"
                                            style={{ fontSize: 10, padding: '1px 6px', whiteSpace: 'nowrap' }}
                                            title="Edit supplier in RFQ"
                                            onClick={e => { e.stopPropagation(); onEditSupplier(phone); }}
                                        >
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-sm btn-outline-success"
                                        style={{ fontSize: 10, padding: '1px 7px', whiteSpace: 'nowrap' }}
                                        onClick={e => { e.stopPropagation(); openChat(phone); }}
                                    >
                                        <i className="bi bi-whatsapp me-1"></i>Open
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Compose to a new / custom number */}
            <div className="mt-3 d-flex gap-2 align-items-center flex-wrap">
                <span style={{ fontSize: 12, color: '#6c757d', fontWeight: 600 }}>Compose to new number:</span>
                <input
                    ref={newPhoneRef}
                    type="tel"
                    className="form-control form-control-sm"
                    placeholder="+966501234567"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && openNew()}
                    style={{ maxWidth: 200, fontSize: 12 }}
                />
                <button className="btn btn-sm btn-success" onClick={openNew} disabled={!newPhone.trim()}>
                    <i className="bi bi-whatsapp me-1"></i>Open Chat
                </button>
            </div>

            {/* WhatsApp Chat Modal */}
            {chatPhone && (
                <WhatsAppChatModal
                    show={!!chatPhone}
                    phone={chatPhone}
                    storeId={storeId}
                    zIndex={chatZIndex || 20000}
                    onHide={() => { setChatPhone(null); load(); }}
                />
            )}
        </div>
    );
}
