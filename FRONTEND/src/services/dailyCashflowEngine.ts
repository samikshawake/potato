import type {
  Transaction,
  DailyBillCollisionAlert,
  DailySafeToSpendItem,
} from '../types/finance.ts';
import { detectRecurringPayments, calculateTotalRecurringMonthly } from './recurringDetector.ts';
import { calculateTotalExpenses } from './financeEngine.ts';
import { formatINR } from '../constants/theme.ts';

export interface DailyCashflowOptions {
  customSafetyBuffer?: number;
}

/**
 * Deterministic Engine for Feature 4: Daily Bill Collision Warnings & Safe-To-Spend System.
 */

/**
 * 1. Detects Daily Bill Collisions & High Payment Concentrations
 */
export function detectDailyBillCollisions(
  transactionsOrRecurring: any[]
): DailyBillCollisionAlert[] {
  const recurring = Array.isArray(transactionsOrRecurring) && transactionsOrRecurring.length > 0 && ('frequency' in transactionsOrRecurring[0] || 'isAutoDebit' in transactionsOrRecurring[0])
    ? (transactionsOrRecurring as any[])
    : detectRecurringPayments((transactionsOrRecurring || []) as Transaction[]);
  const activeBills = recurring.filter((r) => r.status !== 'PAUSED');

  // Group scheduled bills by day of month
  const billMap = new Map<
    number,
    { name: string; amount: number; category: string; dateStr: string }[]
  >();

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  for (const b of activeBills) {
    let dayNum = 5; // default fallback day
    if (b.nextExpectedDate) {
      const parts = b.nextExpectedDate.split('-');
      if (parts.length === 3) dayNum = parseInt(parts[2], 10) || 5;
    }

    const itemDate = new Date(currentYear, currentMonth, dayNum);
    const dateStr = itemDate.toISOString().split('T')[0];

    const list = billMap.get(dayNum) || [];
    list.push({
      name: b.name,
      amount: b.amount,
      category: b.category,
      dateStr,
    });
    billMap.set(dayNum, list);
  }

  // Scan rolling 4-day windows for payment concentration collisions
  const alerts: DailyBillCollisionAlert[] = [];

  for (let startDay = 1; startDay <= 28; startDay++) {
    const endDay = startDay + 3;
    let windowCommitments: { date: string; name: string; amount: number; category: string }[] = [];
    let windowTotal = 0;

    for (let d = startDay; d <= endDay; d++) {
      const dayItems = billMap.get(d) || [];
      for (const item of dayItems) {
        windowCommitments.push({
          date: item.dateStr,
          name: item.name,
          amount: item.amount,
          category: item.category,
        });
        windowTotal += item.amount;
      }
    }

    if (windowCommitments.length >= 2 && windowTotal >= 3500) {
      const sDateObj = new Date(currentYear, currentMonth, startDay);
      const eDateObj = new Date(currentYear, currentMonth, endDay);
      const startStr = sDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const endStr = eDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

      let severity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (windowTotal >= 12000 || windowCommitments.length >= 3) severity = 'HIGH';
      else if (windowTotal >= 6000) severity = 'MEDIUM';

      alerts.push({
        id: `collision_${startDay}_${endDay}`,
        startDate: startStr,
        endDate: endStr,
        affectedDaysCount: 4,
        totalCommitmentsAmount: windowTotal,
        severity,
        warningMessage: `High payment concentration detected between ${startStr} and ${endStr}. You have ${formatINR(
          windowTotal
        )} in ${windowCommitments.length} scheduled commitments during these 4 days. Keep sufficient funds available before making additional purchases.`,
        itemizedCommitments: windowCommitments,
      });

      // Skip forward past this window to avoid duplicate overlap warnings
      startDay = endDay;
    }
  }

  return alerts;
}

/**
 * 2. Calculates 7-Day Daily Safe-To-Spend Calendar (Monday to Sunday)
 */
