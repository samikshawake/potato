import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { BankAccount } from '../types/finance';

interface Props {
  balance: number;
  accounts?: BankAccount[];
  activeTab: 'Overview' | 'Transactions' | 'Goals';
  onTabChange: (tab: 'Overview' | 'Transactions' | 'Goals') => void;
  onPressCard?: () => void;
}

export const BalanceCard: React.FC<Props> = ({
  balance,
  activeTab,
  onTabChange,
}) => {
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.balanceBox}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <TouchableOpacity
            onPress={() => setIsBalanceHidden(!isBalanceHidden)}
            style={styles.eyeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={isBalanceHidden ? 'Show total balance' : 'Hide total balance'}
          >
            {isBalanceHidden ? (
              <EyeOff size={16} color={THEME.colors.textSecondary} />
            ) : (
              <Eye size={16} color={THEME.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.balanceAmount,
            balance < 0 && { color: THEME.colors.danger },
          ]}
        >
          {isBalanceHidden
            ? '₹••••••••'
            : balance < 0
            ? `−${formatINR(Math.abs(balance), true)}`
            : formatINR(balance, true)}
        </Text>
      </View>

      {/* Filter Tabs (Overview / Transactions / Goals) */}
      <View style={styles.tabContainer}>
        {(['Overview', 'Transactions', 'Goals'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => onTabChange(tab)}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
  },
  balanceBox: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  eyeButton: {
    padding: 4,
  },
  balanceAmount: {
    fontSize: THEME.typography.sizes.xxxl,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.lavenderLight,
    padding: 4,
    borderRadius: THEME.borderRadius.full,
    marginTop: THEME.spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: THEME.colors.primary,
    ...THEME.shadows.soft,
  },
  tabText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  activeTabText: {
    color: THEME.colors.textWhite,
  },
});
