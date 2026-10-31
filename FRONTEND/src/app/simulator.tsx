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
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { simulatePurchaseScenarios } from '../services/simulator';
import { PurchaseScenarioCard } from '../components/PurchaseScenarioCard';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';
import { PurchasePriority } from '../types/finance';

export default function SimulatorScreen() {
  const router = useRouter();
  const {
    transactions,
    totalIncome,
    totalBalance,
    recurring,
    cancelledRecurringIds,
    toggleRecurringCancel,
    parsePurchasePlanOnline,
  } = useFinance();

  // User input states
  const [itemName, setItemName] = useState('New Laptop');
  const [purchaseAmount, setPurchaseAmount] = useState('50000');
  const [priority, setPriority] = useState<PurchasePriority>('WANT');
  const [reserveFloor, setReserveFloor] = useState('15000');
  const [addedMonthlyEmi, setAddedMonthlyEmi] = useState('0');
  const [planPrompt, setPlanPrompt] = useState('');
  const [isParsingPlan, setIsParsingPlan] = useState(false);
  const [dealTimingTip, setDealTimingTip] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<
    'NOW' | 'NEXT_MONTH' | 'THREE_MONTHS'
  >('NEXT_MONTH');

  // Fast preset buttons for quick simulation
  const presets = [
    { label: 'Phone ₹80k', name: 'Flagship Phone', amount: '80000', prio: 'WANT' as const },
    { label: 'Laptop ₹50k', name: 'New Laptop', amount: '50000', prio: 'WANT' as const },
    { label: 'Bike ₹1.2L', name: 'Commuter Bike', amount: '120000', prio: 'ESSENTIAL' as const },
    { label: 'Trip ₹18k', name: 'Weekend Trip', amount: '18000', prio: 'LUXURY' as const },
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
    if (intent.suggestedCancelNames.length > 0) {
      recurring.forEach((r) => {
        const lower = r.name.toLowerCase();
        if (
          intent.suggestedCancelNames.some((kw) => lower.includes(kw)) &&
          !cancelledRecurringIds.includes(r.id)
        ) {
          toggleRecurringCancel(r.id);
        }
      });
    }
  };

  const parsedAmount = Math.max(100, parseFloat(purchaseAmount) || 0);
  const parsedFloor = Math.max(0, parseFloat(reserveFloor) || 15000);
  const parsedAddedEmi = Math.max(0, parseFloat(addedMonthlyEmi) || 0);
  const hourlyNetRate = Math.max(100, Math.round(totalIncome / 176));
  const hoursOfWork = Math.round((parsedAmount / hourlyNetRate) * 10) / 10;

  // Re-run deterministic simulation whenever inputs or What-If toggles change
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
        <Text style={styles.headerTitle}>Purchase Simulator</Text>
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
          <Text style={styles.cardHeaderTitle}>Purchase Parameters</Text>

          <Text style={styles.label}>Item</Text>
          <TextInput
            style={styles.textInput}
            value={itemName}
            onChangeText={setItemName}
            placeholder="e.g. MacBook Air, Electric Scooter..."
            placeholderTextColor={THEME.colors.textMuted}
          />

          <View style={styles.amountInputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Estimated Cost (₹)</Text>
              <TextInput
                style={[styles.textInput, styles.amountInput]}
                value={purchaseAmount}
                onChangeText={setPurchaseAmount}
                keyboardType="numeric"
                placeholder="50000"
                placeholderTextColor={THEME.colors.textMuted}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Safety Reserve (₹)</Text>
              <TextInput
                style={[styles.textInput, styles.reserveInput]}
                value={reserveFloor}
                onChangeText={setReserveFloor}
                keyboardType="numeric"
                placeholder="15000"
                placeholderTextColor={THEME.colors.textMuted}
              />
            </View>
          </View>

          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {(['ESSENTIAL', 'WANT', 'INVESTMENT', 'LUXURY'] as PurchasePriority[]).map(
              (prio) => {
                const isSelected = priority === prio;
                return (
                  <TouchableOpacity
                    key={prio}
                    style={[
                      styles.prioButton,
                      isSelected && styles.prioButtonSelected,
                    ]}
                    onPress={() => setPriority(prio)}
                  >
                    <Text
                      style={[
                        styles.prioText,
                        isSelected && styles.prioTextSelected,
                      ]}
                    >
                      {prio.charAt(0) + prio.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          {/* Hours of Work Opportunity Cost */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: THEME.colors.lavenderLight,
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderRadius: THEME.borderRadius.md,
              marginTop: THEME.spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color={THEME.colors.primary} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.textPrimary }}>
                Work-Hours Equivalent
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.colors.primary }}>
              {hoursOfWork} hrs ({formatINR(hourlyNetRate)}/hr)
            </Text>
          </View>

          {/* Write Your Plan (Online Gemini AI) */}
          <View style={styles.dividerSection}>
            <Text style={styles.label}>Write Your Plan (Gemini AI)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[styles.textInput, { marginBottom: 0 }]}
                  value={planPrompt}
                  onChangeText={setPlanPrompt}
                  placeholder="e.g. Buy ₹65,000 camera next month and pause Netflix"
                  placeholderTextColor={THEME.colors.textMuted}
                  onSubmitEditing={handleRunOnlinePlan}
                />
              </View>
              <TouchableOpacity
                onPress={handleRunOnlinePlan}
                style={[styles.runPlanBtn, isParsingPlan && { opacity: 0.65 }]}
                disabled={isParsingPlan}
              >
                <Text style={styles.runPlanBtnText}>{isParsingPlan ? '...' : 'Run'}</Text>
              </TouchableOpacity>
            </View>
            {dealTimingTip && (
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: THEME.colors.primary,
                  marginTop: 6,
                }}
              >
                {dealTimingTip}
              </Text>
            )}
          </View>

          {/* Subscriptions & EMI Adjustments */}
          <View style={styles.dividerSection}>
            <Text style={styles.label}>Subscriptions & Optional EMI</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
            >
              {recurring.map((rec) => {
                const isCancelled = cancelledRecurringIds.includes(rec.id);
                return (
                  <TouchableOpacity
                    key={rec.id}
                    onPress={() => toggleRecurringCancel(rec.id)}
                    style={[
                      styles.presetChip,
                      isCancelled && {
                        backgroundColor: '#E8F8F0',
                        borderColor: THEME.colors.success,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        isCancelled && { color: THEME.colors.success, fontWeight: '700' },
                      ]}
                    >
                      {isCancelled ? `Paused: ${rec.name}` : `${rec.name} (${formatINR(rec.amount)})`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TextInput
              style={[styles.textInput, { marginBottom: 0 }]}
              value={addedMonthlyEmi}
              onChangeText={setAddedMonthlyEmi}
              keyboardType="numeric"
              placeholder="Optional Monthly EMI (₹)"
              placeholderTextColor={THEME.colors.textMuted}
            />
          </View>
        </View>

        {/* Results Section (Zero evaluation remarks / subtitles) */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Evaluation Scenarios</Text>
        </View>

        {scenarios.map((scenario) => (
          <PurchaseScenarioCard
            key={scenario.scenarioId}
            scenario={scenario}
            isSelected={selectedScenarioId === scenario.scenarioId}
            onSelect={() => setSelectedScenarioId(scenario.scenarioId)}
          />
        ))}

        {/* Deep Dive Action Card */}
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
    fontSize: THEME.typography.sizes.md,
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
  priorityRow: {
    flexDirection: 'row',
    gap: 6,
  },
  prioButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  prioButtonSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  prioText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  prioTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  dividerSection: {
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.md,
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
