import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  SlidersHorizontal,
  RotateCcw,
  ArrowRight,
  Info,
} from 'lucide-react';
import type {
  AffordabilityEvaluation,
  ExtractedPlanIntent,
  PlanAdjustment,
  RecurringPayment,
} from '../types/finance';

interface AffordabilityPlannerViewProps {
  queryText: string;
  onQueryChange: (val: string) => void;
  onRunPlan: (overrideQuery?: string) => void;
  intent: ExtractedPlanIntent | null;
  evaluation: AffordabilityEvaluation;
  streamedExplanation: string;
  recurringPayments: RecurringPayment[];
  planAdjustment: PlanAdjustment;
  onChangePlanAdjustment: (next: PlanAdjustment) => void;
  isEvaluating: boolean;
}

const EXAMPLE_PLANS = [
  'Can I afford an ₹80,000 phone next month?',
  'Can I afford a ₹42,000 laptop next month?',
  'My plan: buy an ₹80,000 phone in 2 months and cancel Cult Fit and Netflix',
  'Can I afford a ₹28,000 flight next month if I take a ₹3,500 EMI?',
];

function formatSignedINR(val: number): string {
  const sign = val < 0 ? '-' : '';
  return `${sign}₹${Math.abs(Math.round(val)).toLocaleString('en-IN')}`;
}

