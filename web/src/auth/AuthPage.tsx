import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AwsSpinner } from '../components/AwsSpinner';
import { AwsCubeHandIllustration, AwsRocketIllustration } from './components/AwsIllustrations';
import './AuthPage.css';

const PIN_LENGTH = 6;

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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

  // Sync mode if initialTab changes
  useEffect(() => {
    if (mode !== 'congratulations') {
      setMode(initialTab);
    }
  }, [initialTab, mode]);

  const clearErrors = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setFieldErrors({});
  };

  /* ─── Sign In Handlers ─────────────────────────────────────────── */
  const handleSignInNext = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearErrors();
    const identifier = signInIdentifier.trim();
    if (!identifier) {
      setFieldErrors({ identifier: 'Enter your username or Zoop ID' });
      return;
    }
    setSignInStep(2);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signInStep === 1) {
      handleSignInNext(e);
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
      setTimeout(() => onNavigate(redirectUrl), 350);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign in failed. Check your ID and PIN.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Sign Up Handlers ─────────────────────────────────────────── */
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const errs: Record<string, string> = {};

    const username = signUpUsername.trim().replace(/^@/, '');
    if (!username || username.length < 2) {
      errs.username = 'Enter a username (at least 2 characters)';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      errs.username = 'Letters, numbers, . _ - only';
    }

    const pin = signUpPin.replace(/\D/g, '');
    if (pin.length !== PIN_LENGTH) {
      errs.pin = `PIN must be ${PIN_LENGTH} digits`;
    }

    if (signUpPin !== signUpPinConfirm) {
      errs.pinConfirm = 'PINs do not match';
    }

    if (!signUpDeviceName.trim()) {
      errs.device = 'Device name is required';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await signup(username, pin, undefined, signUpDeviceName.trim(), false);
      setSuccessMsg('Zoop ID created! Redirecting…');
      setTimeout(() => onNavigate(redirectUrl), 400);
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
      setTimeout(() => onNavigate(redirectUrl), 350);
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
            href="/"
            className="auth-brand"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
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
            href="/"
            className="auth-back-link"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
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
              VIEW 1: SIGN UP (Zoop Dark 2-Column with Minimal Illustration)
             ═══════════════════════════════════════════════════════════════ */}
          {mode === 'signup' && (
            <div className="auth-signup-layout">
              {/* Left Column: Headline, Subtitle, Line Illustration */}
              <div className="auth-signup-aside">
                <h2 className="auth-aside-headline">
                  Share your internet directly with a new Zoop ID.
                </h2>
                <p className="auth-aside-sub">
                  Free for personal use with up to 5 devices. To learn more, visit{' '}
                  <a href="/how-it-works" onClick={(e) => { e.preventDefault(); onNavigate('/how-it-works'); }}>
                    how it works
                  </a>.
                </p>
                <div className="auth-illustration-wrap">
                  <AwsCubeHandIllustration />
                </div>
              </div>

              {/* Right Column: Clean Form */}
              <div className="auth-signup-form-col">
                <h1 className="auth-form-title">Sign up for Zoop</h1>

                <form onSubmit={handleSignUpSubmit} noValidate className="auth-form">
                  {/* Username */}
                  <div className="auth-field">
                    <label htmlFor="auth-username">Username</label>
                    <span className="auth-field-help">You will use this username to sign in to your new Zoop ID.</span>
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

                  {/* Password / PIN */}
                  <div className="auth-field">
                    <div className="auth-label-row">
                      <label htmlFor="auth-pin">Security PIN (6 digits)</label>
                      <button
                        type="button"
                        className="auth-link-toggle"
                        onClick={() => setShowSignUpPin(!showSignUpPin)}
                      >
                        {showSignUpPin ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <span className="auth-field-help">Choose a 6-digit numeric PIN to protect this device.</span>
                    <input
                      id="auth-pin"
                      type={showSignUpPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={PIN_LENGTH}
                      className={`auth-input ${fieldErrors.pin ? 'auth-input-error' : ''}`}
                      placeholder="••••••"
                      value={signUpPin}
                      onChange={(e) => {
                        setSignUpPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH));
                        setFieldErrors((f) => ({ ...f, pin: '' }));
                      }}
                      autoComplete="new-password"
                      required
                    />
                    {fieldErrors.pin && <span className="auth-error-text">{fieldErrors.pin}</span>}
                  </div>

                  {/* Confirm Password / PIN */}
                  <div className="auth-field">
                    <label htmlFor="auth-pin-confirm">Confirm PIN</label>
                    <input
                      id="auth-pin-confirm"
                      type={showSignUpPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={PIN_LENGTH}
                      className={`auth-input ${fieldErrors.pinConfirm ? 'auth-input-error' : ''}`}
                      placeholder="••••••"
                      value={signUpPinConfirm}
                      onChange={(e) => {
                        setSignUpPinConfirm(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH));
                        setFieldErrors((f) => ({ ...f, pinConfirm: '' }));
                      }}
                      autoComplete="new-password"
                      required
                    />
                    {fieldErrors.pinConfirm && (
                      <span className="auth-error-text">{fieldErrors.pinConfirm}</span>
                    )}
                  </div>

                  {/* Device Name */}
                  <div className="auth-field">
                    <label htmlFor="auth-device-name">Device name</label>
                    <span className="auth-field-help">
                      Choose a name for your device. You can change this in settings later.
                    </span>
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

                  {/* Action Button */}
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

                  {/* Bottom Switch Link */}
                  <div className="auth-bottom-link-row">
                    <button
                      type="button"
                      className="auth-text-link"
                      onClick={() => {
                        clearErrors();
                        setMode('signin');
                        setSignInStep(1);
                      }}
                    >
                      Sign in to an existing Zoop ID
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              VIEW 2: SIGN IN (Zoop Centered Layout)
             ═══════════════════════════════════════════════════════════════ */}
          {mode === 'signin' && (
            <div className="auth-signin-layout">
              <h1 className="auth-form-title">Sign in to Zoop</h1>

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

                    <button type="submit" className="auth-btn-primary">
                      Continue
                    </button>

                    <div className="auth-bottom-link-row">
                      <button
                        type="button"
                        className="auth-text-link"
                        onClick={() => {
                          clearErrors();
                          setMode('signup');
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

                {/* Step 2: PIN */}
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
                        <label htmlFor="auth-signin-pin">Security PIN</label>
                        <button
                          type="button"
                          className="auth-link-toggle"
                          onClick={() => setShowSignInPin(!showSignInPin)}
                        >
                          {showSignInPin ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <input
                        id="auth-signin-pin"
                        type={showSignInPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={PIN_LENGTH}
                        className={`auth-input ${fieldErrors.pin ? 'auth-input-error' : ''}`}
                        placeholder="••••••"
                        value={signInPin}
                        onChange={(e) => {
                          setSignInPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH));
                          setFieldErrors({});
                        }}
                        autoComplete="current-password"
                        autoFocus
                        required
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
                        Back
                      </button>
                    </div>
                  </>
                )}
              </form>
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
