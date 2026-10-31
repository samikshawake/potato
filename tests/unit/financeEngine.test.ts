/**
 * Deterministic Unit Verification Suite for CashCompass Finance & Security Engine.
 * Validates multi-account deduplication, <3 month insufficiency guardrails,
 * irregular bonus exclusion, smart merchant category propagation, backtesting,
 * SSRF protection, and PII log redaction.
 */

import { buildPresetDataset } from '../../src/data/sampleDatasets';
import {
  applyCategoryCorrectionWithPropagation,
  computeAccountSummaries,
  detectAnomalies,
  detectRecurringPayments,
  evaluateAffordabilityDeterministic,
  evaluateDataSufficiency,
  runHistoricalForecastBacktest,
} from '../../src/engine/financeEngine';
import { validateUrlAgainstSSRF } from '../../src/security/ssrfGuard';
import { redactSensitiveString } from '../../src/security/safeLogger';

export function runAllUnitChecks(): { passed: number; results: string[] } {
  const results: string[] = [];

  // 1. Multi-account deduplication check
  const full = buildPresetDataset('multi-account-full');
  if (full.report.deduplicatedCount < 2) {
    throw new Error('Expected overlapping CSV & self-transfer entries to be deduplicated');
  }
  results.push(`PASS: Deduplicated ${full.report.deduplicatedCount} overlapping/self-transfer entries`);

  // 2. Recurring payment detection
  const recurring = detectRecurringPayments(full.transactions);
  if (recurring.length < 4) {
    throw new Error('Expected recurring subscriptions, EMI, and rent to be detected');
  }
  results.push(`PASS: Detected ${recurring.length} recurring obligations with next expected dates`);

  // 3. Irregular bonus exclusion on ₹80,000 phone check
  const { combinedBalance } = computeAccountSummaries(full.transactions);
  const eval80k = evaluateAffordabilityDeterministic({
    transactions: full.transactions,
    recurring,
    combinedBalance,
    itemName: 'Phone',
    purchaseAmount: 80000,
    targetMonthLabel: 'Next Month',
    monthOffset: 1,
    planAdjustment: {
      cancelledRecurringIds: [],
      newMonthlyLoanEmi: 0,
      newLoanLabel: '',
      deferMonths: 0,
    },
  });
  if (!eval80k.irregularIncome.detected) {
    throw new Error('Expected one-off ₹85,000 annual bonus to be flagged and excluded from regular monthly income');
  }
  if (eval80k.steps.length !== 8) {
    throw new Error('Expected all 8 reasoning steps to be visible');
  }
  results.push('PASS: One-off bonus excluded and all 8 reasoning steps emitted');

  // 4. < 3 months data insufficiency guardrail
  const shortSet = buildPresetDataset('short-incomplete');
  const suff = evaluateDataSufficiency(shortSet.transactions);
  if (suff.isSufficient) {
    throw new Error('Expected <3 month dataset to fail data sufficiency guardrail');
  }
  results.push('PASS: Short dataset (<3 months) properly triggers insufficiency guardrail');

  // 5. Category correction propagation
  const swiggyTxn = full.transactions.find((t) => t.normalizedMerchant.includes('SWIGGY'));
  if (swiggyTxn) {
    const { correctionLog } = applyCategoryCorrectionWithPropagation(
      full.transactions,
      swiggyTxn.id,
      'Shopping'
    );
    if (!correctionLog || correctionLog.affectedTransactionIds.length < 2) {
      throw new Error('Expected category correction to propagate across matching merchant transactions');
    }
    results.push(
      `PASS: Category correction propagated across ${correctionLog.affectedTransactionIds.length} similar transactions`
    );
  }

  // 6. Anomaly detection & Backtest check
  const anomalies = detectAnomalies(full.transactions);
  const backtest = runHistoricalForecastBacktest(full.transactions);
  if (anomalies.length === 0 || !backtest.available) {
    throw new Error('Expected anomalies and 4+ month historical backtest to be populated');
  }
  results.push(
    `PASS: Detected ${anomalies.length} anomalies and verified holdout backtest (${backtest.balanceAccuracyPct}% accuracy)`
  );

  // 7. SSRF protection check
  const metadataCheck = validateUrlAgainstSSRF('http://169.254.169.254/latest/meta-data/');
  const localhostCheck = validateUrlAgainstSSRF('https://127.0.0.1:8080/api');
  const validReleaseCheck = validateUrlAgainstSSRF(
    'https://github.com/itss-meS/finance_assistant/releases/tag/model-V1'
  );
  if (metadataCheck.allowed || localhostCheck.allowed || !validReleaseCheck.allowed) {
    throw new Error('SSRF guard failed to block metadata/localhost or allow valid HTTPS release');
  }
  results.push('PASS: SSRF Guard blocks 169.254.169.254 & 127.0.0.1 while allowing verified HTTPS GitHub Release');

  // 8. Sensitive data log redaction check
  const scrubbed = redactSensitiveString(
    'Auth Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig acct 4821990011223344 user@example.com'
  );
  if (scrubbed.includes('eyJhbGci') || scrubbed.includes('4821990011223344') || scrubbed.includes('user@example.com')) {
    throw new Error('Expected JWT, account number, and full email to be redacted from logs');
  }
  results.push('PASS: SafeLogger scrubs JWTs, bank account numbers, and emails from logs');

  return { passed: results.length, results };
}
