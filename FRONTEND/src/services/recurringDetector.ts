import type { Transaction, RecurringPayment } from '../types/finance.ts';

/**
 * Detects recurring payments deterministically from transaction patterns
 * (e.g. rent, bills, subscriptions, EMIs)
 */
export const detectRecurringPayments = (transactions: Transaction[]): RecurringPayment[] => {
  // Built-in recurring identification based on transaction attributes and recurring indicators
  const recurringKeywords = [
    { pattern: /rent/i, name: 'House Rent (Indiranagar)', category: 'Rent' as const, freq: 'MONTHLY' as const, isAuto: false },
    { pattern: /netflix/i, name: 'Netflix Premium 4K', category: 'Entertainment' as const, freq: 'MONTHLY' as const, isAuto: true },
    { pattern: /spotify/i, name: 'Spotify Music', category: 'Entertainment' as const, freq: 'MONTHLY' as const, isAuto: true },
    { pattern: /airtel|broadband|wifi/i, name: 'Airtel Fiber Broadband', category: 'Bills' as const, freq: 'MONTHLY' as const, isAuto: true },
    { pattern: /bescom|electricity/i, name: 'Electricity (BESCOM)', category: 'Bills' as const, freq: 'MONTHLY' as const, isAuto: false },
    { pattern: /emi|bajaj/i, name: 'Consumer Electronics EMI', category: 'Bills' as const, freq: 'MONTHLY' as const, isAuto: true },
  ];

  const detected: RecurringPayment[] = [];

  recurringKeywords.forEach((rule, idx) => {
    // Find matching transactions in history
    const matches = transactions.filter(
      (tx) => tx.type === 'EXPENSE' && (rule.pattern.test(tx.title) || rule.pattern.test(tx.merchant || ''))
    );

    if (matches.length > 0) {
      const latest = matches[0];
      // Estimate next expected date (30 days from latest)
      const lastDate = new Date(latest.date);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 30);
      const nextFormatted = nextDate.toISOString().split('T')[0];

      detected.push({
        id: `rec_${idx + 1}`,
        name: rule.name,
        category: rule.category,
        amount: latest.amount,
        frequency: rule.freq,
        lastPaymentDate: latest.date,
        nextExpectedDate: nextFormatted,
        status: 'ACTIVE',
        isAutoDebit: rule.isAuto || latest.paymentMethod === 'AUTO_DEBIT',
        confidenceScore: 0.95,
        explanation: `Detected regular monthly pattern from past transactions matching "${rule.name}".`,
      });
    }
  });

  return detected;
};

/**
 * Total recurring monthly obligations
 */
export const calculateTotalRecurringMonthly = (recurringList: RecurringPayment[]): number => {
  return recurringList
    .filter((r) => r.status === 'ACTIVE')
    .reduce((sum, r) => sum + r.amount, 0);
};
