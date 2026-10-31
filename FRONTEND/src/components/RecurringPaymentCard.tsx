import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, CheckCircle2, Clock, Repeat } from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { RecurringPayment } from '../types/finance';

interface Props {
  payment: RecurringPayment;
}

export const RecurringPaymentCard: React.FC<Props> = ({ payment }) => {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View style={styles.repeatBadge}>
            <Repeat size={14} color={THEME.colors.primary} />
          </View>
          <View>
            <Text style={styles.name}>{payment.name}</Text>
            <Text style={styles.category}>{payment.category} • {payment.frequency.toLowerCase()}</Text>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amount}>{formatINR(payment.amount)}</Text>
          <Text style={styles.perMonth}>/month</Text>
        </View>
      </View>

      <View style={styles.datesRow}>
        <View style={styles.dateItem}>
          <Clock size={12} color={THEME.colors.textMuted} />
          <Text style={styles.dateLabel}>Last: {payment.lastPaymentDate}</Text>
        </View>

        <View style={styles.dateItem}>
          <Calendar size={12} color={THEME.colors.primary} />
          <Text style={styles.nextDateLabel}>Next: {payment.nextExpectedDate}</Text>
        </View>
      </View>

      {payment.isAutoDebit && (
        <View style={styles.autoDebitTag}>
          <CheckCircle2 size={12} color={THEME.colors.success} />
          <Text style={styles.autoDebitText}>Auto-Debit Configured</Text>
        </View>
      )}
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
  repeatBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  category: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  perMonth: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  nextDateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  autoDebitTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
    alignSelf: 'flex-start',
  },
  autoDebitText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.success,
  },
});
