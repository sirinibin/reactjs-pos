import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/auth/AuthContext';
import { ALL_ITEMS, itemForPath } from '@/shell/nav';
import { useItemAllowed } from '@/shell/useVisibleNav';
import { EmptyState } from '@/ui/Misc';
import { Spinner } from '@/ui/Misc';

export function Boot() {
  return <div className="full-center"><div className="boot"><span className="logo">S</span><Spinner /></div></div>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const loc = useLocation();
  if (status === 'loading') return <Boot />;
  if (status === 'signed-out') return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

/** Blocks pages whose nav item is hidden by feature flags or permissions. */
export function RequireAccess({ navId, children }: { navId?: string; children: ReactNode }) {
  const { t } = useTranslation();
  const loc = useLocation();
  const allowed = useItemAllowed();
  const item = navId ? ALL_ITEMS.find((i) => i.id === navId) : itemForPath(loc.pathname);
  if (item && !allowed(item)) {
    return (
      <div className="pad">
        <EmptyState icon="lock" title={t('You don’t have access to this page.')} action={<a className="btn" href="/home">{t('Go home')}</a>}>
          {t('Ask an administrator to enable this module or grant you permission.')}
        </EmptyState>
      </div>
    );
  }
  return <>{children}</>;
}
