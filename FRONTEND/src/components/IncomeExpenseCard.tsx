import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';

interface Props {
  income: number;
  expenses: number;
  dateRangeLabel?: string;
}

export const IncomeExpenseCard: React.FC<Props> = ({
  income,
  expenses,
  dateRangeLabel = 'October 2026',
}) => {
  return (
    <View style={styles.container}>
      {/* Total Income Card */}
      <View style={[styles.card, styles.incomeCard]}>
        <View style={styles.topRow}>
          <View style={[styles.iconCircle, { backgroundColor: '#E8F8F0' }]}>
            <ArrowDownLeft size={16} color={THEME.colors.success} />
          </View>
          <View style={styles.trendBadge}>
            <Text style={styles.incomeTrendText}>+8.4%</Text>
          </View>
        </View>
        <Text style={styles.label}>Total Income</Text>
        <Text style={styles.amount}>{formatINR(income)}</Text>
        <Text style={styles.dateLabel}>{dateRangeLabel}</Text>
      </View>

      {/* Total Expenses Card */}
      <View style={[styles.card, styles.expenseCard]}>
        <View style={styles.topRow}>
          <View style={[styles.iconCircle, { backgroundColor: '#FDEDF0' }]}>
            <ArrowUpRight size={16} color={THEME.colors.danger} />
          </View>
          <View style={styles.trendBadgeExpense}>
            <Text style={styles.expenseTrendText}>-4.1%</Text>
          </View>
        </View>
        <Text style={styles.label}>Total Expenses</Text>
        <Text style={styles.amount}>{formatINR(expenses)}</Text>
        <Text style={styles.dateLabel}>{dateRangeLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.success,
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.danger,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.full,
  },
  incomeTrendText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  trendBadgeExpense: {
    backgroundColor: '#FDEDF0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.full,
  },
  expenseTrendText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.danger,
  },
  label: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 2,
  },
  amount: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  dateLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
});
