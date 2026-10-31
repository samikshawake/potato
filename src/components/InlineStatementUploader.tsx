import React, { useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { IngestionReport } from '../types/finance';
import {
  HDFC_SAVINGS_CSV,
  ICICI_SALARY_CSV,
  IRREGULAR_FREELANCE_CSV,
  SHORT_INCOMPLETE_CSV,
  type PresetDatasetId,
} from '../data/sampleDatasets';

interface InlineStatementUploaderProps {
  onUploadFiles: (files: File[], overrideAccountName?: string) => Promise<void>;
  onLoadPreset: (preset: PresetDatasetId) => void;
  activePreset: PresetDatasetId;
  latestReport: IngestionReport | null;
  isParsing: boolean;
  totalTransactionsCount: number;
  accountsCount: number;
}

/**
 * Generates a valid, standards-compliant uncompressed PDF 1.4 bank statement file locally
 * so users can immediately test real PDF bank statement upload & parsing offline.
 */
function buildSampleBankPdfBlob(): Blob {
  const statementLines = [
    'SBI CARD MONTHLY STATEMENT - ACCOUNT 3319',
    '14/08/2026  AMAZON INDIA SHOPPING  2,890.00 DR  -2,890.00',
    '19/09/2026  DECATHLON SPORTS GEAR  3,200.00 DR  -6,090.00',
    '11/10/2026  INDIGO AIRLINES FLIGHT BOOKING  16,800.00 DR  -22,890.00',
    '23/10/2026  CROMA STUDIO AUDIO GEAR  9,400.00 DR  -32,290.00',
    '26/10/2026  STARBUCKS COFFEE DINING  540.00 DR  -32,830.00',
  ];

  const textOps = statementLines
    .map((line, i) => `BT /F1 11 Tf 45 ${740 - i * 24} Td (${line}) Tj ET`)
    .join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${textOps.length} >>\nstream\n${textOps}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export const InlineStatementUploader: React.FC<InlineStatementUploaderProps> = ({
  onUploadFiles,
  onLoadPreset,
  activePreset,
  latestReport,
  isParsing,
  totalTransactionsCount,
  accountsCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [accountNameInput, setAccountNameInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showDuplicatesDetail, setShowDuplicatesDetail] = useState(false);

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    await onUploadFiles(files, accountNameInput.trim() || undefined);
    setAccountNameInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadFile = (filename: string, blob: Blob) => {
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
    <section
      aria-labelledby="statement-upload-heading"
      className="border-2 border-[#1E3A8A]/25 bg-white p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-bold text-[#1E3A8A]">
            Step 1 · Multi-Account Bank Statement Ingestion (100% On-Device)
          </div>
          <h2 id="statement-upload-heading" className="text-lg font-bold text-slate-900 mt-0.5">
            Upload CSV &amp; PDF Bank Statements for Analysis
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Upload statements from multiple savings, salary, or credit card accounts. CashCompass parses CSV and PDF formats locally, merges accounts, and eliminates duplicate transactions automatically.
          </p>
        </div>

        <div className="font-mono text-xs text-slate-700 text-right">
          <div>
            Active Ledger: <strong className="text-[#1E3A8A]">{totalTransactionsCount}</strong> txns across{' '}
            <strong className="text-[#1E3A8A]">{accountsCount}</strong> account{accountsCount === 1 ? '' : 's'}
          </div>
          <div className="text-slate-600 mt-0.5">Network Transmission: 0 Bytes (Air-Gapped)</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Direct CSV & PDF File Picker + Drag-and-Drop Zone */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="inline-account-name"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Account Label (Optional — Auto-Detected if Blank)
              </label>
              <input
                id="inline-account-name"
                type="text"
                value={accountNameInput}
                onChange={(e) => setAccountNameInput(e.target.value)}
                placeholder="e.g., HDFC Savings ••4821 or SBI Card"
                className="w-full px-3 py-2 text-xs border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              />
            </div>

            <div>
              <label
                htmlFor="preset-scenario-select"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Or Load Test Dataset Scenario
              </label>
              <select
                id="preset-scenario-select"
                value={activePreset}
                onChange={(e) => onLoadPreset(e.target.value as PresetDatasetId)}
                className="w-full px-3 py-2 text-xs border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="multi-account-full">
                  3 Accounts (CSV + PDF · 5 Months · One-Off Bonus)
                </option>
                <option value="freelance-volatile">
                  Irregular Freelance Income (Wide P15–P85 Range)
                </option>
                <option value="short-incomplete">
                  Incomplete &lt; 3 Months + Date Gap (Guardrail Test)
                </option>
              </select>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Drop CSV or PDF bank statements here, or press Enter to browse files"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onClick={() => fileInputRef.current?.click()}
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
            className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
              dragActive
                ? 'border-[#1D4ED8] bg-blue-50/60'
                : 'border-slate-400 hover:border-[#1D4ED8] bg-slate-50/60'
            }`}
          >
            <Upload className="w-7 h-7 text-[#1E3A8A] mx-auto mb-2" aria-hidden="true" />
            <div className="text-sm font-bold text-slate-900">
              Click to Browse or Drag &amp; Drop `.CSV` and `.PDF` Bank Statements
            </div>
            <p className="text-xs text-slate-700 mt-1">
              Supports multi-file selection across HDFC, ICICI, SBI, Axis, Kotak &amp; custom CSV/PDF statements
            </p>

            <input
              ref={fileInputRef}
              id="bank-statement-file-input"
              type="file"
              accept=".csv,.pdf,text/csv,application/pdf"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="sr-only"
              aria-label="Select CSV or PDF bank statement files"
            />

            <div className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#C81E1E] hover:bg-[#991B1B] text-white text-xs font-semibold transition-colors">
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
              <span>{isParsing ? 'Analyzing Statements...' : 'Upload CSV / PDF Statements'}</span>
            </div>
          </div>

          {/* Sample CSV & PDF Statement Downloaders for Real Upload Verification */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">Download sample statements to test upload:</span>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  'ICICI_Salary_Statement.csv',
                  new Blob([ICICI_SALARY_CSV], { type: 'text/csv;charset=utf-8;' })
                )
              }
              className="px-2.5 py-1 border border-slate-300 text-slate-800 hover:border-[#1D4ED8] hover:text-[#1E3A8A] inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
            >
              <Download className="w-3 h-3" aria-hidden="true" />
              <span>Salary.csv</span>
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  'HDFC_Savings_Statement.csv',
                  new Blob([HDFC_SAVINGS_CSV], { type: 'text/csv;charset=utf-8;' })
                )
              }
              className="px-2.5 py-1 border border-slate-300 text-slate-800 hover:border-[#1D4ED8] hover:text-[#1E3A8A] inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
            >
              <Download className="w-3 h-3" aria-hidden="true" />
              <span>Savings.csv</span>
            </button>
            <button
              type="button"
              onClick={() => downloadFile('SBI_Card_Statement.pdf', buildSampleBankPdfBlob())}
              className="px-2.5 py-1 border border-slate-300 text-slate-800 hover:border-[#1D4ED8] hover:text-[#1E3A8A] inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
            >
              <FileText className="w-3 h-3" aria-hidden="true" />
              <span>SBI_Card.pdf</span>
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  'Short_Under3Months.csv',
                  new Blob([SHORT_INCOMPLETE_CSV], { type: 'text/csv;charset=utf-8;' })
                )
              }
              className="px-2.5 py-1 border border-slate-300 text-slate-800 hover:border-[#1D4ED8] hover:text-[#1E3A8A] inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
            >
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              <span>Under3Mo.csv</span>
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  'Freelance_Volatile.csv',
                  new Blob([IRREGULAR_FREELANCE_CSV], { type: 'text/csv;charset=utf-8;' })
                )
              }
              className="px-2.5 py-1 border border-slate-300 text-slate-800 hover:border-[#1D4ED8] hover:text-[#1E3A8A] inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
            >
              <Download className="w-3 h-3" aria-hidden="true" />
              <span>Freelance.csv</span>
            </button>
          </div>
        </div>

        {/* Right: Live Ingestion & Deduplication Analysis Summary */}
        <div className="lg:col-span-5 border border-slate-200 bg-slate-50/70 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-[#1E3A8A]" aria-hidden="true" />
                <span>Statement Ingestion &amp; Deduplication Audit</span>
              </div>
              {latestReport && (
                <span className="font-mono text-xs text-slate-700">
                  {latestReport.parseLatencyMs} ms
                </span>
              )}
            </div>

            {latestReport ? (
              <div className="mt-3 space-y-3 text-xs text-slate-800">
                <div className="grid grid-cols-3 gap-2 font-mono text-center">
                  <div className="bg-white border border-slate-200 p-2.5">
                    <div className="text-base font-bold text-slate-900">
                      {latestReport.totalRowsParsed}
                    </div>
                    <div className="text-[11px] font-sans text-slate-600">Rows Read</div>
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5">
                    <div className="text-base font-bold text-[#1E3A8A]">
                      {latestReport.addedCount}
                    </div>
                    <div className="text-[11px] font-sans text-slate-600">Unique Kept</div>
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5">
                    <div className="text-base font-bold text-[#C81E1E]">
                      {latestReport.deduplicatedCount}
                    </div>
                    <div className="text-[11px] font-sans text-slate-600">Duplicates Skipped</div>
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-slate-900">Files Analyzed: </span>
                  <span className="text-slate-700">{latestReport.filesProcessed.join(', ')}</span>
                </div>

                {latestReport.deduplicatedEntries.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowDuplicatesDetail((v) => !v)}
                      className="text-xs font-semibold text-[#1E3A8A] hover:underline focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
                    >
                      {showDuplicatesDetail
                        ? 'Hide Deduplicated Entries'
                        : `Inspect ${latestReport.deduplicatedEntries.length} Prevented Double-Counts →`}
                    </button>

                    {showDuplicatesDetail && (
                      <div className="mt-2 border border-slate-200 bg-white divide-y divide-slate-100 max-h-32 overflow-y-auto">
                        {latestReport.deduplicatedEntries.map((d, idx) => (
                          <div key={idx} className="p-2 text-[11px]">
                            <div className="font-mono font-semibold text-slate-900">
                              {d.droppedTransaction.date} · ₹
                              {d.droppedTransaction.amount.toLocaleString('en-IN')} ·{' '}
                              {d.droppedTransaction.description}
                            </div>
                            <div className="text-slate-600">{d.reason}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-700">
                Upload any CSV or PDF bank statement on the left to run multi-account normalization, merchant subword categorization, and duplicate elimination.
              </p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-700">
            Data Minimization Guarantee: Only transaction date, narration, amount, and account label are parsed locally. Raw statement buffers are discarded after parsing.
          </div>
        </div>
      </div>
    </section>
  );
};
