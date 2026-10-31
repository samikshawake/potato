import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  ChevronRight,
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
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Card (clean — no elements below user name) */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {(user?.fullName || 'P').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.fullName || 'Parth'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              logout();
              router.replace('/auth');
            }}
            style={styles.signOutBtn}
            accessibilityLabel="Sign out"
          >
            <LogOut size={14} color={THEME.colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Overview Stats */}
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{transactions.length}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{accounts.length}</Text>
              <Text style={styles.statLabel}>Accounts</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{formatINR(totalBalance)}</Text>
              <Text style={styles.statLabel}>Total Balance</Text>
            </View>
          </View>
        </View>

        {/* Linked Accounts */}
        {accounts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Accounts</Text>
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
                    <Text style={styles.accountName}>{acc.name || acc.bankName}</Text>
                    <Text style={styles.accountNumber}>{acc.accountNumberMasked}</Text>
                  </View>
                  <Text style={styles.accountBalance}>{formatINR(acc.balance)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Data Management Actions (no short instructions below headings) */}
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
              <Text style={styles.actionLabel}>Export JSON Data</Text>
            </View>
            <ChevronRight size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowBorder]}
            onPress={() => router.push('/security')}
          >
            <View style={styles.actionLeft}>
              <Cpu size={18} color={THEME.colors.primary} />
              <Text style={styles.actionLabel}>Model & Security Center</Text>
            </View>
            <ChevronRight size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowBorder]}
            onPress={handleReset}
          >
            <View style={styles.actionLeft}>
              <RotateCcw size={18} color={THEME.colors.danger} />
              <Text style={[styles.actionLabel, { color: THEME.colors.danger }]}>
                Reset Demo Data
              </Text>
            </View>
            <ChevronRight size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Quick Legal Links Row */}
        <View style={styles.legalLinksRow}>
          <TouchableOpacity onPress={() => openLegalDoc('privacy')}>
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLegalDoc('terms')}>
            <Text style={styles.legalLinkText}>Terms</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLegalDoc('refund')}>
            <Text style={styles.legalLinkText}>Refund Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLegalDoc('cookies')}>
            <Text style={styles.legalLinkText}>Cookie Policy</Text>
          </TouchableOpacity>
        </View>

        {resetFeedback && (
          <View style={styles.resetFeedbackBox}>
            <ShieldCheck size={16} color={THEME.colors.success} />
            <Text style={styles.resetFeedbackText}>
              Demo data reset successfully.
            </Text>
          </View>
        )}

        <View style={styles.aboutBox}>
          <Text style={styles.aboutTitle}>CashCompass</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
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
            <Text style={styles.modalTitle}>Data Snapshot</Text>

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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  profileName: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  signOutBtn: {
    backgroundColor: '#FDEDF0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signOutText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.danger,
  },
  sectionHeader: {
    marginTop: THEME.spacing.sm,
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
  statsRow: {
    flexDirection: 'row',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: THEME.typography.sizes.sm,
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
    paddingVertical: 12,
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
  legalLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: THEME.spacing.sm,
  },
  legalLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
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
    paddingVertical: THEME.spacing.md,
  },
  aboutTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  aboutVersion: {
    fontSize: 10,
    color: THEME.colors.primary,
    fontWeight: '600',
    marginTop: 2,
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
