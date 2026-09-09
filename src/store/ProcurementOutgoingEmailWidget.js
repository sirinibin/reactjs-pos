import React, { useState } from 'react';

const PROVIDERS = [
    {
        value: 'smtp',
        label: 'SMTP (Universal)',
        icon: 'bi-hdd-network',
        iconColor: '#495057',
        pricing: 'Free — works with Gmail, Outlook, Yahoo, or any email server',
        description: 'Send via any SMTP server. Works with Gmail App Passwords, Outlook, cPanel mail, and any custom mail server.',
        setupSteps: [
            'Gmail: Google Account → Security → 2-Step Verification → App Passwords → generate one for "Mail"',
            '   Use smtp.gmail.com  Port: 587  TLS: Yes  Username: your Gmail address  Password: the app password',
            'Outlook / Microsoft 365: smtp.office365.com  Port: 587  TLS: Yes  Username: your Outlook email',
            'Yahoo: smtp.mail.yahoo.com  Port: 465  TLS: Yes — create an App Password in Account Security',
            'cPanel / custom: use the host and port provided by your hosting provider',
        ],
        fields: [
            { key: 'outgoing_email_smtp_host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
            { key: 'outgoing_email_smtp_port', label: 'Port', type: 'number', placeholder: '587' },
            { key: 'outgoing_email_smtp_username', label: 'Username / Email', type: 'text', placeholder: 'you@example.com' },
            { key: 'outgoing_email_smtp_password', label: 'Password / App Password', type: 'password', placeholder: 'your password or app password' },
            { key: 'outgoing_email_smtp_use_tls', label: 'Use STARTTLS / SSL', type: 'checkbox' },
        ],
    },
    {
        value: 'sendgrid',
        label: 'SendGrid (Twilio)',
        icon: 'bi-grid-3x3-gap',
        iconColor: '#1A82E2',
        pricing: 'Free (100 emails/day) · Essentials $19.95/mo (100 K/mo) · Pro $89.95/mo',
        description: 'Reliable transactional email delivery via SendGrid API. No SMTP, no MX records needed.',
        setupSteps: [
            'Sign up at sendgrid.com → Settings → API Keys → Create API Key',
            'Grant "Mail Send" permission',
            'Verify your sender email in Settings → Sender Authentication',
            'Paste the API key below',
        ],
        setupUrl: 'https://app.sendgrid.com/settings/api_keys',
        setupUrlLabel: 'SendGrid → Settings → API Keys',
        fields: [
            { key: 'outgoing_email_sendgrid_api_key', label: 'SendGrid API Key', type: 'password', placeholder: 'SG.xxxxxxxxxxxxxxxxxx' },
        ],
    },
    {
        value: 'mailgun',
        label: 'Mailgun',
        icon: 'bi-mailbox',
        iconColor: '#F06B66',
        pricing: 'Flex $15/mo (5 K emails) · Foundation $35/mo (50 K) · Growth $90/mo (100 K)',
        description: 'Send via Mailgun API. Excellent deliverability for transactional email.',
        setupSteps: [
            'Sign up at mailgun.com → Sending → Domains → Add Domain',
            'Verify your domain by adding DNS records (SPF, DKIM, MX)',
            'Go to API Keys → Create Private API Key',
            'Paste your API Key and Domain below',
        ],
        setupUrl: 'https://app.mailgun.com/mg/sending/domains',
        setupUrlLabel: 'Mailgun → Sending → Domains',
        fields: [
            { key: 'outgoing_email_mailgun_api_key', label: 'Mailgun Private API Key', type: 'password', placeholder: 'key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
            { key: 'outgoing_email_mailgun_domain', label: 'Sending Domain', type: 'text', placeholder: 'mail.yourdomain.com' },
        ],
    },
    {
        value: 'ses',
        label: 'Amazon SES',
        icon: 'bi-cloud-arrow-up',
        iconColor: '#FF9900',
        pricing: '$0.10 per 1,000 emails — cheapest at scale',
        description: 'Send via AWS Simple Email Service. Best cost-per-email at high volume.',
        setupSteps: [
            'In AWS Console → SES → Verified Identities → Create Identity (verify your domain or email)',
            'Add SPF and DKIM DNS records as instructed by SES',
            'Go to IAM → Users → Create User → attach "AmazonSESFullAccess" policy',
            'Create Access Key for the user and paste below',
            'Select the AWS region closest to your servers',
        ],
        setupUrl: 'https://console.aws.amazon.com/ses/home',
        setupUrlLabel: 'AWS Console → SES',
        fields: [
            { key: 'outgoing_email_ses_access_key_id', label: 'AWS Access Key ID', type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
            { key: 'outgoing_email_ses_secret_key', label: 'AWS Secret Access Key', type: 'password', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
            {
                key: 'outgoing_email_ses_region', label: 'AWS Region', type: 'select',
                options: [
                    { value: 'us-east-1', label: 'US East (N. Virginia)' },
                    { value: 'us-west-2', label: 'US West (Oregon)' },
                    { value: 'eu-west-1', label: 'EU (Ireland)' },
                    { value: 'eu-central-1', label: 'EU (Frankfurt)' },
                    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
                    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
                    { value: 'me-south-1', label: 'Middle East (Bahrain)' },
                    { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
                ],
            },
        ],
    },
    {
        value: 'postmark',
        label: 'Postmark',
        icon: 'bi-envelope-check',
        iconColor: '#FFDE00',
        iconBg: '#333',
        pricing: 'First 100 emails/mo free · $15/mo (10 K) · $50/mo (50 K)',
        description: 'Highest inbox placement for transactional email. No shared IP pools.',
        setupSteps: [
            'Sign up at postmarkapp.com → Create a Server',
            'Go to Sender Signatures → Add Sender Signature (verify your from address)',
            'Copy the Server API Token from the server settings',
            'Paste it below',
        ],
        setupUrl: 'https://account.postmarkapp.com/servers',
        setupUrlLabel: 'Postmark → Servers',
        fields: [
            { key: 'outgoing_email_postmark_server_token', label: 'Server API Token', type: 'password', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
        ],
    },
    {
        value: 'brevo',
        label: 'Brevo (Sendinblue)',
        icon: 'bi-send',
        iconColor: '#0B996E',
        pricing: 'Free (300 emails/day) · Starter $25/mo (20 K/mo) · Business $65/mo (20 K/mo)',
        description: 'Send via Brevo (formerly Sendinblue) API. Generous free tier.',
        setupSteps: [
            'Sign up at brevo.com → Account → SMTP & API → API Keys → Generate a new API key',
            'Verify your sender email under Senders & Domains',
            'Paste the API key below',
        ],
        setupUrl: 'https://app.brevo.com/settings/keys/api',
        setupUrlLabel: 'Brevo → SMTP & API → API Keys',
        fields: [
            { key: 'outgoing_email_brevo_api_key', label: 'Brevo API Key', type: 'password', placeholder: 'xkeysib-xxxxxxxxxxxxxxxxxxxx' },
        ],
    },
    {
        value: 'resend',
        label: 'Resend',
        icon: 'bi-arrow-repeat',
        iconColor: '#000',
        pricing: 'Free (3 K emails/mo, 100/day) · Pro $20/mo (50 K/mo) · Scale $90/mo (150 K/mo)',
        description: 'Modern developer-friendly email API. Clean dashboard, excellent deliverability.',
        setupSteps: [
            'Sign up at resend.com → API Keys → Create API Key',
            'Go to Domains → Add Domain and verify it with DNS records',
            'Paste the API key below',
        ],
        setupUrl: 'https://resend.com/api-keys',
        setupUrlLabel: 'Resend → API Keys',
        fields: [
            { key: 'outgoing_email_resend_api_key', label: 'Resend API Key', type: 'password', placeholder: 're_xxxxxxxxxxxxxxxxxxxx' },
        ],
    },
];

export default function ProcurementOutgoingEmailWidget({ storeId, settings, onSettingsChange }) {
    const [creds, setCreds] = useState(() => {
        const s = settings || {};
        return {
            outgoing_email_provider:            s.outgoing_email_provider || '',
            outgoing_email_from_name:           s.outgoing_email_from_name || '',
            outgoing_email_from_address:        s.outgoing_email_from_address || '',
            outgoing_email_smtp_host:           s.outgoing_email_smtp_host || '',
            outgoing_email_smtp_port:           s.outgoing_email_smtp_port || '',
            outgoing_email_smtp_username:       s.outgoing_email_smtp_username || '',
            outgoing_email_smtp_password:       s.outgoing_email_smtp_password || '',
            outgoing_email_smtp_use_tls:        s.outgoing_email_smtp_use_tls !== false,
            outgoing_email_sendgrid_api_key:    s.outgoing_email_sendgrid_api_key || '',
            outgoing_email_mailgun_api_key:     s.outgoing_email_mailgun_api_key || '',
            outgoing_email_mailgun_domain:      s.outgoing_email_mailgun_domain || '',
            outgoing_email_ses_access_key_id:   s.outgoing_email_ses_access_key_id || '',
            outgoing_email_ses_secret_key:      s.outgoing_email_ses_secret_key || '',
            outgoing_email_ses_region:          s.outgoing_email_ses_region || '',
            outgoing_email_postmark_server_token: s.outgoing_email_postmark_server_token || '',
            outgoing_email_brevo_api_key:       s.outgoing_email_brevo_api_key || '',
            outgoing_email_resend_api_key:      s.outgoing_email_resend_api_key || '',
        };
    });

    const [saving, setSaving] = useState(false);
    const [saveOk, setSaveOk] = useState(false);
    const [saveErr, setSaveErr] = useState('');
    const [testTo, setTestTo] = useState('');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null); // { ok, msg }

    const apiBase = process.env.REACT_APP_API_URL || '';

    const selectedProvider = PROVIDERS.find(p => p.value === creds.outgoing_email_provider) || null;

    function handleFieldChange(key, value) {
        const next = { ...creds, [key]: value };
        setCreds(next);
    }

    function handleProviderSelect(pv) {
        const next = { ...creds, outgoing_email_provider: pv };
        setCreds(next);
        setSaveOk(false);
        setSaveErr('');
        setTestResult(null);
    }

    async function handleSave() {
        setSaving(true);
        setSaveOk(false);
        setSaveErr('');
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(`${apiBase}/v1/store/${storeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ settings: creds }),
            });
            if (!resp.ok) {
                const d = await resp.json().catch(() => ({}));
                throw new Error(d.error || `HTTP ${resp.status}`);
            }
            setSaveOk(true);
            if (onSettingsChange) onSettingsChange(creds);
            setTimeout(() => setSaveOk(false), 3000);
        } catch (e) {
            setSaveErr(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleTestEmail() {
        if (!testTo) return;
        setTesting(true);
        setTestResult(null);
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(`${apiBase}/v1/outgoing-email/test?store_id=${storeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ to: testTo }),
            });
            const d = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(d.error || `HTTP ${resp.status}`);
            setTestResult({ ok: true, msg: `Test email sent to ${testTo}` });
        } catch (e) {
            setTestResult({ ok: false, msg: e.message });
        } finally {
            setTesting(false);
        }
    }

    function renderField(f) {
        const val = creds[f.key];
        if (f.type === 'checkbox') {
            return (
                <div key={f.key} className="form-check mb-2">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id={`oe-${f.key}`}
                        checked={!!val}
                        onChange={e => handleFieldChange(f.key, e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor={`oe-${f.key}`} style={{ fontSize: '13px' }}>{f.label}</label>
                </div>
            );
        }
        if (f.type === 'select') {
            return (
                <div key={f.key} className="mb-2">
                    <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: 500 }}>{f.label}</label>
                    <select
                        className="form-select form-select-sm"
                        value={val || ''}
                        onChange={e => handleFieldChange(f.key, e.target.value)}
                    >
                        <option value="">— Select region —</option>
                        {(f.options || []).map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            );
        }
        return (
            <div key={f.key} className="mb-2">
                <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: 500 }}>{f.label}</label>
                <input
                    type={f.type}
                    className="form-control form-control-sm"
                    placeholder={f.placeholder || ''}
                    value={val || ''}
                    onChange={e => handleFieldChange(f.key, e.target.value)}
                    autoComplete="new-password"
                />
            </div>
        );
    }

    return (
        <div>
            {/* Provider selector */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {PROVIDERS.map(p => {
                    const active = creds.outgoing_email_provider === p.value;
                    return (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => handleProviderSelect(p.value)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                                border: active ? `2px solid ${p.iconColor}` : '1px solid #dee2e6',
                                background: active ? (p.iconColor + '15') : '#fff',
                                fontSize: '12px', fontWeight: active ? 600 : 400,
                                color: active ? p.iconColor : '#495057',
                                transition: 'all 0.15s',
                            }}
                        >
                            <i className={`bi ${p.icon}`} style={{ color: p.iconColor, fontSize: '14px' }} />
                            {p.label}
                        </button>
                    );
                })}
            </div>

            {selectedProvider && (
                <div style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                    {/* Provider header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                        <i className={`bi ${selectedProvider.icon}`} style={{ color: selectedProvider.iconColor, fontSize: '20px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{selectedProvider.label}</div>
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>{selectedProvider.description}</div>
                            <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                                <i className="bi bi-tag me-1" />
                                {selectedProvider.pricing}
                            </div>
                            {selectedProvider.setupUrl && (
                                <a href={selectedProvider.setupUrl} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: '11px', color: selectedProvider.iconColor, marginTop: '2px', display: 'inline-block' }}>
                                    <i className="bi bi-box-arrow-up-right me-1" />
                                    {selectedProvider.setupUrlLabel}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Setup instructions */}
                    {selectedProvider.setupSteps && selectedProvider.setupSteps.length > 0 && (
                        <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '10px 12px', marginBottom: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#495057', marginBottom: '6px' }}>
                                <i className="bi bi-info-circle me-1" />
                                How to get your credentials
                            </div>
                            <ol style={{ margin: 0, paddingLeft: '18px' }}>
                                {selectedProvider.setupSteps.map((step, i) => (
                                    <li key={i} style={{ fontSize: '11px', color: '#6c757d', marginBottom: '2px' }}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* From Name + From Email (universal for all providers) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                            <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: 500 }}>From Name</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="e.g. StartPOS Procurement"
                                value={creds.outgoing_email_from_name}
                                onChange={e => handleFieldChange('outgoing_email_from_name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: 500 }}>
                                From Email <span className="text-danger">*</span>
                            </label>
                            <input
                                type="email"
                                className="form-control form-control-sm"
                                placeholder="noreply@yourdomain.com"
                                value={creds.outgoing_email_from_address}
                                onChange={e => handleFieldChange('outgoing_email_from_address', e.target.value)}
                            />
                            <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '2px' }}>
                                Must be a verified sender in your provider account
                            </div>
                        </div>
                    </div>

                    {/* Provider-specific fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: selectedProvider.fields.length > 2 ? '1fr 1fr' : '1fr', gap: '0 14px' }}>
                        {selectedProvider.fields.map(f => renderField(f))}
                    </div>

                    {/* Save button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : 'Save'}
                        </button>
                        {saveOk && <span className="text-success" style={{ fontSize: '13px' }}><i className="bi bi-check-circle me-1" />Saved</span>}
                        {saveErr && <span className="text-danger" style={{ fontSize: '12px' }}>{saveErr}</span>}
                    </div>
                </div>
            )}

            {/* Test email section */}
            {creds.outgoing_email_provider && (
                <div style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px' }}>
                        <i className="bi bi-send-check me-2 text-primary" />
                        Send a Test Email
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: 500 }}>Recipient Email</label>
                            <input
                                type="email"
                                className="form-control form-control-sm"
                                placeholder="test@example.com"
                                value={testTo}
                                onChange={e => { setTestTo(e.target.value); setTestResult(null); }}
                            />
                        </div>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            disabled={!testTo || testing}
                            onClick={handleTestEmail}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            {testing
                                ? <><span className="spinner-border spinner-border-sm me-1" />Sending…</>
                                : <><i className="bi bi-send me-1" />Send Test</>}
                        </button>
                    </div>
                    {testResult && (
                        <div className={`mt-2 alert alert-sm py-1 px-2 ${testResult.ok ? 'alert-success' : 'alert-danger'}`} style={{ fontSize: '12px' }}>
                            <i className={`bi ${testResult.ok ? 'bi-check-circle' : 'bi-x-circle'} me-1`} />
                            {testResult.msg}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
