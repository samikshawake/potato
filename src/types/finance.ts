export type TransactionCategory =
  | 'Rent & Housing'
  | 'Food & Dining'
  | 'Travel & Commute'
  | 'Subscriptions'
  | 'Utilities & Bills'
  | 'EMI & Loans'
  | 'Shopping'
  | 'Healthcare'
  | 'Salary & Income'
  | 'Bonus & Irregular Income'
  | 'Self Transfer'
  | 'Other';

export const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'Rent & Housing',
  'Food & Dining',
  'Travel & Commute',
  'Subscriptions',
  'Utilities & Bills',
  'EMI & Loans',
  'Shopping',
  'Healthcare',
  'Other',
];

export const ALL_CATEGORIES: TransactionCategory[] = [
  ...EXPENSE_CATEGORIES,
  'Salary & Income',
  'Bonus & Irregular Income',
  'Self Transfer',
];

export interface AccountSummary {
  id: string;
  name: string;
  institution: string;
  accountMask: string;
  latestBalance: number;
  statementCount: number;
  transactionCount: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  sourceFormats: ('CSV' | 'PDF' | 'LOCAL')[];
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  normalizedMerchant: string;
  merchantTokens: string[];
  amount: number; // positive magnitude
  type: 'debit' | 'credit';
  balanceAfter?: number;
  accountId: string;
  accountName: string;
  sourceFile: string;
  sourceFormat: 'CSV' | 'PDF' | 'LOCAL';
  referenceId?: string;
  category: TransactionCategory;
  categoryConfidence: number;
  userCorrected?: boolean;
  excludedAsDuplicate?: boolean; // If user confirms an anomaly was actually a duplicate refund
  confirmedRealPayment?: boolean; // Extra point: user confirms flagged duplicate was a real 2nd payment
}

export interface DeduplicatedEntry {
  droppedTransaction: {
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    sourceFile: string;
    accountName: string;
  };
  matchedWithId: string;
  matchedSourceFile: string;
  reason: string;
}

export interface IngestionReport {
  id: string;
  timestamp: string;
  filesProcessed: string[];
  totalRowsParsed: number;
  addedCount: number;
  deduplicatedCount: number;
  deduplicatedEntries: DeduplicatedEntry[];
  accountsUpdated: string[];
  parseLatencyMs: number;
}

export interface CategoryCorrectionLog {
  id: string;
  timestamp: string;
  merchantStem: string;
  previousCategory: TransactionCategory;
  newCategory: TransactionCategory;
  affectedTransactionIds: string[];
  affectedSummaries: {
    id: string;
    date: string;
    description: string;
    amount: number;
    accountName: string;
  }[];
}

export interface RecurringPayment {
  id: string;
  merchantStem: string;
  displayName: string;
  category: TransactionCategory;
  kind: 'Subscription' | 'EMI / Loan' | 'Housing / Rent' | 'Utility / Bill';
  averageAmount: number;
  latestAmount: number;
  cadenceDays: number;
  occurrences: number;
  lastPaidDate: string;
  nextExpectedDate: string;
  confidence: number;
  accountName: string;
}

export type AnomalyKind = 'SUDDEN_LARGE_AMOUNT' | 'POTENTIAL_DUPLICATE' | 'NEW_HIGH_MERCHANT';

export interface AnomalyFlag {
  id: string;
  transactionId: string;
  date: string;
  description: string;
  amount: number;
  accountName: string;
  category: TransactionCategory;
  kind: AnomalyKind;
  severity: 'high' | 'medium';
  explanation: string;
  baselineComparison: string;
  status: 'active' | 'confirmed_real' | 'marked_duplicate';
}

export interface DataSufficiencyReport {
  isSufficient: boolean;
  historyDays: number;
  historyMonths: number;
  minimumRequiredMonths: number;
  hasIncome: boolean;
  dateGaps: { from: string; to: string; gapDays: number }[];
  missingReasons: string[];
}

export interface UncertaintyBand {
  p15Conservative: number;
  p50Expected: number;
  p85Optimistic: number;
  stdDev: number;
  coefficientOfVariation: number;
  isVolatile: boolean;
}

