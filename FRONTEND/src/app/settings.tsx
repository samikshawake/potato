import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  RotateCcw,
  Download,
  CreditCard,
  Lock,
  Info,
  ChevronRight,
  Database,
  Moon,
  Sparkles,
  LogOut,
  Cpu,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    user,
    logout,
    openLegalDoc,
    accounts,
    transactions,
    totalBalance,
    resetDemoData,
  } = useFinance();

  const [showExportModal, setShowExportModal] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(false);

  const handleReset = () => {
    resetDemoData();
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 3000);
  };

  const handleNavChange = (tab: NavTab) => {
    switch (tab) {
      case 'home':
        router.push('/');
        break;
      case 'transactions':
        router.push('/transactions');
        break;
      case 'simulator':
        router.push('/simulator');
        break;
      case 'insights':
        router.push('/insights');
        break;
      case 'assistant':
        router.push('/assistant');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/')}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Privacy Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {(user?.fullName || 'P').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.fullName || 'Parth'}</Text>
            <Text style={styles.profileRole}>
              {user?.email || 'CashCompass Offline Edition'}
            </Text>
            <View style={styles.offlinePill}>
              <View style={styles.greenDot} />
              <Text style={styles.offlinePillText}>Authenticated Vault • Zero Cloud Leaks</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              logout();
              router.replace('/auth');
            }}
            style={{
              backgroundColor: '#FDEDF0',
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: THEME.borderRadius.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
            accessibilityLabel="Sign out"
          >
            <LogOut size={14} color={THEME.colors.danger} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.danger }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Local Storage Architecture & Metrics */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>On-Device Storage</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.storageHeader}>
            <Database size={18} color={THEME.colors.primary} />
            <Text style={styles.storageTitle}>Local SQLite Architecture</Text>
          </View>
          <Text style={styles.storageSub}>
            All financial metrics, transactions, and simulation assumptions are stored and calculated strictly on this device.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{transactions.length}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{accounts.length}</Text>
              <Text style={styles.statLabel}>Bank Accounts</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>0 KB</Text>
              <Text style={styles.statLabel}>Cloud Data</Text>
            </View>
          </View>
        </View>

        {/* Linked Accounts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Managed Accounts</Text>
        </View>

        <View style={styles.card}>
          {accounts.map((acc, idx) => (
            <View
              key={acc.id}
              style={[
                styles.accountRow,
                idx !== accounts.length - 1 && styles.accountRowBorder,
              ]}
            >
              <View style={styles.accountIconCircle}>
                <CreditCard size={18} color={THEME.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>{acc.bankName}</Text>
                <Text style={styles.accountNumber}>
                  {acc.name} • {acc.accountNumberMasked}
                </Text>
              </View>
              <Text style={styles.accountBalance}>{formatINR(acc.balance)}</Text>
            </View>
          ))}
        </View>

        {/* Data Privacy & Reset Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Data Management</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setShowExportModal(true)}
          >
            <View style={styles.actionLeft}>
              <Download size={18} color={THEME.colors.primary} />
              <View>
                <Text style={styles.actionLabel}>Export Local JSON Data</Text>
                <Text style={styles.actionSub}>Backup your offline database</Text>
              </View>
            </View>
            <ChevronRight size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowBorder]}
            onPress={() => router.push('/security')}
          >
            <View style={styles.actionLeft}>
              <Cpu size={18} color={THEME.colors.primary} />
              <View>
                <Text style={styles.actionLabel}>
                  Llama Model (.pte), Tokenizer & Security Center
                </Text>
                <Text style={styles.actionSub}>
                  Tokenizer benchmark, SSRF guard, JWT rotation, Policies & Data Erasure
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowBorder]}
            onPress={handleReset}
          >
            <View style={styles.actionLeft}>
              <RotateCcw size={18} color={THEME.colors.danger} />
              <View>
                <Text style={[styles.actionLabel, { color: THEME.colors.danger }]}>
                  Reset Demo Data
                </Text>
                <Text style={styles.actionSub}>
                  Restore original 4-month demo figures (₹48,320 balance)
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Quick Legal Links Row */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 10,
            marginBottom: THEME.spacing.sm,
          }}
        >
          <TouchableOpacity onPress={() => openLegalDoc('privacy')}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.primary }}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLegalDoc('terms')}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.primary }}>
              Terms
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLegalDoc('refund')}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.primary }}>
              Refund Policy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLegalDoc('cookies')}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.primary }}>
              Cookie Policy
            </Text>
          </TouchableOpacity>
        </View>

        {resetFeedback && (
          <View style={styles.resetFeedbackBox}>
            <ShieldCheck size={16} color={THEME.colors.success} />
            <Text style={styles.resetFeedbackText}>
              Local demo data reset to default successfully.
            </Text>
          </View>
        )}

        {/* About App */}
        <View style={styles.aboutBox}>
          <Text style={styles.aboutTitle}>
            CashCompass — Offline-First Explainable Personal Finance Assistant
          </Text>
          <Text style={styles.aboutText}>
            Built for Problem Statement 4: Personal Finance Assistant That Explains Its Answers.
          </Text>
          <Text style={styles.aboutVersion}>Version 1.0.0 (Offline Native Build)</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Local Database Snapshot</Text>
            <Text style={styles.modalSub}>
              Copy or inspect your unencrypted offline records:
            </Text>

            <ScrollView style={styles.jsonPreviewBox}>
              <Text style={styles.jsonText}>
                {JSON.stringify(
                  {
                    version: '1.0.0',
                    appName: 'CashCompass',
                    totalBalance,
                    accountCount: accounts.length,
                    transactionCount: transactions.length,
                    exportDate: new Date().toISOString(),
                  },
                  null,
                  2
                )}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="home" onSelectTab={handleNavChange} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 24,
  },
  profileCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
    marginBottom: THEME.spacing.md,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  profileName: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  profileRole: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: THEME.colors.success,
  },
  offlinePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  sectionHeader: {
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.xs,
  },
  sectionTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
    marginBottom: THEME.spacing.md,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  storageTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  storageSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: THEME.spacing.md,
  },
  accountRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  accountIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  accountNumber: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  accountBalance: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  actionRowBorder: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  actionLabel: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  actionSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  resetFeedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F8F0',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
  },
  resetFeedbackText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.success,
  },
  aboutBox: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.lg,
  },
  aboutTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  aboutText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  aboutVersion: {
    fontSize: 10,
    color: THEME.colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 37, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.card,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    ...THEME.shadows.hover,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  modalSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginVertical: 4,
  },
  jsonPreviewBox: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    maxHeight: 180,
    marginVertical: THEME.spacing.md,
  },
  jsonText: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: THEME.colors.textPrimary,
  },
  closeModalBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: '#FFF',
  },
});
