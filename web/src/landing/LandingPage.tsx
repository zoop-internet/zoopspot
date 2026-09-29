import React, { useState, useEffect, useRef } from 'react';
import type { PortalMode } from '../types';
import './LandingPage.css';

import { Ico } from './components/Icons';
import { Icons } from './components/iconConstants';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

import { OverviewPage } from './pages/OverviewPage';
import { AwsSpinner } from '../components/AwsSpinner';

const HowItWorksPage = React.lazy(() => import('./pages/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })));
const ProductsPage = React.lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const DownloadsPage = React.lazy(() => import('./pages/DownloadsPage').then(m => ({ default: m.DownloadsPage })));
const PricingPage = React.lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const SecurityPage = React.lazy(() => import('./pages/SecurityPage').then(m => ({ default: m.SecurityPage })));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = React.lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const DocsView = React.lazy(() => import('./pages/DocsView').then(m => ({ default: m.DocsView })));
const BlogPage = React.lazy(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPage })));

/* ─── Main Landing Page Component ──────────────────────────────────────── */
export const LandingPage: React.FC<{
  currentPath?: string;
  onNavigate: (path: string) => void;
  onLaunchConsole: (mode: PortalMode) => void;
}> = ({ currentPath = '/', onNavigate, onLaunchConsole }) => {
  const activeRoute = currentPath.toLowerCase();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloadToast, setDownloadToast] = useState<{ platform: string; file: string } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingVisible, setLoadingVisible] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [waitlistMsg, setWaitlistMsg] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
      const scrolledPct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      const dismissed = sessionStorage.getItem('zoop_sticky_dismissed') === '1';
      setShowStickyCta(!dismissed && scrolledPct > 0.6 && scrolledPct < 0.92);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Accessibility: focus trap + escape for mobile drawer + restore scroll lock
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  // Guarantee immediate scroll-to-top whenever activeRoute changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeRoute]);

  const navTimersRef = useRef<number[]>([]);
  const handleNav = (path: string) => {
    if (currentPath === path) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Navigate immediately for optimal INP and perceived performance
    onNavigate(path);
    // Concurrent progress animation feedback
    navTimersRef.current.forEach(id => clearTimeout(id));
    navTimersRef.current = [];
    setLoadingVisible(true);
    setLoadingProgress(40);
    requestAnimationFrame(() => setLoadingProgress(100));
    const t1 = window.setTimeout(() => {
      setLoadingVisible(false);
      setLoadingProgress(0);
    }, 150);
    navTimersRef.current.push(t1);
  };
  useEffect(() => () => { navTimersRef.current.forEach(id => clearTimeout(id)); }, []);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleDownloadClick = (platform: string, file: string) => {
    const base = (import.meta.env.VITE_RELEASES_BASE as string | undefined)?.replace(/\/$/, '');
    const isExternal = file.startsWith('http');
    if (isExternal) {
      window.open(file, '_blank', 'noopener');
      setDownloadToast({ platform, file: 'External link opened' });
    } else if (base) {
      const url = `${base}/${file}`;
      window.open(url, '_blank', 'noopener');
      setDownloadToast({ platform, file });
    } else {
      // Honest pending: releases not yet published — use install script + waitlist
      setDownloadToast({ platform, file: `${file} — early builds via install script; full releases opening soon` });
    }
    setTimeout(() => setDownloadToast(null), 5500);
  };

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = waitlistEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWaitlistStatus('error');
      setWaitlistMsg('Enter a valid email address');
      return;
    }
    setWaitlistStatus('loading');
    setWaitlistMsg('');
    try {
      // Try real endpoint if configured, else simulate success and persist locally for demo
      const endpoint = (import.meta.env.VITE_WAITLIST_URL as string | undefined);
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'pricing_teams', plan: 'teams' }),
        });
        if (!res.ok) throw new Error('Waitlist unavailable');
      } else {
        await new Promise(r => setTimeout(r, 700));
        const list = JSON.parse(localStorage.getItem('zoop_waitlist') || '[]');
        if (!list.includes(email)) {
          list.push(email);
          localStorage.setItem('zoop_waitlist', JSON.stringify(list));
        }
      }
      setWaitlistStatus('success');
      setWaitlistMsg('You’re on the founding list — we’ll email you early access + lock $8/seat.');
      setWaitlistEmail('');
    } catch {
      setWaitlistStatus('error');
      setWaitlistMsg('Could not join right now. Please try again or email support@zoopnetwork.app');
    }
  };

  const isDocs = activeRoute === '/docs' || activeRoute.startsWith('/docs/') || activeRoute === '/documentation' || activeRoute.startsWith('/documentation/');

  return (
    <div className="landing-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {/* ─── YouTube/GitHub-style Top Progress Loading Bar ──────────── */}
      {loadingVisible && (
        <div
          className="lp-top-loading-bar"
          style={{
            width: `${loadingProgress}%`,
            opacity: loadingProgress === 100 ? 0.3 : 1,
          }}
        />
      )}

      {/* ─── Topbar & Mobile Drawer ───────────────────────────────── */}
      <Navbar
        activeRoute={activeRoute}
        scrolled={scrolled}
        isDocs={isDocs}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        handleNav={handleNav}
        onLaunchConsole={onLaunchConsole}
      />

      {/* ─── Animated Page Content Container ────────────────────────── */}
      <main id="main-content" className="lp-page-content-animated" key={activeRoute} tabIndex={-1}>
        <React.Suspense fallback={
          <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} role="status" aria-live="polite">
            <AwsSpinner size={32} />
          </div>
        }>
          {/* ─── DOCS — professional sidebar + rendered markdown from /docs/*.md ─ */}
          {isDocs && (
            <DocsView
              key={activeRoute}
              onNavigateHome={() => handleNav('/')}
            />
          )}

          {/* ─── DEDICATED PRICING PAGE ───────────────────────────────── */}
          {activeRoute === '/pricing' && (
            <PricingPage
              handleNav={handleNav}
              handleWaitlist={handleWaitlist}
              waitlistEmail={waitlistEmail}
              setWaitlistEmail={setWaitlistEmail}
              waitlistStatus={waitlistStatus}
              setWaitlistStatus={setWaitlistStatus}
              waitlistMsg={waitlistMsg}
            />
          )}

          {/* ─── DEDICATED DOWNLOADS PAGE ───────────────────────────────── */}
          {activeRoute === '/downloads' && (
            <DownloadsPage
              handleNav={handleNav}
              handleDownloadClick={handleDownloadClick}
              copyText={copyText}
              copiedCmd={copiedCmd}
            />
          )}

          {/* ─── DEDICATED HOW IT WORKS PAGE ────────────────────────────── */}
          {(activeRoute === '/how-it-works' || activeRoute === '/architecture') && (
            <HowItWorksPage handleNav={handleNav} />
          )}

          {/* ─── DEDICATED PRODUCTS PAGE ────────────────────────────────── */}
          {activeRoute === '/products' && (
            <ProductsPage handleNav={handleNav} />
          )}

          {/* ─── DEDICATED SECURITY PAGE ────────────────────────────────── */}
          {activeRoute === '/security' && (
            <SecurityPage handleNav={handleNav} />
          )}

          {/* ─── DEDICATED PRIVACY POLICY PAGE ───────────────────────────── */}
          {(activeRoute === '/privacy' || activeRoute === '/privacy-policy') && (
            <PrivacyPage handleNav={handleNav} />
          )}

          {/* ─── DEDICATED TERMS OF SERVICE & EULA PAGE ───────────────────── */}
          {(activeRoute === '/terms' || activeRoute === '/terms-of-service' || activeRoute === '/eula') && (
            <TermsPage handleNav={handleNav} />
          )}

          {/* ─── DEDICATED BLOG SECTION ───────────────────────────────── */}
          {(activeRoute === '/blog' || activeRoute.startsWith('/blog/')) && (
            <BlogPage currentPath={activeRoute} handleNav={handleNav} />
          )}

          {/* ─── DEFAULT OVERVIEW / HOME PAGE ───────────────────────────── */}
          {activeRoute === '/' && (
            <OverviewPage
              handleNav={handleNav}
              onLaunchConsole={onLaunchConsole}
            />
          )}
        </React.Suspense>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <Footer handleNav={handleNav} onLaunchConsole={onLaunchConsole} />

      {/* ─── Non-Intrusive Download Feedback Toast ─────────────────── */}
      {downloadToast && (
        <div className="lp-toast-container">
          <div className="lp-toast" role="status" aria-live="polite">
            <div className="lp-toast-icon">
              <Ico d={Icons.check} size={18} />
            </div>
            <div>
              <strong>Download:</strong> {downloadToast.platform} — <code>{downloadToast.file}</code>
            </div>
            <button
              className="lp-toast-close"
              onClick={() => setDownloadToast(null)}
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ─── Sticky Bottom CTA — after 60% scroll, dismiss persists */}
      {activeRoute === '/' && showStickyCta && (
        <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px 10px 16px', borderRadius: 999, background: 'rgba(12,14,20,0.92)', border: '1px solid rgba(8,242,255,0.28)', boxShadow: '0 12px 32px rgba(0,0,0,0.6), 0 0 20px rgba(8,242,255,0.15)', backdropFilter: 'blur(16px)' }} role="region" aria-label="Quick actions">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f7fbff', whiteSpace: 'nowrap' }}>Ready to monetize?</span>
          <a href="/portal?hotspot=demo&mac=AA:BB:CC:11:22:33" className="lp-btn-secondary" style={{ minHeight: 36, padding: '0 12px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={(e) => { e.preventDefault(); handleNav('/portal?hotspot=demo&mac=AA:BB:CC:11:22:33'); }}>Try Captive Portal</a>
          <a href="/auth?tab=signup" className="lp-btn-primary" style={{ minHeight: 36, padding: '0 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }}>Start ZoopSpot Free <Ico d={Icons.arrowRight} size={14} /></a>
          <button onClick={() => { setShowStickyCta(false); try { sessionStorage.setItem('zoop_sticky_dismissed', '1'); } catch {} }} aria-label="Dismiss" style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ico d={Icons.close} size={14} /></button>
        </div>
      )}
    </div>
  );
};