export function calculateWeeklySafeToSpend(
  transactions: Transaction[],
  currentBalance: number,
  options?: DailyCashflowOptions
): {
  dailyItems: DailySafeToSpendItem[];
  weeklyTotalSafeSpend: number;
  activeCollisions: DailyBillCollisionAlert[];
} {
  const recurring = detectRecurringPayments(transactions);
  const activeBills = recurring.filter((r) => r.status !== 'PAUSED');
  const monthlyRecurringTotal = calculateTotalRecurringMonthly(activeBills);
  const totalMonthlyExpenses = calculateTotalExpenses(transactions);

  // Daily essential living expense baseline (variable food, travel, etc.)
  const dailyVariableLivingCost = Math.max(
    150,
    Math.round(Math.max(0, totalMonthlyExpenses - monthlyRecurringTotal) / 30)
  );

  // Configured Safety Buffer
  const protectedSafetyBuffer = options?.customSafetyBuffer ?? 15000;

  // Build 7-day calendar starting from current week's Monday
  const today = new Date();
  const dayOfWeekIdx = today.getDay(); // 0 is Sun, 1 is Mon...
  const distanceToMon = (dayOfWeekIdx + 6) % 7;
  const mondayDate = new Date(today);
  mondayDate.setDate(today.getDate() - distanceToMon);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyItems: DailySafeToSpendItem[] = [];

  let runningOpeningBalance = currentBalance;
  let weeklyTotalSafeSpend = 0;

  // Sum total commitments for the upcoming week
  let upcomingWeekCommitmentsTotal = 0;
  for (let i = 0; i < 7; i++) {
    const dDate = new Date(mondayDate);
    dDate.setDate(mondayDate.getDate() + i);
    const dayOfMonth = dDate.getDate();

    for (const b of activeBills) {
      let bDay = 5;
      if (b.nextExpectedDate) {
        const parts = b.nextExpectedDate.split('-');
        if (parts.length === 3) bDay = parseInt(parts[2], 10) || 5;
      }
      if (bDay === dayOfMonth) {
        upcomingWeekCommitmentsTotal += b.amount;
      }
    }
  }

  for (let i = 0; i < 7; i++) {
    const dDate = new Date(mondayDate);
    dDate.setDate(mondayDate.getDate() + i);
    const dateISO = dDate.toISOString().split('T')[0];
    const dayName = dayNames[i];
    const dayOfMonth = dDate.getDate();

    // Check expected income today
    let expectedIncome = 0;
    if (dayOfMonth === 1) {
      expectedIncome = 50000; // Salary cycle default
    }

    // Check bills due today
    const billsDueItems: { name: string; amount: number; category?: string }[] = [];
    let billsDueAmount = 0;

    for (const b of activeBills) {
      let bDay = 5;
      if (b.nextExpectedDate) {
        const parts = b.nextExpectedDate.split('-');
        if (parts.length === 3) bDay = parseInt(parts[2], 10) || 5;
      }
      if (bDay === dayOfMonth) {
        billsDueItems.push({ name: b.name, amount: b.amount, category: b.category });
        billsDueAmount += b.amount;
      }
    }

    const estimatedEssentialExpenses = dailyVariableLivingCost;

    // Daily Cash Flow calculation (preventing accidental double-spending of future bills)
    const projectedAvailableMoney =
      runningOpeningBalance + expectedIncome - billsDueAmount - estimatedEssentialExpenses;

    const remainingWeekCommitmentsAfterToday = Math.max(
      0,
      upcomingWeekCommitmentsTotal - billsDueAmount
    );

    // Safe-to-spend formula
    const rawSafeSpend = Math.max(
      0,
      projectedAvailableMoney - protectedSafetyBuffer - remainingWeekCommitmentsAfterToday
    );
    const safeToSpendAmount = Math.floor(rawSafeSpend);
    weeklyTotalSafeSpend += safeToSpendAmount;

    // Closing balance prediction
    const expectedClosingBalance = Math.max(
      0,
      runningOpeningBalance + expectedIncome - billsDueAmount - estimatedEssentialExpenses - safeToSpendAmount
    );

    // Day Status & Explanation
    let status: DailySafeToSpendItem['status'] = 'SAFE';
    let explanation = '';

    if (runningOpeningBalance < protectedSafetyBuffer) {
      status = 'OVERDRAFT_RISK';
      explanation = `Opening balance (${formatINR(
        runningOpeningBalance
      )}) is below your protected safety buffer of ${formatINR(
        protectedSafetyBuffer
      )}. Discretionary spending restricted to ₹0.`;
    } else if (billsDueAmount > 0) {
      status = 'BILL_DUE';
      explanation = `Scheduled bill(s) due today: ${billsDueItems
        .map((b) => `${b.name} (${formatINR(b.amount)})`)
        .join(', ')}. Reserved ${formatINR(billsDueAmount)} from balance.`;
    } else if (safeToSpendAmount < 200) {
      status = 'CAUTION';
      explanation = `Tight liquidity today. Reserved funds for upcoming week bills (${formatINR(
        remainingWeekCommitmentsAfterToday
      )}) and safety buffer (${formatINR(protectedSafetyBuffer)}).`;
    } else {
      status = 'SAFE';
      explanation = `Comfortable cash position. You can safely spend up to ${formatINR(
        safeToSpendAmount
      )} today without affecting upcoming bills or breaking your ${formatINR(
        protectedSafetyBuffer
      )} safety buffer.`;
    }

    dailyItems.push({
      date: dateISO,
      dayOfWeek: dayName,
      openingBalance: runningOpeningBalance,
      expectedIncome,
      billsDueAmount,
      billsDueItems,
      estimatedEssentialExpenses,
      protectedSafetyBuffer,
      expectedClosingBalance,
      safeToSpendAmount,
      status,
      explanation,
    });

    // Pass expected closing balance to next day's opening balance
    runningOpeningBalance = expectedClosingBalance;
  }

  const activeCollisions = detectDailyBillCollisions(transactions);

  return {
    dailyItems,
    weeklyTotalSafeSpend,
    activeCollisions,
  };
}

/**
 * Helper Alias for 7-Day Safe to Spend Array
 */
export function compute7DaySafeToSpend(
  currentBalance: number,
  transactions: Transaction[],
  _recurring: any[],
  _income: number,
  _essential: number,
  buffer: number = 15000
): DailySafeToSpendItem[] {
  return calculateWeeklySafeToSpend(transactions, currentBalance, { customSafetyBuffer: buffer }).dailyItems;
}

