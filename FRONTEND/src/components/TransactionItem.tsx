import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Utensils,
  Home,
  ShoppingBag,
  Navigation,
  Zap,
  Film,
  Briefcase,
  TrendingUp,
  Activity,
  MoreHorizontal,
  ArrowLeftRight,
  Wallet,
  Tag,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { Transaction } from '../types/finance';
import { getCategoryMeta } from '../constants/categories';
import { useFinance } from '../context/FinanceContext';

interface Props {
  transaction: Transaction;
  onPress?: () => void;
}

export const TransactionItem: React.FC<Props> = ({ transaction, onPress }) => {
  const { customCategoryColors } = useFinance();
  const isIncome = transaction.type === 'INCOME';
  const isTransfer = transaction.type === 'TRANSFER';
  const meta = getCategoryMeta(transaction.category, customCategoryColors);

  const renderIcon = () => {
    const size = 18;
    if (isTransfer) {
      return <ArrowLeftRight size={size} color={THEME.colors.primary} />;
    }
    const color = meta.color;
    switch (transaction.category) {
      case 'Food':
        return <Utensils size={size} color={color} />;
      case 'Rent':
        return <Home size={size} color={color} />;
      case 'Shopping':
        return <ShoppingBag size={size} color={color} />;
      case 'Travel':
        return <Navigation size={size} color={color} />;
      case 'Bills':
        return <Zap size={size} color={color} />;
      case 'Entertainment':
        return <Film size={size} color={color} />;
      case 'Salary':
        return <Briefcase size={size} color={color} />;
      case 'Pocket Money':
        return <Wallet size={size} color={color} />;
      case 'Investments':
        return <TrendingUp size={size} color={color} />;
      case 'Healthcare':
        return <Activity size={size} color={color} />;
      case 'Other':
        return <MoreHorizontal size={size} color={color} />;
      default:
        return <Tag size={size} color={color} />;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftRow}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isTransfer
                ? THEME.colors.lavenderLight
                : `${meta.color}18`,
            },
          ]}
        >
          {renderIcon()}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {transaction.title}
          </Text>
          {transaction.upiTransactionId && (
            <Text style={styles.upiRefText} numberOfLines={1}>
              UPI Transaction ID: {transaction.upiTransactionId}
            </Text>
          )}
          <View style={styles.subRow}>
            <Text style={styles.categoryBadge}>
              {isTransfer ? 'Self Transfer' : transaction.category}
            </Text>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.dateText}>
              {transaction.date}
              {transaction.time ? ` ${transaction.time}` : ''}
            </Text>
            {transaction.paidByOrToLine ? (
              <>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bankSubText} numberOfLines={1}>
                  {transaction.paidByOrToLine}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.paymentMethod}>{transaction.paymentMethod}</Text>
              </>
            )}
          </View>
        </View>
      </View>

      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amount,
            isIncome
              ? styles.amountIncome
              : isTransfer
              ? styles.amountTransfer
              : styles.amountExpense,
          ]}
        >
          {isIncome
            ? `+${formatINR(transaction.amount)}`
            : isTransfer
            ? `⇄ ${formatINR(transaction.amount)}`
            : `−${formatINR(transaction.amount)}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.base,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadows.soft,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: THEME.spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: THEME.spacing.sm,
  },
  title: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  upiRefText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginBottom: 2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  bullet: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginHorizontal: 4,
  },
  dateText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  bankSubText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  paymentMethod: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.primary,
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '800',
  },
  amountIncome: {
    color: THEME.colors.success,
  },
  amountTransfer: {
    color: THEME.colors.primary,
  },
  amountExpense: {
    color: THEME.colors.textPrimary,
  },
});
