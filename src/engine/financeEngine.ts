import type {
  AccountSummary,
  AffordabilityEvaluation,
  AffordabilityVerdict,
  AnomalyFlag,
  CategoryCorrectionLog,
  DataSufficiencyReport,
  ForecastBacktestResult,
  IrregularIncomeNotice,
  MonthlySummaryPoint,
  PlanAdjustment,
  ReasoningStep,
  RecurringPayment,
  SafetyBufferExplanation,
  Transaction,
  TransactionCategory,
  UncertaintyBand,
} from '../types/finance';

function parseDateMs(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

function addDaysYmd(ymd: string, days: number): string {
  const ms = parseDateMs(ymd) + days * 86400000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[(m || 1) - 1]} '${String(y).slice(-2)}`;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function computeUncertaintyBand(values: number[]): UncertaintyBand {
  if (values.length === 0) {
    return {
      p15Conservative: 0,
      p50Expected: 0,
      p85Optimistic: 0,
      stdDev: 0,
      coefficientOfVariation: 0,
      isVolatile: false,
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.length > 1
      ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;

  return {
    p15Conservative: Math.round(quantile(sorted, 0.15)),
    p50Expected: Math.round(quantile(sorted, 0.5)),
    p85Optimistic: Math.round(quantile(sorted, 0.85)),
    stdDev: Math.round(stdDev),
    coefficientOfVariation: Number(cv.toFixed(2)),
    isVolatile: cv >= 0.12,
  };
}

/**
 * Computes per-account summaries and combined current liquid balance across all ingested accounts.
 */
export function computeAccountSummaries(transactions: Transaction[]): {
  accounts: AccountSummary[];
  combinedBalance: number;
} {
  const byAccount = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.excludedAsDuplicate) continue;
    const list = byAccount.get(t.accountId) ?? [];
    list.push(t);
    byAccount.set(t.accountId, list);
  }

  const accounts: AccountSummary[] = [];
  let combinedBalance = 0;

  for (const [accountId, txns] of byAccount.entries()) {
    const sortedAsc = [...txns].sort((a, b) => a.date.localeCompare(b.date));
    const latestWithBal = [...sortedAsc].reverse().find((t) => t.balanceAfter !== undefined);

    let latestBalance = 0;
    if (latestWithBal && latestWithBal.balanceAfter !== undefined) {
      latestBalance = latestWithBal.balanceAfter;
    } else {
      latestBalance = sortedAsc.reduce(
        (acc, t) => acc + (t.type === 'credit' ? t.amount : -t.amount),
        0
      );
    }

    const files = new Set(txns.map((t) => t.sourceFile));
    const formats = Array.from(new Set(txns.map((t) => t.sourceFormat)));
    const name = txns[0].accountName;
    const institution = name.split(' ')[0] || 'Bank';
    const maskMatch = name.match(/••\d+/);

    accounts.push({
      id: accountId,
      name,
      institution,
      accountMask: maskMatch ? maskMatch[0] : '••0001',
      latestBalance: Math.round(latestBalance),
      statementCount: files.size,
      transactionCount: txns.length,
      dateRangeStart: sortedAsc[0]?.date ?? '',
      dateRangeEnd: sortedAsc[sortedAsc.length - 1]?.date ?? '',
      sourceFormats: formats,
    });

    // Credit card negative/outstanding balances reduce net liquid cash, savings add to it
    combinedBalance += latestBalance;
  }

  return {
    accounts: accounts.sort((a, b) => b.latestBalance - a.latestBalance),
    combinedBalance: Math.round(combinedBalance),
  };
}

/**
 * Applies user category correction to the target transaction AND all similar transactions
 * sharing the normalized merchant stem, returning an explicit audit log of changed items.
 */
export function applyCategoryCorrectionWithPropagation(
  transactions: Transaction[],
  targetTransactionId: string,
  newCategory: TransactionCategory
): {
  updatedTransactions: Transaction[];
  correctionLog: CategoryCorrectionLog | null;
} {
  const target = transactions.find((t) => t.id === targetTransactionId);
  if (!target) {
    return { updatedTransactions: transactions, correctionLog: null };
  }

  const previousCategory = target.category;
  const stem = target.normalizedMerchant;
  const affectedSummaries: CategoryCorrectionLog['affectedSummaries'] = [];

  const updatedTransactions = transactions.map((t) => {
    const isSameMerchant =
      t.id === targetTransactionId ||
      (stem.length >= 3 &&
        (t.normalizedMerchant === stem ||
          t.normalizedMerchant.includes(stem) ||
          stem.includes(t.normalizedMerchant)));

    if (isSameMerchant) {
      affectedSummaries.push({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        accountName: t.accountName,
      });
      return {
        ...t,
        category: newCategory,
        categoryConfidence: 1.0,
        userCorrected: true,
      };
    }
    return t;
  });

  const correctionLog: CategoryCorrectionLog = {
    id: `corr-${Date.now()}`,
    timestamp: new Date().toISOString(),
    merchantStem: stem,
    previousCategory,
    newCategory,
    affectedTransactionIds: affectedSummaries.map((a) => a.id),
    affectedSummaries,
  };

  return { updatedTransactions, correctionLog };
}

