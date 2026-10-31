import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import {
  ShieldCheck,
  TrendingUp,
  PiggyBank,
  PieChart,
  ChevronDown,
  ChevronUp,
  Edit3,
  RotateCcw,
  Check,
  AlertCircle,
  Sliders,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { calculateCompartmentsState } from '../services/compartmentsEngine';

interface FinancialAllocationCompartmentsProps {
  compartments?: any;
  onUpdateEmergencyTarget?: (months: 3 | 6 | 12) => void;
  onNavigateInvestments?: () => void;
  onNavigateSavings?: () => void;
}

export const FinancialAllocationCompartments: React.FC<FinancialAllocationCompartmentsProps> = ({
  compartments: propsCompartments,
  onNavigateInvestments,
  onNavigateSavings,
}) => {
  const { transactions, goals, totalBalance } = useFinance();

  const [targetMonths, setTargetMonths] = useState<3 | 6 | 12>(6);
  const [showAdjustControls, setShowAdjustControls] = useState(false);

  // Default calculated compartments state from engine
  const autoState = propsCompartments || calculateCompartmentsState(transactions, goals, totalBalance, {
    emergencyTargetMonths: targetMonths,
  });

  const currentTotalCash = totalBalance || autoState.totalAvailableCash || 0;
  const emergencyAlloc = autoState.reservedForEmergency;
  const investmentAlloc = autoState.allocatedToInvestments;
  const savingsAlloc = autoState.reservedForSavings;

  const unallocatedCash = Math.max(0, currentTotalCash - (emergencyAlloc + investmentAlloc + savingsAlloc));

  // Recalculate progress percentages
  const emergencyTarget = autoState.emergencyTargetAmount || 150000;
  const emergencyPct = autoState.emergencyProgressPct;

  const savingsTarget = autoState.savingsTarget || 50000;
  const savingsPct = autoState.savingsProgressPct;

  return (
    <View style={styles.container}>
      {/* Header with Title and Adjust Controls Toggle */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <PieChart size={18} color={THEME.colors.primary} />
          <Text style={styles.headerTitle}>Financial Allocation</Text>
        </View>

        <TouchableOpacity
          style={styles.adjustToggleBtn}
          onPress={() => setShowAdjustControls((v) => !v)}
        >
          <Sliders size={12} color={THEME.colors.primary} />
          <Text style={styles.adjustToggleText}>
            {showAdjustControls ? 'Hide Strategy' : 'Adjust Strategy'}
          </Text>
          {showAdjustControls ? (
            <ChevronUp size={14} color={THEME.colors.primary} />
          ) : (
            <ChevronDown size={14} color={THEME.colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Adjust Strategy Controls (Target months/investment) */}
      {showAdjustControls && (
        <View style={styles.adjustCard}>
          <Text style={styles.adjustCardTitle}>Emergency Coverage Target:</Text>
          <View style={styles.targetMonthsRow}>
            {([3, 6, 12] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.monthPill, targetMonths === m && styles.monthPillActive]}
                onPress={() => setTargetMonths(m)}
              >
                <Text style={[styles.monthPillText, targetMonths === m && styles.monthPillTextActive]}>
                  {m} Months
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Visual Distribution Bar */}
      <View style={styles.distributionCard}>
        <View style={styles.distributionTopRow}>
          <Text style={styles.totalCashText}>
            Total Cash: <Text style={{ fontWeight: '800', color: THEME.colors.textPrimary }}>{formatINR(currentTotalCash)}</Text>
          </Text>
          <Text style={styles.unallocatedHighlight}>
            Unallocated: <Text style={{ fontWeight: '800', color: unallocatedCash > 0 ? THEME.colors.primary : THEME.colors.textMuted }}>{formatINR(unallocatedCash)}</Text>
          </Text>
        </View>

        <View style={styles.distributionBar}>
          {emergencyAlloc > 0 && (
            <View style={[styles.distSegment, { flex: emergencyAlloc, backgroundColor: '#37B879' }]} />
          )}
          {investmentAlloc > 0 && (
            <View style={[styles.distSegment, { flex: investmentAlloc, backgroundColor: THEME.colors.primary }]} />
          )}
          {savingsAlloc > 0 && (
            <View style={[styles.distSegment, { flex: savingsAlloc, backgroundColor: '#F4A340' }]} />
          )}
          {unallocatedCash > 0 && (
            <View style={[styles.distSegment, { flex: unallocatedCash, backgroundColor: '#E2E8F0' }]} />
          )}
        </View>

        <View style={styles.legendGrid}>
          <View style={styles.legendCol}>
            <View style={[styles.dot, { backgroundColor: '#37B879' }]} />
            <Text style={styles.legendText}>Emergency: {formatINR(emergencyAlloc)}</Text>
          </View>
          <View style={styles.legendCol}>
            <View style={[styles.dot, { backgroundColor: THEME.colors.primary }]} />
            <Text style={styles.legendText}>Investments: {formatINR(investmentAlloc)}</Text>
          </View>
          <View style={styles.legendCol}>
            <View style={[styles.dot, { backgroundColor: '#F4A340' }]} />
            <Text style={styles.legendText}>Savings: {formatINR(savingsAlloc)}</Text>
          </View>
        </View>
      </View>

      {/* 3 INDIVIDUAL COLUMN / COMPARTMENT CARDS */}
      <View style={styles.compartmentsGrid}>
        {/* COLUMN 1: EMERGENCY FUND */}
        <View style={styles.compartmentCard}>
          <View style={styles.compHeader}>
            <View style={[styles.compIconCircle, { backgroundColor: '#E8F8F0' }]}>
              <ShieldCheck size={16} color="#047857" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.compTitle}>Emergency Fund</Text>
              <Text style={styles.compSub}>
                {Math.round((emergencyAlloc / Math.max(1, autoState.monthlyEssentialExpenses || 25000)) * 10) / 10} / {targetMonths} Months
              </Text>
            </View>
          </View>

          <Text style={styles.compVal}>{formatINR(emergencyAlloc)}</Text>

          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${emergencyPct}%`, backgroundColor: '#37B879' }]} />
          </View>

          <View style={styles.compFooterRow}>
            <Text style={styles.compFooterText}>
              Target: {formatINR(emergencyTarget)} ({targetMonths} mo)
            </Text>
            <Text style={[styles.compFooterText, { fontWeight: '700', color: '#047857' }]}>
              {emergencyPct}% Funded
            </Text>
          </View>
        </View>

        {/* COLUMN 2: INVESTMENT */}
        <View style={styles.compartmentCard}>
          <View style={styles.compHeader}>
            <View style={[styles.compIconCircle, { backgroundColor: THEME.colors.lavenderLight }]}>
              <TrendingUp size={16} color={THEME.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.compTitle}>Investments</Text>
              <Text style={styles.compSub}>Growth Allocation</Text>
            </View>
          </View>

          <Text style={styles.compVal}>{formatINR(investmentAlloc)}</Text>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, Math.round((investmentAlloc / Math.max(1, currentTotalCash)) * 100))}%`,
                  backgroundColor: THEME.colors.primary,
                },
              ]}
            />
          </View>

          <View style={styles.compFooterRow}>
            <Text style={styles.compFooterText}>
              Low-Risk: {formatINR(Math.round(investmentAlloc * 0.3))} • High-Risk: {formatINR(Math.round(investmentAlloc * 0.7))}
            </Text>
          </View>
        </View>

        {/* COLUMN 3: SAVINGS */}
        <View style={styles.compartmentCard}>
          <View style={styles.compHeader}>
            <View style={[styles.compIconCircle, { backgroundColor: '#FEF6EC' }]}>
              <PiggyBank size={16} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.compTitle}>Savings Goals</Text>
              <Text style={styles.compSub}>Reserved for Targets</Text>
            </View>
          </View>

          <Text style={styles.compVal}>{formatINR(savingsAlloc)}</Text>

          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${savingsPct}%`, backgroundColor: '#F4A340' }]} />
          </View>

          <View style={styles.compFooterRow}>
            <Text style={styles.compFooterText}>
              Target: {formatINR(savingsTarget)} • {savingsPct}% Achieved
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  adjustToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adjustToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  adjustCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.primaryLight,
  },
  adjustCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginBottom: 8,
  },
  targetMonthsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  monthPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  monthPillActive: {
    backgroundColor: THEME.colors.lavenderLight,
    borderColor: THEME.colors.primary,
  },
  monthPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  monthPillTextActive: {
    color: THEME.colors.primary,
  },
  distributionCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  distributionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalCashText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  unallocatedHighlight: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  distributionBar: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  distSegment: {
    height: '100%',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  compartmentsGrid: {
    gap: 10,
  },
  compartmentCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  compHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  compIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  compSub: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
  compVal: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
  },
  compFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compFooterText: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
});
