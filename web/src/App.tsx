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
import { AwsSpinner } from './components/AwsSpinner';

// Route-specific meta for SEO (S4-05) — keep in sync with scripts/prerender.mjs
const ROUTE_META: Record<string, { title: string; desc: string }> = {
  '/': { title: 'Zoop — Secure Direct Device-to-Device Sharing | Private Mesh', desc: 'Share your home or phone internet directly with trusted devices — no VPN bottlenecks. WireGuard-encrypted, NAT-traversal, open-source & free. Install Zoop in 30 seconds.' },
  '/how-it-works': { title: 'How Zoop Works — Direct Encrypted Mesh Without VPN Bottlenecks', desc: 'Learn how Zoop creates direct WireGuard tunnels device-to-device, with STUN/TURN NAT traversal and zero-knowledge relays. No centralized payload routing.' },
  '/products': { title: 'Products — Zoop for Desktop, Mobile & Routers | One Ecosystem', desc: 'Zoop for Linux, macOS, Windows, Android, iOS & OpenWrt. One mesh across your computers, phones and home routers.' },
  '/downloads': { title: 'Download Zoop — Free for Linux, macOS, Windows, Mobile & Routers', desc: 'Download Zoop free: .deb, .pkg, .msi, APK, iOS beta & router .ipk. One-tap install, open-source MIT.' },
  '/security': { title: 'Security & Privacy — End-to-End Encrypted, Open Source, No Tracking', desc: 'Zoop is end-to-end encrypted (WireGuard), Ed25519 auth, zero tracking logs, open source & audited. Your traffic stays private.' },
  '/pricing': { title: 'Pricing — Free Personal, Teams Coming Soon | Zoop', desc: 'Free forever for personal (5 devices, unlimited tunnels). Organizations with fleet, audit and relay controls — join founding waitlist.' },
  '/docs': { title: 'Documentation — Quick Start, API, Architecture | Zoop', desc: 'Start in 30s, read architecture and API reference. Open-source MIT — GitHub docs, examples, and llms.txt for AI.' },
  '/auth': { title: 'Sign In — Zoop ID & PIN | Create Your Permanent Identity', desc: 'Sign in with your Zoop ID (ZP-...) and 6-digit PIN or create a new identity in 30 seconds. No email required.' },
  '/app': { title: 'Console — Personal Devices & Connections | Zoop', desc: 'Manage your Zoop devices, connections and sharing — private device mesh console.' },
  '/org': { title: 'Organization — Teams & Fleet Management | Zoop', desc: 'Manage organization members, fleet devices and access policies.' },
  '/admin': { title: 'Platform Admin — Overview & Operations | Zoop', desc: 'Operator console for Zoop cloud — health, relays, IPAM & audit.' },
  '/privacy': { title: 'Privacy Policy — Zero Logging & Cryptographic Mesh | Zoop', desc: 'Zoop Privacy Policy: Zero logging of payload traffic, browsing history, DNS or destination IPs. End-to-end WireGuard encrypted, open source.' },
  '/terms': { title: 'Terms of Service & EULA — Peer-to-Peer Mesh | Zoop', desc: 'Zoop Terms of Service and End User License Agreement: Peer-to-peer network usage, acceptable use policy, and licensing.' },
  '/blog': { title: 'Blog & Stories — Peer-to-Peer Freedom & Guides | Zoop', desc: 'Read stories, guides, and insights on peer-to-peer sharing, travel connectivity, and lag-free private device networking.' },
};

function normalizePath(raw: string): string {
  const withoutHash = raw.split('#')[0] ?? raw;
  const withoutQuery = withoutHash.split('?')[0] ?? withoutHash;
  let p = withoutQuery.trim().toLowerCase() || '/';
  if (!p.startsWith('/')) p = '/' + p;
  // strip trailing slash except root, collapse doubles
  p = p.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  return p;
}

const VALID_ROUTES = new Set([
  '/', '/how-it-works', '/products', '/downloads', '/security', '/pricing', '/docs',
  '/blog',
  '/privacy', '/privacy-policy', '/terms', '/terms-of-service', '/eula',
  '/auth', '/login', '/signin', '/sign-in', '/signup', '/sign-up', '/register',
  '/app', '/user', '/org', '/admin',
]);

