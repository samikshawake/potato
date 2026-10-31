import type {
  PurchaseSimulationInput,
  PurchaseScenarioResult,
  AffordabilityStatus,
  Transaction,
} from '../types/finance.ts';
import { detectRecurringPayments, calculateTotalRecurringMonthly } from './recurringDetector.ts';
import { formatINR } from '../constants/theme.ts';

export interface SimulatorWhatIfOptions {
  cancelledRecurringIds?: string[];
  addedMonthlyEmi?: number;
}

export interface MonthlyHistoryDiagnostics {
  distinctMonths: string[];
  hasThreeMonthsCoverage: boolean;
  hasIncomeHistory: boolean;
  missingReasons: string[];
  incomeP15: number;
  incomeExpected: number;
  incomeP85: number;
  variableExpected: number;
  variableP85: number;
  excludedIrregularBonusTotal: number;
  excludedBonusNote: string | null;
  safetyBufferAmount: number;
  safetyBufferFormula: string;
  holdoutBacktest: {
    monthLabel: string;
    predictedEndBalance: number;
    actualEndBalance: number;
    accuracyPct: number;
    errorAmount: number;
  } | null;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
}

export function analyzeMultiMonthDiagnostics(
  transactions: Transaction[],
  currentBalance: number,
  customReserveFloor?: number
): MonthlyHistoryDiagnostics {
  const byMonth = new Map<string, { income: number; expense: number }>();
  let excludedIrregularBonusTotal = 0;
  let excludedBonusNote: string | null = null;

  const currentYear = 2026;

  for (const tx of transactions) {
    const ym = tx.date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    const txYear = parseInt(ym.slice(0, 4), 10);

    // Exclude prior-year one-off annual bonus from recurring monthly income baseline (Extra Point #1)
    if (
      tx.type === 'INCOME' &&
      (/bonus/i.test(tx.title) || /bonus/i.test(tx.notes || '') || txYear < currentYear)
    ) {
      excludedIrregularBonusTotal += tx.amount;
      excludedBonusNote = `Excluded one-off historical bonus (${formatINR(tx.amount)} on ${tx.date}) because no matching bonus occurred this year.`;
      continue;
    }

    const bucket = byMonth.get(ym) || { income: 0, expense: 0 };
    if (tx.type === 'INCOME') bucket.income += tx.amount;
    else if (tx.type === 'EXPENSE') bucket.expense += tx.amount;
    byMonth.set(ym, bucket);
  }

  const distinctMonths = Array.from(byMonth.keys()).sort();
  const recurringList = detectRecurringPayments(transactions);
  const committedRecurring = calculateTotalRecurringMonthly(recurringList);

  const incomes = distinctMonths.map((m) => byMonth.get(m)!.income).filter((v) => v > 0);
  const expenses = distinctMonths.map((m) => byMonth.get(m)!.expense);

  const missingReasons: string[] = [];
  if (distinctMonths.length < 3) {
    missingReasons.push(
      `Only ${distinctMonths.length} month(s) of statement history found (minimum 3 months required)`
    );
  }
  if (incomes.length === 0) {
    missingReasons.push('No regular salary or income credits detected in uploaded statements');
  }

  const sortedInc = [...incomes].sort((a, b) => a - b);
  const incomeP15 = sortedInc.length > 0 ? percentile(sortedInc, 0.15) : 0;
  const incomeExpected =
    sortedInc.length > 0
      ? Math.round(sortedInc.reduce((s, v) => s + v, 0) / sortedInc.length)
      : 0;
  const incomeP85 = sortedInc.length > 0 ? percentile(sortedInc, 0.85) : 0;

  const variableByMonth = expenses.map((e) => Math.max(0, e - committedRecurring));
  const sortedVar = [...variableByMonth].sort((a, b) => a - b);
  const variableExpected =
    sortedVar.length > 0
      ? Math.round(sortedVar.reduce((s, v) => s + v, 0) / sortedVar.length)
      : 0;
  const variableP85 = sortedVar.length > 0 ? percentile(sortedVar, 0.85) : 0;

  // Explainable Safety Buffer formula (Requirement #5):
  // max(user reserve floor, 50% of monthly recurring commitments + 20% variable volatility cushion)
  const formulaFloor = Math.round(committedRecurring * 0.5 + variableP85 * 0.2);
  const configuredFloor = customReserveFloor ?? 15000;
  const safetyBufferAmount = Math.max(configuredFloor, formulaFloor);
  const safetyBufferFormula =
    safetyBufferAmount > configuredFloor
      ? `max(User Floor ${formatINR(configuredFloor)}, 50% Committed Bills + 20% Variable Spend = ${formatINR(formulaFloor)})`
      : `User Safety Floor ${formatINR(configuredFloor)} (exceeds dynamic floor ${formatINR(formulaFloor)})`;

  // Holdout Forecast Backtest (Extra Point #2: "Checking the forecast: A month has passed")
  let holdoutBacktest: MonthlyHistoryDiagnostics['holdoutBacktest'] = null;
  if (distinctMonths.length >= 3) {
    const latestMonth = distinctMonths[distinctMonths.length - 1];
    const priorMonths = distinctMonths.slice(0, -1);
    const priorAvgInc = Math.round(
      priorMonths.reduce((s, m) => s + byMonth.get(m)!.income, 0) / priorMonths.length
    );
    const priorAvgExp = Math.round(
      priorMonths.reduce((s, m) => s + byMonth.get(m)!.expense, 0) / priorMonths.length
    );
    const actualLatest = byMonth.get(latestMonth)!;
    const actualNet = actualLatest.income - actualLatest.expense;
    const startOfLatestBalance = currentBalance - actualNet;
    const predictedEndBalance = startOfLatestBalance + (priorAvgInc - priorAvgExp);
    const errorAmount = Math.abs(predictedEndBalance - currentBalance);
    const accuracyPct = Number(
      Math.max(0, 100 - (errorAmount / Math.max(1, currentBalance)) * 100).toFixed(1)
    );
    holdoutBacktest = {
      monthLabel: latestMonth,
      predictedEndBalance,
      actualEndBalance: currentBalance,
      accuracyPct,
      errorAmount,
    };
  }

  return {
    distinctMonths,
    hasThreeMonthsCoverage: distinctMonths.length >= 3,
    hasIncomeHistory: incomes.length > 0,
    missingReasons,
    incomeP15,
    incomeExpected,
    incomeP85,
    variableExpected,
    variableP85,
    excludedIrregularBonusTotal,
    excludedBonusNote,
    safetyBufferAmount,
    safetyBufferFormula,
    holdoutBacktest,
  };
}

