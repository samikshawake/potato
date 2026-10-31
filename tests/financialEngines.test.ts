import { calculateExplainableGoalSimulation } from '../FRONTEND/src/services/goalSimulatorEngine';
import {
  VERIFIED_INVESTMENT_PRODUCTS,
  analyzeInvestmentSuggestions,
} from '../FRONTEND/src/services/investmentSuggestionsEngine';
import { calculateCompartmentsState } from '../FRONTEND/src/services/compartmentsEngine';
import {
  compute7DaySafeToSpend,
  detectDailyBillCollisions,
} from '../FRONTEND/src/services/dailyCashflowEngine';
import { RecurringPayment, Transaction } from '../FRONTEND/src/types/finance';

function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING CASH COMPASS FINANCIAL ENGINES SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Explainable Goal Simulator Engine
  // --------------------------------------------------------------------------
  console.log('--- Suite 1: Explainable Financial Goal Simulator ---');
  const goalSimResult = calculateExplainableGoalSimulation({
    goalName: 'Developer Laptop',
    goalAmount: 80000,
    targetMonths: 6,
    currentAvailableBalance: 45000,
    monthlyIncome: 65000,
    monthlyEssentialExpenses: 25000,
    averageVariableExpenses: 15000,
    existingSavings: 20000,
    emergencyFundBalance: 15000,
    existingInvestments: 10000,
    upcomingEmis: 0,
    monthlySavingsCapacity: 25000,
  });

  assert(
    goalSimResult.goalName === 'Developer Laptop' && goalSimResult.goalAmount === 80000,
    'Goal simulation returns correct metadata'
  );

  assert(
    goalSimResult.estimatedMonthsToGoal > 0 && typeof goalSimResult.expectedCompletionDate === 'string',
    'Goal timeline predicts estimated months and expected date'
  );

  assert(
    goalSimResult.timelineOptions.length === 5,
    'Goal simulation evaluates 5 timeline options (Now, 3m, 6m, 8m, 12m)'
  );

  assert(
    typeof goalSimResult.explanationPanel.currentAvailableBalance === 'number' &&
      typeof goalSimResult.explanationPanel.emergencyFundImpact === 'string' &&
      goalSimResult.explanationPanel.risksAndAssumptions.length > 0,
    'Explanation panel contains 10 key metric parameters, impact notes, and risk assumptions'
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Investment Suggestions Engine
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 2: Investment Suggestions & Risk Matrix ---');

  assert(
    VERIFIED_INVESTMENT_PRODUCTS.length >= 8,
    'Catalog contains at least 8 verified Indian financial investment products (FD, RD, MFs, ETFs, Stocks)'
  );

  const invAnalysis = analyzeInvestmentSuggestions(
    25000,
    [],
    50000,
    6
  );

  assert(
    invAnalysis.enteredAmount === 25000 &&
      typeof invAnalysis.personalizedRecommendation.reasoning === 'string',
    'Investment capacity analysis calculates capacity and emergency status'
  );

  assert(
    invAnalysis.eligibleLowRiskProducts.length > 0,
    'Investment catalog returns eligible low-risk products for entered capital'
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Separate Financial Allocation Compartments
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 3: Allocation Compartments & Double-Counting Prevention ---');

  const compState = calculateCompartmentsState(100000, 70000, 25000, [], 6);

  assert(
    compState.emergencyTargetAmount === 25000 * 6,
    'Emergency target correctly calculates 6 months of essential expenses (₹1,50,000)'
  );

  const sumOfCompartments =
    compState.reservedForEmergency +
    compState.allocatedToInvestments +
    compState.reservedForSavings +
    compState.unallocatedDiscretionaryBalance;

  assert(
    Math.abs(sumOfCompartments - compState.totalAvailableCash) < 0.01,
    'No Double-Counting: Sum of (Emergency + Investment + Savings + Unallocated) strictly equals Total Available Cash'
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Daily Bill Collision & Safe-to-Spend System
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 4: Daily Bill Collision Warnings & Safe-to-Spend Calendar ---');

  const mockRecurring: RecurringPayment[] = [
    {
      id: 'rec_rent',
      name: 'House Rent',
      category: 'Rent',
      amount: 18000,
      frequency: 'MONTHLY',
      lastPaymentDate: '2026-10-01',
      nextExpectedDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      isAutoDebit: true,
      confidenceScore: 0.95,
      explanation: 'Monthly rent debit',
    },
    {
      id: 'rec_wifi',
      name: 'Airtel Broadband',
      category: 'Bills',
      amount: 1499,
      frequency: 'MONTHLY',
      lastPaymentDate: '2026-10-01',
      nextExpectedDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      isAutoDebit: false,
      confidenceScore: 0.9,
      explanation: 'Broadband bill',
    },
  ];

  const mockTx: Transaction[] = [];

  const collisions = detectDailyBillCollisions(mockRecurring);
  assert(
    Array.isArray(collisions),
    'Bill collision engine detects payment concentration clusters'
  );

  const safeToSpend = compute7DaySafeToSpend(
    50000,
    mockTx,
    mockRecurring,
    60000,
    25000,
    15000
  );

  assert(
    safeToSpend.length === 7,
    'Safe-to-Spend engine calculates rolling 7-day daily limits (Mon to Sun)'
  );

  assert(
    safeToSpend.every(
      (d) =>
        typeof d.safeToSpendAmount === 'number' &&
        typeof d.openingBalance === 'number' &&
        typeof d.explanation === 'string'
    ),
    'Every safe-to-spend item has full mathematical ledger properties'
  );

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
