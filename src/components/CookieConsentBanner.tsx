import React from 'react';

export type CookieConsentChoice = 'essential_only' | 'accepted_all' | null;

interface CookieConsentBannerProps {
  choice: CookieConsentChoice;
  onSelectChoice: (choice: 'essential_only' | 'accepted_all') => void;
  onReadCookiePolicy: () => void;
}

/**
 * Zero-Dark-Pattern Cookie & Local Storage Consent Banner (Constraints #4, #5, #9).
 * Both "Essential Only" and "Accept All" buttons share equal visual geometry and contrast
 * so users are never nudged or tricked into unnecessary tracking.
 */
export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  choice,
  onSelectChoice,
  onReadCookiePolicy,
}) => {
  if (choice !== null) return null;

  return (
    <aside
      role="region"
      aria-label="Cookie and local storage consent banner"
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t-2 border-[#1E3A8A] px-5 py-3.5 shadow-sm"
    >
      <div className="max-w-[1360px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <p className="text-xs text-slate-800 leading-relaxed">
          <strong className="font-bold text-slate-900">Cookie &amp; Local Storage Notice:</strong>{' '}
          CashCompass uses zero third-party advertising or analytics cookies. We use strictly necessary browser{' '}
          <code className="font-mono">localStorage</code> to keep your encrypted session and bank statement ledger on your device.{' '}
          <button
            type="button"
            onClick={onReadCookiePolicy}
            className="text-[#1E3A8A] font-semibold underline focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
          >
            Read Cookie Policy
          </button>
          .
        </p>

        {/* Equal prominence buttons — zero dark patterns */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onSelectChoice('essential_only')}
            className="px-4 py-2 border-2 border-[#1E3A8A] bg-white text-[#1E3A8A] hover:bg-slate-50 text-xs font-bold transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
          >
            Essential Storage Only
          </button>
          <button
            type="button"
            onClick={() => onSelectChoice('accepted_all')}
            className="px-4 py-2 border-2 border-[#1E3A8A] bg-[#1E3A8A] text-white hover:bg-[#1D4ED8] text-xs font-bold transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
          >
            Accept Local Preferences
          </button>
        </div>
      </div>
    </aside>
  );
};
