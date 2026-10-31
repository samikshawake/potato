import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  Transaction,
  BankAccount,
  SavingsGoal,
  TransactionCategory,
} from '../../FRONTEND/src/types/finance.ts';
import { DEMO_TRANSACTIONS } from '../../FRONTEND/src/data/demoTransactions.ts';
import { DEMO_ACCOUNTS } from '../../FRONTEND/src/data/demoAccounts.ts';
import {
  DEMO_GOALS,
  DEMO_BADGES,
  CURRENT_MISSION,
  type BadgeItem,
  type SavingsMission,
} from '../../FRONTEND/src/data/demoGoals.ts';

export interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  passwordHashHex: string;
  saltHex: string;
  iterations: number;
  ageConfirmed18Plus: boolean;
  emailDigestOptIn: boolean;
  createdAt: string;
}

export interface UserFinancialVault {
  userId: string;
  transactions: Transaction[];
  accounts: BankAccount[];
  goals: SavingsGoal[];
  badges: BadgeItem[];
  mission: SavingsMission;
  reviewedAnomalies: Record<string, 'CONFIRMED' | 'DISMISSED'>;
  cancelledRecurringIds: string[];
  updatedAt: string;
}

export interface DatabaseSchema {
  jwtSecretHex: string;
  users: StoredUser[];
  vaults: Record<string, UserFinancialVault>;
  erasureReceipts: {
    receiptId: string;
    deletedAt: string;
    signatureHex: string;
  }[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cashcompass_vault.json');
const PBKDF2_ITERATIONS = 210_000;

// Historical multi-month baseline transactions (July, August, September 2026) so
// CashCompass has 4 full months of statement history across HDFC + SBI accounts out-of-the-box,
// plus a 2025 one-off annual bonus to demonstrate irregular income exclusion!
export const HISTORICAL_MULTI_MONTH_TRANSACTIONS: Transaction[] = [
  // September 2026
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
    id: 'tx_sep_bill_01',
    title: 'Electricity Bill (BESCOM)',
    amount: 1210,
    type: 'EXPENSE',
    category: 'Bills',
    date: '2026-09-08',
    time: '11:00 AM',
    paymentMethod: 'UPI',
    accountId: 'acc_hdfc_01',
    isRecurring: true,
    merchant: 'BESCOM Karnataka',
  },
  {
    id: 'tx_sep_bill_02',
    title: 'Airtel Fiber Broadband',
    amount: 1061,
    type: 'EXPENSE',
    category: 'Bills',
    date: '2026-09-09',
    time: '10:30 AM',
    paymentMethod: 'AUTO_DEBIT',
    accountId: 'acc_hdfc_01',
    isRecurring: true,
    merchant: 'Bharti Airtel Ltd',
  },
  {
    id: 'tx_sep_emi_01',
    title: 'Consumer Device EMI (Bajaj)',
    amount: 1500,
    type: 'EXPENSE',
    category: 'Bills',
    date: '2026-09-22',
    time: '07:00 AM',
    paymentMethod: 'AUTO_DEBIT',
    accountId: 'acc_hdfc_01',
    isRecurring: true,
    merchant: 'Bajaj Finserv Ltd',
  },
  {
    id: 'tx_sep_ent_01',
    title: 'Netflix Premium 4K',
    amount: 499,
    type: 'EXPENSE',
    category: 'Entertainment',
    date: '2026-09-10',
    time: '03:45 AM',
    paymentMethod: 'AUTO_DEBIT',
    accountId: 'acc_hdfc_01',
    isRecurring: true,
    merchant: 'Netflix Entertainment Services',
  },
  {
    id: 'tx_sep_trv_01',
    title: 'Uber & Fuel Monthly Commute',
    amount: 5800,
    type: 'EXPENSE',
    category: 'Travel',
    date: '2026-09-19',
    time: '09:00 AM',
    paymentMethod: 'CARD',
    accountId: 'acc_sbi_02',
    merchant: 'Uber India',
  },

  // August 2026
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
    id: 'tx_aug_bill_01',
    title: 'Airtel Fiber Broadband',
    amount: 1061,
    type: 'EXPENSE',
    category: 'Bills',
    date: '2026-08-09',
    time: '10:30 AM',
    paymentMethod: 'AUTO_DEBIT',
    accountId: 'acc_hdfc_01',
    isRecurring: true,
    merchant: 'Bharti Airtel Ltd',
  },
  {
    id: 'tx_aug_emi_01',
    title: 'Consumer Device EMI (Bajaj)',
    amount: 1500,
    type: 'EXPENSE',
    category: 'Bills',
    date: '2026-08-22',
    time: '07:00 AM',
    paymentMethod: 'AUTO_DEBIT',
    accountId: 'acc_hdfc_01',
    isRecurring: true,
    merchant: 'Bajaj Finserv Ltd',
  },
  {
    id: 'tx_aug_ent_01',
    title: 'Netflix Premium 4K',
    amount: 499,
    type: 'EXPENSE',
    category: 'Entertainment',
    date: '2026-08-10',
    time: '03:45 AM',
    paymentMethod: 'AUTO_DEBIT',
    accountId: 'acc_hdfc_01',
    isRecurring: true,
    merchant: 'Netflix Entertainment Services',
  },
  {
    id: 'tx_aug_shop_01',
    title: 'Apparel & Home Essentials',
    amount: 7900,
    type: 'EXPENSE',
    category: 'Shopping',
    date: '2026-08-24',
    time: '06:20 PM',
    paymentMethod: 'CARD',
    accountId: 'acc_sbi_02',
    merchant: 'Myntra Designs',
  },