/**
 * Identifies subscriptions, EMIs, rent, and repeating bills with cadence and next expected date.
 */
export function detectRecurringPayments(transactions: Transaction[]): RecurringPayment[] {
  const activeDebits = transactions.filter(
    (t) => t.type === 'debit' && !t.excludedAsDuplicate && t.category !== 'Self Transfer'
  );

  const byStem = new Map<string, Transaction[]>();
  for (const t of activeDebits) {
    const list = byStem.get(t.normalizedMerchant) ?? [];
    list.push(t);
    byStem.set(t.normalizedMerchant, list);
  }

  const recurring: RecurringPayment[] = [];

  for (const [stem, list] of byStem.entries()) {
    // Group same-day entries first
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    // Deduplicate same-month occurrences only if checking monthly cadence
    if (sorted.length < 2) continue;

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diffDays = Math.round((parseDateMs(sorted[i].date) - parseDateMs(sorted[i - 1].date)) / 86400000);
      if (diffDays >= 5) {
        intervals.push(diffDays);
      }
    }

    if (intervals.length === 0) continue;

    const sortedIntervals = [...intervals].sort((a, b) => a - b);
    const medianCadence = quantile(sortedIntervals, 0.5);

    const isMonthly = medianCadence >= 25 && medianCadence <= 36;
    const isBiWeeklyOrWeekly = medianCadence >= 6 && medianCadence <= 16 && sorted.length >= 4;

    if (!isMonthly && !isBiWeeklyOrWeekly) continue;

    const amounts = sorted.map((t) => t.amount);
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const maxDiffRatio = Math.max(...amounts.map((a) => Math.abs(a - avgAmount) / Math.max(1, avgAmount)));

    // Subscriptions, EMIs, and Rent have consistent amounts (variance <= 18%); utility bills up to 35%
    const latestCat = sorted[sorted.length - 1].category;
    const allowedVariance =
      latestCat === 'Utilities & Bills'
        ? 0.38
        : latestCat === 'Subscriptions' || latestCat === 'EMI & Loans' || latestCat === 'Rent & Housing'
        ? 0.2
        : 0.1;

    if (maxDiffRatio > allowedVariance) continue;

    // Exclude casual food/travel merchants unless explicitly Subscription/EMI/Rent/Utility
    if (
      (latestCat === 'Food & Dining' || latestCat === 'Travel & Commute' || latestCat === 'Shopping') &&
      sorted.length < 3 &&
      maxDiffRatio > 0.03
    ) {
      continue;
    }

    const lastTxn = sorted[sorted.length - 1];
    const roundedCadence = isMonthly ? 30 : Math.round(medianCadence);
    const nextExpectedDate = addDaysYmd(lastTxn.date, roundedCadence);

    let kind: RecurringPayment['kind'] = 'Subscription';
    if (latestCat === 'EMI & Loans') kind = 'EMI / Loan';
    else if (latestCat === 'Rent & Housing') kind = 'Housing / Rent';
    else if (latestCat === 'Utilities & Bills') kind = 'Utility / Bill';

    const monthlyEquivalent = isMonthly ? avgAmount : (avgAmount * 30) / roundedCadence;

    recurring.push({
      id: `rec-${stem.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      merchantStem: stem,
      displayName: stem
        .split(' ')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' '),
      category: latestCat,
      kind,
      averageAmount: Math.round(monthlyEquivalent),
      latestAmount: Math.round(lastTxn.amount),
      cadenceDays: roundedCadence,
      occurrences: sorted.length,
      lastPaidDate: lastTxn.date,
      nextExpectedDate,
      confidence: Number(Math.min(0.99, 0.78 + sorted.length * 0.04 - maxDiffRatio * 0.3).toFixed(2)),
      accountName: lastTxn.accountName,
    });
  }

  return recurring.sort((a, b) => b.averageAmount - a.averageAmount);
}

/**
 * Flags unusual transactions:
 * 1. Potential duplicate charge within 48 hours on the same merchant & exact amount
 * 2. Sudden large amount (> mean + 2.4 * stdDev in its category)
 * 3. High-value new merchant appearing only in the most recent 30 days of data
 */
export function detectAnomalies(transactions: Transaction[]): AnomalyFlag[] {
  const debits = transactions
    .filter((t) => t.type === 'debit' && t.category !== 'Self Transfer' && t.category !== 'Rent & Housing' && t.category !== 'EMI & Loans')
    .sort((a, b) => a.date.localeCompare(b.date));

  if (debits.length === 0) return [];

  const anomalies: AnomalyFlag[] = [];
  const flaggedIds = new Set<string>();

  // 1. Potential duplicate charge detection (within same statement/account within 2 days)
  for (let i = 1; i < debits.length; i++) {
    const curr = debits[i];
    const prev = debits[i - 1];
    const daysApart = Math.abs(parseDateMs(curr.date) - parseDateMs(prev.date)) / 86400000;
    if (
      curr.normalizedMerchant === prev.normalizedMerchant &&
      Math.abs(curr.amount - prev.amount) < 0.01 &&
      daysApart <= 2
    ) {
      flaggedIds.add(curr.id);
      const status: AnomalyFlag['status'] = curr.excludedAsDuplicate
        ? 'marked_duplicate'
        : curr.confirmedRealPayment
        ? 'confirmed_real'
        : 'active';

      anomalies.push({
        id: `anom-dup-${curr.id}`,
        transactionId: curr.id,
        date: curr.date,
        description: curr.description,
        amount: curr.amount,
        accountName: curr.accountName,
        category: curr.category,
        kind: 'POTENTIAL_DUPLICATE',
        severity: 'high',
        explanation: `Charged ₹${curr.amount.toLocaleString('en-IN')} twice at ${curr.normalizedMerchant} within ${daysApart === 0 ? 'the same day' : `${daysApart} day(s)`} (${prev.date} and ${curr.date}).`,
        baselineComparison: `Identical charge #1 on ${prev.date} (${prev.accountName})`,
        status,
      });
    }
  }

  // 2. Sudden large amount per category
  const byCat = new Map<TransactionCategory, Transaction[]>();
  for (const t of debits) {
    if (t.excludedAsDuplicate) continue;
    const list = byCat.get(t.category) ?? [];
    list.push(t);
    byCat.set(t.category, list);
  }

  for (const [cat, list] of byCat.entries()) {
    if (list.length < 4) continue;
    // Compute robust median & MAD/stdDev excluding the single max value
    const sortedAmounts = list.map((t) => t.amount).sort((a, b) => a - b);
    const trimmed = sortedAmounts.slice(0, -1);
    const mean = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
    const std = Math.sqrt(trimmed.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, trimmed.length - 1));
    const threshold = Math.max(mean * 2.8, mean + 2.5 * std, 3000);

    for (const t of list) {
      if (t.amount >= threshold && !flaggedIds.has(t.id)) {
        flaggedIds.add(t.id);
        const multiple = (t.amount / Math.max(1, mean)).toFixed(1);
        anomalies.push({
          id: `anom-spike-${t.id}`,
          transactionId: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          accountName: t.accountName,
          category: cat,
          kind: 'SUDDEN_LARGE_AMOUNT',
          severity: t.amount >= mean * 4 ? 'high' : 'medium',
          explanation: `Outflow of ₹${t.amount.toLocaleString('en-IN')} is ${multiple}× higher than your typical ${cat} transaction.`,
          baselineComparison: `Usual ${cat} ticket average: ₹${Math.round(mean).toLocaleString('en-IN')}`,
          status: t.confirmedRealPayment ? 'confirmed_real' : 'active',
        });
      }
    }
  }

  // 3. New high-value merchant in latest 30 days
  const maxDateMs = parseDateMs(debits[debits.length - 1].date);
  const cutoffMs = maxDateMs - 30 * 86400000;
  const historicalMerchants = new Set(
    debits.filter((t) => parseDateMs(t.date) < cutoffMs).map((t) => t.normalizedMerchant)
  );
  const allAmountsSorted = debits.map((t) => t.amount).sort((a, b) => a - b);
  const p88 = Math.max(4000, quantile(allAmountsSorted, 0.88));

  if (historicalMerchants.size >= 4) {
    for (const t of debits) {
      if (
        parseDateMs(t.date) >= cutoffMs &&
        !historicalMerchants.has(t.normalizedMerchant) &&
        t.amount >= p88 &&
        !flaggedIds.has(t.id)
      ) {
        flaggedIds.add(t.id);
        anomalies.push({
          id: `anom-new-${t.id}`,
          transactionId: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          accountName: t.accountName,
          category: t.category,
          kind: 'NEW_HIGH_MERCHANT',
          severity: 'medium',
          explanation: `First-time payment of ₹${t.amount.toLocaleString('en-IN')} to new merchant "${t.normalizedMerchant}" not seen in prior months.`,
          baselineComparison: `Exceeds 88th percentile discretionary spend (₹${Math.round(p88).toLocaleString('en-IN')})`,
          status: t.confirmedRealPayment ? 'confirmed_real' : 'active',
        });
      }
    }
  }

  return anomalies.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Checks whether transaction history is sufficient to give a reliable forecast:
 * - At least 3 months (~85+ days across >= 3 distinct YYYY-MM buckets)
 * - Verifiable income credits present
 * - No multi-week missing statement gaps (> 28 days)
 */
