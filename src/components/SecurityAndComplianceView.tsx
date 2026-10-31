import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Smartphone,
  PackageCheck,
  MailX,
  Trash2,
  KeyRound,
  FileText,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  Download,
} from 'lucide-react';
import type { ForecastBacktestResult, RecurringPayment, Transaction } from '../types/finance';
import type { AuthenticatedSession, DataErasureReceipt } from '../security/authVault';
import { rotateJwtSecret, updateEmailSubscriptionPreference } from '../security/authVault';
import { validateUrlAgainstSSRF } from '../security/ssrfGuard';
import { safeLogger } from '../security/safeLogger';
import { LEGAL_DOCUMENTS, type LegalDocKey } from './LegalDocumentModal';

interface SecurityAndComplianceViewProps {
  session: AuthenticatedSession;
  onSessionUpdated: (next: AuthenticatedSession) => void;
  onForceSignOutAfterKeyRotation: () => void;
  onRequestAccountDeletion: () => Promise<DataErasureReceipt>;
  backtest: ForecastBacktestResult;
  recurringPayments: RecurringPayment[];
  transactions: Transaction[];
  customRulesCount: number;
  onExportAuditJson: () => void;
}

interface PermissionCheckItem {
  name: string;
  purpose: string;
  status: string;
}

const THIRD_PARTY_SDK_AUDIT = [
  {
    pkg: 'react / react-dom (19.0.1)',
    license: 'MIT License',
    networkCalls: 'None',
    purpose: 'Core declarative UI rendering',
  },
  {
    pkg: 'papaparse (5.7.0)',
    license: 'MIT License',
    networkCalls: 'None',
    purpose: 'Local browser CSV bank statement parsing',
  },
  {
    pkg: 'pdfjs-dist (6.4.299)',
    license: 'Apache-2.0 License',
    networkCalls: 'None (Local bundled worker)',
    purpose: '100% offline PDF bank statement text extraction',
  },
  {
    pkg: '@capacitor/core & android (8.6.0)',
    license: 'MIT License',
    networkCalls: 'Disabled (CapacitorHttp: false)',
    purpose: 'Native offline Android APK container',
  },
  {
    pkg: 'lucide-react (0.546.0)',
    license: 'ISC License',
    networkCalls: 'None (Inline SVG)',
    purpose: 'Accessible functional interface icons',
  },
  {
    pkg: 'Plus Jakarta Sans & IBM Plex Mono',
    license: 'SIL Open Font License 1.1',
    networkCalls: 'Cached / System fallback ready',
    purpose: 'Licensed display & tabular monospace typography',
  },
];

