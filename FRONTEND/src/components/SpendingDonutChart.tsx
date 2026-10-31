import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { THEME, formatINR } from '../constants/theme';
import { CategorySpendingSummary } from '../services/financeEngine';
import { MascotAvatar } from './MascotAvatar';

interface Props {
  totalSpent: number;
  budgetTotal?: number;
  categories: CategorySpendingSummary[];
  title?: string;
}

export const SpendingDonutChart: React.FC<Props> = ({
  totalSpent,
  budgetTotal = 105000,
  categories,
  title = 'Spendings & Goals',
}) => {
  const size = 220;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const percentageUsed = Math.min(100, Math.round((totalSpent / budgetTotal) * 100));

  // Build segments for top 4 categories + other
  let accumulatedAngle = 0;
  const segments = categories.slice(0, 4).map((cat) => {
    const fraction = cat.percentage / 100;
    const strokeDasharray = `${circumference * fraction} ${circumference * (1 - fraction)}`;
    const strokeDashoffset = -circumference * accumulatedAngle;
    accumulatedAngle += fraction;
    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {/* Circular Donut with Mascot Inside */}
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size} style={styles.svg}>
          {/* Background Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#EDE8FA"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Color Segments */}
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {segments.map((seg, i) => (
              <Circle
                key={seg.category}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </G>
        </Svg>

        {/* Mascot & Numbers Centered inside the Donut Ring */}
        <View style={styles.innerContent}>
          <MascotAvatar size={74} showShades={true} />
          <Text style={styles.amountText}>{formatINR(totalSpent)}</Text>
          <Text style={styles.percentageText}>{percentageUsed}% of budget</Text>
        </View>
      </View>

      {/* Category Legend with Colored Dots */}
      <View style={styles.legendContainer}>
        {categories.slice(0, 4).map((cat) => (
          <View key={cat.category} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
            <Text style={styles.legendLabel}>{cat.category}</Text>
          </View>
        ))}
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
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  title: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.sm,
  },
  chartWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  percentageText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
});
