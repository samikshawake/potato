import React from 'react';
import { ShieldCheck, CalendarClock, CheckCircle2, AlertCircle, Download, Trash2 } from 'lucide-react';
import type { ForecastBacktestResult, RecurringPayment, Transaction } from '../types/finance';

interface ForecastAuditAndPrivacyViewProps {
  backtest: ForecastBacktestResult;
  recurringPayments: RecurringPayment[];
  transactions: Transaction[];
  customRulesCount: number;
  onExportAuditJson: () => void;
  onResetAllLocalData: () => void;
}

export const ForecastAuditAndPrivacyView: React.FC<ForecastAuditAndPrivacyViewProps> = ({
  backtest,
  recurringPayments,
  transactions,
  customRulesCount,
  onExportAuditJson,
  onResetAllLocalData,
}) => {
  return (
    <div className="space-y-8">
      {/* Extra Point: "Checking the Forecast" Historical Backtest Track Record */}
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Forecast Track Record &amp; Holdout Verification
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              How do you know you can trust CashCompass? We hide your most recent complete month, run the forecast using only earlier months, and compare predicted vs. actual cash flow.
            </p>
          </div>
          {backtest.available && (
            <div className="font-mono text-right">
              <div className="text-xs text-slate-500">Holdout Balance Accuracy</div>
              <div className="text-lg font-bold text-[#1D4ED8] tabular-nums">
                {backtest.balanceAccuracyPct}%
              </div>
            </div>
          )}
        </div>

        {!backtest.available ? (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#E03124] shrink-0" />
            <span>{backtest.reasonIfUnavailable}</span>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200">
                <div className="text-xs text-slate-500">
                  {backtest.holdoutMonthLabel} Income (Trained on prior {backtest.trainingMonthsCount} mo)
                </div>
                <div className="mt-2 flex items-baseline justify-between font-mono text-sm tabular-nums">
                  <span className="text-slate-600">
                    Pred: ₹{backtest.predictedIncome.toLocaleString('en-IN')}
                  </span>
                  <span className="font-bold text-slate-900">
                    Actual: ₹{backtest.actualIncome.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="p-4 border border-slate-200">
                <div className="text-xs text-slate-500">
                  {backtest.holdoutMonthLabel} Total Spending
                </div>
                <div className="mt-2 flex items-baseline justify-between font-mono text-sm tabular-nums">
                  <span className="text-slate-600">
                    Pred: ₹{backtest.predictedTotalSpend.toLocaleString('en-IN')}
                  </span>
                  <span className="font-bold text-slate-900">
                    Actual: ₹{backtest.actualTotalSpend.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="p-4 border border-slate-200">
                <div className="text-xs text-slate-500">
                  {backtest.holdoutMonthLabel} Closing Balance
                </div>
                <div className="mt-2 flex items-baseline justify-between font-mono text-sm tabular-nums">
                  <span className="text-slate-600">
                    Pred: ₹{backtest.predictedEndingBalance.toLocaleString('en-IN')}
                  </span>
                  <span className="font-bold text-[#1E3A8A]">
                    Actual: ₹{backtest.actualEndingBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] font-mono text-slate-500">
                  P15–P85 Band: ₹{backtest.predictedBalanceRange[0].toLocaleString('en-IN')} – ₹
                  {backtest.predictedBalanceRange[1].toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-[#1D4ED8]" />
                <span>
                  {backtest.withinUncertaintyBand
                    ? `Calibrated: Realized balance landed inside the predicted P15–P85 uncertainty range (Absolute error: ₹${backtest.absoluteBalanceError.toLocaleString('en-IN')}).`
                    : `Variance Alert: Realized balance differed by ₹${backtest.absoluteBalanceError.toLocaleString('en-IN')} due to irregular activity:`}
                </span>
              </div>
              <ul className="list-disc list-inside text-slate-600 space-y-1 pl-1">
                {backtest.varianceDrivers.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Recurring Payment Schedule (Subscriptions, EMIs, Rent) */}
      <section className="border border-slate-200 bg-white">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-[#1D4ED8]" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Detected Recurring Payments, Subscriptions &amp; EMIs
              </h2>
              <p className="text-xs text-slate-500">
                Automatically identified via payment interval periodicity and low amount variance across accounts.
              </p>
            </div>
          </div>
          <div className="font-mono text-sm font-bold text-[#1E3A8A] tabular-nums">
            Total: ₹
            {recurringPayments
              .reduce((s, r) => s + r.averageAmount, 0)
              .toLocaleString('en-IN')}
            /month
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Merchant / Commitment</th>
                <th className="py-3 px-4">Type · Account</th>
                <th className="py-3 px-4 whitespace-nowrap">Cadence</th>
                <th className="py-3 px-4 whitespace-nowrap">Last Paid</th>
                <th className="py-3 px-4 whitespace-nowrap">Next Expected Date</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Expected Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {recurringPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                    Insufficient repeating history to confirm recurring payments.
                  </td>
                </tr>
              ) : (
                recurringPayments.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900">{rec.displayName}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <span>{rec.kind}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span>{rec.accountName}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      Every {rec.cadenceDays}d ({rec.occurrences}× seen)
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {rec.lastPaidDate}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#1D4ED8] whitespace-nowrap">
                      {rec.nextExpectedDate}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      ₹{rec.averageAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Private Data Protection & Air-Gapped Guarantee */}
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-[#1D4ED8] shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-900">
              Private Financial Data Protection Decision: 100% On-Device Execution
            </h2>
            <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
              Bank statements expose salary details, residential landlords, healthcare providers, and account numbers. CashCompass makes an explicit architectural guarantee: <strong className="font-semibold text-slate-900">zero raw statements, merchant names, or account balances are ever sent to any external server or cloud LLM API.</strong>
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 border border-slate-200">
                <div className="font-bold text-slate-900">Statement Parsing</div>
                <p className="text-slate-600 mt-1">
                  CSV (`PapaParse`) and PDF (`pdfjs-dist` local worker) run strictly inside the browser / Capacitor WebView memory.
                </p>
              </div>
              <div className="p-3.5 border border-slate-200">
                <div className="font-bold text-slate-900">Model &amp; Tokenizer</div>
                <p className="text-slate-600 mt-1">
                  `tokenizer.model` and `finance_assistant.pte` run locally on-device with Capacitor `CapacitorHttp: false` air-gap enforcement.
                </p>
              </div>
              <div className="p-3.5 border border-slate-200">
                <div className="font-bold text-slate-900">Local Persistence</div>
                <p className="text-slate-600 mt-1">
                  Currently holding {transactions.length} local ledger entries and {customRulesCount} user-corrected merchant rules on this device.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExportAuditJson}
                className="px-4 py-2 border border-slate-300 hover:border-[#1D4ED8] text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Local Audit Snapshot (JSON)</span>
              </button>
              <button
                type="button"
                onClick={onResetAllLocalData}
                className="px-4 py-2 border border-[#E03124] text-[#E03124] hover:bg-[#E03124] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wipe Local Storage &amp; Reset</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
