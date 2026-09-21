import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';

interface PrivacyPageProps {
  handleNav: (path: string) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ handleNav }) => {
  return (
    <div className="lp-page-wrapper">
      <div className="lp-page-header">
        <p className="lp-eyebrow">Zero-Knowledge Network</p>
        <h1>Privacy Policy</h1>
        <p>
          Effective Date: September 7, 2026 · Official Domain: <a href="https://zoopnetwork.app" style={{ color: '#38bdf8', textDecoration: 'underline' }}>zoopnetwork.app</a>
        </p>
      </div>

      {/* Apple & Google Play Store Compliance Callout Banner */}
      <div style={{ maxWidth: 860, margin: '0 auto 28px', background: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(52,211,153,0.08))', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ color: '#38bdf8' }}><Ico d={Icons.shield} size={22} /></span>
          <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>Core Privacy Commitment (Apple &amp; Google Play Store Disclosure)</strong>
        </div>
        <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--ink-secondary)', margin: '0 0 12px' }}>
          Zoop Internet is engineered with a strict <strong>Zero-Knowledge, Zero-Inspection architecture</strong>. 
          Unlike conventional commercial VPN providers that route all user traffic through centralized corporate datacenters:
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--ink-secondary)' }}>
          <li><strong>Zero Payload Logging:</strong> We do NOT monitor, inspect, store, or log your network traffic, browsing history, DNS queries, or destination IP addresses.</li>
          <li><strong>Zero Data Monetization:</strong> We do NOT sell, rent, or share personal data with advertisers or third parties.</li>
          <li><strong>End-to-End Cryptography:</strong> All peer connections use WireGuard® authenticated encryption (Noise_IK, ChaCha20-Poly1305, Curve25519). Relays only forward opaque encrypted binary frames without decryption keys.</li>
        </ul>
      </div>

      {/* Structured Legal Document Content */}
      <div className="docs-article" style={{ maxWidth: 860, margin: '0 auto', background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 16, padding: '36px 40px' }}>
        <h2>1. Introduction &amp; Architecture Overview</h2>
        <p>
          Zoop Internet ("Zoop", "we", "us", or "our") provides an open-source, decentralized device-to-device mesh connectivity platform. 
          Our software decouples the <strong>Control Plane</strong> (cryptographic identity verification, STUN signaling, IPAM) from the <strong>Data Plane</strong> (point-to-point encrypted tunnels).
        </p>
        <p>
          When you connect to another device via Zoop, your traffic travels directly between those endpoints. In circumstances where symmetric NAT or firewall restrictions prevent direct UDP hole punching, packets transit encrypted WebSocket relays that forward opaque binary frames without the ability to decrypt or inspect the contents.
        </p>

        <h2>2. Information We Explicitly Do NOT Collect</h2>
        <p>
          In compliance with Apple App Store Guideline 5.4 and Google Play VPN Service requirements, Zoop explicitly affirms that we never collect, log, or retain:
        </p>
        <ul>
          <li><strong>Traffic Payloads:</strong> Content of your HTTP/HTTPS requests, media streaming, files, or application traffic.</li>
          <li><strong>Browsing Activity:</strong> URLs visited, search queries, or visited domains.</li>
          <li><strong>DNS Queries:</strong> Real-time domain resolution lookups.</li>
          <li><strong>Destination IP Addresses:</strong> External web services or servers accessed through a Provider peer.</li>
          <li><strong>Device Advertising Identifiers:</strong> No IDFA, AAID, or tracking beacons exist in the software.</li>
        </ul>

        <h2>3. Information We Process (Data Minimization)</h2>
        <p>
          To provide coordination and mutual device authentication, Zoop processes only minimal technical data:
        </p>
        <ul>
          <li><strong>Cryptographic Identities:</strong> Ed25519 public keys used to authenticate API requests, and Curve25519 public keys used for WireGuard peer handshakes. <em>Private keys never leave your local device.</em></li>
          <li><strong>Pseudonymous Account Identifier:</strong> A formatted Zoop ID (e.g. <code>ZP-...</code>) derived deterministically from your public identity.</li>
          <li><strong>Ephemeral Signaling Metadata:</strong> Reflexive IP addresses and port candidates discovered via STUN (e.g., <code>stun.l.google.com:19302</code>) to facilitate NAT traversal. This data exists solely in volatile memory during negotiation.</li>
          <li><strong>Device Labels:</strong> User-provided device names (e.g., "Home PC", "Travel Laptop") to display in your personal device console.</li>
        </ul>

        <h2>4. Encrypted Relay Node Fallback</h2>
        <p>
          If direct peer-to-peer connection is prohibited by restrictive firewalls or Carrier-Grade NAT (CGNAT), traffic fails over to a relay node. Relays operate on an encrypted binary pass-through model (similar to WireGuard DERP). The relay operator has no knowledge of encryption keys and cannot inspect, modify, or log payload data.
        </p>

        <h2>5. Mobile Platform Disclosures (iOS &amp; Android)</h2>
        <p>
          <strong>iOS NetworkExtension:</strong> The Zoop iOS app uses Apple's <code>NEPacketTunnelProvider</code> to interface with the local user-space WireGuard networking core. Network permissions are used exclusively to create virtual tunnel routing.
        </p>
        <p>
          <strong>Android VpnService:</strong> The Zoop Android app utilizes <code>VpnService</code> to construct a local TUN adapter. A persistent Android system notification is shown whenever a tunnel is active to maintain clear user awareness.
        </p>

        <h2>6. Data Retention &amp; User Deletion Rights (GDPR &amp; CCPA)</h2>
        <p>
          Signaling messages and STUN candidates are discarded immediately after connection negotiation. Account and device public keys are retained only while your account is active.
        </p>
        <p>
          Under GDPR and CCPA, you have the right to inspect, export, or permanently erase your data. Deleting a device or account via the Web Console or CLI instantly deletes all associated public keys and IPAM allocations from our database.
        </p>

        <h2>7. Security Safeguards &amp; Open Source</h2>
        <p>
          Zoop Internet is fully open-source and MIT-licensed. All source code, cryptographic implementations, and infrastructure recipes are publicly auditable at <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">github.com/zoop-internet/zoop</a>.
        </p>

        <h2>8. Contact &amp; Inquiries</h2>
        <p>
          For privacy inquiries, audit requests, or data rights requests, contact our team:
        </p>
        <ul>
          <li><strong>Email:</strong> <a href="mailto:support@zoopnetwork.app">support@zoopnetwork.app</a></li>
          <li><strong>Security:</strong> <a href="mailto:security@zoopnetwork.app">security@zoopnetwork.app</a></li>
          <li><strong>Official Web:</strong> <a href="https://zoopnetwork.app" target="_blank" rel="noreferrer">https://zoopnetwork.app</a></li>
        </ul>
      </div>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 14 }}>
        <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
          ← Back to Overview
        </a>
        <a href="/terms" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/terms'); }}>
          View Terms of Service (EULA) →
        </a>
      </div>
    </div>
  );
};
