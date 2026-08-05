import { useEffect, useRef, useState } from 'react';
import { fetchStore } from './storeUtils.js';

const POLL_INTERVAL = 10 * 60 * 1000; // check every 10 minutes
const RELOAD_COUNTDOWN = 60;          // seconds before auto-reload

function getVersionFingerprint(html) {
    const matches = html.match(/\/static\/(js|css)\/\S+\.(js|css)/g);
    return matches ? matches.join('|') : html.substring(0, 1000);
}

export default function AutoRefresh() {
    const storedVersion = useRef(null);
    const snoozeUntilRef = useRef(0);
    const enabledRef = useRef(false);
    const [updateReady, setUpdateReady] = useState(false);
    const [countdown, setCountdown] = useState(RELOAD_COUNTDOWN);
    const countdownRef = useRef(null);

    const fetchVersion = async () => {
        try {
            const res = await fetch('/index.html?_=' + Date.now(), { cache: 'no-store' });
            const text = await res.text();
            return getVersionFingerprint(text);
        } catch {
            return null;
        }
    };

    const snooze = () => {
        setUpdateReady(false);
        snoozeUntilRef.current = Date.now() + 10 * 60 * 1000;
    };

    const startCountdown = () => {
        setCountdown(RELOAD_COUNTDOWN);
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    window.location.reload();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const check = async () => {
        if (!enabledRef.current) return;
        if (Date.now() < snoozeUntilRef.current) return;
        const version = await fetchVersion();
        if (!version) return;
        if (storedVersion.current === null) {
            storedVersion.current = version;
            return;
        }
        if (storedVersion.current !== version) {
            setUpdateReady(true);
            startCountdown();
        }
    };

    useEffect(() => {
        const storeId = localStorage.getItem('store_id');
        if (!storeId) return;

        let cancelled = false;
        let cleanup = () => { };

        fetchStore(storeId).then(store => {
            if (cancelled) return;
            if (!store?.settings?.enable_auto_refresh) return;
            enabledRef.current = true;

            check();
            const interval = setInterval(check, POLL_INTERVAL);
            const onFocus = () => check();
            const onVisibility = () => { if (!document.hidden) check(); };
            window.addEventListener('focus', onFocus);
            document.addEventListener('visibilitychange', onVisibility);

            cleanup = () => {
                clearInterval(interval);
                clearInterval(countdownRef.current);
                window.removeEventListener('focus', onFocus);
                document.removeEventListener('visibilitychange', onVisibility);
            };
        });

        // NOTE: the effect callback itself (not the .then() callback) must
        // return the cleanup function, otherwise React never registers it
        // and the interval/listeners leak on unmount.
        return () => {
            cancelled = true;
            cleanup();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!updateReady) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 99999,
            background: '#1e293b',
            color: '#f8fafc',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            padding: '14px 18px',
            minWidth: '280px',
            maxWidth: '340px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '13px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🚀</span>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>New version available</div>
                    <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                        Refreshing in <strong style={{ color: '#38bdf8' }}>{countdown}s</strong>…
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => { clearInterval(countdownRef.current); window.location.reload(); }}
                    style={{
                        flex: 1,
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '12px',
                    }}
                >
                    Refresh Now
                </button>
                <button
                    onClick={() => { clearInterval(countdownRef.current); snooze(); }}
                    style={{
                        flex: 1,
                        background: '#334155',
                        color: '#cbd5e1',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                    }}
                >
                    Later (10 min)
                </button>
            </div>
        </div>
    );
}
