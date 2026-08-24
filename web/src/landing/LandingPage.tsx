import React, { useState, useEffect, useRef } from 'react';
import type { PortalMode } from '../types';
import './LandingPage.css';

/* ─── SVG Icon Helper ─────────────────────────────────────────────────── */
const Ico: React.FC<{ d: string | React.ReactNode; size?: number; className?: string }> = ({
  d,
  size = 18,
  className = '',
}) =>
  typeof d === 'string' ? (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={d} />
    </svg>
  ) : (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {d}
    </svg>
  );

const Icons = {
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  terminal: (
    <>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </>
  ),
  cpu: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  server: (
    <>
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </>
  ),
  laptop: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </>
  ),
  smartphone: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </>
  ),
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  apple: (
    <path d="M12 20.94c1.5 0 2.75-.7 3.5-.7.8 0 2 .7 3.5.7 2.15 0 3.7-1.8 4.7-3.2-1.3-.7-2.15-2.2-2.15-3.8 0-2.4 1.85-3.6 2-3.7-1-.95-2.4-1.45-3.7-1.45-1.5 0-2.6.75-3.5.75-.85 0-2.15-.75-3.65-.75-2.2 0-4.3 1.4-5.3 3.6-1.5 3.1-.4 7.6 1.4 10.3 1 1.4 2.15 2.8 3.65 2.8zM15.4 5.3c.7-.9 1.15-2.1 1-3.3-1 .1-2.2.7-2.9 1.5-.6.8-1.2 2-1 3.2 1.1 0 2.2-.6 2.9-1.4z" />
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  arrowRight: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  menu: (
    <>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>
  ),
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  router: (
    <>
      <rect x="2" y="8" width="20" height="8" rx="2" />
      <line x1="6" y1="12" x2="6.01" y2="12" />
      <line x1="10" y1="12" x2="10.01" y2="12" />
      <line x1="14" y1="12" x2="14.01" y2="12" />
      <line x1="18" y1="4" x2="18" y2="8" />
      <line x1="6" y1="4" x2="6" y2="8" />
    </>
  ),
};

