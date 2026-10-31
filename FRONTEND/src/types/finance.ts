export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT';

export type PaymentMethod = 'UPI' | 'NEFT' | 'IMPS' | 'ATM' | 'CARD' | 'AUTO_DEBIT';

export type PresetTransactionCategory =
  | 'Food'
  | 'Rent'
  | 'Shopping'
  | 'Travel'
  | 'Bills'
  | 'Entertainment'
  | 'Salary'
  | 'Pocket Money'
  | 'Investments'
  | 'Investment'
  | 'Healthcare'
  | 'Other';

export type TransactionCategory = PresetTransactionCategory | (string & {});

export interface CustomCategoryItem {
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: string; // ISO date format YYYY-MM-DD
  time?: string;
  paymentMethod: PaymentMethod;
  accountId: string;
  isRecurring?: boolean;
  notes?: string;
  merchant?: string;
  isReviewed?: boolean;
  upiTransactionId?: string;
  paidByOrToLine?: string;
  bankLabel?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumberMasked: string;
  balance: number;
  type: 'SAVINGS' | 'CURRENT' | 'CREDIT_CARD';
  cardBrand?: 'VISA' | 'MASTERCARD' | 'RUPAY';
  color?: string;
}

export interface RecurringPayment {
  id: string;
  name: string;
  category: TransactionCategory;
  amount: number;
  frequency: 'MONTHLY' | 'WEEKLY' | 'YEARLY' | 'QUARTERLY';
  lastPaymentDate: string;
  nextExpectedDate: string;
  status: 'ACTIVE' | 'UPCOMING' | 'PAUSED';
  isAutoDebit: boolean;
  confidenceScore: number; // 0.0 to 1.0 based on regularity
  explanation: string;
}

export interface AnomalyItem {
  id: string;
  transactionId: string;
  title: string;
  amount: number;
  date: string;
  category: TransactionCategory;
  reason: string;
  typicalAverage: number;
  deviationMultiplier: number;
  status: 'PENDING' | 'CONFIRMED' | 'DISMISSED';
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadlineDate: string;
  lockedUntilDate?: string; // Due date for savings removal
  category: string;
  icon: string;
  isCompleted: boolean;
  monthlyContribution: number;
}

export interface FinancialInsight {
  id: string;
  type: 'WARNING' | 'OPPORTUNITY' | 'ALERT' | 'INFO';
  title: string;
  description: string;
  category?: TransactionCategory;
  impactAmount?: number;
  dataPointsUsed: string[];
  actionLabel?: string;
  actionRoute?: string;
}

export type PurchasePriority = 'ESSENTIAL' | 'WANT' | 'INVESTMENT' | 'LUXURY';

export interface PurchaseSimulationInput {
  itemName: string;
  amount: number;
  plannedDate: string; // YYYY-MM
  priority: PurchasePriority;
  customReserveThreshold?: number; // Minimum balance safe floor (defaults to ₹15,000)
}

export type AffordabilityStatus = 'SAFE' | 'CAUTION' | 'RISKY';

export interface PurchaseScenarioResult {
  scenarioId: 'NOW' | 'NEXT_MONTH' | 'THREE_MONTHS';
  scenarioTitle: string;
  purchaseAmount: number;
  startingBalance: number;
  projectedIncome: number;
  projectedRecurring: number;
  projectedVariable: number;
  totalProjectedOutflow: number;
  estimatedRemainingBalance: number;
  configuredReserveFloor: number;
  netBufferAboveReserve: number;
  status: AffordabilityStatus;
  verdict: string;
  explanation: string;
  confidenceRating: 'High data coverage' | 'Moderate coverage' | 'Limited history';
  uncertaintyNotes: string[];
}

export interface MonthlyForecastDay {
  day: string; // Sun, Mon, Tue...
  date: string;
  projectedExpense: number;
  isPeakDay?: boolean;
}

export interface CashFlowForecast {
  currentBalance: number;
  projectedIncomeNextMonth: number;
  projectedExpensesNextMonth: number;
  netCashFlow: number;
  estimatedEndBalance: number;
  dailySafeSpendLimit: number;
  burnRatePercentage: number;
  weeklyTrend: MonthlyForecastDay[];
}

export interface RefundTrackerItem {
  id: string;
  merchant: string;
  title: string;
  amount: number;
  initiatedDate: string;
  expectedByDate: string;
  status: 'PENDING' | 'CREDITED';
  sourceEmailSubject?: string;
}

export interface WarrantyVaultItem {
  id: string;
  productName: string;
  merchant: string;
  purchaseDate: string;
  amount: number;
  returnWindowEnds: string;
  warrantyExpires: string;
  invoiceRef?: string;
}

export interface PriceCreepAlert {
  id: string;
  serviceName: string;
  previousAmount: number;
  newAmount: number;
  detectedDate: string;
  alertType: 'PRICE_HIKE' | 'FREE_TRIAL_ENDING';
  note: string;
}

export interface SplitSettlementItem {
  id: string;
  title: string;
  friendName: string;
  totalBillAmount: number;
  owedToYouAmount: number;
  date: string;
  status: 'PENDING' | 'SETTLED';
}

// ============================================================================
// FEATURE 1 TYPES: Explainable Goal Simulator
// ============================================================================

export interface GoalTimelineOption {
  months: number;
  label: string;
  expectedDate: string;
  requiredMonthlySavings: number;
  projectedSavingsAccumulated: number;
  projectedEndingBalance: number;
  emergencyBufferRemaining: number;
  emergencyCoverageMonthsRemaining: number;
  rating: 'RECOMMENDED' | 'POSSIBLE' | 'FINANCIALLY_RISKY' | 'NOT_RECOMMENDED';
  summaryVerdict: string;
  explanation: string;
}

