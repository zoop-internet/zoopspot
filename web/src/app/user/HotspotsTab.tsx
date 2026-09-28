import React, { useState, useEffect, useCallback } from 'react';
import {
  listHotspots,
  createHotspot,
  getHotspotScript,
  listHotspotPackages,
  createHotspotPackage,
  generateVouchers,
  listHotspotVouchers,
  getHotspotStats,
  type ApiHotspot,
  type ApiHotspotPackage,
  type ApiHotspotVoucher,
  type ApiHotspotStats,
} from '../../api/client';
import { Icons } from '../../components/iconDefs';
import { AwsSpinner } from '../../components/AwsSpinner';

const Ico: React.FC<{ d: string | React.ReactNode; size?: number }> = ({ d, size = 15 }) =>
  typeof d === 'string'
    ? <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d as string}/></svg>
    : <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;

const I = Icons;

interface HotspotsTabProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const HotspotsTab: React.FC<HotspotsTabProps> = ({ onToast }) => {
  const [hotspots, setHotspots] = useState<ApiHotspot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  // Stats cache per hotspot
  const [statsMap, setStatsMap] = useState<Record<string, ApiHotspotStats>>({});

  // Sub-entity states for selected hotspot
  const [script, setScript] = useState<string>('');
  const [scriptLoading, setScriptLoading] = useState<boolean>(false);
  const [showScript, setShowScript] = useState<boolean>(false);

  const [packages, setPackages] = useState<ApiHotspotPackage[]>([]);
  const [vouchers, setVouchers] = useState<ApiHotspotVoucher[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Modal / Form States
  const [showNewHotspotModal, setShowNewHotspotModal] = useState<boolean>(false);
  const [newHotspotName, setNewHotspotName] = useState<string>('');
  const [newHotspotSlug, setNewHotspotSlug] = useState<string>('');
  const [newHotspotLocation, setNewHotspotLocation] = useState<string>('');
  const [newHotspotRouterType, setNewHotspotRouterType] = useState<string>('mikrotik');
  const [creatingHotspot, setCreatingHotspot] = useState<boolean>(false);

  const [showNewPkgModal, setShowNewPkgModal] = useState<boolean>(false);
  const [pkgName, setPkgName] = useState<string>('');
  const [pkgPrice, setPkgPrice] = useState<number>(1000);
  const [pkgDuration, setPkgDuration] = useState<number>(60);
  const [pkgDownKbps, setPkgDownKbps] = useState<number>(5120);
  const [pkgUpKbps, setPkgUpKbps] = useState<number>(2048);
  const [creatingPkg, setCreatingPkg] = useState<boolean>(false);

  const [showVoucherModal, setShowVoucherModal] = useState<boolean>(false);
  const [voucherPkgId, setVoucherPkgId] = useState<string>('');
  const [voucherCount, setVoucherCount] = useState<number>(20);
  const [voucherBatchTag, setVoucherBatchTag] = useState<string>('batch-1');
  const [generatingVouchers, setGeneratingVouchers] = useState<boolean>(false);

  const loadHotspots = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listHotspots();
      setHotspots(res.hotspots || []);
      if (res.hotspots && res.hotspots.length > 0 && !selectedHotspotId) {
        setSelectedHotspotId(res.hotspots[0].id);
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to load hotspots', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast, selectedHotspotId]);

  useEffect(() => {
    loadHotspots();
  }, [loadHotspots]);

  // Load selected hotspot packages, vouchers, script and stats
  const loadHotspotDetails = useCallback(async (id: string) => {
    try {
      setLoadingDetails(true);
      const [pkgsRes, vchsRes] = await Promise.all([
        listHotspotPackages(id),
        listHotspotVouchers(id, 100, 0),
      ]);
      setPackages(pkgsRes.packages || []);
      setVouchers(vchsRes.vouchers || []);

      // Fetch stats
      getHotspotStats(id)
        .then(s => setStatsMap(prev => ({ ...prev, [id]: s })))
        .catch(() => { /* non-critical */ });
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to load hotspot details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (selectedHotspotId) {
      loadHotspotDetails(selectedHotspotId);
      setShowScript(false);
      setScript('');
    }
  }, [selectedHotspotId, loadHotspotDetails]);

  const handleFetchScript = async (id: string) => {
    if (script) {
      setShowScript(!showScript);
      return;
    }
    try {
      setScriptLoading(true);
      const scriptContent = await getHotspotScript(id);
      setScript(scriptContent);
      setShowScript(true);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to generate router setup script', 'error');
    } finally {
      setScriptLoading(false);
    }
  };

  const handleCreateHotspot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotspotName.trim()) {
      onToast('Hotspot venue name is required', 'error');
      return;
    }
    try {
      setCreatingHotspot(true);
      const created = await createHotspot({
        name: newHotspotName.trim(),
        slug: newHotspotSlug.trim() || undefined,
        location: newHotspotLocation.trim() || undefined,
        router_type: newHotspotRouterType,
      });
      onToast(`Hotspot "${created.name}" created successfully!`, 'success');
      setShowNewHotspotModal(false);
      setNewHotspotName('');
      setNewHotspotSlug('');
      setNewHotspotLocation('');
      await loadHotspots();
      setSelectedHotspotId(created.id);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to create hotspot', 'error');
    } finally {
      setCreatingHotspot(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotspotId) return;
    if (!pkgName.trim()) {
      onToast('Package name is required', 'error');
      return;
    }
    try {
      setCreatingPkg(true);
      await createHotspotPackage(selectedHotspotId, {
        name: pkgName.trim(),
        price: Number(pkgPrice),
        duration_minutes: Number(pkgDuration),
        rate_down_kbps: Number(pkgDownKbps),
        rate_up_kbps: Number(pkgUpKbps),
      });
      onToast(`Package "${pkgName}" created!`, 'success');
      setShowNewPkgModal(false);
      setPkgName('');
      loadHotspotDetails(selectedHotspotId);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to create package', 'error');
    } finally {
      setCreatingPkg(false);
    }
  };

  const handleGenerateVouchers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotspotId) return;
    if (!voucherPkgId) {
      onToast('Please select a package for vouchers', 'error');
      return;
    }
    try {
      setGeneratingVouchers(true);
      const res = await generateVouchers(selectedHotspotId, {
        package_id: voucherPkgId,
        count: Number(voucherCount),
        batch_tag: voucherBatchTag.trim() || 'batch',
      });
      onToast(`Successfully generated ${res.total} scratch vouchers!`, 'success');
      setShowVoucherModal(false);
      loadHotspotDetails(selectedHotspotId);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to generate vouchers', 'error');
    } finally {
      setGeneratingVouchers(false);
    }
  };