export function evaluateDataSufficiency(transactions: Transaction[]): DataSufficiencyReport {
  const valid = transactions
    .filter((t) => !t.excludedAsDuplicate)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (valid.length === 0) {
    return {
      isSufficient: false,
      historyDays: 0,
      historyMonths: 0,
      minimumRequiredMonths: 3,
      hasIncome: false,
      dateGaps: [],
      missingReasons: ['No bank statement transactions uploaded yet'],
    };
  }

  const firstMs = parseDateMs(valid[0].date);
  const lastMs = parseDateMs(valid[valid.length - 1].date);
  const historyDays = Math.max(1, Math.round((lastMs - firstMs) / 86400000) + 1);
  const historyMonths = Number((historyDays / 30.4).toFixed(1));
  const distinctMonths = new Set(valid.map((t) => t.date.slice(0, 7))).size;

  const incomeCredits = valid.filter(
    (t) => t.type === 'credit' && t.category !== 'Self Transfer' && t.amount >= 1000
  );
  const hasIncome = incomeCredits.length > 0;

  const dateGaps: { from: string; to: string; gapDays: number }[] = [];
  for (let i = 1; i < valid.length; i++) {
    const gap = Math.round((parseDateMs(valid[i].date) - parseDateMs(valid[i - 1].date)) / 86400000);
    if (gap > 28) {
      dateGaps.push({
        from: valid[i - 1].date,
        to: valid[i].date,
        gapDays: gap,
      });
    }
  }

  const missingReasons: string[] = [];
  if (historyDays < 85 || distinctMonths < 3) {
    missingReasons.push(
      `Only ${historyMonths} months (${historyDays} days across ${distinctMonths} statement month${distinctMonths === 1 ? '' : 's'}) available — minimum 3 months required`
    );
  }
  if (!hasIncome) {
    missingReasons.push('No salary or income credit transactions detected in any uploaded statement');
  }
  if (dateGaps.length > 0) {
    const worst = dateGaps.sort((a, b) => b.gapDays - a.gapDays)[0];
    missingReasons.push(
      `Missing statement date gap of ${worst.gapDays} days detected between ${worst.from} and ${worst.to}`
    );
  }

  return {
    isSufficient: missingReasons.length === 0,
    historyDays,
    historyMonths,
    minimumRequiredMonths: 3,
    hasIncome,
    dateGaps,
    missingReasons,
  };
}

