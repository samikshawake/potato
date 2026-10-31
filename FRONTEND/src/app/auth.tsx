import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Lock,
  UserPlus,
  LogIn,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { MascotAvatar } from '../components/MascotAvatar';
import { useFinance } from '../context/FinanceContext';

export default function AuthScreen() {
  const router = useRouter();
  const { login, register, loginDemo, openLegalDoc } = useFinance();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  const [emailDigestOptIn, setEmailDigestOptIn] = useState(false);
  const [startFresh, setStartFresh] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (mode === 'login') {
      if (!email.trim() || !password) {
        setErrorMsg('Please enter both your email address and password.');
        return;
      }
      setSubmitting(true);
      const res = await login(email.trim(), password);
      setSubmitting(false);
      if (!res.ok) {
        setErrorMsg(res.error || 'Invalid credentials.');
      } else {
        router.replace('/');
      }
      return;
    }

    // Create Account Validation
    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your name (at least 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setErrorMsg(
        'Password must be at least 8 characters and include uppercase, lowercase, and a number.'
      );
      return;
    }
    if (!ageConfirmed) {
      setErrorMsg('You must confirm you are 18 years or older (Age Consent Policy).');
      return;
    }
    if (!acceptPolicies) {
      setErrorMsg('Please review and accept the Privacy Policy and Terms of Service.');
      return;
    }

    setSubmitting(true);
    const res = await register({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      ageConfirmed18Plus: ageConfirmed,
      emailDigestOptIn,
      startFresh,
    });
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Could not create account.');
    } else {
      router.replace('/onboarding');
    }
  };

  const handleQuickDemo = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    const res = await loginDemo();
    setSubmitting(false);
    if (res.ok) {
      router.replace('/');
    } else {
      setErrorMsg(res.error || 'Demo sign-in unavailable.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand + Mascot Hero */}
        <View style={styles.heroCenter}>
          <View style={styles.mascotCircle}>
            <MascotAvatar size={80} showShades={true} />
          </View>
          <Text style={styles.appTitle}>CashCompass</Text>
          <Text style={styles.appSubtitle}>
            Explainable Personal Finance Assistant • ₹0 Free & Private
          </Text>
          <View style={styles.securityBadge}>
            <ShieldCheck size={12} color={THEME.colors.success} />
            <Text style={styles.securityBadgeText}>
              PBKDF2-SHA256 (210k) + 256-Bit HS256 JWT Vault
            </Text>
          </View>
        </View>

        {/* Segmented Mode Switcher: Sign In / Create Account */}
        <View style={styles.tabSwitchContainer}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
            onPress={() => {
              setMode('login');
              setErrorMsg(null);
            }}
          >
            <LogIn size={14} color={mode === 'login' ? '#FFF' : THEME.colors.textSecondary} />
            <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'register' && styles.modeTabActive]}
            onPress={() => {
              setMode('register');
              setErrorMsg(null);
            }}
          >
            <UserPlus
              size={14}
              color={mode === 'register' ? '#FFF' : THEME.colors.textSecondary}
            />
            <Text
              style={[styles.modeTabText, mode === 'register' && styles.modeTabTextActive]}
            >
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Auth Form Card */}
        <View style={styles.formCard}>
          {errorMsg && (
            <View style={styles.errorBox}>
              <AlertCircle size={15} color={THEME.colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {mode === 'register' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Full Name (Minimum Data Collected)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Parth Patil"
                placeholderTextColor={THEME.colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              placeholder="parth@cashcompass.local"
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.textInput, { marginBottom: 0, flex: 1, borderWidth: 0 }]}
                placeholder={
                  mode === 'register'
                    ? 'Min 8 chars, upper, lower & number'
                    : 'Enter your password'
                }
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={16} color={THEME.colors.textSecondary} />
                ) : (
                  <Eye size={16} color={THEME.colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Unchecked-by-default Consent Checkboxes (Zero Dark Patterns) */}
          {mode === 'register' && (
            <View style={styles.checkboxSection}>
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setAgeConfirmed(!ageConfirmed)}
              >
                {ageConfirmed ? (
                  <CheckSquare size={18} color={THEME.colors.primary} />
                ) : (
                  <Square size={18} color={THEME.colors.textMuted} />
                )}
                <Text style={styles.checkLabel}>
                  I confirm I am 18 years of age or older (Age Verification).
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setAcceptPolicies(!acceptPolicies)}
              >
                {acceptPolicies ? (
                  <CheckSquare size={18} color={THEME.colors.primary} />
                ) : (
                  <Square size={18} color={THEME.colors.textMuted} />
                )}
                <Text style={styles.checkLabel}>
                  I agree to the{' '}
                  <Text
                    style={styles.linkSpan}
                    onPress={() => openLegalDoc('privacy')}
                  >
                    Privacy Policy
                  </Text>
                  ,{' '}
                  <Text
                    style={styles.linkSpan}
                    onPress={() => openLegalDoc('terms')}
                  >
                    Terms
                  </Text>{' '}
                  &{' '}
                  <Text
                    style={styles.linkSpan}
                    onPress={() => openLegalDoc('refund')}
                  >
                    Refund Policy
                  </Text>
                  .
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setEmailDigestOptIn(!emailDigestOptIn)}
              >
                {emailDigestOptIn ? (
                  <CheckSquare size={18} color={THEME.colors.primary} />
                ) : (
                  <Square size={18} color={THEME.colors.textMuted} />
                )}
                <Text style={styles.checkLabel}>
                  Optional: Send monthly summary email (includes 1-click Unsubscribe link).
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setStartFresh(!startFresh)}
              >
                {startFresh ? (
                  <CheckSquare size={18} color={THEME.colors.primary} />
                ) : (
                  <Square size={18} color={THEME.colors.textMuted} />
                )}
                <Text style={styles.checkLabel}>
                  Start with an empty ₹0 ledger (instead of 4-month sample HDFC + SBI data).
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.primarySubmitBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Lock size={16} color="#FFF" />
            <Text style={styles.primarySubmitText}>
              {submitting
                ? 'Authenticating Vault...'
                : mode === 'login'
                ? 'Sign In to CashCompass'
                : 'Create Encrypted Account'}
            </Text>
          </TouchableOpacity>

          {/* 1-Click Demo Login for Parth */}
          <TouchableOpacity
            style={styles.demoLoginBtn}
            onPress={handleQuickDemo}
            disabled={submitting}
          >
            <Sparkles size={15} color={THEME.colors.primary} />
            <Text style={styles.demoLoginText}>
              Continue with Demo Account (Parth • ₹48,320)
            </Text>
          </TouchableOpacity>

          {mode === 'login' && (
            <Text style={styles.demoCredHint}>
              Demo login: parth@cashcompass.local / CashCompass@2026
            </Text>
          )}
        </View>

        {/* Transparent Legal Footer Links & Business Info */}
        <View style={styles.legalLinksRow}>
          <TouchableOpacity onPress={() => openLegalDoc('privacy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>•</Text>
          <TouchableOpacity onPress={() => openLegalDoc('terms')}>
            <Text style={styles.legalLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>•</Text>
          <TouchableOpacity onPress={() => openLegalDoc('refund')}>
            <Text style={styles.legalLink}>Refunds (₹0 Free)</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>•</Text>
          <TouchableOpacity onPress={() => openLegalDoc('cookies')}>
            <Text style={styles.legalLink}>Cookies</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.businessDetailsText}>
          CashCompass Labs • Indiranagar, Bengaluru 560038 • MIT Licensed Open-Source Software • Zero Hidden Fees
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: 28,
  },
  heroCenter: {
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  mascotCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.lavenderLight,
    ...THEME.shadows.card,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  appSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    marginTop: 8,
  },
  securityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.lavenderLight,
    borderRadius: THEME.borderRadius.full,
    padding: 4,
    marginBottom: THEME.spacing.md,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: THEME.borderRadius.full,
  },
  modeTabActive: {
    backgroundColor: THEME.colors.primary,
    ...THEME.shadows.soft,
  },
  modeTabText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  modeTabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDEDF0',
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.danger,
    flex: 1,
    lineHeight: 15,
  },
  fieldGroup: {
    marginBottom: THEME.spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 11,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingRight: 8,
  },
  eyeBtn: {
    padding: 6,
  },
  checkboxSection: {
    gap: 10,
    marginBottom: THEME.spacing.md,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  linkSpan: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  primarySubmitBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: THEME.borderRadius.lg,
    ...THEME.shadows.soft,
  },
  primarySubmitText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: '#FFF',
  },
  demoLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: THEME.spacing.sm,
    paddingVertical: 11,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.lavenderLight,
    borderWidth: 1,
    borderColor: '#E2D9F3',
  },
  demoLoginText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  demoCredHint: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  legalLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: THEME.spacing.lg,
  },
  legalLink: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  dot: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  businessDetailsText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
  },
});