  // July 2026
  {
    id: 'tx_jul_sal_01',
    title: 'Salary Credit - TechCorp India',
    amount: 50000,
    type: 'INCOME',
    category: 'Salary',
    date: '2026-07-01',
    time: '09:30 AM',
    paymentMethod: 'NEFT',
    accountId: 'acc_hdfc_01',
    merchant: 'TechCorp India Pvt Ltd',
  },
  {
    id: 'tx_jul_con_02',
    title: 'Consulting Project Milestone',
    amount: 45000,
    type: 'INCOME',
    category: 'Salary',
    date: '2026-07-17',
    time: '01:45 PM',
    paymentMethod: 'IMPS',
    accountId: 'acc_sbi_02',
    merchant: 'Acme Digital Labs',
  },
  {
    id: 'tx_jul_rent_01',
    title: 'Apartment Rent (Indiranagar)',
    amount: 12000,
    type: 'EXPENSE',
    category: 'Rent',
    date: '2026-07-02',
    time: '10:00 AM',
    paymentMethod: 'UPI',
    accountId: 'acc_hdfc_01',
    isRecurring: true,
    merchant: 'Suresh Kumar (Landlord)',
  },
  {
    id: 'tx_jul_food_01',
    title: 'Monthly Groceries & Food',
    amount: 14400,
    type: 'EXPENSE',
    category: 'Food',
    date: '2026-07-15',
    time: '07:45 PM',
    paymentMethod: 'UPI',
    accountId: 'acc_hdfc_01',
    merchant: 'Nature Basket',
  },
  {
    id: 'tx_jul_emi_01',
    title: 'Consumer Device EMI (Bajaj)',
    amount: 1500,
    type: 'EXPENSE',
    category: 'Bills',
    date: '2026-07-22',
    time: '07:00 AM',
    paymentMethod: 'AUTO_DEBIT',
    accountId: 'acc_hdfc_01',
    isRecurring: true,
    merchant: 'Bajaj Finserv Ltd',
  },

  // Historical One-Off Annual Bonus (Last Year - Nov 2025) for Irregular Income Guardrail
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

export function hashPasswordSync(password: string, saltHex?: string, iterations = PBKDF2_ITERATIONS) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return {
    saltHex: salt.toString('hex'),
    hashHex: derived.toString('hex'),
    iterations,
  };
}

export function verifyPasswordTimingSafe(password: string, user: StoredUser): boolean {
  const attempt = hashPasswordSync(password, user.saltHex, user.iterations);
  const expectedBuf = Buffer.from(user.passwordHashHex, 'hex');
  const actualBuf = Buffer.from(attempt.hashHex, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecodeToBuffer(str: string): Buffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  return Buffer.from(padded, 'base64');
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
  jti: string;
}

export function signJwtHs256(
  user: { id: string; email: string; fullName: string },
  secretHex: string,
  ttlSeconds = 60 * 60 * 12
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payloadObj: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.fullName,
    iat: now,
    exp: now + ttlSeconds,
    jti: crypto.randomBytes(12).toString('hex'),
  };
  const payload = base64UrlEncode(JSON.stringify(payloadObj));
  const data = `${header}.${payload}`;
  const sig = crypto.createHmac('sha256', Buffer.from(secretHex, 'hex')).update(data).digest();
  return `${data}.${base64UrlEncode(sig)}`;
}

