import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  X,
  Tag,
  Trash2,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { SpendingDonutChart } from '../components/SpendingDonutChart';
import { ForecastBarChart } from '../components/ForecastBarChart';
import { RecurringPaymentCard } from '../components/RecurringPaymentCard';
import { TransactionItem } from '../components/TransactionItem';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';
import { CUSTOM_CATEGORY_PALETTE, getCategoryMeta } from '../constants/categories';
import { Transaction, TransactionCategory } from '../types/finance';

export default function InsightsScreen() {
  const router = useRouter();
  const {
    transactions,
    categorySpending,
    availableExpenseCategories,
    availableCategories,
    customCategories,
    customCategoryColors,
    addCustomCategory,
    removeCustomCategory,
    updateTransactionCategory,
    totalIncome,
    totalExpenses,
    recurring,
    anomalies,
    forecast,
    reviewAnomaly,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'Spending' | 'Recurring' | 'Anomalies'>('Spending');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categorySpending[0]?.category || 'Food'
  );
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>(CUSTOM_CATEGORY_PALETTE[0]);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

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

  // All selectable categories (merged from defaults, custom categories, and active spending)
  const pickerCategories = useMemo(() => {
    const set = new Set<string>(availableExpenseCategories);
    categorySpending.forEach((c) => set.add(c.category));
    return Array.from(set);
  }, [availableExpenseCategories, categorySpending]);

  const activeCategoryStats = useMemo(() => {
    const found = categorySpending.find((c) => c.category === selectedCategory);
    if (found) return found;
    const meta = getCategoryMeta(selectedCategory, customCategoryColors);
    return {
      category: selectedCategory,
      amount: 0,
      percentage: 0,
      color: meta.color,
      iconName: meta.iconName,
      transactionCount: 0,
    };
  }, [categorySpending, selectedCategory, customCategoryColors]);

  const categoryTransactions = useMemo(
    () =>
      transactions.filter(
        (tx) => tx.type === 'EXPENSE' && tx.category === selectedCategory
      ),
    [transactions, selectedCategory]
  );

  const handleCreateCustomCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    await addCustomCategory(trimmed, newCategoryColor);
    setSelectedCategory(trimmed);
    setNewCategoryName('');
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
        <Text style={styles.headerTitle}>Spending & Insights</Text>
        <TouchableOpacity
          onPress={() => setShowCustomizeModal(true)}
          style={styles.customizeBtn}
          accessibilityLabel="Customize categories"
        >
          <Plus size={14} color={THEME.colors.primary} />
          <Text style={styles.customizeBtnText}>Categories</Text>
        </TouchableOpacity>
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
            {/* Interactive Category Picker & Customizer Bar */}
            <View style={styles.categoryPickerWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPickerScroll}
              >
                {pickerCategories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const meta = getCategoryMeta(cat, customCategoryColors);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catChip,
                        isSelected && {
                          backgroundColor: meta.color,
                          borderColor: meta.color,
                        },
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.catChipDot,
                          { backgroundColor: isSelected ? '#FFF' : meta.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.catChipText,
                          isSelected && styles.catChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.addCatChip}
                  onPress={() => setShowCustomizeModal(true)}
                  activeOpacity={0.8}
                >
                  <Plus size={13} color={THEME.colors.primary} />
                  <Text style={styles.addCatChipText}>Add Category</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Selected Category Spotlight Card */}
            <View
              style={[
                styles.heroCard,
                { borderColor: `${activeCategoryStats.color}55` },
              ]}
            >
              <View style={styles.heroTop}>
                <View
                  style={[
                    styles.heroIconCircle,
                    { backgroundColor: `${activeCategoryStats.color}18` },
                  ]}
                >
                  <Tag size={18} color={activeCategoryStats.color} />
                </View>
                <View
                  style={[
                    styles.heroBadge,
                    { backgroundColor: `${activeCategoryStats.color}18` },
                  ]}
                >
                  <Text style={[styles.heroBadgeText, { color: activeCategoryStats.color }]}>
                    {activeCategoryStats.percentage}% of Expenses
                  </Text>
                </View>
              </View>
              <Text style={styles.heroCategory}>{activeCategoryStats.category}</Text>
              <View style={styles.heroBottomRow}>
                <Text style={styles.heroAmount}>
                  {formatINR(activeCategoryStats.amount)}
                </Text>
                <Text style={styles.heroTxCount}>
                  {activeCategoryStats.transactionCount} transaction
                  {activeCategoryStats.transactionCount === 1 ? '' : 's'}
                </Text>
              </View>
            </View>

            {/* Spending Donut Chart Breakdown (synced with selected category) */}
            <SpendingDonutChart
              totalSpent={totalExpenses}
              budgetTotal={totalIncome}
              categories={categorySpending}
              title="Category Distribution"
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
            />

            {/* Forecast Bar Chart */}
            <ForecastBarChart
              forecast={forecast}
              onPressForecastDetail={() => router.push('/analysis')}
            />

            {/* Selected Category Transactions (tap to reassign category) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedCategory} Transactions ({categoryTransactions.length})
              </Text>
            </View>

            <View style={styles.cardsList}>
              {categoryTransactions.length === 0 ? (
                <View style={styles.emptyCatBox}>
                  <Text style={styles.emptyCatText}>
                    No expenses in {selectedCategory} yet. Tap any transaction in History to assign it here.
                  </Text>
                </View>
              ) : (
                categoryTransactions.slice(0, 6).map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    onPress={() => setEditingTx(tx)}
                  />
                ))
              )}
            </View>

            {/* All Expense Categories Comparison Cards */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Categories</Text>
            </View>

            <View style={styles.cardsList}>
              {categorySpending.map((cat) => {
                const isSelected = selectedCategory === cat.category;
                return (
                  <TouchableOpacity
                    key={cat.category}
                    style={[
                      styles.categoryCard,
                      isSelected && {
                        borderColor: cat.color,
                        backgroundColor: '#FAF9FE',
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat.category)}
                    activeOpacity={0.8}
                  >
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
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 2: RECURRING PAYMENTS */}
        {activeTab === 'Recurring' && (
          <View style={{ paddingHorizontal: THEME.spacing.lg }}>
            <View style={styles.recurringSummaryBox}>
              <Text style={styles.recurringSummaryLabel}>
                Monthly Commitment
              </Text>
              <Text style={styles.recurringSummaryAmount}>
                {formatINR(recurring.reduce((s, r) => s + r.amount, 0))}
              </Text>
            </View>

            <View style={[styles.sectionHeader, { paddingHorizontal: 0 }]}>
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
                    Average: {formatINR(item.typicalAverage)}
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
                      Status: {item.status === 'CONFIRMED' ? 'Confirmed' : 'Dismissed'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Customize Categories Modal */}
      <Modal
        visible={showCustomizeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomizeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customize Categories</Text>
              <TouchableOpacity
                onPress={() => setShowCustomizeModal(false)}
                style={{ padding: 4 }}
              >
                <X size={18} color={THEME.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalFieldLabel}>New Category Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Gym, Education, Pet Care, Gifts"
              placeholderTextColor={THEME.colors.textMuted}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />

            <Text style={styles.modalFieldLabel}>Color</Text>
            <View style={styles.colorSwatchesRow}>
              {CUSTOM_CATEGORY_PALETTE.map((swatch) => {
                const active = newCategoryColor === swatch;
                return (
                  <TouchableOpacity
                    key={swatch}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: swatch },
                      active && styles.colorSwatchActive,
                    ]}
                    onPress={() => setNewCategoryColor(swatch)}
                  />
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.createCatBtn,
                !newCategoryName.trim() && { opacity: 0.5 },
              ]}
              onPress={handleCreateCustomCategory}
              disabled={!newCategoryName.trim()}
            >
              <Plus size={16} color="#FFF" />
              <Text style={styles.createCatBtnText}>Add Category</Text>
            </TouchableOpacity>

            {customCategories.length > 0 && (
              <View style={{ marginTop: THEME.spacing.md }}>
                <Text style={styles.modalFieldLabel}>Your Custom Categories</Text>
                <View style={{ gap: 6 }}>
                  {customCategories.map((c) => (
                    <View key={c.name} style={styles.customCatItemRow}>
                      <View style={styles.catLeft}>
                        <View
                          style={[styles.catColorDot, { backgroundColor: c.color }]}
                        />
                        <Text style={styles.catName}>{c.name}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={async () => {
                          if (selectedCategory === c.name) {
                            setSelectedCategory('Food');
                          }
                          await removeCustomCategory(c.name);
                        }}
                        style={{ padding: 4 }}
                      >
                        <Trash2 size={15} color={THEME.colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Quick Reassign Transaction Category Modal */}
      <Modal
        visible={!!editingTx}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingTx(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTx?.title || 'Change Category'}
              </Text>
              <TouchableOpacity
                onPress={() => setEditingTx(null)}
                style={{ padding: 4 }}
              >
                <X size={18} color={THEME.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {editingTx && (
              <View style={{ gap: 10 }}>
                <Text style={styles.modalFieldLabel}>Select Category</Text>
                <View style={styles.reassignWrap}>
                  {availableCategories.map((cat) => {
                    const active = editingTx.category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catChip,
                          active && {
                            backgroundColor: THEME.colors.primary,
                            borderColor: THEME.colors.primary,
                          },
                        ]}
                        onPress={async () => {
                          await updateTransactionCategory(
                            editingTx.id,
                            cat as TransactionCategory
                          );
                          setSelectedCategory(cat);
                          setEditingTx(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.catChipText,
                            active && styles.catChipTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

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
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.full,
  },
  customizeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.lavenderLight,
    borderRadius: THEME.borderRadius.full,
    marginHorizontal: THEME.spacing.lg,
    padding: 4,
    marginBottom: THEME.spacing.sm,
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
  categoryPickerWrap: {
    marginTop: 4,
    marginBottom: THEME.spacing.sm,
  },
  categoryPickerScroll: {
    paddingHorizontal: THEME.spacing.lg,
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  catChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  catChipTextActive: {
    color: '#FFF',
  },
  addCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.lavenderLight,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  addCatChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  heroCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.lg,
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.xs,
  },
  heroIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  heroCategory: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  heroAmount: {
    fontSize: THEME.typography.sizes.xxl,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  heroTxCount: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
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
  emptyCatBox: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    alignItems: 'center',
  },
  emptyCatText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
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
    marginTop: 4,
  },
  anomalyCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 37, 0.5)',
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
    marginBottom: THEME.spacing.md,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: 11,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  colorSwatchesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: THEME.spacing.lg,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: '#171725',
  },
  createCatBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: THEME.borderRadius.lg,
    ...THEME.shadows.soft,
  },
  createCatBtnText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: '#FFF',
  },
  customCatItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  reassignWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
