import React, { useState, useEffect } from 'react';
import { LandingPage } from './landing/LandingPage';
import { UserDashboard } from './app/user/UserDashboard';
import { OrgDashboard } from './app/org/OrgDashboard';
import { AdminConsole } from './admin/AdminConsole';
import { AuthPage } from './auth/AuthPage';
import { AppProvider } from './context/NetworkContext';
import type { PortalMode } from './types';

export type { PortalMode };

const App: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState<string>(() => window.location.pathname + window.location.search);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentUrl(window.location.pathname + window.location.search);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (window.location.pathname + window.location.search !== path) {
      window.history.pushState({}, '', path);
      setCurrentUrl(path);
      window.scrollTo(0, 0);
    }
  };

  const handleSwitchMode = (mode: PortalMode) => {
    if (mode === 'user') navigateTo('/app');
    else if (mode === 'org') navigateTo('/org');
    else if (mode === 'admin') navigateTo('/admin');
    else if (mode === 'auth') navigateTo('/auth');
    else navigateTo('/');
  };

  // Parse path & search params
  const [pathname, search] = currentUrl.split('?');
  const normalized = (pathname || '/').toLowerCase();
  const searchParams = new URLSearchParams(search || '');

  const isAuth =
    normalized === '/auth' ||
    normalized === '/login' ||
    normalized === '/signin' ||
    normalized === '/sign-in' ||
    normalized === '/signup' ||
    normalized === '/sign-up' ||
    normalized === '/register';

  const isApp = normalized === '/app' || normalized === '/user';
  const isOrg = normalized === '/org';
  const isAdmin = normalized === '/admin';

  const initialAuthTab =
    normalized.includes('signup') ||
    normalized.includes('sign-up') ||
    normalized.includes('register') ||
    searchParams.get('tab') === 'signup'
      ? 'signup'
      : 'signin';

  const redirectUrl = searchParams.get('redirect_url') || '/app';

  return (
    <AppProvider>
      {isAuth ? (
        <AuthPage
          initialTab={initialAuthTab}
          redirectUrl={redirectUrl}
          onNavigate={navigateTo}
        />
      ) : isApp ? (
        <UserDashboard mode="user" onSwitch={handleSwitchMode} />
      ) : isOrg ? (
        <OrgDashboard mode="org" onSwitch={handleSwitchMode} />
      ) : isAdmin ? (
        <AdminConsole mode="admin" onSwitch={handleSwitchMode} />
      ) : (
        <LandingPage
          currentPath={pathname}
          onNavigate={navigateTo}
          onLaunchConsole={handleSwitchMode}
        />
      )}
      {/* Dev shortcut — always visible to reach Admin Console (hidden in production builds if VITE_HIDE_DEV_ADMIN is set) */}
      {!isAdmin && (
        <button
          onClick={() => navigateTo('/admin')}
          aria-label="Dev — open Admin Console"
          title="Dev → Admin Console (/admin)"
          style={{
            position: 'fixed',
            bottom: 18,
            left: 18,
            zIndex: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 999,
            background: 'rgba(12,14,20,0.9)',
            border: '1px solid rgba(8,242,255,0.35)',
            color: '#38bdf8',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(8,242,255,0.12)',
            cursor: 'pointer',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
          DEV → Admin
        </button>
      )}
    </AppProvider>
  );
};

export default App;
