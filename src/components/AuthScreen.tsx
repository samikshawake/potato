import React, { useState } from 'react';
import { Lock, UserPlus, LogIn, ShieldCheck, Eye, EyeOff, ArrowRight } from 'lucide-react';
import {
  registerOfflineAccount,
  signInDemoSandboxSession,
  signInOfflineAccount,
  validatePasswordStrength,
  type AuthenticatedSession,
} from '../security/authVault';

interface AuthScreenProps {
  onAuthenticated: (session: AuthenticatedSession) => void;
  onOpenLegalModal: (doc: 'privacy' | 'terms' | 'refund' | 'cookies') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  onOpenLegalModal,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Zero dark patterns: checkboxes are NEVER pre-ticked
  const [age18Confirmed, setAge18Confirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [emailDigestSubscribed, setEmailDigestSubscribed] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pwCheck = validatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        const session = await registerOfflineAccount({
          email,
          displayName,
          password,
          age18Confirmed,
          termsAccepted,
          emailDigestSubscribed,
        });
        onAuthenticated(session);
      } else {
        const session = await signInOfflineAccount({ email, password });
        onAuthenticated(session);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAccess = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const session = await signInDemoSandboxSession();
      onAuthenticated(session);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between">
      {/* Clean Top Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <span className="text-xl font-bold tracking-tight text-[#1E3A8A]">
            CashCompass
          </span>
          <div className="text-xs font-medium text-slate-700">
            100% Offline Vault · Zero Hidden Fees (₹0 Free MIT Software)
          </div>
        </div>
      </header>

      {/* Main Split Auth Layout */}
      <main id="main-content" className="flex-1 max-w-[1120px] w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left: Value Proposition & Explicit Offline Security Architecture */}
        <div className="lg:col-span-6 space-y-6">
          <div className="text-xs font-bold text-[#1E3A8A]">
            Air-Gapped Personal Finance &amp; Explainable Affordability Assistant
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight [text-wrap:balance]">
            Verify whether you can afford next month’s purchase without uploading bank data to the cloud.
          </h1>
          <p className="text-base text-slate-700 leading-relaxed">
            Combine CSV and PDF statements from multiple bank accounts locally on your device, detect recurring bills and anomalies, and inspect every arithmetic step of your cash-flow forecast.
          </p>

          <div className="space-y-3 pt-2 border-t border-slate-200 text-sm text-slate-800">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#1E3A8A] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="font-semibold text-slate-900">PBKDF2-HMAC-SHA256 &amp; HS256 JWT Vault:</strong>{' '}
                Passwords are salted and hashed with 210,000 iterations locally; sessions use cryptographically signed 256-bit HS256 tokens.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Lock className="w-5 h-5 text-[#1E3A8A] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="font-semibold text-slate-900">Strict Data Minimization:</strong>{' '}
                No phone number, location, camera, microphone, or contacts permissions are ever requested.
              </div>
            </div>
          </div>

          {/* Transparent Zero-Dark-Pattern Instant Demo Option */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleDemoAccess}
              disabled={isSubmitting}
              className="px-5 py-3 border-2 border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white text-sm font-bold transition-colors inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
            >
              <span>Explore Pre-Loaded Local Demo Vault</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <p className="text-xs text-slate-600 mt-1.5">
              Opens an isolated local sandbox with sample multi-account CSV &amp; PDF data — no personal registration needed.
            </p>
          </div>
        </div>

        {/* Right: Sign In / Create Account Card */}
        <div className="lg:col-span-6 border border-slate-300 bg-white p-6 sm:p-8">
          {/* Mode Switcher Tabs */}
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 border-b border-slate-200 mb-6"
          >
            <button
              role="tab"
              aria-selected={mode === 'login'}
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`py-3 text-sm font-bold border-b-2 transition-colors focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
                mode === 'login'
                  ? 'border-[#1E3A8A] text-[#1E3A8A]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              role="tab"
              aria-selected={mode === 'register'}
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`py-3 text-sm font-bold border-b-2 transition-colors focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
                mode === 'register'
                  ? 'border-[#1E3A8A] text-[#1E3A8A]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 p-3.5 border border-[#C81E1E] bg-red-50 text-xs font-semibold text-[#991B1B]"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-bold text-slate-800 mb-1">
                  Full Name or Alias <span className="text-[#C81E1E]">*</span>
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Samiksha"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-bold text-slate-800 mb-1">
                Email Address (Stored Locally Only) <span className="text-[#C81E1E]">*</span>
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-bold text-slate-800 mb-1">
                Password {mode === 'register' && '(Min 10 chars, upper/lower + digit)'}{' '}
                <span className="text-[#C81E1E]">*</span>
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter strong password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {mode === 'register' && password.length > 0 && (
                <p
                  className={`mt-1 text-xs font-medium ${
                    pwCheck.valid ? 'text-[#1E3A8A]' : 'text-[#C81E1E]'
                  }`}
                >
                  {pwCheck.message}
                </p>
              )}
            </div>

            {mode === 'register' && (
              <div className="space-y-3 pt-2 border-t border-slate-200 text-xs text-slate-800">
                {/* Age Consent Check (Constraint #18) */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={age18Confirmed}
                    onChange={(e) => setAge18Confirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#1E3A8A]"
                  />
                  <span>
                    <strong>Age Consent (18+):</strong> I confirm that I am at least 18 years of age. CashCompass does not knowingly collect financial or personal data from children under 18.{' '}
                    <span className="text-[#C81E1E]">*</span>
                  </span>
                </label>

                {/* Privacy & Terms Check (Constraints #1, #2, #9) */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#1E3A8A]"
                  />
                  <span>
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegalModal('privacy')}
                      className="text-[#1E3A8A] font-semibold underline"
                    >
                      Privacy Policy
                    </button>
                    ,{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegalModal('terms')}
                      className="text-[#1E3A8A] font-semibold underline"
                    >
                      Terms of Service
                    </button>
                    , and{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegalModal('refund')}
                      className="text-[#1E3A8A] font-semibold underline"
                    >
                      Refund Policy
                    </button>
                    . <span className="text-[#C81E1E]">*</span>
                  </span>
                </label>

                {/* Optional Email Digest (Unchecked by default, Constraint #9 & #17) */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailDigestSubscribed}
                    onChange={(e) => setEmailDigestSubscribed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#1E3A8A]"
                  />
                  <span className="text-slate-700">
                    Optional: Enable monthly local budget reminder emails (includes one-click unsubscribe link in every email; unchecked by default).
                  </span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-5 bg-[#C81E1E] hover:bg-[#991B1B] text-white text-sm font-bold transition-colors inline-flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C81E1E] disabled:opacity-60"
            >
              {mode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>{isSubmitting ? 'Hashing Credentials...' : 'Create Offline Account'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  <span>{isSubmitting ? 'Verifying PBKDF2 Hash...' : 'Sign In to Vault'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Transparent Legal & Business Details Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-[1200px] mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-700">
          <div>
            <strong>CashCompass Software Labs</strong> · Pune, Maharashtra 411001, India · Support: privacy@cashcompass.local
          </div>
          <div className="flex flex-wrap items-center gap-4 font-medium">
            <button
              type="button"
              onClick={() => onOpenLegalModal('privacy')}
              className="hover:text-[#1E3A8A] underline"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onOpenLegalModal('terms')}
              className="hover:text-[#1E3A8A] underline"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => onOpenLegalModal('refund')}
              className="hover:text-[#1E3A8A] underline"
            >
              Refund Policy
            </button>
            <button
              type="button"
              onClick={() => onOpenLegalModal('cookies')}
              className="hover:text-[#1E3A8A] underline"
            >
              Cookie Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
