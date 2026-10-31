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
  ShieldCheck,
  Building2,
  MessageSquare,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Download,
  AlertCircle,
  ArrowLeftRight,
} from 'lucide-react-native';
import { THEME, formatINR } from '../constants/theme';
import {
  parseOfflineStatementCSV,
  parseUploadedBankStatementFile,
  buildSamplePdfBlob,
  SAMPLE_STATEMENTS,
  ParsedStatementResult,
} from '../services/statementParser';
import { Transaction, BankAccount } from '../types/finance';
import { useFinance } from '../context/FinanceContext';

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
  const { accounts, importTransactions } = useFinance();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'file' | 'sample' | 'custom' | 'sms'>('file');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || 'acc_hdfc_01'
  );
  const [customCsv, setCustomCsv] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedStatementResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    importedCount: number;
    duplicatesSkipped: number;
    newAccountsLinked?: number;
  } | null>(null);

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
        setUploadError(
          'No structured UPI or bank rows found. Upload a UPI Statement (.PDF or .CSV) with columns: Date & time | Transaction details (Paid to / Received from / Self transfer + UPI Transaction ID + Paid by Bank) | Amount.'
        );
        setParsedResult(null);
      } else {
        setParsedResult({
          bankName: bankLabels.join(' + '),
          totalRecords: combinedTxs.length,
          totalCredits,
          totalDebits,
          totalSelfTransfers,
          dateRange: 'Extracted Statement Period',
          transactions: combinedTxs,
          discoveredAccounts: Array.from(accountsMap.values()),
          duplicatesRemoved,
          parsingNotes: [
            `Parsed ${files.length} statement file(s): ${bankLabels.join(', ')}`,
            'Deduplicated by 12-digit UPI Transaction ID & separated Self Transfers',
          ],
        });
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Could not parse statement file.');
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadSampleCsv = () => {
    const csv = SAMPLE_STATEMENTS[0].csv;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'UPI_Transaction_Statement_Apr2026.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSamplePdf = () => {
    const blob = buildSamplePdfBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'UPI_Transaction_Statement_Apr2026.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSelectSample = (csvText: string, acctId?: string) => {
    setUploadError(null);
    setImportSummary(null);
    const targetAcc = acctId || selectedAccountId;
    setSelectedAccountId(targetAcc);
    const result = parseOfflineStatementCSV(csvText, targetAcc);
    setParsedResult(result);
  };

  const handleParseCustom = () => {
    if (!customCsv.trim()) return;
    setUploadError(null);
    setImportSummary(null);
    const result = parseOfflineStatementCSV(customCsv, selectedAccountId);
    setParsedResult(result);
  };

  const handleSimulateSMS = () => {
    setUploadError(null);
    setImportSummary(null);
    const upiSmsData = `01 Apr, 2026 11:36 AM
Paid to SHRI SHAMRAO PATIL YADRAVKAR EDUCATIONAL AND CHARITABLE TRUST
UPI Transaction ID: 645776339229
Paid by India Post Payment Bank 0262
₹50

01 Apr, 2026 12:59 PM
Received from Ananya Potadar
UPI Transaction ID: 645713846834
Paid to Bank of India 3628
₹100

01 Apr, 2026 04:50 PM
Self transfer to India Post Payment Bank 0262
UPI Transaction ID: 645750350390
Paid by HDFC Bank 1442
₹700`;
    const result = parseOfflineStatementCSV(upiSmsData, selectedAccountId);
    setParsedResult(result);
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
    }, 1700);
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
          {/* Hidden native HTML file input for real UPI PDF & CSV uploads */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain"
            multiple
            onChange={handleFileSelection}
            style={{ display: 'none' }}
            aria-label="Upload UPI PDF or CSV transaction statement files"
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.title}>Import UPI / Bank Statement (PDF & CSV)</Text>
              <View style={styles.privacyPill}>
                <ShieldCheck size={12} color={THEME.colors.success} />
                <Text style={styles.privacyText}>
                  UPI Transaction ID Deduplication • Auto-Links Multi-Bank Accounts
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close statement upload modal"
            >
              <X size={20} color={THEME.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Fallback Account Selector (used when a row has no "Paid by <Bank> <4-digits>" line) */}
          <View style={styles.accountPickerRow}>
            <Text style={styles.accountPickerLabel}>Default Account:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.accountChipsWrap}>
                {accounts.map((acc) => {
                  const active = selectedAccountId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[styles.accChip, active && styles.accChipActive]}
                      onPress={() => setSelectedAccountId(acc.id)}
                    >
                      <Text style={[styles.accChipText, active && styles.accChipTextActive]}>
                        {acc.bankName} ({acc.accountNumberMasked.slice(-4)})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Source Tabs */}
          <View style={styles.tabBar}>
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
                PDF / CSV
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'sample' && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab('sample');
                setParsedResult(null);
                setUploadError(null);
              }}
            >
              <Sparkles
                size={13}
                color={activeTab === 'sample' ? '#FFF' : THEME.colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'sample' && styles.tabTextActive]}>
                UPI Samples
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'custom' && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab('custom');
                setParsedResult(null);
                setUploadError(null);
              }}
            >
              <FileSpreadsheet
                size={13}
                color={activeTab === 'custom' ? '#FFF' : THEME.colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'custom' && styles.tabTextActive]}>
                Paste UPI
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
              <MessageSquare
                size={13}
                color={activeTab === 'sms' ? '#FFF' : THEME.colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'sms' && styles.tabTextActive]}>
                Quick Demo
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* TAB 0: REAL UPI PDF & CSV FILE UPLOAD + ACCEPTED FORMAT SPEC */}
            {activeTab === 'file' && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.dropzoneBox}
                  onPress={() => fileInputRef.current?.click()}
                  activeOpacity={0.85}
                >
                  <View style={styles.dropzoneIconCircle}>
                    <UploadCloud size={24} color={THEME.colors.primary} />
                  </View>
                  <Text style={styles.dropzoneTitle}>
                    {isParsingFile
                      ? 'Parsing UPI Statement Locally...'
                      : 'Tap to Upload UPI Statement (.PDF or .CSV)'}
                  </Text>
                  <Text style={styles.dropzoneSub}>
                    Accepts Google Pay / Paytm / PhonePe UPI statements (`Date & time | Transaction details | Amount`). Automatically extracts UPI Transaction IDs, Paid by / Paid to banks, and Self transfers.
                  </Text>
                  <View style={styles.formatBadgesRow}>
                    <View style={styles.formatBadge}>
                      <FileText size={12} color={THEME.colors.danger} />
                      <Text style={[styles.formatBadgeText, { color: THEME.colors.danger }]}>
                        UPI .PDF Statement
                      </Text>
                    </View>
                    <View style={styles.formatBadge}>
                      <FileSpreadsheet size={12} color={THEME.colors.primary} />
                      <Text style={styles.formatBadgeText}>UPI .CSV Statement</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Accepted UPI Statement Table Format Preview (matches user's exact format) */}
                <View style={styles.upiFormatGuideCard}>
                  <Text style={styles.upiFormatGuideLabel}>
                    Supported UPI Statement Layout (Auto-Detected):
                  </Text>
                  <View style={styles.upiHeaderStrip}>
                    <Text style={[styles.upiColHdr, { width: 78 }]}>Date & time</Text>
                    <Text style={[styles.upiColHdr, { flex: 1 }]}>Transaction details</Text>
                    <Text style={[styles.upiColHdr, { width: 52, textAlign: 'right' }]}>Amount</Text>
                  </View>

                  <View style={styles.upiSampleRow}>
                    <View style={{ width: 78 }}>
                      <Text style={styles.upiSampleDate}>01 Apr, 2026</Text>
                      <Text style={styles.upiSampleTime}>11:36 AM</Text>
                    </View>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.upiSampleTitle} numberOfLines={1}>
                        Paid to SHRI SHAMRAO PATIL YADRAVKAR...
                      </Text>
                      <Text style={styles.upiSampleMeta}>UPI Transaction ID: 645776339229</Text>
                      <Text style={styles.upiSampleMeta}>Paid by India Post Payment Bank 0262</Text>
                    </View>
                    <Text style={styles.upiSampleAmtDebit}>₹50</Text>
                  </View>

                  <View style={styles.upiSampleRow}>
                    <View style={{ width: 78 }}>
                      <Text style={styles.upiSampleDate}>01 Apr, 2026</Text>
                      <Text style={styles.upiSampleTime}>12:59 PM</Text>
                    </View>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.upiSampleTitle}>Received from Ananya Potadar</Text>
                      <Text style={styles.upiSampleMeta}>UPI Transaction ID: 645713846834</Text>
                      <Text style={styles.upiSampleMeta}>Paid to Bank of India 3628</Text>
                    </View>
                    <Text style={styles.upiSampleAmtCredit}>₹100</Text>
                  </View>

                  <View style={[styles.upiSampleRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                    <View style={{ width: 78 }}>
                      <Text style={styles.upiSampleDate}>01 Apr, 2026</Text>
                      <Text style={styles.upiSampleTime}>04:50 PM</Text>
                    </View>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.upiSampleTitle} numberOfLines={1}>
                        Self transfer to India Post Payment Bank 0262
                      </Text>
                      <Text style={styles.upiSampleMeta}>UPI Transaction ID: 645750350390</Text>
                      <Text style={styles.upiSampleMeta}>Paid by HDFC Bank 1442</Text>
                    </View>
                    <Text style={styles.upiSampleAmtDebit}>₹700</Text>
                  </View>
                </View>

                {/* Downloadable Test UPI PDF & CSV Statements */}
                <View style={styles.downloadRow}>
                  <TouchableOpacity
                    style={styles.downloadSampleBtn}
                    onPress={handleDownloadSamplePdf}
                  >
                    <Download size={12} color={THEME.colors.primary} />
                    <Text style={styles.downloadSampleText}>Download UPI Sample .PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.downloadSampleBtn}
                    onPress={handleDownloadSampleCsv}
                  >
                    <Download size={12} color={THEME.colors.primary} />
                    <Text style={styles.downloadSampleText}>Download UPI Sample .CSV</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TAB 1: SAMPLE UPI STATEMENTS */}
            {activeTab === 'sample' && (
              <View style={styles.section}>
                <Text style={styles.sectionSubtitle}>
                  Select a multi-bank UPI statement (`Date & time | Transaction details | Amount`) to parse and merge:
                </Text>

                {SAMPLE_STATEMENTS.map((stmt) => (
                  <TouchableOpacity
                    key={stmt.id}
                    style={styles.sampleCard}
                    onPress={() => handleSelectSample(stmt.csv, stmt.accountId)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.sampleCardHeader}>
                      <View style={styles.bankIdentity}>
                        <View style={styles.bankIconCircle}>
                          <Building2 size={16} color={THEME.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sampleBankTitle}>{stmt.title}</Text>
                          <Text style={styles.sampleAccountNum}>
                            Accounts: {stmt.accountNumber} • {stmt.dateRange}
                          </Text>
                        </View>
                      </View>
                      <ArrowRight size={16} color={THEME.colors.primary} />
                    </View>
                    <Text style={styles.sampleSummaryText}>{stmt.summary}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* TAB 2: PASTE UPI TEXT OR CSV */}
            {activeTab === 'custom' && (
              <View style={styles.section}>
                <Text style={styles.sectionSubtitle}>
                  Paste copied rows from your UPI PDF statement (`01 Apr, 2026 ... UPI Transaction ID ... Paid by ...`) or CSV:
                </Text>

                <TextInput
                  style={styles.csvTextArea}
                  multiline
                  numberOfLines={7}
                  placeholder={`01 Apr, 2026 11:36 AM\nPaid to SHRI SHAMRAO PATIL YADRAVKAR EDUCATIONAL AND CHARITABLE TRUST\nUPI Transaction ID: 645776339229\nPaid by India Post Payment Bank 0262\n₹50`}
                  placeholderTextColor={THEME.colors.textMuted}
                  value={customCsv}
                  onChangeText={setCustomCsv}
                />

                <TouchableOpacity
                  style={[styles.parseBtn, !customCsv.trim() && styles.parseBtnDisabled]}
                  onPress={handleParseCustom}
                  disabled={!customCsv.trim()}
                >
                  <FileSpreadsheet size={16} color="#FFF" />
                  <Text style={styles.parseBtnText}>Parse UPI Statement Locally</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 3: QUICK DEMO */}
            {activeTab === 'sms' && (
              <View style={styles.section}>
                <View style={styles.smsInfoCard}>
                  <MessageSquare size={20} color={THEME.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.smsCardTitle}>
                      Instant 3-Bank UPI Statement Test (IPPB 0262 • BOI 3628 • HDFC 1442)
                    </Text>
                    <Text style={styles.smsCardSub}>
                      Loads the exact 3 rows (`Paid to ... ₹50`, `Received from Ananya Potadar ₹100`, `Self transfer to India Post Payment Bank 0262 ₹700`) and auto-links all 3 bank accounts.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.parseBtn} onPress={handleSimulateSMS}>
                  <Sparkles size={16} color="#FFF" />
                  <Text style={styles.parseBtnText}>Preview Exact 3-Row UPI Statement</Text>
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
                    {parsedResult.discoveredAccounts &&
                      parsedResult.discoveredAccounts.length > 0 && (
                        <Text style={styles.dedupeSubText}>
                          Auto-detected {parsedResult.discoveredAccounts.length} bank account(s):{' '}
                          {parsedResult.discoveredAccounts
                            .map((a) => `${a.bankName} ${a.accountNumberMasked.slice(-4)}`)
                            .join(' • ')}
                        </Text>
                      )}
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
                        <Text style={styles.metricLabel}>Self Transfer</Text>
                        <Text style={[styles.metricVal, { color: THEME.colors.primary }]}>
                          {formatINR(parsedResult.totalSelfTransfers)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.previewList}>
                  {parsedResult.transactions.slice(0, 5).map((tx, idx) => (
                    <View key={idx} style={styles.previewItem}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.previewTxTitle} numberOfLines={1}>
                          {tx.title}
                        </Text>
                        {tx.upiTransactionId && (
                          <Text style={styles.previewTxMeta}>
                            UPI Transaction ID: {tx.upiTransactionId}
                          </Text>
                        )}
                        <Text style={styles.previewTxMeta}>
                          {tx.paidByOrToLine ? `${tx.paidByOrToLine} • ` : ''}
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
                  {parsedResult.transactions.length > 5 && (
                    <Text style={styles.moreItemsText}>
                      +{parsedResult.transactions.length - 5} more UPI rows will be merged
                    </Text>
                  )}
                </View>

                {importSummary ? (
                  <View style={styles.successBox}>
                    <CheckCircle2 size={18} color={THEME.colors.success} />
                    <Text style={styles.successText}>
                      Imported {importSummary.importedCount} row(s) •{' '}
                      {importSummary.duplicatesSkipped} UPI duplicate(s) skipped
                      {importSummary.newAccountsLinked
                        ? ` • ${importSummary.newAccountsLinked} bank(s) linked!`
                        : '!'}
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
                      Merge {parsedResult.totalRecords} UPI Transactions (Auto-Deduplicate)
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.card,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: 24,
    maxHeight: '92%',
    ...THEME.shadows.hover,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  title: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  privacyText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.success,
  },
  closeBtn: {
    padding: 4,
  },
  accountPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
    gap: 8,
  },
  accountPickerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  accountChipsWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  accChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  accChipActive: {
    backgroundColor: THEME.colors.lavenderLight,
    borderColor: THEME.colors.primary,
  },
  accChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  accChipTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
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
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.full,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.primary,
    ...THEME.shadows.soft,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  bodyScroll: {
    maxHeight: 470,
  },
  section: {
    marginBottom: THEME.spacing.md,
  },
  dropzoneBox: {
    backgroundColor: '#FAF9FE',
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.base,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: THEME.colors.primaryLight,
  },
  dropzoneIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dropzoneTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  dropzoneSub: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 4,
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
    paddingHorizontal: 10,
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
  upiFormatGuideCard: {
    marginTop: THEME.spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 10,
  },
  upiFormatGuideLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginBottom: 6,
  },
  upiHeaderStrip: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  upiColHdr: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4B5563',
  },
  upiSampleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F0F7',
  },
  upiSampleDate: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  upiSampleTime: {
    fontSize: 8,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  upiSampleTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  upiSampleMeta: {
    fontSize: 8,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  upiSampleAmtDebit: {
    width: 52,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  upiSampleAmtCredit: {
    width: 52,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: '700',
    color: '#0D9F6E',
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
    paddingVertical: 8,
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
  sectionSubtitle: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    lineHeight: 16,
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
    marginBottom: 4,
  },
  bankIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bankIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  },
  sampleSummaryText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    lineHeight: 14,
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
  smsInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#FAF5FF',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    gap: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: THEME.spacing.md,
  },
  smsCardTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: '#6B21A8',
  },
  smsCardSub: {
    fontSize: 10,
    color: '#7E22CE',
    lineHeight: 15,
    marginTop: 2,
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
  dedupeSubText: {
    fontSize: 10,
    color: THEME.colors.success,
    fontWeight: '600',
    marginTop: 2,
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
