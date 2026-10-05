import { Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '@/auth/AuthContext';
import { LoginPage } from '@/auth/LoginPage';
import { AuthHandoff } from '@/auth/AuthHandoff';
import { ToastProvider } from '@/ui/Toast';
import { AppShell } from '@/shell/AppShell';
import { WorkspaceProvider } from '@/shell/Workspace';
import { ALL_ITEMS } from '@/shell/nav';
import { applyDensity, applyTheme, getDensity, getTheme } from '@/shell/prefs';
import { EmptyState } from '@/ui/Misc';
import { ApiError } from '@/api/client';
import { Boot, RequireAccess, RequireAuth } from './Guards';
import { ErrorBoundary } from './ErrorBoundary';
import { MODULE_ROUTES } from './modules';
import { useLandingPath } from '@/shell/useVisibleNav';

function LandingRedirect() {
  return <Navigate to={useLandingPath()} replace />;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
      },
      mutations: { retry: false },
    },
  });
}

function NotFound() {
  const { t } = useTranslation();
  return <div className="pad"><EmptyState icon="search" title={t('Page not found')} action={<a className="btn" href="/home">{t('Go home')}</a>} /></div>;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { document.getElementById('content')?.scrollTo(0, 0); }, [pathname]);
  return null;
}

const shellRoutes = MODULE_ROUTES.filter((r) => !r.bare);
const bareRoutes = MODULE_ROUTES.filter((r) => r.bare);
const legacyRedirects = ALL_ITEMS.flatMap((i) => (i.legacy || []).map((from) => ({ from, to: i.path })));

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth" element={<AuthHandoff />} />
      <Route path="/" element={<RequireAuth><LandingRedirect /></RequireAuth>} />
      {legacyRedirects.map((r) => <Route key={r.from} path={r.from} element={<Navigate to={r.to} replace />} />)}
      {bareRoutes.map((r) => (
        <Route key={r.path} path={r.path} element={r.public ? <Suspense fallback={<Boot />}><r.component /></Suspense> : <RequireAuth><Suspense fallback={<Boot />}><r.component /></Suspense></RequireAuth>} />
      ))}
      <Route
        path="*"
        element={
          <RequireAuth>
            <WorkspaceProvider>
              <AppShell>
                <ScrollTop />
                <ErrorBoundary>
                  <Suspense fallback={<div className="pad"><span className="spin" /></div>}>
                    <Routes>
                      {shellRoutes.map((r) => (
                        <Route key={r.path} path={r.path} element={<RequireAccess navId={r.navId}><r.component /></RequireAccess>} />
                      ))}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </AppShell>
            </WorkspaceProvider>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

const queryClient = createQueryClient();

export default function App() {
  useEffect(() => {
    applyTheme(getTheme());
    applyDensity(getDensity());
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
