import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Calculator,
  Repeat,
  AlertTriangle,
  ChevronRight,
  Plus,
  X,
  Mail,
  Sparkles,
  TrendingUp,
  Shield,
  Briefcase,
  PieChart,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { Header } from '../components/Header';
import { BalanceCard } from '../components/BalanceCard';
import { IncomeExpenseCard } from '../components/IncomeExpenseCard';
import { SpendingDonutChart } from '../components/SpendingDonutChart';
import { InsightCard } from '../components/InsightCard';
import { TransactionItem } from '../components/TransactionItem';
import { SavingsGoalCard } from '../components/SavingsGoalCard';
import { FinancialAllocationCompartments } from '../components/FinancialAllocationCompartments';
import { StatementUploadModal } from '../components/StatementUploadModal';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';
import { Transaction, TransactionCategory, PaymentMethod } from '../types/finance';

import { calculateCompartmentsState } from '../services/compartmentsEngine';

export default function HomeScreen() {
  const router = useRouter();
  const {
    user,
    transactions,
    accounts,
    goals,
    anomalies,
    startingSalary,
    pocketMoney,
    totalIncome,
    totalExpenses,
    totalBalance,
    categorySpending,
    availableCategories,
    insights,
    recurring,
    totalRecurringMonthly,
    lastCategoryPropagationNotice,
    clearCategoryNotice,
    addTransaction,
    updateTransactionCategory,
    updateIncomeConfig,
    addCustomCategory,
    contributeToGoal,
    gmailConnected,
  } = useFinance();

  const [activeBalanceTab, setActiveBalanceTab] = useState<'Overview' | 'Transactions' | 'Goals'>('Overview');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedChartCategory, setSelectedChartCategory] = useState<string | null>(null);

  // New Transaction Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<TransactionCategory>('Food');
  const [newType, setNewType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'INVESTMENT'>('EXPENSE');
  const [newPaymentMethod] = useState<PaymentMethod>('UPI');
  const [addingCustomCat, setAddingCustomCat] = useState(false);
  const [customCatInput, setCustomCatInput] = useState('');

  // Feature 3: Calculate Separate Allocation Compartments State
  const monthlyEssentialExpenses = useMemo(() => {
    const essentialSpent = transactions
      .filter((t) => t.type === 'EXPENSE' && (t.category === 'Rent' || t.category === 'Bills' || t.category === 'Healthcare' || t.category === 'Food'))
      .reduce((sum, t) => sum + t.amount, 0);
    return essentialSpent > 0 ? essentialSpent : Math.round((totalExpenses || 25000) * 0.6);
  }, [transactions, totalExpenses]);

  const compartmentsState = useMemo(() => {
    return calculateCompartmentsState(
      totalBalance,
      totalIncome || 60000,
      monthlyEssentialExpenses,
      goals,
      6
    );
  }, [totalBalance, totalIncome, monthlyEssentialExpenses, goals]);

  const handleCreateTransaction = () => {
    const parsedAmount = parseFloat(newAmount);
    if (!newTitle.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    addTransaction({
      title: newTitle.trim(),
      amount: parsedAmount,
      type: newType,
      category: newCategory,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paymentMethod: newPaymentMethod,
      accountId: accounts[0]?.id || 'acc_primary_01',
      merchant: newTitle.trim(),
    });

    setNewTitle('');
    setNewAmount('');
    setShowAddModal(false);
  };

  const handleSaveCustomCategory = async () => {
    const trimmed = customCatInput.trim();
    if (!trimmed) return;
    await addCustomCategory(trimmed);
    setNewCategory(trimmed);
    setCustomCatInput('');
    setAddingCustomCat(false);
  };

  const handleNavChange = (tab: NavTab) => {
    switch (tab) {
      case 'home':
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

  const pendingAnomaliesCount = anomalies.filter((a) => a.status === 'PENDING').length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        userName={user?.fullName || 'Parth'}
        onPressAdd={() => setShowAddModal(true)}
        onPressNotifications={() => router.push('/anomalies')}
        onPressProfile={() => router.push('/settings')}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Total Income (Starting Salary + Pocket Money) minus Expenses */}
        <IncomeExpenseCard
          startingSalary={startingSalary}
          pocketMoney={pocketMoney}
          income={totalIncome}
          expenses={totalExpenses}
          onSaveIncome={updateIncomeConfig}
        />

        {/* Total Balance Card */}
        <BalanceCard
          balance={totalBalance}
          accounts={accounts}
          activeTab={activeBalanceTab}
          onTabChange={(tab) => {
            setActiveBalanceTab(tab);
            if (tab === 'Transactions') router.push('/transactions');
            if (tab === 'Goals') router.push('/goals');
          }}
        />

        {/* FEATURE 3: SEPARATE FINANCIAL ALLOCATION COMPARTMENTS (Emergency, Investment, Savings) */}
        <View style={{ paddingHorizontal: THEME.spacing.lg, marginTop: THEME.spacing.md }}>
          <FinancialAllocationCompartments
            compartments={compartmentsState}
            onUpdateEmergencyTarget={(_months) => {}}
            onNavigateInvestments={() => router.push('/investments')}
            onNavigateSavings={() => router.push('/goals')}
          />
        </View>

        {/* Direct Gmail Sync & Statement Card */}
        <View style={styles.uploadCardContainer}>
          <TouchableOpacity
            style={styles.uploadHeroCard}
            onPress={() => setShowStatementModal(true)}
            activeOpacity={0.85}
          >
            <View style={styles.uploadHeroHeader}>
              <View style={styles.uploadIconWrap}>
                <Mail size={20} color={THEME.colors.primary} />
              </View>
              <Text style={styles.uploadTitle}>
                {gmailConnected ? 'Sync Gmail Inbox' : 'Connect Gmail & Sync'}
              </Text>
              <ChevronRight size={18} color={THEME.colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Feature Shortcut Quick Actions */}
        <View style={styles.shortcutRow}>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => router.push('/simulator')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#EDE9FE' }]}>
              <Calculator size={18} color={THEME.colors.primary} />
            </View>
            <Text style={styles.shortcutTitle}>Simulator</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => router.push('/recurring')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#E8F8F0' }]}>
              <Repeat size={18} color={THEME.colors.success} />
            </View>
            <Text style={styles.shortcutTitle}>Recurring</Text>
            <Text style={styles.shortcutSubtitle}>
              {formatINR(totalRecurringMonthly)}/mo
            </Text>
          </TouchableOpacity>

          {/* FEATURE 2 ROUTE: Investment Suggestions */}
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => router.push('/investments')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#FEF6EC' }]}>
              <Briefcase size={18} color="#D97706" />
            </View>
            <Text style={styles.shortcutTitle}>Investments</Text>
            <Text style={styles.shortcutSubtitle}>
              Suggestions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => router.push('/analysis')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#E8F5E9' }]}>
              <TrendingUp size={18} color="#10B981" />
            </View>
            <Text style={styles.shortcutTitle}>Evaluation</Text>
            <Text style={styles.shortcutSubtitle}>Allocation</Text>
          </TouchableOpacity>
        </View>

        {/* Anomaly Alert Pill */}
        {pendingAnomaliesCount > 0 && (
          <TouchableOpacity
            style={styles.anomalyBanner}
            onPress={() => router.push('/anomalies')}
            activeOpacity={0.85}
          >
            <View style={styles.anomalyLeft}>
              <AlertTriangle size={16} color={THEME.colors.warning} />
              <Text style={styles.anomalyText}>
                {pendingAnomaliesCount} unusual transaction flagged
              </Text>
            </View>
            <ChevronRight size={16} color={THEME.colors.warning} />
          </TouchableOpacity>
        )}

        {/* Spending Donut Breakdown */}
        <SpendingDonutChart
          totalSpent={totalExpenses}
          budgetTotal={totalIncome}
          categories={categorySpending}
          title="Spendings & Allocation"
          selectedCategory={selectedChartCategory}
          onSelectCategory={(cat) =>
            setSelectedChartCategory((prev) => (prev === cat ? null : cat))
          }
        />

        {/* Insight Card */}
        {insights.length > 0 && (
          <InsightCard
            insight={insights[0]}
            onPressShowAll={() => router.push('/insights')}
            onPressAction={() => router.push('/insights')}
          />
        )}

        {/* Active Savings Goals Card */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Savings Goals</Text>
          <TouchableOpacity
            onPress={() => router.push('/goals')}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>View All</Text>
            <ChevronRight size={14} color={THEME.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: THEME.spacing.lg }}>
          {goals.slice(0, 1).map((goal) => (
            <SavingsGoalCard
              key={goal.id}
              goal={goal}
            />
          ))}
        </View>

        {/* Recent Transactions List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity
            onPress={() => router.push('/transactions')}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>See all ({transactions.length})</Text>
            <ChevronRight size={14} color={THEME.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: THEME.spacing.lg }}>
          {transactions.slice(0, 5).map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              onPress={() => setSelectedTx(tx)}
            />
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Transaction Detail Modal */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity
                onPress={() => setSelectedTx(null)}
                style={styles.closeBtn}
              >
                <X size={18} color={THEME.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <View style={styles.txDetailBody}>
                <View style={styles.txAmountBanner}>
                  <Text
                    style={[
                      styles.txDetailAmount,
                      selectedTx.type === 'INCOME'
                        ? { color: THEME.colors.success }
                        : selectedTx.type === 'INVESTMENT' || selectedTx.category === 'Investment'
                        ? { color: '#047857' }
                        : { color: THEME.colors.textPrimary },
                    ]}
                  >
                    {selectedTx.type === 'INCOME' ? '+' : '−'}
                    {formatINR(selectedTx.amount, true)}
                  </Text>
                  <Text style={styles.txDetailMerchant}>
                    {selectedTx.merchant || selectedTx.title}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{selectedTx.category}</Text>
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={styles.notesLabel}>Change Category</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {availableCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catChip,
                          selectedTx.category === cat && styles.catChipActive,
                        ]}
                        onPress={async () => {
                          await updateTransactionCategory(selectedTx.id, cat);
                          setSelectedTx({ ...selectedTx, category: cat });
                        }}
                      >
                        <Text
                          style={[
                            styles.catChipText,
                            selectedTx.category === cat && styles.catChipTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {lastCategoryPropagationNotice && (
                    <TouchableOpacity
                      onPress={clearCategoryNotice}
                      style={{
                        backgroundColor: '#E8F8F0',
                        padding: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.colors.success }}>
                        {lastCategoryPropagationNotice}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValue}>
                    {selectedTx.date} {selectedTx.time ? `• ${selectedTx.time}` : ''}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Method</Text>
                  <Text style={styles.detailValue}>{selectedTx.paymentMethod}</Text>
                </View>

                {selectedTx.notes && (
                  <View style={styles.detailNotes}>
                    <Text style={styles.notesLabel}>Notes</Text>
                    <Text style={styles.notesText}>{selectedTx.notes}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Transaction Modal with Expense, Income, Investment & Transfer */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Transaction</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={THEME.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.typePill,
                  newType === 'EXPENSE' && newCategory !== 'Investment' && newCategory !== 'Investments' && styles.typePillExpenseActive,
                ]}
                onPress={() => {
                  setNewType('EXPENSE');
                  if (newCategory === 'Investment' || newCategory === 'Investments') {
                    setNewCategory('Food');
                  }
                }}
              >
                <Text
                  style={[
                    styles.typePillText,
                    newType === 'EXPENSE' && newCategory !== 'Investment' && newCategory !== 'Investments' && styles.typePillTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typePill,
                  newType === 'INCOME' && styles.typePillIncomeActive,
                ]}
                onPress={() => {
                  setNewType('INCOME');
                  setNewCategory('Pocket Money');
                }}
              >
                <Text
                  style={[
                    styles.typePillText,
                    newType === 'INCOME' && styles.typePillTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>

              {/* INVESTMENT TAB */}
              <TouchableOpacity
                style={[
                  styles.typePill,
                  (newType === 'INVESTMENT' || newCategory === 'Investment' || newCategory === 'Investments') && styles.typePillInvestmentActive,
                ]}
                onPress={() => {
                  setNewType('INVESTMENT');
                  setNewCategory('Investment');
                }}
              >
                <Text
                  style={[
                    styles.typePillText,
                    (newType === 'INVESTMENT' || newCategory === 'Investment' || newCategory === 'Investments') && styles.typePillTextInvestmentActive,
                  ]}
                >
                  Investment
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typePill,
                  newType === 'TRANSFER' && styles.typePillTransferActive,
                ]}
                onPress={() => {
                  setNewType('TRANSFER');
                  setNewCategory('Other');
                }}
              >
                <Text
                  style={[
                    styles.typePillText,
                    newType === 'TRANSFER' && styles.typePillTextTransferActive,
                  ]}
                >
                  Transfer
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.inputField}
              placeholder={
                newType === 'INVESTMENT' || newCategory === 'Investment' || newCategory === 'Investments'
                  ? 'Description (e.g. Zerodha SIP, Nifty Index, Mutual Fund)'
                  : newType === 'TRANSFER'
                  ? 'Description (e.g. Self Transfer, Savings Account Deposit)'
                  : newType === 'INCOME'
                  ? 'Description (e.g. October Salary Credit, Pocket Money)'
                  : 'Description (e.g. Swiggy Lunch, Grocery Shopping)'
              }
              placeholderTextColor={THEME.colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <TextInput
              style={styles.inputField}
              placeholder="Amount in ₹ (e.g. 5000)"
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType="numeric"
              value={newAmount}
              onChangeText={setNewAmount}
            />

            {/* Category Chips + Custom Category Creator */}
            <View style={styles.catHeaderRow}>
              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity
                onPress={() => setAddingCustomCat((v) => !v)}
                style={styles.newCatToggleBtn}
              >
                <Plus size={12} color={THEME.colors.primary} />
                <Text style={styles.newCatToggleText}>Custom</Text>
              </TouchableOpacity>
            </View>

            {addingCustomCat && (
              <View style={styles.customCatRow}>
                <TextInput
                  style={[styles.inputField, { flex: 1, marginBottom: 0, paddingVertical: 8 }]}
                  placeholder="New category name"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={customCatInput}
                  onChangeText={setCustomCatInput}
                />
                <TouchableOpacity
                  style={styles.saveCustomCatBtn}
                  onPress={handleSaveCustomCategory}
                >
                  <Text style={styles.saveCustomCatText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {availableCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    newCategory === cat && styles.catChipActive,
                  ]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      newCategory === cat && styles.catChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreateTransaction}
            >
              <Text style={styles.submitBtnText}>Save Transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bank Statement Importer Modal */}
      <StatementUploadModal
        visible={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        onImportComplete={() => {}}
      />

      {/* Modern Bottom Navigation */}
      <BottomNavigation activeTab="home" onSelectTab={handleNavChange} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  uploadCardContainer: {
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
  },
  uploadHeroCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  uploadHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  uploadIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    flex: 1,
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  shortcutIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shortcutTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  shortcutSubtitle: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  anomalyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF6EC',
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  anomalyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  anomalyText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: '#B45309',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  sectionTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 37, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.card,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    ...THEME.shadows.hover,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.base,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  txDetailBody: {
    gap: THEME.spacing.md,
  },
  txAmountBanner: {
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    marginVertical: THEME.spacing.sm,
  },
  txDetailAmount: {
    fontSize: THEME.typography.sizes.xxl,
    fontWeight: '800',
  },
  txDetailMerchant: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  detailLabel: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
  },
  detailValue: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  detailNotes: {
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  notesLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  notesText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textPrimary,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: THEME.spacing.md,
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  typePillExpenseActive: {
    backgroundColor: '#FDEDF0',
    borderColor: THEME.colors.danger,
  },
  typePillIncomeActive: {
    backgroundColor: '#E8F8F0',
    borderColor: THEME.colors.success,
  },
  typePillInvestmentActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  typePillTransferActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7654E8',
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  typePillTextActive: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  typePillTextInvestmentActive: {
    color: '#047857',
    fontWeight: '800',
  },
  typePillTextTransferActive: {
    color: '#5D3BC7',
    fontWeight: '800',
  },
  inputField: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: 12,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  catHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  newCatToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
  },
  newCatToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  customCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: THEME.spacing.sm,
  },
  saveCustomCatBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
  },
  saveCustomCatText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: THEME.spacing.md,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  catChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  catChipText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#FFF',
  },
  submitBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
    ...THEME.shadows.soft,
  },
  submitBtnText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: '#FFF',
  },
});
