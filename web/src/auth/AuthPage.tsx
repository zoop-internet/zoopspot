import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/NetworkContext';
import './AuthPage.css';

/* ─── Icons ────────────────────────────────────────────────────────── */
const Icons = {
  eye: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  arrowLeft: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  zap: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  key: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 2-2 2m-1.5 1.5L12 11l-4-4-6 6a5 5 0 0 0 7.07 7.07L16 13l2 2 2-2 2-2-3-3" />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  alert: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

const PIN_LENGTH = 6;

/* ─── PIN Boxes — accessible OTP with single hidden input for autofill ── */
const PinBoxes: React.FC<{
  value: string;
  onChange: (v: string) => void;
  length?: number;
  showDigits?: boolean;
  error?: boolean;
  disabled?: boolean;
  idPrefix?: string;
  describedBy?: string;
}> = ({ value, onChange, length = PIN_LENGTH, showDigits = false, error = false, disabled = false, idPrefix = 'pin', describedBy }) => {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const isComplete = value.replace(/\D/g,'').length === length;
  const digits = value.padEnd(length, ' ').split('').slice(0, length);

  const handleHiddenChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g,'').slice(0, length);
    onChange(cleaned);
  };

  const handleBoxClick = () => hiddenRef.current?.focus();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // let hidden input handle cursor
    }
  };

  return (
    <div className={`pin-boxes ${error ? 'pin-error' : ''} ${isComplete ? 'pin-complete' : ''}`} role="group" aria-label="Zoop PIN — 6 digits, revocable, never emailed" onClick={handleBoxClick}>
      {/* Hidden input — single source for autofill/one-time-code */}
      <input
        ref={hiddenRef}
        id={`${idPrefix}-hidden`}
        type={showDigits ? 'text' : 'password'}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={length}
        value={value}
        onChange={e => handleHiddenChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={`Zoop PIN, ${length} digits`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="pin-hidden-input"
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
      />
      {Array.from({ length }).map((_, i) => {
        const d = digits[i]?.trim() || '';
        const isFilled = Boolean(d);
        const isActive = value.length === i && !disabled;
        return (
          <div
            key={i}
            id={`${idPrefix}-${i}`}
            className={`pin-box ${isFilled ? 'filled' : ''} ${isActive ? 'active' : ''} ${error ? 'error' : ''}`}
            onClick={handleBoxClick}
            aria-hidden="true"
          >
            {d ? (showDigits ? d : '•') : ''}
          </div>
        );
      })}
    </div>
  );
};

interface AuthPageProps {
  initialTab?: 'signin' | 'signup';
  redirectUrl?: string;
  onNavigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialTab = 'signin',
  redirectUrl = '/app',
  onNavigate,
}) => {
  const { login, signup, loginWithKey, isRegistering } = useApp();
  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);

  // Sign in
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPin, setSignInPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showKeyImport, setShowKeyImport] = useState(false);
  const [rawKeyInput, setRawKeyInput] = useState('');

  // Sign up
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpDisplayName, setSignUpDisplayName] = useState('');
  const [signUpPin, setSignUpPin] = useState('');
  const [signUpPinConfirm, setSignUpPinConfirm] = useState('');
  const [signUpDeviceName, setSignUpDeviceName] = useState('');
  const [isProvider, setIsProvider] = useState(false);

  // Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const triggerShake = () => setShakeKey(k => k + 1);

  useEffect(() => {
    const ua = navigator.userAgent;
    let detected = 'My Browser Device';
    if (ua.includes('Macintosh')) detected = 'MacBook Pro';
    else if (ua.includes('Windows')) detected = 'Windows PC';
    else if (ua.includes('Linux')) detected = 'Linux Workstation';
    else if (ua.includes('Android')) detected = 'Android Phone';
    else if (ua.includes('iPhone') || ua.includes('iPad')) detected = 'Apple iPhone';
    setSignUpDeviceName(detected);
  }, []);

  // Live validation feedback
  const usernameFeedback = (() => {
    if (!signUpUsername) return null;
    const u = signUpUsername.trim().replace(/^@/, '');
    if (u.length < 2) return { type: 'error' as const, text: 'At least 2 characters' };
    if (!/^[a-zA-Z0-9._-]+$/.test(u)) return { type: 'error' as const, text: 'Only letters, numbers, . _ -' };
    if (u.length >= 3) return { type: 'success' as const, text: 'Looks good' };
    return null;
  })();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const errs: Record<string,string> = {};
    if (!signInIdentifier.trim()) errs.identifier = 'Enter your Zoop ID or username';
    if (!showKeyImport && !new RegExp(`^\\d{${PIN_LENGTH}}$`).test(signInPin)) errs.pin = `PIN must be ${PIN_LENGTH} digits`;
    if (Object.keys(errs).length) { setFieldErrors(errs); triggerShake(); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      if (showKeyImport && rawKeyInput.trim()) {
        await loginWithKey(rawKeyInput.trim(), `Imported ${signInIdentifier.trim() || 'Device'}`);
      } else {
        await login(signInIdentifier.trim(), signInPin, rememberMe);
      }
      setSuccessMsg('Signed in — redirecting…');
      setTimeout(() => onNavigate(redirectUrl), 400);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign in failed');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const username = signUpUsername.trim().replace(/^@/, '');
    const errs: Record<string,string> = {};
    if (!username || username.length < 2) errs.username = 'Choose at least 2 characters';
    if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(signUpPin)) errs.pin = `PIN must be ${PIN_LENGTH} digits`;
    if (signUpPin !== signUpPinConfirm) errs.pinConfirm = 'PINs do not match';
    if (!signUpDeviceName.trim()) errs.device = 'Device name required';
    if (Object.keys(errs).length) { setFieldErrors(errs); triggerShake(); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      await signup(
        username,
        signUpPin,
        signUpDisplayName.trim() || undefined,
        signUpDeviceName.trim() || 'My Web Device',
        isProvider
      );
      setSuccessMsg('Zoop identity created — welcome!');
      setTimeout(() => onNavigate(redirectUrl), 500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const demoPin = Math.floor(Math.pow(10, PIN_LENGTH - 1) + Math.random() * 9 * Math.pow(10, PIN_LENGTH - 1)).toString().slice(0, PIN_LENGTH);
      await signup(`demo${Math.floor(Math.random() * 9000)}`, demoPin, 'Demo Pilot', 'Demo Web Device', false);
      setSuccessMsg('Demo identity ready');
      setTimeout(() => onNavigate(redirectUrl), 400);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Demo access failed');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="auth-topbar" role="banner">
        <div className="auth-brand" onClick={() => onNavigate('/')} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter') onNavigate('/');}} aria-label="Zoop Internet — go to homepage">
          <div className="auth-brand-logo">
            <img src="/zoopicontransparent.png" alt="Zoop Internet" width={28} height={28} />
          </div>
          <span className="auth-brand-name">Zoop</span>
          <span className="auth-brand-tag">Internet</span>
        </div>
        <button className="auth-back-link" onClick={() => onNavigate('/')}>
          {Icons.arrowLeft}
          <span>Back to Overview</span>
        </button>
      </header>

      <main id="main-content" className="auth-main" tabIndex={-1}>
        <div key={shakeKey} className={`auth-card ${Object.keys(fieldErrors).length || errorMsg ? 'auth-shake' : ''}`}>
          <div className="auth-header">
            <h1>{tab === 'signin' ? 'Sign in to Zoop' : 'Create your Zoop identity'}</h1>
            <p>
              {tab === 'signin'
                ? 'Your Zoop ID and PIN unlock this device.'
                : 'Pick a username and PIN — your permanent Zoop ID is generated instantly.'}
            </p>
          </div>

          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              className={`auth-tab-btn ${tab === 'signin' ? 'active' : ''}`}
              onClick={() => { setTab('signin'); setErrorMsg(null); setSuccessMsg(null); setFieldErrors({}); }}
              role="tab"
              aria-selected={tab === 'signin'}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => { setTab('signup'); setErrorMsg(null); setSuccessMsg(null); setFieldErrors({}); }}
              role="tab"
              aria-selected={tab === 'signup'}
            >
              Create Zoop ID
            </button>
          </div>

          {errorMsg && (
            <div className="auth-alert auth-alert-error" role="alert" aria-live="assertive">
              <span>{Icons.alert}</span>
              <div>{errorMsg}</div>
            </div>
          )}
          {successMsg && (
            <div className="auth-alert auth-alert-success" role="status" aria-live="polite">
              <span>{Icons.check}</span>
              <div>{successMsg}</div>
            </div>
          )}

          {tab === 'signin' && (
            <form className="auth-form" onSubmit={handleSignIn} noValidate>
              <div className="auth-field">
                <label htmlFor="auth-identifier">Zoop ID or Username</label>
                <input
                  id="auth-identifier"
                  type="text"
                  className={`auth-input ${fieldErrors.identifier ? 'input-error' : signInIdentifier ? 'input-success' : ''}`}
                  placeholder="ZP-7K4M9X  or  @alex"
                  value={signInIdentifier}
                  onChange={(e) => setSignInIdentifier(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                  aria-invalid={!!fieldErrors.identifier}
                  aria-describedby={fieldErrors.identifier ? 'auth-identifier-error' : 'auth-identifier-hint'}
                />
                {fieldErrors.identifier ? <span id="auth-identifier-error" className="field-feedback error" role="alert">{fieldErrors.identifier}</span> : <span id="auth-identifier-hint" className="auth-hint">Your permanent Zoop ID or @username</span>}
              </div>

              {!showKeyImport ? (
                <div className="auth-field">
                  <div className="pin-label-row">
                    <label>Zoop PIN</label>
                    <div className="pin-actions">
                      <button type="button" className="auth-link-btn" onClick={() => setShowPin(v => !v)} aria-label={showPin ? 'Hide PIN' : 'Show PIN'}>
                        {showPin ? Icons.eyeOff : Icons.eye} {showPin ? 'Hide' : 'Show'}
                      </button>
                      <a href="#demo" onClick={(e) => { e.preventDefault(); handleDemoAccess(); }} className="auth-forgot-link">Try Demo</a>
                    </div>
                  </div>
                  <PinBoxes value={signInPin} onChange={setSignInPin} showDigits={showPin} error={!!fieldErrors.pin} idPrefix="signin-pin" describedBy={fieldErrors.pin ? 'signin-pin-error' : 'signin-pin-hint'} />
                  <div className="pin-meta">
                    {fieldErrors.pin ? <span id="signin-pin-error" className="field-feedback error" role="alert">{fieldErrors.pin}</span> : <span id="signin-pin-hint" className="auth-hint">{signInPin.length}/{PIN_LENGTH} digits — recoverable via device key</span>}
                    {signInPin.length === PIN_LENGTH && !fieldErrors.pin && <span className="field-feedback success">{Icons.check} Ready</span>}
                  </div>
                </div>
              ) : (
                <div className="auth-field">
                  <label htmlFor="auth-key">Device credential (PKCS8)</label>
                  <textarea
                    id="auth-key"
                    className="auth-key-textarea"
                    placeholder="MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg..."
                    value={rawKeyInput}
                    onChange={(e) => setRawKeyInput(e.target.value)}
                  />
                  <span className="auth-hint">Advanced: restore a device directly via its secure credential.</span>
                </div>
              )}

              <div className="auth-options-row">
                <label className="auth-checkbox-label">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span>Keep me signed in on this device</span>
                </label>
                <button type="button" className="auth-key-import-toggle" onClick={() => setShowKeyImport(!showKeyImport)}>
                  {Icons.key}
                  <span>{showKeyImport ? 'Use PIN' : 'Use device key'}</span>
                </button>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading || isRegistering} id="auth-signin-btn">
                {loading || isRegistering ? (
                  <><span className="spinner" style={{ width: 16, height: 16 }} /><span>Signing in…</span></>
                ) : (
                  <><>{Icons.shield}</><span>Sign In</span></>
                )}
              </button>

              <div className="auth-switch-prompt">
                No Zoop identity yet?{' '}
                <button type="button" className="auth-switch-btn" onClick={() => { setTab('signup'); setErrorMsg(null); setSuccessMsg(null); }}>
                  Create Zoop ID
                </button>
              </div>
            </form>
          )}

          {tab === 'signup' && (
            <form className="auth-form" onSubmit={handleSignUp} noValidate>
              <div className="auth-field">
                <label htmlFor="signup-username">Username</label>
                <div className="auth-input-wrap">
                  <span className="input-prefix">@</span>
                  <input
                    id="signup-username"
                    type="text"
                    className={`auth-input has-prefix ${fieldErrors.username ? 'input-error' : usernameFeedback?.type === 'success' ? 'input-success' : ''}`}
                    placeholder="alex"
                    value={signUpUsername}
                    onChange={(e) => { setSignUpUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24)); setFieldErrors(f => ({ ...f, username: '' })); }}
                    autoComplete="username"
                    autoFocus
                    required
                    aria-invalid={!!fieldErrors.username}
                  />
                </div>
                {fieldErrors.username ? <span className="field-feedback error">{fieldErrors.username}</span> : usernameFeedback ? <span className={`field-feedback ${usernameFeedback.type}`}>{usernameFeedback.type === 'success' ? Icons.check : null} {usernameFeedback.text}</span> : <span className="auth-hint">Letters, numbers, . _ - · 2–24 chars</span>}
              </div>

              <div className="auth-field">
                <label htmlFor="signup-display">Display Name <span className="optional">(optional)</span></label>
                <input
                  id="signup-display"
                  type="text"
                  className="auth-input"
                  placeholder="Alex Morgan"
                  value={signUpDisplayName}
                  onChange={(e) => setSignUpDisplayName(e.target.value)}
                  autoComplete="name"
                />
                <span className="auth-hint">{signUpDisplayName ? `${signUpDisplayName.length}/32` : 'Shown to peers you share with'}</span>
              </div>

              <div className="auth-field">
                <div className="pin-label-row">
                  <label>Create Zoop PIN</label>
                  <button type="button" className="auth-link-btn" onClick={() => setShowPin(v => !v)}>{showPin ? Icons.eyeOff : Icons.eye} {showPin ? 'Hide' : 'Show'}</button>
                </div>
                <PinBoxes value={signUpPin} onChange={v => { setSignUpPin(v); setFieldErrors(f => ({ ...f, pin: '' })); }} showDigits={showPin} error={!!fieldErrors.pin} idPrefix="signup-pin" describedBy={fieldErrors.pin ? 'signup-pin-error' : 'signup-pin-hint'} />
                <div className="pin-meta">
                  {fieldErrors.pin ? <span id="signup-pin-error" className="field-feedback error" role="alert">{fieldErrors.pin}</span> : <span id="signup-pin-hint" className="auth-hint">{signUpPin.length}/{PIN_LENGTH} digits — your Zoop ID stays safe even if PIN is reset</span>}
                  {signUpPin.length === PIN_LENGTH && !fieldErrors.pin && <span className="field-feedback success">{Icons.check} PIN set</span>}
                </div>
              </div>

              <div className="auth-field">
                <label>Confirm PIN</label>
                <PinBoxes value={signUpPinConfirm} onChange={v => { setSignUpPinConfirm(v); setFieldErrors(f => ({ ...f, pinConfirm: '' })); }} showDigits={showPin} error={!!fieldErrors.pinConfirm || (signUpPinConfirm.length === PIN_LENGTH && signUpPin !== signUpPinConfirm)} idPrefix="signup-pin-confirm" describedBy={fieldErrors.pinConfirm ? 'signup-pin-confirm-error' : 'signup-pin-confirm-hint'} />
                <div className="pin-meta">
                  {fieldErrors.pinConfirm ? <span id="signup-pin-confirm-error" className="field-feedback error" role="alert">{fieldErrors.pinConfirm}</span> : signUpPinConfirm.length === PIN_LENGTH ? (signUpPin === signUpPinConfirm ? <span className="field-feedback success">{Icons.check} PINs match</span> : <span id="signup-pin-confirm-error" className="field-feedback error" role="alert">PINs do not match</span>) : <span id="signup-pin-confirm-hint" className="auth-hint">Repeat your PIN exactly</span>}
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="signup-device">Device Name</label>
                <input
                  id="signup-device"
                  type="text"
                  className={`auth-input ${fieldErrors.device ? 'input-error' : signUpDeviceName ? 'input-success' : ''}`}
                  placeholder="e.g. Work Laptop"
                  value={signUpDeviceName}
                  onChange={(e) => setSignUpDeviceName(e.target.value)}
                  required
                  aria-invalid={!!fieldErrors.device}
                />
                {fieldErrors.device ? <span className="field-feedback error">{fieldErrors.device}</span> : <span className="auth-hint">Revocable per-device credential — losing it won’t lose your Zoop ID</span>}
              </div>

              <div className="auth-provider-toggle-box">
                <div className="auth-provider-info">
                  <span className="auth-provider-title">Enable Internet Sharing</span>
                  <span className="auth-provider-desc">This device can provide connectivity to your other devices</span>
                </div>
                <label className="toggle" aria-label="Enable provider mode">
                  <input type="checkbox" checked={isProvider} onChange={(e) => setIsProvider(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading || isRegistering} id="auth-signup-btn">
                {loading || isRegistering ? (
                  <><span className="spinner" style={{ width: 16, height: 16 }} /><span>Creating Zoop identity…</span></>
                ) : (
                  <><>{Icons.zap}</><span>Create Zoop ID — Free</span></>
                )}
              </button>

              <div className="auth-switch-prompt">
                Already have a Zoop ID?{' '}
                <button type="button" className="auth-switch-btn" onClick={() => { setTab('signin'); setErrorMsg(null); setSuccessMsg(null); }}>
                  Sign in
                </button>
              </div>
            </form>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 18 }} aria-label="Trust signals">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.72rem', color: '#8b9bb0' }}><span aria-hidden style={{ width: 6, height: 6, borderRadius: 50, background: '#34d399', display: 'inline-block' }} />WireGuard® encrypted</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.72rem', color: '#8b9bb0' }}><span aria-hidden style={{ width: 6, height: 6, borderRadius: 50, background: '#38bdf8', display: 'inline-block' }} />Ed25519 auth</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.72rem', color: '#8b9bb0' }}><span aria-hidden style={{ width: 6, height: 6, borderRadius: 50, background: '#a3e635', display: 'inline-block' }} />No tracking · MIT</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.72rem', color: '#8b9bb0' }}><span aria-hidden style={{ width: 6, height: 6, borderRadius: 50, background: '#f59e0b', display: 'inline-block' }} />PIN is 6 digits · Revocable</span>
        </div>

        <footer className="auth-footer">
          <p>End-to-end encrypted with WireGuard &amp; Ed25519 · Zero tracking logs</p>
          <div className="auth-footer-links">
            <a href="#terms" onClick={(e) => { e.preventDefault(); onNavigate('/security'); }}>Security</a>
            <span>·</span>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); onNavigate('/how-it-works'); }}>How It Works</a>
            <span>·</span>
            <a href="#downloads" onClick={(e) => { e.preventDefault(); onNavigate('/downloads'); }}>Downloads</a>
            <span>·</span>
            <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default AuthPage;
