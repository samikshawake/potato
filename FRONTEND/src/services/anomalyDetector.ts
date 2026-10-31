import { Transaction, AnomalyItem } from '../types/finance';

/**
 * Detects unusual transactions:
 * 1) Sudden large amount (> 2.2x category baseline & > ₹3,000)
 * 2) Duplicate charge on the same or adjacent day for same merchant & amount
 * 3) High-value charge at a brand-new single-occurrence merchant (> ₹3,500)
 * Explains why each was flagged without assuming fraud.
 */
export const detectUnusualTransactions = (transactions: Transaction[]): AnomalyItem[] => {
  const anomalies: AnomalyItem[] = [];
  const flaggedTxIds = new Set<string>();

  const expenses = transactions.filter((tx) => tx.type === 'EXPENSE');

  // 1. Duplicate charge detection (same merchant + exact amount within 1 day)
  const sortedByDate = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < sortedByDate.length; i++) {
    const prev = sortedByDate[i - 1];
    const curr = sortedByDate[i];
    const m1 = (prev.merchant || prev.title).toLowerCase().trim();
    const m2 = (curr.merchant || curr.title).toLowerCase().trim();
    const dayDiff =
      Math.abs(new Date(curr.date).getTime() - new Date(prev.date).getTime()) /
      (1000 * 60 * 60 * 24);

    if (m1 === m2 && prev.amount === curr.amount && dayDiff <= 1 && curr.id !== prev.id) {
      flaggedTxIds.add(curr.id);
      anomalies.push({
        id: `anomaly_dup_${curr.id}`,
        transactionId: curr.id,
        title: curr.title,
        amount: curr.amount,
        date: curr.date,
        category: curr.category,
        typicalAverage: prev.amount,
        deviationMultiplier: 2.0,
        reason: `Possible duplicate payment: identical ₹${curr.amount.toLocaleString(
          'en-IN'
        )} charge to ${curr.merchant || curr.title} within ${Math.round(dayDiff)} day(s) of ${prev.date}. Confirm if this was an intentional second payment.`,
        status: 'PENDING',
      });
    }
  }

  // 2. Category statistical spike detection
  const expensesByCategory: Record<string, Transaction[]> = {};
  const merchantCounts: Record<string, number> = {};

  expenses.forEach((tx) => {
    if (!expensesByCategory[tx.category]) {
      expensesByCategory[tx.category] = [];
    }
    expensesByCategory[tx.category].push(tx);
    const mKey = (tx.merchant || tx.title).toLowerCase().trim();
    merchantCounts[mKey] = (merchantCounts[mKey] || 0) + 1;
  });

  Object.entries(expensesByCategory).forEach(([category, txList]) => {
    if (txList.length < 2) return;
    const totalAmount = txList.reduce((sum, tx) => sum + tx.amount, 0);
    const mean = totalAmount / txList.length;

    txList.forEach((tx) => {
      if (flaggedTxIds.has(tx.id)) return;
      if (tx.amount > mean * 2.2 && tx.amount > 3000) {
        flaggedTxIds.add(tx.id);
        const deviationMultiplier = Number((tx.amount / mean).toFixed(1));
        anomalies.push({
          id: `anomaly_${tx.id}`,
          transactionId: tx.id,
          title: tx.title,
          amount: tx.amount,
          date: tx.date,
          category: tx.category,
          typicalAverage: Math.round(mean),
          deviationMultiplier,
          reason: `Sudden large amount: ${deviationMultiplier}x higher than your typical ${category} average (₹${Math.round(
            mean
          ).toLocaleString('en-IN')}).`,
          status: 'PENDING',
        });
      }
    });
  });

  // 3. First-time high-ticket merchant detection
  expenses.forEach((tx) => {
    if (flaggedTxIds.has(tx.id)) return;
    const mKey = (tx.merchant || tx.title).toLowerCase().trim();
    if (merchantCounts[mKey] === 1 && tx.amount >= 3800 && tx.category !== 'Rent') {
      flaggedTxIds.add(tx.id);
      anomalies.push({
        id: `anomaly_new_${tx.id}`,
        transactionId: tx.id,
        title: tx.title,
        amount: tx.amount,
        date: tx.date,
        category: tx.category,
        typicalAverage: Math.round(tx.amount * 0.45),
        deviationMultiplier: 2.2,
        reason: `New merchant high-value debit: first recorded payment to "${
          tx.merchant || tx.title
        }" for ₹${tx.amount.toLocaleString('en-IN')}.`,
        status: 'PENDING',
      });
    }
  });

  return anomalies;
};
