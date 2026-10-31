import type {
  Transaction,
  SavingsGoal,
  CompartmentsState,
} from '../types/finance.ts';
import { calculateTotalExpenses, calculateTotalIncome } from './financeEngine.ts';
import { detectRecurringPayments, calculateTotalRecurringMonthly } from './recurringDetector.ts';
import { analyzeMultiMonthDiagnostics } from './simulator.ts';

export interface CompartmentsInputOptions {
  emergencyTargetMonths?: 3 | 6 | 12; // 3, 6, or 12 months
  userIntendedInvestmentAmount?: number;
  userInvestedAmountOverride?: number;
}

/**
 * Deterministic Engine for Feature 3: Separate Financial Allocation Compartments.
 * Prevents double-counting by strictly partitioning total liquid balance into 4 disjoint buckets:
 * 1. Emergency Fund Reserved
 * 2. Investments
 * 3. Savings Goals Reserved
 * 4. Unallocated Discretionary Cash
 */
export function calculateCompartmentsState(
  arg1: Transaction[] | number,
  arg2?: SavingsGoal[] | number,
  arg3?: number,
  arg4?: SavingsGoal[] | CompartmentsInputOptions,
  arg5?: 3 | 6 | 12
): CompartmentsState {
  let transactions: Transaction[] = [];
  let goals: SavingsGoal[] = [];
  let totalBalance = 0;
  let targetMonths: 3 | 6 | 12 = 6;
  let explicitEssential: number | null = null;

  if (typeof arg1 === 'number') {
    totalBalance = arg1;
    if (typeof arg2 === 'number') {
      // (totalBalance, totalIncome, monthlyEssentialExpenses, goals, targetMonths)
      explicitEssential = (arg3 as number) || null;
      goals = Array.isArray(arg4) ? arg4 : [];
      targetMonths = (arg5 as 3 | 6 | 12) || 6;
    }
  } else {
    transactions = Array.isArray(arg1) ? arg1 : [];
    goals = Array.isArray(arg2) ? (arg2 as SavingsGoal[]) : [];
    totalBalance = typeof arg3 === 'number' ? arg3 : 0;
    const opts = arg4 as CompartmentsInputOptions;
    targetMonths = opts?.emergencyTargetMonths || 6;
  }

  // Monthly essential expenses calculation
  const recurringList = detectRecurringPayments(transactions);
  const recurringBills = calculateTotalRecurringMonthly(recurringList);
  const totalMonthlyExpenses = calculateTotalExpenses(transactions);

  const monthlyEssentialExpenses =
    explicitEssential !== null
      ? explicitEssential
      : recurringBills > 0
      ? recurringBills
      : Math.max(10000, Math.round(totalMonthlyExpenses * 0.6));

  // 1. Emergency Fund Compartment
  const emergencyTargetAmount = monthlyEssentialExpenses * targetMonths;

  // Available cash partition
  const emergencyFundBalance = Math.min(totalBalance, emergencyTargetAmount);
  const emergencyCoverageMonths =
    monthlyEssentialExpenses > 0
      ? Number((emergencyFundBalance / monthlyEssentialExpenses).toFixed(1))
      : targetMonths;
  const emergencyRemainingRequired = Math.max(0, emergencyTargetAmount - emergencyFundBalance);
  const emergencyProgressPct =
    emergencyTargetAmount > 0
      ? Math.min(100, Math.round((emergencyFundBalance / emergencyTargetAmount) * 100))
      : 100;

  // Cash remaining after emergency fund is locked
  const cashAfterEmergency = Math.max(0, totalBalance - emergencyFundBalance);

  // 2. Savings Compartment
  const safeGoals = Array.isArray(goals) ? goals : [];
  const activeGoals = safeGoals.filter((g) => !g.isCompleted);
  const savingsTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const rawSavingsCurrent = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);

  // Protect cash from double counting: savings reserved cannot exceed cash left after emergency
  const reservedForSavings = Math.min(cashAfterEmergency, rawSavingsCurrent);
  const savingsRemainingTarget = Math.max(0, savingsTarget - reservedForSavings);
  const savingsProgressPct =
    savingsTarget > 0 ? Math.min(100, Math.round((reservedForSavings / savingsTarget) * 100)) : 100;

  const totalMonthlyIncome = calculateTotalIncome(transactions);
  const diag = analyzeMultiMonthDiagnostics(transactions, totalBalance);
  const monthlySavingsCapacity = Math.max(
    0,
    diag.incomeExpected - diag.variableExpected - recurringBills
  );
  const estimatedMonthsToSavingsTarget =
    monthlySavingsCapacity > 0 ? Math.ceil(savingsRemainingTarget / monthlySavingsCapacity) : 99;

  // Cash remaining after emergency & savings goals are locked
  const cashAfterSavings = Math.max(0, cashAfterEmergency - reservedForSavings);

  // 3. Investment Compartment
  const options = typeof arg4 === 'object' && !Array.isArray(arg4) ? (arg4 as CompartmentsInputOptions) : undefined;
  const intendedInvestment = options?.userIntendedInvestmentAmount || 0;
  const userInvestedAmount = options?.userInvestedAmountOverride || 0;

  // Amount available for new investments is capped by remaining cash after emergency & savings
  const investmentAvailableNew = Math.min(cashAfterSavings, intendedInvestment);
  const allocatedToInvestments = investmentAvailableNew;

  // Low vs High risk split of investment capacity
  const investmentLowRiskAlloc = Math.round(investmentAvailableNew * 0.3);
  const investmentHighRiskAlloc = Math.round(investmentAvailableNew * 0.7);

  // 4. Unallocated Discretionary Cash
  const unallocatedDiscretionaryBalance = Math.max(
    0,
    totalBalance - (emergencyFundBalance + reservedForSavings + allocatedToInvestments)
  );

  return {
    // Emergency
    emergencyFundBalance,
    emergencyTargetMonths: targetMonths,
    monthlyEssentialExpenses,
    emergencyTargetAmount,
    emergencyCoverageMonths,
    emergencyRemainingRequired,
    emergencyProgressPct,

    // Investment
    investmentTotal: userInvestedAmount + investmentAvailableNew,
    monthlyInvestmentCapacity: monthlySavingsCapacity,
    investmentAmountAlreadyInvested: userInvestedAmount,
    investmentAvailableNew,
    investmentLowRiskAlloc,
    investmentHighRiskAlloc,

    // Savings
    savingsTotal: reservedForSavings,
    monthlySavings: monthlySavingsCapacity,
    savingsTarget,
    savingsRemainingTarget,
    savingsProgressPct,
    estimatedMonthsToSavingsTarget,

    // Overview (Strictly partition totalBalance with zero double counting)
    totalAvailableCash: totalBalance,
    reservedForEmergency: emergencyFundBalance,
    allocatedToInvestments,
    reservedForSavings,
    unallocatedDiscretionaryBalance,
  };
}