export function verifyJwtHs256(token: string, secretHex: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const data = `${h}.${p}`;
    const expectedSig = crypto
      .createHmac('sha256', Buffer.from(secretHex, 'hex'))
      .update(data)
      .digest();
    const actualSig = base64UrlDecodeToBuffer(s);
    if (expectedSig.length !== actualSig.length) return false as any;
    if (!crypto.timingSafeEqual(expectedSig, actualSig)) return null;

    const decoded = JSON.parse(base64UrlDecodeToBuffer(p).toString('utf8')) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!decoded.exp || decoded.exp < now) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function createDefaultVault(userId: string): UserFinancialVault {
  // Combine October DEMO_TRANSACTIONS with July-Sept + 2025 Bonus so 4 months of multi-account data exist
  const combinedTransactions: Transaction[] = [
    ...DEMO_TRANSACTIONS.map((t) => ({ ...t })),
    ...HISTORICAL_MULTI_MONTH_TRANSACTIONS.map((t) => ({ ...t })),
  ];

  return {
    userId,
    transactions: combinedTransactions,
    accounts: DEMO_ACCOUNTS.map((a) => ({ ...a })),
    goals: DEMO_GOALS.map((g) => ({ ...g })),
    badges: DEMO_BADGES.map((b) => ({ ...b })),
    mission: { ...CURRENT_MISSION },
    reviewedAnomalies: {},
    cancelledRecurringIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function createInitialDb(): DatabaseSchema {
  const envSecret =
    process.env.JWT_SECRET &&
    process.env.JWT_SECRET !== 'REPLACE_WITH_64_CHAR_CRYPTOGRAPHIC_HEX_SECRET' &&
    /^[0-9a-fA-F]{64,}$/.test(process.env.JWT_SECRET)
      ? process.env.JWT_SECRET
      : crypto.randomBytes(32).toString('hex');

  const demoUserId = 'usr_parth_demo';
  const demoCreds = hashPasswordSync('CashCompass@2026');
  const demoUser: StoredUser = {
    id: demoUserId,
    fullName: 'Parth',
    email: 'parth@cashcompass.local',
    passwordHashHex: demoCreds.hashHex,
    saltHex: demoCreds.saltHex,
    iterations: demoCreds.iterations,
    ageConfirmed18Plus: true,
    emailDigestOptIn: false,
    createdAt: '2026-10-01T09:00:00.000Z',
  };

  return {
    jwtSecretHex: envSecret,
    users: [demoUser],
    vaults: {
      [demoUserId]: createDefaultVault(demoUserId),
    },
    erasureReceipts: [],
  };
}

let cachedDb: DatabaseSchema | null = null;

export function loadDatabase(): DatabaseSchema {
  if (cachedDb) return cachedDb;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (parsed && Array.isArray(parsed.users) && parsed.vaults) {
        cachedDb = parsed;
        return cachedDb;
      }
    }
  } catch {
    // Re-initialize cleanly if corrupted
  }
  cachedDb = createInitialDb();
  saveDatabase(cachedDb);
  return cachedDb;
}

export function saveDatabase(db: DatabaseSchema): void {
  cachedDb = db;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), { mode: 0o600 });
    fs.renameSync(tmpFile, DB_FILE);
  } catch {
    // Keep in-memory state if filesystem is read-only
  }
}

export function normalizeTxFingerprint(
  tx: Pick<Transaction, 'date' | 'amount' | 'type' | 'title' | 'merchant' | 'upiTransactionId'>
): string {
  if (tx.upiTransactionId && tx.upiTransactionId.trim().length >= 6) {
    return `upi:${tx.upiTransactionId.trim().toLowerCase()}`;
  }
  const normTitle = (tx.merchant || tx.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24);
  return `${tx.date}|${tx.type}|${Math.round(tx.amount * 100)}|${normTitle}`;
}

export function propagateMerchantCategory(
  transactions: Transaction[],
  targetTxId: string,
  newCategory: TransactionCategory
): {
  updatedTransactions: Transaction[];
  changedIds: string[];
  matchedMerchant: string;
} {
  const target = transactions.find((t) => t.id === targetTxId);
  if (!target) {
    return { updatedTransactions: transactions, changedIds: [], matchedMerchant: '' };
  }

  const merchantKey = (target.merchant || target.title)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  // Match either exact merchant or first significant brand keyword (>= 4 chars)
  const primaryToken = merchantKey.split(/\s+/).find((w) => w.length >= 4 && !['upi', 'pos', 'ach', 'neft', 'imps'].includes(w)) || merchantKey;

  const changedIds: string[] = [];
  const updatedTransactions = transactions.map((tx) => {
    const candidate = `${tx.merchant || ''} ${tx.title}`.toLowerCase();
    const isSame =
      tx.id === targetTxId ||
      (merchantKey.length >= 3 && candidate.includes(merchantKey)) ||
      (primaryToken.length >= 4 && candidate.includes(primaryToken));

    if (isSame && tx.category !== newCategory) {
      changedIds.push(tx.id);
      return { ...tx, category: newCategory, isReviewed: true };
    }
    if (tx.id === targetTxId) {
      changedIds.push(tx.id);
      return { ...tx, category: newCategory, isReviewed: true };
    }
    return tx;
  });

  return {
    updatedTransactions,
    changedIds: Array.from(new Set(changedIds)),
    matchedMerchant: target.merchant || target.title,
  };
}

export function deleteAccountPermanently(userId: string): {
  receiptId: string;
  deletedAt: string;
  signatureHex: string;
} {
  const db = loadDatabase();
  db.users = db.users.filter((u) => u.id !== userId);
  delete db.vaults[userId];

  const deletedAt = new Date().toISOString();
  const receiptId = `erase_${crypto.randomBytes(8).toString('hex')}`;
  const signatureHex = crypto
    .createHmac('sha256', Buffer.from(db.jwtSecretHex, 'hex'))
    .update(`${receiptId}:${deletedAt}:ERASED`)
    .digest('hex');

  const receipt = { receiptId, deletedAt, signatureHex };
  db.erasureReceipts.push(receipt);
  saveDatabase(db);
  return receipt;
}
