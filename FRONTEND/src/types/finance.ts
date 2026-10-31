export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type PaymentMethod = 'UPI' | 'NEFT' | 'IMPS' | 'ATM' | 'CARD' | 'AUTO_DEBIT';

export type TransactionCategory =
  | 'Food'
  | 'Rent'
  | 'Shopping'
  | 'Travel'
  | 'Bills'
  | 'Entertainment'
  | 'Salary'
  | 'Investments'
  | 'Healthcare'
  | 'Other';

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