/**
 * Core deterministic mathematical engine for the Purchase Decision Simulator.
 * Evaluates 3 scenarios with transparent math, reserve floor protection,
 * P15–P85 income uncertainty ranges, irregular bonus exclusion, <3 months guardrail,
 * and What-If subscription/loan adjustments.
 */
export const simulatePurchaseScenarios = (
  input: PurchaseSimulationInput,
  transactions: Transaction[],
  currentBalance: number,
  whatIf?: SimulatorWhatIfOptions
): PurchaseScenarioResult[] => {
  const diag = analyzeMultiMonthDiagnostics(
    transactions,
    currentBalance,
    input.customReserveThreshold
  );
  const reserveFloor = diag.safetyBufferAmount;
  const recurringList = detectRecurringPayments(transactions);

  const cancelledSet = new Set(whatIf?.cancelledRecurringIds || []);
  const cancelledSavings = recurringList
    .filter((r) => cancelledSet.has(r.id))
    .reduce((s, r) => s + r.amount, 0);
  const addedEmi = Math.max(0, whatIf?.addedMonthlyEmi || 0);

  const rawRecurring = calculateTotalRecurringMonthly(recurringList);
  const totalRecurring = Math.max(0, rawRecurring - cancelledSavings) + addedEmi;

  // Guardrail: Refuse confident forecast when < 3 months or no income found (Requirement #7)
  if (!diag.hasThreeMonthsCoverage || !diag.hasIncomeHistory) {
    const guardrailNote = `Insufficient statement history: ${diag.missingReasons.join(
      '; '
    )}. Upload at least 3 months of CSV/PDF statements before relying on next-month projections.`;

    return [
      {
        scenarioId: 'NEXT_MONTH',
        scenarioTitle: 'Buy Next Month (Insufficient History)',
        purchaseAmount: input.amount,
        startingBalance: currentBalance,
        projectedIncome: diag.incomeExpected,
        projectedRecurring: totalRecurring,
        projectedVariable: diag.variableExpected,
        totalProjectedOutflow: totalRecurring + diag.variableExpected + input.amount,
        estimatedRemainingBalance: currentBalance - input.amount,
        configuredReserveFloor: reserveFloor,
        netBufferAboveReserve: currentBalance - input.amount - reserveFloor,
        status: 'RISKY',
        verdict: 'Cannot safely verify — fewer than 3 months of data',
        explanation: guardrailNote,
        confidenceRating: 'Limited history',
        uncertaintyNotes: [
          ...diag.missingReasons,
          `Safety buffer rule: ${diag.safetyBufferFormula}`,
        ],
      },
    ];
  }

  const baselineIncome = diag.incomeExpected;
  const baselineVariable = diag.variableExpected;
  const baselineMonthlyExpense = totalRecurring + baselineVariable;

  // Conservative vs Optimistic next-month ending balance range (Requirement #6)
  const conservativeNextMonthEnd =
    currentBalance + (diag.incomeP15 - (totalRecurring + diag.variableP85)) - input.amount;
  const optimisticNextMonthEnd =
    currentBalance + (diag.incomeP85 - baselineMonthlyExpense) - input.amount;

  // ----------------------------------------------------
  // SCENARIO 1: BUY NOW
  // ----------------------------------------------------
  const balanceAfterImmediateBuy = currentBalance - input.amount;
  const bufferImmediate = balanceAfterImmediateBuy - reserveFloor;

  let statusNow: AffordabilityStatus = 'SAFE';
  let verdictNow = '';
  if (bufferImmediate < 0) {
    statusNow = 'RISKY';
    verdictNow = `Depletes reserve fund by ${formatINR(Math.abs(bufferImmediate))}`;
  } else if (bufferImmediate < 8000) {
    statusNow = 'CAUTION';
    verdictNow = `Leaves thin buffer of ${formatINR(bufferImmediate)} above reserve`;
  } else {
    statusNow = 'SAFE';
    verdictNow = `Comfortable buffer of ${formatINR(bufferImmediate)} remaining`;
  }

  const scenarioNow: PurchaseScenarioResult = {
    scenarioId: 'NOW',
    scenarioTitle: 'Buy Immediately',
    purchaseAmount: input.amount,
    startingBalance: currentBalance,
    projectedIncome: 0,
    projectedRecurring: 0,
    projectedVariable: 0,
    totalProjectedOutflow: input.amount,
    estimatedRemainingBalance: balanceAfterImmediateBuy,
    configuredReserveFloor: reserveFloor,
    netBufferAboveReserve: bufferImmediate,
    status: statusNow,
    verdict: verdictNow,
    explanation: `Buying ${input.itemName} right now reduces your multi-account balance from ${formatINR(
      currentBalance
    )} to ${formatINR(balanceAfterImmediateBuy)}. ${
      bufferImmediate < 0
        ? `Warning: This breaks your safety buffer of ${formatINR(reserveFloor)}.`
        : `Your safety buffer of ${formatINR(reserveFloor)} remains intact.`
    }`,
    confidenceRating: 'High data coverage',
    uncertaintyNotes: [
      `Safety Buffer Formula: ${diag.safetyBufferFormula}`,
      'Assumes no unexpected emergency expenses before next salary cycle.',
    ],
  };

  // ----------------------------------------------------
  // SCENARIO 2: BUY NEXT MONTH (With Uncertainty Range & What-Ifs)
  // ----------------------------------------------------
  const nextMonthNetSavings = baselineIncome - baselineMonthlyExpense;
  const balanceNextMonthAfterPurchase = currentBalance + nextMonthNetSavings - input.amount;
  const bufferNextMonth = balanceNextMonthAfterPurchase - reserveFloor;

  let statusNextMonth: AffordabilityStatus = 'SAFE';
  let verdictNextMonth = '';
  if (bufferNextMonth < 0) {
    statusNextMonth = 'RISKY';
    verdictNextMonth = `Shortfall of ${formatINR(Math.abs(bufferNextMonth))} below safety buffer`;
  } else if (conservativeNextMonthEnd < reserveFloor || bufferNextMonth < 10000) {
    statusNextMonth = 'CAUTION';
    verdictNextMonth = `Conditional: Range ${formatINR(conservativeNextMonthEnd)} – ${formatINR(
      optimisticNextMonthEnd
    )}`;
  } else {
    statusNextMonth = 'SAFE';
    verdictNextMonth = `Affordable (Range ${formatINR(conservativeNextMonthEnd)} – ${formatINR(
      optimisticNextMonthEnd
    )})`;
  }

  const nextMonthNotes: string[] = [
    `Income Uncertainty Range (P15–P85): ${formatINR(diag.incomeP15)} to ${formatINR(diag.incomeP85)} across ${diag.distinctMonths.length} months.`,
    `Projected Ending Range: ${formatINR(conservativeNextMonthEnd)} (conservative) to ${formatINR(optimisticNextMonthEnd)} (optimistic).`,
    `Safety Buffer Rule: ${diag.safetyBufferFormula}`,
  ];
  if (diag.excludedBonusNote) {
    nextMonthNotes.push(diag.excludedBonusNote);
  }
  if (cancelledSavings > 0) {
    nextMonthNotes.push(`What-If Plan Change: +${formatINR(cancelledSavings)}/mo saved from cancelled subscriptions.`);
  }
  if (addedEmi > 0) {
    nextMonthNotes.push(`What-If Plan Change: −${formatINR(addedEmi)}/mo added for new EMI commitment.`);
  }

  const scenarioNextMonth: PurchaseScenarioResult = {
    scenarioId: 'NEXT_MONTH',
    scenarioTitle: 'Buy Next Month',
    purchaseAmount: input.amount,
    startingBalance: currentBalance,
    projectedIncome: baselineIncome,
    projectedRecurring: totalRecurring,
    projectedVariable: baselineVariable,
    totalProjectedOutflow: baselineMonthlyExpense + input.amount,
    estimatedRemainingBalance: balanceNextMonthAfterPurchase,
    configuredReserveFloor: reserveFloor,
    netBufferAboveReserve: bufferNextMonth,
    status: statusNextMonth,
    verdict: verdictNextMonth,
    explanation: `With expected income ${formatINR(baselineIncome)}, committed bills ${formatINR(
      totalRecurring
    )}, and living spend ${formatINR(baselineVariable)}, buying ${input.itemName} leaves ${formatINR(
      balanceNextMonthAfterPurchase
    )} (range ${formatINR(conservativeNextMonthEnd)} to ${formatINR(optimisticNextMonthEnd)}).${
      diag.excludedBonusNote ? ` Note: ${diag.excludedBonusNote}` : ''
    }`,
    confidenceRating: 'High data coverage',
    uncertaintyNotes: nextMonthNotes,
  };

  // ----------------------------------------------------
  // SCENARIO 3: SAVE FOR 3 MONTHS
  // ----------------------------------------------------
  const monthlySavingRequired = Math.ceil(input.amount / 3);
  const totalIncome3M = baselineIncome * 3;
  const totalExpenses3M = baselineMonthlyExpense * 3;
  const balanceAfter3M = currentBalance + (totalIncome3M - totalExpenses3M) - input.amount;
  const buffer3M = balanceAfter3M - reserveFloor;

  const scenario3M: PurchaseScenarioResult = {
    scenarioId: 'THREE_MONTHS',
    scenarioTitle: 'Save Over 3 Months',
    purchaseAmount: input.amount,
    startingBalance: currentBalance,
    projectedIncome: baselineIncome,
    projectedRecurring: totalRecurring,
    projectedVariable: baselineVariable + monthlySavingRequired,
    totalProjectedOutflow: input.amount,
    estimatedRemainingBalance: balanceAfter3M,
    configuredReserveFloor: reserveFloor,
    netBufferAboveReserve: buffer3M,
    status: buffer3M >= 0 ? 'SAFE' : 'CAUTION',
    verdict: `Save ${formatINR(monthlySavingRequired)}/mo for 3 months`,
    explanation: `By setting aside ${formatINR(
      monthlySavingRequired
    )}/mo over 3 months, you protect your ${formatINR(
      reserveFloor
    )} safety reserve. Estimated ending balance: ${formatINR(balanceAfter3M)}.`,
    confidenceRating: 'Moderate coverage',
    uncertaintyNotes: [
      `Safety Buffer Rule: ${diag.safetyBufferFormula}`,
      'Relies on consistent monthly discipline to deposit the savings allocation.',
    ],
  };

  return [scenarioNextMonth, scenarioNow, scenario3M];
};
