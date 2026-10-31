import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Shield,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { PurchaseScenarioResult } from '../types/finance';

interface Props {
  scenario: PurchaseScenarioResult;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const PurchaseScenarioCard: React.FC<Props> = ({
  scenario,
  isSelected = false,
  onSelect,
}) => {
  const [showCalculation, setShowCalculation] = useState(false);

  const getStatusBadge = () => {
    switch (scenario.status) {
      case 'SAFE':
        return {
          icon: <CheckCircle2 size={16} color={THEME.colors.success} />,
          bg: '#E8F8F0',
          textColor: THEME.colors.success,
          label: 'Safe to Buy',
        };
      case 'CAUTION':
        return {
          icon: <AlertTriangle size={16} color={THEME.colors.warning} />,
          bg: '#FEF6EC',
          textColor: THEME.colors.warning,
          label: 'Caution / Tight',
        };
      case 'RISKY':
        return {
          icon: <XCircle size={16} color={THEME.colors.danger} />,
          bg: '#FDEDF0',
          textColor: THEME.colors.danger,
          label: 'Depletes Reserve',
        };
    }
  };

  const statusMeta = getStatusBadge();

  return (
    <View
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        { borderLeftColor: statusMeta.textColor, borderLeftWidth: 4 },
      ]}
    >
      <TouchableOpacity
        onPress={onSelect}
        activeOpacity={0.8}
        style={styles.cardHeader}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.scenarioTitle}>{scenario.scenarioTitle}</Text>
          <Text style={styles.verdictText}>{scenario.verdict}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
          {statusMeta.icon}
          <Text style={[styles.statusLabel, { color: statusMeta.textColor }]}>
            {statusMeta.label}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Main Numbers: Remaining Balance & Reserve Buffer */}
      <View style={styles.numbersGrid}>
        <View style={styles.numberBox}>
          <Text style={styles.numberLabel}>Estimated Remaining</Text>
          <Text
            style={[
              styles.numberValue,
              { color: scenario.estimatedRemainingBalance < scenario.configuredReserveFloor ? THEME.colors.danger : THEME.colors.textPrimary },
            ]}
          >
            {formatINR(scenario.estimatedRemainingBalance)}
          </Text>
        </View>

        <View style={styles.numberBox}>
          <Text style={styles.numberLabel}>Buffer Above Floor</Text>
          <Text
            style={[
              styles.numberValue,
              { color: scenario.netBufferAboveReserve >= 0 ? THEME.colors.success : THEME.colors.danger },
            ]}
          >
            {scenario.netBufferAboveReserve >= 0 ? '+' : ''}
            {formatINR(scenario.netBufferAboveReserve)}
          </Text>
        </View>
      </View>

      <Text style={styles.explanationText}>{scenario.explanation}</Text>

      {/* "How did we calculate this?" Collapsible Accordion */}
      <TouchableOpacity
        style={styles.accordionToggle}
        onPress={() => setShowCalculation(!showCalculation)}
        activeOpacity={0.7}
      >
        <View style={styles.accordionToggleLeft}>
          <HelpCircle size={14} color={THEME.colors.primary} />
          <Text style={styles.accordionToggleText}>How did we calculate this?</Text>
        </View>
        {showCalculation ? (
          <ChevronUp size={16} color={THEME.colors.primary} />
        ) : (
          <ChevronDown size={16} color={THEME.colors.primary} />
        )}
      </TouchableOpacity>

      {showCalculation && (
        <View style={styles.breakdownContainer}>
          <View style={styles.breakdownRow}>
            <Text style={styles.mathLabel}>Starting Balance</Text>
            <Text style={styles.mathValue}>{formatINR(scenario.startingBalance)}</Text>
          </View>
          {scenario.projectedIncome > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.mathLabel}>Expected Income</Text>
              <Text style={[styles.mathValue, { color: THEME.colors.success }]}>
                +{formatINR(scenario.projectedIncome)}
              </Text>
            </View>
          )}
          {scenario.projectedRecurring > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.mathLabel}>Committed Recurring</Text>
              <Text style={[styles.mathValue, { color: THEME.colors.danger }]}>
                −{formatINR(scenario.projectedRecurring)}
              </Text>
            </View>
          )}
          {scenario.projectedVariable > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.mathLabel}>Estimated Living Expenses</Text>
              <Text style={[styles.mathValue, { color: THEME.colors.danger }]}>
                −{formatINR(scenario.projectedVariable)}
              </Text>
            </View>
          )}
          <View style={styles.breakdownRow}>
            <Text style={styles.mathLabel}>Purchase Cost</Text>
            <Text style={[styles.mathValue, { color: THEME.colors.danger, fontWeight: '700' }]}>
              −{formatINR(scenario.purchaseAmount)}
            </Text>
          </View>

          <View style={[styles.breakdownRow, styles.finalMathRow]}>
            <Text style={styles.finalMathLabel}>Estimated Ending Balance</Text>
            <Text style={styles.finalMathValue}>
              {formatINR(scenario.estimatedRemainingBalance)}
            </Text>
          </View>

          <View style={styles.reserveNoteRow}>
            <Shield size={12} color={THEME.colors.textMuted} />
            <Text style={styles.reserveNoteText}>
              Safety Reserve Floor: {formatINR(scenario.configuredReserveFloor)} (Protected)
            </Text>
          </View>

          <View style={styles.uncertaintyBox}>
            <Text style={styles.uncertaintyTitle}>Assumptions & Confidence:</Text>
            {scenario.uncertaintyNotes.map((note, idx) => (
              <Text key={idx} style={styles.uncertaintyItem}>
                • {note}
              </Text>
            ))}
          </View>
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
  cardSelected: {
    borderColor: THEME.colors.primary,
    ...THEME.shadows.hover,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  headerLeft: {
    flex: 1,
    paddingRight: THEME.spacing.sm,
  },
  scenarioTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  verdictText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  numbersGrid: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginVertical: THEME.spacing.sm,
  },
  numberBox: {
    flex: 1,
  },
  numberLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  numberValue: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '800',
  },
  explanationText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginVertical: 4,
  },
  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.sm,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  accordionToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accordionToggleText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  breakdownContainer: {
    backgroundColor: '#FAF9FE',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginTop: 4,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  mathLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  mathValue: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  finalMathRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  finalMathLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  finalMathValue: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  reserveNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  reserveNoteText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  uncertaintyBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  uncertaintyTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 2,
  },
  uncertaintyItem: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    lineHeight: 14,
  },
});
