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

function blankCreds() {
    return {
        rfq_gmail_client_id: '',
        rfq_gmail_client_secret: '',
        rfq_outlook_tenant_id: '',
        rfq_outlook_client_id: '',
        rfq_outlook_client_secret: '',
        rfq_zoho_client_id: '',
        rfq_zoho_client_secret: '',
        rfq_mailgun_api_key: '',
        rfq_mailgun_domain: '',
        rfq_sendgrid_api_key: '',
        rfq_postmark_server_token: '',
        rfq_aws_ses_access_key_id: '',
        rfq_aws_ses_secret_key: '',
        rfq_aws_ses_region: '',
        rfq_imap_host: '',
        rfq_imap_port: 993,
        rfq_imap_username: '',
        rfq_imap_password: '',
        rfq_imap_use_ssl: true,
    };
}

// Maps provider value → icon/color for use in the account list
const PROVIDER_META = Object.fromEntries(PROVIDERS.map(p => [p.value, p]));

function webhookURLForAccount(storeId, accountId) {
    const base = process.env.REACT_APP_API_URL || '';
    return `${base}/v1/rfq-email/webhook?store_id=${storeId}&account_id=${accountId}`;
}

// ── Single account add form ───────────────────────────────────────────────────

function AddAccountForm({ storeId, onAdded, onCancel }) {
    const { t } = useTranslation('common');
    const [provider, setProvider] = useState('');
    const [creds, setCreds] = useState(blankCreds);
    const [phase, setPhase] = useState('idle'); // idle | connecting | oauth_wait | error
    const [errorMsg, setErrorMsg] = useState('');
    const [showInstructions, setShowInstructions] = useState(false);
    const pollRef = useRef(null);

    const apiBase = process.env.REACT_APP_API_URL || '';
    const callbackURL = apiBase + '/v1/rfq-email/oauth-callback';

    const stopPolling = useCallback(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }, []);
    useEffect(() => () => stopPolling(), [stopPolling]);

    const selectedProvider = PROVIDERS.find(p => p.value === provider);
    const isOAuth = selectedProvider && OAUTH_TYPES.has(selectedProvider.type);
    const busy = phase === 'connecting' || phase === 'oauth_wait';

    const setCred = (key, value) => setCreds(prev => ({ ...prev, [key]: value }));

    const canConnect = () => {
        if (!provider) return false;
        const p = PROVIDERS.find(x => x.value === provider);
        if (!p) return false;
        for (const f of p.fields) {
            if (f.type === 'checkbox') continue;
            if (f.type === 'select' && !creds[f.key]) return false;
            if (f.type !== 'select' && !creds[f.key]) return false;
        }
        return true;
    };

    const pollAccountStatus = useCallback((accountId) => {
        stopPolling();
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(
                    `/v1/rfq-email/account/${accountId}/status?store_id=${storeId}`,
                    { headers: { Authorization: localStorage.getItem('access_token') } }
                );
                const data = await res.json();
                if (data.connected) {
                    stopPolling();
                    onAdded({ id: accountId, provider: data.provider, email: data.email });
                }
            } catch (_) {}
        }, POLL_MS);
    }, [storeId, stopPolling, onAdded]);

    // Listen for OAuth popup postMessage
    useEffect(() => {
        function onMessage(e) {
            if (!e.data || e.data.rfqEmailOAuth !== 'done') return;
            // pendingAccountId is captured via closure via ref
            if (pendingAccountRef.current) {
                stopPolling();
                pollAccountStatus(pendingAccountRef.current);
            }
        }
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pendingAccountRef = useRef(null);

    const handleConnect = useCallback(async () => {
        if (!storeId || !provider) return;
        setPhase('connecting');
        setErrorMsg('');

        const body = { store_id: storeId, provider, callback_url: callbackURL };
        // Map frontend cred keys → backend keys
        if (provider === 'gmail') { body.rfq_gmail_client_id = creds.rfq_gmail_client_id; body.rfq_gmail_client_secret = creds.rfq_gmail_client_secret; }
        if (provider === 'outlook') { body.rfq_outlook_tenant_id = creds.rfq_outlook_tenant_id; body.rfq_outlook_client_id = creds.rfq_outlook_client_id; body.rfq_outlook_client_secret = creds.rfq_outlook_client_secret; }
        if (provider === 'zoho') { body.rfq_zoho_client_id = creds.rfq_zoho_client_id; body.rfq_zoho_client_secret = creds.rfq_zoho_client_secret; }
        if (provider === 'mailgun') { body.rfq_mailgun_api_key = creds.rfq_mailgun_api_key; body.rfq_mailgun_domain = creds.rfq_mailgun_domain; }
        if (provider === 'sendgrid') { body.rfq_sendgrid_api_key = creds.rfq_sendgrid_api_key; }
        if (provider === 'postmark') { body.rfq_postmark_server_token = creds.rfq_postmark_server_token; }
        if (provider === 'ses') { body.rfq_aws_ses_access_key_id = creds.rfq_aws_ses_access_key_id; body.rfq_aws_ses_secret_key = creds.rfq_aws_ses_secret_key; body.rfq_aws_ses_region = creds.rfq_aws_ses_region; }
        if (provider === 'imap') { body.rfq_imap_host = creds.rfq_imap_host; body.rfq_imap_port = parseInt(creds.rfq_imap_port, 10) || 993; body.rfq_imap_username = creds.rfq_imap_username; body.rfq_imap_password = creds.rfq_imap_password; body.rfq_imap_use_ssl = creds.rfq_imap_use_ssl; }

        try {
            const res = await fetch('/v1/rfq-email/account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || data.error) { setPhase('error'); setErrorMsg(data.error || 'Connection failed'); return; }

            if (data.oauth_url) {
                pendingAccountRef.current = data.account_id;
                window.open(data.oauth_url, 'rfq_email_oauth', 'width=700,height=600,noopener');
                setPhase('oauth_wait');
                pollAccountStatus(data.account_id);
                return;
            }

            // Immediate connect (webhook/IMAP)
            onAdded({
                id: data.account_id,
                provider,
                email: data.email || '',
                webhookUrl: data.webhook_url || '',
            });
        } catch (e) {
            setPhase('error');
            setErrorMsg('Cannot reach server: ' + e.message);
        }
    }, [storeId, provider, creds, callbackURL, pollAccountStatus, onAdded]);

    return (
        <div style={{ border: '1px dashed #0d6efd', borderRadius: '8px', padding: '16px', background: '#f0f4ff' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <strong style={{ fontSize: '14px' }}><i className="bi bi-plus-circle me-2 text-primary"></i>{t('Add Email Account')}</strong>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCancel} disabled={busy}>{t('Cancel')}</button>
            </div>

            {/* Provider selector */}
            <div className="mb-3">
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 500 }}>{t('Email Service Provider')}</label>
                <select
                    className="form-select form-select-sm"
                    value={provider}
                    onChange={e => { setProvider(e.target.value); setErrorMsg(''); }}
                    disabled={busy}
                    style={{ maxWidth: '420px' }}
                >
                    <option value="">{t('— Select provider —')}</option>
                    {PROVIDERS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}  ·  {p.pricing}</option>
                    ))}
                </select>
            </div>

            {selectedProvider && (
                <>
                    {/* Provider info box */}
                    <div className="mb-3 p-3" style={{ background: '#fff', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                        <div className="d-flex align-items-center mb-2" style={{ gap: '8px' }}>
                            <i className={`bi ${selectedProvider.icon}`} style={{ color: selectedProvider.iconColor, fontSize: '1.1rem' }}></i>
                            <strong style={{ fontSize: '14px' }}>{selectedProvider.label}</strong>
                            <span className="badge" style={{ background: '#f0f4ff', color: '#0052cc', fontSize: '11px' }}>{selectedProvider.pricing}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>{t(selectedProvider.description)}</p>
                        <button type="button" className="btn btn-link btn-sm p-0" style={{ fontSize: '12px' }} onClick={() => setShowInstructions(v => !v)}>
                            <i className={`bi bi-chevron-${showInstructions ? 'up' : 'down'} me-1`}></i>
                            {showInstructions ? t('Hide setup instructions') : t('Show setup instructions')}
                        </button>
                        {selectedProvider.setupUrl && (
                            <a href={selectedProvider.setupUrl} target="_blank" rel="noopener noreferrer" className="ms-3 btn btn-link btn-sm p-0" style={{ fontSize: '12px' }}>
                                <i className="bi bi-box-arrow-up-right me-1"></i>{selectedProvider.setupUrlLabel}
                            </a>
                        )}
                        {showInstructions && (
                            <ol className="mt-2 mb-0" style={{ fontSize: '12px', color: '#495057', paddingLeft: '18px' }}>
                                {selectedProvider.setupSteps(callbackURL).map((step, i) => (
                                    <li key={i} style={{ marginBottom: '4px' }}>{step}</li>
                                ))}
                            </ol>
                        )}
                        {isOAuth && (
                            <div className="mt-2 p-2" style={{ background: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                                <span style={{ fontSize: '11px', color: '#6c757d', fontWeight: 600 }}>{t('Redirect URI to add in your provider:')}</span>
                                <div className="d-flex align-items-center gap-2 mt-1">
                                    <code style={{ fontSize: '11px', wordBreak: 'break-all', flex: 1 }}>{callbackURL}</code>
                                    <button type="button" className="btn btn-sm btn-outline-secondary py-0" style={{ fontSize: '11px' }} onClick={() => navigator.clipboard?.writeText(callbackURL)}>
                                        <i className="bi bi-clipboard me-1"></i>{t('Copy')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Credential fields */}
                    <div className="mb-3">
                        <div className="row g-2">
                            {selectedProvider.fields.map(f => (
                                <div key={f.key} className={f.type === 'checkbox' ? 'col-12' : (f.type === 'number' ? 'col-md-3' : 'col-md-6')}>
                                    {f.type === 'checkbox' ? (
                                        <div className="form-check mt-1">
                                            <input type="checkbox" className="form-check-input" id={f.key} checked={!!creds[f.key]} onChange={e => setCred(f.key, e.target.checked)} disabled={busy} />
                                            <label className="form-check-label" htmlFor={f.key} style={{ fontSize: '13px' }}>{t(f.label)}</label>
                                        </div>
                                    ) : f.type === 'select' ? (
                                        <>
                                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>{t(f.label)}</label>
                                            <select className="form-select form-select-sm" value={creds[f.key] || ''} onChange={e => setCred(f.key, e.target.value)} disabled={busy}>
                                                <option value="">{f.placeholder}</option>
                                                {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </>
                                    ) : (
                                        <>
                                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 500 }}>{t(f.label)}</label>
                                            <input type={f.type} className="form-control form-control-sm" placeholder={f.placeholder} value={creds[f.key] || ''} onChange={e => setCred(f.key, e.target.value)} disabled={busy} autoComplete={f.type === 'password' ? 'new-password' : 'off'} />
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Connect button */}
                    {(phase === 'idle' || phase === 'error') && (
                        <button type="button" className="btn btn-sm btn-primary" onClick={handleConnect} disabled={!canConnect()}>
                            {isOAuth ? <><i className={`bi ${selectedProvider.icon} me-1`}></i>{t('Save & Authorize')}</> : <><i className="bi bi-plug me-1"></i>{t('Connect')}</>}
                        </button>
                    )}

                    {busy && (
                        <div className="d-flex align-items-center gap-2 mt-2 text-muted small">
                            <Spinner animation="border" size="sm" />
                            {phase === 'oauth_wait' ? t('Waiting for you to complete authorization in the opened window…') : t('Connecting…')}
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { stopPolling(); setPhase('idle'); }}>{t('Cancel')}</button>
                        </div>
                    )}
                </>
            )}

            {phase === 'error' && (
                <Alert variant="danger" className="py-2 px-3 small mb-0 mt-2">
                    <i className="bi bi-exclamation-triangle me-1"></i>{errorMsg}
                    <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={handleConnect}>{t('Retry')}</button>
                </Alert>
            )}
        </div>
    );
}

// ── Single connected account card ─────────────────────────────────────────────

function AccountCard({ account, storeId, onRemoved }) {
    const { t } = useTranslation('common');
    const [removing, setRemoving] = useState(false);
    const [showWebhook, setShowWebhook] = useState(false);
    const meta = PROVIDER_META[account.provider] || { icon: 'bi-envelope', iconColor: '#6c757d', label: account.provider };
    const isWebhook = meta && WEBHOOK_TYPES.has(meta.type);
    const webhookUrl = isWebhook ? webhookURLForAccount(storeId, account.id) : null;

    const handleDisconnect = async () => {
        setRemoving(true);
        try {
            const res = await fetch(
                `/v1/rfq-email/account/${account.id}?store_id=${storeId}`,
                { method: 'DELETE', headers: { Authorization: localStorage.getItem('access_token') } }
            );
            const data = await res.json();
            if (data.success) onRemoved(account.id);
        } catch (_) {}
        setRemoving(false);
    };

    return (
        <div style={{ border: '1px solid #dee2e6', borderRadius: '6px', padding: '10px 14px', background: '#f0faf3', marginBottom: '8px' }}>
            <div className="d-flex align-items-center gap-2 flex-wrap">
                <i className={`bi ${meta.icon}`} style={{ color: meta.iconColor, fontSize: '1.1rem' }}></i>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{meta.label}</span>
                <Badge bg="success" className="ms-1">
                    <i className="bi bi-check-circle-fill me-1"></i>
                    {account.email || t('Connected')}
                </Badge>
                {isWebhook && (
                    <button type="button" className="btn btn-link btn-sm p-0 ms-1" style={{ fontSize: '12px' }} onClick={() => setShowWebhook(v => !v)}>
                        <i className="bi bi-link-45deg me-1"></i>{t('Webhook URL')}
                    </button>
                )}
                <button type="button" className="btn btn-sm btn-outline-danger ms-auto" onClick={handleDisconnect} disabled={removing}>
                    {removing ? <Spinner animation="border" size="sm" /> : <><i className="bi bi-x-circle me-1"></i>{t('Disconnect')}</>}
                </button>
            </div>
            {showWebhook && webhookUrl && (
                <div className="mt-2 p-2" style={{ background: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                    <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 600, marginBottom: '4px' }}>{t('Paste this URL into your email provider dashboard:')}</div>
                    <div className="d-flex align-items-center gap-2">
                        <code style={{ fontSize: '11px', wordBreak: 'break-all', flex: 1 }}>{webhookUrl}</code>
                        <button type="button" className="btn btn-sm btn-outline-secondary py-0" style={{ fontSize: '11px' }} onClick={() => navigator.clipboard?.writeText(webhookUrl)}>
                            <i className="bi bi-clipboard me-1"></i>{t('Copy')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main widget ───────────────────────────────────────────────────────────────

function ProcurementEmailWidget({ storeId, settings, onSettingsChange }) {
    const { t } = useTranslation('common');
    const [accounts, setAccounts] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Load accounts from server on mount
    useEffect(() => {
        if (!storeId) return;
        fetch(`/v1/rfq-email/accounts?store_id=${storeId}`, {
            headers: { Authorization: localStorage.getItem('access_token') },
        })
            .then(r => r.json())
            .then(data => {
                setAccounts(data.accounts || []);
                setLoaded(true);
            })
            .catch(() => {
                // Fallback: read from settings prop (covers offline/first-load)
                setAccounts(settings?.rfq_email_accounts || []);
                setLoaded(true);
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    const handleAdded = useCallback((newAccount) => {
        setAccounts(prev => [...prev, newAccount]);
        setShowAddForm(false);
        if (onSettingsChange) {
            onSettingsChange({ rfq_email_connected: true });
        }
    }, [onSettingsChange]);

    const handleRemoved = useCallback((accountId) => {
        setAccounts(prev => {
            const next = prev.filter(a => a.id !== accountId);
            if (onSettingsChange) {
                onSettingsChange({ rfq_email_connected: next.length > 0 });
            }
            return next;
        });
    }, [onSettingsChange]);

    return (
        <div style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', background: '#f8f9fa' }}>
            {/* Header — "Add Account" always visible so user can add more accounts at any time */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                    <i className="bi bi-envelope-at text-primary" style={{ fontSize: '1.25rem' }}></i>
                    <strong>{t('Email Source')}</strong>
                    {accounts.length > 0 && (
                        <Badge bg="success" data-testid="badge-success">{accounts.length} {accounts.length === 1 ? t('account') : t('accounts')}</Badge>
                    )}
                    {loaded && accounts.length === 0 && (
                        <Badge bg="secondary">{t('Not Connected')}</Badge>
                    )}
                </div>
                {!showAddForm && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        data-testid="add-account-btn"
                        onClick={() => setShowAddForm(true)}
                    >
                        <i className="bi bi-plus me-1"></i>{t('Add Account')}
                    </button>
                )}
            </div>

            {loaded && accounts.length === 0 && !showAddForm && (
                <p className="text-muted small mb-0 mt-2">
                    {t('No email accounts connected. Click "Add Account" to receive RFQs by email.')}
                </p>
            )}

            {/* Connected accounts list */}
            {accounts.map(acct => (
                <AccountCard
                    key={acct.id}
                    account={acct}
                    storeId={storeId}
                    onRemoved={handleRemoved}
                />
            ))}

            {/* Add account form */}
            {showAddForm && (
                <AddAccountForm
                    storeId={storeId}
                    onAdded={handleAdded}
                    onCancel={() => setShowAddForm(false)}
                />
            )}
        </div>
    );
}

export default ProcurementEmailWidget;
