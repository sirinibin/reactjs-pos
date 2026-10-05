
import React, { useState, useEffect } from "react";
import '../erp/theme/erp.css';
import { getLandingPath } from './../sidebar_menu_config';
import { fetchStore } from '../utils/storeUtils.js';

//import { useHistory } from "react-router-dom";

// ── Brute-force lockout constants ─────────────────────────────────────────────
const LOCKOUT_LIMIT   = 5;       // failures before lockout
const LOCKOUT_SECONDS = 15 * 60; // 15 minutes

function lockoutKey(email) {
    return 'pos_login_lock_' + email.toLowerCase().trim();
}
function getLockout(email) {
    try {
        const raw = localStorage.getItem(lockoutKey(email));
        return raw ? JSON.parse(raw) : { failures: 0, lockedUntil: 0 };
    } catch { return { failures: 0, lockedUntil: 0 }; }
}
function saveLockout(email, data) {
    try { localStorage.setItem(lockoutKey(email), JSON.stringify(data)); } catch {}
}
function clearLockout(email) {
    try { localStorage.removeItem(lockoutKey(email)); } catch {}
}

function Login() {

    // const history = useHistory();
    const [errors, setErrors]           = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const [lockoutUntil, setLockoutUntil] = useState(0);   // epoch ms
    const [countdown, setCountdown]     = useState('');     // "MM:SS" string


    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (at) {
            window.location = getLandingPath();
        }
    }, []);

    // Countdown ticker — runs while lockoutUntil is in the future.
    useEffect(() => {
        if (!lockoutUntil) return;
        const tick = () => {
            const secs = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
            const m = String(Math.floor(secs / 60)).padStart(2, '0');
            const s = String(secs % 60).padStart(2, '0');
            setCountdown(m + ':' + s);
            if (secs <= 0) setLockoutUntil(0);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [lockoutUntil]);

    async function me() {
        console.log("inside me");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        fetch('/v1/me', requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});

                console.log("Response:");
                console.log(data);
                let storeIDs = data.result.store_ids;
                let storeNames = data.result.store_names;

                if (data.result.role !== "Admin" && (storeIDs?.length === 0 || !storeIDs)) {
                    errors.email = "You have no stores assigned to you"
                    localStorage.removeItem("access_token");
                    setProcessing(false);
                    setErrors({ ...errors });
                    return;
                }

                const userId = data.result.id;
                const lastStoreId = localStorage.getItem("last_store_" + userId);

                if (data.result.role !== "Admin") {
                    // Restore last used store if it is still in the user's assigned stores
                    let storeId = storeIDs[0];
                    let storeName = storeNames[0];
                    if (lastStoreId && storeIDs.includes(lastStoreId)) {
                        const idx = storeIDs.indexOf(lastStoreId);
                        storeId = lastStoreId;
                        storeName = storeNames[idx] || storeNames[0];
                    }
                    localStorage.setItem("store_name", storeName);
                    localStorage.setItem("store_id", storeId);
                    if (storeId) localStorage.setItem("last_store_" + userId, storeId);
                    if (storeId) {
                        await getStore(storeId);
                    }
                } else {
                    if (lastStoreId) {
                        try {
                            const storeData = await fetchStore(lastStoreId, "id,name,branch_name,settings");
                            if (storeData) {
                                localStorage.setItem("store_id", storeData.id);
                                localStorage.setItem("store_name", storeData.name);
                                localStorage.setItem("last_store_" + userId, storeData.id);
                                if (storeData.branch_name) {
                                    localStorage.setItem("branch_name", storeData.branch_name);
                                } else {
                                    localStorage.removeItem("branch_name");
                                }
                                if (storeData.settings) {
                                    localStorage.setItem("_store_settings_cache", JSON.stringify(storeData.settings));
                                }
                            } else {
                                await getFirstStore(userId);
                            }
                        } catch (_) {
                            await getFirstStore(userId);
                        }
                    } else {
                        await getFirstStore(userId);
                    }
                }

                localStorage.setItem("user_name", data.result.name);
                localStorage.setItem("user_id", data.result.id);
                // role may be omitted from API response (omitempty) for old users with empty role in DB.
                // Always default to 'Manager' — never infer from the admin flag,
                // as some records have admin=true with empty role (data issue).
                const resolvedRole = data.result.role || 'Manager';
                localStorage.setItem("user_role", resolvedRole);
                //localStorage.setItem("id", JSON.stringify({ id: data.result.id, changedAt: Date.now() }));



                if (data.result.admin === true) {
                    localStorage.setItem("admin", true);
                } else {
                    localStorage.setItem("admin", false);
                }

                if (data.result.photo) {
                    localStorage.setItem("user_photo", data.result.photo);
                }

                // Fetch and cache effective RBAC permissions for sidebar filtering
                try {
                    const permRes = await fetch('/v1/user-role/effective-permissions', {
                        headers: { Authorization: localStorage.getItem('access_token') },
                    });
                    const permData = await permRes.json();
                    if (permData.result && permData.result.length > 0) {
                        localStorage.setItem("user_permissions", JSON.stringify(permData.result));
                    } else {
                        localStorage.removeItem("user_permissions");
                    }
                } catch (e) {
                    localStorage.removeItem("user_permissions");
                }

                // history.push("/dashboard/analytics");
                //history.push("/dashboard/sales");
                window.location = getLandingPath();
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error || {});
            });
    }

    async function getFirstStore(userId = null) {
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        await fetch('/v1/store?select=id,name,branch_name&limit=1', requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                if (!response.ok) {
                    return Promise.reject(data && data.errors);
                }

                const stores = data.result;
                if (stores && stores.length > 0) {
                    const first = stores[0];
                    localStorage.setItem("store_name", first.name);
                    localStorage.setItem("store_id", first.id);
                    if (first.branch_name) {
                        localStorage.setItem("branch_name", first.branch_name);
                    } else {
                        localStorage.removeItem("branch_name");
                    }
                    if (userId) localStorage.setItem("last_store_" + userId, first.id);
                    if (first.id) {
                        await getStore(first.id);
                    }
                }
            })
            .catch(() => {});
    }

    async function getStore(id) {
        try {
            const storeData = await fetchStore(id);
            if (storeData?.settings) {
                localStorage.setItem("_store_settings_cache", JSON.stringify(storeData.settings));
            }
        } catch (error) { }
    }

    useEffect(() => {
        const handleStorageChange = (event) => {
            console.log("event:", event);
            if (event.key === "store_id" || event.key === "access_token") {
                console.log("Store info changed in another tab, reloading...");
                window.location.reload(); // Refresh this tab
            }
        };

        window.addEventListener("storage", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    function getAccessToken(authCode) {
        console.log("inside access token");
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authCode,
            },
        };

        fetch('/v1/accesstoken', requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});

                console.log("Response:");
                console.log(data);
                localStorage.setItem("access_token", data.result.access_token);
                me();
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error || {});
            });
    }


    function handleSubmit(event) {
        event.preventDefault();
        const email    = event.target[0].value.trim();
        const password = event.target[1].value;

        // Check client-side lockout before hitting the server.
        const lock = getLockout(email);
        if (lock.lockedUntil > Date.now()) {
            setLockoutUntil(lock.lockedUntil);
            return;
        }

        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        };

        setProcessing(true);
        fetch('/v1/authorize', requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // nginx / Go rate limit hit
                if (response.status === 429) {
                    setProcessing(false);
                    setErrors({ email: 'Too many login attempts from your network. Please wait 15 minutes.' });
                    return;
                }

                if (!response.ok) {
                    // Record failed attempt and enforce lockout if threshold reached.
                    const d = getLockout(email);
                    d.failures++;
                    if (d.failures >= LOCKOUT_LIMIT) {
                        d.lockedUntil = Date.now() + LOCKOUT_SECONDS * 1000;
                    }
                    saveLockout(email, d);

                    if (d.lockedUntil > Date.now()) {
                        setLockoutUntil(d.lockedUntil);
                        setProcessing(false);
                        return;
                    }

                    const remaining = LOCKOUT_LIMIT - d.failures;
                    const hint = remaining > 0 ? ` (${remaining} attempt${remaining !== 1 ? 's' : ''} left)` : '';
                    const error = (data && data.errors) || { email: 'Incorrect email or password.' + hint };
                    return Promise.reject(error);
                }

                // Success — clear lockout record.
                clearLockout(email);
                setErrors({});
                getAccessToken(data.result.code);
            })
            .catch(error => {
                setProcessing(false);
                setErrors(error || {});
            });
    }

    const locked = lockoutUntil > 0;

    return (
        <div className="erp-login">
            <aside className="erp-login__brand" aria-hidden="true">
                <div className="erp-login__brand-top">
                    <span className="erp-nav__logo">S</span>
                    <span className="erp-login__brand-name">StartERP</span>
                </div>
                <div className="erp-login__pitch">
                    <h2>Sales, purchasing, inventory and accounts in one place.</h2>
                    <p>ZATCA-ready invoicing, multi-store operations and real-time stock for growing businesses.</p>
                </div>
                <div className="erp-login__brand-foot">An AI &amp; Software Wing of Gulf Union Ozone</div>
            </aside>
            <main className="erp-login__main">
                <div className="erp-login__card">
                    <h1 className="erp-login__title">Sign in</h1>
                    <p className="erp-login__subtitle">Sign in to your account to continue</p>
                    {locked && (
                        <div className="erp-alert erp-alert--danger" role="alert" style={{ marginBottom: 16 }}>
                            <div>Too many failed attempts. Try again in <strong>{countdown}</strong>.</div>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="erp-field" style={{ marginBottom: 14 }}>
                            <label className="erp-field__label" htmlFor="login-email">Email</label>
                            <input
                                id="login-email"
                                className={"erp-input erp-input--lg" + (errors.email ? " is-invalid" : "")}
                                type="email"
                                name="email"
                                autoComplete="username"
                                placeholder="Enter your email"
                                disabled={locked}
                                aria-invalid={errors.email ? "true" : undefined}
                                aria-describedby={errors.email ? "login-email-err" : undefined}
                            />
                            {errors.email && <span className="erp-field__error" id="login-email-err">{errors.email}</span>}
                        </div>
                        <div className="erp-field" style={{ marginBottom: 20 }}>
                            <label className="erp-field__label" htmlFor="login-password">Password</label>
                            <input
                                id="login-password"
                                className={"erp-input erp-input--lg" + (errors.password ? " is-invalid" : "")}
                                type="password"
                                name="password"
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                disabled={locked}
                                aria-invalid={errors.password ? "true" : undefined}
                                aria-describedby={errors.password ? "login-password-err" : undefined}
                            />
                            {errors.password && <span className="erp-field__error" id="login-password-err">{errors.password}</span>}
                        </div>
                        {isProcessing ? (
                            <button className="erp-btn erp-btn--primary erp-btn--block erp-login__submit" type="button" disabled>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden={true}></span>
                                Logging In...
                            </button>
                        ) : (
                            <button className="erp-btn erp-btn--primary erp-btn--block erp-login__submit" type="submit" disabled={locked}>Login</button>
                        )}
                    </form>
                </div>
                <footer className="erp-login__foot">
                    © {new Date().getFullYear()} StartERP · A product of{" "}
                    <a href="https://ai.gulfunionozone.com/" target="_blank" rel="noreferrer">ai.gulfunionozone.com</a>
                </footer>
            </main>
        </div>
    );
}

export default Login;