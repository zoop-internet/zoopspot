import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AwsSpinner } from '../components/AwsSpinner';
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  arrowRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14m-7-7 7 7-7 7" />
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
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

const PIN_LENGTH = 6;

/* ─── PIN Boxes Component ─────────────────────────────────────────── */
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
  const isComplete = value.replace(/\D/g, '').length === length;
  const digits = value.padEnd(length, ' ').split('').slice(0, length);

  const handleHiddenChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, length);
    onChange(cleaned);
  };

  const handleBoxClick = () => hiddenRef.current?.focus();

  return (
    <div
      className={`pin-boxes ${error ? 'pin-error' : ''} ${isComplete ? 'pin-complete' : ''}`}
      role="group"
      aria-label={`Zoop PIN, ${length} digits`}
      onClick={handleBoxClick}
    >
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

  // Progressive Disclosure Steps:
  // Sign In: 1 (Identifier) -> 2 (PIN / Credential)
  // Sign Up: 1 (Username) -> 2 (PIN) -> 3 (Device)
  const [signInStep, setSignInStep] = useState<1 | 2>(1);
  const [signUpStep, setSignUpStep] = useState<1 | 2 | 3>(1);

  // Sign in fields
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPin, setSignInPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showKeyImport, setShowKeyImport] = useState(false);
  const [rawKeyInput, setRawKeyInput] = useState('');

  // Sign up fields
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpDisplayName, setSignUpDisplayName] = useState('');
  const [signUpPin, setSignUpPin] = useState('');
  const [signUpPinConfirm, setSignUpPinConfirm] = useState('');
  const [signUpDeviceName, setSignUpDeviceName] = useState('');
  const [isProvider, setIsProvider] = useState(false);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const triggerShake = () => setShakeKey(k => k + 1);

  // Auto-detect device name
  useEffect(() => {
    const ua = navigator.userAgent;
    let detected = 'Browser Device';
    if (ua.includes('Macintosh')) detected = 'MacBook Pro';
    else if (ua.includes('Windows')) detected = 'Windows PC';
    else if (ua.includes('Linux')) detected = 'Linux Workstation';
    else if (ua.includes('Android')) detected = 'Android Phone';
    else if (ua.includes('iPhone') || ua.includes('iPad')) detected = 'Apple iPhone';
    setSignUpDeviceName(detected);
  }, []);

  // Live username validation feedback
  const usernameFeedback = (() => {
    if (!signUpUsername) return null;
    const u = signUpUsername.trim().replace(/^@/, '');
    if (u.length < 2) return { type: 'error' as const, text: 'At least 2 characters' };
    if (!/^[a-zA-Z0-9._-]+$/.test(u)) return { type: 'error' as const, text: 'Letters, numbers, . _ - only' };
    if (u.length >= 3) return { type: 'success' as const, text: 'Available' };
    return null;
  })();

  /* ─── Sign In Handlers ─────────────────────────────────────────── */
  const handleSignInNext = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    const identifier = signInIdentifier.trim();
    if (!identifier) {
      setFieldErrors({ identifier: 'Enter your Zoop ID or username' });
      triggerShake();
      return;
    }
    setFieldErrors({});
    setSignInStep(2);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signInStep === 1) {
      handleSignInNext(e);
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    const errs: Record<string, string> = {};

    if (!showKeyImport && !new RegExp(`^\\d{${PIN_LENGTH}}$`).test(signInPin)) {
      errs.pin = `PIN must be ${PIN_LENGTH} digits`;
    }
    if (showKeyImport && !rawKeyInput.trim()) {
      errs.key = 'Paste your device key credential';
    }

    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      triggerShake();
      return;
    }

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

  /* ─── Sign Up Handlers ─────────────────────────────────────────── */
  const handleSignUpStep1Next = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    const username = signUpUsername.trim().replace(/^@/, '');
    if (!username || username.length < 2) {
      setFieldErrors({ username: 'Choose a username (at least 2 characters)' });
      triggerShake();
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      setFieldErrors({ username: 'Letters, numbers, . _ - only' });
      triggerShake();
      return;
    }
    setFieldErrors({});
    setSignUpStep(2);
  };

  const handleSignUpStep2Next = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    const errs: Record<string, string> = {};
    if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(signUpPin)) {
      errs.pin = `PIN must be ${PIN_LENGTH} digits`;
    }
    if (signUpPin !== signUpPinConfirm) {
      errs.pinConfirm = 'PINs do not match';
    }
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      triggerShake();
      return;
    }
    setFieldErrors({});
    setSignUpStep(3);
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpStep === 1) {
      handleSignUpStep1Next(e);
      return;
    }
    if (signUpStep === 2) {
      handleSignUpStep2Next(e);
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    if (!signUpDeviceName.trim()) {
      setFieldErrors({ device: 'Device name is required' });
      triggerShake();
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const username = signUpUsername.trim().replace(/^@/, '');
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

  const switchTab = (nextTab: 'signin' | 'signup') => {
    setTab(nextTab);
    setErrorMsg(null);
    setSuccessMsg(null);
    setFieldErrors({});
    setSignInStep(1);
    setSignUpStep(1);
  };

  return (
    <div className="auth-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Abstract AWS-Style Background Ambient Lines & Glow */}
      <div className="auth-abstract-bg" aria-hidden="true">
        <div className="auth-abstract-glow-top" />
        <div className="auth-abstract-glow-side" />
        <svg className="auth-abstract-grid" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="auth-grid-pattern" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255, 255, 255, 0.025)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid-pattern)" />
        </svg>
      </div>

      <header className="auth-topbar" role="banner">
        <a href="/" className="auth-brand" onClick={(e) => { e.preventDefault(); onNavigate('/'); }} aria-label="Zoop Internet — go to homepage">
          <div className="auth-brand-logo">
            <img src="/zoopicon-32.webp" srcSet="/zoopicon-32.webp 1x, /zoopicon-192.webp 2x" alt="Zoop Internet" width={28} height={28} />
          </div>
          <span className="auth-brand-name">Zoop</span>
          <span className="auth-brand-tag">Internet</span>
        </a>
        <a href="/" className="auth-back-link" onClick={(e) => { e.preventDefault(); onNavigate('/'); }}>
          {Icons.arrowLeft}
          <span>Back to Overview</span>
        </a>
      </header>

      <main id="main-content" className="auth-main" tabIndex={-1}>
        <div key={shakeKey} className={`auth-card ${Object.keys(fieldErrors).length || errorMsg ? 'auth-shake' : ''}`}>
          
          {/* AWS Cloudscape Style Tab Switcher */}
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              id="auth-tab-signin"
              className={`auth-tab-btn ${tab === 'signin' ? 'active' : ''}`}
              onClick={() => switchTab('signin')}
              role="tab"
              aria-selected={tab === 'signin'}
              aria-controls="auth-panel-signin"
              tabIndex={tab === 'signin' ? 0 : -1}
            >
              Sign In
            </button>
            <button
              type="button"
              id="auth-tab-signup"
              className={`auth-tab-btn ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => switchTab('signup')}
              role="tab"
              aria-selected={tab === 'signup'}
              aria-controls="auth-panel-signup"
              tabIndex={tab === 'signup' ? 0 : -1}
            >
              Create Zoop ID
            </button>
          </div>

          {/* Sign Up 3-Step Segmented Progress Bar */}
          {tab === 'signup' && (
            <div className="auth-step-bar" aria-label={`Step ${signUpStep} of 3`}>
              <div className={`auth-step-seg ${signUpStep >= 1 ? 'active' : ''} ${signUpStep > 1 ? 'completed' : ''}`}>
                <span className="step-num">{signUpStep > 1 ? '✓' : '1'}</span>
                <span className="step-label">Username</span>
              </div>
              <div className="auth-step-line" />
              <div className={`auth-step-seg ${signUpStep >= 2 ? 'active' : ''} ${signUpStep > 2 ? 'completed' : ''}`}>
                <span className="step-num">{signUpStep > 2 ? '✓' : '2'}</span>
                <span className="step-label">Security PIN</span>
              </div>
              <div className="auth-step-line" />
              <div className={`auth-step-seg ${signUpStep >= 3 ? 'active' : ''}`}>
                <span className="step-num">3</span>
                <span className="step-label">Device</span>
              </div>
            </div>
          )}

          {/* Minimalist Header */}
          <div className="auth-header">
            {tab === 'signin' ? (
              <>
                <h1>{signInStep === 1 ? 'Sign in' : 'Enter your PIN'}</h1>
                <p>{signInStep === 1 ? 'Enter your Zoop ID or username to continue' : 'Enter your 6-digit PIN to unlock this device'}</p>
              </>
            ) : (
              <>
                <h1>
                  {signUpStep === 1 && 'Choose your username'}
                  {signUpStep === 2 && 'Set your security PIN'}
                  {signUpStep === 3 && 'Name this device'}
                </h1>
                <p>
                  {signUpStep === 1 && 'Pick a permanent handle for your direct mesh'}
                  {signUpStep === 2 && 'Your 6-digit PIN protects device authorization'}
                  {signUpStep === 3 && 'This device will be registered to your Zoop ID'}
                </p>
              </>
            )}
          </div>

          {/* Alert messages */}
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

          {/* ─── SIGN IN FLOW (2 Steps) ───────────────────────────────── */}
          {tab === 'signin' && (
            <form id="auth-panel-signin" role="tabpanel" aria-labelledby="auth-tab-signin" className="auth-form auth-step-enter" onSubmit={handleSignInSubmit} noValidate>
              
              {/* Step 1: Identifier */}
              {signInStep === 1 && (
                <div className="auth-step-content">
                  <div className="auth-field">
                    <label htmlFor="auth-identifier">Zoop ID or Username</label>
                    <input
                      id="auth-identifier"
                      type="text"
                      className={`auth-input ${fieldErrors.identifier ? 'input-error' : signInIdentifier ? 'input-success' : ''}`}
                      placeholder="ZP-7K4M9X or @alex"
                      value={signInIdentifier}
                      onChange={(e) => { setSignInIdentifier(e.target.value); setFieldErrors({}); }}
                      autoComplete="username"
                      autoFocus
                      required
                      aria-invalid={!!fieldErrors.identifier}
                      aria-describedby={fieldErrors.identifier ? 'auth-identifier-error' : undefined}
                    />
                    {fieldErrors.identifier && (
                      <span id="auth-identifier-error" className="field-feedback error" role="alert">{fieldErrors.identifier}</span>
                    )}
                  </div>

                  <button type="submit" className="auth-submit-btn" id="auth-signin-next-btn">
                    <span>Next</span>
                    {Icons.arrowRight}
                  </button>

                  <div className="auth-secondary-actions">
                    <button type="button" className="auth-text-link" onClick={handleDemoAccess}>
                      Try Demo Access
                    </button>
                    <span className="auth-action-sep">·</span>
                    <button type="button" className="auth-text-link" onClick={() => { setShowKeyImport(true); setSignInStep(2); }}>
                      Device Key
                    </button>
                  </div>

                  <div className="auth-switch-prompt">
                    New to Zoop?{' '}
                    <button type="button" className="auth-switch-btn" onClick={() => switchTab('signup')}>
                      Create Zoop ID
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: PIN / Credential */}
              {signInStep === 2 && (
                <div className="auth-step-content">
                  {/* Identifier Preview Badge with Change Button */}
                  <div className="auth-identity-chip">
                    <div className="auth-identity-avatar">
                      {signInIdentifier.replace(/^@/, '').charAt(0).toUpperCase() || 'Z'}
                    </div>
                    <div className="auth-identity-info">
                      <span className="auth-identity-id">{signInIdentifier}</span>
                      <span className="auth-identity-sub">Zoop ID</span>
                    </div>
                    <button
                      type="button"
                      className="auth-identity-change-btn"
                      onClick={() => { setSignInStep(1); setErrorMsg(null); setFieldErrors({}); }}
                      title="Change Zoop ID"
                    >
                      Change
                    </button>
                  </div>

                  {!showKeyImport ? (
                    <div className="auth-field">
                      <div className="pin-label-row">
                        <label>Zoop PIN</label>
                        <button type="button" className="auth-link-btn" onClick={() => setShowPin(v => !v)} aria-label={showPin ? 'Hide PIN' : 'Show PIN'}>
                          {showPin ? Icons.eyeOff : Icons.eye} {showPin ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <PinBoxes
                        value={signInPin}
                        onChange={(v) => { setSignInPin(v); setFieldErrors({}); }}
                        showDigits={showPin}
                        error={!!fieldErrors.pin}
                        idPrefix="signin-pin"
                        describedBy={fieldErrors.pin ? 'signin-pin-error' : undefined}
                      />
                      <div className="pin-meta">
                        {fieldErrors.pin ? (
                          <span id="signin-pin-error" className="field-feedback error" role="alert">{fieldErrors.pin}</span>
                        ) : signInPin.length === PIN_LENGTH ? (
                          <span className="field-feedback success">{Icons.check} Ready</span>
                        ) : (
                          <span className="auth-hint">{signInPin.length}/{PIN_LENGTH} digits</span>
                        )}
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
                        onChange={(e) => { setRawKeyInput(e.target.value); setFieldErrors({}); }}
                      />
                      <span className="auth-hint">Advanced: restore device directly via secure key</span>
                    </div>
                  )}

                  <div className="auth-options-row">
                    <label className="auth-checkbox-label">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                      <span>Keep me signed in on this device</span>
                    </label>
                    <button type="button" className="auth-key-import-toggle" onClick={() => setShowKeyImport(!showKeyImport)}>
                      {Icons.key}
                      <span>{showKeyImport ? 'Use PIN' : 'Use key'}</span>
                    </button>
                  </div>

                  <button type="submit" className="auth-submit-btn" disabled={loading || isRegistering} id="auth-signin-btn">
                    {loading || isRegistering ? (
                      <>
                        <AwsSpinner size={18} variant="inverted" />
                        <span>Signing in…</span>
                      </>
                    ) : (
                      <>
                        {Icons.shield}
                        <span>Sign In</span>
                      </>
                    )}
                  </button>

                  <div className="auth-step-back-row">
                    <button type="button" className="auth-step-back-btn" onClick={() => { setSignInStep(1); setErrorMsg(null); setFieldErrors({}); }}>
                      {Icons.arrowLeft} Back
                    </button>
                    <button type="button" className="auth-text-link" onClick={handleDemoAccess}>
                      Try Demo
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* ─── SIGN UP FLOW (3 Steps) ───────────────────────────────── */}
          {tab === 'signup' && (
            <form id="auth-panel-signup" role="tabpanel" aria-labelledby="auth-tab-signup" className="auth-form auth-step-enter" onSubmit={handleSignUpSubmit} noValidate>
              
              {/* Step 1: Choose Username */}
              {signUpStep === 1 && (
                <div className="auth-step-content">
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
                        onChange={(e) => {
                          setSignUpUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24));
                          setFieldErrors(f => ({ ...f, username: '' }));
                        }}
                        autoComplete="username"
                        autoFocus
                        required
                        aria-invalid={!!fieldErrors.username}
                      />
                    </div>
                    {fieldErrors.username ? (
                      <span className="field-feedback error">{fieldErrors.username}</span>
                    ) : usernameFeedback ? (
                      <span className={`field-feedback ${usernameFeedback.type}`}>{usernameFeedback.type === 'success' ? Icons.check : null} {usernameFeedback.text}</span>
                    ) : (
                      <span className="auth-hint">Letters, numbers, . _ - · 2–24 chars</span>
                    )}
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
                  </div>

                  <button type="submit" className="auth-submit-btn" id="auth-signup-next-1">
                    <span>Next: Set Security PIN</span>
                    {Icons.arrowRight}
                  </button>

                  <div className="auth-switch-prompt">
                    Already have a Zoop ID?{' '}
                    <button type="button" className="auth-switch-btn" onClick={() => switchTab('signin')}>
                      Sign in
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Set Security PIN */}
              {signUpStep === 2 && (
                <div className="auth-step-content">
                  <div className="auth-field">
                    <div className="pin-label-row">
                      <label>Create 6-Digit PIN</label>
                      <button type="button" className="auth-link-btn" onClick={() => setShowPin(v => !v)}>
                        {showPin ? Icons.eyeOff : Icons.eye} {showPin ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <PinBoxes
                      value={signUpPin}
                      onChange={(v) => { setSignUpPin(v); setFieldErrors(f => ({ ...f, pin: '' })); }}
                      showDigits={showPin}
                      error={!!fieldErrors.pin}
                      idPrefix="signup-pin"
                    />
                    <div className="pin-meta">
                      {fieldErrors.pin ? (
                        <span className="field-feedback error" role="alert">{fieldErrors.pin}</span>
                      ) : signUpPin.length === PIN_LENGTH ? (
                        <span className="field-feedback success">{Icons.check} PIN set</span>
                      ) : (
                        <span className="auth-hint">{signUpPin.length}/{PIN_LENGTH} digits</span>
                      )}
                    </div>
                  </div>

                  <div className="auth-field">
                    <label>Confirm PIN</label>
                    <PinBoxes
                      value={signUpPinConfirm}
                      onChange={(v) => { setSignUpPinConfirm(v); setFieldErrors(f => ({ ...f, pinConfirm: '' })); }}
                      showDigits={showPin}
                      error={!!fieldErrors.pinConfirm || (signUpPinConfirm.length === PIN_LENGTH && signUpPin !== signUpPinConfirm)}
                      idPrefix="signup-pin-confirm"
                    />
                    <div className="pin-meta">
                      {fieldErrors.pinConfirm ? (
                        <span className="field-feedback error" role="alert">{fieldErrors.pinConfirm}</span>
                      ) : signUpPinConfirm.length === PIN_LENGTH ? (
                        signUpPin === signUpPinConfirm ? (
                          <span className="field-feedback success">{Icons.check} PINs match</span>
                        ) : (
                          <span className="field-feedback error" role="alert">PINs do not match</span>
                        )
                      ) : (
                        <span className="auth-hint">Re-enter your 6-digit PIN</span>
                      )}
                    </div>
                  </div>

                  <button type="submit" className="auth-submit-btn" id="auth-signup-next-2">
                    <span>Next: Name Device</span>
                    {Icons.arrowRight}
                  </button>

                  <div className="auth-step-back-row">
                    <button type="button" className="auth-step-back-btn" onClick={() => { setSignUpStep(1); setErrorMsg(null); setFieldErrors({}); }}>
                      {Icons.arrowLeft} Back
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Name This Device & Ready */}
              {signUpStep === 3 && (
                <div className="auth-step-content">
                  <div className="auth-field">
                    <label htmlFor="signup-device">Device Name</label>
                    <input
                      id="signup-device"
                      type="text"
                      className={`auth-input ${fieldErrors.device ? 'input-error' : signUpDeviceName ? 'input-success' : ''}`}
                      placeholder="e.g. Work Laptop"
                      value={signUpDeviceName}
                      onChange={(e) => { setSignUpDeviceName(e.target.value); setFieldErrors(f => ({ ...f, device: '' })); }}
                      required
                      aria-invalid={!!fieldErrors.device}
                      autoFocus
                    />
                    {fieldErrors.device ? (
                      <span className="field-feedback error">{fieldErrors.device}</span>
                    ) : (
                      <span className="auth-hint">Auto-detected from this browser</span>
                    )}
                  </div>

                  <div className="auth-provider-toggle-box">
                    <div className="auth-provider-info">
                      <span className="auth-provider-title">Enable Internet Sharing</span>
                      <span className="auth-provider-desc">Allow authorized peer devices to route through this device</span>
                    </div>
                    <label className="toggle" aria-label="Enable provider mode">
                      <input type="checkbox" checked={isProvider} onChange={(e) => setIsProvider(e.target.checked)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <button type="submit" className="auth-submit-btn" disabled={loading || isRegistering} id="auth-signup-btn">
                    {loading || isRegistering ? (
                      <>
                        <AwsSpinner size={18} variant="inverted" />
                        <span>Creating Zoop ID…</span>
                      </>
                    ) : (
                      <>
                        {Icons.zap}
                        <span>Create Zoop ID — Free</span>
                      </>
                    )}
                  </button>

                  <div className="auth-step-back-row">
                    <button type="button" className="auth-step-back-btn" onClick={() => { setSignUpStep(2); setErrorMsg(null); setFieldErrors({}); }}>
                      {Icons.arrowLeft} Back
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

        </div>

        {/* Minimalist Trust Indicator Bar */}
        <div className="auth-trust-strip" aria-label="Security guarantees">
          <span><span className="trust-dot green" /> WireGuard® encrypted</span>
          <span><span className="trust-dot cyan" /> Ed25519 identity</span>
          <span><span className="trust-dot orange" /> 6-digit PIN</span>
          <span><span className="trust-dot lime" /> Zero tracking logs</span>
        </div>

        <footer className="auth-footer">
          <div className="auth-footer-links">
            <a href="/security" onClick={(e) => { e.preventDefault(); onNavigate('/security'); }}>Security</a>
            <span>·</span>
            <a href="/how-it-works" onClick={(e) => { e.preventDefault(); onNavigate('/how-it-works'); }}>How It Works</a>
            <span>·</span>
            <a href="/downloads" onClick={(e) => { e.preventDefault(); onNavigate('/downloads'); }}>Downloads</a>
            <span>·</span>
            <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default AuthPage;
