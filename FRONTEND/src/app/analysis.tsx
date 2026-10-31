import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Database,
  Info,
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
        <Text style={styles.headerTitle}>Financial Analysis & Limits</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Data Quality & Coverage Badge */}
        <View style={styles.coverageCard}>
          <View style={styles.coverageTop}>
            <Database size={18} color={THEME.colors.primary} />
            <Text style={styles.coverageBadgeText}>
              {diag.hasThreeMonthsCoverage
                ? `High Data Coverage (${diag.distinctMonths.length} Months Verified)`
                : `Limited Data (${diag.distinctMonths.length} Month — <3 Months Guardrail Active)`}
            </Text>
          </View>
          <Text style={styles.coverageDescription}>
            Calculated across {transactions.length} multi-account transactions. Expected Income Range (P15–P85):{' '}
            {formatINR(diag.incomeP15)} – {formatINR(diag.incomeP85)}.
            {diag.excludedBonusNote ? ` ${diag.excludedBonusNote}` : ''}
          </Text>
        </View>

        {/* Holdout Forecast Backtest Track Record (Extra Point #2) */}
        {diag.holdoutBacktest && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <CheckCircle2 size={16} color={THEME.colors.success} />
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                Forecast Track Record ({diag.holdoutBacktest.monthLabel} Holdout Check)
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Prior-Months Forecasted Ending Balance</Text>
              <Text style={styles.metricValue}>
                {formatINR(diag.holdoutBacktest.predictedEndBalance)}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Actual Recorded Ending Balance</Text>
              <Text style={[styles.metricValue, { color: THEME.colors.primary }]}>
                {formatINR(diag.holdoutBacktest.actualEndBalance)}
              </Text>
            </View>
            <View style={[styles.metricRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Forecast Accuracy Score</Text>
              <Text style={[styles.totalValue, { color: THEME.colors.success }]}>
                {diag.holdoutBacktest.accuracyPct}% (±{formatINR(diag.holdoutBacktest.errorAmount)})
              </Text>
            </View>
          </View>
        )}

        {/* Mathematical Composition Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Cash Flow Composition</Text>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Baseline Monthly Income</Text>
            <Text style={[styles.metricValue, { color: THEME.colors.success }]}>
              +{formatINR(totalIncome)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Committed Recurring Outflow</Text>
            <Text style={[styles.metricValue, { color: THEME.colors.danger }]}>
              −{formatINR(totalRecurringMonthly)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Variable Discretionary Living</Text>
            <Text style={[styles.metricValue, { color: THEME.colors.danger }]}>
              −{formatINR(variableLivingCost)}
            </Text>
          </View>

          <View style={[styles.metricRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Projected Net Monthly Surplus</Text>
            <Text style={styles.totalValue}>
              +{formatINR(totalIncome - totalExpenses)}
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
              <Text style={styles.runwaySub}>Of recorded income</Text>
            </View>

            <View style={styles.runwayBox}>
              <Text style={styles.runwayLabel}>Discretionary Pool</Text>
              <Text style={styles.runwayValue}>
                {formatINR(Math.max(0, totalBalance - 15000))}
              </Text>
              <Text style={styles.runwaySub}>Above ₹15k reserve</Text>
            </View>
          </View>
        </View>

        {/* Explicit Model Limitations & Assumptions */}
        <View style={styles.limitationsCard}>
          <View style={styles.limitationHeader}>
            <Info size={16} color="#B45309" />
            <Text style={styles.limitationTitle}>Model Limitations & Assumptions</Text>
          </View>

          <View style={styles.limitationList}>
            <Text style={styles.limitationItem}>
              1. <Text style={{ fontWeight: '700' }}>Steady Income Assumption:</Text> Forecasts assume payroll deposits recur on predictable monthly cycles.
            </Text>
            <Text style={styles.limitationItem}>
              2. <Text style={{ fontWeight: '700' }}>Unbilled Charges:</Text> Offline forecasting does not inspect pending credit card merchant settlements.
            </Text>
            <Text style={styles.limitationItem}>
              3. <Text style={{ fontWeight: '700' }}>Inflation Invariance:</Text> Simulations assume constant product pricing over multi-month horizons.
            </Text>
            <Text style={styles.limitationItem}>
              4. <Text style={{ fontWeight: '700' }}>100% Privacy Boundary:</Text> Data is neither trained on external models nor shared beyond your physical device.
            </Text>
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
    marginBottom: 4,
  },
  coverageBadgeText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  coverageDescription: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
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
    marginVertical: 4,
  },
  runwaySub: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
  limitationsCard: {
    backgroundColor: '#FEF6EC',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  limitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: THEME.spacing.sm,
  },
  limitationTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: '#92400E',
  },
  limitationList: {
    gap: 8,
  },
  limitationItem: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
});
