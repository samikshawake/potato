import type {
  Transaction,
  ExplainableGoalResult,
  GoalTimelineOption,
  GoalSimulatorExplanationPanel,
} from '../types/finance.ts';
import { analyzeMultiMonthDiagnostics } from './simulator.ts';
import { detectRecurringPayments, calculateTotalRecurringMonthly } from './recurringDetector.ts';
import { formatINR } from '../constants/theme.ts';

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

/**
 * Deterministic calculation engine for Feature 1: Explainable Financial Goal Simulator.
 * Computes exact goal completion predictions, evaluates multiple timeline options (Now, 3m, 6m, 8m, 12m),
 * picks the best purchase recommendation, and outputs a 10-point explanation panel.
 */
export function calculateExplainableGoalSimulation(
  input: GoalSimulatorInput,
  transactions: Transaction[] = [],
  currentBalanceParam?: number
): ExplainableGoalResult {
  const currentBalance = input.currentAvailableBalance ?? currentBalanceParam ?? 0;
  const goalName = input.goalName.trim() || 'Financial Goal';
  const goalAmount = Math.max(100, input.goalAmount || 0);

  const diag = analyzeMultiMonthDiagnostics(
    transactions,
    currentBalance,
    input.customEmergencyReserveFloor
  );
  const emergencyReserveFloor = diag.safetyBufferAmount;

  const recurringList = detectRecurringPayments(transactions);
  const totalRecurringCommitments = calculateTotalRecurringMonthly(recurringList);

  const totalMonthlyIncome = Math.max(0, diag.incomeExpected);
  const averageVariableExpenses = Math.max(0, diag.variableExpected);
  const monthlyEssentialExpenses = totalRecurringCommitments;

  // Net monthly savings capacity
  const monthlySavingsCapacity = Math.max(
    0,
    totalMonthlyIncome - monthlyEssentialExpenses - averageVariableExpenses
  );

  // Time required (in months) to reach goal purely from future savings
  const estimatedMonthsToGoal =
    monthlySavingsCapacity > 0
      ? Math.ceil(goalAmount / monthlySavingsCapacity)
      : 99;

  // Expected completion date
  const now = new Date();
  const completionDateObj = new Date(
    now.getFullYear(),
    now.getMonth() + estimatedMonthsToGoal,
    1
  );
  const expectedCompletionDate = completionDateObj.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  // Current savings progress %
  const currentSavingsProgressPct = Math.min(
    100,
    Math.round((currentBalance / goalAmount) * 100)
  );

  // Evaluate target date if specified
  const targetMonths = input.targetMonths || estimatedMonthsToGoal;
  const requiredMonthlySavings = Math.ceil(goalAmount / Math.max(1, targetMonths));
  const isTargetDateRealistic =
    monthlySavingsCapacity > 0 && requiredMonthlySavings <= monthlySavingsCapacity * 1.1;

  let targetAssessmentText = '';
  if (isTargetDateRealistic) {
    targetAssessmentText = `Target of ${targetMonths} month(s) is realistic based on your ₹${monthlySavingsCapacity.toLocaleString(
      'en-IN'
    )}/mo savings capacity.`;
  } else if (monthlySavingsCapacity > 0) {
    targetAssessmentText = `Target of ${targetMonths} month(s) requires ₹${requiredMonthlySavings.toLocaleString(
      'en-IN'
    )}/mo savings, which exceeds your current capacity of ₹${monthlySavingsCapacity.toLocaleString(
      'en-IN'
    )}/mo.`;
  } else {
    targetAssessmentText = `Target date is currently unrealistic because your monthly expenses match or exceed monthly income.`;
  }

  // ----------------------------------------------------
  // Evaluate Multiple Purchase Timeline Options
  // ----------------------------------------------------
  const candidateMonthSteps = [0, 3, 6, 8, 12];
  if (!candidateMonthSteps.includes(targetMonths)) {
    candidateMonthSteps.push(targetMonths);
    candidateMonthSteps.sort((a, b) => a - b);
  }

  const timelineOptions: GoalTimelineOption[] = candidateMonthSteps.map((m) => {
    const optDate = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const dateLabel =
      m === 0
        ? 'Purchase Immediately'
        : optDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

    const projectedSavingsAccumulated = m * monthlySavingsCapacity;
    const totalCashBeforePurchase = currentBalance + projectedSavingsAccumulated;
    const projectedEndingBalance = totalCashBeforePurchase - goalAmount;

    const emergencyBufferRemaining = projectedEndingBalance - emergencyReserveFloor;
    const emergencyCoverageMonthsRemaining =
      monthlyEssentialExpenses > 0
        ? Number((projectedEndingBalance / monthlyEssentialExpenses).toFixed(1))
        : 6;

    let rating: GoalTimelineOption['rating'] = 'POSSIBLE';
    let summaryVerdict = '';
    let explanation = '';

    if (projectedEndingBalance < 0) {
      rating = 'NOT_RECOMMENDED';
      summaryVerdict = 'Causes negative balance';
      explanation = `Purchasing in ${m} month(s) leaves an overdraft of ${formatINR(
        Math.abs(projectedEndingBalance)
      )}. Your total accumulated cash would be insufficient.`;
    } else if (emergencyBufferRemaining < 0) {
      rating = 'FINANCIALLY_RISKY';
      summaryVerdict = `Depletes emergency fund by ${formatINR(
        Math.abs(emergencyBufferRemaining)
      )}`;
      explanation = `Purchasing in ${m} month(s) reduces your available balance to ${formatINR(
        projectedEndingBalance
      )}, breaking your emergency floor of ${formatINR(emergencyReserveFloor)}.`;
    } else if (emergencyBufferRemaining < 10000) {
      rating = 'POSSIBLE';
      summaryVerdict = `Thin buffer of ${formatINR(emergencyBufferRemaining)} above reserve`;
      explanation = `Possible after ${m} month(s), but leaves only a thin ${formatINR(
        emergencyBufferRemaining
      )} buffer above your emergency floor.`;
    } else {
      rating = 'RECOMMENDED';
      summaryVerdict = `Comfortable buffer of ${formatINR(emergencyBufferRemaining)} remaining`;
      explanation = `Recommended timeline: Saving ₹${monthlySavingsCapacity.toLocaleString(
        'en-IN'
      )}/mo for ${m} month(s) accumulates ${formatINR(
        projectedSavingsAccumulated
      )}, allowing you to buy ${goalName} while leaving ${formatINR(
        projectedEndingBalance
      )} intact (${emergencyCoverageMonthsRemaining} months of essential coverage).`;
    }

    return {
      months: m,
      label: m === 0 ? 'Buy Now' : `${m} Months`,
      expectedDate: dateLabel,
      requiredMonthlySavings: m > 0 ? Math.ceil(goalAmount / m) : goalAmount,
      projectedSavingsAccumulated,
      projectedEndingBalance,
      emergencyBufferRemaining,
      emergencyCoverageMonthsRemaining,
      rating,
      summaryVerdict,
      explanation,
    };
  });

  // Pick the recommended option: Earliest option with rating RECOMMENDED
  let recommendedOption =
    timelineOptions.find((o) => o.rating === 'RECOMMENDED') ||
    timelineOptions.find((o) => o.rating === 'POSSIBLE') ||
    timelineOptions[timelineOptions.length - 1];

  // ----------------------------------------------------
  // 10-Point Explanation Panel
  // ----------------------------------------------------
  const detailedReasoning = `You should ideally wait ${
    recommendedOption.months
  } month(s) (${recommendedOption.expectedDate}) before purchasing ${goalName} worth ${formatINR(
    goalAmount
  )}. Your current monthly savings capacity is ${formatINR(
    monthlySavingsCapacity
  )} (Income: ${formatINR(totalMonthlyIncome)} − Essential Bills: ${formatINR(
    monthlyEssentialExpenses
  )} − Variable Spend: ${formatINR(averageVariableExpenses)}). ${
    recommendedOption.months === 0
      ? `You can afford this immediately as your ending balance of ${formatINR(
          recommendedOption.projectedEndingBalance
        )} leaves a comfortable reserve above your ${formatINR(
          emergencyReserveFloor
        )} emergency floor.`
      : `Purchasing earlier would reduce your available balance below your preferred emergency safety buffer of ${formatINR(
          emergencyReserveFloor
        )}. Saving ${formatINR(
          monthlySavingsCapacity
        )} every month preserves ${formatINR(
          recommendedOption.projectedEndingBalance
        )} in total capital (${recommendedOption.emergencyCoverageMonthsRemaining} months of essential coverage).`
  }`;

  const explanationPanel: GoalSimulatorExplanationPanel = {
    currentAvailableBalance: currentBalance,
    totalMonthlyIncome,
    monthlyEssentialExpenses,
    averageVariableExpenses,
    goalAmount,
    monthlySavingsCapacity,
    expectedMonthsToGoal: estimatedMonthsToGoal,
    expectedCompletionDate,
    recommendedPurchaseDate: `${recommendedOption.expectedDate} (${recommendedOption.months} mo)`,
    projectedBalanceAfterPurchase: recommendedOption.projectedEndingBalance,
    emergencyFundImpact:
      recommendedOption.emergencyBufferRemaining >= 0
        ? `100% Emergency Reserve Protected (${recommendedOption.emergencyCoverageMonthsRemaining} Months Coverage)`
        : `Deficit of ${formatINR(
            Math.abs(recommendedOption.emergencyBufferRemaining)
          )} below Emergency Reserve`,
    risksAndAssumptions: [
      `Assumes average variable living spending remains capped at ${formatINR(
        averageVariableExpenses
      )}/mo.`,
      `Assumes regular monthly income of ${formatINR(
        totalMonthlyIncome
      )} remains consistent.`,
      `Protected Emergency Reserve Floor set at ${formatINR(
        emergencyReserveFloor
      )} (${diag.safetyBufferFormula}).`,
    ],
    detailedReasoning,
  };

  return {
    goalName,
    goalAmount,
    monthlySavingsCapacity,
    estimatedMonthsToGoal,
    expectedCompletionDate,
    currentSavingsProgressPct,
    isTargetDateRealistic,
    targetAssessmentText,
    recommendedOption,
    timelineOptions,
    explanationPanel,
  };
}
