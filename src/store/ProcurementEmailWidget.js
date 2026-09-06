import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner, Badge, Alert } from 'react-bootstrap';

const POLL_MS = 3000;

const PROVIDERS = [
    {
        value: 'gmail',
        label: 'Gmail / Google Workspace',
        icon: 'bi-google',
        iconColor: '#EA4335',
        type: 'oauth',
        pricing: 'Free (personal Gmail) · Google Workspace from $6 /user/mo',
        description: 'Connect via Google OAuth2. Reads Inbox & Spam using Gmail API v1.',
        setupUrl: 'https://console.cloud.google.com/apis/credentials',
        setupUrlLabel: 'Google Cloud Console → Credentials',
        setupSteps: (cb) => [
            'Go to Google Cloud Console → APIs & Services → Credentials',
            'Create an OAuth 2.0 Client ID (Web application)',
            'Add Authorized redirect URI: ' + cb,
            'Enable the Gmail API in your project',
            'Paste the Client ID and Client Secret below',
        ],
        fields: [
            { key: 'rfq_gmail_client_id', label: 'Client ID', type: 'text', placeholder: '123456789-abc.apps.googleusercontent.com' },
            { key: 'rfq_gmail_client_secret', label: 'Client Secret', type: 'password', placeholder: 'GOCSPX-…' },
        ],
    },
    {
        value: 'outlook',
        label: 'Microsoft Outlook / Office 365',
        icon: 'bi-microsoft',
        iconColor: '#0078D4',
        type: 'oauth',
        pricing: 'Free (Outlook.com) · Microsoft 365 Business Basic from $6 /user/mo',
        description: 'Connect via Microsoft Graph API OAuth2. Reads Inbox & Junk Email.',
        setupUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
        setupUrlLabel: 'Azure Portal → App registrations',
        setupSteps: (cb) => [
            'Go to Azure Portal → Azure Active Directory → App registrations',
            'New registration → Web platform → set Redirect URI: ' + cb,
            'Add API permissions: Mail.Read, User.Read, offline_access',
            'Create a Client Secret under "Certificates & secrets"',
            'Copy Tenant ID (or use "common"), Client ID, and Client Secret below',
        ],
        fields: [
            { key: 'rfq_outlook_tenant_id', label: 'Tenant ID (or "common")', type: 'text', placeholder: 'common' },
            { key: 'rfq_outlook_client_id', label: 'Client (Application) ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
            { key: 'rfq_outlook_client_secret', label: 'Client Secret Value', type: 'password', placeholder: 'your-secret-value' },
        ],
    },
    {
        value: 'zoho',
        label: 'Zoho Mail',
        icon: 'bi-envelope-at',
        iconColor: '#E42527',
        type: 'oauth',
        pricing: 'Free (up to 5 users, 5 GB/user) · Mail Lite $1/user/mo · Mail Premium $4/user/mo',
        description: 'Connect via Zoho Mail API OAuth2. Reads Inbox & Spam folders.',
        setupUrl: 'https://api-console.zoho.com/',
        setupUrlLabel: 'Zoho API Console',
        setupSteps: (cb) => [
            'Go to api-console.zoho.com → Add Client → Server-based Applications',
            'Set Authorized Redirect URI: ' + cb,
            'Set Scope: ZohoMail.messages.READ, ZohoMail.folders.READ, ZohoMail.accounts.READ',
            'Copy Client ID and Client Secret below',
        ],
        fields: [
            { key: 'rfq_zoho_client_id', label: 'Client ID', type: 'text', placeholder: '1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' },
            { key: 'rfq_zoho_client_secret', label: 'Client Secret', type: 'password', placeholder: 'your-client-secret' },
        ],
    },
    {
        value: 'mailgun',
        label: 'Mailgun',
        icon: 'bi-mailbox',
        iconColor: '#F06B66',
        type: 'webhook',
        pricing: 'Flex $15/mo (5 K emails) · Foundation $35/mo (50 K) · Growth $90/mo (100 K)',
        description: 'Mailgun Inbound Routes forward emails to this platform via webhook. Requires a custom domain with Mailgun MX records.',
        setupUrl: 'https://app.mailgun.com/mg/receiving',
        setupUrlLabel: 'Mailgun → Receiving',
        setupSteps: () => [
            'Log in to Mailgun → Receiving → Create Route',
            'Filter expression: match_recipient(".*@yourdomain.com")',
            'Action: forward to the Webhook URL shown after connecting',
            'Enter your API Key and Domain below, then click Connect',
        ],
        fields: [
            { key: 'rfq_mailgun_api_key', label: 'Mailgun API Key', type: 'password', placeholder: 'key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
            { key: 'rfq_mailgun_domain', label: 'Domain', type: 'text', placeholder: 'mail.yourdomain.com' },
        ],
    },
    {
        value: 'sendgrid',
        label: 'SendGrid (Twilio)',
        icon: 'bi-grid-3x3-gap',
        iconColor: '#1A82E2',
        type: 'webhook',
        pricing: 'Free (100 emails/day) · Essentials $19.95/mo (100 K/mo) · Pro $89.95/mo (300 K/mo)',
        description: 'SendGrid Inbound Parse forwards received emails to this platform. Requires MX records pointing to mx.sendgrid.net.',
        setupUrl: 'https://app.sendgrid.com/settings/parse',
        setupUrlLabel: 'SendGrid → Settings → Inbound Parse',
        setupSteps: () => [
            'Log in to SendGrid → Settings → Inbound Parse → Add Host & URL',
            'Set Hostname to your subdomain (e.g. parse.yourdomain.com)',
            'Paste the Webhook URL shown after connecting',
            'Add DNS MX record: parse.yourdomain.com → mx.sendgrid.net',
            'Enter your API Key below, then click Connect',
        ],
        fields: [
            { key: 'rfq_sendgrid_api_key', label: 'SendGrid API Key', type: 'password', placeholder: 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
        ],
    },
    {
        value: 'postmark',
        label: 'Postmark',
        icon: 'bi-envelope-check',
        iconColor: '#FFDE00',
        type: 'webhook',
        pricing: 'First 100 emails/mo free · $15/mo (10 K) · $50/mo (50 K) · $125/mo (150 K)',
        description: 'Postmark Inbound Processing routes emails to this platform via webhook. No MX record needed if using the Postmark address.',
        setupUrl: 'https://account.postmarkapp.com/servers',
        setupUrlLabel: 'Postmark → Servers',
        setupSteps: () => [
            'Log in to Postmark → Servers → Create or select a server',
            'Go to Settings → Inbound → paste the Webhook URL shown after connecting',
            'Use the @inbound.postmarkapp.com address, or set MX records for your domain',
            'Enter your Server API Token below, then click Connect',
        ],
        fields: [
            { key: 'rfq_postmark_server_token', label: 'Server API Token', type: 'password', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
        ],
    },
    {
        value: 'ses',
        label: 'Amazon SES',
        icon: 'bi-cloud-arrow-down',
        iconColor: '#FF9900',
        type: 'webhook_complex',
        pricing: '$0.10 per 1,000 received emails + S3 storage (~$0.023/GB)',
        description: 'Amazon SES Email Receiving stores emails in S3 and notifies this platform via SNS webhook. Best for very high volume at lowest cost.',
        setupUrl: 'https://console.aws.amazon.com/ses/home#/email-receiving',
        setupUrlLabel: 'AWS Console → SES → Email Receiving',
        setupSteps: () => [
            'In AWS Console → SES → Email Receiving → Rule Sets → Create Rule Set',
            'Add a Receipt Rule: Action = SNS → set endpoint to the Webhook URL shown after connecting',
            'Verify your domain in SES and configure MX record',
            'Create an IAM user with AmazonSESReceivingAccess and add credentials below',
        ],
        fields: [
            { key: 'rfq_aws_ses_access_key_id', label: 'AWS Access Key ID', type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
            { key: 'rfq_aws_ses_secret_key', label: 'AWS Secret Access Key', type: 'password', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
            {
                key: 'rfq_aws_ses_region', label: 'AWS Region', type: 'select',
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
                placeholder: '— Select region —',
            },
        ],
    },
    {
        value: 'imap',
        label: 'IMAP (Any Email Server)',
        icon: 'bi-envelope-fill',
        iconColor: '#6c757d',
        type: 'imap',
        pricing: 'Free — works with Gmail, Outlook, Yahoo, or any existing email account',
        description: 'Connect directly via IMAP. The platform polls Inbox and Junk/Spam folders every few minutes for new emails.',
        setupUrl: null,
        setupSteps: () => [
            'Gmail: enable App Passwords under Google Account → Security (requires 2FA) — use app password here',
            'Outlook: enable IMAP in Outlook Settings → Mail → Sync → POP and IMAP',
            'Yahoo: create an App Password in Account Security settings',
            'Gmail IMAP: imap.gmail.com  Port: 993  SSL: Yes',
            'Outlook IMAP: outlook.office365.com  Port: 993  SSL: Yes',
            'Yahoo IMAP: imap.mail.yahoo.com  Port: 993  SSL: Yes',
        ],
        fields: [
            { key: 'rfq_imap_host', label: 'IMAP Host', type: 'text', placeholder: 'imap.gmail.com' },
            { key: 'rfq_imap_port', label: 'Port', type: 'number', placeholder: '993' },
            { key: 'rfq_imap_username', label: 'Email / Username', type: 'text', placeholder: 'you@example.com' },
            { key: 'rfq_imap_password', label: 'Password / App Password', type: 'password', placeholder: 'your password or app password' },
            { key: 'rfq_imap_use_ssl', label: 'Use SSL/TLS', type: 'checkbox' },
        ],
    },
];

const OAUTH_TYPES = new Set(['oauth']);
const WEBHOOK_TYPES = new Set(['webhook', 'webhook_complex']);

function ProcurementEmailWidget({ storeId, settings, onSettingsChange }) {
    const { t } = useTranslation('common');

    // Local credential state — mirrors settings fields, editable before saving
    const initCreds = useCallback(() => {
        const s = settings || {};
        return {
            rfq_gmail_client_id: s.rfq_gmail_client_id || '',
            rfq_gmail_client_secret: '',
            rfq_outlook_tenant_id: s.rfq_outlook_tenant_id || '',
            rfq_outlook_client_id: s.rfq_outlook_client_id || '',
            rfq_outlook_client_secret: '',
            rfq_zoho_client_id: s.rfq_zoho_client_id || '',
            rfq_zoho_client_secret: '',
            rfq_mailgun_api_key: '',
            rfq_mailgun_domain: s.rfq_mailgun_domain || '',
            rfq_sendgrid_api_key: '',
            rfq_postmark_server_token: '',
            rfq_aws_ses_access_key_id: s.rfq_aws_ses_access_key_id || '',
            rfq_aws_ses_secret_key: '',
            rfq_aws_ses_region: s.rfq_aws_ses_region || '',
            rfq_imap_host: s.rfq_imap_host || '',
            rfq_imap_port: s.rfq_imap_port || 993,
            rfq_imap_username: s.rfq_imap_username || '',
            rfq_imap_password: '',
            rfq_imap_use_ssl: s.rfq_imap_use_ssl !== false,
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [provider, setProvider] = useState(settings?.rfq_email_provider || '');
    const [creds, setCreds] = useState(initCreds);
    const [phase, setPhase] = useState('idle'); // idle | checking | connecting | oauth_wait | connected | error
    const [errorMsg, setErrorMsg] = useState('');
    const [connectedEmail, setConnectedEmail] = useState(settings?.rfq_email_address || '');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [showInstructions, setShowInstructions] = useState(false);
    const pollRef = useRef(null);

    const stopPolling = useCallback(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }, []);
    useEffect(() => () => stopPolling(), [stopPolling]);

    // On mount: check existing status
    useEffect(() => {
        if (!storeId) return;
        if (settings?.rfq_email_connected) {
            setPhase('connected');
            setConnectedEmail(settings.rfq_email_address || '');
            setProvider(settings.rfq_email_provider || '');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    // Listen for OAuth popup postMessage
    useEffect(() => {
        function onMessage(e) {
            if (!e.data || e.data.rfqEmailOAuth !== 'done') return;
            stopPolling();
            pollStatus();
        }
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    const pollStatus = useCallback(() => {
        stopPolling();
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/v1/rfq-email/status?store_id=${storeId}`, {
                    headers: { Authorization: localStorage.getItem('access_token') },
                });
                const data = await res.json();
                if (data.connected) {
                    stopPolling();
                    setPhase('connected');
                    setConnectedEmail(data.email || '');
                    if (onSettingsChange) {
                        onSettingsChange({ rfq_email_connected: true, rfq_email_address: data.email, rfq_email_provider: data.provider });
                    }
                }
            } catch (e) { /* ignore */ }
        }, POLL_MS);
    }, [storeId, stopPolling, onSettingsChange]);

    const selectedProvider = PROVIDERS.find(p => p.value === provider);
    const apiBase = process.env.REACT_APP_API_URL || '';
    const callbackURL = apiBase + '/v1/rfq-email/oauth-callback';

    const handleConnect = useCallback(async () => {
        if (!storeId || !provider) return;
        setPhase('connecting');
        setErrorMsg('');
        setWebhookUrl('');

        try {
            const body = { store_id: storeId, provider, ...creds };
            const res = await fetch('/v1/rfq-email/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('access_token'),
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok || data.error) {
                setPhase('error');
                setErrorMsg(data.error || 'Connection failed');
                return;
            }

            if (data.oauth_url) {
                // OAuth flow: open popup, then poll
                window.open(data.oauth_url, 'rfq_email_oauth', 'width=700,height=600,noopener');
                setPhase('oauth_wait');
                pollStatus();
                return;
            }

            if (data.webhook_url) {
                setWebhookUrl(data.webhook_url);
            }

            if (data.connected) {
                setPhase('connected');
                setConnectedEmail(data.email || '');
                if (onSettingsChange) {
                    onSettingsChange({ rfq_email_connected: true, rfq_email_address: data.email, rfq_email_provider: provider });
                }
            }
        } catch (e) {
            setPhase('error');
            setErrorMsg('Cannot reach server: ' + e.message);
        }
    }, [storeId, provider, creds, pollStatus, onSettingsChange]);

    const handleDisconnect = useCallback(async () => {
        stopPolling();
        try {
            const res = await fetch(`/v1/rfq-email/disconnect?store_id=${storeId}`, {
                method: 'DELETE',
                headers: { Authorization: localStorage.getItem('access_token') },
            });
            const data = await res.json();
            if (data.success) {
                setPhase('idle');
                setConnectedEmail('');
                setWebhookUrl('');
                setProvider('');
                setCreds(initCreds());
                if (onSettingsChange) {
                    onSettingsChange({ rfq_email_connected: false, rfq_email_address: '', rfq_email_provider: '' });
                }
            }
        } catch (e) {
            setErrorMsg('Disconnect failed: ' + e.message);
        }
    }, [storeId, stopPolling, initCreds, onSettingsChange]);

    const setCred = (key, value) => setCreds(prev => ({ ...prev, [key]: value }));

    const canConnect = () => {
        if (!provider) return false;
        const p = PROVIDERS.find(x => x.value === provider);
        if (!p) return false;
        for (const f of p.fields) {
            if (f.type === 'checkbox') continue;
            if (!creds[f.key] && f.type !== 'select') return false;
            if (f.type === 'select' && !creds[f.key]) return false;
        }
        return true;
    };

    const statusBadge = () => {
        if (phase === 'connected') return <Badge bg="success" className="ms-2"><i className="bi bi-check-circle me-1"></i>{t('Connected')} {connectedEmail && `(${connectedEmail})`}</Badge>;
        if (phase === 'checking') return <Badge bg="secondary" className="ms-2">{t('Checking…')}</Badge>;
        if (phase === 'connecting') return <Badge bg="warning" text="dark" className="ms-2">{t('Connecting…')}</Badge>;
        if (phase === 'oauth_wait') return <Badge bg="info" className="ms-2">{t('Waiting for authorization…')}</Badge>;
        return <Badge bg="secondary" className="ms-2">{t('Not Connected')}</Badge>;
    };

    const connected = phase === 'connected';
    const busy = phase === 'connecting' || phase === 'oauth_wait' || phase === 'checking';
    const isOAuth = selectedProvider && OAUTH_TYPES.has(selectedProvider.type);
    const isWebhook = selectedProvider && WEBHOOK_TYPES.has(selectedProvider.type);

    return (
        <div style={{
            border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px',
            background: connected ? '#f0faf3' : '#f8f9fa',
        }}>
            {/* Header row */}
            <div className="d-flex align-items-center mb-3" style={{ gap: '8px' }}>
                <i className="bi bi-envelope-at text-primary" style={{ fontSize: '1.25rem' }}></i>
                <strong>{t('Email Source')}</strong>
                {statusBadge()}
            </div>

            {!connected && (
                <>
                    {/* Provider selector */}
                    <div className="mb-3">
                        <label className="form-label" style={{ fontSize: '13px', fontWeight: 500 }}>
                            {t('Email Service Provider')}
                        </label>
                        <select
                            className="form-select form-select-sm"
                            value={provider}
                            onChange={e => { setProvider(e.target.value); setErrorMsg(''); setWebhookUrl(''); }}
                            disabled={busy}
                            style={{ maxWidth: '420px' }}
                        >
                            <option value="">{t('— Select provider —')}</option>
                            {PROVIDERS.map(p => (
                                <option key={p.value} value={p.value}>
                                    {p.label}  ·  {p.pricing}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Provider description + link */}
                    {selectedProvider && (
                        <div className="mb-3 p-3" style={{ background: '#fff', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                            <div className="d-flex align-items-center mb-2" style={{ gap: '8px' }}>
                                <i className={`bi ${selectedProvider.icon}`} style={{ color: selectedProvider.iconColor, fontSize: '1.1rem' }}></i>
                                <strong style={{ fontSize: '14px' }}>{selectedProvider.label}</strong>
                                <span className="badge" style={{ background: '#f0f4ff', color: '#0052cc', fontSize: '11px' }}>
                                    {selectedProvider.pricing}
                                </span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>{t(selectedProvider.description)}</p>

                            {/* Setup instructions toggle */}
                            <button
                                className="btn btn-link btn-sm p-0"
                                style={{ fontSize: '12px' }}
                                onClick={() => setShowInstructions(v => !v)}
                            >
                                <i className={`bi bi-chevron-${showInstructions ? 'up' : 'down'} me-1`}></i>
                                {showInstructions ? t('Hide setup instructions') : t('Show setup instructions')}
                            </button>
                            {selectedProvider.setupUrl && (
                                <a
                                    href={selectedProvider.setupUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ms-3 btn btn-link btn-sm p-0"
                                    style={{ fontSize: '12px' }}
                                >
                                    <i className="bi bi-box-arrow-up-right me-1"></i>
                                    {selectedProvider.setupUrlLabel}
                                </a>
                            )}

                            {showInstructions && (
                                <ol className="mt-2 mb-0" style={{ fontSize: '12px', color: '#495057', paddingLeft: '18px' }}>
                                    {selectedProvider.setupSteps(callbackURL).map((step, i) => (
                                        <li key={i} style={{ marginBottom: '4px' }}>{step}</li>
                                    ))}
                                </ol>
                            )}

                            {/* OAuth redirect URI (always visible for OAuth providers) */}
                            {isOAuth && (
                                <div className="mt-2 p-2" style={{ background: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                                    <span style={{ fontSize: '11px', color: '#6c757d', fontWeight: 600 }}>{t('Redirect URI to add in your provider:')}</span>
                                    <div className="d-flex align-items-center gap-2 mt-1">
                                        <code style={{ fontSize: '11px', wordBreak: 'break-all', flex: 1 }}>{callbackURL}</code>
                                        <button
                                            className="btn btn-sm btn-outline-secondary py-0"
                                            style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                                            onClick={() => navigator.clipboard?.writeText(callbackURL)}
                                        >
                                            <i className="bi bi-clipboard me-1"></i>{t('Copy')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Credential fields */}
                    {selectedProvider && (
                        <div className="mb-3">
                            <div className="row g-2">
                                {selectedProvider.fields.map(f => (
                                    <div key={f.key} className={f.type === 'checkbox' ? 'col-12' : (f.type === 'number' ? 'col-md-3' : 'col-md-6')}>
                                        {f.type === 'checkbox' ? (
                                            <div className="form-check mt-1">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id={f.key}
                                                    checked={!!creds[f.key]}
                                                    onChange={e => setCred(f.key, e.target.checked)}
                                                    disabled={busy}
                                                />
                                                <label className="form-check-label" htmlFor={f.key} style={{ fontSize: '13px' }}>
                                                    {t(f.label)}
                                                </label>
                                            </div>
                                        ) : f.type === 'select' ? (
                                            <>
                                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>{t(f.label)}</label>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={creds[f.key] || ''}
                                                    onChange={e => setCred(f.key, e.target.value)}
                                                    disabled={busy}
                                                >
                                                    <option value="">{f.placeholder}</option>
                                                    {(f.options || []).map(o => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </select>
                                            </>
                                        ) : (
                                            <>
                                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>{t(f.label)}</label>
                                                <input
                                                    type={f.type}
                                                    className="form-control form-control-sm"
                                                    placeholder={f.placeholder}
                                                    value={creds[f.key] || ''}
                                                    onChange={e => setCred(f.key, e.target.value)}
                                                    disabled={busy}
                                                    autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                                                />
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Connect button */}
                    {selectedProvider && (phase === 'idle' || phase === 'error') && (
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={handleConnect}
                            disabled={!canConnect()}
                        >
                            {isOAuth ? (
                                <><i className={`bi ${selectedProvider.icon} me-1`}></i>{t('Save & Authorize')}</>
                            ) : (
                                <><i className="bi bi-plug me-1"></i>{t('Connect')}</>
                            )}
                        </button>
                    )}

                    {busy && (
                        <div className="text-muted small mt-2">
                            <Spinner animation="border" size="sm" className="me-1" />
                            {phase === 'oauth_wait'
                                ? t('Waiting for you to complete authorization in the opened window…')
                                : t('Connecting…')}
                        </div>
                    )}

                    {busy && (
                        <button
                            className="btn btn-sm btn-outline-secondary ms-2"
                            onClick={() => { stopPolling(); setPhase('idle'); }}
                        >
                            {t('Cancel')}
                        </button>
                    )}
                </>
            )}

            {/* Webhook URL display (after connecting webhook providers) */}
            {webhookUrl && (
                <div className="mt-2 p-2" style={{ background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        <i className="bi bi-link-45deg me-1 text-warning"></i>
                        {t('Webhook URL — paste this into your email provider dashboard:')}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <code style={{ fontSize: '11px', wordBreak: 'break-all', flex: 1 }}>{webhookUrl}</code>
                        <button
                            className="btn btn-sm btn-outline-secondary py-0"
                            style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                            onClick={() => navigator.clipboard?.writeText(webhookUrl)}
                        >
                            <i className="bi bi-clipboard me-1"></i>{t('Copy')}
                        </button>
                    </div>
                </div>
            )}

            {/* Connected state */}
            {connected && (
                <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        {selectedProvider && (
                            <i className={`bi ${selectedProvider.icon}`} style={{ color: selectedProvider.iconColor, fontSize: '1.1rem' }}></i>
                        )}
                        <span className="text-success small">
                            <i className="bi bi-check-circle-fill me-1"></i>
                            {connectedEmail
                                ? t('Connected as {{email}}', { email: connectedEmail })
                                : t('Email connected')}
                        </span>
                        <button className="btn btn-sm btn-outline-danger" onClick={handleDisconnect}>
                            <i className="bi bi-x-circle me-1"></i>{t('Disconnect')}
                        </button>
                    </div>
                    {/* Show webhook URL in connected state for webhook providers */}
                    {isWebhook && (
                        <div className="mt-2 p-2" style={{ background: '#fff', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                            <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 600, marginBottom: '4px' }}>
                                {t('Webhook URL (configure in your email provider):')}
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <code style={{ fontSize: '11px', wordBreak: 'break-all', flex: 1 }}>
                                    {rfqEmailWebhookURLLocal(storeId, provider)}
                                </code>
                                <button
                                    className="btn btn-sm btn-outline-secondary py-0"
                                    style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                                    onClick={() => navigator.clipboard?.writeText(rfqEmailWebhookURLLocal(storeId, provider))}
                                >
                                    <i className="bi bi-clipboard me-1"></i>{t('Copy')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {phase === 'error' && (
                <Alert variant="danger" className="py-2 px-3 small mb-0 mt-2">
                    <i className="bi bi-exclamation-triangle me-1"></i>{errorMsg}
                    <button className="btn btn-sm btn-outline-danger ms-2" onClick={handleConnect}>{t('Retry')}</button>
                </Alert>
            )}
        </div>
    );
}

function rfqEmailWebhookURLLocal(storeId, provider) {
    const base = process.env.REACT_APP_API_URL || '';
    return `${base}/v1/rfq-email/webhook?store_id=${storeId}&provider=${provider}`;
}

export default ProcurementEmailWidget;
