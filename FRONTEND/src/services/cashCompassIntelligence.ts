import { RecurringPayment, Transaction } from '../types/finance';

export interface BillCollisionItem {
  windowStartDate: string;
  windowEndDate: string;
  collidingBills: { name: string; amount: number; dueDate: string }[];
  totalCollidingAmount: number;
  lowestEstimatedBalance: number;
  severity: 'HIGH' | 'MODERATE' | 'LOW';
  advice: string;
}

export interface SafeToSpendResult {
  weeklyGross: number;
  upcomingBillsThisWeek: number;
  userReserve: number;
  safeToSpendAmount: number;
  subtractions: { label: string; amount: number; description: string }[];
}

/**
 * Detects if multiple recurring bills fall close together within a 7-day window
 * and estimates the lowest balance during that window.
 */
export const detectBillCollisions = (
  recurring: RecurringPayment[],
  currentBalance: number
): BillCollisionItem[] => {
  const activeBills = recurring.filter((r) => r.status === 'ACTIVE' && r.nextExpectedDate);
  if (activeBills.length === 0) return [];

  const sortedBills = activeBills
    .map((b) => ({
      name: b.name,
      amount: b.amount,
      dateObj: new Date(b.nextExpectedDate),
      dueDate: b.nextExpectedDate,
    }))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const collisions: BillCollisionItem[] = [];
  const WINDOW_DAYS = 7;

  for (let i = 0; i < sortedBills.length; i++) {
    const start = sortedBills[i];
    const windowEnd = new Date(start.dateObj);
    windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS);

    const group = sortedBills.filter(
      (b) => b.dateObj >= start.dateObj && b.dateObj <= windowEnd
    );

    if (group.length >= 2) {
      const totalAmount = group.reduce((sum, g) => sum + g.amount, 0);
      const lowestBalance = currentBalance - totalAmount;
      const severity = totalAmount > 15000 ? 'HIGH' : totalAmount > 8000 ? 'MODERATE' : 'LOW';

      const existing = collisions.find((c) => c.windowStartDate === start.dueDate);
      if (!existing) {
        collisions.push({
          windowStartDate: start.dueDate,
          windowEndDate: windowEnd.toISOString().split('T')[0],
          collidingBills: group.map((g) => ({
            name: g.name,
            amount: g.amount,
            dueDate: g.dueDate,
          })),
          totalCollidingAmount: totalAmount,
          lowestEstimatedBalance: lowestBalance,
          severity,
          advice: `${group.length} bills totaling ₹${totalAmount.toLocaleString('en-IN')} fall between ${start.dueDate} and ${windowEnd.toISOString().split('T')[0]}. Lowest balance projected at ₹${lowestBalance.toLocaleString('en-IN')}. Consider setting aside cash early.`,
        });
      }
    }
  }

  return collisions;
};

/**
 * Calculates Safe-to-Spend this week after recurring bills and user reserve.
 */
export const calculateSafeToSpend = (
  monthlyIncome: number,
  recurring: RecurringPayment[],
  userReserve: number = 10000,
  currentBalance: number = 45000
): SafeToSpendResult => {
  const weeklyGross = Math.round(monthlyIncome / 4.33);

  const activeBills = recurring.filter((r) => r.status === 'ACTIVE');
  const billsThisWeek = activeBills.reduce((sum, r) => {
    return sum + Math.round(r.amount / 4);
  }, 0);

  const subtractions = [
    {
      label: 'Proportional Recurring Bills',
      amount: billsThisWeek,
      description: 'Allocated weekly portion of active subscriptions, rent & EMIs.',
    },
    {
      label: 'Chosen Safety Reserve',
      amount: userReserve,
      description: 'Your locked emergency cushion that remains untouched.',
    },
  ];

  const totalSubtractions = billsThisWeek + userReserve;
  const safeToSpendAmount = Math.max(0, Math.round(currentBalance * 0.4 - totalSubtractions + weeklyGross * 0.2));

  return {
    weeklyGross,
    upcomingBillsThisWeek: billsThisWeek,
    userReserve,
    safeToSpendAmount,
    subtractions,
  };
};
