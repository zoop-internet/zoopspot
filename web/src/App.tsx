import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AppProvider } from './context/NetworkContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { PortalMode } from './types';

export type { PortalMode };

const LandingPage = lazy(() => import('./landing/LandingPage').then(m => ({ default: m.LandingPage })));
const UserDashboard = lazy(() => import('./app/user/UserDashboard').then(m => ({ default: m.UserDashboard })));
const OrgDashboard = lazy(() => import('./app/org/OrgDashboard').then(m => ({ default: m.OrgDashboard })));
const AdminConsole = lazy(() => import('./admin/AdminConsole').then(m => ({ default: m.AdminConsole })));
const AuthPage = lazy(() => import('./auth/AuthPage').then(m => ({ default: m.AuthPage })));

// Route-specific meta for SEO (S4-05) — keep in sync with scripts/prerender.mjs
const ROUTE_META: Record<string, { title: string; desc: string }> = {
  '/': { title: 'Zoop — Secure Direct Device-to-Device Sharing | Private Mesh', desc: 'Share your home or phone internet directly with trusted devices — no VPN bottlenecks. WireGuard-encrypted, NAT-traversal, open-source & free. Install Zoop in 30 seconds.' },
  '/how-it-works': { title: 'How Zoop Works — Direct Encrypted Mesh Without VPN Bottlenecks', desc: 'Learn how Zoop creates direct WireGuard tunnels device-to-device, with STUN/TURN NAT traversal and zero-knowledge relays. No centralized payload routing.' },
  '/architecture': { title: 'How Zoop Works — Direct Encrypted Mesh Without VPN Bottlenecks', desc: 'Learn how Zoop creates direct WireGuard tunnels device-to-device, with STUN/TURN NAT traversal and zero-knowledge relays. No centralized payload routing.' },
  '/products': { title: 'Products — Zoop for Desktop, Mobile & Routers | One Ecosystem', desc: 'Zoop for Linux, macOS, Windows, Android, iOS & OpenWrt. One mesh across your computers, phones and home routers.' },
  '/downloads': { title: 'Download Zoop — Free for Linux, macOS, Windows, Mobile & Routers', desc: 'Download Zoop free: .deb, .pkg, .msi, APK, iOS beta & router .ipk. One-tap install, open-source MIT.' },
  '/security': { title: 'Security & Privacy — End-to-End Encrypted, Open Source, No Tracking', desc: 'Zoop is end-to-end encrypted (WireGuard), Ed25519 auth, zero tracking logs, open source & audited. Your traffic stays private.' },
  '/pricing': { title: 'Pricing — Free Personal, Teams Coming Soon | Zoop', desc: 'Free forever for personal (5 devices, unlimited tunnels). Organizations with fleet, audit and relay controls — join founding waitlist.' },
  '/docs': { title: 'Documentation — Quick Start, API, Architecture | Zoop', desc: 'Start in 30s, read architecture and API reference. Open-source MIT — GitHub docs, examples, and llms.txt for AI.' },
  '/auth': { title: 'Sign In — Zoop ID & PIN | Create Your Permanent Identity', desc: 'Sign in with your Zoop ID (ZP-...) and 6-digit PIN or create a new identity in 30 seconds. No email required.' },
  '/app': { title: 'Console — Personal Devices & Connections | Zoop', desc: 'Manage your Zoop devices, connections and sharing — private device mesh console.' },
  '/org': { title: 'Organization — Teams & Fleet Management | Zoop', desc: 'Manage organization members, fleet devices and access policies.' },
  '/admin': { title: 'Platform Admin — Overview & Operations | Zoop', desc: 'Operator console for Zoop cloud — health, relays, IPAM & audit.' },
};

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

  const [pathname, search] = currentUrl.split('?');
  const normalized = (pathname || '/').toLowerCase();
  const searchParams = new URLSearchParams(search || '');

  // Per-route title/description sync for SEO (covers S4-05)
  useEffect(() => {
    const key = normalized === '/auth' || normalized.startsWith('/auth') ? '/auth' : normalized;
    const meta = ROUTE_META[key] || ROUTE_META['/'];
    document.title = meta.title;
    const descTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (descTag) descTag.content = meta.desc;
    const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (ogTitle) ogTitle.content = meta.title;
    const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
    if (ogDesc) ogDesc.content = meta.desc;
  }, [normalized]);

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
  const hideDev = typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string,string> }).env?.VITE_HIDE_DEV_ADMIN === 'true';

  const Fallback: React.FC = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }} role="status" aria-live="polite" aria-busy="true">
      <div className="spinner" style={{ width: 28, height: 28 }} aria-hidden />
      <span style={{ color: '#8b9bb0', fontSize: 13 }}>Loading Zoop…</span>
    </div>
  );

  return (
    <AppProvider>
      <ErrorBoundary>
        <Suspense fallback={<Fallback />}>
          {isAuth ? (
            <AuthPage initialTab={initialAuthTab} redirectUrl={redirectUrl} onNavigate={navigateTo} />
          ) : isApp ? (
            <UserDashboard mode="user" onSwitch={handleSwitchMode} />
          ) : isOrg ? (
            <OrgDashboard mode="org" onSwitch={handleSwitchMode} />
          ) : isAdmin ? (
            <AdminConsole mode="admin" onSwitch={handleSwitchMode} />
          ) : (
            <LandingPage currentPath={pathname} onNavigate={navigateTo} onLaunchConsole={handleSwitchMode} />
          )}
        </Suspense>
      </ErrorBoundary>
      {!isAdmin && !hideDev && (
        <button
          onClick={() => navigateTo('/admin')}
          aria-label="Dev — open Platform Admin (only in development)"
          title="Dev → Admin Console (/admin) — hidden in production with VITE_HIDE_DEV_ADMIN=true"
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
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} aria-hidden />
          DEV → Admin
        </button>
      )}
    </AppProvider>
  );
};

export default App;
