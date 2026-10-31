import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  PieChart,
  TrendingUp,
  ShieldCheck,
  Calculator,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Award,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { analyzeMultiMonthDiagnostics } from '../services/simulator';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';

export default function AnalysisScreen() {
  const router = useRouter();
  const {
    totalIncome,
    totalExpenses,
    totalBalance,
    totalRecurringMonthly,
    transactions,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<
    'strategy' | 'blueprint' | 'calculator' | 'diagnostics'
  >('strategy');

  // Calculator State
  const [userAge, setUserAge] = useState<string>('24');
  const [monthlySip, setMonthlySip] = useState<string>('10000');
  const [investmentYears, setInvestmentYears] = useState<string>('10');
  const [returnRate, setReturnRate] = useState<string>('12');
  const [goalPurpose, setGoalPurpose] = useState<string>('Wealth Creation');

  const diag = useMemo(
    () => analyzeMultiMonthDiagnostics(transactions, totalBalance, 15000),
    [transactions, totalBalance]
  );

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
        router.push('/insights');
        break;
      case 'assistant':
        router.push('/assistant');
        break;
    }
  };

  // Compound Interest SIP Math
  const calcResults = useMemo(() => {
    const P = Math.max(0, parseFloat(monthlySip) || 0);
    const N = Math.max(1, parseFloat(investmentYears) || 1);
    const R = Math.max(1, parseFloat(returnRate) || 1);
    const totalMonths = N * 12;
    const monthlyRate = R / 12 / 100;

    const totalInvested = P * totalMonths;
    let futureValue = 0;
    if (monthlyRate > 0) {
      futureValue =
        P *
        (((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) *
          (1 + monthlyRate));
    } else {
      futureValue = totalInvested;
    }

    const wealthGain = Math.max(0, futureValue - totalInvested);

    return {
      totalInvested: Math.round(totalInvested),
      wealthGain: Math.round(wealthGain),
      futureValue: Math.round(futureValue),
      indexFundsAlloc: Math.round(futureValue * 0.75),
      stocksAlloc: Math.round(futureValue * 0.15),
      emergencyFixedAlloc: Math.round(futureValue * 0.10),
    };
  }, [monthlySip, investmentYears, returnRate]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/simulator')}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Evaluation Scenarios</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Mode Navigation Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'strategy' && styles.tabBtnActive]}
          onPress={() => setActiveTab('strategy')}
        >
          <Text style={[styles.tabText, activeTab === 'strategy' && styles.tabTextActive]}>
            Strategy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'blueprint' && styles.tabBtnActive]}
          onPress={() => setActiveTab('blueprint')}
        >
          <Text style={[styles.tabText, activeTab === 'blueprint' && styles.tabTextActive]}>
            Blueprint
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'calculator' && styles.tabBtnActive]}
          onPress={() => setActiveTab('calculator')}
        >
          <Text style={[styles.tabText, activeTab === 'calculator' && styles.tabTextActive]}>
            Calculator
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'diagnostics' && styles.tabBtnActive]}
          onPress={() => setActiveTab('diagnostics')}
        >
          <Text style={[styles.tabText, activeTab === 'diagnostics' && styles.tabTextActive]}>
            Cash Flow
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TAB 1: AI FINANCIAL CHATBOT */}
        {activeTab === 'strategy' && (
          <View style={{ flex: 1, padding: 16, backgroundColor: '#FFF', borderRadius: 16 }}>
            <View style={styles.iconCircle}>
              <Sparkles size={22} color={THEME.colors.primary} />
            </View>
            <Text style={styles.introTitle}>Financial Assistant Chatbot</Text>
            <Text style={styles.introDesc}>
              Ask me anything about your financial goals, allocation strategy, or how to better manage your investments!
            </Text>
            <View style={{ height: 300, justifyContent: 'center', alignItems: 'center', marginTop: 20, backgroundColor: '#F7F6FC', borderRadius: 12 }}>
              <Text style={{ color: THEME.colors.textSecondary }}>Chatbot interface coming soon...</Text>
            </View>
          </View>
        )}

        {/* TAB 2: SIMULATED ALLOCATION BLUEPRINT TABLE */}
        {activeTab === 'blueprint' && (
          <View style={{ gap: 14 }}>
            <View style={styles.introCard}>
              <View style={styles.iconCircle}>
                <PieChart size={22} color={THEME.colors.primary} />
              </View>
              <Text style={styles.introTitle}>Simulated Allocation Blueprint</Text>
              <Text style={styles.introDesc}>
                Dynamically adjust your buckets as your total investable balance grows through each milestone stage.
              </Text>
            </View>

            {/* Stage 1 Card */}
            <View style={styles.blueprintCard}>
              <View style={styles.blueprintCardHeader}>
                <Text style={styles.stageTitle}>Stage 1: Investable Balance ₹50,000</Text>
                <View style={styles.triggerBadgeDanger}>
                  <Text style={styles.triggerBadgeText}>Build Emergency Baseline First</Text>
                </View>
              </View>
              <View style={styles.allocProgressRow}>
                <View style={[styles.allocBar, { flex: 10, backgroundColor: '#37B879' }]} />
              </View>
              <View style={styles.allocDetailsRow}>
                <Text style={styles.allocLabel}>
                  <Text style={{ fontWeight: '800', color: '#37B879' }}>Low-Risk:</Text> 100% (₹50,000)
                </Text>
                <Text style={styles.allocLabel}>
                  <Text style={{ fontWeight: '800', color: THEME.colors.primary }}>High-Risk:</Text> 0% (₹0)
                </Text>
              </View>
            </View>

            {/* Stage 2 Card */}
            <View style={styles.blueprintCard}>
              <View style={styles.blueprintCardHeader}>
                <Text style={styles.stageTitle}>Stage 2: Investable Balance ₹2,00,000</Text>
                <View style={styles.triggerBadgeWarning}>
                  <Text style={styles.triggerBadgeText}>Start SIP in Index Mutual Funds/ETFs</Text>
                </View>
              </View>
              <View style={styles.allocProgressRow}>
                <View style={[styles.allocBar, { flex: 5, backgroundColor: '#37B879' }]} />
                <View style={[styles.allocBar, { flex: 5, backgroundColor: THEME.colors.primary }]} />
              </View>
              <View style={styles.allocDetailsRow}>
                <Text style={styles.allocLabel}>
                  <Text style={{ fontWeight: '800', color: '#37B879' }}>Low-Risk:</Text> 50% (₹1,00,000)
                </Text>
                <Text style={styles.allocLabel}>
                  <Text style={{ fontWeight: '800', color: THEME.colors.primary }}>High-Risk:</Text> 50% (₹1,00,000)
                </Text>
              </View>
            </View>

            {/* Stage 3 Card */}
            <View style={styles.blueprintCard}>
              <View style={styles.blueprintCardHeader}>
                <Text style={styles.stageTitle}>Stage 3: Investable Balance ₹10,00,000+</Text>
                <View style={styles.triggerBadgeSuccess}>
                  <Text style={styles.triggerBadgeText}>Maximize Equity & Add Core Stocks</Text>
                </View>
              </View>
              <View style={styles.allocProgressRow}>
                <View style={[styles.allocBar, { flex: 3, backgroundColor: '#37B879' }]} />
                <View style={[styles.allocBar, { flex: 7, backgroundColor: THEME.colors.primary }]} />
              </View>
              <View style={styles.allocDetailsRow}>
                <Text style={styles.allocLabel}>
                  <Text style={{ fontWeight: '800', color: '#37B879' }}>Low-Risk:</Text> 30% (₹3,00,000)
                </Text>
                <Text style={styles.allocLabel}>
                  <Text style={{ fontWeight: '800', color: THEME.colors.primary }}>High-Risk:</Text> 70% (₹7,00,000)
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: FUTURE WEALTH COMPOUND GROWTH CALCULATOR */}
        {activeTab === 'calculator' && (
          <View style={{ gap: 14 }}>
            <View style={styles.introCard}>
              <View style={styles.iconCircle}>
                <Calculator size={22} color={THEME.colors.primary} />
              </View>
              <Text style={styles.introTitle}>Estimate Your Future Wealth Growth</Text>
              <Text style={styles.introDesc}>
                Visualize how compound interest grows your portfolio over time based on your monthly equity SIP contributions out of income.
              </Text>
            </View>

            {/* Form Inputs */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Investment Parameters</Text>

              <View style={styles.inputGrid}>
                <View style={styles.inputCol}>
                  <Text style={styles.fieldLabel}>Current Age</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={userAge}
                    onChangeText={setUserAge}
                    placeholder="24"
                  />
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.fieldLabel}>Monthly SIP (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={monthlySip}
                    onChangeText={setMonthlySip}
                    placeholder="10000"
                  />
                </View>
              </View>

              <View style={styles.inputGrid}>
                <View style={styles.inputCol}>
                  <Text style={styles.fieldLabel}>Duration (Years)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={investmentYears}
                    onChangeText={setInvestmentYears}
                    placeholder="10"
                  />
                </View>

                <View style={styles.inputCol}>
                  <Text style={styles.fieldLabel}>Expected Return (% p.a.)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={returnRate}
                    onChangeText={setReturnRate}
                    placeholder="12"
                  />
                </View>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={styles.fieldLabel}>Financial Goal Purpose</Text>
                <TextInput
                  style={styles.textInput}
                  value={goalPurpose}
                  onChangeText={setGoalPurpose}
                  placeholder="e.g. Wealth Creation, House Down Payment"
                />
              </View>
            </View>

            {/* Calculation Results Card */}
            <View style={styles.resultCard}>
              <Text style={styles.resultHeaderTitle}>
                Estimated Wealth at Age {parseInt(userAge || '24') + parseInt(investmentYears || '10')}
              </Text>

              <View style={styles.mainResultBanner}>
                <Text style={styles.futureValueText}>{formatINR(calcResults.futureValue)}</Text>
                <Text style={styles.futureValueSub}>
                  Total Estimated Portfolio Value for {goalPurpose}
                </Text>
              </View>

              <View style={styles.statGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Total Invested</Text>
                  <Text style={styles.statValue}>{formatINR(calcResults.totalInvested)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Est. Wealth Gain</Text>
                  <Text style={[styles.statValue, { color: THEME.colors.success }]}>
                    +{formatINR(calcResults.wealthGain)}
                  </Text>
                </View>
              </View>

              {/* Bucket Allocation Recommendation */}
              <View style={styles.bucketBreakdownBox}>
                <Text style={styles.breakdownHeader}>Recommended Target Bucket Split:</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>• Index Mutual Funds & ETFs (75%)</Text>
                  <Text style={styles.breakdownVal}>{formatINR(calcResults.indexFundsAlloc)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>• Individual Blue-Chip Stocks (15%)</Text>
                  <Text style={styles.breakdownVal}>{formatINR(calcResults.stocksAlloc)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>• Emergency Reserve & Fixed Income (10%)</Text>
                  <Text style={styles.breakdownVal}>{formatINR(calcResults.emergencyFixedAlloc)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB 4: MONTHLY CASH FLOW & DIAGNOSTICS */}
        {activeTab === 'diagnostics' && (
          <View style={{ gap: 14 }}>
            <View style={styles.coverageCard}>
              <View style={styles.coverageTop}>
                <Database size={18} color={THEME.colors.primary} />
                <Text style={styles.coverageBadgeText}>
                  {diag.hasThreeMonthsCoverage
                    ? `Data Coverage: ${diag.distinctMonths.length} Months`
                    : `Limited Data (${diag.distinctMonths.length} Month)`}
                </Text>
              </View>
            </View>

            {/* Forecast Backtest Track Record */}
            {diag.holdoutBacktest && (
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <CheckCircle2 size={16} color={THEME.colors.success} />
                  <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                    Forecast Accuracy ({diag.holdoutBacktest.monthLabel})
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Projected Balance</Text>
                  <Text style={styles.metricValue}>
                    {formatINR(diag.holdoutBacktest.predictedEndBalance)}
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Actual Balance</Text>
                  <Text style={[styles.metricValue, { color: THEME.colors.primary }]}>
                    {formatINR(diag.holdoutBacktest.actualEndBalance)}
                  </Text>
                </View>
                <View style={[styles.metricRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Accuracy</Text>
                  <Text style={[styles.totalValue, { color: THEME.colors.success }]}>
                    {diag.holdoutBacktest.accuracyPct}%
                  </Text>
                </View>
              </View>
            )}

            {/* Monthly Cash Flow Composition */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Monthly Cash Flow</Text>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Income</Text>
                <Text style={[styles.metricValue, { color: THEME.colors.success }]}>
                  +{formatINR(totalIncome)}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Recurring Commitments</Text>
                <Text style={[styles.metricValue, { color: THEME.colors.danger }]}>
                  −{formatINR(totalRecurringMonthly)}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Variable Spending</Text>
                <Text style={[styles.metricValue, { color: THEME.colors.danger }]}>
                  −{formatINR(Math.max(0, totalExpenses - totalRecurringMonthly))}
                </Text>
              </View>

              <View style={[styles.metricRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Balance</Text>
                <Text style={styles.totalValue}>{formatINR(totalBalance)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="simulator" onSelectTab={handleNavChange} />
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.card,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.md,
  },
  tabBtnActive: {
    backgroundColor: THEME.colors.lavenderLight,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: 24,
  },
  introCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  introTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  introDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  phaseCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  phaseTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  phaseSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  phaseNote: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  bucketItem: {
    backgroundColor: '#FAF9FE',
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECEAF6',
    marginBottom: 10,
  },
  bucketName: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  ruleBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  ruleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  bucketDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  blueprintCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  blueprintCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stageTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    flex: 1,
  },
  triggerBadgeDanger: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  triggerBadgeWarning: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  triggerBadgeSuccess: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  triggerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  allocProgressRow: {
    height: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
  },
  allocBar: {
    height: '100%',
  },
  allocDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  allocLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  formCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  formTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 12,
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  inputCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FAF9FE',
    borderWidth: 1,
    borderColor: '#ECEAF6',
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  resultCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  resultHeaderTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  mainResultBanner: {
    alignItems: 'center',
    marginVertical: 12,
  },
  futureValueText: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  futureValueSub: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FAF9FE',
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECEAF6',
  },
  statLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  bucketBreakdownBox: {
    backgroundColor: '#F7F6FC',
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2DFF0',
    gap: 6,
    marginTop: 8,
  },
  breakdownHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  breakdownVal: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  cardTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
  },
  coverageCard: {
    backgroundColor: THEME.colors.lavenderLight,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
  },
  coverageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coverageBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  metricLabel: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
  },
  metricValue: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  totalValue: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
});
