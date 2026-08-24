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
  apple: (
    <path d="M12 20.94c1.5 0 2.75-.7 3.5-.7.8 0 2 .7 3.5.7 2.15 0 3.7-1.8 4.7-3.2-1.3-.7-2.15-2.2-2.15-3.8 0-2.4 1.85-3.6 2-3.7-1-.95-2.4-1.45-3.7-1.45-1.5 0-2.6.75-3.5.75-.85 0-2.15-.75-3.65-.75-2.2 0-4.3 1.4-5.3 3.6-1.5 3.1-.4 7.6 1.4 10.3 1 1.4 2.15 2.8 3.65 2.8zM15.4 5.3c.7-.9 1.15-2.1 1-3.3-1 .1-2.2.7-2.9 1.5-.6.8-1.2 2-1 3.2 1.1 0 2.2-.6 2.9-1.4z" />
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  chevronRight: <polyline points="9 18 15 12 9 6" />,
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

/* ─── Abstract Mesh Topology Visual (Frameless) ────────────────────────── */
const AbstractMeshTopology: React.FC = () => {
  return (
    <div className="lp-abstract-mesh-container" aria-label="Abstract WireGuard Mesh Topology">
      <div className="lp-abstract-glow-orb" />
      <div className="lp-orbit-ring r1" />
      <div className="lp-orbit-ring r2" />

      <svg className="lp-abstract-svg" viewBox="0 0 440 340">
        <defs>
          <linearGradient id="absGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#126cff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#08f2ff" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="absGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#08f2ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#14f06d" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="absGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14f06d" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#b9ff00" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="absGrad4" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#126cff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#14f06d" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Ambient background constellation lines */}
        <line x1="60" y1="45" x2="380" y2="45" stroke="rgba(8, 242, 255, 0.16)" strokeWidth="1" strokeDasharray="3,6" />
        <line x1="80" y1="290" x2="360" y2="290" stroke="rgba(20, 240, 109, 0.16)" strokeWidth="1" strokeDasharray="3,6" />
        <line x1="60" y1="45" x2="80" y2="290" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
        <line x1="380" y1="45" x2="360" y2="290" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

        {/* Main animated laser beams from Central Core */}
        <path d="M 220,170 L 60,45" stroke="url(#absGrad1)" strokeWidth="3" className="lp-pulse-path" />
        <path d="M 220,170 L 380,45" stroke="url(#absGrad2)" strokeWidth="3" className="lp-pulse-path" />
        <path d="M 220,170 L 80,290" stroke="url(#absGrad3)" strokeWidth="3" className="lp-pulse-path" />
        <path d="M 220,170 L 360,290" stroke="url(#absGrad4)" strokeWidth="3" className="lp-pulse-path" />
      </svg>

      {/* Central Core Hub */}
      <div className="lp-abs-node core-hub" title="Zoop Cloud Control Plane">
        <img src="/zoopicontransparent.png" alt="Zoop Core" />
      </div>

      {/* Peripheral Topology Nodes */}
      <div className="lp-abs-node p1" title="Provider Daemon">
        <Ico d={Icons.server} size={22} />
        <span className="lp-abs-label">Provider (zoopd)</span>
      </div>

      <div className="lp-abs-node p2" title="Recipient Peer">
        <Ico d={Icons.laptop} size={22} />
        <span className="lp-abs-label">Recipient Peer</span>
      </div>

      <div className="lp-abs-node p3" title="Mobile Node">
        <Ico d={Icons.smartphone} size={22} />
        <span className="lp-abs-label">Mobile Mesh</span>
      </div>

      <div className="lp-abs-node p4" title="Edge Router">
        <Ico d={Icons.router} size={22} />
        <span className="lp-abs-label">Gateway Router</span>
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
    sub: 'Native TUN daemon with systemd integration & CLI tool.',
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
    sub: 'Apple Silicon & Intel package with background launchd agent.',
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
    sub: 'Windows Service with bundled high-performance Wintun adapter driver.',
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
    name: 'Mobile & Routers',
    sub: 'Android VpnService, iOS NetworkExtension, & OpenWrt packages.',
    icon: <Ico d={Icons.smartphone} size={22} />,
    primaryAction: { label: 'Android APK', file: 'zoop-android-release.apk' },
    secondaryActions: [
      { label: 'iOS TestFlight', file: 'https://testflight.apple.com/join/zoop' },
      { label: 'OpenWrt (.ipk)', file: 'zoop-router_mipsel.ipk' },
    ],
    installCommand: 'opkg install zoop-router',
  },
];

/* ─── Main Landing Page / Multi-Page Marketing Component ───────────────── */
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
          <button className={activeRoute === '/architecture' ? 'active' : ''} onClick={() => onNavigate('/architecture')}>
            Architecture
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
            Get Zoop
          </button>
          <button className="lp-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation menu">
            <Ico d={menuOpen ? Icons.close : Icons.menu} size={20} />
          </button>
        </div>
      </header>

      {/* ─── VIEW ROUTER ────────────────────────────────────────────── */}

      {/* 1. DEDICATED DOWNLOADS PAGE */}
      {activeRoute === '/downloads' && (
        <main className="lp-page-wrapper">
          <div className="lp-page-header">
            <p className="lp-eyebrow">Production Binaries &amp; Drivers</p>
            <h1>Download Zoop for every platform.</h1>
            <p>
              Pre-compiled Go binaries, background daemons (`zoopd`), and kernel TUN drivers for Linux, macOS,
              Windows, Android, iOS, and OpenWrt routers.
            </p>
          </div>

          <div className="lp-downloads-grid">
            {DOWNLOAD_DATA.map((item) => (
              <div key={item.id} className="lp-dl-card">
                <div className="lp-dl-top">
                  <div className="lp-dl-icon">{item.icon}</div>
                  <span className="lp-brand-badge">v1.0.0</span>
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

      {/* 2. DEDICATED ARCHITECTURE PAGE */}
      {activeRoute === '/architecture' && (
        <main className="lp-page-wrapper">
          <div className="lp-page-header">
            <p className="lp-eyebrow">Technical Architecture</p>
            <h1>Strict separation of Control &amp; Data Planes.</h1>
            <p>
              Zoop coordinates identities and discovery over a lightweight Go signaling cluster, while all user payloads
              travel directly between endpoints over authenticated WireGuard tunnels.
            </p>
          </div>

          <div className="lp-arch-grid">
            <div className="lp-arch-card">
              <h3>Control Plane (`zoop-cloud`)</h3>
              <p>
                Handles cryptographic Ed25519 identity verification, mutual share authorization, WebSocket signaling, and
                deterministic IPAM lease allocation. Never touches or proxies raw packet traffic.
              </p>
              <div className="lp-code-snippet">[Control Plane] Signaling: Session auth OK · Candidate exchange complete</div>
            </div>

            <div className="lp-arch-card">
              <h3>Data Plane (`zoopd` &amp; WireGuard)</h3>
              <p>
                Runs as a local system daemon. Manages virtual TUN adapters, executes 1.5-RTT `Noise_IK` handshakes, gathers
                reflexive STUN candidates for hole punching, and performs kernel-level NAT masquerading.
              </p>
              <div className="lp-code-snippet">[Data Plane] WireGuard direct tunnel established (UDP :51820)</div>
            </div>

            <div className="lp-arch-card">
              <h3>Zero-Drop Netlink Roaming</h3>
              <p>
                Monitors kernel routing and interface state transitions (Wi-Fi ↔ LTE ↔ Ethernet). Automatically re-probes
                endpoints and updates cryptographic routing tables without breaking TCP connections.
              </p>
              <div className="lp-code-snippet">[Netlink] Transition detected: wlan0 -&gt; rmnet0 · Re-keyed in 12ms</div>
            </div>

            <div className="lp-arch-card">
              <h3>Distributed Relay Failover</h3>
              <p>
                Geographically distributed TURN/Relay cluster provides encrypted WebSocket fallback streaming for symmetric
                and carrier-grade NATs where direct UDP hole punching is mathematically blocked.
              </p>
              <div className="lp-code-snippet">[Relay] Fallback enabled for Symmetric CGNAT (Region: us-east-va)</div>
            </div>
          </div>

          <div style={{ marginTop: 64, textAlign: 'center' }}>
            <button className="lp-btn-secondary" onClick={() => onNavigate('/')}>
              ← Back to Overview
            </button>
          </div>
        </main>
      )}

      {/* 3. DEDICATED PRODUCTS PAGE */}
      {activeRoute === '/products' && (
        <main className="lp-page-wrapper">
          <div className="lp-page-header">
            <p className="lp-eyebrow">Product Ecosystem</p>
            <h1>Built for developers, fleets &amp; network operators.</h1>
            <p>Deploy native daemons, manage tunnels from the CLI, or oversee global mesh fleets via the web console.</p>
          </div>

          <div className="lp-products-grid">
            <div className="lp-product-card">
              <span className="lp-product-badge">System Daemon</span>
              <h3>zoopd</h3>
              <p>
                Privileged background service running natively on Linux (`systemd`), macOS (`launchd`), and Windows
                (`Wintun`). Manages adapter lifecycle, packet routing, and local IPC.
              </p>
              <ul className="lp-product-features">
                <li><Ico d={Icons.check} size={14} /> User-space WireGuard Engine</li>
                <li><Ico d={Icons.check} size={14} /> Unprivileged Unix Domain Socket IPC</li>
                <li><Ico d={Icons.check} size={14} /> Automatic Netlink interface roaming</li>
              </ul>
            </div>

            <div className="lp-product-card">
              <span className="lp-product-badge">Developer Tool</span>
              <h3>zoop CLI</h3>
              <p>
                Fast terminal tool for engineers to inspect live peer latency, initiate tunnels, verify routing tables, and
                run interactive health checks with `zoop doctor`.
              </p>
              <ul className="lp-product-features">
                <li><Ico d={Icons.check} size={14} /> Interactive diagnostics &amp; health checks</li>
                <li><Ico d={Icons.check} size={14} /> Real-time peer throughput monitoring</li>
                <li><Ico d={Icons.check} size={14} /> Scriptable JSON output for automation</li>
              </ul>
            </div>

            <div className="lp-product-card">
              <span className="lp-product-badge">Web Console</span>
              <h3>Zoop Web Management</h3>
              <p>
                Unified browser command surface with dedicated Personal Device, Organization Fleet, and System Admin
                consoles for policy control and signed audit logs.
              </p>
              <ul className="lp-product-features">
                <li><Ico d={Icons.check} size={14} /> Role-based organization access</li>
                <li><Ico d={Icons.check} size={14} /> One-click share relationship approvals</li>
                <li><Ico d={Icons.check} size={14} /> Signed security audit log telemetry</li>
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

      {/* 4. DEDICATED SECURITY PAGE */}
      {activeRoute === '/security' && (
        <main className="lp-page-wrapper">
          <div className="lp-page-header">
            <p className="lp-eyebrow">Zero-Trust Cryptography</p>
            <h1>Cryptographic privacy and verified integrity.</h1>
            <p>Every packet is encrypted at the source using state-of-the-art primitives. Zero central payload inspection.</p>
          </div>

          <div className="lp-security-grid">
            <div className="lp-sec-card">
              <div className="lp-sec-icon"><Ico d={Icons.shield} size={20} /></div>
              <h3>Noise_IK Handshake</h3>
              <p>
                1.5-RTT mutual cryptographic handshake using Curve25519 elliptic-curve Diffie-Hellman with identity hiding.
              </p>
            </div>

            <div className="lp-sec-card">
              <div className="lp-sec-icon"><Ico d={Icons.zap} size={20} /></div>
              <h3>ChaCha20-Poly1305</h3>
              <p>
                High-performance authenticated symmetric encryption with 128-bit MAC tag preventing payload tampering.
              </p>
            </div>

            <div className="lp-sec-card">
              <div className="lp-sec-icon"><Ico d={Icons.server} size={20} /></div>
              <h3>Zero Payload Logging</h3>
              <p>
                The Zoop Control Plane never inspects, caches, or proxies user network packets. Data travels direct P2P.
              </p>
            </div>

            <div className="lp-sec-card">
              <div className="lp-sec-icon"><Ico d={Icons.terminal} size={20} /></div>
              <h3>Deterministic IPAM</h3>
              <p>
                Overlay subnets assign stable, private, cryptographic addresses isolated from local LAN subnet collisions.
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

      {/* 5. DEFAULT HOME / OVERVIEW LANDING PAGE */}
      {activeRoute === '/' && (
        <>
          {/* Hero Section */}
          <section className="lp-hero">
            <div className="lp-hero-inner">
              <div className="lp-hero-grid">
                <div>
                  <div className="lp-chip">
                    <span className="lp-chip-dot" />
                    <span className="lp-chip-text">Production Ready • WireGuard Mesh + STUN Traversal</span>
                  </div>
                  <p className="lp-eyebrow">Encrypted Direct Mesh &amp; Peer Connectivity</p>
                  <h1>
                    Direct connectivity.
                    <br />
                    <span className="lp-grad-text">Zero centralized choke points.</span>
                  </h1>
                  <p className="lp-hero-desc">
                    Zoop Internet connects devices peer-to-peer with user-space WireGuard encryption, reflexive
                    NAT hole-punching, and zero-drop roaming across Wi-Fi and cellular networks.
                  </p>
                  <div className="lp-hero-actions">
                    <button className="lp-btn-primary large" onClick={() => onNavigate('/downloads')}>
                      <Ico d={Icons.download} size={18} />
                      Download for Your Device
                    </button>
                    <button className="lp-btn-secondary large" onClick={() => onLaunchConsole('user')}>
                      Launch Web Console
                      <Ico d={Icons.arrowRight} size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <AbstractMeshTopology />
                </div>
              </div>
            </div>
          </section>

          {/* Metric Strip */}
          <section className="lp-metric-strip" aria-label="System Metrics">
            <div className="lp-metric-item in-view">
              <span className="lp-metric-label">Direct P2P Success Rate</span>
              <span className="lp-metric-val">
                <AnimatedCounter end={99.4} unit="%" decimals={1} />
              </span>
              <span className="lp-metric-sub">
                <Ico d={Icons.check} size={12} /> Reflexive STUN Hole-Punching
              </span>
            </div>

            <div className="lp-metric-item in-view">
              <span className="lp-metric-label">Encrypted Tunnel Latency</span>
              <span className="lp-metric-val">
                &lt; <AnimatedCounter end={1} unit=" ms" />
              </span>
              <span className="lp-metric-sub">Noise_IK Protocol Handshake</span>
            </div>

            <div className="lp-metric-item in-view">
              <span className="lp-metric-label">Transport Cryptography</span>
              <span className="lp-metric-val">256-bit</span>
              <span className="lp-metric-sub">ChaCha20-Poly1305 + Curve25519</span>
            </div>

            <div className="lp-metric-item in-view">
              <span className="lp-metric-label">Roaming Drop Rate</span>
              <span className="lp-metric-val">
                <AnimatedCounter end={0.0} unit="%" decimals={1} />
              </span>
              <span className="lp-metric-sub">Kernel Netlink Roaming Event</span>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="lp-section">
            <div className="lp-section-heading centered">
              <p className="lp-eyebrow">Proven Architecture</p>
              <h2>How Zoop establishes direct encrypted connectivity.</h2>
              <p className="lp-subtext">
                Strict decoupling between the Go Control Plane (discovery &amp; signaling) and the WireGuard Data Plane
                (encrypted user payload).
              </p>
            </div>

            <div className="lp-steps-grid">
              <div className="lp-step-card">
                <div className="lp-step-header">
                  <div className="lp-step-icon-box"><Ico d={Icons.shield} size={22} /></div>
                  <span className="lp-step-num">01</span>
                </div>
                <h3>1. Ed25519 Identity &amp; Auth</h3>
                <p>
                  Each device generates cryptographic Curve25519 public keys and authenticates with the Zoop Cloud Control
                  Plane over TLS to register its capabilities.
                </p>
                <div className="lp-code-snippet">$ zoop identity generate</div>
              </div>

              <div className="lp-step-card">
                <div className="lp-step-header">
                  <div className="lp-step-icon-box"><Ico d={Icons.zap} size={22} /></div>
                  <span className="lp-step-num">02</span>
                </div>
                <h3>2. STUN Traversal &amp; Direct Mesh</h3>
                <p>
                  Endpoints gather local LAN, UPnP, and reflexive STUN candidates. When mutual sharing is authorized, they
                  punch UDP holes to establish direct WireGuard tunnels.
                </p>
                <div className="lp-code-snippet">$ zoop connect 10.64.0.12</div>
              </div>

              <div className="lp-step-card">
                <div className="lp-step-header">
                  <div className="lp-step-icon-box"><Ico d={Icons.globe} size={22} /></div>
                  <span className="lp-step-num">03</span>
                </div>
                <h3>3. Zero-Drop Roaming &amp; Relays</h3>
                <p>
                  When switching interfaces (Wi-Fi ↔ LTE), kernel Netlink monitors update remote endpoints instantaneously
                  without dropping open TCP sessions.
                </p>
                <div className="lp-code-snippet">[zoopd] Netlink: wlan0 -&gt; rmnet0 (OK)</div>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="lp-section">
            <div className="lp-section-heading centered">
              <p className="lp-eyebrow">Community &amp; Enterprise</p>
              <h2>Trusted by network operators and engineers worldwide.</h2>
            </div>

            <div className="lp-testimonials-grid">
              <div className="lp-test-card">
                <div className="lp-test-stars">
                  {[...Array(5)].map((_, i) => (
                    <Ico key={i} d={Icons.star} size={14} />
                  ))}
                </div>
                <p className="lp-test-quote">
                  "Zoop's automatic STUN hole punching solved our remote edge server connectivity without needing static
                  public IPs or complex VPN concentrators."
                </p>
                <div className="lp-test-author">
                  <div className="lp-test-avatar">A</div>
                  <div>
                    <div className="lp-test-name">Amara N.</div>
                    <div className="lp-test-role">Infrastructure Lead · CloudScale Africa</div>
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
                  "The zero-drop roaming is exceptional. Moving between Wi-Fi and 5G while maintaining active SSH sessions
                  and database connections without a single disconnect."
                </p>
                <div className="lp-test-author">
                  <div className="lp-test-avatar">D</div>
                  <div>
                    <div className="lp-test-name">David K.</div>
                    <div className="lp-test-role">Distributed Systems Architect · Nairobi</div>
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
                  "We run community provider nodes with strict bandwidth sharing policies. The lightweight daemon uses
                  almost no CPU and throughput is near line-rate."
                </p>
                <div className="lp-test-author">
                  <div className="lp-test-avatar">S</div>
                  <div>
                    <div className="lp-test-name">Seline M.</div>
                    <div className="lp-test-role">Community Mesh Operator · Lagos</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Banner */}
          <section className="lp-section">
            <div className="lp-cta-banner">
              <div className="lp-cta-copy">
                <h2>Ready to build your direct encrypted mesh?</h2>
                <p>Deploy the lightweight `zoopd` daemon or launch the web management console in seconds.</p>
              </div>
              <div className="lp-cta-actions">
                <button className="lp-btn-primary large" onClick={() => onNavigate('/downloads')}>
                  <Ico d={Icons.download} size={18} />
                  Download Apps
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
                Open-source, resilient direct peer-to-peer connectivity platform powered by user-space WireGuard and
                adaptive NAT traversal.
              </p>
            </div>

            <div className="lp-footer-col">
              <h4>Products</h4>
              <ul>
                <li><a onClick={() => onNavigate('/products')}>zoopd Daemon</a></li>
                <li><a onClick={() => onNavigate('/products')}>zoop CLI</a></li>
                <li><a onClick={() => onNavigate('/downloads')}>Desktop Nodes</a></li>
                <li><a onClick={() => onNavigate('/downloads')}>Mobile Core</a></li>
              </ul>
            </div>

            <div className="lp-footer-col">
              <h4>Consoles</h4>
              <ul>
                <li><a onClick={() => onLaunchConsole('user')}>Personal Device</a></li>
                <li><a onClick={() => onLaunchConsole('org')}>Organization Fleet</a></li>
                <li><a onClick={() => onLaunchConsole('admin')}>Admin Center</a></li>
                <li><a onClick={() => onNavigate('/downloads')}>Downloads</a></li>
              </ul>
            </div>

            <div className="lp-footer-col">
              <h4>Technology</h4>
              <ul>
                <li><a onClick={() => onNavigate('/architecture')}>Noise_IK Protocol</a></li>
                <li><a onClick={() => onNavigate('/architecture')}>STUN / TURN Traversal</a></li>
                <li><a onClick={() => onNavigate('/security')}>Zero-Trust IPAM</a></li>
                <li><a onClick={() => onNavigate('/architecture')}>Netlink Roaming</a></li>
              </ul>
            </div>

            <div className="lp-footer-col">
              <h4>Community</h4>
              <ul>
                <li><a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">GitHub Repo</a></li>
                <li><a onClick={() => onNavigate('/architecture')}>Documentation</a></li>
                <li><a href="https://github.com/zoop-internet/zoop/issues" target="_blank" rel="noreferrer">Issue Tracker</a></li>
                <li><a onClick={() => onNavigate('/security')}>Security Bug Bounty</a></li>
              </ul>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} Zoop Internet. Open source under MIT License.</span>
            <div className="lp-footer-links">
              <a onClick={() => onNavigate('/security')}>Privacy &amp; Security</a>
              <a onClick={() => onNavigate('/architecture')}>Architecture</a>
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
              Package <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{downloadModal.file}</code> is ready.
              Follow the quick install steps to start your mesh daemon.
            </p>
            <div className="lp-code-snippet" style={{ textAlign: 'left', marginBottom: 24 }}>
              # Start the background daemon<br />
              $ sudo systemctl enable --now zoopd<br />
              <br />
              # Check node status<br />
              $ zoop status
            </div>
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