const App: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState<string>(() => window.location.pathname + window.location.search + window.location.hash);

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    const handleNav = () => {
      setCurrentUrl(window.location.pathname + window.location.search + window.location.hash);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    window.addEventListener('popstate', handleNav);
    window.addEventListener('hashchange', handleNav);
    return () => {
      window.removeEventListener('popstate', handleNav);
      window.removeEventListener('hashchange', handleNav);
    };
  }, []);

  const navigateTo = (path: string) => {
    const target = path || '/';
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (current !== target) {
      window.history.pushState({}, '', target);
      setCurrentUrl(target);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleSwitchMode = (mode: PortalMode) => {
    if (mode === 'user') navigateTo('/app');
    else if (mode === 'org') navigateTo('/org');
    else if (mode === 'admin') navigateTo('/admin');
    else if (mode === 'auth') navigateTo('/auth');
    else navigateTo('/');
  };

  // Robust split: keep full query string handling via URL
  const urlForParse = new URL(currentUrl, window.location.origin);
  const pathname = urlForParse.pathname;
  const normalized = normalizePath(pathname);
  const searchParams = urlForParse.searchParams;
  const isValidRoute =
    VALID_ROUTES.has(normalized) ||
    normalized.startsWith('/docs') ||
    normalized.startsWith('/blog') ||
    normalized.startsWith('/app') ||
    normalized.startsWith('/user') ||
    normalized.startsWith('/org') ||
    normalized.startsWith('/admin') ||
    normalized.startsWith('/auth');
  const pathnameForLanding = isValidRoute ? pathname : '/';

  // Handle alias redirects client-side
  useEffect(() => {
    if (normalized === '/architecture') {
      window.history.replaceState({}, '', '/how-it-works');
      setCurrentUrl('/how-it-works');
    }
  }, [normalized]);

  // Per-route title/description/canonical sync for SEO (covers S4-05 + canonical)
  useEffect(() => {
    const key = normalized === '/auth' || normalized.startsWith('/auth') || ['/login','/signin','/sign-in','/signup','/sign-up','/register'].includes(normalized) ? '/auth'
      : (normalized === '/app' || normalized.startsWith('/app') || ['/app','/user'].includes(normalized) ? '/app' : (normalized === '/privacy-policy' ? '/privacy' : (['/terms-of-service','/eula'].includes(normalized) ? '/terms' : (normalized.startsWith('/blog') ? '/blog' : normalized))));
    const meta = ROUTE_META[key] || ROUTE_META['/'];
    document.title = isValidRoute ? meta.title : 'Not Found — Zoop';
    if (!isValidRoute) console.warn('[zoop] unknown route:', normalized, '→ falling back to landing');
    const descTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (descTag) descTag.content = isValidRoute ? meta.desc : 'Page not found — return to Zoop Internet homepage.';
    const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (ogTitle) ogTitle.content = document.title;
    const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
    if (ogDesc) ogDesc.content = descTag?.content ?? meta.desc;
    // Canonical per route — prevents duplicate content (SEO)
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.href = `https://zoopnetwork.app${normalized === '/' ? '/' : normalized}`;
    const ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    if (ogUrl) ogUrl.content = `https://zoopnetwork.app${normalized === '/' ? '/' : normalized}`;
  }, [normalized, isValidRoute]);

  const isAuth =
    normalized === '/auth' ||
    normalized.startsWith('/auth/') ||
    normalized === '/login' ||
    normalized === '/signin' ||
    normalized === '/sign-in' ||
    normalized === '/signup' ||
    normalized === '/sign-up' ||
    normalized === '/register';

  const isApp = normalized === '/app' || normalized.startsWith('/app/') || normalized === '/user' || normalized.startsWith('/user/');
  const isOrg = normalized === '/org' || normalized.startsWith('/org/');
  const isAdmin = normalized === '/admin' || normalized.startsWith('/admin/');

  const initialAuthTab =
    normalized.includes('signup') ||
    normalized.includes('sign-up') ||
    normalized.includes('register') ||
    searchParams.get('tab') === 'signup'
      ? 'signup'
      : 'signin';

  const redirectUrl = searchParams.get('redirect_url') || '/app';

const Fallback: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#000000' }} role="status" aria-live="polite" aria-busy="true">
    <AwsSpinner size={32} />
  </div>
);

const NotFound: React.FC<{ path: string; onNavigate: (p: string) => void }> = ({ path, onNavigate }) => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: '#020617', color: '#f1f5f9', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
    <a href="/" onClick={(e) => { e.preventDefault(); onNavigate('/'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 28 }}>
      <img src="/zoopicon-32.webp" alt="Zoop Internet" width={32} height={32} />
      <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>Zoop <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.28)', padding: '2px 8px', borderRadius: 999 }}>Internet</span></span>
    </a>
    <div style={{ fontSize: '5rem', fontWeight: 900, letterSpacing: '-0.04em', color: '#38bdf8', lineHeight: 1 }}>404</div>
    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '14px 0 0' }}>Page not found</h1>
    <p style={{ color: '#94a3b8', margin: '10px 0 0', maxWidth: 500, lineHeight: 1.6, fontSize: '1rem' }}>No route matches <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 6, fontFamily: 'var(--font-mono, monospace)', fontSize:'0.8125rem', color: '#38bdf8' }}>{path}</code>. Check the URL or return home.</p>
    <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
      <button className="lp-btn-primary" onClick={() => onNavigate('/')} style={{ padding: '12px 24px', borderRadius: 10, background: '#38bdf8', color: '#020617', border: 0, fontWeight: 700, cursor: 'pointer', fontSize: '0.9375rem' }}>Go to homepage</button>
      <button className="lp-btn-secondary" onClick={() => onNavigate('/docs')} style={{ padding: '12px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem' }}>Documentation</button>
      <button className="lp-btn-secondary" onClick={() => window.history.back()} style={{ padding: '12px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem' }}>Go back</button>
    </div>
    <nav style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 16, fontSize: '0.8125rem', color: '#94a3b8', flexWrap: 'wrap', justifyContent: 'center' }} aria-label="Popular navigation links">
      <a href="/how-it-works" onClick={e => { e.preventDefault(); onNavigate('/how-it-works'); }} style={{ color: '#38bdf8', textDecoration: 'none' }}>How It Works</a>
      <span>·</span>
      <a href="/products" onClick={e => { e.preventDefault(); onNavigate('/products'); }} style={{ color: '#38bdf8', textDecoration: 'none' }}>Products</a>
      <span>·</span>
      <a href="/downloads" onClick={e => { e.preventDefault(); onNavigate('/downloads'); }} style={{ color: '#38bdf8', textDecoration: 'none' }}>Downloads</a>
      <span>·</span>
      <a href="/pricing" onClick={e => { e.preventDefault(); onNavigate('/pricing'); }} style={{ color: '#38bdf8', textDecoration: 'none' }}>Pricing</a>
      <span>·</span>
      <a href="/security" onClick={e => { e.preventDefault(); onNavigate('/security'); }} style={{ color: '#38bdf8', textDecoration: 'none' }}>Security</a>
      <span>·</span>
      <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>GitHub</a>
    </nav>
  </div>
);

  return (
    <AppProvider>
      <ErrorBoundary>
        <Suspense fallback={<Fallback />}>
          {!isValidRoute ? (
            <NotFound path={pathname} onNavigate={navigateTo} />
          ) : isAuth ? (
            <AuthPage initialTab={initialAuthTab} redirectUrl={redirectUrl} onNavigate={navigateTo} />
          ) : isApp ? (
            <ErrorBoundary><UserDashboard mode="user" onSwitch={handleSwitchMode} currentPath={pathname} onNavigate={navigateTo} /></ErrorBoundary>
          ) : isOrg ? (
            <ErrorBoundary><OrgDashboard mode="org" onSwitch={handleSwitchMode} currentPath={pathname} onNavigate={navigateTo} /></ErrorBoundary>
          ) : isAdmin ? (
            <ErrorBoundary><AdminConsole mode="admin" onSwitch={handleSwitchMode} currentPath={pathname} onNavigate={navigateTo} /></ErrorBoundary>
          ) : (
            <LandingPage currentPath={pathnameForLanding} onNavigate={navigateTo} onLaunchConsole={handleSwitchMode} />
          )}
        </Suspense>
      </ErrorBoundary>
    </AppProvider>
  );
};

export default App;
