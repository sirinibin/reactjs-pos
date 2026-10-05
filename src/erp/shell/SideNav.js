import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { groupMenuItems, findActiveItem, matchesFilter, MENU_SETTINGS_ITEM } from './navModel';

const COLLAPSED_GROUPS_KEY = 'erp_nav_collapsed_groups';

function readCollapsed() {
    try { return JSON.parse(localStorage.getItem(COLLAPSED_GROUPS_KEY) || '[]'); } catch (_) { return []; }
}

export default function SideNav({ items, store, onNavigate }) {
    const { t } = useTranslation('common');
    const { pathname } = useLocation();
    const [query, setQuery] = useState('');
    const [collapsed, setCollapsed] = useState(readCollapsed);

    const automobileFirst = !!(store && store.settings && store.settings.enable_automobile_module);
    const groups = groupMenuItems(items, { automobileFirst });
    const active = findActiveItem(items.concat([MENU_SETTINGS_ITEM]), pathname);

    function toggleGroup(id) {
        const next = collapsed.includes(id) ? collapsed.filter(g => g !== id) : collapsed.concat(id);
        setCollapsed(next);
        try { localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(next)); } catch (_) { }
    }

    const storeLabel = (store && store.name) || localStorage.getItem('store_name') || '';

    function renderItem(item) {
        const isActive = active && active.id === item.id;
        const Icon = item.Icon || item.icon;
        const label = t(item.label);
        return (
            <li key={item.id} className={'erp-nav__item' + (item.isChild ? ' erp-nav__item--child' : '')}>
                <Link
                    to={item.path}
                    className={isActive ? 'is-active' : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    title={label}
                    onClick={onNavigate}
                >
                    {Icon && <Icon size={17} aria-hidden="true" />}
                    <span className="erp-nav__label">{label}</span>
                </Link>
            </li>
        );
    }

    return (
        <nav className="erp-nav" aria-label="Main navigation">
            <Link to="/dashboard/business-dashboard" className="erp-nav__brand" onClick={onNavigate}>
                <span className="erp-nav__logo" aria-hidden="true">S</span>
                <span className="erp-nav__brand-text">
                    <span className="erp-nav__brand-name">StartERP</span>
                    {storeLabel && <span className="erp-nav__brand-sub">{storeLabel}</span>}
                </span>
            </Link>
            <div className="erp-nav__filter">
                <input
                    type="search"
                    value={query}
                    placeholder={t('Find a menu…')}
                    aria-label={t('Find a menu…')}
                    onChange={e => setQuery(e.target.value)}
                />
            </div>
            <div className="erp-nav__scroll">
                {groups.map(group => {
                    const visible = group.items.filter(i => matchesFilter(t(i.label), query));
                    if (visible.length === 0) return null;
                    const isCollapsed = !query && collapsed.includes(group.id);
                    const containsActive = active && group.items.some(i => i.id === active.id);
                    return (
                        <div key={group.id} className={'erp-nav__group' + (isCollapsed && !containsActive ? ' is-collapsed' : '')}>
                            <button
                                type="button"
                                className="erp-nav__group-btn"
                                aria-expanded={!(isCollapsed && !containsActive)}
                                onClick={() => toggleGroup(group.id)}
                            >
                                <span>{t(group.label)}</span>
                                <ChevronDown size={13} aria-hidden="true" />
                            </button>
                            {!(isCollapsed && !containsActive) && (
                                <ul className="erp-nav__list">{visible.map(renderItem)}</ul>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="erp-nav__footer">
                <ul className="erp-nav__list">{renderItem(MENU_SETTINGS_ITEM)}</ul>
            </div>
        </nav>
    );
}
