import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Repeat,
  PieChart,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { SpendingDonutChart } from '../components/SpendingDonutChart';
import { ForecastBarChart } from '../components/ForecastBarChart';
import { RecurringPaymentCard } from '../components/RecurringPaymentCard';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';

export default function InsightsScreen() {
  const router = useRouter();
  const {
    categorySpending,
    totalIncome,
    totalExpenses,
    recurring,
    anomalies,
    forecast,
    reviewAnomaly,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'Spending' | 'Recurring' | 'Anomalies'>('Spending');

  const handleNavChange = (tab: NavTab) => {
    switch (tab) {
      case 'home':
        router.push('/');
        break;
      case 'transactions':
        router.push('/transactions');
        break;
      case 'simulator':
        router.push('/simulator');
        break;
      case 'insights':
        break;
      case 'assistant':
        router.push('/assistant');
        break;
    }
  };

  const highestCategory = categorySpending[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/')}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spending & Insights</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 3 Interactive Working Tabs: Spending / Recurring / Anomalies */}
      <View style={styles.tabContainer}>
        {(['Spending', 'Recurring', 'Anomalies'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const badgeCount =
            tab === 'Recurring'
              ? recurring.length
              : tab === 'Anomalies'
              ? anomalies.filter((a) => a.status === 'PENDING').length
              : null;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
              {badgeCount !== null && badgeCount > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    tab === 'Anomalies' ? styles.anomalyTabBadge : styles.recurringTabBadge,
                  ]}
                >
                  <Text style={styles.tabBadgeText}>{badgeCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.contentScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TAB 1: SPENDING INSIGHTS */}
        {activeTab === 'Spending' && (
          <View>
            {/* AI Forecast Bar Chart (matching reference image) */}
            <ForecastBarChart
              forecast={forecast}
              onPressForecastDetail={() => router.push('/analysis')}
            />

            {/* Spending Donut Chart Breakdown */}
            <SpendingDonutChart
              totalSpent={totalExpenses}
              budgetTotal={totalIncome}
              categories={categorySpending}
              title="Category Distribution"
            />

            {/* Highest Spending Hero Card */}
            {highestCategory && (
              <View style={styles.heroCard}>
                <View style={styles.heroTop}>
                  <View style={styles.heroIconCircle}>
                    <TrendingDown size={18} color={THEME.colors.danger} />
                  </View>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>Highest Category</Text>
                  </View>
                </View>
                <Text style={styles.heroCategory}>{highestCategory.category}</Text>
                <Text style={styles.heroAmount}>{formatINR(highestCategory.amount)}</Text>
                <Text style={styles.heroExplanation}>
                  Accounts for {highestCategory.percentage}% of your total monthly expenditures across {highestCategory.transactionCount} transactions.
                </Text>
              </View>
            )}

            {/* Category Breakdown Comparison Cards */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Expense Breakdown by Category</Text>
            </View>

            <View style={styles.cardsList}>
              {categorySpending.map((cat) => (
                <View key={cat.category} style={styles.categoryCard}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catColorDot, { backgroundColor: cat.color }]} />
                    <View>
                      <Text style={styles.catName}>{cat.category}</Text>
                      <Text style={styles.catCount}>
                        {cat.transactionCount} transactions
                      </Text>
                    </View>
                  </View>

                  <View style={styles.catRight}>
                    <Text style={styles.catAmount}>{formatINR(cat.amount)}</Text>
                    <Text style={styles.catPercent}>{cat.percentage}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 2: RECURRING PAYMENTS */}
        {activeTab === 'Recurring' && (
          <View style={{ paddingHorizontal: THEME.spacing.lg }}>
            <View style={styles.recurringSummaryBox}>
              <Text style={styles.recurringSummaryLabel}>
                Estimated Monthly Commitment
              </Text>
              <Text style={styles.recurringSummaryAmount}>
                {formatINR(recurring.reduce((s, r) => s + r.amount, 0))}
              </Text>
              <Text style={styles.recurringSummaryNote}>
                Recurring payments are detected automatically from regular historical cycles on your device.
              </Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Subscriptions & Bills</Text>
            </View>

            {recurring.map((item) => (
              <RecurringPaymentCard key={item.id} payment={item} />
            ))}
          </View>
        )}

        {/* TAB 3: ANOMALIES DETECTION */}
        {activeTab === 'Anomalies' && (
          <View style={{ paddingHorizontal: THEME.spacing.lg }}>
            <View style={styles.anomalySummaryBox}>
              <AlertTriangle size={24} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={styles.anomalySummaryTitle}>
                  Unusual Transaction Monitoring
                </Text>
                <Text style={styles.anomalySummaryText}>
                  Transactions flagged when their amount deviates 2.2x or higher above your category baseline. Not assumed to be fraud.
                </Text>
              </View>
            </View>

            {anomalies.map((item) => (
              <View key={item.id} style={styles.anomalyCard}>
                <View style={styles.anomalyCardHeader}>
                  <Text style={styles.anomalyTxTitle}>{item.title}</Text>
                  <Text style={styles.anomalyTxAmount}>{formatINR(item.amount)}</Text>
                </View>

                <Text style={styles.anomalyReason}>{item.reason}</Text>

                <View style={styles.anomalyMetaRow}>
                  <Text style={styles.anomalyMetaText}>Date: {item.date}</Text>
                  <Text style={styles.anomalyMetaText}>
                    Normal avg: {formatINR(item.typicalAverage)}
                  </Text>
                </View>

                {item.status === 'PENDING' ? (
                  <View style={styles.anomalyActionsRow}>
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => reviewAnomaly(item.id, 'CONFIRMED')}
                    >
                      <Text style={styles.reviewBtnText}>Mark Legitimate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.ignoreBtn}
                      onPress={() => reviewAnomaly(item.id, 'DISMISSED')}
                    >
                      <Text style={styles.ignoreBtnText}>Ignore Alert</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.reviewedBadge}>
                    <Text style={styles.reviewedText}>
                      Status: {item.status === 'CONFIRMED' ? 'Confirmed by you' : 'Alert dismissed'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="insights" onSelectTab={handleNavChange} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.lavenderLight,
    borderRadius: THEME.borderRadius.full,
    marginHorizontal: THEME.spacing.lg,
    padding: 4,
    marginBottom: THEME.spacing.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: THEME.colors.primary,
    ...THEME.shadows.soft,
  },
  tabText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: THEME.borderRadius.full,
  },
  recurringTabBadge: {
    backgroundColor: '#E8F8F0',
  },
  anomalyTabBadge: {
    backgroundColor: '#FDEDF0',
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.danger,
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.danger,
    ...THEME.shadows.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  heroIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDEDF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    backgroundColor: '#FDEDF0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.danger,
  },
  heroCategory: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  heroAmount: {
    fontSize: THEME.typography.sizes.xxl,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginVertical: 2,
  },
  heroExplanation: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  sectionTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  cardsList: {
    paddingHorizontal: THEME.spacing.lg,
    gap: 8,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.card,
    padding: THEME.spacing.base,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    ...THEME.shadows.soft,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  catColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  catName: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  catCount: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  catRight: {
    alignItems: 'flex-end',
  },
  catAmount: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  catPercent: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  recurringSummaryBox: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginVertical: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    ...THEME.shadows.card,
  },
  recurringSummaryLabel: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  recurringSummaryAmount: {
    fontSize: THEME.typography.sizes.xxl,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginVertical: 4,
  },
  recurringSummaryNote: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  anomalySummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
    backgroundColor: '#FEF3C7',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginVertical: THEME.spacing.md,
  },
  anomalySummaryTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: '#92400E',
  },
  anomalySummaryText: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
    marginTop: 2,
  },
  anomalyCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    ...THEME.shadows.card,
  },
  anomalyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  anomalyTxTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  anomalyTxAmount: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '800',
    color: THEME.colors.danger,
  },
  anomalyReason: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginVertical: 6,
  },
  anomalyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  anomalyMetaText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  anomalyActionsRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.md,
  },
  reviewBtn: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  reviewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  ignoreBtn: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  ignoreBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  reviewedBadge: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  reviewedText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.success,
  },
});
