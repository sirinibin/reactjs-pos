import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';

// Read-only server status view for non-admin users who have been granted access.
// All requests go to /health-monitor/ directly — no main API dependency.
export default function ServerStatusModal({ show, onHide }) {
    const [serverStatus, setServerStatus] = useState(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [restartLog, setRestartLog] = useState([]);

    const fetchStatus = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const resp = await fetch('/health-monitor/status', { headers: { Authorization: `Bearer ${token}` } });
            if (resp.status === 403 || resp.status === 401) {
                setAccessDenied(true);
                return;
            }
            if (!resp.ok) return;
            const data = await resp.json();
            setServerStatus(data);
            setAccessDenied(false);
        } catch (_) {}
    };

    const fetchLog = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const resp = await fetch('/health-monitor/restart-log', { headers: { Authorization: `Bearer ${token}` } });
            if (!resp.ok) return;
            const data = await resp.json();
            setRestartLog(Array.isArray(data) ? data : []);
        } catch (_) {}
    };

    useEffect(() => {
        if (!show) return;
        setAccessDenied(false);
        fetchStatus();
        fetchLog();
        const id = setInterval(fetchStatus, 5000);
        return () => clearInterval(id);
    }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

    const palette = {
        running:    { bg: '#f0fdf4', border: '#86efac', dot: '#16a34a', badgeBg: '#dcfce7', badgeText: '#15803d', label: 'RUNNING' },
        degraded:   { bg: '#fffbeb', border: '#fcd34d', dot: '#d97706', badgeBg: '#fef9c3', badgeText: '#92400e', label: 'DEGRADED' },
        down:       { bg: '#fef2f2', border: '#fca5a5', dot: '#dc2626', badgeBg: '#fee2e2', badgeText: '#991b1b', label: 'DOWN' },
        starting:   { bg: '#eff6ff', border: '#93c5fd', dot: '#2563eb', badgeBg: '#dbeafe', badgeText: '#1e40af', label: 'STARTING…' },
        stopping:   { bg: '#eff6ff', border: '#93c5fd', dot: '#6366f1', badgeBg: '#e0e7ff', badgeText: '#3730a3', label: 'STOPPING…' },
        restarting: { bg: '#eff6ff', border: '#93c5fd', dot: '#2563eb', badgeBg: '#dbeafe', badgeText: '#1e40af', label: 'RESTARTING…' },
        unknown:    { bg: '#f9fafb', border: '#e5e7eb', dot: '#9ca3af', badgeBg: '#f3f4f6', badgeText: '#6b7280', label: 'UNKNOWN' },
    };

    const ComponentRow = ({ label, st }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, color: '#374151', minWidth: '80px' }}>{label}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: '"Inter", sans-serif', fontSize: '12px' }}>
                <span style={{ color: st?.ok ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{st?.ok ? '✓' : '✗'}</span>
                <span style={{ color: '#6b7280', textAlign: 'right' }}>{st?.message || '…'}</span>
            </span>
        </div>
    );

    return (
        <Modal show={show} onHide={onHide} size="lg" backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title style={{ fontFamily: '"Inter", sans-serif', fontSize: '16px', fontWeight: 700 }}>
                    <i className="bi bi-activity me-2" style={{ color: '#2563eb' }}></i>Server Status
                    <span style={{ fontWeight: 400, fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>(auto-refreshes every 5 s)</span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: '24px' }}>
                {accessDenied ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: '"Inter", sans-serif' }}>
                        <i className="bi bi-lock" style={{ fontSize: '36px', color: '#9ca3af', display: 'block', marginBottom: '12px' }}></i>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Access Denied</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>You don't have permission to view server status. Contact your admin to request access.</div>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
                            {['production', 'test'].map(env => {
                                const srv = serverStatus?.[env];
                                const rawOverall = srv?.overall || 'unknown';
                                const c = palette[rawOverall] || palette.unknown;
                                const isAnimated = ['starting', 'stopping', 'restarting'].includes(rawOverall);
                                return (
                                    <div key={env} style={{ flex: '1 1 260px', padding: '16px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                                                {env === 'production' ? 'Production' : 'Test'}
                                                <span style={{ marginLeft: '6px', fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>
                                                    port {srv?.port || (env === 'production' ? 2000 : 2002)}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: c.badgeBg }}>
                                                <span style={{
                                                    display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: c.dot, flexShrink: 0,
                                                    animation: isAnimated ? 'pulse 1s infinite' : 'none',
                                                }} />
                                                <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: 700, color: c.badgeText, letterSpacing: '0.04em' }}>
                                                    {c.label}
                                                </span>
                                            </div>
                                        </div>
                                        {srv ? (
                                            <div style={{ marginBottom: '10px' }}>
                                                <ComponentRow label="API Service" st={srv.api} />
                                                <ComponentRow label="Redis" st={srv.redis} />
                                                <ComponentRow label="MongoDB" st={srv.mongodb} />
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', fontFamily: '"Inter", sans-serif', padding: '8px 0' }}>Loading…</div>
                                        )}
                                        {srv?.reason && (
                                            <div style={{ fontSize: '11px', color: '#991b1b', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '6px 8px', marginBottom: '10px', fontFamily: '"Inter", sans-serif', lineHeight: 1.5 }}>
                                                ⚠ {srv.reason}
                                            </div>
                                        )}
                                        <div style={{ marginTop: '6px', textAlign: 'right' }}>
                                            <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: '"Inter", sans-serif' }}>
                                                {srv?.updated_at ? new Date(srv.updated_at).toLocaleTimeString() : '—'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Restart History */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 700, color: '#374151' }}>
                                    <i className="bi bi-clock-history me-2" style={{ color: '#6b7280' }}></i>Restart History
                                </span>
                                <button
                                    type="button"
                                    onClick={fetchLog}
                                    style={{ padding: '3px 10px', borderRadius: '5px', border: '1px solid #d1d5db', background: '#fff', color: '#6b7280', fontSize: '11px', fontFamily: '"Inter", sans-serif', cursor: 'pointer' }}
                                >
                                    ↻ Refresh
                                </button>
                            </div>
                            {restartLog.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#9ca3af', fontFamily: '"Inter", sans-serif', padding: '12px 0', textAlign: 'center' }}>
                                    No restarts recorded yet.
                                </div>
                            ) : (
                                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: '"Inter", sans-serif' }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                                <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Time</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Env</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Trigger</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Result</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {restartLog.map((entry, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '6px 10px', color: '#374151', whiteSpace: 'nowrap' }}>{new Date(entry.timestamp).toLocaleString()}</td>
                                                    <td style={{ padding: '6px 10px' }}>
                                                        <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: entry.env === 'production' ? '#dbeafe' : '#f3f4f6', color: entry.env === 'production' ? '#1e40af' : '#374151' }}>
                                                            {entry.env === 'production' ? 'Prod' : 'Test'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '6px 10px' }}>
                                                        <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: entry.trigger === 'auto' ? '#fef9c3' : '#f0fdf4', color: entry.trigger === 'auto' ? '#92400e' : '#15803d' }}>
                                                            {entry.trigger === 'auto' ? '⚡ Auto' : '👤 Manual'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '6px 10px' }}>
                                                        {entry.success ? (
                                                            <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ OK</span>
                                                        ) : (
                                                            <span style={{ color: '#dc2626', fontWeight: 600 }} title={entry.error}>✗ Failed</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <button
                    type="button"
                    onClick={onHide}
                    style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                    Close
                </button>
            </Modal.Footer>
        </Modal>
    );
}
