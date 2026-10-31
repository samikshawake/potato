import type { AffordabilityEvaluation, ExtractedPlanIntent, ModelArtifactStatus } from '../types/finance';

class LlamaRuntimeClient {
  private worker: Worker | null = null;
  private reqCounter = 0;
  private pending = new Map<
    number,
    {
      resolve: (val: any) => void;
      reject: (err: any) => void;
      onChunk?: (text: string) => void;
    }
  >();

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/llamaRuntime.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.worker.onmessage = (e: MessageEvent) => {
        const { type, requestId, payload } = e.data;
        const entry = this.pending.get(requestId);
        if (!entry) return;

        if (type === 'EXPLANATION_CHUNK') {
          entry.onChunk?.(payload.text);
          return;
        }

        this.pending.delete(requestId);
        entry.resolve(payload);
      };
      this.worker.onerror = (err) => {
        console.error('Llama worker error:', err);
      };
    }
    return this.worker;
  }

  private sendRequest<T>(type: string, payload: unknown, onChunk?: (text: string) => void): Promise<T> {
    const worker = this.ensureWorker();
    const requestId = ++this.reqCounter;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject, onChunk });
      worker.postMessage({ type, requestId, payload });
    });
  }

  public updateConfig(cfg: Partial<Pick<ModelArtifactStatus, 'quantizationMode' | 'kvCacheEnabled' | 'speculativeBatching'>>) {
    return this.sendRequest('SET_CONFIG', cfg);
  }

  public loadTokenizerFile(file: File): Promise<{
    fileName: string;
    sizeMB: number;
    vocabSize: number;
    sha256: string;
    verifiedMatch: boolean;
    elapsedMs: number;
  }> {
    return this.sendRequest('LOAD_TOKENIZER_FILE', { file });
  }

  public verifyPteFile(file: File): Promise<{
    fileName: string;
    sizeMB: number;
    sha256: string;
    magicHeader: string;
    verifiedMatch: boolean;
    elapsedMs: number;
  }> {
    return this.sendRequest('VERIFY_PTE_FILE', { file });
  }

  public parsePlanIntent(query: string): Promise<ExtractedPlanIntent> {
    return this.sendRequest<ExtractedPlanIntent>('PARSE_PLAN_INTENT', { query });
  }

  public streamGroundedExplanation(
    evaluation: AffordabilityEvaluation,
    onChunk?: (text: string) => void
  ): Promise<{ fullText: string; outputTokens: number; decodeMs: number; tokensPerSec: number }> {
    return this.sendRequest('STREAM_EXPLANATION', { evaluation }, onChunk);
  }
}

export const llamaClient = new LlamaRuntimeClient();