  const selectedHotspot = hotspots.find(h => h.id === selectedHotspotId);
  const currentStats = selectedHotspotId ? statsMap[selectedHotspotId] : undefined;

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    onToast(msg, 'success');
  };

  const fmtBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  const fmtDuration = (mins: number) => {
    if (mins >= 1440) return `${Math.round(mins / 1440)} day${mins >= 2880 ? 's' : ''}`;
    if (mins >= 60) return `${Math.round(mins / 60)} hr${mins >= 120 ? 's' : ''}`;
    return `${mins} mins`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner / KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div style={{ background: 'var(--bg-card, #0f172a)', border: '1px solid var(--border-subtle, #1e293b)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#38bdf8' }}>
            <Ico d={I.wifi} size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Managed Hotspots</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: '#f8fafc' }}>
            {hotspots.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
            {hotspots.filter(h => h.is_online).length} routers online
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #0f172a)', border: '1px solid var(--border-subtle, #1e293b)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#34d399' }}>
            <Ico d={I.users} size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Connected Sessions</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: '#f8fafc' }}>
            {currentStats?.active_sessions ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
            Across active captive portals
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #0f172a)', border: '1px solid var(--border-subtle, #1e293b)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f59e0b' }}>
            <Ico d={I.wallet} size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Bandwidth</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: '#f8fafc' }}>
            {fmtBytes((currentStats?.total_bytes_down ?? 0) + (currentStats?.total_bytes_up ?? 0))}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
            Served via WireGuard CGNAT overlay
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #0f172a)', border: '1px solid var(--border-subtle, #1e293b)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a855f7' }}>
            <Ico d={I.fileText} size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prepaid Vouchers</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: '#f8fafc' }}>
            {currentStats?.claimed_vouchers ?? 0} / {currentStats?.total_vouchers ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
            Vouchers redeemed
          </div>
        </div>
      </div>

      {/* Main Layout: Hotspot Selector & Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left Column: Hotspot List */}
        <div className="section" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="section-title">Your Hotspots</span>
            <button
              className="btn btn-primary btn-xs"
              onClick={() => setShowNewHotspotModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Ico d={I.plus} size={13} />
              <span>Add Hotspot</span>
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 0' }}>
              <AwsSpinner size={20} />
            </div>
          ) : hotspots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.875rem', marginBottom: 12 }}>No hotspots deployed yet.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewHotspotModal(true)}>
                Deploy Your First Hotspot
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hotspots.map(h => (
                <div
                  key={h.id}
                  onClick={() => setSelectedHotspotId(h.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: selectedHotspotId === h.id ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedHotspotId === h.id ? 'rgba(56, 189, 248, 0.4)' : 'var(--border-subtle, #1e293b)'}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>{h.name}</div>
                    <span className={`badge ${h.is_online ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                      {h.is_online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>/{h.slug}</span>
                    <span>·</span>
                    <span style={{ textTransform: 'capitalize' }}>{h.router_type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Hotspot Control Workspace */}
        {selectedHotspot ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header Card */}
            <div className="section" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                      {selectedHotspot.name}
                    </h2>
                    <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      {selectedHotspot.router_type}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>Location: <strong>{selectedHotspot.location || 'Uganda'}</strong></span>
                    <span>·</span>
                    <span>Tunnel IP: <code style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{selectedHotspot.router_ip || selectedHotspot.tunnel_ip || '100.64.0.2'}</code></span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <a
                    href={`/portal?hotspot=${encodeURIComponent(selectedHotspot.slug)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: 'none' }}
                  >
                    <Ico d={I.zap} size={14} />
                    <span>Open Portal</span>
                  </a>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleFetchScript(selectedHotspot.id)}
                    disabled={scriptLoading}
                  >
                    {scriptLoading ? <AwsSpinner size={14} variant="inverted" /> : <Ico d={I.copy} size={14} />}
                    <span>{showScript ? 'Hide Setup Script' : 'Router Setup Script'}</span>
                  </button>
                </div>
              </div>

              {/* MikroTik RouterOS v7 Setup Script Panel */}
              {showScript && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                      MikroTik RouterOS v7 Auto-Provisioning Script
                    </div>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => copyToClipboard(script, 'RouterOS setup script copied to clipboard!')}
                    >
                      <Ico d={I.copy} size={12} />
                      <span>Copy Full Script</span>
                    </button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                    Log into your MikroTik router via <strong>WinBox</strong> or SSH, open the <strong>Terminal</strong>, and paste the script below. It creates the WireGuard management tunnel, configures the REST API user, and bypasses MarzPay and MoMo walled garden gateways.
                  </p>
                  <pre
                    style={{
                      background: '#020617',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: 8,
                      padding: '14px 16px',
                      color: '#a5f3fc',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono, monospace)',
                      maxHeight: 220,
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {script}
                  </pre>
                </div>
              )}
            </div>

            {/* Packages Management Section */}
            <div className="section" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                    Internet Pricing Packages
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    These packages are displayed to users on the captive portal checkout page.
                  </div>
                </div>
                <button className="btn btn-secondary btn-xs" onClick={() => setShowNewPkgModal(true)}>
                  <Ico d={I.plus} size={12} />
                  <span>New Package</span>
                </button>
              </div>

              {loadingDetails ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}><AwsSpinner size={18} /></div>
              ) : packages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No packages configured. Click "New Package" to add one (e.g. 1 Hour for 1,000 UGX).
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {packages.map(p => (
                    <div
                      key={p.id}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 10,
                        padding: '14px 16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>{p.name}</span>
                        <span className="badge badge-success" style={{ fontWeight: 800 }}>
                          {p.price.toLocaleString()} {p.currency || selectedHotspot.currency || 'UGX'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <div>Duration: <strong style={{ color: 'var(--text-primary)' }}>{fmtDuration(p.duration_minutes)}</strong></div>
                        <div>Speed Cap: <strong style={{ color: 'var(--text-primary)' }}>{(p.rate_limit_down_kbps / 1024).toFixed(0)}M / {(p.rate_limit_up_kbps / 1024).toFixed(0)}M</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Offline Scratch Vouchers Section */}
            <div className="section" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                    Cash Vouchers
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Generate 8-digit alphanumeric scratch cards for retail sales at venues.
                  </div>
                </div>
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={() => {
                    if (packages.length > 0) setVoucherPkgId(packages[0].id);
                    setShowVoucherModal(true);
                  }}
                  disabled={packages.length === 0}
                >
                  <Ico d={I.plus} size={12} />
                  <span>Generate Batch</span>
                </button>
              </div>

              {loadingDetails ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}><AwsSpinner size={18} /></div>
              ) : vouchers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No vouchers generated yet. Create a batch to sell physical Wi-Fi cards for cash.
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Showing latest {vouchers.length} vouchers
                    </span>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        const list = vouchers.map(v => `${v.code} (${v.is_claimed ? 'CLAIMED' : 'ACTIVE'})`).join('\n');
                        copyToClipboard(list, 'Vouchers copied to clipboard');
                      }}
                    >
                      <Ico d={I.copy} size={11} />
                      <span>Copy All Codes</span>
                    </button>
                  </div>
                  <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px' }}>Code</th>
                          <th style={{ padding: '8px 12px' }}>Batch</th>
                          <th style={{ padding: '8px 12px' }}>Status</th>
                          <th style={{ padding: '8px 12px' }}>Claimed MAC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vouchers.map(v => (
                          <tr key={v.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                              {v.code}
                            </td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{v.batch_tag}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span className={`badge ${v.is_claimed ? 'badge-neutral' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
                                {v.is_claimed ? 'Claimed' : 'Available'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {v.claimed_by_mac || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="section" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Select or create a hotspot to manage settings, view packages, and generate router scripts.
          </div>
        )}
      </div>

      {/* Modal: New Hotspot */}
      {showNewHotspotModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 }}>
          <div style={{ background: '#0b1329', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Deploy New Hotspot</h3>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowNewHotspotModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateHotspot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Venue / Site Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acacia Cafe Wi-Fi"
                  value={newHotspotName}
                  onChange={e => setNewHotspotName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>URL Slug (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. acacia-cafe"
                  value={newHotspotSlug}
                  onChange={e => setNewHotspotSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Physical Location</label>
                <input
                  type="text"
                  placeholder="e.g. Acacia Mall, 2nd Floor, Kampala"
                  value={newHotspotLocation}
                  onChange={e => setNewHotspotLocation(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Router Platform</label>
                <select
                  value={newHotspotRouterType}
                  onChange={e => setNewHotspotRouterType(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.875rem' }}
                >
                  <option value="mikrotik">MikroTik RouterOS v7 (hEX, hAP, RB5009)</option>
                  <option value="openwrt">OpenWrt 23.05+ (WireGuard + iptables)</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewHotspotModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={creatingHotspot}>
                  {creatingHotspot ? <AwsSpinner size={14} variant="inverted" /> : 'Create Hotspot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Package */}
      {showNewPkgModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 }}>
          <div style={{ background: '#0b1329', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Add Internet Package</h3>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowNewPkgModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreatePackage} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Package Name</label>
                <input
                  type="text"
                  placeholder="e.g. 1 Hour Fast Access"
                  value={pkgName}
                  onChange={e => setPkgName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Price (UGX)</label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={pkgPrice}
                    onChange={e => setPkgPrice(Number(e.target.value))}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Duration (Minutes)</label>
                  <input
                    type="number"
                    min="10"
                    value={pkgDuration}
                    onChange={e => setPkgDuration(Number(e.target.value))}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Download (Kbps)</label>
                  <input
                    type="number"
                    value={pkgDownKbps}
                    onChange={e => setPkgDownKbps(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Upload (Kbps)</label>
                  <input
                    type="number"
                    value={pkgUpKbps}
                    onChange={e => setPkgUpKbps(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewPkgModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={creatingPkg}>
                  {creatingPkg ? <AwsSpinner size={14} variant="inverted" /> : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Generate Vouchers */}
      {showVoucherModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 }}>
          <div style={{ background: '#0b1329', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Generate Scratch Vouchers</h3>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowVoucherModal(false)}>✕</button>
            </div>
            <form onSubmit={handleGenerateVouchers} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Select Package Tier</label>
                <select
                  value={voucherPkgId}
                  onChange={e => setVoucherPkgId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.875rem' }}
                >
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.price.toLocaleString()} {p.currency || selectedHotspot?.currency || 'UGX'} ({fmtDuration(p.duration_minutes)})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Number of Cards</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={voucherCount}
                    onChange={e => setVoucherCount(Number(e.target.value))}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Batch Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. march-lot-1"
                    value={voucherBatchTag}
                    onChange={e => setVoucherBatchTag(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowVoucherModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={generatingVouchers}>
                  {generatingVouchers ? <AwsSpinner size={14} variant="inverted" /> : 'Generate Codes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
