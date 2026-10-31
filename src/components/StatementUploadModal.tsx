import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, FileText, Download, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import type { IngestionReport } from '../types/finance';
import {
  HDFC_SAVINGS_CSV,
  ICICI_SALARY_CSV,
  IRREGULAR_FREELANCE_CSV,
  SHORT_INCOMPLETE_CSV,
  type PresetDatasetId,
} from '../data/sampleDatasets';

interface StatementUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFiles: (files: File[], overrideAccountName?: string) => Promise<void>;
  onLoadPreset: (preset: PresetDatasetId) => void;
  activePreset: PresetDatasetId;
  latestReport: IngestionReport | null;
  isParsing: boolean;
}

export const StatementUploadModal: React.FC<StatementUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadFiles,
  onLoadPreset,
  activePreset,
  latestReport,
  isParsing,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [accountLabel, setAccountLabel] = useState('');
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    await onUploadFiles(files, accountLabel.trim() || undefined);
    setAccountLabel('');
  };

  const downloadSampleCsv = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Multi-Account Statement Ingestion (100% Offline)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Combine CSV and PDF bank statements across multiple accounts. Overlapping rows and inter-account transfers are automatically deduplicated on-device.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
            aria-label="Close upload dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Label & Drag-Drop Upload Zone */}
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="acct-label" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Optional Account Label (leave blank to auto-detect from filename or statement columns)
            </label>
            <input
              id="acct-label"
              type="text"
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              placeholder="e.g., Kotak Savings ••5512 or Axis Credit Card"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragActive(false);
              await handleFilesSelected(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed p-8 text-center transition-colors ${
              dragActive ? 'border-[#1D4ED8] bg-blue-50/50' : 'border-slate-300 bg-slate-50/50'
            }`}
          >
            <Upload className="w-8 h-8 text-[#1D4ED8] mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900">
              Drop one or more CSV or PDF bank statements here
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Processed strictly in local browser / Capacitor memory — zero bytes transmitted externally
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.pdf,text/csv,application/pdf"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              disabled={isParsing}
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-5 py-2.5 bg-[#E03124] hover:bg-[#C92519] text-white text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {isParsing ? 'Parsing & Deduplicating...' : 'Select CSV / PDF Files'}
            </button>
          </div>
        </div>

        {/* Downloadable Raw Statements to Test File Upload */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-800">
              Need test files? Download raw bank CSVs to test file upload &amp; deduplication:
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => downloadSampleCsv('ICICI_Salary_9104.csv', ICICI_SALARY_CSV)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-xs font-medium text-slate-700 hover:border-[#1D4ED8] hover:text-[#1D4ED8] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ICICI_Salary_9104.csv</span>
            </button>
            <button
              type="button"
              onClick={() => downloadSampleCsv('HDFC_Savings_4821.csv', HDFC_SAVINGS_CSV)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-xs font-medium text-slate-700 hover:border-[#1D4ED8] hover:text-[#1D4ED8] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>HDFC_Savings_4821.csv</span>
            </button>
            <button
              type="button"
              onClick={() => downloadSampleCsv('Freelance_Volatile.csv', IRREGULAR_FREELANCE_CSV)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-xs font-medium text-slate-700 hover:border-[#1D4ED8] hover:text-[#1D4ED8] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Freelance_Volatile.csv</span>
            </button>
            <button
              type="button"
              onClick={() => downloadSampleCsv('Short_Under3Months.csv', SHORT_INCOMPLETE_CSV)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-xs font-medium text-slate-700 hover:border-[#1D4ED8] hover:text-[#1D4ED8] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Short_Under3Months.csv</span>
            </button>
          </div>
        </div>

        {/* Instant Verification Scenarios */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <h3 className="text-xs font-semibold text-slate-800 mb-3">
            Or Switch Pre-Loaded Verification Scenario (Tests All Problem Statement Edge Cases)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onLoadPreset('multi-account-full')}
              className={`p-3.5 border text-left transition-colors ${
                activePreset === 'multi-account-full'
                  ? 'border-[#1D4ED8] bg-blue-50/40'
                  : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#1E3A8A]">
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>3 Accounts + One-Off Bonus</span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                5 months across ICICI CSV, HDFC CSV &amp; SBI Card PDF. Includes ₹85k one-off bonus, duplicates &amp; anomalies.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onLoadPreset('freelance-volatile')}
              className={`p-3.5 border text-left transition-colors ${
                activePreset === 'freelance-volatile'
                  ? 'border-[#1D4ED8] bg-blue-50/40'
                  : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#1E3A8A]">
                <FileText className="w-4 h-4 shrink-0" />
                <span>Uncertain Freelance Income</span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                Monthly client payouts swing from ₹49k to ₹1.12L — showcases wide P15–P85 uncertainty bands.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onLoadPreset('short-incomplete')}
              className={`p-3.5 border text-left transition-colors ${
                activePreset === 'short-incomplete'
                  ? 'border-[#E03124] bg-red-50/30'
                  : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#E03124]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>&lt; 3 Months + Date Gap</span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                1.4 months with missing salary &amp; 34-day gap — verifies system refuses to guess when data is too short.
              </p>
            </button>
          </div>
        </div>

        {/* Latest Deduplication & Ingestion Audit Log */}
        {latestReport && (
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-[#1D4ED8]" />
                <span>Latest Ingestion &amp; Cross-Statement Deduplication Report</span>
              </div>
              <span className="font-mono text-xs text-slate-500">
                Parsed in {latestReport.parseLatencyMs} ms
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Processed <span className="font-mono font-semibold">{latestReport.totalRowsParsed}</span> rows from{' '}
              <span className="font-medium">{latestReport.filesProcessed.join(', ')}</span> · Added{' '}
              <span className="font-mono font-semibold text-[#1D4ED8]">{latestReport.addedCount}</span> unique transactions · Skipped{' '}
              <span className="font-mono font-semibold text-[#E03124]">{latestReport.deduplicatedCount}</span> duplicate/mirrored entries.
            </p>

            {latestReport.deduplicatedEntries.length > 0 && (
              <div className="mt-3 border border-slate-200 divide-y divide-slate-100 max-h-36 overflow-y-auto text-xs">
                {latestReport.deduplicatedEntries.map((d, i) => (
                  <div key={i} className="px-3 py-2 flex items-start justify-between gap-3 bg-slate-50/60">
                    <div>
                      <span className="font-mono text-slate-700">{d.droppedTransaction.date}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-medium text-slate-900">{d.droppedTransaction.description}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{d.reason}</p>
                    </div>
                    <span className="font-mono text-slate-700 shrink-0">
                      ₹{d.droppedTransaction.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