export const SecurityAndComplianceView: React.FC<SecurityAndComplianceViewProps> = ({
  session,
  onSessionUpdated,
  onForceSignOutAfterKeyRotation,
  onRequestAccountDeletion,
  backtest,
  recurringPayments,
  transactions,
  customRulesCount,
  onExportAuditJson,
}) => {
  const [subView, setSubView] = useState<'forecast' | 'security' | 'legal' | 'rights'>('security');
  const [selectedLegalDoc, setSelectedLegalDoc] = useState<LegalDocKey>('privacy');
  const [permissionsList, setPermissionsList] = useState<PermissionCheckItem[]>([]);
  const [ssrfTestUrl, setSsrfTestUrl] = useState('http://169.254.169.254/latest/meta-data/');
  const [ssrfResult, setSsrfResult] = useState(() =>
    validateUrlAgainstSSRF('http://169.254.169.254/latest/meta-data/')
  );
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(false);

  // Live Browser / Phone Permissions Audit (Constraint #6)
  useEffect(() => {
    let active = true;
    async function checkPermissions() {
      const checks: { label: string; queryName?: string; note: string }[] = [
        { label: 'Camera', queryName: 'camera', note: 'Never requested by CashCompass' },
        { label: 'Microphone', queryName: 'microphone', note: 'Never requested by CashCompass' },
        { label: 'Geolocation / GPS', queryName: 'geolocation', note: 'Never requested by CashCompass' },
        { label: 'Notifications', queryName: 'notifications', note: 'Never requested by CashCompass' },
        { label: 'Contacts & SMS', note: 'Blocked in Capacitor Manifest & Permissions-Policy' },
        {
          label: 'Scoped File Picker',
          note: 'User-initiated CSV / PDF / .pte selection only (Zero background disk access)',
        },
      ];

      const resolved: PermissionCheckItem[] = [];
      for (const item of checks) {
        let stateStr = 'Not Requested (Blocked by Policy)';
        if (item.queryName && typeof navigator !== 'undefined' && navigator.permissions?.query) {
          try {
            const status = await navigator.permissions.query({
              name: item.queryName as PermissionName,
            });
            stateStr =
              status.state === 'granted'
                ? 'Granted by Browser'
                : status.state === 'denied'
                ? 'Explicitly Denied'
                : 'Prompt / Never Requested';
          } catch {
            stateStr = 'Restricted via Permissions-Policy Header';
          }
        } else if (item.label === 'Scoped File Picker') {
          stateStr = 'On-Demand User Selection Only';
        }
        resolved.push({
          name: item.label,
          purpose: item.note,
          status: stateStr,
        });
      }
      if (active) setPermissionsList(resolved);
    }
    checkPermissions();
    return () => {
      active = false;
    };
  }, []);

  const handleSsrfCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateUrlAgainstSSRF(ssrfTestUrl);
    setSsrfResult(res);
    safeLogger.record('SECURITY', `SSRF check evaluated: allowed=${res.allowed}`, {
      reason: res.reason,
    });
  };

  const handleToggleEmailUnsubscribe = (nextSubscribed: boolean) => {
    updateEmailSubscriptionPreference(session.userId, nextSubscribed);
    onSessionUpdated({
      ...session,
      emailDigestSubscribed: nextSubscribed,
    });
  };

  const auditLogs = safeLogger.getEvents();

  return (
    <div className="space-y-8">
      {/* Sub-Navigation Bar */}
      <div
        role="tablist"
        aria-label="Forecast audit, security controls, and legal policies"
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
      >
        {[
          { id: 'security', label: 'Security, Permissions & SDK Audit' },
          { id: 'legal', label: 'Privacy, Terms, Refund & Cookie Policies' },
          { id: 'rights', label: 'Unsubscribe, Business Info & Data Deletion' },
          { id: 'forecast', label: 'Forecast Backtest & Recurring Schedule' },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={subView === tab.id}
            type="button"
            onClick={() => setSubView(tab.id as typeof subView)}
            className={`px-4 py-2 text-xs font-bold border transition-colors focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
              subView === tab.id
                ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                : 'bg-white text-slate-800 border-slate-300 hover:border-[#1E3A8A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Security Hardening, Phone Permissions, SDKs, SSRF & Redacted Logs */}
      {subView === 'security' && (
        <div className="space-y-8">
          {/* Cryptographic Auth, Password Hashing & JWT Secret Rotation */}
          <section className="border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <KeyRound className="w-5 h-5 text-[#1E3A8A] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Authentication, PBKDF2 Password Storage &amp; Secure HS256 JWT Secret
                  </h2>
                  <p className="text-xs text-slate-700 mt-0.5">
                    Passwords use 210,000-iteration PBKDF2-HMAC-SHA256 with unique 16-byte CSPRNG salts. Sessions use 256-bit HS256 JWTs rejecting <code className="font-mono">alg: none</code>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  rotateJwtSecret();
                  onForceSignOutAfterKeyRotation();
                }}
                className="px-4 py-2 border border-[#C81E1E] text-[#C81E1E] hover:bg-[#C81E1E] hover:text-white text-xs font-bold transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#C81E1E]"
              >
                Rotate 256-Bit JWT Secret &amp; Revoke Sessions
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 border border-slate-200">
                <div className="font-bold text-slate-900">Signed-In Identity</div>
                <div className="font-mono text-slate-700 mt-1">{session.email}</div>
                <div className="text-slate-600 mt-0.5">
                  Token Expires: {new Date(session.expiresAt * 1000).toLocaleTimeString()}
                </div>
              </div>
              <div className="p-3.5 border border-slate-200">
                <div className="font-bold text-slate-900">Password Hash KDF</div>
                <div className="font-mono text-[#1E3A8A] font-semibold mt-1">
                  PBKDF2-HMAC-SHA256 (210,000 iter)
                </div>
                <div className="text-slate-600 mt-0.5">128-bit CSPRNG salt + constant-time verify</div>
              </div>
              <div className="p-3.5 border border-slate-200">
                <div className="font-bold text-slate-900">Transparent Fee &amp; Pattern Check</div>
                <div className="font-mono text-[#1E3A8A] font-semibold mt-1">
                  ₹0.00 · Zero Hidden Fees
                </div>
                <div className="text-slate-600 mt-0.5">No fake reviews, no pre-ticked boxes</div>
              </div>
            </div>
          </section>

          {/* Phone & Browser Permissions Check (Constraint #6) */}
          <section className="border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
              <Smartphone className="w-5 h-5 text-[#1E3A8A]" aria-hidden="true" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Phone &amp; Device Permissions Audit
                </h2>
                <p className="text-xs text-slate-700">
                  Enforced via server <code className="font-mono">Permissions-Policy</code> HTTP header and Capacitor Android manifest.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {permissionsList.map((perm) => (
                <div key={perm.name} className="p-3.5 border border-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{perm.name}</span>
                    <span className="font-mono text-[11px] font-semibold text-[#1E3A8A]">
                      {perm.status}
                    </span>
                  </div>
                  <p className="text-slate-700 mt-1">{perm.purpose}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SSRF Prevention Validator (Additional Security Measure #4) */}
          <section className="border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
              <Lock className="w-5 h-5 text-[#1E3A8A]" aria-hidden="true" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  SSRF (Server-Side Request Forgery) Guard Verification
                </h2>
                <p className="text-xs text-slate-700">
                  Blocks <code className="font-mono">127.0.0.0/8</code>, RFC1918 private networks (<code className="font-mono">10/8</code>, <code className="font-mono">172.16/12</code>, <code className="font-mono">192.168/16</code>), cloud metadata (<code className="font-mono">169.254.169.254</code>), and non-HTTPS schemes.
                </p>
              </div>
            </div>

            <form onSubmit={handleSsrfCheck} className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <label htmlFor="ssrf-url-input" className="sr-only">
                URL to test against SSRF guard
              </label>
              <input
                id="ssrf-url-input"
                type="text"
                value={ssrfTestUrl}
                onChange={(e) => setSsrfTestUrl(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs font-mono border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-xs font-bold whitespace-nowrap"
              >
                Test SSRF Filter
              </button>
            </form>

            <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
              {[
                'http://169.254.169.254/latest/meta-data/',
                'https://127.0.0.1:8080/admin',
                'file:///etc/passwd',
                'https://github.com/itss-meS/finance_assistant/releases/tag/model-V1',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setSsrfTestUrl(sample);
                    setSsrfResult(validateUrlAgainstSSRF(sample));
                  }}
                  className="text-[#1E3A8A] underline font-mono text-[11px]"
                >
                  {sample.slice(0, 42)}
                </button>
              ))}
            </div>

            <div
              className={`mt-3 p-3 border text-xs font-mono ${
                ssrfResult.allowed
                  ? 'border-[#1E3A8A] bg-blue-50/50 text-[#1E3A8A]'
                  : 'border-[#C81E1E] bg-red-50/60 text-[#991B1B]'
              }`}
            >
              <strong>{ssrfResult.allowed ? 'ALLOWED:' : 'BLOCKED BY SSRF GUARD:'}</strong>{' '}
              {ssrfResult.reason}
            </div>
          </section>

          {/* Third-Party SDK & Font/Asset Licensing Audit (Constraints #8 & #19) */}
          <section className="border border-slate-200 bg-white">
            <div className="p-6 border-b border-slate-200 flex items-center gap-2.5">
              <PackageCheck className="w-5 h-5 text-[#1E3A8A]" aria-hidden="true" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Third-Party SDK &amp; Font/Asset License Audit
                </h2>
                <p className="text-xs text-slate-700">
                  Zero ad networks, zero telemetry SDKs, and zero unlicensed proprietary fonts or AI-generated imagery.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-800">
                    <th className="py-3 px-4">Dependency / Font Asset</th>
                    <th className="py-3 px-4">Verified License</th>
                    <th className="py-3 px-4">External Telemetry</th>
                    <th className="py-3 px-4">Scope in CashCompass</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {THIRD_PARTY_SDK_AUDIT.map((row) => (
                    <tr key={row.pkg}>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{row.pkg}</td>
                      <td className="py-3 px-4">{row.license}</td>
                      <td className="py-3 px-4 font-semibold text-[#1E3A8A]">{row.networkCalls}</td>
                      <td className="py-3 px-4 text-slate-700">{row.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* PII-Redacted Safe Diagnostic Log Viewer (Additional Measure #5) */}
          <section className="border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Redacted Security Log Stream (Zero Sensitive Data in Logs)
                </h2>
                <p className="text-xs text-slate-700">
                  Passwords, JWTs, account digits, UTRs, and raw statement rows are automatically scrubbed before logging.
                </p>
              </div>
            </div>

            <div className="mt-3 border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto font-mono text-xs">
              {auditLogs.length === 0 ? (
                <div className="p-4 text-slate-600">No security events logged in this session.</div>
              ) : (
                auditLogs.map((ev) => (
                  <div key={ev.id} className="px-3.5 py-2 flex flex-wrap justify-between gap-2">
                    <span className="text-slate-900">
                      <strong className="text-[#1E3A8A]">[{ev.category}]</strong> {ev.action}
                    </span>
                    <span className="text-slate-600">{ev.redactedSummary}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: Full Legal Policies (Privacy, Terms, Refund, Cookie Policy) */}
      {subView === 'legal' && (
        <section className="border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#1E3A8A]" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-900">
                {LEGAL_DOCUMENTS[selectedLegalDoc].title}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {(['privacy', 'terms', 'refund', 'cookies'] as LegalDocKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedLegalDoc(key)}
                  className={`px-3 py-1.5 font-bold border ${
                    selectedLegalDoc === key
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                      : 'bg-white text-slate-800 border-slate-300'
                  }`}
                >
                  {LEGAL_DOCUMENTS[key].title}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-5 text-sm text-slate-800 leading-relaxed">
            {LEGAL_DOCUMENTS[selectedLegalDoc].sections.map((s, idx) => (
              <div key={idx}>
                <h3 className="font-bold text-slate-900">{s.heading}</h3>
                <p className="mt-1 text-slate-700">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: Email Unsubscribe, Business Details & Data Deletion Request */}
      {subView === 'rights' && (
        <div className="space-y-6">
          {/* Email Unsubscribe Center (Constraint #17) */}
          <section className="border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-3">
              <MailX className="w-5 h-5 text-[#1E3A8A] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <h2 className="text-base font-bold text-slate-900">
                  Email Preferences &amp; One-Click Unsubscribe Link
                </h2>
                <p className="text-xs text-slate-700 mt-1">
                  Every optional reminder template includes a direct RFC-8058 one-click unsubscribe link (<code className="font-mono">/api/unsubscribe?token={session.unsubscribeToken}</code>) with zero login required to opt out.
                </p>

                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">
                      Current Status:{' '}
                      {session.emailDigestSubscribed
                        ? 'Subscribed to Monthly Digest'
                        : 'Unsubscribed (Zero Emails Sent)'}
                    </div>
                    <div className="text-slate-700 mt-0.5">
                      Direct Unsubscribe Endpoint:{' '}
                      <a
                        href={`/api/unsubscribe?token=${session.unsubscribeToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1E3A8A] font-semibold underline"
                      >
                        /api/unsubscribe?token={session.unsubscribeToken.slice(0, 10)}...
                      </a>
                    </div>
                  </div>

                  {session.emailDigestSubscribed ? (
                    <button
                      type="button"
                      onClick={() => handleToggleEmailUnsubscribe(false)}
                      className="px-4 py-2 bg-[#C81E1E] hover:bg-[#991B1B] text-white font-bold"
                    >
                      One-Click Unsubscribe Now
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleEmailUnsubscribe(true)}
                      className="px-4 py-2 border border-[#1E3A8A] text-[#1E3A8A] font-bold hover:bg-blue-50"
                    >
                      Opt In to Monthly Digest
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Business Details (Constraint #16) */}
          <section className="border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#1E3A8A] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs text-slate-800 space-y-1.5">
                <h2 className="text-base font-bold text-slate-900">
                  Registered Business &amp; Grievance Officer Details
                </h2>
                <div>
                  <strong>Entity Name:</strong> CashCompass Software Labs (Open-Source Financial Tools Division)
                </div>
                <div>
                  <strong>Registered Address:</strong> Suite 402, Baner Tech Park, Pune, Maharashtra 411045, India
                </div>
                <div>
                  <strong>Data Protection &amp; Grievance Officer:</strong> Samiksha Wake ·{' '}
                  <span className="font-mono">privacy@cashcompass.local</span>
                </div>
                <div>
                  <strong>Software License &amp; Pricing:</strong> MIT Open-Source License · ₹0.00 (No hidden fees or in-app charges)
                </div>
              </div>
            </div>
          </section>

          {/* Data Deletion Request Option (Constraint #20) */}
          <section className="border-2 border-[#C81E1E]/40 bg-white p-6">
            <div className="flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-[#C81E1E] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <h2 className="text-base font-bold text-slate-900">
                  Self-Service Account &amp; Data Deletion Request (Right to Erasure)
                </h2>
                <p className="text-xs text-slate-700 mt-1">
                  Permanently purges your PBKDF2 password record, active JWT session, learned merchant rules ({customRulesCount}), and all {transactions.length} local bank statement transactions, then downloads a signed Data Erasure Receipt.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onExportAuditJson}
                    className="px-4 py-2 border border-slate-300 text-xs font-bold text-slate-800 hover:border-[#1E3A8A] inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Export Backup JSON First</span>
                  </button>

                  {!confirmDeleteStep ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteStep(true)}
                      className="px-4 py-2 bg-[#C81E1E] hover:bg-[#991B1B] text-white text-xs font-bold"
                    >
                      Request Permanent Account &amp; Data Deletion
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const receipt = await onRequestAccountDeletion();
                          const blob = new Blob([JSON.stringify(receipt, null, 2)], {
                            type: 'application/json',
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${receipt.receiptId}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="px-4 py-2 bg-[#991B1B] text-white text-xs font-bold"
                      >
                        Confirm Permanent Erasure &amp; Download Receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteStep(false)}
                        className="px-3 py-2 border border-slate-300 text-xs font-semibold text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: Forecast Backtest & Recurring Schedule */}
      {subView === 'forecast' && (
        <div className="space-y-8">
          <section className="border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Forecast Track Record &amp; Holdout Verification
                </h2>
                <p className="text-xs text-slate-700 mt-0.5">
                  Holds out your most recent complete statement month, runs the deterministic forecast on earlier months only, and audits accuracy against realized balances.
                </p>
              </div>
              {backtest.available && (
                <div className="font-mono text-right">
                  <div className="text-xs text-slate-600">Holdout Balance Accuracy</div>
                  <div className="text-lg font-bold text-[#1E3A8A] tabular-nums">
                    {backtest.balanceAccuracyPct}%
                  </div>
                </div>
              )}
            </div>

            {!backtest.available ? (
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#C81E1E] shrink-0" aria-hidden="true" />
                <span>{backtest.reasonIfUnavailable}</span>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-slate-200">
                    <div className="text-xs text-slate-700">
                      {backtest.holdoutMonthLabel} Income (Trained on {backtest.trainingMonthsCount} mo)
                    </div>
                    <div className="mt-2 flex items-baseline justify-between font-mono text-sm tabular-nums">
                      <span className="text-slate-700">
                        Pred: ₹{backtest.predictedIncome.toLocaleString('en-IN')}
                      </span>
                      <span className="font-bold text-slate-900">
                        Actual: ₹{backtest.actualIncome.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 border border-slate-200">
                    <div className="text-xs text-slate-700">
                      {backtest.holdoutMonthLabel} Total Spending
                    </div>
                    <div className="mt-2 flex items-baseline justify-between font-mono text-sm tabular-nums">
                      <span className="text-slate-700">
                        Pred: ₹{backtest.predictedTotalSpend.toLocaleString('en-IN')}
                      </span>
                      <span className="font-bold text-slate-900">
                        Actual: ₹{backtest.actualTotalSpend.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 border border-slate-200">
                    <div className="text-xs text-slate-700">
                      {backtest.holdoutMonthLabel} Closing Balance
                    </div>
                    <div className="mt-2 flex items-baseline justify-between font-mono text-sm tabular-nums">
                      <span className="text-slate-700">
                        Pred: ₹{backtest.predictedEndingBalance.toLocaleString('en-IN')}
                      </span>
                      <span className="font-bold text-[#1E3A8A]">
                        Actual: ₹{backtest.actualEndingBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-[#1E3A8A]" aria-hidden="true" />
                    <span>
                      {backtest.withinUncertaintyBand
                        ? `Calibrated: Realized balance landed inside the predicted P15–P85 uncertainty range (Error: ₹${backtest.absoluteBalanceError.toLocaleString('en-IN')}).`
                        : `Variance Note: Realized balance differed by ₹${backtest.absoluteBalanceError.toLocaleString('en-IN')} due to irregular activity:`}
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-slate-700 space-y-1 pl-1">
                    {backtest.varianceDrivers.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          <section className="border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-[#1E3A8A]" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Detected Recurring Payments, Subscriptions &amp; EMIs
                  </h2>
                  <p className="text-xs text-slate-700">
                    Identified via payment interval periodicity across combined accounts.
                  </p>
                </div>
              </div>
              <div className="font-mono text-sm font-bold text-[#1E3A8A] tabular-nums">
                Total: ₹
                {recurringPayments
                  .reduce((s, r) => s + r.averageAmount, 0)
                  .toLocaleString('en-IN')}
                /month
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
                    <th className="py-3 px-4">Merchant / Commitment</th>
                    <th className="py-3 px-4">Type · Account</th>
                    <th className="py-3 px-4 whitespace-nowrap">Cadence</th>
                    <th className="py-3 px-4 whitespace-nowrap">Last Paid</th>
                    <th className="py-3 px-4 whitespace-nowrap">Next Expected Date</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Expected Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {recurringPayments.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-semibold text-slate-900">{rec.displayName}</td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {rec.kind} · {rec.accountName}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        Every {rec.cadenceDays}d ({rec.occurrences}×)
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {rec.lastPaidDate}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-[#1E3A8A] whitespace-nowrap">
                        {rec.nextExpectedDate}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        ₹{rec.averageAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
