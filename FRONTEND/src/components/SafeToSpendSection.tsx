import React, { useState } from 'react';
import { DailyBillCollisionAlert, DailySafeToSpendItem } from '../types/finance';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Info,
  Shield,
  Wallet,
  X,
  TrendingDown,
  ArrowUpRight,
  Clock
} from 'lucide-react';

interface SafeToSpendSectionProps {
  safeToSpendDays: DailySafeToSpendItem[];
  collisionAlerts: DailyBillCollisionAlert[];
}

export const SafeToSpendSection: React.FC<SafeToSpendSectionProps> = ({
  safeToSpendDays,
  collisionAlerts,
}) => {
  const [selectedDay, setSelectedDay] = useState<DailySafeToSpendItem | null>(null);

  const getStatusBadge = (status: DailySafeToSpendItem['status']) => {
    switch (status) {
      case 'SAFE':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Safe to Spend',
        };
      case 'CAUTION':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Moderate Buffer',
        };
      case 'BILL_DUE':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
          label: 'Bill Due Today',
        };
      case 'OVERDRAFT_RISK':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Tight Balance',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
          label: status,
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">7-Day Safe-to-Spend & Cash Flow</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Calculated using rolling balance projections after reserving upcoming bills and emergency buffer.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 self-start md:self-auto">
          <Clock className="w-3.5 h-3.5" />
          <span>Rolling 7-Day Window</span>
        </div>
      </div>

      {/* Bill Collision Alert Banner */}
      {collisionAlerts.length > 0 && (
        <div className="space-y-3">
          {collisionAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                alert.severity === 'HIGH'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : alert.severity === 'MEDIUM'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg mt-0.5 ${
                    alert.severity === 'HIGH'
                      ? 'bg-rose-100 text-rose-600'
                      : alert.severity === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span>Payment Concentration Warning</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/60">
                      {alert.severity} PRIORITY
                    </span>
                  </h4>
                  <p className="text-xs mt-1 opacity-90">{alert.warningMessage}</p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {alert.itemizedCommitments.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-medium bg-white/80 px-2 py-0.5 rounded border border-black/5"
                      >
                        {item.date}: {item.name} (₹{item.amount.toLocaleString('en-IN')})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7-Day Calendar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {safeToSpendDays.map((day) => {
          const badge = getStatusBadge(day.status);
          const isToday =
            new Date(day.date).toDateString() === new Date().toDateString();

          return (
            <div
              key={day.date}
              onClick={() => setSelectedDay(day)}
              className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
                isToday
                  ? 'border-indigo-400 bg-indigo-50/30 ring-1 ring-indigo-300'
                  : 'border-slate-200 bg-white hover:border-indigo-200'
              }`}
            >
              {/* Day Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-500">
                    {day.dayOfWeek}
                    {isToday && <span className="ml-1 text-indigo-600 font-extrabold">(Today)</span>}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {new Date(day.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>

                {/* Status Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold mb-3 ${badge.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                  <span>{badge.label}</span>
                </div>

                {/* Bills Tag if any */}
                {day.billsDueAmount > 0 && (
                  <div className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md mb-2 flex items-center justify-between">
                    <span className="truncate">Bills Due:</span>
                    <span className="font-bold">₹{day.billsDueAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Safe to spend amount */}
              <div className="mt-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium uppercase">
                  Safe-to-Spend
                </span>
                <div className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                  ₹{day.safeToSpendAmount.toLocaleString('en-IN')}
                </div>

                <div className="mt-2 text-[11px] text-indigo-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>View details</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Breakdown Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Day Breakdown: {selectedDay.dayOfWeek},{' '}
                    {new Date(selectedDay.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed calculation breakdown for this specific day
                </p>
              </div>

              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Daily Safe-to-Spend Hero Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs text-indigo-200 font-medium uppercase tracking-wider">
                    Recommended Safe Spending Limit
                  </span>
                  <div className="text-2xl font-black mt-0.5">
                    ₹{selectedDay.safeToSpendAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div
                  className={`px-3 py-1 rounded-full border text-xs font-bold ${
                    getStatusBadge(selectedDay.status).bg
                  }`}
                >
                  {getStatusBadge(selectedDay.status).label}
                </div>
              </div>

              {/* Explanation Note */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p>{selectedDay.explanation}</p>
              </div>

              {/* Financial Math Ledger */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Cash Flow Projection Math
                </h4>

                <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs border border-slate-100">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-slate-400" />
                      Starting Balance (Start of Day)
                    </span>
                    <span className="font-semibold text-slate-900">
                      ₹{selectedDay.openingBalance.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {selectedDay.expectedIncome > 0 && (
                    <div className="flex justify-between items-center text-emerald-700">
                      <span className="flex items-center gap-1.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                        (+) Expected Income Inflow
                      </span>
                      <span className="font-semibold">
                        +₹{selectedDay.expectedIncome.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {selectedDay.billsDueAmount > 0 && (
                    <div className="flex justify-between items-center text-rose-700">
                      <span className="flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                        (-) Bills & Recurring Commitments Due
                      </span>
                      <span className="font-semibold">
                        -₹{selectedDay.billsDueAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-700">
                    <span>(-) Estimated Essential Expenses</span>
                    <span className="font-semibold">
                      -₹{selectedDay.estimatedEssentialExpenses.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-700">
                    <span>(-) Protected Safety Buffer (Emergency Floor)</span>
                    <span className="font-semibold text-amber-700">
                      -₹{selectedDay.protectedSafetyBuffer.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                    <span>(=) Net Safe Discretionary Limit</span>
                    <span className="text-indigo-600">
                      ₹{selectedDay.safeToSpendAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Bills Due List if present */}
              {selectedDay.billsDueItems && selectedDay.billsDueItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    Bills Scheduled on This Day
                  </h4>
                  <div className="space-y-1.5">
                    {selectedDay.billsDueItems.map((bill, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{bill.name}</span>
                          {bill.category && (
                            <span className="text-[10px] text-slate-400 block">{bill.category}</span>
                          )}
                        </div>
                        <span className="font-bold text-rose-600">
                          ₹{bill.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
