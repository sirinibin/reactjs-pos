import React, { useEffect, useRef, useState } from 'react';
import { Inbox, AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cx } from './Button';

export function Badge({ tone = 'neutral', children, className, title }) {
    return <span className={cx('erp-badge', tone !== 'neutral' && `erp-badge--${tone}`, className)} title={title}>{children}</span>;
}

export function Panel({ title, actions, children, flush, className, bodyClassName, headExtra }) {
    return (
        <section className={cx('erp-panel', className)}>
            {(title || actions) && (
                <div className="erp-panel__head">
                    {typeof title === 'string' ? <h2 className="erp-panel__title">{title}</h2> : title}
                    {headExtra}
                    {actions && <div className="erp-row">{actions}</div>}
                </div>
            )}
            <div className={cx(flush ? 'erp-panel__body--flush' : 'erp-panel__body', bodyClassName)}>{children}</div>
        </section>
    );
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }) {
    return (
        <header className="erp-page-header">
            <div style={{ minWidth: 0 }}>
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav aria-label="Breadcrumb">
                        <ol className="erp-breadcrumbs">
                            {breadcrumbs.map((b, i) => (
                                <li key={i} className="erp-row" style={{ gap: 6 }}>
                                    {i > 0 && <span aria-hidden="true">/</span>}
                                    {b.href ? <a href={b.href}>{b.label}</a> : <span aria-current="page">{b.label}</span>}
                                </li>
                            ))}
                        </ol>
                    </nav>
                )}
                <h1 className="erp-page-header__title">{title}</h1>
                {subtitle && <p className="erp-page-header__subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="erp-page-header__actions">{actions}</div>}
        </header>
    );
}

export function EmptyState({ title, message, icon: Icon = Inbox, action }) {
    return (
        <div className="erp-empty">
            <Icon size={32} strokeWidth={1.5} aria-hidden="true" />
            <div className="erp-empty__title">{title}</div>
            {message && <div>{message}</div>}
            {action && <div style={{ marginTop: 14 }}>{action}</div>}
        </div>
    );
}

const ALERT_ICONS = { info: Info, danger: XCircle, warning: AlertTriangle, success: CheckCircle2 };

export function Alert({ tone = 'info', children, className }) {
    const Icon = ALERT_ICONS[tone] || Info;
    return (
        <div className={cx('erp-alert', tone !== 'info' && `erp-alert--${tone}`, className)} role={tone === 'danger' ? 'alert' : 'status'}>
            <Icon size={16} aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 1 }} />
            <div>{children}</div>
        </div>
    );
}

/** Definition list of label/value pairs. Empty values render as an em dash. */
export function KeyValue({ items }) {
    return (
        <dl className="erp-kv">
            {items.filter(Boolean).map((it, i) => (
                <div key={it.label + i} className={it.wide ? 'is-wide' : undefined} style={it.wide ? { gridColumn: '1 / -1' } : undefined}>
                    <dt>{it.label}</dt>
                    <dd className={it.numeric ? 'is-num' : undefined}>
                        {it.value === undefined || it.value === null || it.value === '' ? <span className="erp-muted">—</span> : it.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

export function Tabs({ tabs, value, onChange, label }) {
    return (
        <div className="erp-tabs" role="tablist" aria-label={label}>
            {tabs.map(t => (
                <button
                    key={t.value}
                    type="button"
                    role="tab"
                    aria-selected={value === t.value}
                    className={cx('erp-tab', value === t.value && 'is-active')}
                    onClick={() => onChange(t.value)}
                >
                    {t.label}
                </button>
            ))}
        </div>
    );
}

export function Kpi({ label, value, sub }) {
    return (
        <div className="erp-kpi">
            <div className="erp-kpi__label">{label}</div>
            <div className="erp-kpi__value">{value}</div>
            {sub && <div className="erp-kpi__sub">{sub}</div>}
        </div>
    );
}

/**
 * Dropdown menu. items: [{label, icon, onClick, danger, hidden}] or {separator:true}.
 * Closes on outside click and Esc; arrow keys move between items.
 */
export function Menu({ trigger, items, align = 'end' }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const listRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        function onDoc(e) {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
        }
        function onKey(e) {
            if (e.key === 'Escape') { setOpen(false); return; }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const els = Array.from(listRef.current ? listRef.current.querySelectorAll('button') : []);
                const idx = els.indexOf(document.activeElement);
                const next = e.key === 'ArrowDown' ? (idx + 1) % els.length : (idx - 1 + els.length) % els.length;
                if (els[next]) els[next].focus();
            }
        }
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        const firstBtn = listRef.current && listRef.current.querySelector('button');
        if (firstBtn) firstBtn.focus();
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const visible = items.filter(i => i && !i.hidden);
    return (
        <div className="erp-menu" ref={rootRef}>
            {React.cloneElement(trigger, {
                onClick: e => { e.stopPropagation(); setOpen(o => !o); },
                'aria-haspopup': 'menu',
                'aria-expanded': open,
            })}
            {open && (
                <ul className="erp-menu__list" role="menu" ref={listRef} style={align === 'start' ? { insetInlineStart: 0, insetInlineEnd: 'auto' } : undefined}>
                    {visible.map((it, i) => it.separator ? (
                        <li key={'sep' + i} className="erp-menu__sep" role="separator" />
                    ) : (
                        <li key={it.label} role="none">
                            <button
                                type="button"
                                role="menuitem"
                                className={cx('erp-menu__item', it.danger && 'is-danger')}
                                onClick={e => { e.stopPropagation(); setOpen(false); it.onClick && it.onClick(); }}
                            >
                                {it.icon && <it.icon size={15} aria-hidden="true" />}
                                {it.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