export interface IrregularIncomeNotice {
  detected: boolean;
  excludedTransactions: {
    date: string;
    description: string;
    amount: number;
  }[];
  explanation: string;
}

export interface SafetyBufferExplanation {
  amount: number;
  minimumFloor: number;
  essentialOutflowShare: number;
  volatilityComponent: number;
  formulaText: string;
  rationale: string;
}

export interface PlanAdjustment {
  cancelledRecurringIds: string[];
  newMonthlyLoanEmi: number;
  newLoanLabel: string;
  deferMonths: number;
}

export interface ExtractedPlanIntent {
  rawQuery: string;
  itemName: string;
  purchaseAmount: number;
  targetMonthLabel: string;
  monthOffset: number;
  suggestedCancelNames: string[];
  suggestedNewEmi: number;
  tokensEncoded: number;
  tokenPreview: { id: number; piece: string }[];
  tokenizeMs: number;
  inferenceMs: number;
  tokensPerSec: number;
  kvCacheHit: boolean;
}

export interface ReasoningStep {
  stepNumber: number;
  label: string;
  operator: 'start' | 'add' | 'subtract' | 'equals';
  expectedAmount: number;
  conservativeAmount?: number;
  optimisticAmount?: number;
  detail: string;
}

export type AffordabilityVerdict =
  | 'AFFORDABLE'
  | 'CONDITIONAL_RANGE'
  | 'NOT_AFFORDABLE'
  | 'INSUFFICIENT_DATA';

export interface AffordabilityEvaluation {
  verdict: AffordabilityVerdict;
  headline: string;
  itemName: string;
  purchaseAmount: number;
  targetMonthLabel: string;
  currentBalance: number;
  incomeBand: UncertaintyBand;
  irregularIncome: IrregularIncomeNotice;
  committedRecurringTotal: number;
  cancelledSavingsMonthly: number;
  addedLoanMonthly: number;
  variableSpendBand: UncertaintyBand;
  safetyBuffer: SafetyBufferExplanation;
  prePurchaseFreeCash: {
    conservative: number;
    expected: number;
    optimistic: number;
  };
  postPurchaseFreeCash: {
    conservative: number;
    expected: number;
    optimistic: number;
  };
  steps: ReasoningStep[];
  sufficiency: DataSufficiencyReport;
  baselineComparison?: {
    baselineVerdict: AffordabilityVerdict;
    baselineExpectedPostPurchase: number;
    deltaMonthlyImprovement: number;
  };
}

export interface MonthlySummaryPoint {
  monthKey: string; // YYYY-MM
  label: string; // e.g. May 26
  regularIncome: number;
  irregularIncome: number;
  committedSpend: number;
  variableSpend: number;
  totalSpend: number;
  netCashFlow: number;
  closingBalance: number;
  isForecast?: boolean;
  forecastLowBalance?: number;
  forecastHighBalance?: number;
}

export interface ForecastBacktestResult {
  available: boolean;
  reasonIfUnavailable?: string;
  holdoutMonthLabel: string;
  trainingMonthsCount: number;
  predictedIncome: number;
  actualIncome: number;
  predictedTotalSpend: number;
  actualTotalSpend: number;
  predictedEndingBalance: number;
  predictedBalanceRange: [number, number];
  actualEndingBalance: number;
  absoluteBalanceError: number;
  balanceAccuracyPct: number;
  withinUncertaintyBand: boolean;
  varianceDrivers: string[];
}

export interface ModelArtifactStatus {
  pteLoaded: boolean;
  pteFileName: string;
  pteSizeMB: number;
  pteSha256: string;
  pteVerifiedMatch: boolean;
  tokenizerLoaded: boolean;
  tokenizerFileName: string;
  tokenizerSizeMB: number;
  tokenizerVocabSize: number;
  tokenizerSha256: string;
  tokenizerVerifiedMatch: boolean;
  quantizationMode: 'INT4-XNNPACK' | 'INT8-SIMD';
  kvCacheEnabled: boolean;
  speculativeBatching: boolean;
  lastPrefillMs: number;
  lastDecodeMs: number;
  lastTokensPerSec: number;
  kvCachedPrefixTokens: number;
}
