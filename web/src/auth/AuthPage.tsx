import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AwsSpinner } from '../components/AwsSpinner';
import {
  AwsCubeHandIllustration,
  AwsRocketIllustration,
  AwsLockMeshIllustration,
} from './components/AwsIllustrations';
import './AuthPage.css';

const PIN_LENGTH = 6;

/* ─── 6-Box PIN Entry Component ───────────────────────────────────── */
const PinBoxes: React.FC<{
  value: string;
  onChange: (v: string) => void;
  length?: number;
  showDigits?: boolean;
  error?: boolean;
  disabled?: boolean;
  idPrefix?: string;
  describedBy?: string;
}> = ({
  value,
  onChange,
  length = PIN_LENGTH,
  showDigits = false,
  error = false,
  disabled = false,
  idPrefix = 'pin',
  describedBy,
}) => {
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
        onChange={(e) => handleHiddenChange(e.target.value)}
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
  const { login, signup, isRegistering } = useApp();

  // Mode: 'signin' | 'signup' | 'congratulations'
  const [mode, setMode] = useState<'signin' | 'signup' | 'congratulations'>(initialTab);

  // Sign In Step: 1 (Identifier) -> 2 (PIN)
  const [signInStep, setSignInStep] = useState<1 | 2>(1);

  // Sign Up Step: 1 (Username & Device) -> 2 (Set PIN)
  const [signUpStep, setSignUpStep] = useState<1 | 2>(1);

  // Sign In fields
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPin, setSignInPin] = useState('');
  const [showSignInPin, setShowSignInPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up fields
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpPin, setSignUpPin] = useState('');
  const [signUpPinConfirm, setSignUpPinConfirm] = useState('');
  const [showSignUpPin, setShowSignUpPin] = useState(false);
  const [signUpDeviceName, setSignUpDeviceName] = useState('');

  // Status & errors
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isSubdomain =
    hostname.startsWith('dash.') ||
    hostname.startsWith('admin.') ||
    hostname.startsWith('dmin.') ||
    hostname.startsWith('app.') ||
    hostname.startsWith('ops.');
  const homeHref = isSubdomain ? 'https://zoopnetwork.app/' : '/';

  const handleGoHome = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSubdomain) {
      window.location.href = 'https://zoopnetwork.app/';
      return;
    }
    onNavigate('/');
  };
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [transitioningStep, setTransitioningStep] = useState(false);

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

  // Sync mode when initialTab prop changes from external navigation
  useEffect(() => {
    setMode((prev) => (prev === 'congratulations' ? prev : initialTab));
  }, [initialTab]);

  const clearErrors = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setFieldErrors({});
  };

  /* ─── Sign In Handlers ─────────────────────────────────────────── */
  const handleSignInStep1Next = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearErrors();
    const identifier = signInIdentifier.trim();
    if (!identifier) {
      setFieldErrors({ identifier: 'Enter your username or Zoop ID' });
      return;
    }
    setTransitioningStep(true);
    setTimeout(() => {
      setTransitioningStep(false);
      setSignInStep(2);
    }, 400);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signInStep === 1) {
      handleSignInStep1Next(e);
      return;
    }

    clearErrors();
    const pin = signInPin.replace(/\D/g, '');
    if (pin.length !== PIN_LENGTH) {
      setFieldErrors({ pin: `PIN must be ${PIN_LENGTH} digits` });
      return;
    }

    setLoading(true);
    try {
      await login(signInIdentifier.trim(), pin, rememberMe);
      setSuccessMsg('Signed in! Redirecting…');
      const cleanIdent = signInIdentifier.trim().toLowerCase();
      const isAdminUser = cleanIdent === 'admin' || cleanIdent === 'zp-9uzu8c' || cleanIdent === '@admin';
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.endsWith('.sslip.io');
      const onAdminDomain = window.location.hostname === 'admin.zoopnetwork.app' || window.location.hostname === 'dmin.zoopnetwork.app';

      if (isAdminUser) {
        if (!isLocal && !onAdminDomain) {
          setTimeout(() => {
            window.location.href = 'https://admin.zoopnetwork.app/admin';
          }, 650);
          return;
        }
        setTimeout(() => onNavigate('/admin'), 650);
        return;
      }

      const targetUrl = redirectUrl || '/';
      setTimeout(() => onNavigate(targetUrl), 650);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign in failed. Check your ID and PIN.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Sign Up Handlers ─────────────────────────────────────────── */
  const handleSignUpStep1Next = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearErrors();
    const errs: Record<string, string> = {};

    const username = signUpUsername.trim().replace(/^@/, '');
    if (!username || username.length < 2) {
      errs.username = 'Enter a username (at least 2 characters)';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      errs.username = 'Letters, numbers, . _ - only';
    }

    if (!signUpDeviceName.trim()) {
      errs.device = 'Device name is required';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setTransitioningStep(true);
    setTimeout(() => {
      setTransitioningStep(false);
      setSignUpStep(2);
    }, 400);
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpStep === 1) {
      handleSignUpStep1Next(e);
      return;
    }

    clearErrors();
    const errs: Record<string, string> = {};

    const username = signUpUsername.trim().replace(/^@/, '');
    const pin = signUpPin.replace(/\D/g, '');
    if (pin.length !== PIN_LENGTH) {
      errs.pin = `PIN must be ${PIN_LENGTH} digits`;
    }

    if (signUpPin !== signUpPinConfirm) {
      errs.pinConfirm = 'PINs do not match';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await signup(username, pin, undefined, signUpDeviceName.trim(), false);
      setSuccessMsg('Zoop ID created! Redirecting…');
      setTimeout(() => onNavigate(redirectUrl), 650);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign up failed. Please try another username.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    clearErrors();
    setLoading(true);
    try {
      const demoPin = '123456';
      const demoUser = `demo${Math.floor(1000 + Math.random() * 9000)}`;
      await signup(demoUser, demoPin, 'Demo User', 'Demo Device', false);
      setSuccessMsg('Demo access ready! Redirecting…');
      setTimeout(() => onNavigate(redirectUrl), 650);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div className="auth-container">
        {/* Zoop Authentic Brand Header */}
        <header className="auth-topbar">
          <a
            href={homeHref}
            className="auth-brand"
            onClick={handleGoHome}
            aria-label="Zoop Network — Homepage"
          >
            <div className="auth-brand-logo">
              <img
                src="/zoopicon-32.webp"
                srcSet="/zoopicon-32.webp 1x, /zoopicon-192.webp 2x"
                alt="Zoop"
                width={28}
                height={28}
              />
            </div>
            <span className="auth-brand-name">Zoop</span>
            <span className="auth-brand-tag">Network</span>
          </a>

          <a
            href={homeHref}
            className="auth-back-link"
            onClick={handleGoHome}
          >
            <span>← Back to Overview</span>
          </a>
        </header>

        {/* Main Content Area — Balanced in the middle */}
        <main id="main-content" className="auth-main">
          
          {/* Status Alert Boxes */}
          {errorMsg && (
            <div className="auth-alert auth-alert-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert auth-alert-success" role="status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              VIEW 1: SIGN UP (2-Column with Line Divider & Multi-Step)
             ═══════════════════════════════════════════════════════════════ */}
          {mode === 'signup' && (
            <div className="auth-layout">
              {/* Left Column: Headline, Subtitle, Line Illustration */}
              <div className="auth-aside">
                <h2 className="auth-aside-headline">
                  Explore free peer-to-peer networking with a new Zoop ID.
                </h2>
                <p className="auth-aside-sub">
                  Instant direct tunnels between your devices with zero middlemen. Free forever for up to 5 devices.
                </p>
                <div className="auth-illustration-wrap">
                  <AwsCubeHandIllustration />
                </div>
              </div>

              {/* Vertical Divider (Like AWS) */}
              <div className="auth-divider" aria-hidden="true" />

              {/* Right Column: Multi-Step Form */}
              <div className="auth-form-col">
                <h1 className="auth-form-title">
                  {signUpStep === 1 ? 'Sign up for Zoop' : 'Set your security PIN'}
                </h1>

                <form onSubmit={handleSignUpSubmit} noValidate className="auth-form">
                  {/* Step 1: Username & Device Name */}
                  {signUpStep === 1 && (
                    <>
                      <div className="auth-field">
                        <label htmlFor="auth-username">Username</label>
                        <span className="auth-field-help">Choose a permanent handle for your direct mesh.</span>
                        <input
                          id="auth-username"
                          type="text"
                          className={`auth-input ${fieldErrors.username ? 'auth-input-error' : ''}`}
                          placeholder="e.g. alex"
                          value={signUpUsername}
                          onChange={(e) => {
                            setSignUpUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''));
                            setFieldErrors((f) => ({ ...f, username: '' }));
                          }}
                          autoComplete="username"
                          autoFocus
                          required
                        />
                        {fieldErrors.username && (
                          <span className="auth-error-text">{fieldErrors.username}</span>
                        )}
                      </div>

                      <div className="auth-field">
                        <label htmlFor="auth-device-name">Device name</label>
                        <span className="auth-field-help">Choose a name for this device.</span>
                        <input
                          id="auth-device-name"
                          type="text"
                          className={`auth-input ${fieldErrors.device ? 'auth-input-error' : ''}`}
                          value={signUpDeviceName}
                          onChange={(e) => {
                            setSignUpDeviceName(e.target.value);
                            setFieldErrors((f) => ({ ...f, device: '' }));
                          }}
                          required
                        />
                        {fieldErrors.device && (
                          <span className="auth-error-text">{fieldErrors.device}</span>
                        )}
                      </div>

                      <button type="submit" className="auth-btn-primary" disabled={transitioningStep}>
                        {transitioningStep ? (
                          <>
                            <AwsSpinner size={16} variant="inverted" />
                            <span>Continuing…</span>
                          </>
                        ) : (
                          <span>Continue (step 1 of 2)</span>
                        )}
                      </button>

                      <div className="auth-bottom-link-row">
                        <button
                          type="button"
                          className="auth-text-link"
                          onClick={() => {
                            clearErrors();
                            setMode('signin');
                            setSignInStep(1);
                            onNavigate('/auth?tab=signin');
                          }}
                        >
                          Sign in to an existing Zoop ID
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step 2: 6-Digit PIN Boxes */}
                  {signUpStep === 2 && (
                    <>
                      <div className="auth-field">
                        <div className="auth-label-row">
                          <label>Security PIN (6 digits)</label>
                          <button
                            type="button"
                            className="auth-link-toggle"
                            onClick={() => setShowSignUpPin(!showSignUpPin)}
                          >
                            {showSignUpPin ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <span className="auth-field-help">Choose a 6-digit numeric PIN to protect this device.</span>
                        <PinBoxes
                          value={signUpPin}
                          onChange={(v) => {
                            setSignUpPin(v);
                            setFieldErrors((f) => ({ ...f, pin: '' }));
                          }}
                          showDigits={showSignUpPin}
                          error={!!fieldErrors.pin}
                          idPrefix="signup-pin"
                        />
                        {fieldErrors.pin && <span className="auth-error-text">{fieldErrors.pin}</span>}
                      </div>

                      <div className="auth-field">
                        <label>Confirm PIN</label>
                        <PinBoxes
                          value={signUpPinConfirm}
                          onChange={(v) => {
                            setSignUpPinConfirm(v);
                            setFieldErrors((f) => ({ ...f, pinConfirm: '' }));
                          }}
                          showDigits={showSignUpPin}
                          error={!!fieldErrors.pinConfirm}
                          idPrefix="signup-pin-confirm"
                        />
                        {fieldErrors.pinConfirm && (
                          <span className="auth-error-text">{fieldErrors.pinConfirm}</span>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="auth-btn-primary"
                        disabled={loading || isRegistering}
                      >
                        {loading || isRegistering ? (
                          <>
                            <AwsSpinner size={16} variant="inverted" />
                            <span>Creating Zoop ID…</span>
                          </>
                        ) : (
                          <span>Create Zoop ID — Free</span>
                        )}
                      </button>

                      <div className="auth-bottom-link-row">
                        <button
                          type="button"
                          className="auth-text-link"
                          onClick={() => {
                            clearErrors();
                            setSignUpStep(1);
                          }}
                        >
                          ← Back to username
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              VIEW 2: SIGN IN (2-Column with Line Divider & PinBoxes)
             ═══════════════════════════════════════════════════════════════ */}
          {mode === 'signin' && (
            <div className="auth-layout">
              {/* Left Column: Sign In Headline & Lock Illustration */}
              <div className="auth-aside">
                <h2 className="auth-aside-headline">
                  Sign in to your private mesh.
                </h2>
                <p className="auth-aside-sub">
                  Access your connected devices, shared bandwidth, and peer network from any browser.
                </p>
                <div className="auth-illustration-wrap">
                  <AwsLockMeshIllustration />
                </div>
              </div>

              {/* Vertical Divider (Like AWS) */}
              <div className="auth-divider" aria-hidden="true" />

              {/* Right Column: Sign In Form */}
              <div className="auth-form-col">
                <h1 className="auth-form-title">
                  {signInStep === 1 ? 'Sign in to Zoop' : 'Enter your PIN'}
                </h1>

                <form onSubmit={handleSignInSubmit} noValidate className="auth-form">
                  {/* Step 1: Identifier */}
                  {signInStep === 1 && (
                    <>
                      <div className="auth-field">
                        <label htmlFor="auth-signin-id">Zoop ID or Username</label>
                        <span className="auth-field-help">Enter your @username or Zoop ID.</span>
                        <input
                          id="auth-signin-id"
                          type="text"
                          className={`auth-input ${fieldErrors.identifier ? 'auth-input-error' : ''}`}
                          placeholder="e.g. alex or ZP-7K4M9X"
                          value={signInIdentifier}
                          onChange={(e) => {
                            setSignInIdentifier(e.target.value);
                            setFieldErrors({});
                          }}
                          autoComplete="username"
                          autoFocus
                          required
                        />
                        {fieldErrors.identifier && (
                          <span className="auth-error-text">{fieldErrors.identifier}</span>
                        )}
                      </div>

                      <button type="submit" className="auth-btn-primary" disabled={transitioningStep}>
                        {transitioningStep ? (
                          <>
                            <AwsSpinner size={16} variant="inverted" />
                            <span>Continuing…</span>
                          </>
                        ) : (
                          <span>Continue</span>
                        )}
                      </button>

                      <div className="auth-bottom-link-row">
                        <button
                          type="button"
                          className="auth-text-link"
                          onClick={() => {
                            clearErrors();
                            setMode('signup');
                            setSignUpStep(1);
                            onNavigate('/auth?tab=signup');
                          }}
                        >
                          New to Zoop? Create a Zoop ID
                        </button>
                      </div>

                      <div className="auth-bottom-secondary-row">
                        <button
                          type="button"
                          className="auth-sub-link"
                          onClick={handleDemoAccess}
                        >
                          Try demo access
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step 2: 6-Digit PIN Boxes */}
                  {signInStep === 2 && (
                    <>
                      {/* Identity Chip */}
                      <div className="auth-identity-chip">
                        <span className="auth-identity-text">{signInIdentifier}</span>
                        <button
                          type="button"
                          className="auth-identity-change"
                          onClick={() => {
                            clearErrors();
                            setSignInStep(1);
                          }}
                        >
                          Change
                        </button>
                      </div>

                      <div className="auth-field">
                        <div className="auth-label-row">
                          <label>Security PIN (6 digits)</label>
                          <button
                            type="button"
                            className="auth-link-toggle"
                            onClick={() => setShowSignInPin(!showSignInPin)}
                          >
                            {showSignInPin ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <PinBoxes
                          value={signInPin}
                          onChange={(v) => {
                            setSignInPin(v);
                            setFieldErrors({});
                          }}
                          showDigits={showSignInPin}
                          error={!!fieldErrors.pin}
                          idPrefix="signin-pin"
                        />
                        {fieldErrors.pin && (
                          <span className="auth-error-text">{fieldErrors.pin}</span>
                        )}
                      </div>

                      <div className="auth-checkbox-row">
                        <label className="auth-checkbox-label">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          <span>Keep me signed in</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="auth-btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <AwsSpinner size={16} variant="inverted" />
                            <span>Signing in…</span>
                          </>
                        ) : (
                          <span>Sign In</span>
                        )}
                      </button>

                      <div className="auth-bottom-link-row">
                        <button
                          type="button"
                          className="auth-text-link"
                          onClick={() => {
                            clearErrors();
                            setSignInStep(1);
                          }}
                        >
                          ← Back
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              VIEW 3: CONGRATULATIONS
             ═══════════════════════════════════════════════════════════════ */}
          {mode === 'congratulations' && (
            <div className="auth-congrats-layout">
              <div className="auth-congrats-illustration">
                <AwsRocketIllustration />
              </div>

              <h1 className="auth-congrats-title">Congratulations</h1>
              <p className="auth-congrats-sub">
                Your Zoop identity has been created and your device is ready.
              </p>

              <button
                type="button"
                className="auth-btn-primary auth-btn-congrats"
                onClick={() => onNavigate(redirectUrl)}
              >
                Go to Zoop Console
              </button>

              <div className="auth-bottom-link-row">
                <button
                  type="button"
                  className="auth-text-link"
                  onClick={() => {
                    clearErrors();
                    setMode('signin');
                    setSignInStep(1);
                    onNavigate('/auth?tab=signin');
                  }}
                >
                  Sign in to another account
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AuthPage;
