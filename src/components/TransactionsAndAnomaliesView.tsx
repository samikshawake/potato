import React, { useMemo, useState } from 'react';
import { Search, AlertTriangle, Check, Ban, CheckCircle2 } from 'lucide-react';
import {
  ALL_CATEGORIES,
  type AnomalyFlag,
  type CategoryCorrectionLog,
  type Transaction,
  type TransactionCategory,
} from '../types/finance';

interface TransactionsAndAnomaliesViewProps {
  transactions: Transaction[];
  anomalies: AnomalyFlag[];
  accounts: string[];
  initialCategoryFilter?: TransactionCategory | 'ALL';
  latestCorrectionLog: CategoryCorrectionLog | null;
  onCorrectCategory: (transactionId: string, newCategory: TransactionCategory) => void;
  onResolveAnomaly: (transactionId: string, action: 'confirm_real' | 'mark_duplicate') => void;
}

export const TransactionsAndAnomaliesView: React.FC<TransactionsAndAnomaliesViewProps> = ({
  transactions,
  anomalies,
  accounts,
  initialCategoryFilter = 'ALL',
  latestCorrectionLog,
  onCorrectCategory,
  onResolveAnomaly,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory | 'ALL'>(
    initialCategoryFilter
  );
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  const anomalyByTxnId = useMemo(() => {
    const map = new Map<string, AnomalyFlag>();
    for (const a of anomalies) {
      map.set(a.transactionId, a);
    }
    return map;
  }, [anomalies]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((t) => {
      if (selectedAccount !== 'ALL' && t.accountName !== selectedAccount) return false;
      if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;
      if (onlyFlagged && !anomalyByTxnId.has(t.id)) return false;
      if (
        q &&
        !t.description.toLowerCase().includes(q) &&
        !t.normalizedMerchant.toLowerCase().includes(q) &&
        !t.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [transactions, selectedAccount, selectedCategory, onlyFlagged, searchQuery, anomalyByTxnId]);

  const activeAnomalies = anomalies.filter((a) => a.status === 'active');

  return (
    <div className="space-y-8">
      {/* Anomaly Review Queue (Extra Point: "When the system is wrong") */}
      <section className="border border-slate-200 bg-white">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Flagged Unusual Charges &amp; Duplicate Verification ({activeAnomalies.length} Active)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Each flag explains why it triggered. If a flagged duplicate was a real second payment, confirm it below so your spending baseline stays accurate.
            </p>
          </div>
        </div>

        {anomalies.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No unusual spikes, duplicate charges, or high-ticket new merchants detected in current statements.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {anomalies.map((anom) => (
              <div
                key={anom.id}
                className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  anom.status !== 'active' ? 'bg-slate-50/70 opacity-80' : 'bg-white'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 ${
                        anom.status === 'active' ? 'text-[#E03124]' : 'text-slate-400'
                      }`}
                    />
                    <span className="font-bold text-slate-900">
                      {anom.kind === 'POTENTIAL_DUPLICATE'
                        ? 'Potential Duplicate Charge'
                        : anom.kind === 'SUDDEN_LARGE_AMOUNT'
                        ? 'Sudden Large Amount'
                        : 'New High-Value Merchant'}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-slate-600">{anom.date}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-600">{anom.accountName}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono font-bold text-[#E03124]">
                      ₹{anom.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{anom.description}</p>
                  <p className="text-xs text-slate-600">
                    {anom.explanation}{' '}
                    <span className="text-slate-500">({anom.baselineComparison})</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {anom.status === 'confirmed_real' ? (
                    <span className="text-xs font-semibold text-[#1D4ED8] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmed Real Payment
                    </span>
                  ) : anom.status === 'marked_duplicate' ? (
                    <span className="text-xs font-semibold text-[#E03124] inline-flex items-center gap-1">
                      <Ban className="w-4 h-4" />
                      Excluded as Duplicate
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onResolveAnomaly(anom.transactionId, 'confirm_real')}
                        className="px-3 py-1.5 border border-[#1D4ED8] text-[#1D4ED8] hover:bg-[#1D4ED8] hover:text-white text-xs font-semibold transition-colors whitespace-nowrap inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Real 2nd Payment</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onResolveAnomaly(anom.transactionId, 'mark_duplicate')}
                        className="px-3 py-1.5 border border-[#E03124] text-[#E03124] hover:bg-[#E03124] hover:text-white text-xs font-semibold transition-colors whitespace-nowrap inline-flex items-center gap-1"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Exclude Duplicate</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Smart Category Correction Propagation Banner */}
      {latestCorrectionLog && (
        <section className="border border-[#1D4ED8] bg-blue-50/40 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900">
                Smart Category Rule Applied to {latestCorrectionLog.affectedSummaries.length}{' '}
                Transaction{latestCorrectionLog.affectedSummaries.length === 1 ? '' : 's'}
              </h3>
              <p className="text-xs text-slate-700 mt-0.5">
                Merchant stem <span className="font-mono font-semibold">{latestCorrectionLog.merchantStem}</span>{' '}
                reclassified from <span className="font-medium">{latestCorrectionLog.previousCategory}</span> to{' '}
                <span className="font-semibold text-[#1E3A8A]">{latestCorrectionLog.newCategory}</span>. Cash-flow forecast and category totals updated automatically:
              </p>
              <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs font-mono text-slate-700">
                {latestCorrectionLog.affectedSummaries.slice(0, 6).map((item) => (
                  <div key={item.id} className="truncate">
                    • {item.date} · {item.description} (₹{item.amount.toLocaleString('en-IN')})
                  </div>
                ))}
                {latestCorrectionLog.affectedSummaries.length > 6 && (
                  <div className="text-slate-500">
                    + {latestCorrectionLog.affectedSummaries.length - 6} more matching transactions updated
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Unified Multi-Account Transaction Ledger */}
      <section className="border border-slate-200 bg-white">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Combined Multi-Account Ledger ({filteredTransactions.length} Entries)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Correcting any category below updates all transactions from the same merchant across accounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search merchant or narration..."
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 focus:outline-none focus:border-[#1D4ED8] w-56"
              />
            </div>

            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              aria-label="Filter by account"
              className="px-3 py-1.5 text-xs border border-slate-300 bg-white focus:outline-none focus:border-[#1D4ED8]"
            >
              <option value="ALL">All Accounts ({accounts.length})</option>
              {accounts.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as TransactionCategory | 'ALL')}
              aria-label="Filter by category"
              className="px-3 py-1.5 text-xs border border-slate-300 bg-white focus:outline-none focus:border-[#1D4ED8]"
            >
              <option value="ALL">All Categories</option>
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOnlyFlagged((v) => !v)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap ${
                onlyFlagged
                  ? 'bg-[#E03124] text-white border-[#E03124]'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              Flagged Only
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 whitespace-nowrap">Date</th>
                <th className="py-3 px-4">Narration &amp; Normalized Merchant</th>
                <th className="py-3 px-4 whitespace-nowrap">Account · Source</th>
                <th className="py-3 px-4 whitespace-nowrap">Category (Click to Correct)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                    No transactions match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => {
                  const flag = anomalyByTxnId.get(txn.id);
                  return (
                    <tr
                      key={txn.id}
                      className={`hover:bg-slate-50/70 ${
                        txn.excludedAsDuplicate ? 'opacity-45 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {txn.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{txn.description}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span>Merchant: {txn.normalizedMerchant}</span>
                          {txn.userCorrected && (
                            <>
                              <span className="mx-1.5">·</span>
                              <span className="text-[#1D4ED8] font-medium">User Verified</span>
                            </>
                          )}
                          {flag && flag.status === 'active' && (
                            <>
                              <span className="mx-1.5">·</span>
                              <span className="text-[#E03124] font-semibold">
                                Flagged:{' '}
                                {flag.kind === 'POTENTIAL_DUPLICATE'
                                  ? 'Check Duplicate'
                                  : flag.kind === 'SUDDEN_LARGE_AMOUNT'
                                  ? 'Large Spike'
                                  : 'New High Merchant'}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                        <span>{txn.accountName}</span>
                        <span className="mx-1 text-slate-300">·</span>
                        <span className="font-mono">{txn.sourceFormat}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          value={txn.category}
                          onChange={(e) =>
                            onCorrectCategory(txn.id, e.target.value as TransactionCategory)
                          }
                          aria-label={`Change category for ${txn.description}`}
                          className="px-2.5 py-1 text-xs border border-slate-300 bg-white text-slate-800 hover:border-[#1D4ED8] focus:outline-none focus:border-[#1D4ED8]"
                        >
                          {ALL_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono text-sm font-semibold tabular-nums whitespace-nowrap ${
                          txn.type === 'credit' ? 'text-[#1D4ED8]' : 'text-slate-900'
                        }`}
                      >
                        {txn.type === 'credit' ? '+' : '−'}₹{txn.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
