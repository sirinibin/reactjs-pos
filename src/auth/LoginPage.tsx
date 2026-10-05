import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { ApiError } from '@/api/client';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/Button';
import { LanguageMenu } from '@/shell/LanguageMenu';

const LOCK_LIMIT = 5;
const LOCK_MS = 15 * 60 * 1000;
const lockKey = (email: string) => `login_lock_${email.toLowerCase()}`;
function readLock(email: string): { failures: number; until: number } {
  try { return JSON.parse(localStorage.getItem(lockKey(email)) || '') || { failures: 0, until: 0 }; } catch { return { failures: 0, until: 0 }; }
}

export function LoginPage() {
  const { t } = useTranslation();
  const { status, login } = useAuth();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (status === 'ready') return <Navigate to={loc.state?.from || '/'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = t('Enter a valid email address.');
    if (!password) errs.password = t('Password is required.');
    const lock = readLock(email.trim());
    if (!errs.email && lock.until > Date.now()) errs.form = t('Too many failed attempts. Try again in {{m}} minutes.', { m: Math.ceil((lock.until - Date.now()) / 60000) });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await login(email, password);
      localStorage.removeItem(lockKey(email.trim()));
    } catch (err) {
      const e2 = err instanceof ApiError ? err : null;
      if (e2?.status === 429) setErrors({ form: t('Too many login attempts from your network. Please wait 15 minutes.') });
      else {
        const l = readLock(email.trim());
        l.failures += 1;
        if (l.failures >= LOCK_LIMIT) { l.until = Date.now() + LOCK_MS; l.failures = 0; }
        localStorage.setItem(lockKey(email.trim()), JSON.stringify(l));
        setErrors({ form: e2?.errors.password || e2?.errors.email || e2?.message || t('Something went wrong.') });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login on">
      <div className="login-l">
        <div className="row">
          <span className="logo" style={{ margin: 0 }}>S</span><b style={{ fontSize: 16 }}>StartERP</b><span className="spacer" />
          <LanguageMenu variant="button" />
        </div>
        <form className="login-form" onSubmit={submit} noValidate aria-label={t('Sign in')}>
          <div>
            <h1>{t('Sign in')}</h1>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t('Welcome back. Use your work email to continue.')}</p>
          </div>
          {errors.form && <div className="banner crit" role="alert"><Icon name="xc" size="s" /><div>{errors.form}</div></div>}
          <div className="field">
            <label htmlFor="email">{t('Email')}</label>
            <input id="email" className={`inp${errors.email ? ' err' : ''}`} type="email" autoComplete="username" placeholder="name@company.sa" style={{ height: 40 }}
              value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-err' : undefined} autoFocus />
            {errors.email && <div className="errmsg" id="email-err"><Icon name="alert" size="xs" />{errors.email}</div>}
          </div>
          <div className="field">
            <label htmlFor="password">{t('Password')}</label>
            <div className="inpw">
              <input id="password" className={`inp${errors.password ? ' err' : ''}`} type={show ? 'text' : 'password'} autoComplete="current-password" style={{ height: 40, paddingInlineStart: 11 }}
                value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'pw-err' : undefined} />
              <button type="button" className="ib" style={{ position: 'absolute', insetInlineEnd: 3 }} onClick={() => setShow((s) => !s)} aria-label={show ? t('Hide password') : t('Show password')}>
                <Icon name="eye" size="s" />
              </button>
            </div>
            {errors.password && <div className="errmsg" id="pw-err"><Icon name="alert" size="xs" />{errors.password}</div>}
          </div>
          <Button variant="primary" type="submit" loading={busy} style={{ height: 42, fontSize: 14 }}>{t('Sign in')}</Button>
          <div className="muted row" style={{ fontSize: 12 }}><Icon name="lock" size="xs" />{t('Your session is encrypted and tied to this device.')}</div>
        </form>
        <div className="muted" style={{ fontSize: 12 }}>© {new Date().getFullYear()} StartERP</div>
      </div>
      <div className="login-r" aria-hidden>
        <h2>{t('Run sales, stock, workshop and finance from one calm, fast workspace.')}</h2>
        <ul>
          <li><Icon name="check" size="s" />{t('ZATCA Phase 2 e-invoicing built in — sign, hash, QR and clear on save.')}</li>
          <li><Icon name="check" size="s" />{t('Multi-store, multi-warehouse inventory with real-time stock.')}</li>
          <li><Icon name="check" size="s" />{t('Full Arabic & English, on desktop, tablet and phone.')}</li>
        </ul>
      </div>
    </div>
  );
}
