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
  CustomCategoryItem,
  PurchasePriority,
  RefundTrackerItem,
  WarrantyVaultItem,
  PriceCreepAlert,
  SplitSettlementItem,
} from '../types/finance';
import {
  DEFAULT_ALL_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  CUSTOM_CATEGORY_PALETTE,
} from '../constants/categories';
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
import { queryLocalAssistant, AssistantMessage } from '../services/assistantEngine';
import { llamaClient } from '../../../src/ml/llamaClient';
import {
  initGmailAuth,
  signInWithGoogleForGmail,
  getGmailAccessToken,
  disconnectGmailAuth,
} from '../../../src/services/googleGmailAuth';

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
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  rotateJwtSecret: () => Promise<{ ok: boolean; message?: string }>;
  updateEmailPreferences: (optIn: boolean) => Promise<void>;
  deleteAccountPermanently: () => Promise<{
    ok: boolean;
    receipt?: { receiptId: string; deletedAt: string; signatureHex: string };
  }>;
  activeLegalDoc: LegalDocKey | null;
  openLegalDoc: (doc: LegalDocKey | null) => void;

  // Gmail Direct Sync & Online Gemini AI
  gmailConnected: boolean;
  gmailEmail: string | null;
  lastGmailSyncAt: string | null;
  connectGmailAccount: () => Promise<{ ok: boolean; email?: string; error?: string }>;
  disconnectGmail: () => Promise<void>;
  syncFromGmailInbox: (
    filterPreset?: 'all' | 'receipts' | 'refunds',
    previewOnly?: boolean
  ) => Promise<{
    ok: boolean;
    error?: string;
    scannedEmails?: number;
    importedCount?: number;
    duplicatesSkipped?: number;
    newAccountsLinked?: number;
    transactions?: Transaction[];
    discoveredAccounts?: BankAccount[];
    refundsFound?: number;
    warrantiesFound?: number;
    priceAlertsFound?: number;
  }>;
  askOnlineAssistant: (query: string) => Promise<AssistantMessage>;
  parsePurchasePlanOnline: (prompt: string) => Promise<{
    itemName: string;
    purchaseAmount: number;
    priority: PurchasePriority;
    suggestedNewEmi: number;
    suggestedCancelNames: string[];
    dealTimingTip: string;
    hoursOfWorkRequired: number;
  }>;

  // Smart Radar Online Features
  refundItems: RefundTrackerItem[];
  warrantyItems: WarrantyVaultItem[];
  priceCreepAlerts: PriceCreepAlert[];
  splitItems: SplitSettlementItem[];
  toggleRefundStatus: (id: string) => Promise<void>;
  addRefundItem: (merchant: string, title: string, amount: number) => Promise<void>;
  addWarrantyItem: (productName: string, merchant: string, amount: number) => Promise<void>;
  addSplitItem: (
    title: string,
    friendName: string,
    totalBillAmount: number,
    owedToYouAmount: number
  ) => Promise<void>;
  settleSplitItem: (id: string) => Promise<void>;

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
  startingSalary: number;
  pocketMoney: number;
  updateIncomeConfig: (startingSalary: number, pocketMoney: number) => Promise<void>;
  customCategories: CustomCategoryItem[];
  customCategoryColors: Record<string, string>;
  availableCategories: string[];
  availableExpenseCategories: string[];
  addCustomCategory: (name: string, color?: string) => Promise<void>;
  removeCustomCategory: (name: string) => Promise<void>;
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
  const [startingSalary, setStartingSalary] = useState<number>(85000);
  const [pocketMoney, setPocketMoney] = useState<number>(20000);
  const [customCategories, setCustomCategories] = useState<CustomCategoryItem[]>([]);
  const [refundItems, setRefundItems] = useState<RefundTrackerItem[]>([]);
  const [warrantyItems, setWarrantyItems] = useState<WarrantyVaultItem[]>([]);
  const [priceCreepAlerts, setPriceCreepAlerts] = useState<PriceCreepAlert[]>([]);
  const [splitItems, setSplitItems] = useState<SplitSettlementItem[]>([]);
  const [lastGmailSyncAt, setLastGmailSyncAt] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean>(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [lastCategoryPropagationNotice, setLastCategoryPropagationNotice] = useState<string | null>(
    null
  );

  const [modelStatus, setModelStatus] = useState<TokenizerRuntimeStatus>({
    loaded: true,
    fileName: 'gemini-3.8-flash',
    sizeMB: 0,
    vocabSize: 1048576,
    sha256: 'cloud-gemini-api',
    verifiedMatch: true,
    elapsedMs: 12,
    quantizationMode: 'INT4-XNNPACK',
    kvCacheEnabled: true,
    speculativeBatching: true,
  });

  const isOfflineMode = false;

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
    if (typeof vault.startingSalary === 'number') {
      setStartingSalary(vault.startingSalary);
    }
    if (typeof vault.pocketMoney === 'number') {
      setPocketMoney(vault.pocketMoney);
    }
    if (Array.isArray(vault.customCategories)) {
      setCustomCategories(vault.customCategories);
    }
    if (Array.isArray(vault.refundItems)) {
      setRefundItems(vault.refundItems);
    }
    if (Array.isArray(vault.warrantyItems)) {
      setWarrantyItems(vault.warrantyItems);
    }
    if (Array.isArray(vault.priceCreepAlerts)) {
      setPriceCreepAlerts(vault.priceCreepAlerts);
    }
    if (Array.isArray(vault.splitItems)) {
      setSplitItems(vault.splitItems);
    }
    if (typeof vault.lastGmailSyncAt === 'string') {
      setLastGmailSyncAt(vault.lastGmailSyncAt);
    }
  };

  useEffect(() => {
    const unsubscribe = initGmailAuth(
      (gUser) => {
        setGmailConnected(true);
        setGmailEmail(gUser.email || null);
      },
      () => {
        setGmailConnected(false);
        setGmailEmail(null);
      }
    );
    return () => unsubscribe();
  }, []);

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

  const signInWithGoogle = async () => {
    try {
      const { user: gUser, accessToken } = await signInWithGoogleForGmail();
      setGmailConnected(true);
      setGmailEmail(gUser.email || null);

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          email: gUser.email,
          fullName: gUser.displayName || gUser.email?.split('@')[0] || 'User',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Google Sign-In failed.' };
      }
      localStorage.setItem(SESSION_TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setUser(data.user);
      hydrateFromVault(data.vault);
      return { ok: true };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || 'Google Sign-In popup was closed or blocked.',
      };
    }
  };

  const connectGmailAccount = async () => {
    try {
      const { user: gUser } = await signInWithGoogleForGmail();
      setGmailConnected(true);
      setGmailEmail(gUser.email || null);
      return { ok: true, email: gUser.email || undefined };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || 'Unable to connect Gmail account.',
      };
    }
  };

  const disconnectGmail = async () => {
    await disconnectGmailAuth();
    setGmailConnected(false);
    setGmailEmail(null);
  };

  const syncFromGmailInbox = async (
    filterPreset: 'all' | 'receipts' | 'refunds' = 'all',
    previewOnly: boolean = false
  ) => {
    let gToken = getGmailAccessToken();
    if (!gToken) {
      const conn = await connectGmailAccount();
      if (!conn.ok) {
        return { ok: false, error: conn.error || 'Please sign in with Google to read Gmail.' };
      }
      gToken = getGmailAccessToken();
    }
    if (!gToken || !authToken) {
      return { ok: false, error: 'Gmail authorization token unavailable.' };
    }

    try {
      const res = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'X-Gmail-Access-Token': gToken,
        },
        body: JSON.stringify({ filterPreset, previewOnly }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setGmailConnected(false);
        }
        return { ok: false, error: data.error || 'Failed to sync Gmail messages.' };
      }
      if (data.vault) {
        hydrateFromVault(data.vault);
      }
      return {
        ok: true,
        scannedEmails: data.scannedEmails,
        importedCount: data.importedCount,
        duplicatesSkipped: data.duplicatesSkipped,
        newAccountsLinked: data.newAccountsLinked,
        transactions: data.transactions,
        discoveredAccounts: data.discoveredAccounts,
        refundsFound: data.refundsFound ?? data.refundItems?.length ?? 0,
        warrantiesFound: data.warrantiesFound ?? data.warrantyItems?.length ?? 0,
        priceAlertsFound: data.priceAlertsFound ?? data.priceCreepAlerts?.length ?? 0,
      };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Network error syncing Gmail.' };
    }
  };

  const askOnlineAssistant = async (query: string): Promise<AssistantMessage> => {
    if (authToken) {
      try {
        const res = await fetch('/api/assistant/ask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        if (res.ok && data.reply) {
          return data.reply as AssistantMessage;
        }
        if (data?.error) {
          return {
            id: `msg_err_${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: data.error,
          };
        }
      } catch {
        // Fallback to local engine if network temporarily unavailable
      }
    }
    return queryLocalAssistant(query, transactions, totalBalance);
  };

  const parsePurchasePlanOnline = async (prompt: string) => {
    const hourlyRate = Math.max(100, Math.round(totalIncome / 176));
    if (authToken) {
      try {
        const res = await fetch('/api/simulator/parse-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (res.ok && data.itemName) {
          return data;
        }
      } catch {
        // fallback below
      }
    }
    const local = await llamaClient.parsePlanIntent(prompt);
    return {
      itemName: local.itemName,
      purchaseAmount: local.purchaseAmount,
      priority: 'WANT' as PurchasePriority,
      suggestedNewEmi: local.suggestedNewEmi,
      suggestedCancelNames: local.suggestedCancelNames,
      dealTimingTip:
        'Compare upfront card cashback against no-cost EMI processing fees before buying.',
      hoursOfWorkRequired: Math.round((local.purchaseAmount / hourlyRate) * 10) / 10,
    };
  };

  const toggleRefundStatus = async (id: string) => {
    setRefundItems((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === 'PENDING' ? 'CREDITED' : 'PENDING' } : r
      )
    );
    if (!authToken) return;
    try {
      const res = await fetch(`/api/smart-radar/refunds/${encodeURIComponent(id)}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const d = await res.json();
        if (d?.vault) hydrateFromVault(d.vault);
      }
    } catch {
      // optimistic kept
    }
  };

  const addRefundItem = async (merchant: string, title: string, amount: number) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/smart-radar/refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ merchant, title, amount }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d?.vault) hydrateFromVault(d.vault);
      }
    } catch {
      // ignore
    }
  };

  const addWarrantyItem = async (productName: string, merchant: string, amount: number) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/smart-radar/warranties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ productName, merchant, amount }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d?.vault) hydrateFromVault(d.vault);
      }
    } catch {
      // ignore
    }
  };

  const addSplitItem = async (
    title: string,
    friendName: string,
    totalBillAmount: number,
    owedToYouAmount: number
  ) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/smart-radar/splits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ title, friendName, totalBillAmount, owedToYouAmount }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d?.vault) hydrateFromVault(d.vault);
      }
    } catch {
      // ignore
    }
  };

  const settleSplitItem = async (id: string) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/smart-radar/splits/${encodeURIComponent(id)}/settle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const d = await res.json();
        if (d?.vault) hydrateFromVault(d.vault);
      }
    } catch {
      // ignore
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    } catch {
      // ignore
    }
    disconnectGmailAuth().catch(() => {});
    setGmailConnected(false);
    setGmailEmail(null);
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

  const updateIncomeConfig = async (nextSalary: number, nextPocketMoney: number) => {
    const cleanSalary = Math.max(0, Number.isFinite(nextSalary) ? nextSalary : 0);
    const cleanPocket = Math.max(0, Number.isFinite(nextPocketMoney) ? nextPocketMoney : 0);
    setStartingSalary(cleanSalary);
    setPocketMoney(cleanPocket);

    if (authToken) {
      try {
        const res = await fetch('/api/finance/income-config', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ startingSalary: cleanSalary, pocketMoney: cleanPocket }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.vault) hydrateFromVault(data.vault);
        }
      } catch {
        // local state already updated
      }
    }
  };

  const addCustomCategory = async (name: string, color?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const assignedColor =
      color ||
      CUSTOM_CATEGORY_PALETTE[customCategories.length % CUSTOM_CATEGORY_PALETTE.length];

    setCustomCategories((prev) => {
      const exists = prev.findIndex((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      if (exists >= 0) {
        const copy = [...prev];
        copy[exists] = { name: trimmed, color: assignedColor };
        return copy;
      }
      return [...prev, { name: trimmed, color: assignedColor }];
    });

    if (authToken) {
      try {
        const res = await fetch('/api/finance/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ name: trimmed, color: assignedColor }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.vault) hydrateFromVault(data.vault);
        }
      } catch {
        // local state preserved
      }
    }
  };

  const removeCustomCategory = async (name: string) => {
    const target = name.trim().toLowerCase();
    setCustomCategories((prev) => prev.filter((c) => c.name.toLowerCase() !== target));

    if (authToken) {
      try {
        const res = await fetch(`/api/finance/categories/${encodeURIComponent(name.trim())}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.vault) hydrateFromVault(data.vault);
        }
      } catch {
        // local state preserved
      }
    }
  };

  const customCategoryColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of customCategories) {
      map[c.name] = c.color;
    }
    return map;
  }, [customCategories]);

  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    const pushUnique = (cat: string) => {
      const clean = cat.trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(clean);
      }
    };
    DEFAULT_ALL_CATEGORIES.forEach(pushUnique);
    customCategories.forEach((c) => pushUnique(c.name));
    transactions.forEach((t) => pushUnique(t.category));
    return list;
  }, [customCategories, transactions]);

  const availableExpenseCategories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    const pushUnique = (cat: string) => {
      const clean = cat.trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(clean);
      }
    };
    DEFAULT_EXPENSE_CATEGORIES.forEach(pushUnique);
    customCategories.forEach((c) => pushUnique(c.name));
    transactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => pushUnique(t.category));
    return list;
  }, [customCategories, transactions]);

  // Real-time calculations: Total Income = Starting Salary + Pocket Money; Total Balance = Total Income - Expenses
  const totalIncome = useMemo(
    () => Math.max(0, startingSalary + pocketMoney),
    [startingSalary, pocketMoney]
  );
  const totalExpenses = useMemo(() => calculateTotalExpenses(transactions), [transactions]);
  const totalBalance = useMemo(
    () => totalIncome - totalExpenses,
    [totalIncome, totalExpenses]
  );
  const netCashFlow = useMemo(
    () => totalIncome - totalExpenses,
    [totalIncome, totalExpenses]
  );

  const categorySpending = useMemo(
    () => calculateCategorySpending(transactions, customCategoryColors),
    [transactions, customCategoryColors]
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

  const insights: FinancialInsight[] = useMemo(() => {
    const topCat = categorySpending[0];
    const list: FinancialInsight[] = [];
    if (topCat) {
      list.push({
        id: 'ins_01',
        type: 'WARNING',
        title: `${topCat.category} Leads Monthly Spending`,
        description: `₹${topCat.amount.toLocaleString('en-IN')} (${topCat.percentage}%) across ${topCat.transactionCount} transactions.`,
        category: topCat.category,
        impactAmount: topCat.amount,
        dataPointsUsed: [`${topCat.transactionCount} ${topCat.category} transactions`],
        actionLabel: 'Explore Categories',
      });
    }
    list.push({
      id: 'ins_02',
      type: 'INFO',
      title: 'Upcoming Recurring Obligations',
      description: `₹${totalRecurringMonthly.toLocaleString('en-IN')} committed in monthly bills and subscriptions.`,
      category: 'Bills',
      impactAmount: totalRecurringMonthly,
      dataPointsUsed: ['Active recurring schedules'],
      actionLabel: 'View Commitments',
    });
    return list;
  }, [categorySpending, totalRecurringMonthly]);

  const addTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const optimistic: Transaction = {
      ...newTx,
      id: `tx_user_${Date.now()}`,
    };
    setTransactions((prev) => [optimistic, ...prev]);
    if (optimistic.type === 'INCOME') {
      if (optimistic.category === 'Salary') {
        setStartingSalary((prev) => prev + optimistic.amount);
      } else {
        setPocketMoney((prev) => prev + optimistic.amount);
      }
    }
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
    let addedSalary = 0;
    let addedPocket = 0;
    for (const tx of unique) {
      if (tx.type === 'TRANSFER') continue;
      if (tx.type === 'INCOME') {
        if (tx.category === 'Salary') addedSalary += tx.amount;
        else addedPocket += tx.amount;
      }
      const d = tx.type === 'INCOME' ? tx.amount : -tx.amount;
      deltaByAcc.set(tx.accountId, (deltaByAcc.get(tx.accountId) || 0) + d);
    }
    if (addedSalary > 0) setStartingSalary((prev) => prev + addedSalary);
    if (addedPocket > 0) setPocketMoney((prev) => prev + addedPocket);

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
    setStartingSalary(85000);
    setPocketMoney(20000);
    setCustomCategories([]);
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
        signInWithGoogle,
        logout,
        rotateJwtSecret,
        updateEmailPreferences,
        deleteAccountPermanently,
        activeLegalDoc,
        openLegalDoc: setActiveLegalDoc,
        gmailConnected,
        gmailEmail,
        lastGmailSyncAt,
        connectGmailAccount,
        disconnectGmail,
        syncFromGmailInbox,
        askOnlineAssistant,
        parsePurchasePlanOnline,
        refundItems,
        warrantyItems,
        priceCreepAlerts,
        splitItems,
        toggleRefundStatus,
        addRefundItem,
        addWarrantyItem,
        addSplitItem,
        settleSplitItem,
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
        startingSalary,
        pocketMoney,
        updateIncomeConfig,
        customCategories,
        customCategoryColors,
        availableCategories,
        availableExpenseCategories,
        addCustomCategory,
        removeCustomCategory,
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
