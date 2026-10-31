import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  Filter,
  ArrowLeft,
  X,
  Calendar,
  CreditCard,
  Tag,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { TransactionItem } from '../components/TransactionItem';
import { StatementUploadModal } from '../components/StatementUploadModal';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';
import { Transaction, TransactionCategory } from '../types/finance';

export default function TransactionsScreen() {
  const router = useRouter();
  const {
    transactions,
    availableCategories,
    updateTransactionCategory,
    lastCategoryPropagationNotice,
    clearCategoryNotice,
  } = useFinance();
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<
    'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'RECURRING'
  >('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const categories = useMemo(
    () => ['ALL', ...availableCategories],
    [availableCategories]
  );

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return transactions.filter((tx) => {
      // Search matching (includes UPI Transaction ID & Paid by/to Bank)
      const matchesSearch =
        tx.title.toLowerCase().includes(q) ||
        (tx.merchant && tx.merchant.toLowerCase().includes(q)) ||
        (tx.upiTransactionId && tx.upiTransactionId.toLowerCase().includes(q)) ||
        (tx.paidByOrToLine && tx.paidByOrToLine.toLowerCase().includes(q)) ||
        tx.amount.toString().includes(searchQuery);

      // Type filter
      let matchesType = true;
      if (selectedType === 'EXPENSE') matchesType = tx.type === 'EXPENSE';
      if (selectedType === 'INCOME') matchesType = tx.type === 'INCOME';
      if (selectedType === 'TRANSFER') matchesType = tx.type === 'TRANSFER';
      if (selectedType === 'RECURRING') matchesType = !!tx.isRecurring;

      // Category filter
      const matchesCategory =
        selectedCategory === 'ALL' || tx.category === selectedCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchQuery, selectedType, selectedCategory]);

  const handleNavChange = (tab: NavTab) => {
    switch (tab) {
      case 'home':
        router.push('/');
        break;
      case 'transactions':
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
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            onPress={() => setShowUploadModal(true)}
            style={styles.countBadge}
            accessibilityLabel="Upload CSV or PDF statement"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <UploadCloud size={12} color={THEME.colors.primary} />
              <Text style={styles.countText}>Upload</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filteredTransactions.length}</Text>
          </View>
        </View>
      </View>

      {lastCategoryPropagationNotice && (
        <TouchableOpacity
          onPress={clearCategoryNotice}
          style={{
            marginHorizontal: THEME.spacing.lg,
            marginBottom: THEME.spacing.xs,
            backgroundColor: '#E8F8F0',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: THEME.borderRadius.md,
            borderWidth: 1,
            borderColor: '#A7F3D0',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.success }}>
            {lastCategoryPropagationNotice} (Tap to dismiss)
          </Text>
        </TouchableOpacity>
      )}

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Search size={18} color={THEME.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by merchant, note, or amount..."
            placeholderTextColor={THEME.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs: ALL / EXPENSE / INCOME / TRANSFER / RECURRING */}
      <View style={styles.typeFilterRow}>
        {(['ALL', 'EXPENSE', 'INCOME', 'TRANSFER', 'RECURRING'] as const).map((type) => {
          const isActive = selectedType === type;
          const label =
            type === 'RECURRING'
              ? 'Recurring'
              : type === 'TRANSFER'
              ? 'Self Transfer'
              : type.charAt(0) + type.slice(1).toLowerCase();
          return (
            <TouchableOpacity
              key={type}
              style={[styles.typeFilterChip, isActive && styles.typeFilterChipActive]}
              onPress={() => setSelectedType(type)}
            >
              <Text
                style={[
                  styles.typeFilterText,
                  isActive && styles.typeFilterTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category Pills */}
      <View style={styles.categoryScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Transactions List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No matching transactions</Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              onPress={() => setSelectedTx(tx)}
            />
          ))
        )}
      </ScrollView>

      {/* Transaction Details Modal */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="slide"
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
                  <Text style={styles.detailLabel}>Transaction Type</Text>
                  <Text style={styles.detailValue}>{selectedTx.type}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{selectedTx.category}</Text>
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.colors.textSecondary }}>
                    Change Category
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {categories
                      .filter((c) => c !== 'ALL')
                      .map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryPill,
                            selectedTx.category === cat && styles.categoryPillActive,
                          ]}
                          onPress={async () => {
                            await updateTransactionCategory(
                              selectedTx.id,
                              cat as TransactionCategory
                            );
                            setSelectedTx({
                              ...selectedTx,
                              category: cat as TransactionCategory,
                            });
                          }}
                        >
                          <Text
                            style={[
                              styles.categoryPillText,
                              selectedTx.category === cat && styles.categoryPillTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Method</Text>
                  <Text style={styles.detailValue}>{selectedTx.paymentMethod}</Text>
                </View>
                {selectedTx.upiTransactionId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>UPI Transaction ID</Text>
                    <Text style={styles.detailValue}>{selectedTx.upiTransactionId}</Text>
                  </View>
                )}
                {selectedTx.paidByOrToLine && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bank Settlement</Text>
                    <Text style={styles.detailValue}>{selectedTx.paidByOrToLine}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValue}>
                    {selectedTx.date} {selectedTx.time ? `at ${selectedTx.time}` : ''}
                  </Text>
                </View>
                {selectedTx.isRecurring && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Recurring Status</Text>
                    <Text style={[styles.detailValue, { color: THEME.colors.primary }]}>
                      Monthly Cycle
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      <StatementUploadModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onImportComplete={() => {}}
      />

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="transactions" onSelectTab={handleNavChange} />
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
  countBadge: {
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  searchWrapper: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
    ...THEME.shadows.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textPrimary,
  },
  typeFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.lg,
    gap: 8,
    marginVertical: THEME.spacing.xs,
  },
  typeFilterChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  typeFilterChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  typeFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  typeFilterTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  categoryScrollWrapper: {
    marginVertical: THEME.spacing.sm,
  },
  categoryScroll: {
    paddingHorizontal: THEME.spacing.lg,
    gap: 6,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.lavenderLight,
  },
  categoryPillActive: {
    backgroundColor: THEME.colors.primary,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  categoryPillTextActive: {
    color: '#FFF',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.xs,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
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
    marginVertical: THEME.spacing.xs,
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
    paddingVertical: 5,
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
});
