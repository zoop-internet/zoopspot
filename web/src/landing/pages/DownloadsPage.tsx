import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';
import { DOWNLOAD_DATA } from '../data/downloadsData';

interface DownloadsPageProps {
  handleNav: (path: string) => void;
  handleDownloadClick: (platform: string, file: string) => void;
  copyText: (text: string, id: string) => void;
  copiedCmd: string | null;
}

export const DownloadsPage: React.FC<DownloadsPageProps> = ({
  handleNav,
  handleDownloadClick,
  copyText,
  copiedCmd,
}) => {
  return (
    <div className="lp-page-wrapper">
      <div className="lp-page-header">
        <p className="lp-eyebrow">Get Started in Seconds</p>
        <h1>Download Zoop for your devices.</h1>
        <p>
          Available for Linux, macOS, Windows, Android, iOS, and home Wi-Fi routers. Fast, lightweight, and completely free.
        </p>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 24px', textAlign: 'center', color: 'var(--ink)' }}>Choose Your Operating System</h2>

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

      <div style={{ marginTop: 28, background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--ink-secondary)' }}>
          <strong style={{ color: 'var(--ink)' }}>Verify downloads:</strong> All binaries are signed; checksums at <a href="https://github.com/zoop-internet/zoop/releases" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>GitHub Releases</a> · <code style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--line)', padding: '1px 6px', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>sha256sum -c zoop*.sha256</code>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
          Need help? <a href="https://github.com/zoop-internet/zoop/issues" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>Open an issue →</a>
        </div>
      </div>

      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
          ← Back to Overview
        </a>
      </div>
    </div>
  );
};
