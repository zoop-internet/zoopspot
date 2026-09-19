import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';

interface ProductsPageProps {
  handleNav: (path: string) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ handleNav }) => {
  return (
    <div className="lp-page-wrapper">
      <div className="lp-page-header">
        <p className="lp-eyebrow">One Ecosystem</p>
        <h1>Built for every device in your life.</h1>
        <p>Run Zoop quietly in the background on your computers, control it from your phone, or manage it via the web.</p>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 24px', textAlign: 'center', color: 'var(--ink)' }}>Application Suite</h2>

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
          <div className="lp-product-actions">
            <a href="/downloads" className="lp-btn-primary" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>
              Download for PC &amp; Mac <Ico d={Icons.arrowRight} size={13} />
            </a>
          </div>
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
          <div className="lp-product-actions">
            <a href="/downloads" className="lp-btn-primary" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>
              Get Mobile App <Ico d={Icons.arrowRight} size={13} />
            </a>
          </div>
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
          <div className="lp-product-actions">
            <a href="/app" className="lp-btn-primary" onClick={(e) => { e.preventDefault(); handleNav('/app'); }}>
              Open Web Console <Ico d={Icons.arrowRight} size={13} />
            </a>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 64, textAlign: 'center' }}>
        <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
          ← Back to Overview
        </a>
      </div>
    </div>
  );
};
