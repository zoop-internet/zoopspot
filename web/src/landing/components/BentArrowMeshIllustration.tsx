import { Ico } from './Icons';
import { Icons } from './iconConstants';

/* ─── Prominent Bent-Arrow Network Illustration ─────────────────────────── */
export const BentArrowMeshIllustration: React.FC = () => {
  return (
    <div className="lp-bent-mesh-wrap" aria-label="Direct Internet Sharing Between Devices">
      <div className="lp-mesh-ambient-glow" aria-hidden />

      <svg className="lp-bent-svg" viewBox="0 0 600 440" role="img" aria-labelledby="meshTitle meshDesc">
        <title id="meshTitle">Zoop direct mesh — four devices linked device-to-device</title>
        <desc id="meshDesc">Home broadband, laptop on the road, mobile phone and trusted peers connect directly via encrypted tunnels through Zoop hub; direct path about 12ms versus VPN-relayed about 80ms</desc>
        <defs>
          <linearGradient id="curveGradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="curveGradGreen" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="curveGradLime" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0.95" />
          </linearGradient>

          {/* Arrow markers */}
          <marker id="arrowCyan" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>
          <marker id="arrowGreen" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#34d399" />
          </marker>
          <marker id="arrowLime" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#a3e635" />
          </marker>
        </defs>

        {/* Ambient faint guide rings */}
        <circle cx="300" cy="220" r="130" fill="none" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1" strokeDasharray="4,6" />
        <circle cx="300" cy="220" r="210" fill="none" stroke="rgba(52, 211, 153, 0.08)" strokeWidth="1" strokeDasharray="4,8" />

        {/* 1. Curved Bent Arrow from Home Broadband (top-left) -> Laptop on the Road (top-right) */}
        <path
          d="M 218 45 C 280 8, 330 8, 382 45"
          stroke="url(#curveGradCyan)"
          className="lp-bent-arrow-path"
          markerEnd="url(#arrowCyan)"
        />

        {/* 2. Curved Bent Arrow from Mobile Phone (bottom-left) -> Laptop on the Road (top-right) */}
        <path
          d="M 218 375 C 320 330, 390 190, 485 78"
          stroke="url(#curveGradGreen)"
          className="lp-bent-arrow-path"
          markerEnd="url(#arrowGreen)"
        />

        {/* 3. Curved Bent Arrow from Home Broadband (top-left) -> Friends / Team Device (bottom-right) */}
        <path
          d="M 115 80 C 115 220, 240 375, 382 375"
          stroke="url(#curveGradLime)"
          className="lp-bent-arrow-path"
          markerEnd="url(#arrowLime)"
        />

        {/* 4. Direct Bridge Rays to Central Zoop Core */}
        <line x1="300" y1="220" x2="215" y2="75" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.5" strokeDasharray="3,4" />
        <line x1="300" y1="220" x2="385" y2="75" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.5" strokeDasharray="3,4" />
        <line x1="300" y1="220" x2="215" y2="365" stroke="rgba(52, 211, 153, 0.25)" strokeWidth="1.5" strokeDasharray="3,4" />
        <line x1="300" y1="220" x2="385" y2="365" stroke="rgba(163, 230, 53, 0.25)" strokeWidth="1.5" strokeDasharray="3,4" />
      </svg>

      {/* Central Zoop Hub — decorative, SVG already describes mesh — performance: async decode */}
      <div className="lp-node-center-hub" title="Zoop Direct Bridge" aria-hidden="true">
        <img src="/zoopicon-32.webp" srcSet="/zoopicon-32.webp 1x, /zoopicon-192.webp 2x" alt="" aria-hidden="true" width={44} height={44} decoding="async" loading="eager" />
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
