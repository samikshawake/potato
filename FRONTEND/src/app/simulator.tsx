import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Clock,
  ShieldAlert,
  CheckCircle,
  Calendar,
  Layers,
  AlertTriangle,
  ChevronRight,
  Sliders,
  Check,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { simulatePurchaseScenarios } from '../services/simulator';
import { calculateExplainableGoalSimulation } from '../services/goalSimulatorEngine';
import { PurchaseScenarioCard } from '../components/PurchaseScenarioCard';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';
import { PurchasePriority } from '../types/finance';

export default function SimulatorScreen() {
  const router = useRouter();
  const {
    transactions,
    totalIncome,
    totalBalance,
    totalExpenses,
    recurring,
    cancelledRecurringIds,
    toggleRecurringCancel,
    parsePurchasePlanOnline,
  } = useFinance();

  // User input states
  const [itemName, setItemName] = useState('New Laptop');
  const [purchaseAmount, setPurchaseAmount] = useState('80000');
  const [priority, setPriority] = useState<PurchasePriority>('WANT');
  const [reserveFloor, setReserveFloor] = useState('15000');
  const [addedMonthlyEmi, setAddedMonthlyEmi] = useState('0');
  const [planPrompt, setPlanPrompt] = useState('');
  const [isParsingPlan, setIsParsingPlan] = useState(false);
  const [dealTimingTip, setDealTimingTip] = useState<string | null>(null);

  // Interactive Assumption Overrides for 10-point explanation engine
  const [customIncome, setCustomIncome] = useState<string>('');
  const [customEssential, setCustomEssential] = useState<string>('');
  const [customVariable, setCustomVariable] = useState<string>('');
  const [customTargetMonths, setCustomTargetMonths] = useState<string>('6');
  const [showAssumptionAdjuster, setShowAssumptionAdjuster] = useState(false);

  const [selectedScenarioId, setSelectedScenarioId] = useState<
    'NOW' | 'NEXT_MONTH' | 'THREE_MONTHS'
  >('NEXT_MONTH');

  // Fast preset buttons for quick simulation
  const presets = [
    { label: 'Laptop ₹80k', name: 'MacBook / Laptop', amount: '80000', prio: 'WANT' as const },
    { label: 'Phone ₹50k', name: 'Smartphone', amount: '50000', prio: 'WANT' as const },
    { label: 'Bike ₹1.2L', name: 'Commuter Bike', amount: '120000', prio: 'ESSENTIAL' as const },
    { label: 'Trip ₹35k', name: 'Vacation Trip', amount: '35000', prio: 'LUXURY' as const },
  ];

  const handleRunOnlinePlan = async () => {
    if (!planPrompt.trim() || isParsingPlan) return;
    setIsParsingPlan(true);
    const intent = await parsePurchasePlanOnline(planPrompt);
    setIsParsingPlan(false);
    setItemName(intent.itemName);
    setPurchaseAmount(String(intent.purchaseAmount));
    setPriority(intent.priority);
    setDealTimingTip(intent.dealTimingTip || null);
    if (intent.suggestedNewEmi > 0) {
      setAddedMonthlyEmi(String(intent.suggestedNewEmi));
    }
  };

  const parsedAmount = Math.max(100, parseFloat(purchaseAmount) || 0);
  const parsedFloor = Math.max(0, parseFloat(reserveFloor) || 15000);
  const parsedAddedEmi = Math.max(0, parseFloat(addedMonthlyEmi) || 0);

  // Derive base monthly financial figures
  const effectiveIncome = parseFloat(customIncome) || totalIncome || 60000;
  const effectiveEssential = parseFloat(customEssential) || Math.round(totalExpenses * 0.55) || 25000;
  const effectiveVariable = parseFloat(customVariable) || Math.round(totalExpenses * 0.35) || 15000;
  const targetMonthsVal = parseInt(customTargetMonths, 10) || 6;

  // Run the Explainable Financial Goal Simulator Engine
  const explainableResult = useMemo(() => {
    return calculateExplainableGoalSimulation({
      goalName: itemName.trim() || 'Goal Item',
      goalAmount: parsedAmount,
      targetMonths: targetMonthsVal,
      currentAvailableBalance: totalBalance,
      monthlyIncome: effectiveIncome,
      monthlyEssentialExpenses: effectiveEssential,
      averageVariableExpenses: effectiveVariable,
      existingSavings: Math.round(totalBalance * 0.4),
      emergencyFundBalance: Math.round(totalBalance * 0.4),
      existingInvestments: Math.round(totalBalance * 0.2),
      upcomingEmis: parsedAddedEmi,
      monthlySavingsCapacity: Math.max(0, effectiveIncome - effectiveEssential - effectiveVariable - parsedAddedEmi),
    });
  }, [
    itemName,
    parsedAmount,
    targetMonthsVal,
    totalBalance,
    effectiveIncome,
    effectiveEssential,
    effectiveVariable,
    parsedAddedEmi,
  ]);

  // Re-run legacy purchase scenarios for backward compatibility
  const scenarios = useMemo(() => {
    return simulatePurchaseScenarios(
      {
        itemName: itemName.trim() || 'Item',
        amount: parsedAmount,
        plannedDate: '2026-11',
        priority,
        customReserveThreshold: parsedFloor,
      },
      transactions,
      totalBalance,
      {
        cancelledRecurringIds,
        addedMonthlyEmi: parsedAddedEmi,
      }
    );
  }, [
    itemName,
    parsedAmount,
    priority,
    parsedFloor,
    transactions,
    totalBalance,
    cancelledRecurringIds,
    parsedAddedEmi,
  ]);

  const handleNavChange = (tab: NavTab) => {
    switch (tab) {
      case 'home':
        router.push('/');
        break;
      case 'transactions':
        router.push('/transactions');
        break;
      case 'simulator':
        break;
      case 'insights':
        router.push('/insights');
        break;
      case 'assistant':
        router.push('/assistant');
        break;
    }
  };

  const expPanel = explainableResult.explanationPanel;

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
        <Text style={styles.headerTitle}>Explainable Financial Goal Simulator</Text>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => router.push('/analysis')}
        >
          <HelpCircle size={18} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Presets */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetScroll}
        >
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.label}
              style={[
                styles.presetChip,
                itemName === preset.name && styles.presetChipActive,
              ]}
              onPress={() => {
                setItemName(preset.name);
                setPurchaseAmount(preset.amount);
                setPriority(preset.prio);
              }}
            >
              <Text
                style={[
                  styles.presetText,
                  itemName === preset.name && styles.presetTextActive,
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input Configuration Card */}
        <View style={styles.inputCard}>
          <Text style={styles.cardHeaderTitle}>Goal Parameters</Text>

          <Text style={styles.label}>Goal / Item Name</Text>
          <TextInput
            style={styles.textInput}
            value={itemName}
            onChangeText={setItemName}
            placeholder="e.g. MacBook Air, Laptop, Scooter..."
            placeholderTextColor={THEME.colors.textMuted}
          />

          <View style={styles.amountInputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Target Amount (₹)</Text>
              <TextInput
                style={[styles.textInput, styles.amountInput]}
                value={purchaseAmount}
                onChangeText={setPurchaseAmount}
                keyboardType="numeric"
                placeholder="80000"
                placeholderTextColor={THEME.colors.textMuted}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Target Horizon (Months)</Text>
              <TextInput
                style={[styles.textInput, styles.reserveInput]}
                value={customTargetMonths}
                onChangeText={setCustomTargetMonths}
                keyboardType="numeric"
                placeholder="6"
                placeholderTextColor={THEME.colors.textMuted}
              />
            </View>
          </View>

          {/* Toggle Interactive Assumption Controls */}
          <TouchableOpacity
            onPress={() => setShowAssumptionAdjuster(!showAssumptionAdjuster)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 8,
              borderTopWidth: 1,
              borderTopColor: THEME.colors.borderLight,
              marginTop: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sliders size={14} color={THEME.colors.primary} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.primary }}>
                {showAssumptionAdjuster ? 'Hide Assumption Controls' : 'Adjust Monthly Financial Assumptions'}
              </Text>
            </View>
            <ChevronRight
              size={14}
              color={THEME.colors.primary}
              style={{ transform: [{ rotate: showAssumptionAdjuster ? '90deg' : '0deg' }] } as any}
            />
          </TouchableOpacity>

          {showAssumptionAdjuster && (
            <View style={{ marginTop: 8, gap: 8, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Monthly Income (₹)</Text>
                  <TextInput
                    style={[styles.textInput, { marginBottom: 0 }]}
                    value={customIncome}
                    onChangeText={setCustomIncome}
                    keyboardType="numeric"
                    placeholder={String(effectiveIncome)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Essential Spend (₹)</Text>
                  <TextInput
                    style={[styles.textInput, { marginBottom: 0 }]}
                    value={customEssential}
                    onChangeText={setCustomEssential}
                    keyboardType="numeric"
                    placeholder={String(effectiveEssential)}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Variable Spend (₹)</Text>
                  <TextInput
                    style={[styles.textInput, { marginBottom: 0 }]}
                    value={customVariable}
                    onChangeText={setCustomVariable}
                    keyboardType="numeric"
                    placeholder={String(effectiveVariable)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Safety Floor (₹)</Text>
                  <TextInput
                    style={[styles.textInput, { marginBottom: 0 }]}
                    value={reserveFloor}
                    onChangeText={setReserveFloor}
                    keyboardType="numeric"
                    placeholder="15000"
                  />
                </View>
              </View>
            </View>
          )}

          {/* AI Plan Parsing Prompt */}
          <View style={styles.dividerSection}>
            <Text style={styles.label}>Ask AI Assistant for Goal Advice</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[styles.textInput, { marginBottom: 0 }]}
                  value={planPrompt}
                  onChangeText={setPlanPrompt}
                  placeholder="e.g. Can I buy ₹80,000 laptop in 6 months?"
                  placeholderTextColor={THEME.colors.textMuted}
                  onSubmitEditing={handleRunOnlinePlan}
                />
              </View>
              <TouchableOpacity
                onPress={handleRunOnlinePlan}
                style={[styles.runPlanBtn, isParsingPlan && { opacity: 0.65 }]}
                disabled={isParsingPlan}
              >
                <Text style={styles.runPlanBtnText}>{isParsingPlan ? '...' : 'Analyze'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* TOP BANNER: Best Purchase Time Recommendation */}
        <View style={styles.recommendationHeroCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color="#FFF" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>
                EXPLAINABLE RECOMMENDATION
              </Text>
            </View>
            <View style={styles.targetBadge}>
              <Text style={styles.targetBadgeText}>
                {explainableResult.isTargetDateRealistic ? 'REALISTIC' : 'ADJUSTMENT RECOMMENDED'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Best Purchase Time: {explainableResult.recommendedOption.label}
          </Text>
          <Text style={styles.heroSubtitle}>
            Expected Date: {explainableResult.recommendedOption.expectedDate} • Required Monthly Savings: {formatINR(explainableResult.recommendedOption.requiredMonthlySavings)}
          </Text>
          <Text style={styles.heroVerdict}>
            {explainableResult.recommendedOption.summaryVerdict}
          </Text>
        </View>

        {/* TIMELINE COMPARISON OPTIONS (Now, 3m, 6m, 8m, 12m) */}
        <View style={{ marginBottom: THEME.spacing.lg }}>
          <Text style={styles.sectionHeaderTitle}>Purchase Timeline Comparison</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
          >
            {explainableResult.timelineOptions.map((opt) => {
              const isRec = opt.rating === 'RECOMMENDED';
              return (
                <View
                  key={opt.months}
                  style={[
                    styles.timelineCard,
                    isRec && styles.timelineCardRecommended,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[styles.timelineCardLabel, isRec && { color: THEME.colors.primary }]}>
                      {opt.label}
                    </Text>
                    {isRec && (
                      <View style={styles.recBadge}>
                        <Check size={10} color="#FFF" />
                        <Text style={styles.recBadgeText}>BEST</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.timelineDate}>{opt.expectedDate}</Text>
                  <Text style={styles.timelineSavings}>
                    Save {formatINR(opt.requiredMonthlySavings)}/mo
                  </Text>
                  <Text style={styles.timelineBuffer}>
                    Buffer: {formatINR(opt.emergencyBufferRemaining)} ({opt.emergencyCoverageMonthsRemaining} mo)
                  </Text>
                  <Text style={styles.timelineVerdict} numberOfLines={2}>
                    {opt.summaryVerdict}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* VISUAL EXPLANATION PANEL */}
        <View style={styles.explanationPanelCard}>
          <Text style={styles.panelTitle}>Financial Goal Logic Flow</Text>
          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            {/* Diagram representation of 10-point explanation */}
            <Text style={styles.panelSubtitle}>10-Point Explanation: Flow Breakdown</Text>
          </View>
        </View>

        {/* Traditional Scenario Scenarios */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Cash Flow Scenarios</Text>
        </View>

        {scenarios.map((scenario) => (
          <PurchaseScenarioCard
            key={scenario.scenarioId}
            scenario={scenario}
            isSelected={selectedScenarioId === scenario.scenarioId}
            onSelect={() => setSelectedScenarioId(scenario.scenarioId)}
          />
        ))}

        <TouchableOpacity
          style={styles.analysisCtaCard}
          onPress={() => router.push('/analysis')}
          activeOpacity={0.85}
        >
          <View style={styles.ctaLeft}>
            <Sparkles size={20} color={THEME.colors.primary} />
            <Text style={styles.ctaTitle}>Detailed Financial Analysis</Text>
          </View>
          <TrendingUp size={18} color={THEME.colors.primary} />
        </TouchableOpacity>

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
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 24,
  },
  presetScroll: {
    gap: 8,
    paddingBottom: THEME.spacing.md,
  },
  presetChip: {
    backgroundColor: THEME.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  presetChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  presetTextActive: {
    color: '#FFF',
  },
  inputCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
    marginBottom: THEME.spacing.lg,
  },
  cardHeaderTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  amountInputRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  amountInput: {
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  reserveInput: {
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  dividerSection: {
    marginTop: THEME.spacing.sm,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  runPlanBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: THEME.borderRadius.md,
  },
  runPlanBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  recommendationHeroCard: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
    ...THEME.shadows.card,
  },
  heroTitle: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 10,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E0E7FF',
    marginTop: 4,
  },
  heroVerdict: {
    fontSize: 12,
    fontWeight: '400',
    color: '#F3F4F6',
    marginTop: 8,
    lineHeight: 18,
  },
  targetBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  targetBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
  sectionHeaderTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  timelineCard: {
    width: 140,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'space-between',
  },
  timelineCardRecommended: {
    borderColor: THEME.colors.primary,
    borderWidth: 2,
    backgroundColor: THEME.colors.lavenderLight,
  },
  timelineCardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFF',
  },
  timelineDate: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  timelineSavings: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginTop: 6,
  },
  timelineBuffer: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  timelineVerdict: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    marginTop: 6,
  },
  explanationPanelCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.lg,
    ...THEME.shadows.card,
  },
  panelTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  panelSubtitle: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  gridItem: {
    width: '48%',
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  impactBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginBottom: 10,
  },
  impactTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  impactText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  risksBox: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  risksTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  reasoningBox: {
    backgroundColor: THEME.colors.lavenderLight,
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.primaryLight,
  },
  reasoningTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  reasoningText: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    marginTop: 2,
    lineHeight: 16,
  },
  resultsHeader: {
    marginBottom: THEME.spacing.sm,
  },
  resultsTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  analysisCtaCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: THEME.spacing.sm,
    ...THEME.shadows.card,
  },
  ctaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
    flex: 1,
  },
  ctaTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
});
