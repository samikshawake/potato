import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, Calendar } from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { BillCollisionItem } from '../services/cashCompassIntelligence';

interface BillCollisionCardProps {
  collisions: BillCollisionItem[];
}

export const BillCollisionCard: React.FC<BillCollisionCardProps> = ({ collisions }) => {
  if (!collisions || collisions.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: '#E8F8F0' }]}>
            <Calendar size={18} color={THEME.colors.success} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.title}>Bill Collision Shield</Text>
            <Text style={styles.subtitle}>No overlapping bills detected in next 7-day windows</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.warningCard]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
          <AlertTriangle size={18} color="#EF4444" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.titleWarning}>Bill Collision Warning ({collisions.length})</Text>
          <Text style={styles.subtitleWarning}>Multiple known bills fall close together</Text>
        </View>
      </View>

      {collisions.map((item, idx) => (
        <View key={idx} style={styles.collisionItemBox}>
          <View style={styles.collisionMeta}>
            <Text style={styles.windowText}>
              Window: {item.windowStartDate} to {item.windowEndDate}
            </Text>
            <Text style={styles.lowestBalanceText}>
              Lowest Balance: <Text style={{ fontWeight: '800', color: '#EF4444' }}>{formatINR(item.lowestEstimatedBalance)}</Text>
            </Text>
          </View>

          <View style={styles.billsList}>
            {item.collidingBills.map((bill, bIdx) => (
              <View key={bIdx} style={styles.billRow}>
                <Text style={styles.billName}>• {bill.name} ({bill.dueDate})</Text>
                <Text style={styles.billAmount}>{formatINR(bill.amount)}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.adviceText}>{item.advice}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
    marginBottom: THEME.spacing.md,
  },
  warningCard: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  titleWarning: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: '#991B1B',
  },
  subtitleWarning: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  collisionItemBox: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  collisionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  windowText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  lowestBalanceText: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
  },
  billsList: {
    marginBottom: 8,
    gap: 4,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billName: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
  },
  billAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  adviceText: {
    fontSize: 11,
    color: '#7F1D1D',
    lineHeight: 15,
    marginTop: 4,
  },
});
