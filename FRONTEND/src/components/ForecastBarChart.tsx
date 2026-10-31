import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trophy, TrendingUp, ChevronRight, ShieldAlert, Sparkles } from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { CashFlowForecast } from '../types/finance';
import { MascotAvatar } from './MascotAvatar';

interface Props {
  forecast: CashFlowForecast;
  onPressForecastDetail?: () => void;
}

export const ForecastBarChart: React.FC<Props> = ({
  forecast,
  onPressForecastDetail,
}) => {
  const [activeTab, setActiveTab] = useState<'Growth' | 'Income' | 'Outcome'>('Growth');

  const maxVal = Math.max(...forecast.weeklyTrend.map((d) => d.projectedExpense), 200);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithBadge}>
          <Text style={styles.title}>AI Forecast</Text>
          <TouchableOpacity
            style={styles.zoneBadge}
            onPress={onPressForecastDetail}
            activeOpacity={0.7}
          >
            <Text style={styles.zoneText}>Safe Zone</Text>
            <ChevronRight size={12} color={THEME.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Pill Tabs: Growth / Income / Outcome */}
      <View style={styles.tabContainer}>
        {(['Growth', 'Income', 'Outcome'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
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

      {/* Bar Chart Area with Mascot leaning */}
      <View style={styles.chartWrapper}>
        {/* Left Side: Bars */}
        <View style={styles.barsContainer}>
          {forecast.weeklyTrend.map((item) => {
            const heightPercent = Math.round((item.projectedExpense / maxVal) * 120);
            const isPeak = item.isPeakDay;

            return (
              <View key={item.day} style={styles.barColumn}>
                {isPeak && (
                  <View style={styles.peakTooltip}>
                    <Text style={styles.peakTooltipText}>
                      ₹{item.projectedExpense * 10}
                    </Text>
                  </View>
                )}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: heightPercent },
                      isPeak ? styles.barPeakFill : styles.barNormalFill,
                    ]}
                  />
                </View>
                <Text style={[styles.dayLabel, isPeak && styles.dayLabelActive]}>
                  {item.day}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Right Side: Cute Mascot (matching reference image) */}
        <View style={styles.mascotHolder}>
          <MascotAvatar size={70} showShades={true} />
        </View>
      </View>

      {/* Two Metric Summary Cards: Trophy & Piggy Bank */}
      <View style={styles.metricCardsRow}>
        <View style={styles.metricCard}>
          <View style={styles.trophyIcon}>
            <Trophy size={18} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.metricLabel}>Total Projected</Text>
            <Text style={styles.metricValue}>
              {formatINR(forecast.projectedExpensesNextMonth)}
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.piggyIcon}>
            <TrendingUp size={18} color={THEME.colors.success} />
          </View>
          <View>
            <Text style={styles.metricLabel}>Safe Daily Limit</Text>
            <Text style={styles.metricValue}>
              {formatINR(forecast.dailySafeSpendLimit)}/day
            </Text>
          </View>
        </View>
      </View>

      {/* Day Forecast Action Row */}
      <View style={styles.dayForecastCard}>
        <View style={styles.dayForecastHeader}>
          <Text style={styles.dayForecastTitle}>Day Forecast</Text>
        </View>
        <View style={styles.dayForecastRow}>
          <View style={styles.dayLeft}>
            <View style={styles.greenTrendCircle}>
              <TrendingUp size={14} color={THEME.colors.success} />
            </View>
            <Text style={styles.dayName}>Tuesday (Peak)</Text>
          </View>
          <Text style={styles.dayAmount}>↑ ₹1,730</Text>
        </View>
        <View style={styles.safeLevelRow}>
          <Text style={styles.safeLevelLabel}>Safe spend level buffer</Text>
          <Text style={styles.safeLevelValue}>-15%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    gap: 2,
  },
  zoneText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.lavenderLight,
    borderRadius: THEME.borderRadius.full,
    padding: 3,
    marginVertical: THEME.spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.full,
  },
  activeTabButton: {
    backgroundColor: THEME.colors.primary,
    ...THEME.shadows.soft,
  },
  tabText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  activeTabText: {
    color: THEME.colors.textWhite,
  },
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.sm,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingRight: THEME.spacing.sm,
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 22,
    height: 120,
    backgroundColor: '#F1ECFA',
    borderRadius: 11,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 11,
  },
  barNormalFill: {
    backgroundColor: '#C8B5F9',
  },
  barPeakFill: {
    backgroundColor: THEME.colors.primary,
  },
  peakTooltip: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  peakTooltipText: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: '700',
  },
  dayLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 6,
    fontWeight: '500',
  },
  dayLabelActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  mascotHolder: {
    width: 75,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  metricCardsRow: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginTop: THEME.spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trophyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  piggyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  dayForecastCard: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
  },
  dayForecastHeader: {
    marginBottom: 6,
  },
  dayForecastTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  dayForecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenTrendCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8F8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayName: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  dayAmount: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  safeLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  safeLevelLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  safeLevelValue: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});
