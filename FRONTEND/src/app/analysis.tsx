import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Database,
  CheckCircle2,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { analyzeMultiMonthDiagnostics } from '../services/simulator';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';

export default function AnalysisScreen() {
  const router = useRouter();
  const {
    totalIncome,
    totalExpenses,
    totalBalance,
    totalRecurringMonthly,
    forecast,
    transactions,
  } = useFinance();

  const diag = React.useMemo(
    () => analyzeMultiMonthDiagnostics(transactions, totalBalance, 15000),
    [transactions, totalBalance]
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

  const variableLivingCost = Math.max(0, totalExpenses - totalRecurringMonthly);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/simulator')}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Financial Analysis</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Data Coverage Badge */}
        <View style={styles.coverageCard}>
          <View style={styles.coverageTop}>
            <Database size={18} color={THEME.colors.primary} />
            <Text style={styles.coverageBadgeText}>
              {diag.hasThreeMonthsCoverage
                ? `Data Coverage: ${diag.distinctMonths.length} Months`
                : `Limited Data (${diag.distinctMonths.length} Month)`}
            </Text>
          </View>
        </View>

        {/* Holdout Forecast Backtest Track Record */}
        {diag.holdoutBacktest && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <CheckCircle2 size={16} color={THEME.colors.success} />
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                Forecast Accuracy ({diag.holdoutBacktest.monthLabel})
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Projected Balance</Text>
              <Text style={styles.metricValue}>
                {formatINR(diag.holdoutBacktest.predictedEndBalance)}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Actual Balance</Text>
              <Text style={[styles.metricValue, { color: THEME.colors.primary }]}>
                {formatINR(diag.holdoutBacktest.actualEndBalance)}
              </Text>
            </View>
            <View style={[styles.metricRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Accuracy</Text>
              <Text style={[styles.totalValue, { color: THEME.colors.success }]}>
                {diag.holdoutBacktest.accuracyPct}%
              </Text>
            </View>
          </View>
        )}

        {/* Monthly Cash Flow Composition */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Cash Flow</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total Income</Text>
            <Text style={[styles.metricValue, { color: THEME.colors.success }]}>
              +{formatINR(totalIncome)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Recurring Commitments</Text>
            <Text style={[styles.metricValue, { color: THEME.colors.danger }]}>
              −{formatINR(totalRecurringMonthly)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Variable Spending</Text>
            <Text style={[styles.metricValue, { color: THEME.colors.danger }]}>
              −{formatINR(variableLivingCost)}
            </Text>
          </View>

          <View style={[styles.metricRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Balance</Text>
            <Text style={styles.totalValue}>
              {formatINR(totalBalance)}
            </Text>
          </View>
        </View>

        {/* Burn Rate & Runway Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Runway & Burn Rate</Text>

          <View style={styles.runwayGrid}>
            <View style={styles.runwayBox}>
              <Text style={styles.runwayLabel}>Monthly Burn Rate</Text>
              <Text style={styles.runwayValue}>{forecast.burnRatePercentage}%</Text>
            </View>

            <View style={styles.runwayBox}>
              <Text style={styles.runwayLabel}>Available Pool</Text>
              <Text style={styles.runwayValue}>
                {formatINR(Math.max(0, totalBalance - 15000))}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="simulator" onSelectTab={handleNavChange} />
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
  coverageCard: {
    backgroundColor: THEME.colors.lavenderLight,
    padding: THEME.spacing.base,
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#E2D9F3',
  },
  coverageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coverageBadgeText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  cardTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metricLabel: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
  },
  metricValue: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  totalLabel: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  totalValue: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  runwayGrid: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  runwayBox: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    alignItems: 'center',
  },
  runwayLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  runwayValue: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 4,
  },
});
