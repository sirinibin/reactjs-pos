import React, { useState, useEffect, useRef } from 'react';
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
    const [migrateProgress, setMigrateProgress] = useState(null);
    const [migratingRFQ, setMigratingRFQ] = useState(false);
    const [migrateRFQResult, setMigrateRFQResult] = useState(null);
    const [migrateRFQProgress, setMigrateRFQProgress] = useState(null);
    const [migratingEntity, setMigratingEntity] = useState(false);
    const [migrateEntityResult, setMigrateEntityResult] = useState(null);
    const [migrateEntityProgress, setMigrateEntityProgress] = useState(null);
    const [migratingInline, setMigratingInline] = useState(false);
    const [migrateInlineResult, setMigrateInlineResult] = useState(null);
    const [migrateInlineProgress, setMigrateInlineProgress] = useState(null);
    // Verify & Cleanup Disk
    const [cleanupRunning, setCleanupRunning] = useState(false);
    const [cleanupCurrentEntity, setCleanupCurrentEntity] = useState(null);
    const [cleanupCurrentStore, setCleanupCurrentStore] = useState(null);
    const [cleanupEntityStats, setCleanupEntityStats] = useState({});
    const [cleanupFinalStats, setCleanupFinalStats] = useState(null);
    const [cleanupError, setCleanupError] = useState(null);
    // Fix Direct S3 URLs
    const [fixingS3URLs, setFixingS3URLs] = useState(false);
    const [fixS3URLsProgress, setFixS3URLsProgress] = useState(null);
    const [fixS3URLsResult, setFixS3URLsResult] = useState(null);
    const [fixS3CurrentStore, setFixS3CurrentStore] = useState(null);
    // Abort controllers (one per cancellable operation)
    const migrateAbortRef = useRef(null);
    const rfqAbortRef = useRef(null);
    const entityAbortRef = useRef(null);
    const inlineAbortRef = useRef(null);
    const verifyAbortRef = useRef(null);
    const fixS3AbortRef = useRef(null);

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
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
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
        if (!window.confirm(
            'This will upload all locally-stored attachment files for ALL stores to S3 and update their links in the database.\n\nOriginal files stay on the server.\n\nProceed?'
        )) return;

        setMigrating(true);
        setMigrateResult(null);
        setMigrateProgress(null);
        const migrateController = new AbortController();
        migrateAbortRef.current = migrateController;

        try {
            const token = localStorage.getItem('access_token');
            const resp = await fetch('/v1/migrate-all-stores-to-s3', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                signal: migrateController.signal,
            });

            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                setMigrateResult({ ok: false, msg: data.error || `HTTP ${resp.status}` });
                return;
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });

                const lines = buf.split('\n');
                buf = lines.pop();

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const ev = JSON.parse(line.slice(6));
                        if (ev.type === 'store_start') {
                            setMigrateProgress(prev => ({
                                ...(prev || {}),
                                current_store: ev.store_name || ev.store_id,
                                index: ev.index,
                                total_stores: ev.total_stores,
                                percent: Math.round((ev.index - 1) * 100 / ev.total_stores),
                                store_processed: 0, store_total: 0, store_percent: 0, current_file: '',
                            }));
                        } else if (ev.type === 'store_total') {
                            setMigrateProgress(prev => ({ ...(prev || {}), store_total: ev.total, store_processed: 0, store_percent: 0 }));
                        } else if (ev.type === 'store_progress') {
                            setMigrateProgress(prev => ({
                                ...(prev || {}),
                                store_processed: ev.processed, store_total: ev.total,
                                store_percent: ev.percent, current_file: ev.current_file,
                                uploaded: (prev?.uploaded || 0) - (prev?.store_uploaded || 0) + ev.uploaded,
                                skipped: (prev?.skipped || 0) - (prev?.store_skipped || 0) + ev.skipped,
                                store_uploaded: ev.uploaded, store_skipped: ev.skipped,
                            }));
                        } else if (ev.type === 'store_done') {
                            setMigrateProgress(prev => ({
                                ...(prev || {}),
                                current_store: ev.store_name || ev.store_id,
                                index: ev.index,
                                percent: Math.round(ev.index * 100 / (prev?.total_stores || 1)),
                                store_percent: 100, current_file: '',
                                uploaded: (prev?.uploaded || 0) - (prev?.store_uploaded || 0) + ev.uploaded,
                                skipped: (prev?.skipped || 0) - (prev?.store_skipped || 0) + ev.skipped,
                                store_uploaded: ev.uploaded, store_skipped: ev.skipped,
                            }));
                        } else if (ev.type === 'done') {
                            setMigrateProgress(prev => ({ ...(prev || {}), percent: 100, done: true }));
                            setMigrateResult({
                                ok: true,
                                msg: `Done — ${ev.stores} store(s). Uploaded: ${ev.uploaded}, Skipped: ${ev.skipped}, Messages updated: ${ev.updated_messages}`,
                            });
                        } else if (ev.type === 'error') {
                            setMigrateResult({ ok: false, msg: ev.error });
                        }
                    } catch (_) {}
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') setMigrateResult({ ok: false, msg: e.message });
            else setMigrateResult({ ok: false, msg: 'Cancelled.' });
        } finally {
            migrateAbortRef.current = null;
            setMigrating(false);
        }
    };

    const handleMigrateRFQ = async () => {
        if (!window.confirm(
            'This will decode all base64 attachment data stored inline in RFQ records,\n' +
            'upload them to S3, and replace the inline data with /cdn/ URLs.\n\n' +
            'Original inline data is removed from MongoDB after upload.\n\nProceed?'
        )) return;

        setMigratingRFQ(true);
        setMigrateRFQResult(null);
        setMigrateRFQProgress(null);
        const rfqController = new AbortController();
        rfqAbortRef.current = rfqController;

        try {
            const token = localStorage.getItem('access_token');
            const resp = await fetch('/v1/migrate-rfq-attachments-to-s3', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                signal: rfqController.signal,
            });

            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                setMigrateRFQResult({ ok: false, msg: data.error || `HTTP ${resp.status}` });
                return;
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });

                const lines = buf.split('\n');
                buf = lines.pop();

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const ev = JSON.parse(line.slice(6));
                        if (ev.type === 'start') {
                            setMigrateRFQProgress({ total: ev.total, processed: 0, percent: 0, uploaded: 0, skipped: 0, current_file: '' });
                        } else if (ev.type === 'store_start') {
                            setMigrateRFQProgress(prev => ({
                                ...(prev || {}),
                                current_store: ev.store_name || ev.store_id,
                                index: ev.index, total_stores: ev.total_stores,
                                percent: Math.round((ev.index - 1) * 100 / ev.total_stores),
                                store_processed: 0, store_total: 0, store_percent: 0, current_file: '',
                            }));
                        } else if (ev.type === 'store_total') {
                            setMigrateRFQProgress(prev => ({ ...(prev || {}), store_total: ev.total, store_processed: 0, store_percent: 0 }));
                        } else if (ev.type === 'store_progress') {
                            setMigrateRFQProgress(prev => ({
                                ...(prev || {}),
                                store_processed: ev.processed, store_total: ev.total,
                                store_percent: ev.percent, current_file: ev.current_file,
                                uploaded: (prev?.uploaded || 0) - (prev?.store_uploaded || 0) + ev.uploaded,
                                skipped: (prev?.skipped || 0) - (prev?.store_skipped || 0) + ev.skipped,
                                store_uploaded: ev.uploaded, store_skipped: ev.skipped,
                            }));
                        } else if (ev.type === 'store_done') {
                            setMigrateRFQProgress(prev => ({
                                ...(prev || {}),
                                percent: Math.round(ev.index * 100 / (prev?.total_stores || 1)),
                                store_percent: 100, current_file: '',
                                uploaded: (prev?.uploaded || 0) - (prev?.store_uploaded || 0) + ev.uploaded,
                                skipped: (prev?.skipped || 0) - (prev?.store_skipped || 0) + ev.skipped,
                                store_uploaded: ev.uploaded, store_skipped: ev.skipped,
                            }));
                        } else if (ev.type === 'progress') {
                            setMigrateRFQProgress(prev => ({ ...prev, ...ev }));
                        } else if (ev.type === 'done') {
                            setMigrateRFQProgress(prev => ({ ...prev, percent: 100, done: true }));
                            setMigrateRFQResult({
                                ok: true,
                                msg: `Done. Uploaded: ${ev.uploaded}, Skipped: ${ev.skipped}, RFQs updated: ${ev.updated_rfqs}`,
                            });
                        } else if (ev.type === 'error') {
                            setMigrateRFQResult({ ok: false, msg: ev.error });
                        }
                    } catch (_) {}
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') setMigrateRFQResult({ ok: false, msg: e.message });
            else setMigrateRFQResult({ ok: false, msg: 'Cancelled.' });
        } finally {
            rfqAbortRef.current = null;
            setMigratingRFQ(false);
        }
    };

    const runSSEMigration = async (url, setMigrating, setResult, setProgress, doneMsg, abortRef) => {
        setMigrating(true);
        setResult(null);
        setProgress(null);
        const controller = new AbortController();
        if (abortRef) abortRef.current = controller;
        try {
            const token = localStorage.getItem('access_token');
            const resp = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                setResult({ ok: false, msg: data.error || `HTTP ${resp.status}` });
                return;
            }
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const ev = JSON.parse(line.slice(6));
                        if (ev.type === 'start') {
                            setProgress({ total: ev.total, processed: 0, percent: 0, uploaded: 0, skipped: 0, current_file: '' });
                        } else if (ev.type === 'store_start') {
                            setProgress(prev => ({
                                ...(prev || {}),
                                current_store: ev.store_name || ev.store_id,
                                index: ev.index, total_stores: ev.total_stores,
                                percent: Math.round((ev.index - 1) * 100 / ev.total_stores),
                                store_processed: 0, store_total: 0, store_percent: 0, current_file: '',
                            }));
                        } else if (ev.type === 'store_total') {
                            setProgress(prev => ({ ...(prev || {}), store_total: ev.total, store_processed: 0, store_percent: 0 }));
                        } else if (ev.type === 'store_progress') {
                            setProgress(prev => ({
                                ...(prev || {}),
                                store_processed: ev.processed, store_total: ev.total,
                                store_percent: ev.percent, current_file: ev.current_file,
                                uploaded: (prev?.uploaded || 0) - (prev?.store_uploaded || 0) + ev.uploaded,
                                skipped: (prev?.skipped || 0) - (prev?.store_skipped || 0) + ev.skipped,
                                store_uploaded: ev.uploaded, store_skipped: ev.skipped,
                            }));
                        } else if (ev.type === 'store_done') {
                            setProgress(prev => ({
                                ...(prev || {}),
                                percent: Math.round(ev.index * 100 / (prev?.total_stores || 1)),
                                store_percent: 100, current_file: '',
                                uploaded: (prev?.uploaded || 0) - (prev?.store_uploaded || 0) + ev.uploaded,
                                skipped: (prev?.skipped || 0) - (prev?.store_skipped || 0) + ev.skipped,
                                store_uploaded: ev.uploaded, store_skipped: ev.skipped,
                            }));
                        } else if (ev.type === 'progress') {
                            setProgress(prev => ({ ...prev, ...ev }));
                        } else if (ev.type === 'done') {
                            setProgress(prev => ({ ...(prev || {}), percent: 100, done: true }));
                            setResult({ ok: true, msg: doneMsg(ev) });
                        } else if (ev.type === 'error') {
                            setResult({ ok: false, msg: ev.error });
                        }
                    } catch (_) {}
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') setResult({ ok: false, msg: e.message });
            else setResult({ ok: false, msg: 'Cancelled.' });
        } finally {
            if (abortRef) abortRef.current = null;
            setMigrating(false);
        }
    };

    const handleMigrateEntity = () => {
        if (!window.confirm(
            'This will scan the images/ and zatca/ directories on disk,\n' +
            'upload all files to S3, and update MongoDB records to use /cdn/ URLs.\n\nProceed?'
        )) return;
        runSSEMigration(
            '/v1/migrate-entity-images-to-s3',
            setMigratingEntity, setMigrateEntityResult, setMigrateEntityProgress,
            ev => `Done. Uploaded: ${ev.uploaded}, Skipped: ${ev.skipped}`,
            entityAbortRef
        );
    };

    const handleMigrateInline = () => {
        if (!window.confirm(
            'This will migrate inline base64 image data stored in MongoDB\n' +
            '(expenses, capitals, deposits, withdrawals, etc.) to S3.\n\nProceed?'
        )) return;
        runSSEMigration(
            '/v1/migrate-inline-images-to-s3',
            setMigratingInline, setMigrateInlineResult, setMigrateInlineProgress,
            ev => `Done. Uploaded: ${ev.uploaded}, Updated records: ${ev.updated_docs}`,
            inlineAbortRef
        );
    };

    const handleVerifyCleanup = async () => {
        if (!window.confirm(
            'This will check every image, PDF and XML file against S3.\n' +
            'Files confirmed in S3 will have their local disk copy permanently deleted.\n' +
            'RFQ records whose inline base64 data has been migrated will be cleaned from MongoDB.\n\n' +
            '⚠️ This cannot be undone. Files NOT confirmed in S3 are skipped safely.\n\nProceed?'
        )) return;
        setCleanupRunning(true);
        setCleanupEntityStats({});
        setCleanupFinalStats(null);
        setCleanupCurrentEntity(null);
        setCleanupCurrentStore(null);
        setCleanupError(null);
        const verifyController = new AbortController();
        verifyAbortRef.current = verifyController;
        try {
            const token = localStorage.getItem('access_token');
            const resp = await fetch('/v1/verify-cleanup-disk', {
                method: 'POST', headers: { Authorization: `Bearer ${token}` },
                signal: verifyController.signal,
            });
            if (!resp.ok) {
                const d = await resp.json().catch(() => ({}));
                setCleanupError(d.error || `HTTP ${resp.status}`);
                return;
            }
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const ev = JSON.parse(line.slice(6));
                        if (ev.type === 'entity_start') {
                            setCleanupCurrentEntity(ev.name);
                            setCleanupCurrentStore(null);
                        } else if (ev.type === 'entity_done') {
                            setCleanupCurrentEntity(null);
                            setCleanupCurrentStore(null);
                            setCleanupEntityStats(prev => ({ ...prev, [ev.name]: ev }));
                        } else if (ev.type === 'store_progress') {
                            setCleanupCurrentStore(ev.store_name || ev.store_id);
                        } else if (ev.type === 'done') {
                            setCleanupFinalStats(ev);
                            setCleanupCurrentStore(null);
                        } else if (ev.type === 'error') {
                            setCleanupError(ev.error);
                        }
                    } catch (_) {}
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') setCleanupError(e.message);
            else setCleanupError('Cancelled.');
        } finally {
            verifyAbortRef.current = null;
            setCleanupRunning(false);
            setCleanupCurrentEntity(null);
        }
    };

    const handleFixS3URLs = async () => {
        if (!window.confirm(
            'This will scan all MongoDB records and rewrite any direct S3 URLs\n' +
            '(e.g. https://bucket.s3.region.amazonaws.com/...) to /cdn/ paths.\n\n' +
            'This fixes images that load directly from S3 instead of going through /cdn/.\n\nProceed?'
        )) return;
        setFixingS3URLs(true);
        setFixS3URLsProgress(null);
        setFixS3URLsResult(null);
        setFixS3CurrentStore(null);
        const fixS3Controller = new AbortController();
        fixS3AbortRef.current = fixS3Controller;
        try {
            const token = localStorage.getItem('access_token');
            const resp = await fetch('/v1/fix-direct-s3-urls', {
                method: 'POST', headers: { Authorization: `Bearer ${token}` },
                signal: fixS3Controller.signal,
            });
            if (!resp.ok) {
                const d = await resp.json().catch(() => ({}));
                setFixS3URLsResult({ ok: false, msg: d.error || `HTTP ${resp.status}` });
                return;
            }
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const ev = JSON.parse(line.slice(6));
                        if (ev.type === 'store_progress') {
                            setFixS3CurrentStore(ev.store_name || ev.store_id);
                        } else if (ev.type === 'progress') {
                            setFixS3URLsProgress(ev);
                        } else if (ev.type === 'done') {
                            setFixS3URLsResult({ ok: true, msg: `Done. Scanned: ${ev.scanned}, Fixed: ${ev.fixed}` });
                            setFixS3CurrentStore(null);
                        }
                    } catch (_) {}
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') setFixS3URLsResult({ ok: false, msg: e.message });
            else setFixS3URLsResult({ ok: false, msg: 'Cancelled.' });
        } finally {
            fixS3AbortRef.current = null;
            setFixingS3URLs(false);
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
                            When enabled, all new email and WhatsApp attachment files across all stores are saved to S3.
                            Files are served through <code>/cdn/</code> on whichever domain the user is on —
                            so <strong>startpos.startuptech.uk/cdn/…</strong> and <strong>startpos-test.startuptech.uk/cdn/…</strong> and
                            <strong> workshop.gulfunionozone.com/cdn/…</strong> all work automatically.
                            No extra configuration needed.
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

                        {/* Test connection */}
                        <div style={{ margin: '8px 0 24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div>
                                <button
                                    type="button"
                                    onClick={handleTest}
                                    disabled={testing}
                                    style={{
                                        padding: '8px 18px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                        background: '#2563eb', color: '#fff', fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600,
                                        opacity: testing ? 0.5 : 1,
                                    }}
                                >
                                    {testing ? 'Testing…' : 'Test S3 Connection'}
                                </button>
                                <div style={{ ...hintStyle, marginTop: '4px' }}>Tests with the values currently in the form (no need to save first). If the secret key field is blank, uses the saved secret from the database.</div>
                            </div>
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
                                Uploads all locally-stored attachment files for <strong>all stores</strong> to S3 and updates the links in the database.
                                Run once after configuring S3. Original server files are kept.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                                {migrating && (
                                    <button type="button" onClick={() => migrateAbortRef.current?.abort()} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #dc2626', background: '#fff', color: '#dc2626', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Cancel
                                    </button>
                                )}
                            </div>

                            {migrateProgress && (
                                <div style={{ marginTop: '14px' }}>
                                    {/* Overall progress */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#78350f', fontFamily: '"Inter", sans-serif', marginBottom: '4px' }}>
                                        <span><strong>Overall</strong> — Store {migrateProgress.index || '…'}/{migrateProgress.total_stores || '…'}</span>
                                        <span>{migrateProgress.done ? 'Complete' : `${migrateProgress.percent || 0}%`}</span>
                                    </div>
                                    <div style={{ background: '#fde68a', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
                                        <div style={{
                                            background: migrateProgress.done ? '#16a34a' : '#d97706',
                                            width: `${migrateProgress.percent || 0}%`,
                                            height: '100%', transition: 'width 0.3s ease', borderRadius: '4px',
                                        }} />
                                    </div>

                                    {/* Per-store sub-progress */}
                                    {!migrateProgress.done && migrateProgress.current_store && (
                                        <div style={{ marginTop: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#92400e', fontFamily: '"Inter", sans-serif', marginBottom: '3px' }}>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                                                    {migrateProgress.current_store}
                                                    {migrateProgress.current_file && <span style={{ color: '#b45309', marginLeft: 4 }}>— {migrateProgress.current_file}</span>}
                                                </span>
                                                <span>{migrateProgress.store_processed || 0}/{migrateProgress.store_total || 0}</span>
                                            </div>
                                            <div style={{ background: '#fed7aa', borderRadius: '3px', height: '6px', overflow: 'hidden' }}>
                                                <div style={{
                                                    background: '#f97316',
                                                    width: `${migrateProgress.store_percent || 0}%`,
                                                    height: '100%', transition: 'width 0.15s ease', borderRadius: '3px',
                                                }} />
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: '#78350f', fontFamily: '"Inter", sans-serif' }}>
                                        <span>Uploaded: <strong>{migrateProgress.uploaded || 0}</strong></span>
                                        <span>Skipped: <strong>{migrateProgress.skipped || 0}</strong></span>
                                    </div>
                                </div>
                            )}

                            {migrateResult && (
                                <div style={{ marginTop: '10px', fontSize: '13px', color: migrateResult.ok ? '#15803d' : '#dc2626', fontFamily: '"Inter", sans-serif' }}>
                                    {migrateResult.ok ? '✓ ' : '✗ '}{migrateResult.msg}
                                </div>
                            )}
                        </div>

                        {/* Migrate RFQ attachment inline data to S3 */}
                        <div style={{ marginTop: '16px', padding: '16px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px' }}>
                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#713f12', marginBottom: '6px' }}>
                                Migrate RFQ attachment data to S3
                            </div>
                            <p style={{ fontSize: '12px', color: '#78350f', margin: '0 0 12px', lineHeight: 1.6 }}>
                                Older RFQ records store attachment files as base64 data inline in MongoDB.
                                This migration uploads each attachment to S3 and replaces the inline data with a <code>/cdn/</code> URL.
                                Run once after enabling S3. The inline base64 data is removed from MongoDB after upload.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={handleMigrateRFQ}
                                    disabled={migratingRFQ || !settings.s3_bucket_name || !settings.s3_access_key_id}
                                    style={{
                                        padding: '7px 16px', borderRadius: '6px', border: '1px solid #d97706',
                                        background: '#fff', color: '#92400e', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600,
                                        cursor: 'pointer', opacity: (migratingRFQ || !settings.s3_bucket_name || !settings.s3_access_key_id) ? 0.5 : 1,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {migratingRFQ ? 'Migrating…' : 'Migrate RFQ Attachments to S3'}
                                </button>
                                {migratingRFQ && (
                                    <button type="button" onClick={() => rfqAbortRef.current?.abort()} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #dc2626', background: '#fff', color: '#dc2626', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Cancel
                                    </button>
                                )}
                            </div>

                            {migrateRFQProgress && (
                                <div style={{ marginTop: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#78350f', fontFamily: '"Inter", sans-serif', marginBottom: '4px' }}>
                                        <span><strong>Overall</strong> — Store {migrateRFQProgress.index || '…'}/{migrateRFQProgress.total_stores || '…'}</span>
                                        <span>{migrateRFQProgress.done ? 'Complete' : `${migrateRFQProgress.percent || 0}%`}</span>
                                    </div>
                                    <div style={{ background: '#fde68a', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
                                        <div style={{ background: migrateRFQProgress.done ? '#16a34a' : '#d97706', width: `${migrateRFQProgress.percent || 0}%`, height: '100%', transition: 'width 0.3s ease', borderRadius: '4px' }} />
                                    </div>
                                    {!migrateRFQProgress.done && migrateRFQProgress.current_store && (
                                        <div style={{ marginTop: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#92400e', fontFamily: '"Inter", sans-serif', marginBottom: '3px' }}>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                                                    {migrateRFQProgress.current_store}
                                                    {migrateRFQProgress.current_file && <span style={{ color: '#b45309', marginLeft: 4 }}>— {migrateRFQProgress.current_file}</span>}
                                                </span>
                                                <span>{migrateRFQProgress.store_processed || 0}/{migrateRFQProgress.store_total || 0}</span>
                                            </div>
                                            <div style={{ background: '#fcd34d', borderRadius: '3px', height: '6px', overflow: 'hidden' }}>
                                                <div style={{ background: '#f59e0b', width: `${migrateRFQProgress.store_percent || 0}%`, height: '100%', transition: 'width 0.15s ease', borderRadius: '3px' }} />
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: '#78350f', fontFamily: '"Inter", sans-serif' }}>
                                        <span>Uploaded: <strong>{migrateRFQProgress.uploaded || 0}</strong></span>
                                        <span>Skipped: <strong>{migrateRFQProgress.skipped || 0}</strong></span>
                                    </div>
                                </div>
                            )}

                            {migrateRFQResult && (
                                <div style={{ marginTop: '10px', fontSize: '13px', color: migrateRFQResult.ok ? '#15803d' : '#dc2626', fontFamily: '"Inter", sans-serif' }}>
                                    {migrateRFQResult.ok ? '✓ ' : '✗ '}{migrateRFQResult.msg}
                                </div>
                            )}
                        </div>

                        {/* Migrate entity images (disk → S3) */}
                        <div style={{ marginTop: '16px', padding: '16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px' }}>
                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#14532d', marginBottom: '6px' }}>
                                Migrate Entity Images to S3
                            </div>
                            <p style={{ fontSize: '12px', color: '#166534', margin: '0 0 12px', lineHeight: 1.6 }}>
                                Scans the local <code>images/</code> and <code>zatca/</code> directories, uploads every file to S3,
                                and updates MongoDB records (products, customers, vendors, expenses, etc.) to use <code>/cdn/</code> URLs.
                                Run once after enabling S3.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={handleMigrateEntity}
                                    disabled={migratingEntity || !settings.s3_bucket_name || !settings.s3_access_key_id}
                                    style={{
                                        padding: '7px 16px', borderRadius: '6px', border: '1px solid #16a34a',
                                        background: '#fff', color: '#14532d', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600,
                                        cursor: 'pointer', opacity: (migratingEntity || !settings.s3_bucket_name || !settings.s3_access_key_id) ? 0.5 : 1,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {migratingEntity ? 'Migrating…' : 'Migrate Entity Images to S3'}
                                </button>
                                {migratingEntity && (
                                    <button type="button" onClick={() => entityAbortRef.current?.abort()} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #dc2626', background: '#fff', color: '#dc2626', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                            {migrateEntityProgress && (
                                <div style={{ marginTop: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#166534', fontFamily: '"Inter", sans-serif', marginBottom: '4px' }}>
                                        <span><strong>Overall</strong> — Store {migrateEntityProgress.index || '…'}/{migrateEntityProgress.total_stores || '…'}</span>
                                        <span>{migrateEntityProgress.done ? 'Complete' : `${migrateEntityProgress.percent || 0}%`}</span>
                                    </div>
                                    <div style={{ background: '#bbf7d0', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
                                        <div style={{ background: migrateEntityProgress.done ? '#16a34a' : '#22c55e', width: `${migrateEntityProgress.percent || 0}%`, height: '100%', transition: 'width 0.3s ease', borderRadius: '4px' }} />
                                    </div>
                                    {!migrateEntityProgress.done && migrateEntityProgress.current_store && (
                                        <div style={{ marginTop: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#166534', fontFamily: '"Inter", sans-serif', marginBottom: '3px' }}>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                                                    {migrateEntityProgress.current_store}
                                                    {migrateEntityProgress.current_file && <span style={{ color: '#15803d', marginLeft: 4 }}>— {migrateEntityProgress.current_file}</span>}
                                                </span>
                                                <span>{migrateEntityProgress.store_processed || 0}/{migrateEntityProgress.store_total || 0}</span>
                                            </div>
                                            <div style={{ background: '#86efac', borderRadius: '3px', height: '6px', overflow: 'hidden' }}>
                                                <div style={{ background: '#16a34a', width: `${migrateEntityProgress.store_percent || 0}%`, height: '100%', transition: 'width 0.15s ease', borderRadius: '3px' }} />
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: '#166534', fontFamily: '"Inter", sans-serif' }}>
                                        <span>Uploaded: <strong>{migrateEntityProgress.uploaded || 0}</strong></span>
                                        <span>Skipped: <strong>{migrateEntityProgress.skipped || 0}</strong></span>
                                    </div>
                                </div>
                            )}
                            {migrateEntityResult && (
                                <div style={{ marginTop: '10px', fontSize: '13px', color: migrateEntityResult.ok ? '#15803d' : '#dc2626', fontFamily: '"Inter", sans-serif' }}>
                                    {migrateEntityResult.ok ? '✓ ' : '✗ '}{migrateEntityResult.msg}
                                </div>
                            )}
                        </div>

                        {/* Fix direct S3 URLs */}
                        <div style={{ marginTop: '16px', padding: '16px', background: '#fdf4ff', border: '1px solid #d8b4fe', borderRadius: '8px' }}>
                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#581c87', marginBottom: '6px' }}>
                                Fix Direct S3 URLs → /cdn/ Paths
                            </div>
                            <p style={{ fontSize: '12px', color: '#6b21a8', margin: '0 0 12px', lineHeight: 1.6 }}>
                                Some older records store the full S3 URL (e.g. <code>https://bucket.s3.region.amazonaws.com/…</code>)
                                instead of the <code>/cdn/</code> path. This scan rewrites them so images always load via the
                                app's CDN route. Run once after seeing images load directly from S3.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={handleFixS3URLs}
                                    disabled={fixingS3URLs || !settings.s3_bucket_name || !settings.s3_access_key_id}
                                    style={{
                                        padding: '7px 16px', borderRadius: '6px', border: '1px solid #9333ea',
                                        background: '#fff', color: '#581c87', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600,
                                        cursor: 'pointer', opacity: (fixingS3URLs || !settings.s3_bucket_name || !settings.s3_access_key_id) ? 0.5 : 1,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {fixingS3URLs ? 'Fixing…' : 'Fix Direct S3 URLs'}
                                </button>
                                {fixingS3URLs && (
                                    <button type="button" onClick={() => fixS3AbortRef.current?.abort()} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #dc2626', background: '#fff', color: '#dc2626', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                            {(fixS3CurrentStore || fixS3URLsProgress) && fixingS3URLs && (
                                <div style={{ marginTop: '10px', fontSize: '11px', color: '#6b21a8', fontFamily: '"Inter", sans-serif', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                                    {fixS3CurrentStore && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#9333ea', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                                            Store: <strong>{fixS3CurrentStore}</strong>
                                        </span>
                                    )}
                                    {fixS3URLsProgress && (
                                        <span>Collection: <strong>{fixS3URLsProgress.collection}</strong> — Scanned: <strong>{fixS3URLsProgress.scanned}</strong>, Fixed: <strong>{fixS3URLsProgress.fixed}</strong></span>
                                    )}
                                </div>
                            )}
                            {fixS3URLsProgress && !fixingS3URLs && (
                                <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b21a8', fontFamily: '"Inter", sans-serif' }}>
                                    Collection: <strong>{fixS3URLsProgress.collection}</strong> — Scanned: <strong>{fixS3URLsProgress.scanned}</strong>, Fixed: <strong>{fixS3URLsProgress.fixed}</strong>
                                </div>
                            )}
                            {fixS3URLsResult && (
                                <div style={{ marginTop: '8px', fontSize: '13px', color: fixS3URLsResult.ok ? '#15803d' : '#dc2626', fontFamily: '"Inter", sans-serif' }}>
                                    {fixS3URLsResult.ok ? '✓ ' : '✗ '}{fixS3URLsResult.msg}
                                </div>
                            )}
                        </div>

                        {/* Migrate inline base64 (MongoDB → S3) */}
                        <div style={{ marginTop: '16px', padding: '16px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px' }}>
                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#1e3a8a', marginBottom: '6px' }}>
                                Migrate Inline Base64 Images to S3
                            </div>
                            <p style={{ fontSize: '12px', color: '#1d4ed8', margin: '0 0 12px', lineHeight: 1.6 }}>
                                Some older records (expenses, capital investments, drawings, receivables, payables) store images
                                as inline base64 data inside MongoDB. This migration uploads each image to S3 and replaces
                                the inline data with a <code>/cdn/</code> URL.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={handleMigrateInline}
                                    disabled={migratingInline || !settings.s3_bucket_name || !settings.s3_access_key_id}
                                    style={{
                                        padding: '7px 16px', borderRadius: '6px', border: '1px solid #3b82f6',
                                        background: '#fff', color: '#1e3a8a', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600,
                                        cursor: 'pointer', opacity: (migratingInline || !settings.s3_bucket_name || !settings.s3_access_key_id) ? 0.5 : 1,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {migratingInline ? 'Migrating…' : 'Migrate Inline Images to S3'}
                                </button>
                                {migratingInline && (
                                    <button type="button" onClick={() => inlineAbortRef.current?.abort()} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #dc2626', background: '#fff', color: '#dc2626', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                            {migrateInlineProgress && (
                                <div style={{ marginTop: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#1d4ed8', fontFamily: '"Inter", sans-serif', marginBottom: '4px' }}>
                                        <span><strong>Overall</strong> — Store {migrateInlineProgress.index || '…'}/{migrateInlineProgress.total_stores || '…'}</span>
                                        <span>{migrateInlineProgress.done ? 'Complete' : `${migrateInlineProgress.percent || 0}%`}</span>
                                    </div>
                                    <div style={{ background: '#bfdbfe', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
                                        <div style={{ background: migrateInlineProgress.done ? '#16a34a' : '#3b82f6', width: `${migrateInlineProgress.percent || 0}%`, height: '100%', transition: 'width 0.3s ease', borderRadius: '4px' }} />
                                    </div>
                                    {!migrateInlineProgress.done && migrateInlineProgress.current_store && (
                                        <div style={{ marginTop: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#1e40af', fontFamily: '"Inter", sans-serif', marginBottom: '3px' }}>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                                                    {migrateInlineProgress.current_store}
                                                    {migrateInlineProgress.current_file && <span style={{ color: '#1d4ed8', marginLeft: 4 }}>— {migrateInlineProgress.current_file}</span>}
                                                </span>
                                                <span>{migrateInlineProgress.store_processed || 0}/{migrateInlineProgress.store_total || 0}</span>
                                            </div>
                                            <div style={{ background: '#93c5fd', borderRadius: '3px', height: '6px', overflow: 'hidden' }}>
                                                <div style={{ background: '#2563eb', width: `${migrateInlineProgress.store_percent || 0}%`, height: '100%', transition: 'width 0.15s ease', borderRadius: '3px' }} />
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: '#1d4ed8', fontFamily: '"Inter", sans-serif' }}>
                                        <span>Uploaded: <strong>{migrateInlineProgress.uploaded || 0}</strong></span>
                                        <span>Skipped: <strong>{migrateInlineProgress.skipped || 0}</strong></span>
                                    </div>
                                </div>
                            )}
                            {migrateInlineResult && (
                                <div style={{ marginTop: '10px', fontSize: '13px', color: migrateInlineResult.ok ? '#15803d' : '#dc2626', fontFamily: '"Inter", sans-serif' }}>
                                    {migrateInlineResult.ok ? '✓ ' : '✗ '}{migrateInlineResult.msg}
                                </div>
                            )}
                        </div>
                        {/* Verify & Cleanup Disk */}
                        <div style={{ marginTop: '16px', padding: '16px', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px' }}>
                            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '13px', fontWeight: 600, color: '#7c2d12', marginBottom: '6px' }}>
                                Verify S3 &amp; Delete Local Disk Copies
                            </div>
                            <p style={{ fontSize: '12px', color: '#9a3412', margin: '0 0 12px', lineHeight: 1.6 }}>
                                Checks every attachment/image against S3. Files confirmed in S3 have their local disk copy
                                permanently deleted to free disk space. Files not yet in S3 are skipped safely.
                                RFQ inline MongoDB data is removed once the corresponding S3 file is confirmed.
                                <br /><strong>Run after all migrations above are complete.</strong>
                            </p>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={handleVerifyCleanup}
                                    disabled={cleanupRunning || !settings.s3_bucket_name || !settings.s3_access_key_id}
                                    style={{
                                        padding: '7px 16px', borderRadius: '6px', border: '1px solid #ea580c',
                                        background: '#fff', color: '#7c2d12', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600,
                                        cursor: 'pointer', opacity: (cleanupRunning || !settings.s3_bucket_name || !settings.s3_access_key_id) ? 0.5 : 1,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {cleanupRunning ? 'Verifying & Cleaning…' : 'Verify S3 & Delete Disk Copies'}
                                </button>
                                {cleanupRunning && (
                                    <button type="button" onClick={() => verifyAbortRef.current?.abort()} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #dc2626', background: '#fff', color: '#dc2626', fontFamily: '"Inter", sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Cancel
                                    </button>
                                )}
                            </div>

                            {cleanupError && (
                                <div style={{ marginTop: '10px', fontSize: '13px', color: '#dc2626', fontFamily: '"Inter", sans-serif' }}>
                                    ✗ {cleanupError}
                                </div>
                            )}

                            {(cleanupRunning || Object.keys(cleanupEntityStats).length > 0) && (
                                <div style={{ marginTop: '14px', overflowX: 'auto' }}>
                                    {cleanupCurrentStore && cleanupRunning && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '11px', color: '#9a3412', fontFamily: '"Inter", sans-serif' }}>
                                            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ea580c', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                                            Store: <strong>{cleanupCurrentStore}</strong>
                                        </div>
                                    )}
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: '"Inter", sans-serif' }}>
                                        <thead>
                                            <tr style={{ background: '#ffedd5' }}>
                                                <th style={{ textAlign: 'left', padding: '5px 8px', borderBottom: '1px solid #fdba74', color: '#7c2d12' }}>Entity</th>
                                                <th style={{ textAlign: 'right', padding: '5px 8px', borderBottom: '1px solid #fdba74', color: '#7c2d12' }}>Checked</th>
                                                <th style={{ textAlign: 'right', padding: '5px 8px', borderBottom: '1px solid #fdba74', color: '#059669' }}>In S3 ✓</th>
                                                <th style={{ textAlign: 'right', padding: '5px 8px', borderBottom: '1px solid #fdba74', color: '#2563eb' }}>Disk Deleted</th>
                                                <th style={{ textAlign: 'right', padding: '5px 8px', borderBottom: '1px solid #fdba74', color: '#dc2626' }}>Not in S3</th>
                                                <th style={{ textAlign: 'right', padding: '5px 8px', borderBottom: '1px solid #fdba74', color: '#7c3aed' }}>DB Cleaned</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                'Product Photos', 'Customer Photos', 'Vendor Photos',
                                                'Receivable Attachments', 'Payable Attachments', 'Expense Attachments',
                                                'Capital Investment Attachments', 'Drawing Attachments',
                                                'ZATCA Sales XMLs', 'ZATCA Sales Return XMLs',
                                                'ZATCA Receivable XMLs', 'ZATCA Payable XMLs',
                                                'WhatsApp Attachments', 'Email Attachments',
                                                'RFQ Attachments', 'Store Attachments',
                                            ].map(name => {
                                                const st = cleanupEntityStats[name];
                                                const isCurrent = cleanupCurrentEntity === name;
                                                return (
                                                    <tr key={name} style={{ background: isCurrent ? '#fff7ed' : 'transparent', borderBottom: '1px solid #fde8d2' }}>
                                                        <td style={{ padding: '4px 8px', color: '#7c2d12', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {isCurrent && <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ea580c', animation: 'pulse 1s infinite' }} />}
                                                            {!isCurrent && st && <span style={{ color: '#059669', fontSize: '10px' }}>✓</span>}
                                                            {name}
                                                        </td>
                                                        <td style={{ textAlign: 'right', padding: '4px 8px', color: '#374151' }}>{st ? st.checked : (isCurrent ? '…' : '—')}</td>
                                                        <td style={{ textAlign: 'right', padding: '4px 8px', color: '#059669', fontWeight: st && st.verified > 0 ? 700 : 400 }}>{st ? st.verified : (isCurrent ? '…' : '—')}</td>
                                                        <td style={{ textAlign: 'right', padding: '4px 8px', color: '#2563eb', fontWeight: st && st.deleted > 0 ? 700 : 400 }}>{st ? st.deleted : (isCurrent ? '…' : '—')}</td>
                                                        <td style={{ textAlign: 'right', padding: '4px 8px', color: st && st.not_in_s3 > 0 ? '#dc2626' : '#6b7280' }}>{st ? st.not_in_s3 : (isCurrent ? '…' : '—')}</td>
                                                        <td style={{ textAlign: 'right', padding: '4px 8px', color: '#7c3aed', fontWeight: st && st.mongo_cleaned > 0 ? 700 : 400 }}>{st ? st.mongo_cleaned : (isCurrent ? '…' : '—')}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {cleanupFinalStats && (
                                            <tfoot>
                                                <tr style={{ background: '#ffedd5', fontWeight: 700 }}>
                                                    <td style={{ padding: '5px 8px', color: '#7c2d12', fontSize: '11px' }}>Total</td>
                                                    <td style={{ textAlign: 'right', padding: '5px 8px', color: '#374151' }}>{cleanupFinalStats.total_checked}</td>
                                                    <td style={{ textAlign: 'right', padding: '5px 8px', color: '#059669' }}>{cleanupFinalStats.total_verified}</td>
                                                    <td style={{ textAlign: 'right', padding: '5px 8px', color: '#2563eb' }}>{cleanupFinalStats.total_deleted}</td>
                                                    <td style={{ textAlign: 'right', padding: '5px 8px', color: '#dc2626' }}>{cleanupFinalStats.total_not_in_s3}</td>
                                                    <td style={{ textAlign: 'right', padding: '5px 8px', color: '#7c3aed' }}>{cleanupFinalStats.total_mongo_cleaned}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                    <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
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
