import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PanelLeft, Menu as MenuIcon } from 'lucide-react';
import '../theme/erp.css';
import '../theme/legacy-bridge.css';
import Topbar from '../../Topbar';
import { IconButton, ToastProvider } from '../ui';
import SideNav from './SideNav';
import CommandPalette from './CommandPalette';
import ErpFooter from './ErpFooter';
import { useNavItems } from './useNavItems';

const RAIL_KEY = 'erp_nav_rail';

function isNarrow() {
    return typeof window !== 'undefined' && window.innerWidth <= 991.98;
}

/**
 * ERP application frame: grouped side navigation, a header that hosts the
 * classic top bar (store switcher, notifications, language, user menu) plus
 * the command palette, the page, and the footer.
 */
export default function AppShell({ children, showToastMessage, flush }) {
    const { items, store } = useNavItems();
    const { pathname } = useLocation();
    const [rail, setRail] = useState(() => localStorage.getItem(RAIL_KEY) === '1');
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => { setMobileOpen(false); }, [pathname]);

    function toggleNav() {
        if (isNarrow()) {
            setMobileOpen(o => !o);
            return;
        }
        setRail(r => {
            const next = !r;
            try { localStorage.setItem(RAIL_KEY, next ? '1' : '0'); } catch (_) { }
            return next;
        });
    }

    return (
        <ToastProvider>
            <div className={'erp-shell' + (rail ? ' is-nav-collapsed' : '') + (mobileOpen ? ' is-nav-open' : '')}>
                <SideNav items={items} store={store} onNavigate={() => setMobileOpen(false)} />
                <div className="erp-nav-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />
                <div className="erp-shell__main">
                    <header className="erp-header">
                        <IconButton
                            className="erp-header__toggle"
                            icon={isNarrow() ? MenuIcon : PanelLeft}
                            label="Toggle navigation"
                            onClick={toggleNav}
                        />
                        <div className="erp-header__legacy">
                            <Topbar
                                parentCallback={toggleNav}
                                showToastMessage={showToastMessage}
                                centerSlot={<CommandPalette items={items} />}
                            />
                        </div>
                    </header>
                    <main className="erp-shell__content content" style={flush ? { padding: 0 } : undefined}>{children}</main>
                    <ErpFooter />
                </div>
            </div>
        </ToastProvider>
    );
}