/**
 * Aggregates historical monthly cash-flow series and projects next 2 months with uncertainty bands.
 */
export function buildMonthlySeriesAndForecast(
  transactions: Transaction[],
  recurring: RecurringPayment[],
  combinedBalance: number
): {
  monthlySeries: MonthlySummaryPoint[];
  regularMonthlyIncomes: number[];
  variableMonthlySpends: number[];
  irregularNotice: IrregularIncomeNotice;
} {
  const valid = transactions.filter((t) => !t.excludedAsDuplicate && t.category !== 'Self Transfer');
  const recurringStems = new Set(recurring.map((r) => r.merchantStem));

  const monthMap = new Map<
    string,
    {
      regularIncome: number;
      irregularIncome: number;
      committedSpend: number;
      variableSpend: number;
    }
  >();

  const irregularTxns: IrregularIncomeNotice['excludedTransactions'] = [];

  // First pass: identify one-off bonus / irregular large inflow spikes
  const creditTxns = valid.filter((t) => t.type === 'credit');
  const creditAmounts = creditTxns.map((t) => t.amount).sort((a, b) => a - b);
  const medianCredit = quantile(creditAmounts, 0.5);

  for (const t of valid) {
    const mKey = t.date.slice(0, 7);
    const bucket = monthMap.get(mKey) ?? {
      regularIncome: 0,
      irregularIncome: 0,
      committedSpend: 0,
      variableSpend: 0,
    };

    if (t.type === 'credit') {
      const isExplicitBonus =
        t.category === 'Bonus & Irregular Income' ||
        (creditTxns.length >= 3 && medianCredit > 0 && t.amount > medianCredit * 1.65 && /\b(BONUS|INCENTIVE|ANNUAL|ARREAR|DIVIDEND)\b/i.test(t.description));

      if (isExplicitBonus) {
        bucket.irregularIncome += t.amount;
        irregularTxns.push({
          date: t.date,
          description: t.description,
          amount: t.amount,
        });
      } else {
        bucket.regularIncome += t.amount;
      }
    } else {
      const isCommitted =
        recurringStems.has(t.normalizedMerchant) ||
        t.category === 'Rent & Housing' ||
        t.category === 'EMI & Loans' ||
        t.category === 'Subscriptions';

      if (isCommitted) {
        bucket.committedSpend += t.amount;
      } else {
        bucket.variableSpend += t.amount;
      }
    }

    monthMap.set(mKey, bucket);
  }

  const sortedMonthKeys = [...monthMap.keys()].sort();

  // Reconstruct approximate historical closing balances walking backward from current combinedBalance
  const monthlySeries: MonthlySummaryPoint[] = [];
  const regularMonthlyIncomes: number[] = [];
  const variableMonthlySpends: number[] = [];

  const rawPoints = sortedMonthKeys.map((mKey) => {
    const b = monthMap.get(mKey)!;
    const totalSpend = Math.round(b.committedSpend + b.variableSpend);
    const totalInc = Math.round(b.regularIncome + b.irregularIncome);
    regularMonthlyIncomes.push(Math.round(b.regularIncome));
    variableMonthlySpends.push(Math.round(b.variableSpend));
    return {
      monthKey: mKey,
      label: formatMonthLabel(mKey),
      regularIncome: Math.round(b.regularIncome),
      irregularIncome: Math.round(b.irregularIncome),
      committedSpend: Math.round(b.committedSpend),
      variableSpend: Math.round(b.variableSpend),
      totalSpend,
      netCashFlow: totalInc - totalSpend,
      closingBalance: 0,
    };
  });

  let runningBal = combinedBalance;
  for (let i = rawPoints.length - 1; i >= 0; i--) {
    rawPoints[i].closingBalance = Math.round(runningBal);
    runningBal -= rawPoints[i].netCashFlow;
  }
  monthlySeries.push(...rawPoints);

  // Project next 2 months using deterministic bands
  if (sortedMonthKeys.length > 0) {
    const incBand = computeUncertaintyBand(regularMonthlyIncomes);
    const varBand = computeUncertaintyBand(variableMonthlySpends);
    const committedMonthly = recurring.reduce((s, r) => s + r.averageAmount, 0);

    const lastKey = sortedMonthKeys[sortedMonthKeys.length - 1];
    let [yr, mo] = lastKey.split('-').map(Number);
    let projExpectedBal = combinedBalance;
    let projLowBal = combinedBalance;
    let projHighBal = combinedBalance;

    for (let step = 1; step <= 2; step++) {
      mo += 1;
      if (mo > 12) {
        mo = 1;
        yr += 1;
      }
      const nextKey = `${yr}-${String(mo).padStart(2, '0')}`;
      const expNet = incBand.p50Expected - committedMonthly - varBand.p50Expected;
      const lowNet = incBand.p15Conservative - committedMonthly - varBand.p85Optimistic;
      const highNet = incBand.p85Optimistic - committedMonthly - varBand.p15Conservative;

      projExpectedBal += expNet;
      projLowBal += lowNet;
      projHighBal += highNet;

      monthlySeries.push({
        monthKey: nextKey,
        label: `${formatMonthLabel(nextKey)} (Est)`,
        regularIncome: incBand.p50Expected,
        irregularIncome: 0,
        committedSpend: committedMonthly,
        variableSpend: varBand.p50Expected,
        totalSpend: committedMonthly + varBand.p50Expected,
        netCashFlow: expNet,
        closingBalance: Math.round(projExpectedBal),
        isForecast: true,
        forecastLowBalance: Math.round(projLowBal),
        forecastHighBalance: Math.round(projHighBal),
      });
    }
  }

  const irregularNotice: IrregularIncomeNotice = {
    detected: irregularTxns.length > 0,
    excludedTransactions: irregularTxns,
    explanation:
      irregularTxns.length > 0
        ? `Excluded ${irregularTxns.length} non-repeating bonus/windfall inflow(s) (${irregularTxns
            .map((x) => `₹${x.amount.toLocaleString('en-IN')} on ${x.date}`)
            .join(', ')}) because no matching recurrence occurred this cycle.`
        : '',
  };

  return {
    monthlySeries,
    regularMonthlyIncomes,
    variableMonthlySpends,
    irregularNotice,
  };
}

