import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  FileSpreadsheet,
  UploadCloud,
  FileText,
  CheckCircle2,
  X,
  Sparkles,
  Building2,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Download,
  AlertCircle,
  ArrowLeftRight,
  Mail,
  RefreshCw,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import {
  parseOfflineStatementCSV,
  parseUploadedBankStatementFile,
  parseSmsTextAlert,
  ParsedStatementResult,
} from '../services/statementParser';
import { Transaction, BankAccount } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import { GoogleSignInButton } from '../../../src/services/googleGmailAuth';

interface Props {
  visible: boolean;
  onClose: () => void;
  onImportComplete: (transactions: Transaction[], accountId?: string) => void;
}

export const StatementUploadModal: React.FC<Props> = ({
  visible,
  onClose,
  onImportComplete,
}) => {
  const {
    accounts,
    importTransactions,
    gmailConnected,
    gmailEmail,
    connectGmailAccount,
    disconnectGmail,
    syncFromGmailInbox,
  } = useFinance();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'gmail' | 'file' | 'sms'>('gmail');
  const [gmailFilter, setGmailFilter] = useState<'all' | 'receipts' | 'refunds'>('all');
  const [isSyncingGmail, setIsSyncingGmail] = useState(false);
  const [gmailSyncReport, setGmailSyncReport] = useState<{
    scannedEmails: number;
    importedCount: number;
    duplicatesSkipped: number;
    smartAlerts: number;
  } | null>(null);
  const selectedAccountId = accounts[0]?.id || 'acc_hdfc_01';
  const [customCsv, setCustomCsv] = useState('');
  const [smsText, setSmsText] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedStatementResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    importedCount: number;
    duplicatesSkipped: number;
    newAccountsLinked?: number;
  } | null>(null);

  const handleConnectGoogle = async () => {
    setUploadError(null);
    setGmailSyncReport(null);
    const res = await connectGmailAccount();
    if (!res.ok && res.error) {
      setUploadError(res.error);
    }
  };

  const handleFetchFromGmail = async () => {
    setUploadError(null);
    setGmailSyncReport(null);
    setIsSyncingGmail(true);
    const res = await syncFromGmailInbox(gmailFilter, false);
    setIsSyncingGmail(false);
    if (!res.ok) {
      setUploadError(res.error || 'Could not fetch Gmail messages.');
      return;
    }
    setGmailSyncReport({
      scannedEmails: res.scannedEmails || 0,
      importedCount: res.importedCount || 0,
      duplicatesSkipped: res.duplicatesSkipped || 0,
      smartAlerts:
        (res.refundsFound || 0) + (res.warrantiesFound || 0) + (res.priceAlertsFound || 0),
    });
    onImportComplete([], selectedAccountId);
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);
    setImportSummary(null);
    setIsParsingFile(true);

    try {
      const combinedTxs: Transaction[] = [];
      const accountsMap = new Map<string, BankAccount>();
      let totalCredits = 0;
      let totalDebits = 0;
      let totalSelfTransfers = 0;
      let duplicatesRemoved = 0;
      const bankLabels: string[] = [];

      for (const file of Array.from(files)) {
        const res = await parseUploadedBankStatementFile(file, selectedAccountId);
        combinedTxs.push(...res.transactions);
        for (const acc of res.discoveredAccounts || []) {
          accountsMap.set(acc.id, acc);
        }
        totalCredits += res.totalCredits;
        totalDebits += res.totalDebits;
        totalSelfTransfers += res.totalSelfTransfers || 0;
        duplicatesRemoved += res.duplicatesRemoved || 0;
        bankLabels.push(res.bankName);
      }

      if (combinedTxs.length === 0) {
        setUploadError('No valid statement rows found in the selected file.');
        setParsedResult(null);
      } else {
        setParsedResult({
          bankName: bankLabels.join(' + '),
          totalRecords: combinedTxs.length,
          totalCredits,
          totalDebits,
          totalSelfTransfers,
          dateRange: 'Statement Period',
          transactions: combinedTxs,
          discoveredAccounts: Array.from(accountsMap.values()),
          duplicatesRemoved,
          parsingNotes: [],
        });
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Could not parse statement file.');
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleParseSms = () => {
    if (!smsText.trim()) return;
    setUploadError(null);
    setImportSummary(null);
    const result = parseSmsTextAlert(smsText, selectedAccountId);
    if (result.transactions.length === 0) {
      setUploadError('No valid transaction or expense amounts found in text/SMS.');
    } else {
      setParsedResult(result);
    }
  };



  const handleConfirmImport = async () => {
    if (!parsedResult || parsedResult.transactions.length === 0) return;
    const summary = await importTransactions(
      parsedResult.transactions,
      false,
      selectedAccountId,
      parsedResult.discoveredAccounts
    );
    onImportComplete([], selectedAccountId);
    setImportSummary(summary);
    setTimeout(() => {
      setImportSummary(null);
      setParsedResult(null);
      setCustomCsv('');
      onClose();
    }, 1500);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain"
            multiple
            onChange={handleFileSelection}
            style={{ display: 'none' }}
            aria-label="Upload PDF or CSV bank statement"
          />

          {/* Clean Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Sync Gmail & Statements</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close sync modal"
            >
              <X size={20} color={THEME.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Source Tabs: Gmail & PDF/CSV Upload */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'gmail' && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab('gmail');
                setParsedResult(null);
                setUploadError(null);
              }}
            >
              <Mail
                size={13}
                color={activeTab === 'gmail' ? '#FFF' : THEME.colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'gmail' && styles.tabTextActive]}>
                Gmail Sync
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'file' && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab('file');
                setParsedResult(null);
                setUploadError(null);
              }}
            >
              <UploadCloud
                size={13}
                color={activeTab === 'file' ? '#FFF' : THEME.colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'file' && styles.tabTextActive]}>
                PDF / CSV Upload
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'sms' && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab('sms');
                setParsedResult(null);
                setUploadError(null);
              }}
            >
              <FileText
                size={13}
                color={activeTab === 'sms' ? '#FFF' : THEME.colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'sms' && styles.tabTextActive]}>
                Text / SMS Paste
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* TAB: DIRECT GMAIL INBOX SYNC */}
            {activeTab === 'gmail' && (
              <View style={styles.section}>
                <View style={styles.dropzoneBox}>
                  <View style={styles.dropzoneIconCircle}>
                    <Mail size={24} color={THEME.colors.primary} />
                  </View>
                  <Text style={styles.dropzoneTitle}>
                    {gmailConnected
                      ? gmailEmail || 'Gmail Connected'
                      : 'Fetch Bank Alerts & Receipts from Gmail'}
                  </Text>

                  {!gmailConnected ? (
                    <View style={{ width: '100%', marginTop: 14 }}>
                      <GoogleSignInButton
                        onClick={handleConnectGoogle}
                        label="Sign in with Google"
                      />
                    </View>
                  ) : (
                    <View style={{ width: '100%', marginTop: 12, gap: 10 }}>
                      <View style={styles.formatBadgesRow}>
                        {(
                          [
                            { id: 'all', label: 'All Alerts' },
                            { id: 'receipts', label: 'Receipts' },
                            { id: 'refunds', label: 'Refunds & Trials' },
                          ] as const
                        ).map((chip) => (
                          <TouchableOpacity
                            key={chip.id}
                            onPress={() => setGmailFilter(chip.id)}
                            style={[
                              styles.formatBadge,
                              gmailFilter === chip.id && {
                                backgroundColor: THEME.colors.primary,
                                borderColor: THEME.colors.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.formatBadgeText,
                                gmailFilter === chip.id && { color: '#FFF' },
                              ]}
                            >
                              {chip.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={[styles.confirmImportBtn, isSyncingGmail && { opacity: 0.7 }]}
                        onPress={handleFetchFromGmail}
                        disabled={isSyncingGmail}
                      >
                        <RefreshCw size={16} color="#FFF" />
                        <Text style={styles.confirmImportBtnText}>
                          {isSyncingGmail ? 'Scanning Gmail with Gemini AI...' : 'Sync from Gmail Now'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => disconnectGmail()}
                        style={{ alignSelf: 'center', paddingVertical: 4 }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.colors.textMuted }}>
                          Disconnect Gmail
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {gmailSyncReport && (
                  <View style={[styles.successBox, { marginTop: 10 }]}>
                    <CheckCircle2 size={18} color={THEME.colors.success} />
                    <Text style={styles.successText}>
                      Scanned {gmailSyncReport.scannedEmails} emails • Imported{' '}
                      {gmailSyncReport.importedCount} new transactions ({gmailSyncReport.duplicatesSkipped}{' '}
                      duplicates skipped) • {gmailSyncReport.smartAlerts} Smart Radar items updated.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* TAB: FILE UPLOAD */}
            {activeTab === 'file' && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.dropzoneBox}
                  onPress={() => fileInputRef.current?.click()}
                  activeOpacity={0.85}
                >
                  <View style={styles.dropzoneIconCircle}>
                    <UploadCloud size={26} color={THEME.colors.primary} />
                  </View>
                  <Text style={styles.dropzoneTitle}>
                    {isParsingFile ? 'Reading Statement...' : 'Select PDF or CSV File'}
                  </Text>
                  <View style={styles.formatBadgesRow}>
                    <View style={styles.formatBadge}>
                      <FileText size={12} color={THEME.colors.danger} />
                      <Text style={[styles.formatBadgeText, { color: THEME.colors.danger }]}>
                        .PDF
                      </Text>
                    </View>
                    <View style={styles.formatBadge}>
                      <FileSpreadsheet size={12} color={THEME.colors.primary} />
                      <Text style={styles.formatBadgeText}>.CSV</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB: TEXT / SMS PASTE */}
            {activeTab === 'sms' && (
              <View style={styles.section}>
                <TextInput
                  style={styles.csvTextArea}
                  multiline
                  numberOfLines={6}
                  placeholder={`Paste bank SMS alerts or transaction texts here...\nExample: "Rs. 1,450 debited from A/C X9281 at Swiggy on 31-Oct-26 via UPI"`}
                  placeholderTextColor={THEME.colors.textMuted}
                  value={smsText}
                  onChangeText={setSmsText}
                />
                <TouchableOpacity
                  style={[styles.parseBtn, !smsText.trim() && styles.parseBtnDisabled]}
                  onPress={handleParseSms}
                  disabled={!smsText.trim()}
                >
                  <FileText size={16} color="#FFF" />
                  <Text style={styles.parseBtnText}>Parse SMS Text Alerts</Text>
                </TouchableOpacity>
              </View>
            )}

            {uploadError && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color={THEME.colors.danger} />
                <Text style={styles.errorBannerText}>{uploadError}</Text>
              </View>
            )}

            {/* PARSED PREVIEW SECTION */}
            {parsedResult && (
              <View style={styles.previewContainer}>
                <View style={styles.previewHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.previewTitle}>{parsedResult.bankName}</Text>
                  </View>
                  <View style={styles.recordsBadge}>
                    <Text style={styles.recordsBadgeText}>
                      {parsedResult.totalRecords} Rows
                    </Text>
                  </View>
                </View>

                <View style={styles.previewMetricsRow}>
                  <View style={styles.previewMetricCard}>
                    <View style={styles.metricIconWrap}>
                      <TrendingUp size={13} color={THEME.colors.success} />
                    </View>
                    <View>
                      <Text style={styles.metricLabel}>Received</Text>
                      <Text style={[styles.metricVal, { color: THEME.colors.success }]}>
                        +{formatINR(parsedResult.totalCredits)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.previewMetricCard}>
                    <View style={styles.metricIconWrap}>
                      <TrendingDown size={13} color={THEME.colors.danger} />
                    </View>
                    <View>
                      <Text style={styles.metricLabel}>Paid Out</Text>
                      <Text style={[styles.metricVal, { color: THEME.colors.danger }]}>
                        −{formatINR(parsedResult.totalDebits)}
                      </Text>
                    </View>
                  </View>

                  {parsedResult.totalSelfTransfers > 0 && (
                    <View style={styles.previewMetricCard}>
                      <View style={styles.metricIconWrap}>
                        <ArrowLeftRight size={13} color={THEME.colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.metricLabel}>Transfer</Text>
                        <Text style={[styles.metricVal, { color: THEME.colors.primary }]}>
                          {formatINR(parsedResult.totalSelfTransfers)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                <View style={[styles.previewList, { maxHeight: 240, overflowY: 'auto' }]} tabIndex={0} aria-label="Parsed transactions preview list">
                  {parsedResult.transactions.slice(0, 20).map((tx, idx) => (
                    <View key={idx} style={styles.previewItem}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.previewTxTitle} numberOfLines={1}>
                          {tx.title}
                        </Text>
                        <Text style={styles.previewTxMeta}>
                          {tx.date} {tx.time ? `• ${tx.time}` : ''}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.previewTxAmount,
                          tx.type === 'INCOME'
                            ? { color: THEME.colors.success }
                            : tx.type === 'TRANSFER'
                            ? { color: THEME.colors.primary }
                            : { color: THEME.colors.textPrimary },
                        ]}
                      >
                        {tx.type === 'INCOME'
                          ? `+${formatINR(tx.amount)}`
                          : tx.type === 'TRANSFER'
                          ? `⇄ ${formatINR(tx.amount)}`
                          : formatINR(tx.amount)}
                      </Text>
                    </View>
                  ))}
                  {parsedResult.transactions.length > 20 && (
                    <Text style={styles.moreItemsText}>
                      +{parsedResult.transactions.length - 20} more rows
                    </Text>
                  )}
                </View>

                {importSummary ? (
                  <View style={styles.successBox}>
                    <CheckCircle2 size={18} color={THEME.colors.success} />
                    <Text style={styles.successText}>
                      Imported {importSummary.importedCount} transaction(s)
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.confirmImportBtn}
                    onPress={handleConfirmImport}
                    activeOpacity={0.85}
                  >
                    <CheckCircle2 size={18} color="#FFF" />
                    <Text style={styles.confirmImportBtnText}>
                      Import {parsedResult.totalRecords} Transactions
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 37, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    ...THEME.shadows.hover,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.lavenderLight,
    padding: 3,
    borderRadius: THEME.borderRadius.full,
    marginBottom: THEME.spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    gap: 5,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.primary,
    ...THEME.shadows.soft,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  bodyScroll: {
    maxHeight: 440,
  },
  section: {
    marginBottom: THEME.spacing.md,
  },
  dropzoneBox: {
    backgroundColor: '#FAF9FE',
    borderRadius: THEME.borderRadius.xl,
    paddingVertical: THEME.spacing.xl,
    paddingHorizontal: THEME.spacing.base,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: THEME.colors.primaryLight,
  },
  dropzoneIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dropzoneTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  formatBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: THEME.spacing.sm,
  },
  formatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  formatBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  downloadRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: THEME.spacing.sm,
  },
  downloadSampleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  downloadSampleText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  sampleCard: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sampleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bankIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleBankTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sampleAccountNum: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  csvTextArea: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    fontSize: 11,
    fontFamily: 'Courier',
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    minHeight: 110,
    marginBottom: THEME.spacing.md,
  },
  parseBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
    ...THEME.shadows.soft,
  },
  parseBtnDisabled: {
    backgroundColor: '#C8B5F9',
  },
  parseBtnText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: '#FFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDEDF0',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: THEME.spacing.sm,
  },
  errorBannerText: {
    fontSize: 11,
    color: THEME.colors.danger,
    flex: 1,
    lineHeight: 15,
  },
  previewContainer: {
    backgroundColor: '#FAF9FE',
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginTop: THEME.spacing.xs,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  previewTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  recordsBadge: {
    backgroundColor: THEME.colors.lavenderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
  },
  recordsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  previewMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  previewMetricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.md,
    padding: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  metricIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
  },
  metricVal: {
    fontSize: 10,
    fontWeight: '800',
  },
  previewList: {
    gap: 6,
    marginBottom: THEME.spacing.md,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.card,
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#F2F0FA',
  },
  previewTxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  previewTxMeta: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  previewTxAmount: {
    fontSize: 11,
    fontWeight: '800',
  },
  moreItemsText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  confirmImportBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.lg,
    ...THEME.shadows.soft,
  },
  confirmImportBtnText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: '#FFF',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F8F0',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.md,
  },
  successText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.success,
    flex: 1,
  },
});
