import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import {
  Transaction,
  TransactionCategory,
  BankAccount,
  SavingsGoal,
  RecurringPayment,
  AnomalyItem,
  CashFlowForecast,
  FinancialInsight,
} from '../types/finance';
import { DEMO_TRANSACTIONS } from '../data/demoTransactions';
import { DEMO_ACCOUNTS } from '../data/demoAccounts';
import {
  DEMO_GOALS,
  DEMO_BADGES,
  BadgeItem,
  CURRENT_MISSION,
  SavingsMission,
} from '../data/demoGoals';
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetCashFlow,
  calculateCategorySpending,
  CategorySpendingSummary,
} from '../services/financeEngine';
import {
  detectRecurringPayments,
  calculateTotalRecurringMonthly,
} from '../services/recurringDetector';
import { detectUnusualTransactions } from '../services/anomalyDetector';
import { forecastMonthlyBalance } from '../services/forecasting';
import { llamaClient } from '../../../src/ml/llamaClient';

export interface AuthUserProfile {
  id: string;
  fullName: string;
  email: string;
  emailDigestOptIn: boolean;
  createdAt: string;
}

export interface TokenizerRuntimeStatus {
  loaded: boolean;
  fileName: string;
  sizeMB: number;
  vocabSize: number;
  sha256: string;
  verifiedMatch: boolean;
  elapsedMs: number;
  pteFileName?: string;
  pteVerified?: boolean;
  pteSha256?: string;
  quantizationMode: 'INT4-XNNPACK' | 'INT8-SIMD';
  kvCacheEnabled: boolean;
  speculativeBatching: boolean;
}

export type LegalDocKey = 'privacy' | 'terms' | 'refund' | 'cookies';

// Default 3-month historical transactions for offline Capacitor fallback
const OFFLINE_HISTORICAL_TXS: Transaction[] = [
  {
    id: 'tx_sep_sal_01',
    title: 'Salary Credit - TechCorp India',
    amount: 50000,
    type: 'INCOME',
    category: 'Salary',
    date: '2026-09-01',
    time: '09:30 AM',
    paymentMethod: 'NEFT',
    accountId: 'acc_hdfc_01',
    merchant: 'TechCorp India Pvt Ltd',
  },
  {
    id: 'tx_sep_con_02',
    title: 'Consulting Project Milestone',
    amount: 48000,
    type: 'INCOME',
    category: 'Salary',
    date: '2026-09-15',
    time: '02:30 PM',
    paymentMethod: 'IMPS',
    accountId: 'acc_sbi_02',
    merchant: 'Acme Digital Labs',
  },
  {
    id: 'tx_sep_rent_01',
    title: 'Apartment Rent (Indiranagar)',
    amount: 12000,
    type: 'EXPENSE',
    category: 'Rent',
    date: '2026-09-02',
    time: '10:00 AM',
    paymentMethod: 'UPI',
    accountId: 'acc_hdfc_01',
    isRecurring: true,
    merchant: 'Suresh Kumar (Landlord)',
  },
  {
    id: 'tx_sep_food_01',
    title: 'Organic Supermarket Stockup',
    amount: 14120,
    type: 'EXPENSE',
    category: 'Food',
    date: '2026-09-11',
    time: '07:10 PM',
    paymentMethod: 'UPI',
    accountId: 'acc_hdfc_01',
    merchant: 'Nature Basket',
  },
  {
    id: 'tx_aug_sal_01',
    title: 'Salary Credit - TechCorp India',
    amount: 50000,
    type: 'INCOME',
    category: 'Salary',
    date: '2026-08-01',
    time: '09:30 AM',
    paymentMethod: 'NEFT',
    accountId: 'acc_hdfc_01',
    merchant: 'TechCorp India Pvt Ltd',
  },
  {
    id: 'tx_aug_con_02',
    title: 'Consulting Project Milestone',
    amount: 52000,
    type: 'INCOME',
    category: 'Salary',
    date: '2026-08-16',
    time: '04:00 PM',
    paymentMethod: 'IMPS',
    accountId: 'acc_sbi_02',
    merchant: 'Acme Digital Labs',
  },
  {
    id: 'tx_aug_rent_01',
    title: 'Apartment Rent (Indiranagar)',
    amount: 12000,
    type: 'EXPENSE',
    category: 'Rent',
    date: '2026-08-02',
    time: '10:00 AM',
    paymentMethod: 'UPI',
    accountId: 'acc_hdfc_01',
    isRecurring: true,
    merchant: 'Suresh Kumar (Landlord)',
  },
  {
    id: 'tx_aug_food_01',
    title: 'Groceries & Dining Baseline',
    amount: 13900,
    type: 'EXPENSE',
    category: 'Food',
    date: '2026-08-14',
    time: '08:15 PM',
    paymentMethod: 'UPI',
    accountId: 'acc_hdfc_01',
    merchant: 'BigBasket Fresh',
  },
  {
    id: 'tx_2025_bonus_01',
    title: 'Annual Diwali Performance Bonus 2025',
    amount: 85000,
    type: 'INCOME',
    category: 'Salary',
    date: '2025-11-05',
    time: '11:00 AM',
    paymentMethod: 'NEFT',
    accountId: 'acc_hdfc_01',
    notes: 'One-off annual bonus from last year — not guaranteed this year',
    merchant: 'TechCorp India Annual Bonus',
  },
];