/**
 * Evaluates "Can I afford X next month?" deterministically in code with every step visible,
 * uncertainty ranges, explicit safety buffer derivation, and side-by-side What-If plan delta.
 */
export function evaluateAffordabilityDeterministic(params: {
  transactions: Transaction[];
  recurring: RecurringPayment[];
  combinedBalance: number;
  itemName: string;
  purchaseAmount: number;
  targetMonthLabel: string;
  monthOffset: number;
  planAdjustment: PlanAdjustment;
}): AffordabilityEvaluation {
  const {
    transactions,
    recurring,
    combinedBalance,
    itemName,
    purchaseAmount,
    targetMonthLabel,
    monthOffset,
    planAdjustment,
  } = params;

  const sufficiency = evaluateDataSufficiency(transactions);
  const { regularMonthlyIncomes, variableMonthlySpends, irregularNotice } =
    buildMonthlySeriesAndForecast(transactions, recurring, combinedBalance);

  // Drop partial edge month if >= 4 months exist and edge month has near-zero activity
  const usableIncomes =
    regularMonthlyIncomes.length >= 4
      ? regularMonthlyIncomes.filter((v) => v > 0)
      : regularMonthlyIncomes;
  const usableVarSpends =
    variableMonthlySpends.length >= 4 ? variableMonthlySpends : variableMonthlySpends;

  const incomeBand = computeUncertaintyBand(usableIncomes);
  const variableSpendBand = computeUncertaintyBand(usableVarSpends);

  const rawCommittedMonthly = recurring.reduce((s, r) => s + r.averageAmount, 0);
  const cancelledSet = new Set(planAdjustment.cancelledRecurringIds);
  const cancelledSavingsMonthly = recurring
    .filter((r) => cancelledSet.has(r.id))
    .reduce((s, r) => s + r.averageAmount, 0);

  const effectiveCommittedMonthly = Math.max(0, rawCommittedMonthly - cancelledSavingsMonthly);
  const addedLoanMonthly = Math.max(0, Math.round(planAdjustment.newMonthlyLoanEmi || 0));

  // Explicit, auditable Safety Buffer formula:
  // max(₹10,000 floor, 20% of monthly essential outflows + 1.0 * variable spend stdDev)
  const minimumFloor = 10000;
  const essentialOutflowShare = Math.round(
    (effectiveCommittedMonthly + variableSpendBand.p50Expected) * 0.2
  );
  const volatilityComponent = Math.round(variableSpendBand.stdDev * 0.75);
  const bufferAmount = Math.max(minimumFloor, essentialOutflowShare + volatilityComponent);

  const safetyBuffer: SafetyBufferExplanation = {
    amount: bufferAmount,
    minimumFloor,
    essentialOutflowShare,
    volatilityComponent,
    formulaText: `max(₹10,000 floor, 20% of monthly outflows ₹${essentialOutflowShare.toLocaleString('en-IN')} + spend volatility margin ₹${volatilityComponent.toLocaleString('en-IN')})`,
    rationale: `Protects against unexpected medical/utility bills and monthly spending swings (1σ = ₹${variableSpendBand.stdDev.toLocaleString('en-IN')}) so this purchase never pushes your account into overdraft or credit card debt.`,
  };

  const horizonMonths = Math.max(1, monthOffset + Math.max(0, planAdjustment.deferMonths));

  const computeHorizonFreeCash = (committed: number, extraLoan: number) => {
    const conservative = Math.round(
      combinedBalance +
        horizonMonths * (incomeBand.p15Conservative - committed - extraLoan - variableSpendBand.p85Optimistic) -
        bufferAmount
    );
    const expected = Math.round(
      combinedBalance +
        horizonMonths * (incomeBand.p50Expected - committed - extraLoan - variableSpendBand.p50Expected) -
        bufferAmount
    );
    const optimistic = Math.round(
      combinedBalance +
        horizonMonths * (incomeBand.p85Optimistic - committed - extraLoan - variableSpendBand.p15Conservative) -
        bufferAmount
    );
    return { conservative, expected, optimistic };
  };

  const prePurchaseFreeCash = computeHorizonFreeCash(effectiveCommittedMonthly, addedLoanMonthly);
  const postPurchaseFreeCash = {
    conservative: prePurchaseFreeCash.conservative - purchaseAmount,
    expected: prePurchaseFreeCash.expected - purchaseAmount,
    optimistic: prePurchaseFreeCash.optimistic - purchaseAmount,
  };

  // Baseline comparison when user modifies the plan (cancels subscriptions, adds EMI, or defers)
  const baselineHorizon = Math.max(1, monthOffset);
  const baselineExpectedPre = Math.round(
    combinedBalance +
      baselineHorizon * (incomeBand.p50Expected - rawCommittedMonthly - variableSpendBand.p50Expected) -
      Math.max(minimumFloor, Math.round((rawCommittedMonthly + variableSpendBand.p50Expected) * 0.2) + volatilityComponent)
  );
  const baselineExpectedPost = baselineExpectedPre - purchaseAmount;
  const baselineConservativePost =
    Math.round(
      combinedBalance +
        baselineHorizon * (incomeBand.p15Conservative - rawCommittedMonthly - variableSpendBand.p85Optimistic) -
        bufferAmount
    ) - purchaseAmount;

  const classifyVerdict = (consPost: number, expPost: number): AffordabilityVerdict => {
    if (!sufficiency.isSufficient) return 'INSUFFICIENT_DATA';
    if (consPost >= 0 && expPost >= 0) return 'AFFORDABLE';
    if (expPost >= 0 && consPost < 0) return 'CONDITIONAL_RANGE';
    return 'NOT_AFFORDABLE';
  };

  const verdict = classifyVerdict(postPurchaseFreeCash.conservative, postPurchaseFreeCash.expected);
  const baselineVerdict = classifyVerdict(baselineConservativePost, baselineExpectedPost);

  const hasPlanChanges =
    cancelledSavingsMonthly > 0 || addedLoanMonthly > 0 || planAdjustment.deferMonths > 0;

  const steps: ReasoningStep[] = [
    {
      stepNumber: 1,
      label: 'Current Combined Liquid Balance',
      operator: 'start',
      expectedAmount: combinedBalance,
      conservativeAmount: combinedBalance,
      optimisticAmount: combinedBalance,
      detail: 'Verified closing balances across all deduplicated accounts',
    },
    {
      stepNumber: 2,
      label: `Projected Reliable Income (${horizonMonths} mo)`,
      operator: 'add',
      expectedAmount: incomeBand.p50Expected * horizonMonths,
      conservativeAmount: incomeBand.p15Conservative * horizonMonths,
      optimisticAmount: incomeBand.p85Optimistic * horizonMonths,
      detail: irregularNotice.detected
        ? `Median monthly salary ₹${incomeBand.p50Expected.toLocaleString('en-IN')} (prior one-off bonus excluded)`
        : `P15–P85 monthly income range: ₹${incomeBand.p15Conservative.toLocaleString('en-IN')} – ₹${incomeBand.p85Optimistic.toLocaleString('en-IN')}`,
    },
    {
      stepNumber: 3,
      label: `Committed Recurring Payments (${horizonMonths} mo)`,
      operator: 'subtract',
      expectedAmount: (effectiveCommittedMonthly + addedLoanMonthly) * horizonMonths,
      conservativeAmount: (effectiveCommittedMonthly + addedLoanMonthly) * horizonMonths,
      optimisticAmount: (effectiveCommittedMonthly + addedLoanMonthly) * horizonMonths,
      detail:
        cancelledSavingsMonthly > 0 || addedLoanMonthly > 0
          ? `Base ₹${rawCommittedMonthly.toLocaleString('en-IN')}/mo − ₹${cancelledSavingsMonthly.toLocaleString('en-IN')} cancelled + ₹${addedLoanMonthly.toLocaleString('en-IN')} new EMI`
          : `${recurring.length} active EMIs, rent, and recurring subscriptions`,
    },
    {
      stepNumber: 4,
      label: `Estimated Variable Living Spend (${horizonMonths} mo)`,
      operator: 'subtract',
      expectedAmount: variableSpendBand.p50Expected * horizonMonths,
      conservativeAmount: variableSpendBand.p85Optimistic * horizonMonths,
      optimisticAmount: variableSpendBand.p15Conservative * horizonMonths,
      detail: `Food, travel, shopping & bills (historical range ₹${variableSpendBand.p15Conservative.toLocaleString('en-IN')} – ₹${variableSpendBand.p85Optimistic.toLocaleString('en-IN')}/mo)`,
    },
    {
      stepNumber: 5,
      label: 'Required Safety Buffer Reserve',
      operator: 'subtract',
      expectedAmount: bufferAmount,
      conservativeAmount: bufferAmount,
      optimisticAmount: bufferAmount,
      detail: safetyBuffer.formulaText,
    },
    {
      stepNumber: 6,
      label: 'Safe Spendable Headroom Before Purchase',
      operator: 'equals',
      expectedAmount: prePurchaseFreeCash.expected,
      conservativeAmount: prePurchaseFreeCash.conservative,
      optimisticAmount: prePurchaseFreeCash.optimistic,
      detail: 'Cash available above safety buffer prior to buying item',
    },
    {
      stepNumber: 7,
      label: `Planned Purchase: ${itemName}`,
      operator: 'subtract',
      expectedAmount: purchaseAmount,
      conservativeAmount: purchaseAmount,
      optimisticAmount: purchaseAmount,
      detail: `Target timeframe: ${
        planAdjustment.deferMonths > 0
          ? `Deferred +${planAdjustment.deferMonths} mo (${horizonMonths} months total)`
          : targetMonthLabel
      }`,
    },
    {
      stepNumber: 8,
      label: 'Final Post-Purchase Cushion (Above Safety Buffer)',
      operator: 'equals',
      expectedAmount: postPurchaseFreeCash.expected,
      conservativeAmount: postPurchaseFreeCash.conservative,
      optimisticAmount: postPurchaseFreeCash.optimistic,
      detail:
        postPurchaseFreeCash.expected >= 0
          ? 'Positive value means safety buffer stays intact'
          : 'Negative value indicates deficit / safety buffer breach',
    },
  ];

  let headline = '';
  if (verdict === 'INSUFFICIENT_DATA') {
    headline = 'Insufficient Statement History — Refusing Unverified Forecast';
  } else if (verdict === 'AFFORDABLE') {
    headline = `Affordable — ₹${postPurchaseFreeCash.expected.toLocaleString('en-IN')} Cushion Remains Above Buffer`;
  } else if (verdict === 'CONDITIONAL_RANGE') {
    headline = `Conditional — Affordable on Median Income, Short by ₹${Math.abs(postPurchaseFreeCash.conservative).toLocaleString('en-IN')} in Conservative Month`;
  } else {
    headline = `Not Affordable Next Month — Short by ₹${Math.abs(postPurchaseFreeCash.expected).toLocaleString('en-IN')} After Safety Buffer`;
  }

  return {
    verdict,
    headline,
    itemName,
    purchaseAmount,
    targetMonthLabel,
    currentBalance: combinedBalance,
    incomeBand,
    irregularIncome: irregularNotice,
    committedRecurringTotal: effectiveCommittedMonthly,
    cancelledSavingsMonthly,
    addedLoanMonthly,
    variableSpendBand,
    safetyBuffer,
    prePurchaseFreeCash,
    postPurchaseFreeCash,
    steps,
    sufficiency,
    baselineComparison: hasPlanChanges
      ? {
          baselineVerdict,
          baselineExpectedPostPurchase: baselineExpectedPost,
          deltaMonthlyImprovement: postPurchaseFreeCash.expected - baselineExpectedPost,
        }
      : undefined,
  };
}

