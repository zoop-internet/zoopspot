import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';

interface TermsPageProps {
  handleNav: (path: string) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ handleNav }) => {
  return (
    <div className="lp-page-wrapper">
      <div className="lp-page-header">
        <p className="lp-eyebrow">Legal &amp; Licensing</p>
        <h1>Terms of Service &amp; EULA</h1>
        <p>
          Effective Date: September 7, 2026 · Official Domain: <a href="https://zoopnetwork.app" style={{ color: '#38bdf8', textDecoration: 'underline' }}>zoopnetwork.app</a>
        </p>
      </div>

      {/* Architecture & Shared Responsibility Summary Banner */}
      <div style={{ maxWidth: 860, margin: '0 auto 28px', background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ color: '#34d399' }}><Ico d={Icons.terminal} size={22} /></span>
          <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>Peer-to-Peer Mesh &amp; Open-Source License Notice</strong>
        </div>
        <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--ink-secondary)', margin: 0 }}>
          Zoop Internet combines an open-source software suite (MIT License) with cloud coordination services. 
          By accessing our software or hosted services, you acknowledge the decentralized peer-to-peer nature of the platform and agree to these terms governing device authorization, acceptable network use, and provider liability.
        </p>
      </div>

      {/* Structured Terms Content */}
      <div className="docs-article" style={{ maxWidth: 860, margin: '0 auto', background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 16, padding: '36px 40px' }}>
        <h2>1. Agreement to Terms</h2>
        <p>
          By downloading, installing, configuring, or using the Zoop Internet applications (desktop daemons, CLI, mobile apps on Android and iOS, or the Web Management Console), you agree to be bound by these Terms of Service and End User License Agreement ("Agreement") and our <a href="/privacy" onClick={(e) => { e.preventDefault(); handleNav('/privacy'); }} style={{ color: '#38bdf8', cursor: 'pointer' }}>Privacy Policy</a>.
        </p>

        <h2>2. Decentralized Peer-to-Peer Architecture</h2>
        <p>
          Zoop is a direct device-to-device mesh connectivity system. The <strong>Control Plane</strong> coordinates device discovery and signaling. The <strong>Data Plane</strong> operates over end-to-end WireGuard® tunnels established directly between peer devices.
        </p>
        <p>
          Zoop is <strong>not</strong> a traditional centralized VPN service; we do not route or proxy internet traffic through our own transit servers. When you connect through another device, that device acts as your exit gateway.
        </p>

        <h2>3. End User License Agreement (EULA)</h2>
        <p>
          <strong>Open Source Code:</strong> The underlying source code of Zoop is made available under the permissive <strong>MIT License</strong>. You are free to inspect, audit, modify, and self-host the software.
        </p>
        <p>
          <strong>Application Distribution:</strong> Zoop grants you a personal, non-exclusive, revocable license to install and use official binary packages and mobile applications distributed through official app store channels or signed GitHub releases.
        </p>

        <h2>4. Cryptographic Key Custody &amp; Security</h2>
        <p>
          You are solely responsible for maintaining the confidentiality and physical security of your devices and cryptographic private keys (Ed25519 identity keys and WireGuard Curve25519 keys). 
          Because private keys are generated and stored exclusively on your device, Zoop cannot recover lost identity keys or reset lost encryption phrases.
        </p>

        <h2>5. Provider vs. Recipient Responsibilities</h2>
        <blockquote>
          <strong>Important Egress Notice for Bandwidth Providers:</strong> When you share your connection, authorized peers will egress to the internet using your device's external public IP address. You retain complete control to approve, decline, or disconnect peers at any time. Do not authorize peers you do not know and trust.
        </blockquote>
        <p>
          Zoop Internet disclaims all liability for internet activity, downloads, or communications initiated by authorized third-party peers through your Provider device.
        </p>

        <h2>6. Acceptable Use Policy (AUP)</h2>
        <p>
          You agree not to use Zoop Internet to:
        </p>
        <ul>
          <li>Engage in or facilitate unlawful activities, including copyright infringement, distribution of malware, ransomware, or malicious bots.</li>
          <li>Execute Denial of Service (DoS/DDoS) attacks, network port scanning, or unauthorized penetration testing against third-party systems.</li>
          <li>Bypass network access controls or organizational security policies without explicit authorization from the network owner.</li>
          <li>Harass, exploit, or cause harm to individuals or systems.</li>
        </ul>
        <p>
          Violation of this Acceptable Use Policy will result in immediate revocation of your access to the hosted coordination plane.
        </p>

        <h2>7. ISP &amp; Carrier Terms Compliance</h2>
        <p>
          You are solely responsible for ensuring your use of Zoop complies with your Internet Service Provider (ISP) or mobile carrier's contract, data limits, and tethering policies. Zoop is not responsible for carrier overage fees, bandwidth throttling, or service termination resulting from your network usage.
        </p>

        <h2>8. Disclaimer of Warranties</h2>
        <p>
          THE SOFTWARE AND COORDINATION SERVICES ARE PROVIDED <strong>"AS IS"</strong> AND <strong>"AS AVAILABLE"</strong>, WITHOUT WARRANTIES OF ANY KIND. ZOOP INTERNET DOES NOT GUARANTEE THAT NAT TRAVERSAL OR HOLE PUNCHING WILL SUCCEED IN ALL NETWORK TOPOLOGIES, OR THAT SERVICE WILL BE ERROR-FREE OR UNINTERRUPTED.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          TO THE FULLEST EXTENT PERMISSIBLE BY APPLICABLE LAW, IN NO EVENT SHALL ZOOP INTERNET, ITS FOUNDERS, CONTRIBUTORS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SOFTWARE, DATA OVERAGES, OR ACTIONS OF AUTHORIZED PEERS.
        </p>

        <h2>10. Contact &amp; Legal Notices</h2>
        <p>
          For questions regarding these Terms or legal inquiries:
        </p>
        <ul>
          <li><strong>Legal Notices:</strong> <a href="mailto:legal@zoopnetwork.app">legal@zoopnetwork.app</a></li>
          <li><strong>General Support:</strong> <a href="mailto:support@zoopnetwork.app">support@zoopnetwork.app</a></li>
          <li><strong>Website:</strong> <a href="https://zoopnetwork.app" target="_blank" rel="noreferrer">https://zoopnetwork.app</a></li>
        </ul>
      </div>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 14 }}>
        <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
          ← Back to Overview
        </a>
        <a href="/privacy" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/privacy'); }}>
          View Privacy Policy →
        </a>
      </div>
    </div>
  );
};
