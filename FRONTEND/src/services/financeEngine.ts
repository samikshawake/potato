import type { Transaction, TransactionCategory } from '../types/finance.ts';
import { getCategoryMeta } from '../constants/categories.ts';

export interface CategorySpendingSummary {
  category: TransactionCategory;
  amount: number;
  percentage: number;
  transactionCount: number;
  color: string;
}

/**
 * Filters to the latest recorded calendar month (e.g. '2026-10') when multiple months exist,
 * so monthly summary cards reflect the active monthly cycle cleanly while simulator/backtest
 * leverage full multi-month history.
 */
export const getLatestMonthTransactions = (transactions: Transaction[]): Transaction[] => {
  const safeList = Array.isArray(transactions) ? transactions : [];
  if (safeList.length === 0) return [];
  const validMonths = safeList
    .map((tx) => tx.date.slice(0, 7))
    .filter((ym) => /^\d{4}-\d{2}$/.test(ym))
    .sort();
  if (validMonths.length === 0) return transactions;
  const latestMonth = validMonths[validMonths.length - 1];
  return transactions.filter((tx) => tx.date.startsWith(latestMonth));
};

/**
 * Pure, deterministic calculation of monthly income from the latest active month
 */
export const calculateTotalIncome = (transactions: Transaction[]): number => {
  return getLatestMonthTransactions(transactions)
    .filter((tx) => tx.type === 'INCOME')
    .reduce((sum, tx) => sum + tx.amount, 0);
};

/**
 * Pure, deterministic calculation of monthly expenses from the latest active month
 */
export const calculateTotalExpenses = (transactions: Transaction[]): number => {
  return getLatestMonthTransactions(transactions)
    .filter((tx) => tx.type === 'EXPENSE')
    .reduce((sum, tx) => sum + tx.amount, 0);
};

/**
 * Net cash flow = Total Income - Total Expenses
 */
export const calculateNetCashFlow = (transactions: Transaction[]): number => {
  return calculateTotalIncome(transactions) - calculateTotalExpenses(transactions);
};

/**
 * Computes category-wise breakdown for the active month with percentage and metadata color
 */
export const calculateCategorySpending = (
  transactions: Transaction[],
  customColors?: Record<string, string>
): CategorySpendingSummary[] => {
  const expenseTx = getLatestMonthTransactions(transactions).filter((tx) => tx.type === 'EXPENSE');
  const totalExpense = expenseTx.reduce((sum, tx) => sum + tx.amount, 0);

  const categoryMap: Record<string, { amount: number; count: number }> = {};

  expenseTx.forEach((tx) => {
    const key = tx.category || 'Other';
    if (!categoryMap[key]) {
      categoryMap[key] = { amount: 0, count: 0 };
    }
    categoryMap[key].amount += tx.amount;
    categoryMap[key].count += 1;
  });

  const results: CategorySpendingSummary[] = Object.keys(categoryMap).map((catKey) => {
    const item = categoryMap[catKey];
    const percentage = totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0;
    const meta = getCategoryMeta(catKey, customColors);
    return {
      category: catKey,
      amount: item.amount,
      percentage: Number(percentage.toFixed(1)),
      transactionCount: item.count,
      color: meta.color,
    };
  });

  return results.sort((a, b) => b.amount - a.amount);
};

/**
 * Computes daily safe spend limit based on remaining days in current month
 */
export const calculateDailySafeSpend = (
  currentBalance: number,
  committedUpcomingBills: number,
  reserveFloor: number = 15000,
  daysRemainingInMonth: number = 10
): { dailySafeAmount: number; discretionaryPool: number } => {
  const discretionaryPool = Math.max(0, currentBalance - committedUpcomingBills - reserveFloor);
  const dailySafeAmount =
    daysRemainingInMonth > 0 ? Math.floor(discretionaryPool / daysRemainingInMonth) : 0;
  return { dailySafeAmount, discretionaryPool };
};
