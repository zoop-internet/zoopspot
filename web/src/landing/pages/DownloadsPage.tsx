import React, { useMemo } from 'react';
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
  const detectedOs = useMemo(() => {
    if (typeof window === 'undefined') return 'mikrotik';
    return 'mikrotik';
  }, []);

  return (
    <div className="lp-page-wrapper">
      <div className="lp-page-header">
        <p className="lp-eyebrow">Router &amp; Cloud Downloads</p>
        <h1>Get ZoopSpot for your network hardware.</h1>
        <p>
          Automated provisioning scripts for MikroTik RouterOS v7, packages for OpenWrt, and self-hosted cloud binaries.
        </p>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 24px', textAlign: 'center', color: 'var(--ink)' }}>
        Choose Your Platform
      </h2>

      <div className="lp-downloads-grid">
        {DOWNLOAD_DATA.map((item) => (
          <div key={item.id} className="lp-dl-card" style={detectedOs === item.id ? { borderColor: 'rgba(52, 211, 153, 0.4)', background: 'linear-gradient(145deg, var(--surface-card), rgba(52, 211, 153, 0.04))' } : undefined}>
            <div className="lp-dl-top">
              <div className="lp-dl-icon">{item.icon}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {detectedOs === item.id && (
                  <span className="lp-recommended-badge">
                    <Ico d={Icons.check} size={11} /> Recommended
                  </span>
                )}
                <span className="lp-brand-badge">Free / MIT</span>
              </div>
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
              <button
                type="button"
                className="lp-code-snippet"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                onClick={() => copyText(item.installCommand!, item.id)}
                aria-label={`Copy install command: ${item.installCommand}`}
                title="Click to copy install command"
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.installCommand}
                </span>
                <Ico d={copiedCmd === item.id ? Icons.check : Icons.copy} size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--ink-secondary)' }}>
          Need custom firmware images or embedded packages for bulk router deployments?
        </div>
        <a href="/docs" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/docs'); }} style={{ minHeight: 34, fontSize: '0.8125rem' }}>
          Explore Documentation →
        </a>
      </div>

      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
          ← Back to Overview
        </a>
      </div>
    </div>
  );
};