export const AffordabilityPlannerView: React.FC<AffordabilityPlannerViewProps> = ({
  queryText,
  onQueryChange,
  onRunPlan,
  intent,
  evaluation,
  streamedExplanation,
  recurringPayments,
  planAdjustment,
  onChangePlanAdjustment,
  isEvaluating,
}) => {
  const [showTokens, setShowTokens] = useState(true);

  const toggleCancelledRecurring = (id: string) => {
    const exists = planAdjustment.cancelledRecurringIds.includes(id);
    const nextIds = exists
      ? planAdjustment.cancelledRecurringIds.filter((x) => x !== id)
      : [...planAdjustment.cancelledRecurringIds, id];
    onChangePlanAdjustment({
      ...planAdjustment,
      cancelledRecurringIds: nextIds,
    });
  };

  const resetWhatIf = () => {
    onChangePlanAdjustment({
      cancelledRecurringIds: [],
      newMonthlyLoanEmi: 0,
      newLoanLabel: '',
      deferMonths: 0,
    });
  };

  const hasWhatIfActive =
    planAdjustment.cancelledRecurringIds.length > 0 ||
    planAdjustment.newMonthlyLoanEmi > 0 ||
    planAdjustment.deferMonths > 0;

  return (
    <div className="space-y-8">
      {/* Natural Language Plan Input & On-Device Tokenizer Strip */}
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Write Your Purchase Plan or Affordability Question
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              On-device SentencePiece tokenizer + Llama intent extractor parses your natural-language plan; 100% of cash-flow math runs deterministically in TypeScript.
            </p>
          </div>
          {intent && (
            <div className="font-mono text-xs text-slate-600">
              <span>Tokenize: {intent.tokenizeMs} ms</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span>Intent: {intent.inferenceMs} ms</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="text-[#1D4ED8] font-semibold">{intent.tokensPerSec} tok/s</span>
              {intent.kvCacheHit && (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="text-[#1E3A8A] font-semibold">KV-Cache Hit</span>
                </>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRunPlan();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={queryText}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="e.g., Can I afford an ₹80,000 phone next month?"
            className="flex-1 px-4 py-3 text-sm border border-slate-300 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
          />
          <button
            type="submit"
            disabled={isEvaluating}
            className="px-6 py-3 bg-[#E03124] hover:bg-[#C92519] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Zap className="w-4 h-4" />
            <span>{isEvaluating ? 'Evaluating...' : 'Evaluate Plan'}</span>
          </button>
        </form>

        {/* Quick Preset Questions */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <span className="text-slate-400 font-medium">Try plan:</span>
          {EXAMPLE_PLANS.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                onQueryChange(sample);
                onRunPlan(sample);
              }}
              className="text-[#1D4ED8] hover:underline text-left"
            >
              “{sample}”
            </button>
          ))}
        </div>

        {/* Subword Tokenizer Output Inspection */}
        {intent && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div>
                <span>Extracted Plan Slots: </span>
                <span className="font-semibold text-slate-800">{intent.itemName}</span>
                <span className="mx-1.5">·</span>
                <span className="font-mono font-semibold text-slate-800">
                  ₹{intent.purchaseAmount.toLocaleString('en-IN')}
                </span>
                <span className="mx-1.5">·</span>
                <span className="text-slate-700">{intent.targetMonthLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTokens((v) => !v)}
                className="text-xs text-[#1D4ED8] hover:underline whitespace-nowrap"
              >
                {showTokens ? 'Hide Subword Tokens' : `Show ${intent.tokensEncoded} Tokens`}
              </button>
            </div>

            {showTokens && (
              <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px]">
                {intent.tokenPreview.map((tok, i) => (
                  <span
                    key={`${tok.id}-${i}`}
                    className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-700"
                    title={`Token ID: ${tok.id}`}
                  >
                    {tok.piece}
                    <span className="text-slate-400 ml-1">#{tok.id}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Guardrail Banner if Data < 3 Months or Missing Income */}
      {!evaluation.sufficiency.isSufficient && (
        <section className="border border-[#E03124] bg-red-50/40 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#E03124] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cannot Give a Confident Number — Statement History Is Incomplete
              </h3>
              <p className="text-sm text-slate-700 mt-1">
                Giving an affordability green-light on incomplete data can push you into debt. CashCompass requires at least 3 months of continuous statement history and verifiable income credits.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-[#E03124] font-medium list-disc list-inside">
                {evaluation.sufficiency.missingReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Verdict Banner + Grounded Llama Explanation */}
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-start gap-3">
            {evaluation.verdict === 'AFFORDABLE' && (
              <CheckCircle2 className="w-6 h-6 text-[#1D4ED8] shrink-0 mt-0.5" />
            )}
            {evaluation.verdict === 'CONDITIONAL_RANGE' && (
              <Info className="w-6 h-6 text-[#1E3A8A] shrink-0 mt-0.5" />
            )}
            {(evaluation.verdict === 'NOT_AFFORDABLE' ||
              evaluation.verdict === 'INSUFFICIENT_DATA') && (
              <XCircle className="w-6 h-6 text-[#E03124] shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-xs font-semibold text-slate-500">
                Deterministic Affordability Verdict · {evaluation.itemName} (₹
                {evaluation.purchaseAmount.toLocaleString('en-IN')})
              </div>
              <h3
                className={`text-xl font-bold mt-0.5 ${
                  evaluation.verdict === 'NOT_AFFORDABLE' ||
                  evaluation.verdict === 'INSUFFICIENT_DATA'
                    ? 'text-[#E03124]'
                    : 'text-[#1E3A8A]'
                }`}
              >
                {evaluation.headline}
              </h3>
            </div>
          </div>

          <div className="text-right font-mono">
            <div className="text-xs text-slate-500">Post-Buffer Projected Range</div>
            <div className="text-sm font-semibold text-slate-900 tabular-nums">
              {formatSignedINR(evaluation.postPurchaseFreeCash.conservative)} to{' '}
              {formatSignedINR(evaluation.postPurchaseFreeCash.optimistic)}
            </div>
          </div>
        </div>

        {/* Irregular Bonus Exclusion Notice (Extra Point: Income That Is Not Regular) */}
        {evaluation.irregularIncome.detected && (
          <div className="mt-4 p-3.5 bg-blue-50/60 border border-blue-200 text-xs text-slate-800">
            <span className="font-bold text-[#1E3A8A]">Irregular / One-Off Bonus Excluded: </span>
            {evaluation.irregularIncome.explanation} Trust level: High for base salary (CV{' '}
            {evaluation.incomeBand.coefficientOfVariation}), zero reliance on unconfirmed annual bonuses.
          </div>
        )}

        {/* Grounded Explanation Streamed from On-Device Llama Worker */}
        <div className="mt-4 space-y-2.5 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {streamedExplanation}
        </div>

        {/* Baseline vs Modified Plan Comparison if What-If is active */}
        {evaluation.baselineComparison && (
          <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="text-slate-700">
              <span className="font-semibold text-slate-900">Change-of-Plan Impact: </span>
              Original plan post-buffer balance was{' '}
              <span className="font-mono font-semibold">
                {formatSignedINR(evaluation.baselineComparison.baselineExpectedPostPurchase)}
              </span>{' '}
              ({evaluation.baselineComparison.baselineVerdict.replace('_', ' ')})
              <ArrowRight className="w-3.5 h-3.5 inline mx-1.5 text-slate-400" />
              Modified plan is{' '}
              <span className="font-mono font-semibold text-[#1D4ED8]">
                {formatSignedINR(evaluation.postPurchaseFreeCash.expected)}
              </span>{' '}
              ({evaluation.baselineComparison.deltaMonthlyImprovement >= 0 ? '+' : ''}
              {formatSignedINR(evaluation.baselineComparison.deltaMonthlyImprovement)} net change, computed with the identical safety buffer formula).
            </div>
          </div>
        )}
      </section>

      {/* Main Split: 8-Step Deterministic Equation Table + Change-of-Plan Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Step-by-Step Visible Reasoning Table */}
        <div className="lg:col-span-8 border border-slate-200 bg-white">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Step-by-Step Auditable Cash-Flow Calculation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every step is shown whether the answer is Yes or No. All arithmetic runs in deterministic code.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Step &amp; Explanation</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Conservative (P15)</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap text-[#1E3A8A]">
                    Expected (Median)
                  </th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Optimistic (P85)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {evaluation.steps.map((step) => {
                  const isSubtotal = step.operator === 'equals';
                  const signSymbol =
                    step.operator === 'add'
                      ? '+'
                      : step.operator === 'subtract'
                      ? '−'
                      : step.operator === 'equals'
                      ? '='
                      : '';

                  const formatCell = (amt?: number) => {
                    if (amt === undefined) return '—';
                    if (step.operator === 'equals' || step.operator === 'start') {
                      return formatSignedINR(amt);
                    }
                    return `${signSymbol} ₹${Math.abs(Math.round(amt)).toLocaleString('en-IN')}`;
                  };

                  return (
                    <tr
                      key={step.stepNumber}
                      className={isSubtotal ? 'bg-slate-50/90 font-semibold' : 'hover:bg-slate-50/50'}
                    >
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900">
                          <span className="font-mono text-xs text-slate-400 mr-2">
                            0{step.stepNumber}.
                          </span>
                          {step.label}
                        </div>
                        <div className="text-xs text-slate-500 font-normal mt-0.5">{step.detail}</div>
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap ${
                          isSubtotal && (step.conservativeAmount ?? 0) < 0
                            ? 'text-[#E03124]'
                            : 'text-slate-600'
                        }`}
                      >
                        {formatCell(step.conservativeAmount)}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono text-sm tabular-nums whitespace-nowrap ${
                          isSubtotal
                            ? step.expectedAmount < 0
                              ? 'text-[#E03124] font-bold'
                              : 'text-[#1E3A8A] font-bold'
                            : 'text-slate-900'
                        }`}
                      >
                        {formatCell(step.expectedAmount)}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap ${
                          isSubtotal && (step.optimisticAmount ?? 0) < 0
                            ? 'text-[#E03124]'
                            : 'text-slate-600'
                        }`}
                      >
                        {formatCell(step.optimisticAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Explicit Safety Buffer Derivation Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">How the Safety Buffer Was Decided: </span>
            {evaluation.safetyBuffer.formulaText} ={' '}
            <span className="font-mono font-semibold text-slate-900">
              ₹{evaluation.safetyBuffer.amount.toLocaleString('en-IN')}
            </span>
            . {evaluation.safetyBuffer.rationale}
          </div>
        </div>

        {/* Extra Point: "A Change of Plan" Interactive Simulator */}
        <div className="lg:col-span-4 border border-slate-200 bg-white p-5 space-y-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#1D4ED8]" />
              <h3 className="text-sm font-bold text-slate-900">Change of Plan Simulator</h3>
            </div>
            {hasWhatIfActive && (
              <button
                type="button"
                onClick={resetWhatIf}
                className="inline-flex items-center gap-1 text-xs text-[#E03124] hover:underline whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-600">
            Test cancelling recurring subscriptions, deferring the purchase, or taking on a new loan before you commit.
          </p>

          {/* Deferral Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-2">
              Purchase Timing Adjustment
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'As Planned', val: 0 },
                { label: '+1 Month', val: 1 },
                { label: '+2 Months', val: 2 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() =>
                    onChangePlanAdjustment({ ...planAdjustment, deferMonths: opt.val })
                  }
                  className={`py-2 px-2 text-xs font-medium border transition-colors whitespace-nowrap ${
                    planAdjustment.deferMonths === opt.val
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-[#1D4ED8]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cancel Subscriptions Checkboxes */}
          <div>
            <div className="text-xs font-semibold text-slate-800 mb-2">
              Simulate Cancelling Subscriptions / Commitments
            </div>
            {recurringPayments.length === 0 ? (
              <p className="text-xs text-slate-400">No recurring commitments detected.</p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {recurringPayments
                  .filter((r) => r.kind === 'Subscription' || r.kind === 'Utility / Bill')
                  .map((rec) => {
                    const isCancelled = planAdjustment.cancelledRecurringIds.includes(rec.id);
                    return (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => toggleCancelledRecurring(rec.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 border text-xs transition-colors ${
                          isCancelled
                            ? 'border-[#1D4ED8] bg-blue-50/60 text-[#1E3A8A]'
                            : 'border-slate-200 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <span className="truncate font-medium">
                          {isCancelled ? 'Cancelled: ' : ''}
                          {rec.displayName}
                        </span>
                        <span className="font-mono shrink-0 ml-2">
                          {isCancelled ? '+' : ''}₹{rec.averageAmount.toLocaleString('en-IN')}/mo
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Simulate New Loan / EMI */}
          <div>
            <label htmlFor="new-emi-input" className="block text-xs font-semibold text-slate-800 mb-1.5">
              Or Simulate Taking a New Monthly Loan / EMI (₹/month)
            </label>
            <input
              id="new-emi-input"
              type="number"
              min={0}
              step={500}
              value={planAdjustment.newMonthlyLoanEmi || ''}
              onChange={(e) =>
                onChangePlanAdjustment({
                  ...planAdjustment,
                  newMonthlyLoanEmi: Math.max(0, parseInt(e.target.value || '0', 10)),
                })
              }
              placeholder="0"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