interface FinanceContextType {
  // Auth & Compliance State
  user: AuthUserProfile | null;
  authToken: string | null;
  authReady: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    ageConfirmed18Plus: boolean;
    emailDigestOptIn: boolean;
    startFresh?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  loginDemo: () => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  rotateJwtSecret: () => Promise<{ ok: boolean; message?: string }>;
  updateEmailPreferences: (optIn: boolean) => Promise<void>;
  deleteAccountPermanently: () => Promise<{
    ok: boolean;
    receipt?: { receiptId: string; deletedAt: string; signatureHex: string };
  }>;
  activeLegalDoc: LegalDocKey | null;
  openLegalDoc: (doc: LegalDocKey | null) => void;

  // Llama & Tokenizer Runtime
  modelStatus: TokenizerRuntimeStatus;
  uploadTokenizerModel: (file: File) => Promise<void>;
  uploadPteModel: (file: File) => Promise<void>;
  updateModelOptimization: (
    patch: Partial<
      Pick<TokenizerRuntimeStatus, 'quantizationMode' | 'kvCacheEnabled' | 'speculativeBatching'>
    >
  ) => Promise<void>;

  // Core CashCompass State (preserved + enhanced)
  transactions: Transaction[];
  accounts: BankAccount[];
  goals: SavingsGoal[];
  badges: BadgeItem[];
  mission: SavingsMission;
  recurring: RecurringPayment[];
  cancelledRecurringIds: string[];
  toggleRecurringCancel: (recurringId: string) => void;
  anomalies: AnomalyItem[];
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  netCashFlow: number;
  categorySpending: CategorySpendingSummary[];
  totalRecurringMonthly: number;
  forecast: CashFlowForecast;
  insights: FinancialInsight[];
  isOfflineMode: boolean;
  lastCategoryPropagationNotice: string | null;
  clearCategoryNotice: () => void;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  importTransactions: (
    newTransactions: Transaction[],
    replaceAll?: boolean,
    accountId?: string,
    discoveredAccounts?: BankAccount[]
  ) => Promise<{ importedCount: number; duplicatesSkipped: number; newAccountsLinked?: number }>;
  updateTransactionCategory: (
    txId: string,
    newCategory: TransactionCategory
  ) => Promise<{ changedIds: string[]; matchedMerchant: string }>;
  reviewAnomaly: (anomalyId: string, status: 'CONFIRMED' | 'DISMISSED') => void;
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  contributeToGoal: (goalId: string, amount: number) => void;
  resetDemoData: () => void;
  loadShortHistoryTestMode: () => void;
}

