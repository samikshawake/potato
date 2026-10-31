import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export type LegalDocKey = 'privacy' | 'terms' | 'refund' | 'cookies';

export const LEGAL_DOCUMENTS: Record<
  LegalDocKey,
  { title: string; effectiveDate: string; sections: { heading: string; body: string }[] }
> = {
  privacy: {
    title: 'Privacy Policy',
    effectiveDate: 'October 31, 2026',
    sections: [
      {
        heading: '1. Data Minimization & 100% On-Device Statement Processing',
        body: 'CashCompass processes your CSV and PDF bank statements strictly locally inside your browser or Capacitor mobile sandbox. Raw bank statements, account numbers, landlord or merchant names, and cash-flow calculations are never transmitted to any external cloud server or third-party AI API.',
      },
      {
        heading: '2. Information Stored Locally',
        body: 'We store only the minimum data needed to operate your vault on your device: your display name, email identifier, a salted PBKDF2-HMAC-SHA256 password digest (210,000 iterations), your parsed transaction rows, and merchant category corrections. We never collect phone numbers, GPS coordinates, contacts, camera feeds, or microphone audio.',
      },
      {
        heading: '3. Children’s Privacy & 18+ Age Requirement',
        body: 'CashCompass is intended solely for adults aged 18 years and older. We require explicit 18+ age confirmation during registration and do not knowingly collect data from children.',
      },
      {
        heading: '4. Right to Data Deletion & Erasure',
        body: 'You may permanently erase your account, password hash, learned category rules, and all ingested bank statements at any time with a single click under Security & Legal → Data Deletion Request, receiving a signed cryptographic erasure receipt.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    effectiveDate: 'October 31, 2026',
    sections: [
      {
        heading: '1. Informational Financial Decision Aid (Not Licensed Financial Advice)',
        body: 'CashCompass provides deterministic cash-flow projections, recurring bill detection, and safety buffer arithmetic based solely on the bank statements you upload. CashCompass is not a bank, broker, or registered investment advisor. Always verify critical loan or purchase obligations against your official bank records.',
      },
      {
        heading: '2. Transparent Pricing & Zero Hidden Fees',
        body: 'CashCompass is provided free of charge (₹0.00) under the MIT Open-Source License. There are no recurring subscriptions, trial traps, overdraft fees, or hidden charges.',
      },
      {
        heading: '3. Acceptable Use & Local Vault Security',
        body: 'You are responsible for safeguarding your account password and the device on which your local vault resides. Because data is stored exclusively on your device, clearing browser storage or submitting a Data Deletion Request permanently removes local records unless you export an offline JSON backup first.',
      },
    ],
  },
  refund: {
    title: 'Refund & Transparent Pricing Policy',
    effectiveDate: 'October 31, 2026',
    sections: [
      {
        heading: '1. ₹0 Free Software — Zero Hidden Fees',
        body: 'CashCompass Offline Personal Finance Assistant is 100% free software (₹0.00) with zero paywalls, zero auto-renewing subscriptions, and zero hidden processing fees.',
      },
      {
        heading: '2. 30-Day Full Refund Guarantee on Future Enterprise Support Plans',
        body: 'Should CashCompass Software Labs offer optional paid enterprise support or signed hardware distribution in the future, any customer may cancel and request a full 100% no-questions-asked refund within 30 calendar days of purchase by emailing billing@cashcompass.local, with no cancellation penalties or dark-pattern retention flows.',
      },
    ],
  },
  cookies: {
    title: 'Cookie & Local Storage Policy',
    effectiveDate: 'October 31, 2026',
    sections: [
      {
        heading: '1. Zero Advertising or Cross-Site Tracking Cookies',
        body: 'CashCompass sets zero third-party advertising cookies, zero tracking pixels, and zero behavioral analytics identifiers.',
      },
      {
        heading: '2. Strictly Necessary Local Storage Keys',
        body: 'We use essential HTML5 localStorage keys on your device solely to store: (a) your signed HS256 session token (cashcompass_active_jwt_v1), (b) your salted PBKDF2 account record (cashcompass_auth_users_v1), (c) your local statement ledger (cashcompass_offline_txns_v1), and (d) your cookie banner choice (cashcompass_cookie_consent_v1).',
      },
      {
        heading: '3. Managing or Revoking Storage',
        body: 'You can switch between "Essential Storage Only" and "Accept Local Preferences" at any time or purge all storage keys instantly from the Security & Legal tab.',
      },
    ],
  },
};

interface LegalDocumentModalProps {
  activeDoc: LegalDocKey | null;
  onClose: () => void;
  onSwitchDoc: (doc: LegalDocKey) => void;
}

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({
  activeDoc,
  onClose,
  onSwitchDoc,
}) => {
  useEffect(() => {
    if (!activeDoc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeDoc, onClose]);

  if (!activeDoc) return null;
  const doc = LEGAL_DOCUMENTS[activeDoc];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-300 w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 id="legal-modal-title" className="text-xl font-bold text-slate-900">
              {doc.title}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Effective Date: {doc.effectiveDate} · CashCompass Software Labs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal policy modal"
            className="p-2 text-slate-600 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Document Switcher */}
        <div className="mt-4 flex flex-wrap gap-2 pb-4 border-b border-slate-200 text-xs">
          {(['privacy', 'terms', 'refund', 'cookies'] as LegalDocKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onSwitchDoc(key)}
              className={`px-3 py-1.5 font-semibold border transition-colors ${
                activeDoc === key
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                  : 'bg-white text-slate-800 border-slate-300 hover:border-[#1E3A8A]'
              }`}
            >
              {LEGAL_DOCUMENTS[key].title}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-5 text-sm text-slate-800 leading-relaxed">
          {doc.sections.map((sec, idx) => (
            <div key={idx}>
              <h3 className="font-bold text-slate-900">{sec.heading}</h3>
              <p className="mt-1 text-slate-700">{sec.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700">
          <span>Grievance &amp; Privacy Officer: Samiksha Wake · privacy@cashcompass.local</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1E3A8A] text-white font-semibold hover:bg-[#1D4ED8]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