/**
 * Extra Point ("Checking the forecast"):
 * Holds out the most recent complete month in history, runs the exact deterministic forecast
 * using only prior months, and audits how close the predicted ending balance & spend were to reality.
 */
export function runHistoricalForecastBacktest(transactions: Transaction[]): ForecastBacktestResult {
  const valid = transactions.filter((t) => !t.excludedAsDuplicate && t.category !== 'Self Transfer');
  const monthKeys = [...new Set(valid.map((t) => t.date.slice(0, 7)))].sort();

  if (monthKeys.length < 4) {
    return {
      available: false,
      reasonIfUnavailable: `Backtesting requires at least 4 statement months (3 training months + 1 holdout verification month). Currently ${monthKeys.length} month(s) loaded.`,
      holdoutMonthLabel: '',
      trainingMonthsCount: Math.max(0, monthKeys.length - 1),
      predictedIncome: 0,
      actualIncome: 0,
      predictedTotalSpend: 0,
      actualTotalSpend: 0,
      predictedEndingBalance: 0,
      predictedBalanceRange: [0, 0],
      actualEndingBalance: 0,
      absoluteBalanceError: 0,
      balanceAccuracyPct: 0,
      withinUncertaintyBand: false,
      varianceDrivers: [],
    };
  }

  const holdoutKey = monthKeys[monthKeys.length - 1];
  const trainingTxns = valid.filter((t) => t.date.slice(0, 7) < holdoutKey);
  const holdoutTxns = valid.filter((t) => t.date.slice(0, 7) === holdoutKey);

  const { combinedBalance: startOfHoldoutBalance } = computeAccountSummaries(trainingTxns);
  const trainingRecurring = detectRecurringPayments(trainingTxns);
  const { regularMonthlyIncomes, variableMonthlySpends } = buildMonthlySeriesAndForecast(
    trainingTxns,
    trainingRecurring,
    startOfHoldoutBalance
  );

  const incBand = computeUncertaintyBand(regularMonthlyIncomes);
  const varBand = computeUncertaintyBand(variableMonthlySpends);
  const predCommitted = trainingRecurring.reduce((s, r) => s + r.averageAmount, 0);

  const predictedIncome = incBand.p50Expected;
  const predictedTotalSpend = predCommitted + varBand.p50Expected;
  const predictedEndingBalance = startOfHoldoutBalance + predictedIncome - predictedTotalSpend;
  const lowEndBal = startOfHoldoutBalance + incBand.p15Conservative - predCommitted - varBand.p85Optimistic;
  const highEndBal = startOfHoldoutBalance + incBand.p85Optimistic - predCommitted - varBand.p15Conservative;

  const actualIncome = Math.round(
    holdoutTxns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
  );
  const actualTotalSpend = Math.round(
    holdoutTxns.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
  );
  const actualEndingBalance = Math.round(startOfHoldoutBalance + actualIncome - actualTotalSpend);

  const absoluteBalanceError = Math.abs(actualEndingBalance - predictedEndingBalance);
  const denom = Math.max(1, actualEndingBalance, actualTotalSpend);
  const balanceAccuracyPct = Number(
    Math.max(0, Math.min(100, (1 - absoluteBalanceError / denom) * 100)).toFixed(1)
  );

  const withinUncertaintyBand =
    actualEndingBalance >= lowEndBal && actualEndingBalance <= highEndBal;

  const varianceDrivers: string[] = [];
  const spendDelta = actualTotalSpend - predictedTotalSpend;
  const incDelta = actualIncome - predictedIncome;

  if (Math.abs(incDelta) > 1000) {
    varianceDrivers.push(
      `Realized income was ₹${Math.abs(incDelta).toLocaleString('en-IN')} ${incDelta > 0 ? 'higher' : 'lower'} than the 3-month training median.`
    );
  }
  if (Math.abs(spendDelta) > 1000) {
    varianceDrivers.push(
      `Actual spending was ₹${Math.abs(spendDelta).toLocaleString('en-IN')} ${spendDelta > 0 ? 'above' : 'below'} projected committed + variable baseline.`
    );
  }
  const holdoutAnomalies = detectAnomalies(valid).filter((a) => a.date.startsWith(holdoutKey));
  if (holdoutAnomalies.length > 0) {
    varianceDrivers.push(
      `${holdoutAnomalies.length} unusual charge(s) occurred in ${formatMonthLabel(holdoutKey)} (${holdoutAnomalies
        .map((a) => `${a.category}: ₹${a.amount.toLocaleString('en-IN')}`)
        .slice(0, 2)
        .join(', ')}).`
    );
  }
  if (varianceDrivers.length === 0) {
    varianceDrivers.push('Income and recurring obligations tracked closely with prior months.');
  }

  return {
    available: true,
    holdoutMonthLabel: formatMonthLabel(holdoutKey),
    trainingMonthsCount: monthKeys.length - 1,
    predictedIncome,
    actualIncome,
    predictedTotalSpend,
    actualTotalSpend,
    predictedEndingBalance,
    predictedBalanceRange: [Math.round(lowEndBal), Math.round(highEndBal)],
    actualEndingBalance,
    absoluteBalanceError,
    balanceAccuracyPct,
    withinUncertaintyBand,
    varianceDrivers,
  };
}