/* ─── Animated Counter Component ───────────────────────────────────────── */
function AnimatedCounter({ end, unit = '', decimals = 0 }: { end: number; unit?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let startTimestamp: number | null = null;
    const duration = 1400;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(ease * end);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setVal(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [started, end]);

  return (
    <span ref={ref}>
      {decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()}
      {unit}
    </span>
  );
}

/* ─── Big Bent-Arrow Network Illustration ──────────────────────────────── */
const BentArrowMeshIllustration: React.FC = () => {
  return (
    <div className="lp-bent-mesh-wrap" aria-label="Direct Internet Sharing Between Devices">
      <div className="lp-mesh-ambient-glow" />

      <svg className="lp-bent-svg" viewBox="0 0 540 440">
        <defs>
          <linearGradient id="curveGradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#126cff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#08f2ff" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="curveGradGreen" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14f06d" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#08f2ff" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="curveGradLime" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#126cff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#b9ff00" stopOpacity="0.95" />
          </linearGradient>

          {/* Arrow markers */}
          <marker id="arrowCyan" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#08f2ff" />
          </marker>
          <marker id="arrowGreen" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#14f06d" />
          </marker>
          <marker id="arrowLime" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#b9ff00" />
          </marker>
        </defs>

        {/* Ambient faint guide rings */}
        <circle cx="270" cy="220" r="140" fill="none" stroke="rgba(8, 242, 255, 0.1)" strokeWidth="1" strokeDasharray="4,6" />
        <circle cx="270" cy="220" r="220" fill="none" stroke="rgba(20, 240, 109, 0.08)" strokeWidth="1" strokeDasharray="4,8" />

        {/* 1. Curved Bent Arrow from Home Broadband (top-left) -> Laptop on the Road (top-right) */}
        <path
          d="M 130 90 C 220 15, 320 20, 410 95"
          stroke="url(#curveGradCyan)"
          className="lp-bent-arrow-path"
          markerEnd="url(#arrowCyan)"
        />

        {/* 2. Curved Bent Arrow from Mobile Phone (bottom-left) -> Laptop on the Road (top-right) */}
        <path
          d="M 130 350 C 200 240, 310 200, 420 140"
          stroke="url(#curveGradGreen)"
          className="lp-bent-arrow-path"
          markerEnd="url(#arrowGreen)"
        />

        {/* 3. Curved Bent Arrow from Home Broadband (top-left) -> Friends / Team Device (bottom-right) */}
        <path
          d="M 140 130 C 220 240, 310 280, 410 340"
          stroke="url(#curveGradLime)"
          className="lp-bent-arrow-path"
          markerEnd="url(#arrowLime)"
        />

        {/* 4. Direct Bridge Rays to Central Zoop Core */}
        <line x1="270" y1="220" x2="110" y2="80" stroke="rgba(8, 242, 255, 0.22)" strokeWidth="1.5" strokeDasharray="3,4" />
        <line x1="270" y1="220" x2="430" y2="80" stroke="rgba(8, 242, 255, 0.22)" strokeWidth="1.5" strokeDasharray="3,4" />
        <line x1="270" y1="220" x2="110" y2="360" stroke="rgba(20, 240, 109, 0.22)" strokeWidth="1.5" strokeDasharray="3,4" />
        <line x1="270" y1="220" x2="430" y2="360" stroke="rgba(185, 255, 0, 0.22)" strokeWidth="1.5" strokeDasharray="3,4" />
      </svg>

      {/* Floating Flow Tooltip Badges on the Curved Paths */}
      <div className="lp-flow-badge top-flow">
        ⚡ Encrypted Direct Tunnel
      </div>
      <div className="lp-flow-badge bot-flow">
        🔒 Zero Logs · 100% Private
      </div>

      {/* Central Zoop Hub */}
      <div className="lp-node-center-hub" title="Zoop Direct Bridge">
        <img src="/zoopicontransparent.png" alt="Zoop Core" />
      </div>

      {/* Node 1: Home Wi-Fi & Broadband */}
      <div className="lp-device-node lp-node-home">
        <div className="lp-node-icon-box"><Ico d={Icons.home} size={20} /></div>
        <div className="lp-node-info">
          <span className="lp-node-title">Home Broadband</span>
          <span className="lp-node-subtitle">Shared safely to your devices</span>
        </div>
      </div>

      {/* Node 2: Laptop on the Road */}
      <div className="lp-device-node lp-node-laptop">
        <div className="lp-node-icon-box"><Ico d={Icons.laptop} size={20} /></div>
        <div className="lp-node-info">
          <span className="lp-node-title">Laptop on the Road</span>
          <span className="lp-node-subtitle">Connected from cafes or hotels</span>
        </div>
      </div>

      {/* Node 3: Mobile Phone Hotspot */}
      <div className="lp-device-node lp-node-phone">
        <div className="lp-node-icon-box"><Ico d={Icons.smartphone} size={20} /></div>
        <div className="lp-node-info">
          <span className="lp-node-title">Mobile Phone</span>
          <span className="lp-node-subtitle">Instant secure personal hotspot</span>
        </div>
      </div>

      {/* Node 4: Family or Team Member */}
      <div className="lp-device-node lp-node-team">
        <div className="lp-node-icon-box"><Ico d={Icons.users} size={20} /></div>
        <div className="lp-node-info">
          <span className="lp-node-title">Trusted Peers</span>
          <span className="lp-node-subtitle">Friends, family &amp; colleagues</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Downloads Matrix Data ────────────────────────────────────────────── */
interface DownloadItem {
  id: string;
  name: string;
  sub: string;
  icon: React.ReactNode;
  primaryAction: { label: string; file: string };
  secondaryActions?: { label: string; file: string }[];
  installCommand?: string;
}

const DOWNLOAD_DATA: DownloadItem[] = [
  {
    id: 'linux',
    name: 'Linux',
    sub: 'Lightweight background service for Ubuntu, Debian, Fedora & servers.',
    icon: <Ico d={Icons.server} size={22} />,
    primaryAction: { label: 'Download .deb', file: 'zoop_linux_amd64.deb' },
    secondaryActions: [
      { label: '.tar.gz binary', file: 'zoop_linux_amd64.tar.gz' },
      { label: 'ARM64 (.deb)', file: 'zoop_linux_arm64.deb' },
    ],
    installCommand: 'curl -fsSL https://get.zoop.dev | sh',
  },
  {
    id: 'macos',
    name: 'macOS',
    sub: 'One-click installer for Apple Silicon (M1/M2/M3/M4) & Intel Macs.',
    icon: <Ico d={Icons.apple} size={22} />,
    primaryAction: { label: 'Download Installer (.pkg)', file: 'Zoop-macOS-universal.pkg' },
    secondaryActions: [
      { label: 'Apple Silicon .dmg', file: 'Zoop-macOS-arm64.dmg' },
      { label: 'Intel .dmg', file: 'Zoop-macOS-x64.dmg' },
    ],
    installCommand: 'brew install zoop-internet/tap/zoop',
  },
  {
    id: 'windows',
    name: 'Windows',
    sub: 'Fast Windows installer with seamless background tray support.',
    icon: <Ico d={Icons.laptop} size={22} />,
    primaryAction: { label: 'Download Installer (.msi)', file: 'Zoop-Windows-x64-Setup.msi' },
    secondaryActions: [
      { label: 'Standalone .zip', file: 'zoop_windows_x64.zip' },
      { label: 'ARM64 Installer', file: 'Zoop-Windows-arm64.msi' },
    ],
    installCommand: 'winget install zoop-internet.zoop',
  },
  {
    id: 'mobile',
    name: 'Phones & Routers',
    sub: 'One-tap apps for Android phones, iPhones, and home Wi-Fi routers.',
    icon: <Ico d={Icons.smartphone} size={22} />,
    primaryAction: { label: 'Android App (APK)', file: 'zoop-android-release.apk' },
    secondaryActions: [
      { label: 'iOS App Store / TestFlight', file: 'https://testflight.apple.com/join/zoop' },
      { label: 'Home Router (.ipk)', file: 'zoop-router_mipsel.ipk' },
    ],
    installCommand: 'opkg install zoop-router',
  },
];

/* ─── Main Landing Page Component ──────────────────────────────────────── */
export const LandingPage: React.FC<{
  currentPath?: string;
  onNavigate: (path: string) => void;
  onLaunchConsole: (mode: PortalMode) => void;
}> = ({ currentPath = '/', onNavigate, onLaunchConsole }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloadModal, setDownloadModal] = useState<{ open: boolean; platform: string; file: string } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleDownloadClick = (platform: string, file: string) => {
    setDownloadModal({ open: true, platform, file });
  };

  const activeRoute = currentPath.toLowerCase();

  return (
    <div className="landing-shell">
      {/* ─── Topbar ─────────────────────────────────────────────────── */}
      <header className={`lp-topbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-brand" onClick={() => onNavigate('/')}>
          <div className="lp-brand-icon">
            <img src="/zoopicontransparent.png" alt="Zoop Internet" />
          </div>
          <span className="lp-brand-text">Zoop</span>
          <span className="lp-brand-badge">Internet</span>
        </div>

        <nav className="lp-nav-pill" aria-label="Main Navigation">
          <button className={activeRoute === '/' ? 'active' : ''} onClick={() => onNavigate('/')}>
            Overview
          </button>
          <button className={activeRoute === '/how-it-works' || activeRoute === '/architecture' ? 'active' : ''} onClick={() => onNavigate('/how-it-works')}>
            How It Works
          </button>
          <button className={activeRoute === '/products' ? 'active' : ''} onClick={() => onNavigate('/products')}>
            Products
          </button>
          <button className={activeRoute === '/downloads' ? 'active' : ''} onClick={() => onNavigate('/downloads')}>
            Downloads
          </button>
          <button className={activeRoute === '/security' ? 'active' : ''} onClick={() => onNavigate('/security')}>
            Security
          </button>
        </nav>

        <div className="lp-topbar-actions">
          <button className="lp-btn-secondary" onClick={() => onLaunchConsole('user')} title="Open Web Management Console">
            Launch Console
          </button>
          <button className="lp-btn-primary" onClick={() => onNavigate('/downloads')}>
            <Ico d={Icons.download} size={15} />
            Get Zoop Free
          </button>
          <button className="lp-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation menu">
            <Ico d={menuOpen ? Icons.close : Icons.menu} size={20} />
          </button>
        </div>
      </header>

      {/* ─── DEDICATED DOWNLOADS PAGE ───────────────────────────────── */}
      {activeRoute === '/downloads' && (
        <main className="lp-page-wrapper">
          <div className="lp-page-header">
            <p className="lp-eyebrow">Get Started in Seconds</p>
            <h1>Download Zoop for your devices.</h1>
            <p>
              Available for Linux, macOS, Windows, Android, iOS, and home Wi-Fi routers. Fast, lightweight, and completely free.
            </p>
          </div>

          <div className="lp-downloads-grid">
            {DOWNLOAD_DATA.map((item) => (
              <div key={item.id} className="lp-dl-card">
                <div className="lp-dl-top">
                  <div className="lp-dl-icon">{item.icon}</div>
                  <span className="lp-brand-badge">Free</span>
                </div>
                <h3>{item.name}</h3>
                <p className="lp-dl-sub">{item.sub}</p>

                <div className="lp-dl-actions">
                  <button
                    className="lp-dl-btn primary-dl"
                    onClick={() => handleDownloadClick(item.name, item.primaryAction.file)}
                  >
                    <span>{item.primaryAction.label}</span>
                    <Ico d={Icons.download} size={14} />
                  </button>

                  {item.secondaryActions?.map((sec) => (
                    <button
                      key={sec.label}
                      className="lp-dl-btn"
                      onClick={() => handleDownloadClick(item.name, sec.file)}
                    >
                      <span>{sec.label}</span>
                      <Ico d={Icons.arrowRight} size={12} />
                    </button>
                  ))}
                </div>

                {item.installCommand && (
                  <div
                    className="lp-code-snippet"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => copyText(item.installCommand!, item.id)}
                    title="Click to copy install command"
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.installCommand}
                    </span>
                    <Ico d={copiedCmd === item.id ? Icons.check : Icons.copy} size={13} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 64, textAlign: 'center' }}>
            <button className="lp-btn-secondary" onClick={() => onNavigate('/')}>
              ← Back to Overview
            </button>
          </div>
        </main>
      )}

      {/* ─── DEDICATED HOW IT WORKS PAGE ────────────────────────────── */}
      {(activeRoute === '/how-it-works' || activeRoute === '/architecture') && (
        <main className="lp-page-wrapper">
          <div className="lp-page-header">
            <p className="lp-eyebrow">Simple &amp; Powerful</p>
            <h1>How Zoop connects you directly.</h1>
            <p>
              Traditional VPNs slow you down by routing all your personal traffic through centralized company servers.
              Zoop creates a direct, encrypted tunnel between your own devices.
            </p>
          </div>

          <div className="lp-arch-grid">
            <div className="lp-arch-card">
              <h3>1. Automatic Direct Pairing</h3>
              <p>
                When you connect your laptop to your home computer or phone, Zoop links them directly across the internet.
                Your data takes the fastest possible path without detours.
              </p>
            </div>

            <div className="lp-arch-card">
              <h3>2. 100% Private &amp; Encrypted</h3>
              <p>
                Every piece of data is protected with bank-grade encryption before it ever leaves your device.
                Nobody in the middle—not even your internet provider—can peek into your traffic.
              </p>
            </div>

            <div className="lp-arch-card">
              <h3>3. Seamless Roaming</h3>
              <p>
                Walking out the door? Moving from home Wi-Fi to mobile 5G? Zoop keeps your downloads and calls connected
                in the background with zero drops.
              </p>
            </div>

            <div className="lp-arch-card">
              <h3>4. Share Only What You Choose</h3>
              <p>
                You are in complete control. Choose who can connect, share with family members with one tap, or turn off sharing
                whenever you need.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 64, textAlign: 'center' }}>
            <button className="lp-btn-secondary" onClick={() => onNavigate('/')}>
              ← Back to Overview
            </button>
          </div>
        </main>
      )}

      {/* ─── DEDICATED PRODUCTS PAGE ────────────────────────────────── */}
      {activeRoute === '/products' && (
        <main className="lp-page-wrapper">
          <div className="lp-page-header">
            <p className="lp-eyebrow">One Ecosystem</p>
            <h1>Built for every device in your life.</h1>
            <p>Run Zoop quietly in the background on your computers, control it from your phone, or manage it via the web.</p>
          </div>

          <div className="lp-products-grid">
            <div className="lp-product-card">
              <span className="lp-product-badge">Desktop &amp; Server</span>
              <h3>Zoop for PC &amp; Mac</h3>
              <p>
                Runs quietly in your system tray. Turn any computer into a high-speed internet provider for your other devices
                with zero configuration needed.
              </p>
              <ul className="lp-product-features">
                <li><Ico d={Icons.check} size={14} /> One-click connect &amp; share</li>
                <li><Ico d={Icons.check} size={14} /> Ultra-low battery and CPU usage</li>
                <li><Ico d={Icons.check} size={14} /> Instant status in your system menu</li>
              </ul>
            </div>

            <div className="lp-product-card">
              <span className="lp-product-badge">Mobile App</span>
              <h3>Zoop Mobile</h3>
              <p>
                Stay connected to your home network from anywhere in the world. Enjoy safe browsing on public Wi-Fi
                hotspots in hotels and airports.
              </p>
              <ul className="lp-product-features">
                <li><Ico d={Icons.check} size={14} /> One-tap connection toggle</li>
                <li><Ico d={Icons.check} size={14} /> Instant notification of peer requests</li>
                <li><Ico d={Icons.check} size={14} /> Safe public Wi-Fi shield</li>
              </ul>
            </div>

            <div className="lp-product-card">
              <span className="lp-product-badge">Web Console</span>
              <h3>Zoop Web Console</h3>
              <p>
                Manage all your devices from any browser. Authorize family members, review active sessions, and check
                network speed in real time.
              </p>
              <ul className="lp-product-features">
                <li><Ico d={Icons.check} size={14} /> Clean, simple visual dashboard</li>
                <li><Ico d={Icons.check} size={14} /> One-click sharing approvals</li>
                <li><Ico d={Icons.check} size={14} /> Full control of your network</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: 64, textAlign: 'center' }}>
            <button className="lp-btn-secondary" onClick={() => onNavigate('/')}>
              ← Back to Overview
            </button>
          </div>
        </main>
      )}

      {/* ─── DEDICATED SECURITY PAGE ────────────────────────────────── */}
      {activeRoute === '/security' && (
        <main className="lp-page-wrapper">
          <div className="lp-page-header">
            <p className="lp-eyebrow">Privacy First</p>
            <h1>Your internet. Truly private to you.</h1>
            <p>We built Zoop with a simple promise: we never store, inspect, or sell your private browsing traffic.</p>
          </div>

          <div className="lp-security-grid">
            <div className="lp-sec-card">
              <div className="lp-sec-icon"><Ico d={Icons.shield} size={20} /></div>
              <h3>Direct Device-to-Device</h3>
              <p>Your data flows straight between your devices. It does not pass through intermediate company servers.</p>
            </div>

            <div className="lp-sec-card">
              <div className="lp-sec-icon"><Ico d={Icons.zap} size={20} /></div>
              <h3>Modern Encryption</h3>
              <p>Protected by top-tier modern cryptography that prevents eavesdropping and tampering on any network.</p>
            </div>

            <div className="lp-sec-card">
              <div className="lp-sec-icon"><Ico d={Icons.server} size={20} /></div>
              <h3>Zero Activity Tracking</h3>
              <p>No tracking logs, no history records, and no ads. Your online activity stays strictly yours.</p>
            </div>

            <div className="lp-sec-card">
              <div className="lp-sec-icon"><Ico d={Icons.terminal} size={20} /></div>
              <h3>Open Source &amp; Audited</h3>
              <p>Built transparently in the open so you and the security community can verify how your data is protected.</p>
            </div>
          </div>

          <div style={{ marginTop: 64, textAlign: 'center' }}>
            <button className="lp-btn-secondary" onClick={() => onNavigate('/')}>
              ← Back to Overview
            </button>
          </div>
        </main>
      )}

      {/* ─── DEFAULT OVERVIEW / HOME PAGE ───────────────────────────── */}
      {activeRoute === '/' && (
        <>
          {/* Hero Section */}
          <section className="lp-hero">
            <div className="lp-hero-inner">
              <div className="lp-hero-grid">
                <div>
                  <div className="lp-chip">
                    <span className="lp-chip-dot" />
                    <span className="lp-chip-text">Direct, private internet for you and your loved ones</span>
                  </div>
                  <p className="lp-eyebrow">Personal Internet Sharing</p>
                  <h1>
                    Share internet securely across all your devices.
                    <br />
                    <span className="lp-grad-text">Anytime, anywhere.</span>
                  </h1>
                  <p className="lp-hero-desc">
                    Zoop lets you easily share your home, phone, or office connection with your laptop on the road,
                    friends nearby, or family across town. Fast, private, and always connected with zero hassle.
                  </p>
                  <div className="lp-hero-actions">
                    <button className="lp-btn-primary large" onClick={() => onNavigate('/downloads')}>
                      <Ico d={Icons.download} size={18} />
                      Get Zoop Free
                    </button>
                    <button className="lp-btn-secondary large" onClick={() => onLaunchConsole('user')}>
                      Open Web Console
                      <Ico d={Icons.arrowRight} size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <BentArrowMeshIllustration />
                </div>
              </div>
            </div>
          </section>

          {/* Metric Strip */}
          <section className="lp-metric-strip" aria-label="System Highlights">
            <div className="lp-metric-item in-view">
              <span className="lp-metric-label">Direct Connection Speed</span>
              <span className="lp-metric-val">
                <AnimatedCounter end={99.4} unit="%" decimals={1} />
              </span>
              <span className="lp-metric-sub">
                <Ico d={Icons.check} size={12} /> Direct Device-to-Device Speed
              </span>
            </div>

            <div className="lp-metric-item in-view">
              <span className="lp-metric-label">Connection Lag</span>
              <span className="lp-metric-val">
                &lt; <AnimatedCounter end={1} unit=" ms" />
              </span>
              <span className="lp-metric-sub">Ultra-low latency transfer</span>
            </div>

            <div className="lp-metric-item in-view">
              <span className="lp-metric-label">Privacy &amp; Security</span>
              <span className="lp-metric-val">100%</span>
              <span className="lp-metric-sub">End-to-End Encrypted</span>
            </div>

            <div className="lp-metric-item in-view">
              <span className="lp-metric-label">Connection Drop Rate</span>
              <span className="lp-metric-val">
                <AnimatedCounter end={0.0} unit="%" decimals={1} />
              </span>
              <span className="lp-metric-sub">Seamless Wi-Fi &amp; 5G roaming</span>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="lp-section">
            <div className="lp-section-heading centered">
              <p className="lp-eyebrow">Up &amp; Running in 3 Steps</p>
              <h2>How simple it is to use Zoop.</h2>
              <p className="lp-subtext">No complicated setup. No server configuration. Just install and connect.</p>
            </div>

            <div className="lp-steps-grid">
              <div className="lp-step-card">
                <div className="lp-step-header">
                  <div className="lp-step-icon-box"><Ico d={Icons.download} size={22} /></div>
                  <span className="lp-step-num">01</span>
                </div>
                <h3>1. Install on Your Devices</h3>
                <p>Download Zoop on your laptop, phone, or home PC. It runs quietly in the background without slowing you down.</p>
              </div>

              <div className="lp-step-card">
                <div className="lp-step-header">
                  <div className="lp-step-icon-box"><Ico d={Icons.zap} size={22} /></div>
                  <span className="lp-step-num">02</span>
                </div>
                <h3>2. Connect in One Tap</h3>
                <p>Pair your own devices or share your connection with trusted family and friends in one click.</p>
              </div>

              <div className="lp-step-card">
                <div className="lp-step-header">
                  <div className="lp-step-icon-box"><Ico d={Icons.shield} size={22} /></div>
                  <span className="lp-step-num">03</span>
                </div>
                <h3>3. Enjoy Safe, Fast Internet</h3>
                <p>Browse, stream, and work freely with complete peace of mind knowing your data is direct, encrypted, and private.</p>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="lp-section">
            <div className="lp-section-heading centered">
              <p className="lp-eyebrow">Loved by Real People</p>
              <h2>Here is what our community says.</h2>
            </div>

            <div className="lp-testimonials-grid">
              <div className="lp-test-card">
                <div className="lp-test-stars">
                  {[...Array(5)].map((_, i) => (
                    <Ico key={i} d={Icons.star} size={14} />
                  ))}
                </div>
                <p className="lp-test-quote">
                  "I share my fast home fiber connection with my laptop while traveling. It feels like I never left my desk at home."
                </p>
                <div className="lp-test-author">
                  <div className="lp-test-avatar">A</div>
                  <div>
                    <div className="lp-test-name">Amara N.</div>
                    <div className="lp-test-role">Remote Designer · Kampala</div>
                  </div>
                </div>
              </div>

              <div className="lp-test-card">
                <div className="lp-test-stars">
                  {[...Array(5)].map((_, i) => (
                    <Ico key={i} d={Icons.star} size={14} />
                  ))}
                </div>
                <p className="lp-test-quote">
                  "The connection never drops even when I switch from my office Wi-Fi to mobile data. It just works seamlessly."
                </p>
                <div className="lp-test-author">
                  <div className="lp-test-avatar">D</div>
                  <div>
                    <div className="lp-test-name">David K.</div>
                    <div className="lp-test-role">Software Engineer · Nairobi</div>
                  </div>
                </div>
              </div>

              <div className="lp-test-card">
                <div className="lp-test-stars">
                  {[...Array(5)].map((_, i) => (
                    <Ico key={i} d={Icons.star} size={14} />
                  ))}
                </div>
                <p className="lp-test-quote">
                  "Setup took literally under two minutes. Now my family can safely connect through my home network from anywhere."
                </p>
                <div className="lp-test-author">
                  <div className="lp-test-avatar">S</div>
                  <div>
                    <div className="lp-test-name">Seline M.</div>
                    <div className="lp-test-role">Community Creator · Lagos</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Banner */}
          <section className="lp-section">
            <div className="lp-cta-banner">
              <div className="lp-cta-copy">
                <h2>Ready to experience private internet?</h2>
                <p>Join thousands of people sharing fast, private internet across their devices today.</p>
              </div>
              <div className="lp-cta-actions">
                <button className="lp-btn-primary large" onClick={() => onNavigate('/downloads')}>
                  <Ico d={Icons.download} size={18} />
                  Get Zoop Free
                </button>
                <button className="lp-btn-secondary large" onClick={() => onLaunchConsole('user')}>
                  Open Web Console
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <div className="lp-brand" onClick={() => onNavigate('/')}>
                <div className="lp-brand-icon">
                  <img src="/zoopicontransparent.png" alt="Zoop" />
                </div>
                <span className="lp-brand-text">Zoop Internet</span>
              </div>
              <p>
                Fast, secure, and private direct internet sharing between your devices and trusted peers.
              </p>
            </div>

            <div className="lp-footer-col">
              <h4>Products</h4>
              <ul>
                <li><a onClick={() => onNavigate('/products')}>Zoop for PC &amp; Mac</a></li>
                <li><a onClick={() => onNavigate('/products')}>Zoop Mobile App</a></li>
                <li><a onClick={() => onNavigate('/downloads')}>Downloads Matrix</a></li>
                <li><a onClick={() => onNavigate('/products')}>Home Routers</a></li>
              </ul>
            </div>

            <div className="lp-footer-col">
              <h4>Consoles</h4>
              <ul>
                <li><a onClick={() => onLaunchConsole('user')}>Personal Device</a></li>
                <li><a onClick={() => onLaunchConsole('org')}>Organization Fleet</a></li>
                <li><a onClick={() => onLaunchConsole('admin')}>Admin Center</a></li>
                <li><a onClick={() => onNavigate('/downloads')}>Get Zoop Free</a></li>
              </ul>
            </div>

            <div className="lp-footer-col">
              <h4>Learn More</h4>
              <ul>
                <li><a onClick={() => onNavigate('/how-it-works')}>How It Works</a></li>
                <li><a onClick={() => onNavigate('/security')}>Privacy &amp; Security</a></li>
                <li><a onClick={() => onNavigate('/products')}>Ecosystem Overview</a></li>
                <li><a onClick={() => onNavigate('/downloads')}>Supported Devices</a></li>
              </ul>
            </div>

            <div className="lp-footer-col">
              <h4>Community</h4>
              <ul>
                <li><a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">GitHub Repository</a></li>
                <li><a onClick={() => onNavigate('/how-it-works')}>Documentation</a></li>
                <li><a href="https://github.com/zoop-internet/zoop/issues" target="_blank" rel="noreferrer">Help &amp; Issues</a></li>
                <li><a onClick={() => onNavigate('/security')}>Security Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} Zoop Internet. Open source under MIT License.</span>
            <div className="lp-footer-links">
              <a onClick={() => onNavigate('/security')}>Privacy &amp; Security</a>
              <a onClick={() => onNavigate('/how-it-works')}>How It Works</a>
              <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Download Confirmation Modal ────────────────────────────── */}
      {downloadModal?.open && (
        <div className="lp-modal-backdrop" onClick={() => setDownloadModal(null)}>
          <div className="lp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lp-modal-icon">
              <Ico d={Icons.download} size={28} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px' }}>
              Downloading Zoop for {downloadModal.platform}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: 24, lineHeight: 1.6 }}>
              Package <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{downloadModal.file}</code> is downloading.
              Open the installer once finished to connect your device.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="lp-btn-primary" onClick={() => setDownloadModal(null)}>
                Done &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
