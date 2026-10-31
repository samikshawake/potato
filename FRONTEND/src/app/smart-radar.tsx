import React, { useState } from 'react';
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
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
  Plus,
  CheckCircle2,
  Clock,
  Mail,
  X,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';

type RadarTab = 'refunds' | 'creep' | 'warranty' | 'splits';

export default function SmartRadarScreen() {
  const router = useRouter();
  const {
    refundItems,
    warrantyItems,
    priceCreepAlerts,
    splitItems,
    gmailConnected,
    syncFromGmailInbox,
    toggleRefundStatus,
    addRefundItem,
    addWarrantyItem,
    addSplitItem,
    settleSplitItem,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<RadarTab>('refunds');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add item form state
  const [field1, setField1] = useState('');
  const [field2, setField2] = useState('');
  const [amountInput, setAmountInput] = useState('');

  const handleQuickGmailScan = async () => {
    setSyncing(true);
    setSyncMsg(null);
    const res = await syncFromGmailInbox(
      activeTab === 'warranty' ? 'receipts' : 'refunds',
      false
    );
    setSyncing(false);
    if (res.ok) {
      setSyncMsg(
        `Scanned ${res.scannedEmails || 0} emails • ${res.importedCount || 0} new txns, ${
          (res.refundsFound || 0) + (res.warrantiesFound || 0) + (res.priceAlertsFound || 0)
        } smart alerts synced.`
      );
    } else if (res.error) {
      setSyncMsg(res.error);
    }
  };

  const handleAddSubmit = async () => {
    const amt = parseFloat(amountInput) || 0;
    if (!field1.trim()) return;
    if (activeTab === 'refunds' && amt > 0) {
      await addRefundItem(field1.trim(), field2.trim() || 'Order Refund', amt);
    } else if (activeTab === 'warranty') {
      await addWarrantyItem(field1.trim(), field2.trim() || 'Online Store', amt);
    } else if (activeTab === 'splits' && amt > 0) {
      await addSplitItem(field1.trim(), field2.trim() || 'Friend', amt * 2, amt);
    }
    setField1('');
    setField2('');
    setAmountInput('');
    setShowAddModal(false);
  };

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

  const pendingRefundSum = refundItems
    .filter((r) => r.status === 'PENDING')
    .reduce((s, r) => s + r.amount, 0);
  const pendingSplitSum = splitItems
    .filter((s) => s.status === 'PENDING')
    .reduce((acc, s) => acc + s.owedToYouAmount, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.iconBtn}>
          <ArrowLeft size={20} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Radar</Text>
        <TouchableOpacity
          onPress={handleQuickGmailScan}
          style={[styles.syncPillBtn, syncing && { opacity: 0.65 }]}
          disabled={syncing}
        >
          <Mail size={13} color="#FFF" />
          <Text style={styles.syncPillText}>
            {syncing ? 'Scanning...' : gmailConnected ? 'Scan Gmail' : 'Connect Gmail'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Strip */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Pending Refunds</Text>
          <Text style={[styles.summaryVal, { color: THEME.colors.warning }]}>
            {formatINR(pendingRefundSum)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Price / Trial Alerts</Text>
          <Text style={[styles.summaryVal, { color: THEME.colors.danger }]}>
            {priceCreepAlerts.length}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Owed To You</Text>
          <Text style={[styles.summaryVal, { color: THEME.colors.success }]}>
            {formatINR(pendingSplitSum)}
          </Text>
        </View>
      </View>

      {syncMsg && (
        <View style={styles.syncNotice}>
          <Text style={styles.syncNoticeText}>{syncMsg}</Text>
        </View>
      )}

      {/* Feature Tabs */}
      <View style={styles.tabBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {(
            [
              { id: 'refunds', label: 'Refunds' },
              { id: 'creep', label: 'Price Creep' },
              { id: 'warranty', label: 'Warranties' },
              { id: 'splits', label: 'Split Bills' },
            ] as const
          ).map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabChip, activeTab === t.id && styles.tabChipActive]}
              onPress={() => setActiveTab(t.id)}
            >
              <Text style={[styles.tabChipText, activeTab === t.id && styles.tabChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. PENDING REFUNDS & FAILED-UPI REVERSALS */}
        {activeTab === 'refunds' && (
          <>
            <View style={styles.sectionTopRow}>
              <Text style={styles.sectionHeading}>Refund & Reversal Watch</Text>
              <TouchableOpacity
                style={styles.addSmallBtn}
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={13} color={THEME.colors.primary} />
                <Text style={styles.addSmallText}>Track Refund</Text>
              </TouchableOpacity>
            </View>
            {refundItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.merchant}</Text>
                    <Text style={styles.itemSub}>{item.title}</Text>
                  </View>
                  <Text style={styles.itemAmount}>{formatINR(item.amount)}</Text>
                </View>
                <View style={styles.itemFooter}>
                  <View style={styles.metaRow}>
                    {item.status === 'CREDITED' ? (
                      <CheckCircle2 size={13} color={THEME.colors.success} />
                    ) : (
                      <Clock size={13} color={THEME.colors.warning} />
                    )}
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            item.status === 'CREDITED'
                              ? THEME.colors.success
                              : THEME.colors.warning,
                        },
                      ]}
                    >
                      {item.status === 'CREDITED'
                        ? 'Credited to Bank'
                        : `Expected by ${item.expectedByDate}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.actionOutlineBtn}
                    onPress={() => toggleRefundStatus(item.id)}
                  >
                    <Text style={styles.actionOutlineText}>
                      {item.status === 'PENDING' ? 'Mark Credited' : 'Reopen'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* 2. SILENT SUBSCRIPTION PRICE-CREEP & FREE-TRIAL RADAR */}
        {activeTab === 'creep' && (
          <>
            <View style={styles.sectionTopRow}>
              <Text style={styles.sectionHeading}>Price-Creep & Trial Radar</Text>
            </View>
            {priceCreepAlerts.map((alert) => (
              <View key={alert.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ShieldAlert
                      size={18}
                      color={
                        alert.alertType === 'FREE_TRIAL_ENDING'
                          ? THEME.colors.warning
                          : THEME.colors.danger
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{alert.serviceName}</Text>
                      <Text style={styles.itemSub}>
                        {alert.alertType === 'FREE_TRIAL_ENDING'
                          ? `Trial converts to ${formatINR(alert.newAmount)}/mo`
                          : `${formatINR(alert.previousAmount)} → ${formatINR(alert.newAmount)}/mo`}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.noteText}>{alert.note}</Text>
              </View>
            ))}
          </>
        )}

        {/* 3. WARRANTY & RETURN-WINDOW VAULT */}
        {activeTab === 'warranty' && (
          <>
            <View style={styles.sectionTopRow}>
              <Text style={styles.sectionHeading}>Warranty & Return Vault</Text>
              <TouchableOpacity
                style={styles.addSmallBtn}
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={13} color={THEME.colors.primary} />
                <Text style={styles.addSmallText}>Add Receipt</Text>
              </TouchableOpacity>
            </View>
            {warrantyItems.map((w) => (
              <View key={w.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{w.productName}</Text>
                    <Text style={styles.itemSub}>
                      {w.merchant} • Purchased {w.purchaseDate}
                    </Text>
                  </View>
                  {w.amount > 0 && <Text style={styles.itemAmount}>{formatINR(w.amount)}</Text>}
                </View>
                <View style={styles.warrantyDatesRow}>
                  <View style={styles.datePill}>
                    <RefreshCw size={11} color={THEME.colors.primary} />
                    <Text style={styles.datePillText}>Return by {w.returnWindowEnds}</Text>
                  </View>
                  <View style={styles.datePill}>
                    <ShieldCheck size={11} color={THEME.colors.success} />
                    <Text style={styles.datePillText}>Warranty till {w.warrantyExpires}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* 4. GROUP ORDER & PENDING UPI SPLIT LEDGER */}
        {activeTab === 'splits' && (
          <>
            <View style={styles.sectionTopRow}>
              <Text style={styles.sectionHeading}>Pending UPI Split Ledger</Text>
              <TouchableOpacity
                style={styles.addSmallBtn}
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={13} color={THEME.colors.primary} />
                <Text style={styles.addSmallText}>Add Split</Text>
              </TouchableOpacity>
            </View>
            {splitItems.map((sp) => (
              <View key={sp.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Users size={16} color={THEME.colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{sp.title}</Text>
                      <Text style={styles.itemSub}>
                        {sp.friendName} • Total bill {formatINR(sp.totalBillAmount)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemAmount}>{formatINR(sp.owedToYouAmount)}</Text>
                </View>
                <View style={styles.itemFooter}>
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          sp.status === 'SETTLED' ? THEME.colors.success : THEME.colors.primary,
                      },
                    ]}
                  >
                    {sp.status === 'SETTLED' ? 'Settled via UPI' : 'Awaiting UPI Settlement'}
                  </Text>
                  {sp.status === 'PENDING' && (
                    <TouchableOpacity
                      style={styles.actionOutlineBtn}
                      onPress={() => settleSplitItem(sp.id)}
                    >
                      <Text style={styles.actionOutlineText}>Mark Settled</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Quick Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeTab === 'refunds'
                  ? 'Track Pending Refund'
                  : activeTab === 'warranty'
                  ? 'Add Product Warranty'
                  : 'Add Split Bill'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={18} color={THEME.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder={
                activeTab === 'refunds'
                  ? 'Merchant (e.g. Amazon, Zomato)'
                  : activeTab === 'warranty'
                  ? 'Product Name (e.g. AirPods Pro)'
                  : 'Expense Title (e.g. Goa Cab Split)'
              }
              placeholderTextColor={THEME.colors.textMuted}
              value={field1}
              onChangeText={setField1}
            />

            <TextInput
              style={styles.input}
              placeholder={
                activeTab === 'refunds'
                  ? 'Reason / Order Ref'
                  : activeTab === 'warranty'
                  ? 'Store Name'
                  : 'Friend Name (e.g. Aarav)'
              }
              placeholderTextColor={THEME.colors.textMuted}
              value={field2}
              onChangeText={setField2}
            />

            <TextInput
              style={styles.input}
              placeholder={
                activeTab === 'splits' ? 'Amount owed to you (₹)' : 'Amount in ₹'
              }
              placeholderTextColor={THEME.colors.textMuted}
              keyboardType="numeric"
              value={amountInput}
              onChangeText={setAmountInput}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleAddSubmit}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavigation activeTab="home" onSelectTab={handleNavChange} />
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
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  syncPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
  },
  syncPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  syncNotice: {
    marginHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
    backgroundColor: THEME.colors.lavenderLight,
    padding: 8,
    borderRadius: THEME.borderRadius.md,
  },
  syncNoticeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
    textAlign: 'center',
  },
  tabBarWrap: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  tabScroll: {
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tabChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  tabChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  tabChipTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 24,
  },
  sectionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  sectionHeading: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
  },
  addSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  itemCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.sm,
    ...THEME.shadows.card,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  itemSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionOutlineBtn: {
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
  },
  actionOutlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  noteText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 8,
    lineHeight: 16,
  },
  warrantyDatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  datePill: {
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
  datePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 37, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: THEME.colors.card,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  input: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.sm,
  },
  saveBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 13,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: '#FFF',
  },
});
