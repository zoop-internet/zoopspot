import React, { useRef, useEffect } from 'react';
import type { PortalMode } from '../../types';
import { Ico } from './Icons';
import { Icons } from './iconConstants';

interface NavbarProps {
  activeRoute: string;
  scrolled: boolean;
  isDocs: boolean;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  handleNav: (path: string) => void;
  isAuthenticated: boolean;
  user: { name?: string; plan?: string } | null;
  onLaunchConsole: (mode: PortalMode) => void;
  logout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeRoute,
  scrolled,
  isDocs,
  menuOpen,
  setMenuOpen,
  handleNav,
  isAuthenticated,
  user,
  onLaunchConsole,
  logout,
}) => {
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const prevMenuOpen = useRef(menuOpen);

  useEffect(() => {
    if (menuOpen) {
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('a, button');
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }
    } else if (prevMenuOpen.current) {
      menuBtnRef.current?.focus();
    }
    prevMenuOpen.current = menuOpen;
  }, [menuOpen]);

  const handleDrawerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setMenuOpen(false);
      menuBtnRef.current?.focus();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('a, button');
      if (!focusable || focusable.length === 0) return;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  };

  return (
    <>
      {/* ─── Topbar — distinct on docs (solid, not glass) ─────────────────── */}
      <header className={`lp-topbar ${scrolled ? 'scrolled' : ''} ${isDocs ? 'docs-topbar' : ''}`} role="banner">
        <a href="/" className="lp-brand" onClick={(e) => { e.preventDefault(); handleNav('/'); }} aria-label="Zoop Internet — go to homepage">
          <div className="lp-brand-icon">
            <img src="/zoopicon-32.webp" srcSet="/zoopicon-32.webp 1x, /zoopicon-192.webp 2x" alt="Zoop Internet" width={28} height={28} loading="eager" decoding="async" fetchPriority="high" />
          </div>
          <span className="lp-brand-text">Zoop</span>
          <span className="lp-brand-badge">Internet</span>
        </a>

        <nav className="lp-nav-pill" aria-label="Main Navigation">
          <a href="/" className={activeRoute === '/' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
            Overview
          </a>
          <a href="/how-it-works" className={activeRoute === '/how-it-works' || activeRoute === '/architecture' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/how-it-works'); }}>
            How It Works
          </a>
          <a href="/products" className={activeRoute === '/products' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/products'); }}>
            Products
          </a>
          <a href="/docs" className={activeRoute === '/docs' || activeRoute.startsWith('/docs/') || activeRoute === '/documentation' || activeRoute.startsWith('/documentation/') ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/docs'); }}>
            Docs
          </a>
          <a href="/pricing" className={activeRoute === '/pricing' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/pricing'); }}>
            Pricing
          </a>
          <a href="/downloads" className={activeRoute === '/downloads' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>
            Downloads
          </a>
          <a href="/security" className={activeRoute === '/security' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/security'); }}>
            Security
          </a>
        </nav>

        <div className="lp-topbar-actions">
          {isAuthenticated ? (
            <div className="lp-user-badge-container">
              <button
                className="lp-user-badge-btn"
                onClick={() => onLaunchConsole('user')}
                title="Go to Console"
              >
                <div className="lp-user-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'Z'}
                </div>
                <span className="lp-user-name">{user?.name || 'Account'}</span>
                <span className="lp-user-plan-badge">{user?.plan || 'Free'}</span>
              </button>
              <button className="lp-btn-secondary" onClick={() => onLaunchConsole('user')} title="Open Web Management Console">
                Console
              </button>
              <button className="lp-btn-ghost-logout" onClick={() => logout()} title="Sign Out">
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <a href="/auth?tab=signin" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signin'); }} title="Sign In">
                Sign In
              </a>
              <a href="/auth?tab=signup" className="lp-btn-primary" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }}>
                <Ico d={Icons.arrowRight} size={14} />
                Sign Up
              </a>
            </>
          )}
          <button
            ref={menuBtnRef}
            className="lp-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="lp-mobile-drawer"
          >
            <Ico d={menuOpen ? Icons.close : Icons.menu} size={20} />
          </button>
        </div>
      </header>

      {/* ─── Mobile Navigation Drawer ───────────────────────────────── */}
      {menuOpen && (
        <>
          <div className="lp-mobile-drawer-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div
            ref={drawerRef}
            id="lp-mobile-drawer"
            className="lp-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            onKeyDown={handleDrawerKeyDown}
          >
            <a href="/" onClick={(e) => { e.preventDefault(); handleNav('/'); setMenuOpen(false); }}>Overview</a>
            <a href="/how-it-works" onClick={(e) => { e.preventDefault(); handleNav('/how-it-works'); setMenuOpen(false); }}>How It Works</a>
            <a href="/products" onClick={(e) => { e.preventDefault(); handleNav('/products'); setMenuOpen(false); }}>Products</a>
            <a href="/docs" onClick={(e) => { e.preventDefault(); handleNav('/docs'); setMenuOpen(false); }}>Docs</a>
            <a href="/pricing" onClick={(e) => { e.preventDefault(); handleNav('/pricing'); setMenuOpen(false); }}>Pricing</a>
            <a href="/downloads" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); setMenuOpen(false); }}>Downloads</a>
            <a href="/security" onClick={(e) => { e.preventDefault(); handleNav('/security'); setMenuOpen(false); }}>Security</a>
            <div className="lp-mobile-drawer-divider" />
            {isAuthenticated ? (
              <>
                <button className="primary" onClick={() => { onLaunchConsole('user'); setMenuOpen(false); }}>Open Console</button>
                <button onClick={() => { logout(); setMenuOpen(false); }}>Sign Out</button>
              </>
            ) : (
              <>
                <a href="/auth?tab=signin" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signin'); setMenuOpen(false); }}>Sign In</a>
                <a href="/auth?tab=signup" className="primary" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); setMenuOpen(false); }}>Create Account</a>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
};
