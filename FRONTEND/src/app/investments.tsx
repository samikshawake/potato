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
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock,
  Zap,
  Sparkles,
  ChevronRight,
  X,
  HelpCircle,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import { useFinance } from '../context/FinanceContext';
import {
  analyzeInvestmentSuggestions,
  VERIFIED_INVESTMENT_PRODUCTS,
} from '../services/investmentSuggestionsEngine';
import { BottomNavigation, NavTab } from '../components/BottomNavigation';
import { InvestmentProduct } from '../types/finance';

export default function InvestmentSuggestionsScreen() {
  const router = useRouter();
  const { transactions, totalBalance, accounts } = useFinance();

  const [investmentInput, setInvestmentInput] = useState('10000');
  const [activeTab, setActiveTab] = useState<'LOW_RISK' | 'HIGH_RISK' | 'RISK_TABLE'>('LOW_RISK');
  const [selectedProduct, setSelectedProduct] = useState<InvestmentProduct | null>(null);

  const parsedAmount = Math.max(0, parseFloat(investmentInput) || 0);

  const analysis = useMemo(
    () => analyzeInvestmentSuggestions(parsedAmount, transactions, totalBalance, 6),
    [parsedAmount, transactions, totalBalance]
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backBtn}>
          <ArrowLeft size={20} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Investment Suggestions</Text>
        <TouchableOpacity onPress={() => router.push('/analysis')} style={styles.infoBtn}>
          <HelpCircle size={18} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Investment Amount Selection Card */}
        <View style={styles.amountCard}>
          <View style={styles.cardHeaderRow}>
            <Sparkles size={18} color={THEME.colors.primary} />
            <Text style={styles.amountCardTitle}>Enter Amount You Want to Invest</Text>
          </View>
          <Text style={styles.amountCardSub}>
            We analyze your liquid capacity, emergency fund adequacy, and liabilities before suggesting products.
          </Text>

          <View style={styles.inputWrap}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              value={investmentInput}
              onChangeText={setInvestmentInput}
              placeholder="10000"
            />
          </View>

          {/* Preset Buttons */}
          <View style={styles.presetRow}>
            {['5000', '10000', '25000', '50000', '100000'].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.presetChip,
                  investmentInput === val && styles.presetChipActive,
                ]}
                onPress={() => setInvestmentInput(val)}
              >
                <Text
                  style={[
                    styles.presetText,
                    investmentInput === val && styles.presetTextActive,
                  ]}
                >
                  ₹{parseInt(val, 10).toLocaleString('en-IN')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Priority Warning Note (if emergency fund underfunded) */}
        {analysis.personalizedRecommendation.prioritizeEmergencyOrDebtFirstNote && (
          <View style={styles.warningBanner}>
            <AlertTriangle size={18} color="#B45309" />
            <Text style={styles.warningBannerText}>
              {analysis.personalizedRecommendation.prioritizeEmergencyOrDebtFirstNote}
            </Text>
          </View>
        )}

        {/* Personalized Strategy Banner */}
        <View style={styles.strategyBanner}>
          <Text style={styles.strategyTitle}>Personalized Strategy Recommendation</Text>
          <Text style={styles.strategyTopCat}>
            Top Suggestion: {analysis.personalizedRecommendation.topCategorySuggestion}
          </Text>

          <View style={styles.splitBarRow}>
            <View
              style={[
                styles.splitBarSegment,
                { flex: analysis.personalizedRecommendation.suggestedLowRiskAlloc || 50, backgroundColor: '#37B879' },
              ]}
            />
            <View
              style={[
                styles.splitBarSegment,
                { flex: analysis.personalizedRecommendation.suggestedHighRiskAlloc || 50, backgroundColor: THEME.colors.primary },
              ]}
            />
          </View>

          <View style={styles.splitDetailsRow}>
            <Text style={styles.splitDetailText}>
              🛡️ Low Risk: <Text style={{ fontWeight: '800', color: '#37B879' }}>{analysis.personalizedRecommendation.suggestedLowRiskAlloc}%</Text>
            </Text>
            <Text style={styles.splitDetailText}>
              📈 High Risk: <Text style={{ fontWeight: '800', color: THEME.colors.primary }}>{analysis.personalizedRecommendation.suggestedHighRiskAlloc}%</Text>
            </Text>
          </View>

          <Text style={styles.strategyReasoning}>
            {analysis.personalizedRecommendation.reasoning}
          </Text>
        </View>

        {/* Compartment Tabs: Low Risk / High Risk / Risk Table */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'LOW_RISK' && styles.tabBtnActive]}
            onPress={() => setActiveTab('LOW_RISK')}
          >
            <ShieldCheck size={14} color={activeTab === 'LOW_RISK' ? '#FFF' : '#10B981'} />
            <Text style={[styles.tabText, activeTab === 'LOW_RISK' && styles.tabTextActive]}>
              Low-Risk ({analysis.eligibleLowRiskProducts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'HIGH_RISK' && styles.tabBtnActive]}
            onPress={() => setActiveTab('HIGH_RISK')}
          >
            <TrendingUp size={14} color={activeTab === 'HIGH_RISK' ? '#FFF' : THEME.colors.primary} />
            <Text style={[styles.tabText, activeTab === 'HIGH_RISK' && styles.tabTextActive]}>
              High-Risk ({analysis.eligibleHighRiskProducts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'RISK_TABLE' && styles.tabBtnActive]}
            onPress={() => setActiveTab('RISK_TABLE')}
          >
            <Info size={14} color={activeTab === 'RISK_TABLE' ? '#FFF' : THEME.colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'RISK_TABLE' && styles.tabTextActive]}>
              Risk Matrix
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB A: LOW RISK PRODUCTS */}
        {activeTab === 'LOW_RISK' && (
          <View style={styles.productsList}>
            {analysis.eligibleLowRiskProducts.map((prod) => (
              <TouchableOpacity
                key={prod.id}
                style={styles.productCard}
                onPress={() => setSelectedProduct(prod)}
                activeOpacity={0.85}
              >
                <View style={styles.productHeader}>
                  <View style={styles.productBadgeLow}>
                    <ShieldCheck size={12} color="#047857" />
                    <Text style={styles.productBadgeLowText}>{prod.riskLevel} Risk</Text>
                  </View>
                  <Text style={styles.verifiedTag}>Verified ({prod.lastUpdatedDate})</Text>
                </View>

                <Text style={styles.productTitle}>{prod.name}</Text>
                <Text style={styles.productReturn}>Return: {prod.expectedReturnRate}</Text>

                <View style={styles.productMetaGrid}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Min Investment</Text>
                    <Text style={styles.metaVal}>{formatINR(prod.minInvestmentAmount)}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Duration</Text>
                    <Text style={styles.metaVal}>{prod.duration}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Liquidity</Text>
                    <Text style={styles.metaVal}>{prod.liquidity}</Text>
                  </View>
                </View>

                <View style={styles.cardFooterRow}>
                  <Text style={styles.dataSrcText}>Source: {prod.verifiedDataSource}</Text>
                  <ChevronRight size={16} color={THEME.colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* TAB B: HIGH RISK PRODUCTS */}
        {activeTab === 'HIGH_RISK' && (
          <View style={styles.productsList}>
            {analysis.eligibleHighRiskProducts.map((prod) => (
              <TouchableOpacity
                key={prod.id}
                style={styles.productCard}
                onPress={() => setSelectedProduct(prod)}
                activeOpacity={0.85}
              >
                <View style={styles.productHeader}>
                  <View style={styles.productBadgeHigh}>
                    <TrendingUp size={12} color="#B45309" />
                    <Text style={styles.productBadgeHighText}>{prod.riskLevel} Risk</Text>
                  </View>
                  <Text style={styles.verifiedTag}>Verified ({prod.lastUpdatedDate})</Text>
                </View>

                <Text style={styles.productTitle}>{prod.name}</Text>
                <Text style={styles.productReturn}>Expected Yield: {prod.expectedReturnRate}</Text>

                <View style={styles.productMetaGrid}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Min Investment</Text>
                    <Text style={styles.metaVal}>{formatINR(prod.minInvestmentAmount)}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Duration</Text>
                    <Text style={styles.metaVal}>{prod.duration}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>Volatility Indicator</Text>
                    <Text style={styles.metaVal}>{prod.riskPercentageOrVolatility}</Text>
                  </View>
                </View>

                <View style={styles.cardFooterRow}>
                  <Text style={styles.dataSrcText}>Source: {prod.verifiedDataSource}</Text>
                  <ChevronRight size={16} color={THEME.colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* TAB C: RISK INDICATOR MATRIX */}
        {activeTab === 'RISK_TABLE' && (
          <View style={styles.matrixContainer}>
            <Text style={styles.matrixTitle}>Risk Indicator & Volatility Matrix</Text>
            <Text style={styles.matrixDesc}>
              Standard risk levels based on historical volatility and capital loss risk.
            </Text>

            <View style={styles.tableBox}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thCell, { flex: 2 }]}>Investment Product</Text>
                <Text style={[styles.thCell, { flex: 1.2 }]}>Risk Indicator</Text>
                <Text style={[styles.thCell, { flex: 1.5 }]}>Time Horizon</Text>
              </View>

              {[
                { name: 'Fixed Deposit (FD)', risk: 'Low', time: '1–5 Years' },
                { name: 'Recurring Deposit (RD)', risk: 'Low', time: '6m–10 Years' },
                { name: 'Government Bonds', risk: 'Low to Moderate', time: '5–40 Years' },
                { name: 'Short-Term Debt Funds', risk: 'Low to Moderate', time: '1–3 Years' },
                { name: 'Index Mutual Funds', risk: 'Moderate to High', time: '5+ Years' },
                { name: 'Equity Mutual Funds', risk: 'High', time: '5–7 Years' },
                { name: 'Exchange Traded Funds', risk: 'Moderate to High', time: '3+ Years' },
                { name: 'Individual Stocks', risk: 'Very High', time: '5+ Years' },
              ].map((row, idx) => (
                <View key={idx} style={styles.tableBodyRow}>
                  <Text style={[styles.tdCell, { flex: 2, fontWeight: '700' }]}>{row.name}</Text>
                  <View style={[styles.tdCell, { flex: 1.2 }]}>
                    <Text
                      style={[
                        styles.riskBadgeText,
                        row.risk.includes('High')
                          ? { color: THEME.colors.danger }
                          : { color: '#047857' },
                      ]}
                    >
                      {row.risk}
                    </Text>
                  </View>
                  <Text style={[styles.tdCell, { flex: 1.5, color: THEME.colors.textMuted }]}>
                    {row.time}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.educationalDisclaimer}>
              * Educational Disclosure: Risk indicators depict historical price volatility and structural credit risk. Past performance does not guarantee future results. No trades are executed directly.
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Product Detail Modal */}
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.closeBtn}>
                <X size={18} color={THEME.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                <View style={styles.modalBody}>
                  <View style={styles.modalMetaRow}>
                    <Text style={styles.modalMetaLabel}>Expected Return / Rate:</Text>
                    <Text style={styles.modalMetaVal}>{selectedProduct.expectedReturnRate}</Text>
                  </View>
                  <View style={styles.modalMetaRow}>
                    <Text style={styles.modalMetaLabel}>Min Investment Amount:</Text>
                    <Text style={styles.modalMetaVal}>{formatINR(selectedProduct.minInvestmentAmount)}</Text>
                  </View>
                  <View style={styles.modalMetaRow}>
                    <Text style={styles.modalMetaLabel}>Duration & Lock-in:</Text>
                    <Text style={styles.modalMetaVal}>{selectedProduct.duration} ({selectedProduct.lockInPeriod})</Text>
                  </View>
                  <View style={styles.modalMetaRow}>
                    <Text style={styles.modalMetaLabel}>Risk Level & Volatility:</Text>
                    <Text style={styles.modalMetaVal}>{selectedProduct.riskLevel} ({selectedProduct.riskPercentageOrVolatility})</Text>
                  </View>
                  <View style={styles.modalMetaRow}>
                    <Text style={styles.modalMetaLabel}>Tax Considerations:</Text>
                    <Text style={styles.modalMetaVal}>{selectedProduct.taxConsiderations}</Text>
                  </View>

                  <Text style={styles.sectionHeader}>Pros & Benefits</Text>
                  {selectedProduct.pros.map((p, i) => (
                    <Text key={i} style={styles.bulletItem}>• {p}</Text>
                  ))}

                  <Text style={styles.sectionHeader}>Disadvantages & Risks</Text>
                  {selectedProduct.cons.map((c, i) => (
                    <Text key={i} style={styles.bulletItem}>• {c}</Text>
                  ))}

                  <Text style={styles.sectionHeader}>Important Warnings</Text>
                  {selectedProduct.importantWarnings.map((w, i) => (
                    <Text key={i} style={[styles.bulletItem, { color: THEME.colors.danger }]}>⚠️ {w}</Text>
                  ))}

                  <View style={styles.sourceFooter}>
                    <Text style={styles.sourceText}>
                      Data Source: {selectedProduct.verifiedDataSource} (Updated: {selectedProduct.lastUpdatedDate})
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  infoBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  amountCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.xs,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  amountCardTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  amountCardSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginBottom: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9FE',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    paddingVertical: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  presetChipActive: {
    backgroundColor: THEME.colors.lavenderLight,
    borderColor: THEME.colors.primary,
  },
  presetText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  presetTextActive: {
    color: THEME.colors.primary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF3C7',
    marginHorizontal: THEME.spacing.lg,
    marginTop: 12,
    padding: 12,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warningBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
    fontWeight: '600',
  },
  strategyBanner: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.lg,
    marginTop: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  strategyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  strategyTopCat: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginTop: 2,
    marginBottom: 8,
  },
  splitBarRow: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 6,
  },
  splitBarSegment: {
    height: '100%',
  },
  splitDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  splitDetailText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  strategyReasoning: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.card,
    marginHorizontal: THEME.spacing.lg,
    marginTop: 14,
    borderRadius: THEME.borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
  },
  tabBtnActive: {
    backgroundColor: THEME.colors.primary,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
  },
  productsList: {
    paddingHorizontal: THEME.spacing.lg,
    marginTop: 12,
    gap: 12,
  },
  productCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productBadgeLow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  productBadgeLowText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  productBadgeHigh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  productBadgeHighText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  verifiedTag: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  productReturn: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginTop: 2,
    marginBottom: 8,
  },
  productMetaGrid: {
    flexDirection: 'row',
    backgroundColor: '#FAF9FE',
    borderRadius: THEME.borderRadius.md,
    padding: 8,
    marginBottom: 8,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
  metaVal: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 1,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataSrcText: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    flex: 1,
  },
  matrixContainer: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.lg,
    marginTop: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  matrixTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  matrixDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginBottom: 10,
  },
  tableBox: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.lavenderLight,
    padding: 8,
  },
  thCell: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  tableBodyRow: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    alignItems: 'center',
  },
  tdCell: {
    fontSize: 10,
    color: THEME.colors.textPrimary,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  educationalDisclaimer: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    marginTop: 10,
    lineHeight: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23,23,37,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    width: '100%',
    maxWidth: 420,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    gap: 8,
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  modalMetaLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  modalMetaVal: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 8,
  },
  bulletItem: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    lineHeight: 15,
  },
  sourceFooter: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  sourceText: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
});
