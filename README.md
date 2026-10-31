# CashCompass — 100% Offline Personal Finance & Explainable Affordability Assistant

CashCompass is an air-gapped, multi-account personal finance tracker and affordability decision assistant powered by an optimized on-device **ExecuTorch Llama (`finance_assistant.pte`) + SentencePiece (`tokenizer.model`)** runtime and a **100% deterministic TypeScript cash-flow engine**.

## Key Capabilities (Problem Statement 4 + Extra Points)

1. **Multi-Account CSV & PDF Statement Ingestion + Deduplication**:
   - Accepts `.csv` and `.pdf` bank and credit card statements from multiple accounts (`PapaParse` + offline `pdfjs-dist`).
   - Deduplicates overlapping exports, matching UTR/Ref numbers, and mirrored inter-account self-transfers so no transaction is counted twice.
2. **Smart Subword Categorization & Propagated User Corrections**:
   - Uses SentencePiece merchant subword stems to categorize transactions (`Rent & Housing`, `Food & Dining`, `Travel & Commute`, `Subscriptions`, `Utilities & Bills`, `EMI & Loans`, `Shopping`, `Healthcare`, `Salary & Income`, `Bonus & Irregular Income`).
   - Correcting one transaction's category automatically updates all matching merchant transactions and explicitly reports which rows changed.
3. **Recurring Payment & Anomaly Detection (with False-Positive Override)**:
   - Detects subscriptions, EMIs, and rent with cadence and **next expected payment date**.
   - Flags sudden large amounts, potential same-day/48h duplicate charges, and high-ticket new merchants — allowing users to confirm a real second payment or exclude a duplicate.
4. **Step-by-Step Deterministic Affordability Proof & Uncertainty Bands**:
   - Answers natural-language plans (*"Can I afford an ₹80,000 phone next month?"*) showing all 8 reasoning steps (even when the answer is **No**), explicit safety buffer formula derivation, and P15–P85 income/spending uncertainty ranges.
   - **One-Off Bonus Exclusion**: Detects prior non-repeating bonuses and excludes them from reliable next-month salary projections.
   - **"Say When It Does Not Know" Guardrail**: Refuses confident numbers when statement history spans fewer than 3 months, lacks verifiable income, or contains large date gaps.
   - **Change-of-Plan Simulator & Rolling Holdout Backtest**: Simulates cancelling subscriptions, deferring purchases, or taking a new EMI, and verifies forecast accuracy by holding out the latest complete month.

## Model & Output Speed Optimizations (`finance_assistant.pte` & `tokenizer.model`)

- **Release Target (`model-V1`)**:
  - `finance_assistant.pte` (`770 MB`, `sha256:af9401bfab2aaa0821b74f653fb2a...`) — INT4 groupwise quantized (`group_size=32`) with XNNPACK delegation.
  - `tokenizer.model` (`2.08 MB`, `sha256:82e9d31979e92ab929cd544440f12...`) — Binary SentencePiece protobuf parsed directly in WebWorker memory.
- **Latency Optimizations**:
  - Dedicated off-main-thread WebWorker execution (`src/workers/llamaRuntime.worker.ts`).
  - Frozen System-Prefix KV-Caching (eliminates repeated prompt prefill overhead).
  - Speculative 4–8 token chunk streaming + greedy `temperature=0.0` slot decoding.

## Capacitor Native App & CI/CD Workflow

- **Local Development**: `npm install && npm run dev`
- **Production Offline Build**: `npm run build`
- **Capacitor Android Sync**: `npm run cap:sync`
- **Automated APK Build**: `.github/workflows/build-cashcompass-app.yml` builds the web bundle, downloads `tokenizer.model` and `finance_assistant.pte` from GitHub Release `model-V1`, configures `android:largeHeap="true"`, and compiles the Android APK via Gradle.
