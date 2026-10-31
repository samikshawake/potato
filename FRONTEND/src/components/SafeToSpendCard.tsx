import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShieldCheck, Sliders, ChevronDown, ChevronUp } from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { SafeToSpendResult } from '../services/cashCompassIntelligence';

interface SafeToSpendCardProps {
  data: SafeToSpendResult;
  userReserve: number;
  onUpdateReserve: (newReserve: number) => void;
}

export const SafeToSpendCard: React.FC<SafeToSpendCardProps> = ({
  data,
  userReserve,
  onUpdateReserve,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <ShieldCheck size={20} color={THEME.colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Safe-to-Spend This Week</Text>
          <Text style={styles.subtitle}>After recurring bills & safety reserve</Text>
        </View>
      </View>

      <View style={styles.amountDisplayRow}>
        <Text style={styles.amountText}>{formatINR(data.safeToSpendAmount)}</Text>
        <Text style={styles.amountSubLabel}>Available for discretionary spend</Text>
      </View>

      {/* Reserve Adjuster */}
      <View style={styles.reserveSection}>
        <View style={styles.reserveHeader}>
          <Text style={styles.reserveLabel}>Safety Reserve Cushion: {formatINR(userReserve)}</Text>
          <View style={styles.reserveButtons}>
            <TouchableOpacity
              style={styles.reserveBtn}
              onPress={() => onUpdateReserve(Math.max(0, userReserve - 5000))}
            >
              <Text style={styles.reserveBtnText}>-₹5k</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reserveBtn}
              onPress={() => onUpdateReserve(userReserve + 5000)}
            >
              <Text style={styles.reserveBtnText}>+₹5k</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Breakdown Toggle */}
      <TouchableOpacity
        style={styles.breakdownToggle}
        onPress={() => setShowDetails(!showDetails)}
        activeOpacity={0.8}
      >
        <Text style={styles.breakdownToggleText}>
          {showDetails ? 'Hide calculation details' : 'Explain subtractions & breakdown'}
        </Text>
        {showDetails ? <ChevronUp size={16} color={THEME.colors.primary} /> : <ChevronDown size={16} color={THEME.colors.primary} />}
      </TouchableOpacity>

      {showDetails && (
        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailTitle}>Weekly Gross Inflow</Text>
            <Text style={styles.detailValue}>{formatINR(data.weeklyGross)}</Text>
          </View>
          {data.subtractions.map((sub, idx) => (
            <View key={idx} style={styles.subtractionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>- {sub.label}</Text>
                <Text style={styles.subDesc}>{sub.description}</Text>
              </View>
              <Text style={styles.subAmount}>-{formatINR(sub.amount)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <Text style={styles.calcNote}>
            Calculated as: (Weekly Inflow + Current Balance Buffer) - (Upcoming Bills + Reserve Floor).
          </Text>
        </View>
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
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
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  amountDisplayRow: {
    marginVertical: 14,
    alignItems: 'flex-start',
  },
  amountText: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  amountSubLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  reserveSection: {
    backgroundColor: '#F9F8FD',
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECEAF6',
  },
  reserveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reserveLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  reserveButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  reserveBtn: {
    backgroundColor: '#EAE5FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reserveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  breakdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  breakdownToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  detailsBox: {
    marginTop: 8,
    backgroundColor: '#F7F6FC',
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2DFF0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  subtractionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  subDesc: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  subAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2DFF0',
    marginVertical: 4,
  },
  calcNote: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
});
