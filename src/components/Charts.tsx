import React, { useState } from 'react';
import type { MonthlySummaryPoint, Transaction, TransactionCategory } from '../types/finance';
import { EXPENSE_CATEGORIES } from '../types/finance';

function formatCompactINR(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${Math.round(abs / 1000)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

export const MonthlyTrendAndForecastChart: React.FC<{
  series: MonthlySummaryPoint[];
}> = ({ series }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (series.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-slate-200 text-sm text-slate-500">
        Upload CSV or PDF bank statements to view monthly cash-flow trend and balance forecast.
      </div>
    );
  }

  const width = 760;
  const height = 270;
  const padLeft = 62;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 42;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const allValues = series.flatMap((p) => [
    0,
    p.regularIncome + p.irregularIncome,
    p.totalSpend,
    p.closingBalance,
    p.forecastLowBalance ?? p.closingBalance,
    p.forecastHighBalance ?? p.closingBalance,
  ]);

  const minVal = Math.min(0, ...allValues);
  const maxVal = Math.max(50000, ...allValues) * 1.08;
  const range = Math.max(1, maxVal - minVal);

  const yScale = (v: number) => padTop + plotH - ((v - minVal) / range) * plotH;
  const colW = plotW / series.length;
  const xCenter = (idx: number) => padLeft + idx * colW + colW / 2;

  // Build balance line path
  const linePoints = series.map((p, i) => `${xCenter(i)},${yScale(p.closingBalance)}`).join(' ');

  // Build forecast uncertainty polygon starting from last historical point
  const firstForecastIdx = series.findIndex((p) => p.isForecast);
  let fanPolygon = '';
  if (firstForecastIdx > 0) {
    const anchorIdx = firstForecastIdx - 1;
    const upperCoords: string[] = [`${xCenter(anchorIdx)},${yScale(series[anchorIdx].closingBalance)}`];
    const lowerCoords: string[] = [`${xCenter(anchorIdx)},${yScale(series[anchorIdx].closingBalance)}`];
    for (let i = firstForecastIdx; i < series.length; i++) {
      const p = series[i];
      upperCoords.push(`${xCenter(i)},${yScale(p.forecastHighBalance ?? p.closingBalance)}`);
      lowerCoords.unshift(`${xCenter(i)},${yScale(p.forecastLowBalance ?? p.closingBalance)}`);
    }
    fanPolygon = [...upperCoords, ...lowerCoords].join(' ');
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minVal + t * range);
  const activePoint = hoveredIdx !== null ? series[hoveredIdx] : null;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#1D4ED8] inline-block" />
            <span>Monthly Income</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#E03124] inline-block" />
            <span>Monthly Spend</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#1E3A8A] inline-block" />
            <span>Closing Balance &amp; P15–P85 Forecast Band</span>
          </span>
        </div>
        {activePoint && (
          <div className="font-mono text-xs text-slate-800">
            <span className="font-semibold">{activePoint.label}:</span>{' '}
            <span>In ₹{(activePoint.regularIncome + activePoint.irregularIncome).toLocaleString('en-IN')}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span>Out ₹{activePoint.totalSpend.toLocaleString('en-IN')}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="text-[#1E3A8A] font-semibold">
              Bal ₹{activePoint.closingBalance.toLocaleString('en-IN')}
              {activePoint.isForecast &&
                activePoint.forecastLowBalance !== undefined &&
                activePoint.forecastHighBalance !== undefined &&
                ` (${formatCompactINR(activePoint.forecastLowBalance)}–${formatCompactINR(activePoint.forecastHighBalance)})`}
            </span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none overflow-visible"
        role="img"
        aria-labelledby="cashflow-chart-title cashflow-chart-desc"
      >
        <title id="cashflow-chart-title">
          Monthly Income, Spending, and 2-Month Cash-Flow Balance Forecast
        </title>
        <desc id="cashflow-chart-desc">
          Bar and line chart comparing monthly bank inflows, outflows, closing balances, and P15 to P85 uncertainty bands across {series.length} months.
        </desc>
        {/* Horizontal grid lines */}
        {yTicks.map((tick, idx) => {
          const y = yScale(tick);
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke={Math.abs(tick) < 1 ? '#94A3B8' : '#E2E8F0'}
                strokeDasharray={Math.abs(tick) < 1 ? undefined : '3 3'}
                strokeWidth={1}
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[10px] font-mono"
              >
                {formatCompactINR(tick)}
              </text>
            </g>
          );
        })}

        {/* Forecast background zone */}
        {firstForecastIdx >= 0 && (
          <rect
            x={padLeft + firstForecastIdx * colW}
            y={padTop}
            width={(series.length - firstForecastIdx) * colW}
            height={plotH}
            fill="#EFF6FF"
            opacity={0.55}
          />
        )}

        {/* Uncertainty fan band */}
        {fanPolygon && <polygon points={fanPolygon} fill="#1D4ED8" opacity={0.14} />}

        {/* Income & Spend bars */}
        {series.map((p, idx) => {
          const cx = xCenter(idx);
          const barW = Math.min(18, colW * 0.28);
          const totalInc = p.regularIncome + p.irregularIncome;
          const zeroY = yScale(0);
          const incY = yScale(totalInc);
          const spendY = yScale(p.totalSpend);

          return (
            <g
              key={p.monthKey}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={padLeft + idx * colW}
                y={padTop}
                width={colW}
                height={plotH}
                fill={hoveredIdx === idx ? '#F1F5F9' : 'transparent'}
                opacity={0.7}
              />
              {/* Income bar (Royal Blue) */}
              <rect
                x={cx - barW - 2}
                y={Math.min(zeroY, incY)}
                width={barW}
                height={Math.max(2, Math.abs(zeroY - incY))}
                fill="#1D4ED8"
                opacity={p.isForecast ? 0.55 : 0.92}
              />
              {/* Spend bar (Tomato Red) */}
              <rect
                x={cx + 2}
                y={Math.min(zeroY, spendY)}
                width={barW}
                height={Math.max(2, Math.abs(zeroY - spendY))}
                fill="#E03124"
                opacity={p.isForecast ? 0.55 : 0.9}
              />
              {/* X-axis label */}
              <text
                x={cx}
                y={height - 14}
                textAnchor="middle"
                className={`text-[11px] ${
                  p.isForecast ? 'fill-[#1D4ED8] font-semibold' : 'fill-slate-600'
                }`}
              >
                {p.label}
              </text>
            </g>
          );
        })}

        {/* Closing balance trajectory polyline */}
        <polyline
          fill="none"
          stroke="#1E3A8A"
          strokeWidth={2.25}
          points={linePoints}
        />

        {/* Data nodes on balance line */}
        {series.map((p, idx) => (
          <circle
            key={`pt-${p.monthKey}`}
            cx={xCenter(idx)}
            cy={yScale(p.closingBalance)}
            r={hoveredIdx === idx ? 5 : 3.5}
            fill={p.isForecast ? '#FFFFFF' : '#1E3A8A'}
            stroke="#1E3A8A"
            strokeWidth={2}
          />
        ))}
      </svg>
    </div>
  );
};

export const CategoryBreakdownList: React.FC<{
  transactions: Transaction[];
  onSelectCategory?: (category: TransactionCategory) => void;
}> = ({ transactions, onSelectCategory }) => {
  const debits = transactions.filter(
    (t) => t.type === 'debit' && !t.excludedAsDuplicate && t.category !== 'Self Transfer'
  );
  const totalOutflow = debits.reduce((s, t) => s + t.amount, 0);

  const grouped = EXPENSE_CATEGORIES.map((cat) => {
    const items = debits.filter((t) => t.category === cat);
    const sum = items.reduce((s, t) => s + t.amount, 0);
    return {
      category: cat,
      amount: Math.round(sum),
      count: items.length,
      sharePct: totalOutflow > 0 ? (sum / totalOutflow) * 100 : 0,
    };
  })
    .filter((g) => g.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (grouped.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        No categorized expense transactions available yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grouped.map((row, idx) => (
        <button
          key={row.category}
          type="button"
          onClick={() => onSelectCategory?.(row.category)}
          className="w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] py-1"
        >
          <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-medium text-slate-900 group-hover:text-[#1E3A8A] transition-colors truncate">
                {row.category}
              </span>
              <span className="text-xs text-slate-600 shrink-0">· {row.count} txns</span>
            </div>
            <div className="font-mono text-xs text-slate-900 shrink-0 tabular-nums">
              <span className="font-semibold">₹{row.amount.toLocaleString('en-IN')}</span>
              <span className="text-slate-600 ml-2">({row.sharePct.toFixed(1)}%)</span>
            </div>
          </div>
          <div className="w-full h-2 bg-slate-100 overflow-hidden">
            <div
              className={`h-full transition-opacity duration-150 ${
                idx === 0 ? 'bg-[#1E3A8A]' : idx === 1 ? 'bg-[#1D4ED8]' : 'bg-[#1D4ED8]/75'
              }`}
              style={{ width: `${Math.max(2, row.sharePct)}%` }}
            />
          </div>
        </button>
      ))}
    </div>
  );
};
