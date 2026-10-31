import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Eye, EyeOff, CreditCard, ChevronRight, Settings } from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { BankAccount } from '../types/finance';

interface Props {
  balance: number;
  accounts: BankAccount[];
  activeTab: 'Overview' | 'Transactions' | 'Goals';
  onTabChange: (tab: 'Overview' | 'Transactions' | 'Goals') => void;
  onPressCard?: () => void;
}

export const BalanceCard: React.FC<Props> = ({
  balance,
  accounts,
  activeTab,
  onTabChange,
  onPressCard,
}) => {
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const primaryAccount = accounts[0] || {
    bankName: 'HDFC Bank',
    accountNumberMasked: '•••• 4312',
    name: 'Primary Salary',
  };

  return (
    <View style={styles.container}>
      {/* Top Balance Header */}
      <View style={styles.balanceHeader}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <TouchableOpacity
          onPress={() => setIsBalanceHidden(!isBalanceHidden)}
          style={styles.eyeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isBalanceHidden ? (
            <EyeOff size={16} color={THEME.colors.textSecondary} />
          ) : (
            <Eye size={16} color={THEME.colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Balance Amount */}
      <Text style={styles.balanceAmount}>
        {isBalanceHidden ? '₹••••••••' : formatINR(balance, true)}
      </Text>

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

      {/* Bank Card / Account Selector (matching reference image Chase card) */}
      <TouchableOpacity
        style={styles.bankCard}
        onPress={onPressCard}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.bankIdentity}>
            <View style={styles.bankIconCircle}>
              <CreditCard size={16} color={THEME.colors.primary} />
            </View>
            <View>
              <Text style={styles.bankName}>{primaryAccount.bankName}</Text>
              <Text style={styles.accountType}>{primaryAccount.name}</Text>
            </View>
          </View>
          <Settings size={16} color={THEME.colors.textMuted} />
        </View>

        <View style={styles.cardNumberRow}>
          <Text style={styles.cardNumberText}>
            {primaryAccount.accountNumberMasked}
          </Text>
          <View style={styles.cardChip}>
            <View style={styles.chipLine} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 2,
  },
  balanceAmount: {
    fontSize: THEME.typography.sizes.xxxl,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.lavenderLight,
    padding: 4,
    borderRadius: THEME.borderRadius.full,
    marginVertical: THEME.spacing.md,
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
  bankCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  bankIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  accountType: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
  },
  cardNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  cardNumberText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    letterSpacing: 2,
  },
  cardChip: {
    width: 28,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E4DFD3',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipLine: {
    height: 1,
    backgroundColor: '#C5BCAE',
  },
});
