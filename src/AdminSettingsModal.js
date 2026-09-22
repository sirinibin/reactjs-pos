import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';

const fieldStyle = {
    display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px',
};
const labelStyle = {
    fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#374151',
};
const inputStyle = {
    fontFamily: '"Inter", sans-serif', fontSize: '13px', padding: '8px 10px',
    border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', boxSizing: 'border-box',
    background: '#fff', color: '#111827',
};
const hintStyle = { fontSize: '11px', color: '#6b7280', marginTop: '2px' };

export default function AdminSettingsModal({ show, onHide }) {
    const [settings, setSettings] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState(null);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [migrating, setMigrating] = useState(false);
    const [migrateResult, setMigrateResult] = useState(null);
    const [migrateStoreId, setMigrateStoreId] = useState('');

    useEffect(() => {
        if (!show) return;
        const token = localStorage.getItem('access_token');
        fetch('/v1/admin-settings', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data && data.result) setSettings(data.result); })
            .catch(() => {});
    }, [show]);

    const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        setSaveMsg(null);
        try {
            const token = localStorage.getItem('access_token');
            const resp = await fetch('/v1/admin-settings', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok && data.success) {
                setSaveMsg({ ok: true, msg: 'Settings saved.' });
            } else {
                setSaveMsg({ ok: false, msg: data.error || `HTTP ${resp.status}` });
            }
        } catch (e) {
            setSaveMsg({ ok: false, msg: e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const token = localStorage.getItem('access_token');
            const resp = await fetch('/v1/admin-settings/test-s3', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok && data.success) {
                setTestResult({ ok: true, msg: 'Connection successful! Test file uploaded and deleted.' });
            } else {
                setTestResult({ ok: false, msg: data.error || `HTTP ${resp.status}` });
            }
        } catch (e) {
            setTestResult({ ok: false, msg: e.message });
        } finally {
            setTesting(false);
        }
    };

    const handleMigrate = async () => {
        if (!migrateStoreId.trim()) {
            alert('Enter a Store ID to migrate.');
            return;
        }
        if (!window.confirm(
            'This will upload all existing attachment files for Store ID ' + migrateStoreId.trim() +
            ' to S3 and update their URLs in the database.\n\nOriginal files stay on the server.\n\nProceed?'
        )) return;
        setMigrating(true);
        setMigrateResult(null);
        try {
            const token = localStorage.getItem('access_token');
            const resp = await fetch(`/v1/store/${migrateStoreId.trim()}/migrate-to-s3`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok) {
                setMigrateResult({
                    ok: true,
                    msg: `Done. Uploaded: ${data.uploaded}, Skipped: ${data.skipped}, Messages updated: ${data.updated_messages}`,
                });
            } else {
                setMigrateResult({ ok: false, msg: data.error || `HTTP ${resp.status}` });
            }
        } catch (e) {
            setMigrateResult({ ok: false, msg: e.message });
        } finally {
            setMigrating(false);
        }
    };

    const enabled = !!settings.s3_enabled;

    return (
        <Modal show={show} onHide={onHide} size="lg" backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title style={{ fontFamily: '"Inter", sans-serif', fontSize: '16px', fontWeight: 700 }}>
                    <i className="bi bi-gear-wide-connected me-2"></i>Admin Settings
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: '24px' }}>
                <h6 style={{ fontFamily: '"Inter", sans-serif', fontSize: '14px', fontWeight: 700, color: '#1f2937', marginBottom: '16px' }}>
                    <i className="bi bi-cloud-arrow-up me-2" style={{ color: '#2563eb' }}></i>AWS S3 File Storage
                    <span style={{ fontWeight: 400, fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                        (global — applies to all stores)
                    </span>
                </h6>

                {/* Enable toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '14px 16px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <input
                        type="checkbox"
                        id="admin_s3_enabled"
                        checked={enabled}
                        onChange={e => set('s3_enabled', e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="admin_s3_enabled" style={{ ...labelStyle, cursor: 'pointer', margin: 0, fontSize: '14px' }}>
                        Enable AWS S3 File Storage
                    </label>
                </div>

                {enabled && (
                    <>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.6 }}>
                            When enabled, all new email and WhatsApp attachment files across all stores are saved to your S3 bucket.
                            Existing files remain on the server unless you run the migration below.
                            <br />
                            <strong>Bucket policy:</strong> set public-read access so attachment URLs are directly accessible.
                        </p>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>Bucket Name *</label>
                            <input style={inputStyle} value={settings.s3_bucket_name || ''} onChange={e => set('s3_bucket_name', e.target.value)} placeholder="my-startpos-bucket" />
                        </div>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>Region *</label>
                            <input style={inputStyle} value={settings.s3_region || ''} onChange={e => set('s3_region', e.target.value)} placeholder="us-east-1" />
                            <span style={hintStyle}>AWS region code, e.g. us-east-1, ap-southeast-1, eu-west-1</span>
                        </div>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>Access Key ID *</label>
                            <input style={inputStyle} value={settings.s3_access_key_id || ''} onChange={e => set('s3_access_key_id', e.target.value)} placeholder="AKIAIOSFODNN7EXAMPLE" autoComplete="off" />
                        </div>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>Secret Access Key *</label>
                            <input style={inputStyle} type="password" value={settings.s3_secret_key || ''} onChange={e => set('s3_secret_key', e.target.value)} placeholder="••••••••••••••••••••••••••••••••••••••••" autoComplete="new-password" />
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0 20px' }} />

                        <div style={fieldStyle}>
                            <label style={labelStyle}>Custom Endpoint <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
                            <input style={inputStyle} value={settings.s3_endpoint || ''} onChange={e => set('s3_endpoint', e.target.value)} placeholder="https://sgp1.digitaloceanspaces.com" />
                            <span style={hintStyle}>For S3-compatible services: DigitalOcean Spaces, MinIO, Wasabi, Backblaze B2, etc. Leave blank for AWS S3.</span>
                        </div>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>Public Base URL <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
                            <input style={inputStyle} value={settings.s3_public_base_url || ''} onChange={e => set('s3_public_base_url', e.target.value)} placeholder="https://cdn.example.com" />
                            <span style={hintStyle}>Override the file URL prefix (e.g. CloudFront CDN URL). If blank, files are served directly from S3.</span>
                        </div>

                        {/* Test connection */}
                        <div style={{ margin: '8px 0 24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={handleTest}
                                disabled={testing || !settings.s3_bucket_name || !settings.s3_access_key_id || !settings.s3_secret_key}
                                style={{
                                    padding: '8px 18px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                    background: '#2563eb', color: '#fff', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600,
                                    opacity: (testing || !settings.s3_bucket_name || !settings.s3_access_key_id || !settings.s3_secret_key) ? 0.5 : 1,
                                }}
                            >
                                {testing ? 'Testing…' : 'Test S3 Connection'}
                            </button>
                            {testResult && (
                                <span style={{ fontSize: '13px', color: testResult.ok ? '#15803d' : '#dc2626', fontFamily: '"Inter", sans-serif' }}>
                                    {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
                                </span>
                            )}
                        </div>

                        {/* Migrate existing files */}
                        <div style={{ padding: '16px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px' }}>
                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#713f12', marginBottom: '6px' }}>
                                Migrate existing files to S3
                            </div>
                            <p style={{ fontSize: '12px', color: '#78350f', margin: '0 0 12px', lineHeight: 1.6 }}>
                                Uploads all locally-stored attachment files for a specific store to S3 and updates the links in the database.
                                Run once per store after configuring S3. Original server files are kept.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <input
                                    style={{ ...inputStyle, width: '260px', fontSize: '12px' }}
                                    value={migrateStoreId}
                                    onChange={e => setMigrateStoreId(e.target.value)}
                                    placeholder="Store ID (hex, from Store form URL)"
                                />
                                <button
                                    type="button"
                                    onClick={handleMigrate}
                                    disabled={migrating || !settings.s3_bucket_name || !settings.s3_access_key_id}
                                    style={{
                                        padding: '7px 16px', borderRadius: '6px', border: '1px solid #d97706',
                                        background: '#fff', color: '#92400e', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600,
                                        cursor: 'pointer', opacity: (migrating || !settings.s3_bucket_name || !settings.s3_access_key_id) ? 0.5 : 1,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {migrating ? 'Migrating…' : 'Migrate Existing Files to S3'}
                                </button>
                            </div>
                            {migrateResult && (
                                <div style={{ marginTop: '10px', fontSize: '13px', color: migrateResult.ok ? '#15803d' : '#dc2626', fontFamily: '"Inter", sans-serif' }}>
                                    {migrateResult.ok ? '✓ ' : '✗ '}{migrateResult.msg}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {saveMsg && (
                        <span style={{ fontSize: '13px', color: saveMsg.ok ? '#15803d' : '#dc2626', fontFamily: '"Inter", sans-serif' }}>
                            {saveMsg.ok ? '✓ ' : '✗ '}{saveMsg.msg}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onHide}
                        style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
                    >
                        {saving ? 'Saving…' : 'Save Settings'}
                    </button>
                </div>
            </Modal.Footer>
        </Modal>
    );
}
