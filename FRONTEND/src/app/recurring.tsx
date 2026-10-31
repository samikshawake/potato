import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Repeat,
  Info,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { RecurringPaymentCard } from '../components/RecurringPaymentCard';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';

export default function RecurringScreen() {
  const router = useRouter();
  const { recurring, totalRecurringMonthly } = useFinance();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'UPCOMING'>('ACTIVE');

  const filtered = recurring.filter((item) =>
    activeTab === 'ACTIVE' ? item.status === 'ACTIVE' : true
  );

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
        <Text style={styles.headerTitle}>Recurring Commitments</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Total Monthly Summary Banner */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Repeat size={24} color={THEME.colors.primary} />
          </View>
          <Text style={styles.summaryLabel}>Total Monthly Recurring</Text>
          <Text style={styles.summaryAmount}>{formatINR(totalRecurringMonthly)}</Text>
          <Text style={styles.summarySub}>
            Estimated automatically across {recurring.length} recurring schedules
          </Text>
        </View>

        {/* Disclaimer Card */}
        <View style={styles.disclaimerBox}>
          <Info size={16} color={THEME.colors.primary} />
          <Text style={styles.disclaimerText}>
            Recurring payments are estimated from your transaction history. Unconfirmed until validated by you.
          </Text>
        </View>

        {/* Working Tabs: Active vs Upcoming */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ACTIVE')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'ACTIVE' && styles.tabTextActive,
              ]}
            >
              Active Subscriptions ({recurring.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'UPCOMING' && styles.tabBtnActive]}
            onPress={() => setActiveTab('UPCOMING')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'UPCOMING' && styles.tabTextActive,
              ]}
            >
              Upcoming Due Dates
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cards List */}
        {filtered.map((item) => (
          <RecurringPaymentCard key={item.id} payment={item} />
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="insights" onSelectTab={handleNavChange} />
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
  summaryCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
    marginBottom: THEME.spacing.md,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: THEME.typography.sizes.xxl,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginVertical: 4,
  },
  summarySub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.lavenderLight,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
  },
  disclaimerText: {
    fontSize: 11,
    color: THEME.colors.primary,
    flex: 1,
    lineHeight: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  tabBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
});