export interface GoalSimulatorExplanationPanel {
  currentAvailableBalance: number;
  totalMonthlyIncome: number;
  monthlyEssentialExpenses: number;
  averageVariableExpenses: number;
  goalAmount: number;
  monthlySavingsCapacity: number;
  expectedMonthsToGoal: number;
  expectedCompletionDate: string;
  recommendedPurchaseDate: string;
  projectedBalanceAfterPurchase: number;
  emergencyFundImpact: string;
  risksAndAssumptions: string[];
  detailedReasoning: string;
}

export interface ExplainableGoalResult {
  goalName: string;
  goalAmount: number;
  monthlySavingsCapacity: number;
  estimatedMonthsToGoal: number;
  expectedCompletionDate: string;
  currentSavingsProgressPct: number;
  isTargetDateRealistic: boolean;
  targetAssessmentText: string;
  recommendedOption: GoalTimelineOption;
  timelineOptions: GoalTimelineOption[];
  explanationPanel: GoalSimulatorExplanationPanel;
}

// ============================================================================
// FEATURE 2 TYPES: Investment Suggestions
// ============================================================================

export interface GoalSimulatorInput {
  goalName: string;
  goalAmount: number;
  targetMonths?: number;
  currentAvailableBalance?: number;
  monthlyIncome?: number;
  monthlyEssentialExpenses?: number;
  averageVariableExpenses?: number;
  existingSavings?: number;
  emergencyFundBalance?: number;
  existingInvestments?: number;
  upcomingEmis?: number;
  monthlySavingsCapacity?: number;
  customEmergencyReserveFloor?: number;
}

export type InvestmentRiskLevel = 'Low' | 'Low to Moderate' | 'Moderate' | 'Moderate to High' | 'High' | 'Very High';

export interface InvestmentProduct {
  id: string;
  name: string;
  category: 'LOW_RISK' | 'HIGH_RISK';
  productType:
    | 'FD'
    | 'RD'
    | 'FIXED_SAVINGS'
    | 'BONDS'
    | 'DEBT_FUNDS'
    | 'EMERGENCY_SAVINGS'
    | 'MUTUAL_FUNDS'
    | 'EQUITY_MF'
    | 'INDEX_FUNDS'
    | 'STOCKS'
    | 'ETFS';
  minInvestmentAmount: number;
  duration: string;
  expectedReturnRate: string;
  liquidity: string;
  lockInPeriod: string;
  riskLevel: InvestmentRiskLevel;
  riskPercentageOrVolatility: string;
  taxConsiderations: string;
  pros: string[];
  cons: string[];
  importantWarnings: string[];
  verifiedDataSource: string;
  lastUpdatedDate: string;
}

export interface InvestmentSuggestionAnalysis {
  enteredAmount: number;
  actualInvestableCapacity: number;
  emergencyFundStatus: {
    current: number;
    target: number;
    adequacyPct: number;
    isFullyFunded: boolean;
    recommendedEmergencyTopUp: number;
  };
  eligibleLowRiskProducts: InvestmentProduct[];
  eligibleHighRiskProducts: InvestmentProduct[];
  personalizedRecommendation: {
    suggestedLowRiskAlloc: number;
    suggestedHighRiskAlloc: number;
    topCategorySuggestion: string;
    reasoning: string;
    downsideRiskExplanation: string;
    prioritizeEmergencyOrDebtFirstNote: string | null;
  };
}

// ============================================================================
// FEATURE 3 TYPES: Separate Financial Allocation Compartments
// ============================================================================

export interface CompartmentsState {
  // Emergency Fund Compartment
  emergencyFundBalance: number;
  emergencyTargetMonths: 3 | 6 | 12;
  monthlyEssentialExpenses: number;
  emergencyTargetAmount: number;
  emergencyCoverageMonths: number;
  emergencyRemainingRequired: number;
  emergencyProgressPct: number;

  // Investment Compartment
  investmentTotal: number;
  monthlyInvestmentCapacity: number;
  investmentAmountAlreadyInvested: number;
  investmentAvailableNew: number;
  investmentLowRiskAlloc: number;
  investmentHighRiskAlloc: number;

  // Savings Compartment
  savingsTotal: number;
  monthlySavings: number;
  savingsTarget: number;
  savingsRemainingTarget: number;
  savingsProgressPct: number;
  estimatedMonthsToSavingsTarget: number;

  // Distribution Overview
  totalAvailableCash: number;
  reservedForEmergency: number;
  allocatedToInvestments: number;
  reservedForSavings: number;
  unallocatedDiscretionaryBalance: number;
}

// ============================================================================
// FEATURE 4 TYPES: Daily Bill Collision Warnings & Safe-to-Spend
// ============================================================================

export interface DailyBillCollisionAlert {
  id: string;
  startDate: string;
  endDate: string;
  affectedDaysCount: number;
  totalCommitmentsAmount: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  warningMessage: string;
  itemizedCommitments: {
    date: string;
    name: string;
    amount: number;
    category: string;
  }[];
}

export interface DailySafeToSpendItem {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // Mon, Tue...
  openingBalance: number;
  expectedIncome: number;
  billsDueAmount: number;
  billsDueItems: { name: string; amount: number; category?: string }[];
  estimatedEssentialExpenses: number;
  protectedSafetyBuffer: number;
  expectedClosingBalance: number;
  safeToSpendAmount: number;
  status: 'SAFE' | 'CAUTION' | 'BILL_DUE' | 'OVERDRAFT_RISK';
  explanation: string;
}


