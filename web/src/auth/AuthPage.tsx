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
      onNavigate(redirectUrl);
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
      setMode('congratulations');
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
      onNavigate(redirectUrl);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aws-auth-page">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div className="aws-auth-container">
        {/* Top Header with Centered Logo */}
        <header className="aws-auth-header">
        <a
          href="/"
          className="aws-brand-link"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          aria-label="Zoop Network — Homepage"
        >
          <img
            src="/zoopicon-32.webp"
            srcSet="/zoopicon-32.webp 1x, /zoopicon-192.webp 2x"
            alt="Zoop"
            width={36}
            height={36}
            className="aws-brand-icon"
          />
          <span className="aws-brand-text">zoop</span>
        </a>
      </header>

      {/* Main Content Area — Completely open canvas (no card box!) */}
      <main id="main-content" className="aws-auth-main">
        
        {/* Error Alert Box if any */}
        {errorMsg && (
          <div className="aws-alert aws-alert-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            VIEW 1: SIGN UP (AWS 2-Column with Minimal Line-Art Illustration)
           ═══════════════════════════════════════════════════════════════ */}
        {mode === 'signup' && (
          <div className="aws-signup-layout">
            {/* Left Column: Headline, Subtitle, Line Illustration */}
            <div className="aws-signup-aside">
              <h2 className="aws-aside-headline">
                Explore free peer-to-peer mesh networking with a new Zoop ID.
              </h2>
              <p className="aws-aside-sub">
                To learn more, visit <a href="/how-it-works" onClick={(e) => { e.preventDefault(); onNavigate('/how-it-works'); }}>zoopnetwork.app/how-it-works</a>.
              </p>
              <div className="aws-illustration-wrap">
                <AwsCubeHandIllustration />
              </div>
            </div>

            {/* Right Column: Clean Form (directly on page, no card border) */}
            <div className="aws-signup-form-col">
              <h1 className="aws-form-title">Sign up for Zoop</h1>

              <form onSubmit={handleSignUpSubmit} noValidate className="aws-form">
                {/* Username */}
                <div className="aws-field">
                  <label htmlFor="aws-username">Username</label>
                  <span className="aws-field-help">You will use this username to sign in to your new Zoop ID.</span>
                  <div className="aws-input-wrap">
                    <input
                      id="aws-username"
                      type="text"
                      className={`aws-input ${fieldErrors.username ? 'aws-input-error' : ''}`}
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
                  </div>
                  {fieldErrors.username && (
                    <span className="aws-error-text">{fieldErrors.username}</span>
                  )}
                </div>

                {/* Password / PIN */}
                <div className="aws-field">
                  <div className="aws-label-row">
                    <label htmlFor="aws-pin">Security PIN (6 digits)</label>
                    <button
                      type="button"
                      className="aws-link-toggle"
                      onClick={() => setShowSignUpPin(!showSignUpPin)}
                    >
                      {showSignUpPin ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <span className="aws-field-help">Choose a 6-digit numeric PIN to protect this device.</span>
                  <input
                    id="aws-pin"
                    type={showSignUpPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={PIN_LENGTH}
                    className={`aws-input ${fieldErrors.pin ? 'aws-input-error' : ''}`}
                    placeholder="••••••"
                    value={signUpPin}
                    onChange={(e) => {
                      setSignUpPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH));
                      setFieldErrors((f) => ({ ...f, pin: '' }));
                    }}
                    autoComplete="new-password"
                    required
                  />
                  {fieldErrors.pin && <span className="aws-error-text">{fieldErrors.pin}</span>}
                </div>

                {/* Confirm Password / PIN */}
                <div className="aws-field">
                  <label htmlFor="aws-pin-confirm">Confirm PIN</label>
                  <input
                    id="aws-pin-confirm"
                    type={showSignUpPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={PIN_LENGTH}
                    className={`aws-input ${fieldErrors.pinConfirm ? 'aws-input-error' : ''}`}
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
                    <span className="aws-error-text">{fieldErrors.pinConfirm}</span>
                  )}
                </div>

                {/* Device Name */}
                <div className="aws-field">
                  <label htmlFor="aws-device-name">Device name</label>
                  <span className="aws-field-help">
                    Choose a name for your device. You can change this name in your device settings after you sign up.
                  </span>
                  <input
                    id="aws-device-name"
                    type="text"
                    className={`aws-input ${fieldErrors.device ? 'aws-input-error' : ''}`}
                    value={signUpDeviceName}
                    onChange={(e) => {
                      setSignUpDeviceName(e.target.value);
                      setFieldErrors((f) => ({ ...f, device: '' }));
                    }}
                    required
                  />
                  {fieldErrors.device && (
                    <span className="aws-error-text">{fieldErrors.device}</span>
                  )}
                </div>

                {/* Signature AWS Orange CTA Button */}
                <button
                  type="submit"
                  className="aws-btn-orange"
                  disabled={loading || isRegistering}
                >
                  {loading || isRegistering ? (
                    <>
                      <AwsSpinner size={16} variant="inverted" />
                      <span>Creating account…</span>
                    </>
                  ) : (
                    <span>Continue (step 1 of 2)</span>
                  )}
                </button>

                {/* Bottom Switch Link */}
                <div className="aws-bottom-link-row">
                  <button
                    type="button"
                    className="aws-text-link"
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
            VIEW 2: SIGN IN (AWS Centered Layout, No Card Box)
           ═══════════════════════════════════════════════════════════════ */}
        {mode === 'signin' && (
          <div className="aws-signin-layout">
            <h1 className="aws-form-title">Sign in</h1>

            <form onSubmit={handleSignInSubmit} noValidate className="aws-form">
              {/* Step 1: Identifier */}
              {signInStep === 1 && (
                <>
                  <div className="aws-field">
                    <label htmlFor="aws-signin-id">Zoop ID or Username</label>
                    <span className="aws-field-help">Enter your @username or Zoop ID.</span>
                    <input
                      id="aws-signin-id"
                      type="text"
                      className={`aws-input ${fieldErrors.identifier ? 'aws-input-error' : ''}`}
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
                      <span className="aws-error-text">{fieldErrors.identifier}</span>
                    )}
                  </div>

                  <button type="submit" className="aws-btn-orange">
                    Continue
                  </button>

                  <div className="aws-bottom-link-row">
                    <button
                      type="button"
                      className="aws-text-link"
                      onClick={() => {
                        clearErrors();
                        setMode('signup');
                      }}
                    >
                      New to Zoop? Create a Zoop ID
                    </button>
                  </div>

                  <div className="aws-bottom-secondary-row">
                    <button
                      type="button"
                      className="aws-sub-link"
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
                  <div className="aws-identity-chip">
                    <span className="aws-identity-text">{signInIdentifier}</span>
                    <button
                      type="button"
                      className="aws-identity-change"
                      onClick={() => {
                        clearErrors();
                        setSignInStep(1);
                      }}
                    >
                      Change
                    </button>
                  </div>

                  <div className="aws-field">
                    <div className="aws-label-row">
                      <label htmlFor="aws-signin-pin">Security PIN</label>
                      <button
                        type="button"
                        className="aws-link-toggle"
                        onClick={() => setShowSignInPin(!showSignInPin)}
                      >
                        {showSignInPin ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <input
                      id="aws-signin-pin"
                      type={showSignInPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={PIN_LENGTH}
                      className={`aws-input ${fieldErrors.pin ? 'aws-input-error' : ''}`}
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
                      <span className="aws-error-text">{fieldErrors.pin}</span>
                    )}
                  </div>

                  <div className="aws-checkbox-row">
                    <label className="aws-checkbox-label">
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
                    className="aws-btn-orange"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <AwsSpinner size={16} variant="inverted" />
                        <span>Signing in…</span>
                      </>
                    ) : (
                      <span>Sign in</span>
                    )}
                  </button>

                  <div className="aws-bottom-link-row">
                    <button
                      type="button"
                      className="aws-text-link"
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
            VIEW 3: CONGRATULATIONS / SUCCESS (Matches AWS Screenshot 2)
           ═══════════════════════════════════════════════════════════════ */}
        {mode === 'congratulations' && (
          <div className="aws-congrats-layout">
            <div className="aws-congrats-illustration">
              <AwsRocketIllustration />
            </div>

            <h1 className="aws-congrats-title">Congratulations</h1>
            <p className="aws-congrats-sub">
              Thank you for signing up for Zoop. Your peer-to-peer mesh identity is active and ready.
            </p>

            <button
              type="button"
              className="aws-btn-orange aws-btn-congrats"
              onClick={() => onNavigate(redirectUrl)}
            >
              Go to Zoop Console
            </button>

            <div className="aws-bottom-link-row">
              <button
                type="button"
                className="aws-text-link"
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
