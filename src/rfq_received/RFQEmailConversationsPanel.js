import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EmailChatModal } from '../store/ConversationModal';

export default function RFQEmailConversationsPanel({ emails, emailLabels, storeId, chatZIndex, emptyMessage, onUnreadCount, showEmptyEmails }) {
    const token = localStorage.getItem('access_token');
    const [threads, setThreads]     = useState(null);
    const [loading, setLoading]     = useState(false);
    const [chatEmail, setChatEmail] = useState(null);
    const [newEmail, setNewEmail]   = useState('');

    const normalise = e => e ? e.trim().toLowerCase() : e;

    const load = useCallback(async () => {
        if (!storeId || !emails || emails.length === 0) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                store_id: storeId,
                type:     'email',
                limit:    '100',
                phones:   emails.map(normalise).join(','), // contact_phone stores email for email-type threads
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
    }, [storeId, emails, token]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { load(); }, [load]);

    if (!emails || emails.length === 0) {
        return (
            <div className="text-muted text-center py-5" style={{ fontSize: 13 }}>
                <i className="bi bi-envelope-x" style={{ fontSize: 28, display: 'block', marginBottom: 8, color: '#adb5bd' }}></i>
                {emptyMessage || 'No email address available for this contact.'}
            </div>
        );
    }

    const threadByEmail = {};
    (threads || []).forEach(t => { threadByEmail[normalise(t.contact_phone)] = t; });
    const rows = emails
        .map(email => {
            const norm = normalise(email);
            const thread = threadByEmail[norm];
            return { email, norm, thread, label: emailLabels?.[email] || emailLabels?.[norm] || thread?.sender_name || email };
        })
        .filter(row => showEmptyEmails || row.thread);

    const hasLoaded = threads !== null;

    const openNew = () => {
        const e = newEmail.trim().toLowerCase();
        if (!e) return;
        setChatEmail(e);
        setNewEmail('');
    };

    return (
        <div>
            {loading && (
                <div className="text-center py-3">
                    <span className="spinner-border spinner-border-sm text-primary me-2" />
                    Loading conversations…
                </div>
            )}

            {!loading && hasLoaded && rows.length === 0 && (
                <div className="text-muted text-center py-4" style={{ fontSize: 13 }}>
                    <i className="bi bi-chat-dots" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: '#adb5bd' }}></i>
                    No email conversations yet with the linked contacts.
                </div>
            )}

            {!loading && rows.length > 0 && (
                <div style={{ border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
                    {rows.map(({ email, thread, label }, idx) => (
                        <div
                            key={email}
                            className="d-flex align-items-center gap-3 px-3 py-2"
                            style={{
                                cursor: 'pointer',
                                borderBottom: idx < rows.length - 1 ? '1px solid #f0f0f0' : 'none',
                                background: '#fff',
                                transition: 'background 0.12s',
                            }}
                            onClick={() => setChatEmail(normalise(email))}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: '#1a73e8',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', flexShrink: 0, fontSize: 16,
                            }}>
                                <i className="bi bi-envelope-fill"></i>
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                                {email !== label && (
                                    <div style={{ fontSize: 11, color: '#6c757d' }}>{email}</div>
                                )}
                                <div style={{ fontSize: 11, color: '#6c757d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                                    {thread?.last_message_text || (thread ? '—' : 'No messages yet')}
                                </div>
                            </div>

                            {/* Right side: unread + date + open btn */}
                            <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                                {thread?.unread_count > 0 && (
                                    <span className="badge bg-primary rounded-pill" style={{ fontSize: 10 }}>{thread.unread_count}</span>
                                )}
                                {thread?.last_message_date && (
                                    <div style={{ fontSize: 10, color: '#6c757d' }}>
                                        {new Date(thread.last_message_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                    </div>
                                )}
                                <button
                                    className="btn btn-sm btn-outline-primary"
                                    style={{ fontSize: 10, padding: '1px 7px', whiteSpace: 'nowrap' }}
                                    onClick={e => { e.stopPropagation(); setChatEmail(normalise(email)); }}
                                >
                                    <i className="bi bi-envelope me-1"></i>Open
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Compose to a new / custom email */}
            <div className="mt-3 d-flex gap-2 align-items-center flex-wrap">
                <span style={{ fontSize: 12, color: '#6c757d', fontWeight: 600 }}>Compose to new email:</span>
                <input
                    type="email"
                    className="form-control form-control-sm"
                    placeholder="someone@example.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && openNew()}
                    style={{ maxWidth: 240, fontSize: 12 }}
                />
                <button className="btn btn-sm btn-primary" onClick={openNew} disabled={!newEmail.trim()}>
                    <i className="bi bi-envelope me-1"></i>Open Chat
                </button>
            </div>

            {chatEmail && (
                <EmailChatModal
                    show={!!chatEmail}
                    email={chatEmail}
                    storeId={storeId}
                    zIndex={chatZIndex || 20000}
                    onHide={() => { setChatEmail(null); load(); }}
                />
            )}
        </div>
    );
}
