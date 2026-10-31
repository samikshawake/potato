import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Laptop, Shield, Compass, Sparkles, Plus } from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { SavingsGoal } from '../types/finance';

interface Props {
  goal: SavingsGoal;
  onPressAddMoney?: () => void;
}

export const SavingsGoalCard: React.FC<Props> = ({ goal, onPressAddMoney }) => {
  const percentage = Math.min(
    100,
    Math.round((goal.currentAmount / goal.targetAmount) * 100)
  );

  const renderIcon = () => {
    switch (goal.icon) {
      case 'laptop':
        return <Laptop size={20} color={THEME.colors.primary} />;
      case 'shield':
        return <Shield size={20} color={THEME.colors.success} />;
      default:
        return <Compass size={20} color={THEME.colors.warning} />;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View style={styles.iconCircle}>{renderIcon()}</View>
          <View>
            <Text style={styles.title}>{goal.title}</Text>
            <Text style={styles.amountText}>
              {formatINR(goal.currentAmount)} of {formatINR(goal.targetAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.percentBadge}>
          <Text style={styles.percentText}>{percentage}%</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.targetDateText}>
          Target: {goal.deadlineDate} • +{formatINR(goal.monthlyContribution)}/mo
        </Text>
        {onPressAddMoney && (
          <TouchableOpacity
            style={styles.addMoneyBtn}
            onPress={onPressAddMoney}
            activeOpacity={0.7}
          >
            <Plus size={12} color={THEME.colors.primary} />
            <Text style={styles.addMoneyText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  amountText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  percentBadge: {
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#EBE4FD',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: THEME.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  targetDateText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  addMoneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
  },
  addMoneyText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});
