import React, { useState, useEffect, useRef } from 'react';
import './CaptivePortal.css';
import {
  getPortalHotspot,
  portalCheckout,
  portalVoucher,
  portalLifeline,
  getPortalSession,
  type ApiHotspotPackage,
  type ApiHotspotSession,
} from '../api/client';
import { AwsSpinner } from '../components/AwsSpinner';

type PortalTab = 'momo' | 'voucher' | 'lifeline';

export const CaptivePortal: React.FC = () => {
  const [tab, setTab] = useState<PortalTab>('momo');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Router context parsed from URL
  const [hotspotSlug, setHotspotSlug] = useState<string>('default');
  const [macAddress, setMacAddress] = useState<string>('');
  const [clientIP, setClientIP] = useState<string>('');

  // Hotspot details
  const [venueName, setVenueName] = useState<string>('ZoopSpot Wi-Fi');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [packages, setPackages] = useState<ApiHotspotPackage[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');

  // Mobile Money Form State
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [telcoProvider, setTelcoProvider] = useState<'mtn' | 'airtel' | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Voucher Form State
  const [voucherCode, setVoucherCode] = useState<string>('');

  // Active Session / Connected State
  const [activeSession, setActiveSession] = useState<ApiHotspotSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [waitingForPin, setWaitingForPin] = useState<boolean>(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse query parameters from captive redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('hotspot') || 'default';
    const mac = params.get('mac') || 'AA:BB:CC:11:22:33';
    const ip = params.get('ip') || '';

    setHotspotSlug(slug);
    setMacAddress(mac);
    setClientIP(ip);

    loadHotspotData(slug);
  }, []);

  const loadHotspotData = async (slug: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPortalHotspot(slug);
      setVenueName(data.hotspot.name);
      setIsOnline(data.hotspot.is_online);
      setPackages(data.packages);
      if (data.packages.length > 0) {
        setSelectedPkgId(data.packages[0].id);
      }
    } catch {
      // Fallback default packages for offline/mock demo
      setVenueName('ZoopSpot High-Speed Wi-Fi');
      setIsOnline(true);
      setPackages([
        {
          id: 'pkg-1',
          hotspot_id: 'default',
          name: '1 Hour Rush',
          price: 500,
          duration_minutes: 60,
          data_limit_bytes: 0,
          rate_limit_down_kbps: 5120,
          rate_limit_up_kbps: 2048,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'pkg-2',
          hotspot_id: 'default',
          name: '3 Hours Super',
          price: 1000,
          duration_minutes: 180,
          data_limit_bytes: 0,
          rate_limit_down_kbps: 5120,
          rate_limit_up_kbps: 2048,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'pkg-3',
          hotspot_id: 'default',
          name: '24 Hours Day Pass',
          price: 2000,
          duration_minutes: 1440,
          data_limit_bytes: 0,
          rate_limit_down_kbps: 10240,
          rate_limit_up_kbps: 5120,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);
      setSelectedPkgId('pkg-1');
    } finally {
      setLoading(false);
    }
  };

  // Detect telecom provider from phone prefix
  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('077') || cleaned.startsWith('078') || cleaned.startsWith('076') || cleaned.startsWith('25677') || cleaned.startsWith('25678')) {
      setTelcoProvider('mtn');
    } else if (cleaned.startsWith('070') || cleaned.startsWith('075') || cleaned.startsWith('074') || cleaned.startsWith('25670') || cleaned.startsWith('25675')) {
      setTelcoProvider('airtel');
    } else {
      setTelcoProvider(null);
    }
  };

  // 1. Submit Mobile Money Checkout
  const handleMomoCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !selectedPkgId) return;

    try {
      setSubmitting(true);
      setError(null);
      const resp = await portalCheckout({
        hotspot_slug: hotspotSlug,
        package_id: selectedPkgId,
        phone_number: phoneNumber,
        mac_address: macAddress,
        client_ip: clientIP,
      });

      setWaitingForPin(true);

      // Start polling session status
      startPolling(resp.session_id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment initiation failed. Please check phone number.');
      setSubmitting(false);
    }
  };

  // Polling for MoMo payment confirmation
  const startPolling = (sessionId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    let attempts = 0;
    pollTimerRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 60) { // 2 minutes timeout
        clearInterval(pollTimerRef.current!);
        setWaitingForPin(false);
        setSubmitting(false);
        setError('Payment confirmation timed out. If you were debited, access will activate automatically.');
        return;
      }

      try {
        const sess = await getPortalSession(sessionId);
        if (sess.status === 'active') {
          clearInterval(pollTimerRef.current!);
          setWaitingForPin(false);
          setSubmitting(false);
          setActiveSession(sess);
          initCountdown(sess.expires_at);
        }
      } catch {
        // Continue polling
      }
    }, 2000);
  };

  // 2. Claim Voucher
  const handleVoucherClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode) return;

    try {
      setSubmitting(true);
      setError(null);
      const sess = await portalVoucher({
        hotspot_slug: hotspotSlug,
        code: voucherCode.trim(),
        mac_address: macAddress,
        client_ip: clientIP,
      });
      setActiveSession(sess);
      initCountdown(sess.expires_at);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired voucher code.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Claim Free 10-Min Lifeline
  const handleLifelineClaim = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const sess = await portalLifeline({
        hotspot_slug: hotspotSlug,
        mac_address: macAddress,
        client_ip: clientIP,
      });
      setActiveSession(sess);
      initCountdown(sess.expires_at);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lifeline already claimed today.');
    } finally {
      setSubmitting(false);
    }
  };

  // Initialize countdown timer
  const initCountdown = (expiresAtStr?: string) => {
    if (!expiresAtStr) {
      setRemainingSeconds(3600); // fallback 1 hour
      return;
    }
    const exp = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((exp - now) / 1000));
    setRemainingSeconds(diff);
  };

  // Decrement timer every second
  useEffect(() => {
    if (activeSession && remainingSeconds > 0) {
      const interval = setInterval(() => {
        setRemainingSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession, remainingSeconds]);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="portal-container">
      <div className="portal-card">
        {/* Header */}
        <div className="portal-header">
          <div className="portal-brand">
            <img src="/zoopicon-32.webp" alt="ZoopSpot" width={28} height={28} />
            <span className="portal-brand-text">Zoop<span className="portal-brand-badge">Spot</span></span>
          </div>
          <h1 className="portal-venue-name">{venueName}</h1>
          <div className="portal-venue-status">
            <span className="dot" />
            <span>{isOnline ? 'High-Speed Wi-Fi Active' : 'Connecting to Gateway…'}</span>
          </div>
        </div>

        {error && <div className="portal-error-msg">{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <AwsSpinner size={28} />
          </div>
        ) : activeSession ? (
          /* Connected State */
          <div className="portal-connected-view">
            <div className="connected-checkmark">✓</div>
            <h2 className="connected-title">You're Connected!</h2>
            <p className="connected-subtitle">Unlimited internet is active for this device ({macAddress})</p>

            <div className="connected-timer-box">
              <div className="connected-timer-val">{formatTimer(remainingSeconds)}</div>
              <div className="connected-timer-lbl">Remaining Session Time</div>
            </div>

            <button
              className="portal-btn-primary"
              onClick={() => window.open('https://google.com', '_blank')}
            >
              Start Browsing the Web
            </button>
          </div>
        ) : waitingForPin ? (
          /* MoMo STK Push Pending Dialog */
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <div style={{ marginBottom: 16 }}>
              <AwsSpinner size={36} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px' }}>
              Check Your Phone
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 20px' }}>
              A prompt was sent to <b>{phoneNumber}</b>.<br />
              Please enter your <b>MTN MoMo</b> or <b>Airtel Money PIN</b> to approve the connection.
            </p>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Waiting for network confirmation…
            </div>
          </div>
        ) : (
          /* Portal Purchase / Voucher Form */
          <>
            <div className="portal-tabs">
              <button
                className={`portal-tab-btn ${tab === 'momo' ? 'active' : ''}`}
                onClick={() => setTab('momo')}
              >
                Mobile Money
              </button>
              <button
                className={`portal-tab-btn ${tab === 'voucher' ? 'active' : ''}`}
                onClick={() => setTab('voucher')}
              >
                Voucher Code
              </button>
              <button
                className={`portal-tab-btn ${tab === 'lifeline' ? 'active' : ''}`}
                onClick={() => setTab('lifeline')}
              >
                10-Min Free
              </button>
            </div>

            {tab === 'momo' && (
              <form onSubmit={handleMomoCheckout}>
                <div className="portal-packages-title">1. Select Wi-Fi Pass</div>
                <div className="portal-packages-list">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`package-card ${selectedPkgId === pkg.id ? 'selected' : ''}`}
                      onClick={() => setSelectedPkgId(pkg.id)}
                    >
                      <div>
                        <div className="package-name">{pkg.name}</div>
                        <div className="package-speed">
                          Speed: {(pkg.rate_limit_down_kbps / 1024).toFixed(0)} Mbps • Unlimited
                        </div>
                      </div>
                      <div className="package-price-wrap">
                        <span className="package-price">{pkg.price.toLocaleString()}</span>
                        <span className="package-currency">UGX</span>
                      </div>
                    </div>
                  ))}
                </div>

                <label className="portal-field-label">2. Enter Phone Number</label>
                <div className="portal-input-wrap">
                  <input
                    type="tel"
                    className="portal-input"
                    placeholder="e.g. 0771 234 567"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    required
                  />
                  {telcoProvider && (
                    <span className={`portal-telco-pill ${telcoProvider}`}>
                      {telcoProvider}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="portal-btn-primary"
                  disabled={submitting || !phoneNumber || !selectedPkgId}
                >
                  {submitting ? <AwsSpinner size={16} /> : 'Pay & Connect'}
                </button>
              </form>
            )}

            {tab === 'voucher' && (
              <form onSubmit={handleVoucherClaim}>
                <label className="portal-field-label">Enter Voucher PIN</label>
                <div className="portal-input-wrap">
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. ZP-9842-1049"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  disabled={submitting || !voucherCode}
                >
                  {submitting ? <AwsSpinner size={16} /> : 'Redeem Voucher'}
                </button>
              </form>
            )}

            {tab === 'lifeline' && (
              <div className="lifeline-hero">
                <div className="lifeline-icon">⚡</div>
                <h3 className="lifeline-title">Emergency 10-Minute Access</h3>
                <p className="lifeline-desc">
                  Need quick internet to top up your mobile money or send a WhatsApp message?
                  Enjoy 10 minutes of free Wi-Fi per day.
                </p>
                <button
                  type="button"
                  className="portal-btn-primary"
                  onClick={handleLifelineClaim}
                  disabled={submitting}
                >
                  {submitting ? <AwsSpinner size={16} /> : 'Claim 10 Minutes Free'}
                </button>
              </div>
            )}
          </>
        )}

        <div className="portal-footer">
          Powered by ZoopSpot • Automated Mobile Money Gateway
        </div>
      </div>
    </div>
  );
};
