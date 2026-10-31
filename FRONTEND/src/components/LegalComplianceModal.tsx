import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ShieldCheck, X, Cookie } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { useFinance, LegalDocKey } from '../context/FinanceContext';

const LEGAL_DOCUMENTS: Record<
  LegalDocKey,
  { title: string; updated: string; sections: { heading: string; body: string }[] }
> = {
  privacy: {
    title: 'Privacy Policy (Data Minimization & Zero Cloud Telemetry)',
    updated: 'Effective: October 2026',
    sections: [
      {
        heading: '1. Data Minimization & Local Processing',
        body: 'CashCompass collects strictly the minimum data required to authenticate your vault (name, email, salted PBKDF2-SHA256 password hash) and store your imported bank transactions. Raw CSV and PDF bank statements are parsed locally in browser/device memory and are never transmitted to external third-party servers or LLM APIs.',
      },
      {
        heading: '2. Zero Sensitive Data in Logs',
        body: 'All server audit logs automatically redact JWT tokens, emails, passwords, and transaction payloads before writing to stdout.',
      },
      {
        heading: '3. Age Requirement (18+)',
        body: 'CashCompass does not knowingly collect personal or financial data from children under 18. Explicit 18+ age consent is verified at account creation.',
      },
      {
        heading: '4. Right to Erasure (Permanent Data Deletion)',
        body: 'You can permanently delete your account and all financial records at any time from Settings → Security & Compliance, receiving a cryptographically signed erasure receipt.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service & No Unsupported Claims',
    updated: 'Effective: October 2026',
    sections: [
      {
        heading: '1. Informational Decision Support Only',
        body: 'CashCompass is an deterministic personal finance calculation tool, not a SEBI-registered investment advisor, lender, or chartered accountant. Projections show mathematical P15–P85 ranges based on past statements and make zero guarantees about future market returns or credit approval.',
      },
      {
        heading: '2. Transparent Pricing & Zero Hidden Fees',
        body: 'CashCompass Open-Source Offline Edition is ₹0.00 (free under the MIT License) with zero subscription traps, zero convenience surcharges, and zero dark patterns.',
      },
      {
        heading: '3. Authentic Information Policy',
        body: 'CashCompass contains zero fake user reviews, synthetic testimonials, or fabricated app-store star ratings.',
      },
    ],
  },
  refund: {
    title: 'Refund & Cancellation Policy',
    updated: 'Effective: October 2026',
    sections: [
      {
        heading: '1. Zero Charges — Free MIT Open-Source Software',
        body: 'CashCompass Offline Edition charges ₹0.00 for account creation, CSV/PDF statement analysis, purchase simulation, and local Llama inference. There are no paid tiers, recurring charges, or hidden fees.',
      },
      {
        heading: '2. Future Paid Add-Ons (30-Day Full Refund Guarantee)',
        body: 'Should any optional paid enterprise support ever be offered in the future, cancellations within 30 days qualify for an unconditional 100% refund with 1-click self-service cancellation and zero retention dark patterns.',
      },
    ],
  },
  cookies: {
    title: 'Cookie & Local Storage Policy',
    updated: 'Effective: October 2026',
    sections: [
      {
        heading: '1. Strictly Necessary Storage Only',
        body: 'CashCompass uses localStorage strictly to store your authenticated HS256 session token (cc_jwt_session_v1) and your cookie consent choice (cc_cookie_consent_v1).',
      },
      {
        heading: '2. Zero Ad-Tech or Cross-Site Tracking Cookies',
        body: 'We load zero third-party advertising pixels, analytics trackers, or behavioral profiling scripts. Clicking "Essential Only" and "Accept" have equal visual prominence with zero dark patterns.',
      },
    ],
  },
};

export const LegalPolicyModal: React.FC = () => {
  const { activeLegalDoc, openLegalDoc } = useFinance();
  if (!activeLegalDoc) return null;

  const doc = LEGAL_DOCUMENTS[activeLegalDoc];

  return (
    <Modal
      visible={!!activeLegalDoc}
      transparent
      animationType="slide"
      onRequestClose={() => openLegalDoc(null)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.modalTitle}>{doc.title}</Text>
              <Text style={styles.updatedText}>{doc.updated}</Text>
            </View>
            <TouchableOpacity
              onPress={() => openLegalDoc(null)}
              style={styles.closeBtn}
              accessibilityLabel="Close policy modal"
            >
              <X size={20} color={THEME.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Switcher Tabs */}
          <View style={styles.tabRow}>
            {(
              [
                { id: 'privacy', label: 'Privacy' },
                { id: 'terms', label: 'Terms' },
                { id: 'refund', label: 'Refunds' },
                { id: 'cookies', label: 'Cookies' },
              ] as { id: LegalDocKey; label: string }[]
            ).map((t) => {
              const active = activeLegalDoc === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tabPill, active && styles.tabPillActive]}
                  onPress={() => openLegalDoc(t.id)}
                >
                  <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {doc.sections.map((sec, idx) => (
              <View key={idx} style={styles.secBox}>
                <Text style={styles.secHeading}>{sec.heading}</Text>
                <Text style={styles.secBody}>{sec.body}</Text>
              </View>
            ))}

            <View style={styles.businessFooter}>
              <ShieldCheck size={14} color={THEME.colors.primary} />
              <Text style={styles.businessText}>
                CashCompass Labs Open-Source Project • 100 Feet Road, Indiranagar, Bengaluru, KA 560038 • privacy@cashcompass.local • MIT License
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => openLegalDoc(null)}
          >
            <Text style={styles.doneBtnText}>Close Document</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const COOKIE_CONSENT_KEY = 'cc_cookie_consent_v1';

export const CookieConsentBanner: React.FC = () => {
  const { openLegalDoc } = useFinance();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!saved) setVisible(true);
    } catch {
      // ignore
    }
  }, []);

  const saveChoice = (choice: 'essential_only' | 'accepted') => {
    try {
      localStorage.setItem(
        COOKIE_CONSENT_KEY,
        JSON.stringify({ choice, timestamp: new Date().toISOString() })
      );
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <View style={styles.cookieBanner}>
      <View style={styles.cookieTopRow}>
        <Cookie size={16} color={THEME.colors.primary} />
        <Text style={styles.cookieTitle}>Storage & Cookie Consent (Zero Tracking)</Text>
      </View>
      <Text style={styles.cookieSub}>
        CashCompass uses strictly necessary local storage for your encrypted session and preferences. No third-party ad cookies are ever set.{' '}
        <Text
          style={{ color: THEME.colors.primary, fontWeight: '700' }}
          onPress={() => openLegalDoc('cookies')}
        >
          Read Cookie Policy
        </Text>
      </Text>
      {/* Equal-weight buttons — zero dark patterns (Constraint #5 & #9) */}
      <View style={styles.cookieBtnRow}>
        <TouchableOpacity
          style={styles.cookieEqualBtnSecondary}
          onPress={() => saveChoice('essential_only')}
        >
          <Text style={styles.cookieEqualBtnSecondaryText}>Essential Only</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cookieEqualBtnPrimary}
          onPress={() => saveChoice('accepted')}
        >
          <Text style={styles.cookieEqualBtnPrimaryText}>Accept Storage</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 37, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: THEME.colors.card,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    ...THEME.shadows.hover,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.sm,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  updatedText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.lavenderLight,
    borderRadius: THEME.borderRadius.full,
    padding: 3,
    marginBottom: THEME.spacing.md,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: THEME.colors.primary,
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabPillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  secBox: {
    marginBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  secHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  secBody: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
  },
  businessFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: THEME.spacing.sm,
    backgroundColor: THEME.colors.lavenderLight,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
  },
  businessText: {
    fontSize: 10,
    color: THEME.colors.textPrimary,
    flex: 1,
    lineHeight: 14,
  },
  doneBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  cookieBanner: {
    backgroundColor: THEME.colors.card,
    borderTopWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: 10,
    ...THEME.shadows.hover,
  },
  cookieTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  cookieTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  cookieSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    lineHeight: 15,
    marginBottom: 8,
  },
  cookieBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cookieEqualBtnSecondary: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
  },
  cookieEqualBtnSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  cookieEqualBtnPrimary: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
  },
  cookieEqualBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
});
