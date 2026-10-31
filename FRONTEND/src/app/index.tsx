import React, { useState } from 'react';
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
  Award,
  ChevronRight,
  Plus,
  X,
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Building2,
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
import { StatementUploadModal } from '../components/StatementUploadModal';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';
import { Transaction, TransactionCategory, PaymentMethod } from '../types/finance';

export default function HomeScreen() {
  const router = useRouter();
  const {
    user,
    transactions,
    accounts,
    goals,
    anomalies,
    totalIncome,
    totalExpenses,
    totalBalance,
    categorySpending,
    insights,
    totalRecurringMonthly,
    lastCategoryPropagationNotice,
    clearCategoryNotice,
    addTransaction,
    updateTransactionCategory,
    contributeToGoal,
  } = useFinance();

  const [activeBalanceTab, setActiveBalanceTab] = useState<'Overview' | 'Transactions' | 'Goals'>('Overview');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);

  // New Transaction Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<TransactionCategory>('Food');
  const [newType, setNewType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>('UPI');

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
      accountId: accounts[0]?.id || 'acc_hdfc_01',
      merchant: newTitle.trim(),
    });

    setNewTitle('');
    setNewAmount('');
    setShowAddModal(false);
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
        {/* Balance Card Section */}
        <BalanceCard
          balance={totalBalance}
          accounts={accounts}
          activeTab={activeBalanceTab}
          onTabChange={(tab) => {
            setActiveBalanceTab(tab);
            if (tab === 'Transactions') router.push('/transactions');
            if (tab === 'Goals') router.push('/goals');
          }}
          onPressCard={() => router.push('/settings')}
        />

        {/* Total Income & Expense Two Compact Cards */}
        <IncomeExpenseCard
          income={totalIncome}
          expenses={totalExpenses}
          dateRangeLabel="October 2026"
        />

        {/* Upload Bank Statement & Offline Document Import (New Feature) */}
        <View style={styles.uploadCardContainer}>
          <TouchableOpacity
            style={styles.uploadHeroCard}
            onPress={() => setShowStatementModal(true)}
            activeOpacity={0.85}
          >
            <View style={styles.uploadHeroHeader}>
              <View style={styles.uploadIconWrap}>
                <UploadCloud size={20} color={THEME.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.uploadTitleRow}>
                  <Text style={styles.uploadTitle}>Upload Bank Statement</Text>
                  <View style={styles.offlinePillBadge}>
                    <Text style={styles.offlinePillText}>100% On-Device</Text>
                  </View>
                </View>
                <Text style={styles.uploadSub}>
                  Upload HDFC, SBI, ICICI CSV statements or scan UPI SMS notifications locally.
                </Text>
              </View>
            </View>

            <View style={styles.uploadQuickButtonsRow}>
              <View style={styles.uploadOptionPill}>
                <FileSpreadsheet size={12} color={THEME.colors.primary} />
                <Text style={styles.uploadOptionText}>Upload CSV / PDF</Text>
              </View>
              <View style={styles.uploadOptionPill}>
                <Building2 size={12} color="#D97706" />
                <Text style={[styles.uploadOptionText, { color: '#B45309' }]}>HDFC / SBI Sample</Text>
              </View>
              <View style={styles.uploadOptionPill}>
                <Sparkles size={12} color={THEME.colors.success} />
                <Text style={[styles.uploadOptionText, { color: THEME.colors.success }]}>Sync UPI SMS</Text>
              </View>
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
            <Text style={styles.shortcutTitle}>Purchase Simulator</Text>
            <Text style={styles.shortcutSubtitle}>Can I afford a laptop?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => router.push('/recurring')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#E8F8F0' }]}>
              <Repeat size={18} color={THEME.colors.success} />
            </View>
            <Text style={styles.shortcutTitle}>Recurring Bills</Text>
            <Text style={styles.shortcutSubtitle}>
              {formatINR(totalRecurringMonthly)}/mo committed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Anomaly Alert Pill (if any pending) */}
        {pendingAnomaliesCount > 0 && (
          <TouchableOpacity
            style={styles.anomalyBanner}
            onPress={() => router.push('/anomalies')}
            activeOpacity={0.85}
          >
            <View style={styles.anomalyLeft}>
              <AlertTriangle size={16} color={THEME.colors.warning} />
              <Text style={styles.anomalyText}>
                {pendingAnomaliesCount} unusual transaction flagged for review
              </Text>
            </View>
            <ChevronRight size={16} color={THEME.colors.warning} />
          </TouchableOpacity>
        )}

        {/* Spending Donut Breakdown with Mascot in Center */}
        <SpendingDonutChart
          totalSpent={totalExpenses}
          budgetTotal={totalIncome}
          categories={categorySpending}
          title="Spendings & Goals"
        />

        {/* AI Insight Card */}
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
              onPressAddMoney={() => contributeToGoal(goal.id, 1000)}
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
              <Text style={styles.modalTitle}>Transaction Breakdown</Text>
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
                  <Text style={styles.notesLabel}>
                    Correct Category (Auto-applies to similar merchant rows)
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {(
                      [
                        'Food',
                        'Rent',
                        'Shopping',
                        'Travel',
                        'Bills',
                        'Entertainment',
                        'Salary',
                        'Healthcare',
                        'Other',
                      ] as TransactionCategory[]
                    ).map((cat) => (
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
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Storage Mode</Text>
                  <Text style={[styles.detailValue, { color: THEME.colors.success }]}>
                    Local SQLite / On-Device
                  </Text>
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

      {/* Add Transaction Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Local Transaction</Text>
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
                  newType === 'EXPENSE' && styles.typePillExpenseActive,
                ]}
                onPress={() => setNewType('EXPENSE')}
              >
                <Text
                  style={[
                    styles.typePillText,
                    newType === 'EXPENSE' && styles.typePillTextActive,
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
                onPress={() => setNewType('INCOME')}
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
            </View>

            <TextInput
              style={styles.inputField}
              placeholder="Description (e.g. Swiggy Lunch, BESCOM bill)"
              placeholderTextColor={THEME.colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <TextInput
              style={styles.inputField}
              placeholder="Amount in ₹ (e.g. 850)"
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType="numeric"
              value={newAmount}
              onChangeText={setNewAmount}
            />

            {/* Category Chips */}
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {(
                [
                  'Food',
                  'Rent',
                  'Shopping',
                  'Travel',
                  'Bills',
                  'Entertainment',
                  'Salary',
                  'Healthcare',
                  'Other',
                ] as TransactionCategory[]
              ).map((cat) => (
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
              <Text style={styles.submitBtnText}>Save Offline Transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Offline Bank Statement Importer Modal */}
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
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
    ...THEME.shadows.card,
  },
  uploadHeroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: THEME.spacing.md,
  },
  uploadIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  uploadTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  uploadTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  offlinePillBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.full,
  },
  offlinePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.success,
  },
  uploadSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  uploadQuickButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  uploadOptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  uploadOptionText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.primary,
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
    gap: THEME.spacing.md,
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
  typePillText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  typePillTextActive: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
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
  inputLabel: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
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