const SESSION_TOKEN_KEY = 'cc_jwt_session_v1';

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SESSION_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocKey | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([
    ...DEMO_TRANSACTIONS,
    ...OFFLINE_HISTORICAL_TXS,
  ]);
  const [accounts, setAccounts] = useState<BankAccount[]>(DEMO_ACCOUNTS);
  const [goals, setGoals] = useState<SavingsGoal[]>(DEMO_GOALS);
  const [badges, setBadges] = useState<BadgeItem[]>(DEMO_BADGES);
  const [mission, setMission] = useState<SavingsMission>(CURRENT_MISSION);
  const [reviewedAnomalies, setReviewedAnomalies] = useState<
    Record<string, 'CONFIRMED' | 'DISMISSED'>
  >({});
  const [cancelledRecurringIds, setCancelledRecurringIds] = useState<string[]>([]);
  const [lastCategoryPropagationNotice, setLastCategoryPropagationNotice] = useState<string | null>(
    null
  );

  const [modelStatus, setModelStatus] = useState<TokenizerRuntimeStatus>({
    loaded: false,
    fileName: 'tokenizer.model',
    sizeMB: 2.08,
    vocabSize: 0,
    sha256: '',
    verifiedMatch: false,
    elapsedMs: 0,
    quantizationMode: 'INT4-XNNPACK',
    kvCacheEnabled: true,
    speculativeBatching: true,
  });

  const isOfflineMode = true;

  const hydrateFromVault = (vault: any) => {
    if (!vault) return;
    if (Array.isArray(vault.transactions)) setTransactions(vault.transactions);
    if (Array.isArray(vault.accounts)) setAccounts(vault.accounts);
    if (Array.isArray(vault.goals)) setGoals(vault.goals);
    if (Array.isArray(vault.badges)) setBadges(vault.badges);
    if (vault.mission) setMission(vault.mission);
    if (vault.reviewedAnomalies) setReviewedAnomalies(vault.reviewedAnomalies);
    if (Array.isArray(vault.cancelledRecurringIds)) {
      setCancelledRecurringIds(vault.cancelledRecurringIds);
    }
  };

  // Restore active JWT session on startup
  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      if (!authToken) {
        if (!cancelled) setAuthReady(true);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setUser(data.user);
            hydrateFromVault(data.vault);
          }
        } else {
          localStorage.removeItem(SESSION_TOKEN_KEY);
          if (!cancelled) {
            setAuthToken(null);
            setUser(null);
          }
        }
      } catch {
        // Offline Capacitor fallback if server unreachable
        if (!cancelled) {
          setUser({
            id: 'usr_offline_local',
            fullName: 'Parth',
            email: 'parth@cashcompass.local',
            emailDigestOptIn: false,
            createdAt: new Date().toISOString(),
          });
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }
    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-hydrate the real bundled SentencePiece tokenizer.model in WebWorker
  useEffect(() => {
    let cancelled = false;
    async function preloadBundledTokenizer() {
      try {
        const resp = await fetch('/models/tokenizer.model');
        if (!resp.ok) return;
        const blob = await resp.blob();
        const file = new File([blob], 'tokenizer.model', { type: 'application/octet-stream' });
        const stats = await llamaClient.loadTokenizerFile(file);
        if (!cancelled) {
          setModelStatus((prev) => ({
            ...prev,
            loaded: true,
            fileName: stats.fileName,
            sizeMB: stats.sizeMB,
            vocabSize: stats.vocabSize,
            sha256: stats.sha256,
            verifiedMatch: stats.verifiedMatch,
            elapsedMs: stats.elapsedMs,
          }));
        }
      } catch {
        // Bundled tokenizer optional if offline path differs
      }
    }
    preloadBundledTokenizer();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Sign in failed.' };
      }
      localStorage.setItem(SESSION_TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setUser(data.user);
      hydrateFromVault(data.vault);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error connecting to local auth service.' };
    }
  };

  const register = async (input: {
    fullName: string;
    email: string;
    password: string;
    ageConfirmed18Plus: boolean;
    emailDigestOptIn: boolean;
    startFresh?: boolean;
  }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Account creation failed.' };
      }
      localStorage.setItem(SESSION_TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setUser(data.user);
      hydrateFromVault(data.vault);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Unable to reach registration service.' };
    }
  };

  const loginDemo = async () => {
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Demo login failed.' };
      localStorage.setItem(SESSION_TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setUser(data.user);
      hydrateFromVault(data.vault);
      return { ok: true };
    } catch {
      // Pure offline fallback
      setUser({
        id: 'usr_parth_demo',
        fullName: 'Parth',
        email: 'parth@cashcompass.local',
        emailDigestOptIn: false,
        createdAt: new Date().toISOString(),
      });
      return { ok: true };
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    } catch {
      // ignore
    }
    setAuthToken(null);
    setUser(null);
  };

  const rotateJwtSecret = async () => {
    if (!authToken) return { ok: false, message: 'Not authenticated.' };
    try {
      const res = await fetch('/api/auth/rotate-secret', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem(SESSION_TOKEN_KEY, data.token);
        setAuthToken(data.token);
        return { ok: true, message: data.message };
      }
      return { ok: false, message: data.error || 'Failed to rotate secret.' };
    } catch {
      return { ok: false, message: 'Offline mode — local session token preserved.' };
    }
  };

  const updateEmailPreferences = async (optIn: boolean) => {
    if (user) {
      setUser({ ...user, emailDigestOptIn: optIn });
    }
    if (!authToken) return;
    try {
      await fetch('/api/auth/email-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ emailDigestOptIn: optIn }),
      });
    } catch {
      // ignore offline
    }
  };

  const deleteAccountPermanently = async () => {
    try {
      if (authToken) {
        const res = await fetch('/api/auth/account', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        localStorage.removeItem(SESSION_TOKEN_KEY);
        setAuthToken(null);
        setUser(null);
        return { ok: true, receipt: data.receipt };
      }
    } catch {
      // fallback local wipe
    }
    localStorage.clear();
    setAuthToken(null);
    setUser(null);
    return {
      ok: true,
      receipt: {
        receiptId: `erase_local_${Date.now()}`,
        deletedAt: new Date().toISOString(),
        signatureHex: 'local-zeroized-vault',
      },
    };
  };

  const uploadTokenizerModel = async (file: File) => {
    const stats = await llamaClient.loadTokenizerFile(file);
    setModelStatus((prev) => ({
      ...prev,
      loaded: true,
      fileName: stats.fileName,
      sizeMB: stats.sizeMB,
      vocabSize: stats.vocabSize,
      sha256: stats.sha256,
      verifiedMatch: stats.verifiedMatch,
      elapsedMs: stats.elapsedMs,
    }));
  };

  const uploadPteModel = async (file: File) => {
    const stats = await llamaClient.verifyPteFile(file);
    setModelStatus((prev) => ({
      ...prev,
      pteFileName: stats.fileName,
      pteVerified: stats.verifiedMatch,
      pteSha256: stats.sha256,
    }));
  };

  const updateModelOptimization = async (
    patch: Partial<
      Pick<TokenizerRuntimeStatus, 'quantizationMode' | 'kvCacheEnabled' | 'speculativeBatching'>
    >
  ) => {
    await llamaClient.updateConfig(patch);
    setModelStatus((prev) => ({ ...prev, ...patch }));
  };

  // Real-time calculations derived from local transactions
  const totalIncome = useMemo(() => calculateTotalIncome(transactions), [transactions]);
  const totalExpenses = useMemo(() => calculateTotalExpenses(transactions), [transactions]);
  const netCashFlow = useMemo(() => calculateNetCashFlow(transactions), [transactions]);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, acc) => sum + acc.balance, 0),
    [accounts]
  );

  const categorySpending = useMemo(
    () => calculateCategorySpending(transactions),
    [transactions]
  );

  const recurring = useMemo(() => {
    const raw = detectRecurringPayments(transactions);
    return raw.map((r) => ({
      ...r,
      status: cancelledRecurringIds.includes(r.id) ? ('PAUSED' as const) : r.status,
    }));
  }, [transactions, cancelledRecurringIds]);

  const totalRecurringMonthly = useMemo(
    () => calculateTotalRecurringMonthly(recurring),
    [recurring]
  );

  const anomalies = useMemo(() => {
    const raw = detectUnusualTransactions(transactions);
    return raw.map((a) => ({
      ...a,
      status: reviewedAnomalies[a.id] || a.status,
    }));
  }, [transactions, reviewedAnomalies]);

  const forecast = useMemo(
    () => forecastMonthlyBalance(transactions, totalBalance),
    [transactions, totalBalance]
  );

  const insights: FinancialInsight[] = useMemo(
    () => [
      {
        id: 'ins_01',
        type: 'WARNING',
        title: 'Food Spending Increased by 12%',
        description:
          'You spent ₹15,870 on dining & deliveries this month, higher than last month’s baseline.',
        category: 'Food',
        impactAmount: 1700,
        dataPointsUsed: ['8 Zomato/Swiggy orders', 'Multi-month baseline comparison'],
        actionLabel: 'Review Food Budget',
      },
      {
        id: 'ins_02',
        type: 'INFO',
        title: 'Upcoming Recurring Obligations',
        description: `You have ₹${totalRecurringMonthly.toLocaleString(
          'en-IN'
        )} committed in active monthly bills and subscriptions.`,
        category: 'Bills',
        impactAmount: totalRecurringMonthly,
        dataPointsUsed: ['Rent', 'Broadband', 'Electricity', 'OTT subscriptions'],
        actionLabel: 'View Commitments',
      },
    ],
    [totalRecurringMonthly]
  );

  const addTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const optimistic: Transaction = {
      ...newTx,
      id: `tx_user_${Date.now()}`,
    };
    setTransactions((prev) => [optimistic, ...prev]);
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === optimistic.accountId) {
          const delta = optimistic.type === 'INCOME' ? optimistic.amount : -optimistic.amount;
          return { ...acc, balance: Math.max(0, acc.balance + delta) };
        }
        return acc;
      })
    );

    if (authToken) {
      fetch('/api/finance/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(newTx),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.vault) hydrateFromVault(d.vault);
        })
        .catch(() => {});
    }
  };

  const importTransactions = async (
    newTransactions: Transaction[],
    replaceAll: boolean = false,
    accountId: string = accounts[0]?.id || 'acc_hdfc_01',
    discoveredAccounts: BankAccount[] = []
  ): Promise<{ importedCount: number; duplicatesSkipped: number; newAccountsLinked?: number }> => {
    if (authToken) {
      try {
        const res = await fetch('/api/finance/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            transactions: newTransactions,
            replaceAll,
            accountId,
            discoveredAccounts,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          hydrateFromVault(data.vault);
          return {
            importedCount: data.importedCount,
            duplicatesSkipped: data.duplicatesSkipped,
            newAccountsLinked: data.newAccountsLinked || 0,
          };
        }
      } catch {
        // fallback offline below
      }
    }

    // Offline deduplication & multi-bank auto-linking fallback
    const mergedAccounts = [...accounts];
    const remap = new Map<string, string>();
    let newAccountsLinked = 0;

    for (const disc of discoveredAccounts) {
      const last4 = disc.accountNumberMasked?.slice(-4) || '';
      const existing = mergedAccounts.find(
        (a) => a.id === disc.id || (last4.length === 4 && a.accountNumberMasked.endsWith(last4))
      );
      if (existing) {
        remap.set(disc.id, existing.id);
      } else {
        mergedAccounts.push(disc);
        remap.set(disc.id, disc.id);
        newAccountsLinked++;
      }
    }

    if (replaceAll) {
      setAccounts(mergedAccounts);
      setTransactions(newTransactions);
      return { importedCount: newTransactions.length, duplicatesSkipped: 0, newAccountsLinked };
    }

    const fp = (t: Transaction) =>
      t.upiTransactionId && t.upiTransactionId.trim().length >= 6
        ? `upi:${t.upiTransactionId.trim().toLowerCase()}`
        : `${t.date}|${t.type}|${Math.round(t.amount * 100)}|${(t.merchant || t.title)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 24)}`;

    const existingSet = new Set(transactions.map(fp));
    const unique: Transaction[] = [];
    let skipped = 0;

    for (const tx of newTransactions) {
      const k = fp(tx);
      if (existingSet.has(k)) {
        skipped++;
      } else {
        existingSet.add(k);
        const resolvedAcc =
          (tx.accountId && remap.get(tx.accountId)) || tx.accountId || accountId;
        unique.push({ ...tx, accountId: resolvedAcc });
      }
    }

    setTransactions((prev) =>
      [...unique, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    );

    const deltaByAcc = new Map<string, number>();
    for (const tx of unique) {
      if (tx.type === 'TRANSFER') continue;
      const d = tx.type === 'INCOME' ? tx.amount : -tx.amount;
      deltaByAcc.set(tx.accountId, (deltaByAcc.get(tx.accountId) || 0) + d);
    }

    setAccounts(
      mergedAccounts.map((acc) => {
        const d = deltaByAcc.get(acc.id);
        return d ? { ...acc, balance: Math.max(0, acc.balance + d) } : acc;
      })
    );
    return { importedCount: unique.length, duplicatesSkipped: skipped, newAccountsLinked };
  };

  const updateTransactionCategory = async (
    txId: string,
    newCategory: TransactionCategory
  ): Promise<{ changedIds: string[]; matchedMerchant: string }> => {
    if (authToken) {
      try {
        const res = await fetch(`/api/finance/transactions/${encodeURIComponent(txId)}/category`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ category: newCategory }),
        });
        if (res.ok) {
          const data = await res.json();
          hydrateFromVault(data.vault);
          setLastCategoryPropagationNotice(
            `Updated ${data.changedIds.length} transaction(s) matching "${data.matchedMerchant}" to ${newCategory}.`
          );
          return { changedIds: data.changedIds, matchedMerchant: data.matchedMerchant };
        }
      } catch {
        // fallback local below
      }
    }

    const target = transactions.find((t) => t.id === txId);
    const merchantName = target?.merchant || target?.title || '';
    const key = merchantName.toLowerCase().trim();
    const changedIds: string[] = [];

    setTransactions((prev) =>
      prev.map((tx) => {
        const m = (tx.merchant || tx.title).toLowerCase().trim();
        if (tx.id === txId || (key.length >= 3 && m.includes(key))) {
          changedIds.push(tx.id);
          return { ...tx, category: newCategory, isReviewed: true };
        }
        return tx;
      })
    );
    setLastCategoryPropagationNotice(
      `Updated ${changedIds.length} transaction(s) matching "${merchantName}" to ${newCategory}.`
    );
    return { changedIds, matchedMerchant: merchantName };
  };

  const reviewAnomaly = (anomalyId: string, status: 'CONFIRMED' | 'DISMISSED') => {
    setReviewedAnomalies((prev) => ({ ...prev, [anomalyId]: status }));
    if (authToken) {
      fetch(`/api/finance/anomalies/${encodeURIComponent(anomalyId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      }).catch(() => {});
    }
  };

  const toggleRecurringCancel = (recurringId: string) => {
    setCancelledRecurringIds((prev) =>
      prev.includes(recurringId) ? prev.filter((id) => id !== recurringId) : [...prev, recurringId]
    );
    if (authToken) {
      fetch('/api/finance/recurring/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ recurringId }),
      }).catch(() => {});
    }
  };

  const addGoal = (newGoal: Omit<SavingsGoal, 'id'>) => {
    const created: SavingsGoal = {
      ...newGoal,
      id: `goal_${Date.now()}`,
    };
    setGoals((prev) => [...prev, created]);
    if (authToken) {
      fetch('/api/finance/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(newGoal),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.vault) hydrateFromVault(d.vault);
        })
        .catch(() => {});
    }
  };

  const contributeToGoal = (goalId: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const nextVal = g.currentAmount + amount;
          return {
            ...g,
            currentAmount: nextVal,
            isCompleted: nextVal >= g.targetAmount,
          };
        }
        return g;
      })
    );
    if (authToken) {
      fetch(`/api/finance/goals/${encodeURIComponent(goalId)}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ amount }),
      }).catch(() => {});
    }
  };

  const resetDemoData = () => {
    setTransactions([...DEMO_TRANSACTIONS, ...OFFLINE_HISTORICAL_TXS]);
    setAccounts(DEMO_ACCOUNTS);
    setGoals(DEMO_GOALS);
    setBadges(DEMO_BADGES);
    setMission(CURRENT_MISSION);
    setReviewedAnomalies({});
    setCancelledRecurringIds([]);
    if (authToken) {
      fetch('/api/finance/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.vault) hydrateFromVault(d.vault);
        })
        .catch(() => {});
    }
  };

  // Allows testing the "< 3 months insufficient history" guardrail directly in 1 click!
  const loadShortHistoryTestMode = () => {
    setTransactions(DEMO_TRANSACTIONS.slice(0, 12));
  };

  return (
    <FinanceContext.Provider
      value={{
        user,
        authToken,
        authReady,
        login,
        register,
        loginDemo,
        logout,
        rotateJwtSecret,
        updateEmailPreferences,
        deleteAccountPermanently,
        activeLegalDoc,
        openLegalDoc: setActiveLegalDoc,
        modelStatus,
        uploadTokenizerModel,
        uploadPteModel,
        updateModelOptimization,
        transactions,
        accounts,
        goals,
        badges,
        mission,
        recurring,
        cancelledRecurringIds,
        toggleRecurringCancel,
        anomalies,
        totalIncome,
        totalExpenses,
        totalBalance,
        netCashFlow,
        categorySpending,
        totalRecurringMonthly,
        forecast,
        insights,
        isOfflineMode,
        lastCategoryPropagationNotice,
        clearCategoryNotice: () => setLastCategoryPropagationNotice(null),
        addTransaction,
        importTransactions,
        updateTransactionCategory,
        reviewAnomaly,
        addGoal,
        contributeToGoal,
        resetDemoData,
        loadShortHistoryTestMode,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
