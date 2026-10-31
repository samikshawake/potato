import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Lightbulb, ChevronRight, AlertTriangle, ArrowUpRight } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { FinancialInsight } from '../types/finance';

interface Props {
  insight: FinancialInsight;
  onPressShowAll?: () => void;
  onPressAction?: () => void;
}

export const InsightCard: React.FC<Props> = ({
  insight,
  onPressShowAll,
  onPressAction,
}) => {
  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.sparkleCircle}>
            <Sparkles size={16} color={THEME.colors.primary} />
          </View>
          <Text style={styles.headerTitle}>AI Insights</Text>
        </View>

        {onPressShowAll && (
          <TouchableOpacity
            style={styles.showAllButton}
            onPress={onPressShowAll}
            activeOpacity={0.7}
          >
            <Text style={styles.showAllText}>Show all</Text>
            <ChevronRight size={14} color={THEME.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Insight Bubble */}
      <TouchableOpacity
        style={styles.insightBubble}
        onPress={onPressAction}
        activeOpacity={0.85}
      >
        <View style={styles.bulbCircle}>
          <Lightbulb size={18} color="#F59E0B" />
        </View>
        <View style={styles.textContent}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightDescription}>{insight.description}</Text>
          <View style={styles.explainBadge}>
            <Text style={styles.explainText}>
              Used: {insight.dataPointsUsed.join(' • ')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EEF2FF',
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.base,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...THEME.shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  showAllText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  insightBubble: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    flexDirection: 'row',
    gap: THEME.spacing.md,
    alignItems: 'flex-start',
  },
  bulbCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  explainBadge: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  explainText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
});
