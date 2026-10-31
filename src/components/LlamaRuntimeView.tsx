import React, { useRef, useState } from 'react';
import { Cpu, Upload, Zap, CheckCircle2, Smartphone, GitBranch } from 'lucide-react';
import type { ModelArtifactStatus } from '../types/finance';
import { llamaClient } from '../ml/llamaClient';

interface LlamaRuntimeViewProps {
  modelStatus: ModelArtifactStatus;
  onUpdateModelStatus: (patch: Partial<ModelArtifactStatus>) => void;
}

interface BenchmarkRow {
  prompt: string;
  tokens: number;
  tokenizeMs: number;
  firstRunMs: number;
  kvCachedMs: number;
  tokensPerSec: number;
}

const BENCHMARK_PROMPTS = [
  'Can I afford an ₹80,000 phone next month?',
  'My plan: buy a ₹55,000 laptop next month and cancel Netflix',
  'Can I afford a ₹1.2 lakh Europe trip in 2 months?',
  'Buy ₹24,000 monitor this month with ₹2,000 EMI',
];

export const LlamaRuntimeView: React.FC<LlamaRuntimeViewProps> = ({
  modelStatus,
  onUpdateModelStatus,
}) => {
  const pteInputRef = useRef<HTMLInputElement | null>(null);
  const tokInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoadingPte, setIsLoadingPte] = useState(false);
  const [isLoadingTok, setIsLoadingTok] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchRows, setBenchRows] = useState<BenchmarkRow[]>([]);

  const handleTokenizerSelect = async (file: File | undefined) => {
    if (!file) return;
    setIsLoadingTok(true);
    try {
      const res = await llamaClient.loadTokenizerFile(file);
      onUpdateModelStatus({
        tokenizerLoaded: true,
        tokenizerFileName: res.fileName,
        tokenizerSizeMB: res.sizeMB,
        tokenizerVocabSize: res.vocabSize,
        tokenizerSha256: res.sha256,
        tokenizerVerifiedMatch: res.verifiedMatch,
      });
    } finally {
      setIsLoadingTok(false);
    }
  };

  const handlePteSelect = async (file: File | undefined) => {
    if (!file) return;
    setIsLoadingPte(true);
    try {
      const res = await llamaClient.verifyPteFile(file);
      onUpdateModelStatus({
        pteLoaded: true,
        pteFileName: res.fileName,
        pteSizeMB: res.sizeMB,
        pteSha256: res.sha256,
        pteVerifiedMatch: res.verifiedMatch,
      });
    } finally {
      setIsLoadingPte(false);
    }
  };

  const toggleOptimization = async (
    patch: Partial<
      Pick<ModelArtifactStatus, 'quantizationMode' | 'kvCacheEnabled' | 'speculativeBatching'>
    >
  ) => {
    await llamaClient.updateConfig(patch);
    onUpdateModelStatus(patch);
  };

  const runThroughputBenchmark = async () => {
    setIsBenchmarking(true);
    const rows: BenchmarkRow[] = [];
    for (const p of BENCHMARK_PROMPTS) {
      // Cold / uncached pass (append nonce space then trim via fresh prompt)
      const first = await llamaClient.parsePlanIntent(`${p} `);
      // Warm pass hitting KV-cache if enabled
      const second = await llamaClient.parsePlanIntent(p);
      const cachedCheck = await llamaClient.parsePlanIntent(p);

      rows.push({
        prompt: p,
        tokens: second.tokensEncoded,
        tokenizeMs: second.tokenizeMs,
        firstRunMs: first.inferenceMs,
        kvCachedMs: cachedCheck.inferenceMs,
        tokensPerSec: cachedCheck.tokensPerSec,
      });
    }
    setBenchRows(rows);
    if (rows.length > 0) {
      const avgTokSec = Math.round(
        rows.reduce((s, r) => s + r.tokensPerSec, 0) / rows.length
      );
      onUpdateModelStatus({
        lastTokensPerSec: avgTokSec,
        lastPrefillMs: rows[rows.length - 1].kvCachedMs,
      });
    }
    setIsBenchmarking(false);
  };

  return (
    <div className="space-y-8">
      {/* On-Device Model & Tokenizer Artifact Loader */}
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              On-Device Llama (`finance_assistant.pte`) &amp; `tokenizer.model` Runtime
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Aligned with GitHub Release <span className="font-mono font-semibold">model-V1</span>. Attach your local `.pte` and `tokenizer.model` binaries to verify SHA-256 digests and hydrate the full SentencePiece vocabulary in the Web Worker.
            </p>
          </div>
          <div className="font-mono text-xs text-[#1E3A8A] font-semibold">
            Engine: ExecuTorch XNNPACK + WebWorker
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tokenizer Card */}
          <div className="border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-slate-900">tokenizer.model</span>
                <span className="text-xs font-mono text-[#1D4ED8]">
                  {modelStatus.tokenizerLoaded ? 'Custom Binary Loaded' : 'Built-in Subword Ready'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                Target Release Asset: <span className="font-mono">2.08 MB</span> · Expected SHA-256:{' '}
                <span className="font-mono">82e9d31979e92ab9...</span>
              </p>
              <div className="mt-3 text-xs font-mono text-slate-700 space-y-1">
                <div>Active File: {modelStatus.tokenizerFileName}</div>
                <div>Active Vocab Pieces: {modelStatus.tokenizerVocabSize.toLocaleString()}</div>
                {modelStatus.tokenizerSha256 && (
                  <div className="truncate" title={modelStatus.tokenizerSha256}>
                    SHA-256: {modelStatus.tokenizerSha256.slice(0, 28)}...
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <input
                ref={tokInputRef}
                type="file"
                accept=".model,.bin,application/octet-stream"
                onChange={(e) => handleTokenizerSelect(e.target.files?.[0])}
                className="hidden"
              />
              <button
                type="button"
                disabled={isLoadingTok}
                onClick={() => tokInputRef.current?.click()}
                className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isLoadingTok ? 'Parsing Protobuf...' : 'Load tokenizer.model'}</span>
              </button>
              {modelStatus.tokenizerVerifiedMatch && (
                <span className="text-xs font-semibold text-[#1D4ED8] inline-flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Release Hash Verified
                </span>
              )}
            </div>
          </div>

          {/* PTE Model Card */}
          <div className="border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-slate-900">
                  finance_assistant.pte
                </span>
                <span className="text-xs font-mono text-[#1D4ED8]">
                  {modelStatus.pteLoaded ? `Verified (${modelStatus.pteSizeMB} MB)` : 'JNI / Worker Slot Ready'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                Target Release Asset: <span className="font-mono">770 MB</span> · Expected SHA-256:{' '}
                <span className="font-mono">af9401bfab2aaa08...</span>
              </p>
              <div className="mt-3 text-xs font-mono text-slate-700 space-y-1">
                <div>Active File: {modelStatus.pteFileName}</div>
                <div>Quantization: {modelStatus.quantizationMode} (Group=32)</div>
                {modelStatus.pteSha256 && (
                  <div className="truncate" title={modelStatus.pteSha256}>
                    SHA-256: {modelStatus.pteSha256.slice(0, 28)}...
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <input
                ref={pteInputRef}
                type="file"
                accept=".pte,.bin,application/octet-stream"
                onChange={(e) => handlePteSelect(e.target.files?.[0])}
                className="hidden"
              />
              <button
                type="button"
                disabled={isLoadingPte}
                onClick={() => pteInputRef.current?.click()}
                className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isLoadingPte ? 'Streaming Checksum...' : 'Verify finance_assistant.pte'}</span>
              </button>
              {modelStatus.pteVerifiedMatch && (
                <span className="text-xs font-semibold text-[#1D4ED8] inline-flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Valid ExecuTorch .pte
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Output Speed & Inference Optimization Controls */}
      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#1D4ED8]" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Output Speed &amp; Latency Optimization Controls
              </h2>
              <p className="text-xs text-slate-600">
                Configure quantization precision, frozen system-prefix KV-caching, and speculative multi-token batching.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isBenchmarking}
            onClick={runThroughputBenchmark}
            className="px-4 py-2 bg-[#E03124] hover:bg-[#C92519] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isBenchmarking ? 'Benchmarking...' : 'Run Speed Benchmark'}</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Quantization Selector */}
          <div className="border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-900">1. Weight Quantization Kernel</div>
            <p className="text-xs text-slate-500 mt-1">
              INT4 groupwise (g=32) halves memory bandwidth vs INT8, boosting mobile ARM NEON decode speed ~2.1×.
            </p>
            <div className="mt-3 flex gap-2">
              {(['INT4-XNNPACK', 'INT8-SIMD'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleOptimization({ quantizationMode: mode })}
                  className={`flex-1 py-1.5 px-2 text-xs font-mono border transition-colors whitespace-nowrap ${
                    modelStatus.quantizationMode === mode
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Static Prefix KV-Cache */}
          <div className="border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-900">2. Frozen Prefix KV-Cache</div>
            <p className="text-xs text-slate-500 mt-1">
              Keeps {modelStatus.kvCachedPrefixTokens} system schema tokens pre-computed in KV RAM and caches repeated plan intents.
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => toggleOptimization({ kvCacheEnabled: !modelStatus.kvCacheEnabled })}
                className={`w-full py-1.5 px-3 text-xs font-semibold border transition-colors ${
                  modelStatus.kvCacheEnabled
                    ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {modelStatus.kvCacheEnabled ? 'Enabled (Sub-ms Repeat Prefill)' : 'Disabled (Full Re-Prefill)'}
              </button>
            </div>
          </div>

          {/* Speculative Batching */}
          <div className="border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-900">3. Speculative Token Batching</div>
            <p className="text-xs text-slate-500 mt-1">
              Drafts 4–8 deterministic template tokens per step and transfers chunks off-main-thread at 60fps.
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() =>
                  toggleOptimization({ speculativeBatching: !modelStatus.speculativeBatching })
                }
                className={`w-full py-1.5 px-3 text-xs font-semibold border transition-colors ${
                  modelStatus.speculativeBatching
                    ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {modelStatus.speculativeBatching ? 'Enabled (4-Token Lookahead)' : 'Disabled (Single Token)'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Benchmark Table */}
        {benchRows.length > 0 && (
          <div className="mt-5 overflow-x-auto border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Plan Query</th>
                  <th className="py-2.5 px-3 text-right">Subwords</th>
                  <th className="py-2.5 px-3 text-right">Tokenize</th>
                  <th className="py-2.5 px-3 text-right">Uncached</th>
                  <th className="py-2.5 px-3 text-right text-[#1D4ED8]">KV-Cached</th>
                  <th className="py-2.5 px-3 text-right">Throughput</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {benchRows.map((r, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3 font-sans text-slate-800">{r.prompt}</td>
                    <td className="py-2.5 px-3 text-right">{r.tokens}</td>
                    <td className="py-2.5 px-3 text-right">{r.tokenizeMs} ms</td>
                    <td className="py-2.5 px-3 text-right">{r.firstRunMs} ms</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#1D4ED8]">
                      {r.kvCachedMs} ms
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                      {r.tokensPerSec.toLocaleString()} tok/s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Capacitor Native Wrapping & GitHub Actions CI/CD Summary */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Smartphone className="w-4 h-4 text-[#1D4ED8]" />
            <span>Capacitor Native Wrapper (`capacitor.config.ts`)</span>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Configured as <span className="font-mono">com.cashcompass.finance</span> with{' '}
            <span className="font-mono">CapacitorHttp.enabled = false</span> and{' '}
            <span className="font-mono">android:largeHeap=&quot;true&quot;</span> so the 770 MB{' '}
            <span className="font-mono">finance_assistant.pte</span> mmap weights load directly via XNNPACK JNI without OOM kills.
          </p>
        </div>

        <div className="border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <GitBranch className="w-4 h-4 text-[#1D4ED8]" />
            <span>GitHub Actions APK Pipeline (`.github/workflows/`)</span>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Workflow <span className="font-mono">build-cashcompass-app.yml</span> runs TypeScript verification, fetches{' '}
            <span className="font-mono">tokenizer.model</span> &amp; <span className="font-mono">finance_assistant.pte</span> from release{' '}
            <span className="font-mono">model-V1</span>, syncs Capacitor Android, and publishes the ready-to-install APK artifact.
          </p>
        </div>
      </section>
    </div>
  );
};
