import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  loadDatabase,
  saveDatabase,
  hashPasswordSync,
  verifyPasswordTimingSafe,
  signJwtHs256,
  verifyJwtHs256,
  createDefaultVault,
  normalizeTxFingerprint,
  propagateMerchantCategory,
  deleteAccountPermanently,
  type JwtPayload,
} from './src/backend/store.ts';
import type {
  Transaction,
  TransactionCategory,
  SavingsGoal,
  BankAccount,
} from './FRONTEND/src/types/finance.ts';
import { simulatePurchaseScenarios } from './FRONTEND/src/services/simulator.ts';
import { queryLocalAssistant } from './FRONTEND/src/services/assistantEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep sensitive tokens/emails/passwords out of logs (Additional Security Measure #5)
function redactLogPath(urlPath: string): string {
  return urlPath
    .replace(/token=[^&]+/gi, 'token=[REDACTED]')
    .replace(/jwt=[^&]+/gi, 'jwt=[REDACTED]')
    .replace(/email=[^&]+/gi, 'email=[REDACTED]')
    .replace(/password=[^&]+/gi, 'password=[REDACTED]');
}

function isPrivateIp(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = m.slice(1).map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

interface AuthenticatedRequest extends Request {
  auth?: JwtPayload;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer authentication token.' });
    return;
  }
  const token = header.slice(7).trim();
  const db = loadDatabase();
  const payload = verifyJwtHs256(token, db.jwtSecretHex);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired JWT session. Please sign in again.' });
    return;
  }
  const userExists = db.users.some((u) => u.id === payload.sub);
  if (!userExists) {
    res.status(401).json({ error: 'Account no longer exists.' });
    return;
  }
  req.auth = payload;
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure initial DB & Demo Account exist on boot
  loadDatabase();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  // Security & Permissions-Policy Headers (Constraint #6: Phone/Device Permissions)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), contacts=(), payment=(), usb=(), bluetooth=()'
    );
    if (req.path.startsWith('/api/')) {
      console.info(`[SAFE-AUDIT] ${req.method} ${redactLogPath(req.originalUrl)}`);
    }
    next();
  });

  // Health & Security Status Endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    const db = loadDatabase();
    res.json({
      status: 'ok',
      app: 'CashCompass Full-Stack Engine',
      jwtKeyBits: db.jwtSecretHex.length * 4,
      pbkdf2Iterations: 210000,
      registeredAccounts: db.users.length,
    });
  });

  // ============================================================================
  // AUTHENTICATION ROUTES (Login, Create Account, Demo Login, JWT Rotation, Erasure)
  // ============================================================================

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const ageConfirmed18Plus = Boolean(req.body?.ageConfirmed18Plus);
    const emailDigestOptIn = Boolean(req.body?.emailDigestOptIn);
    const startFresh = Boolean(req.body?.startFresh);

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Please enter your name (at least 2 characters).' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!ageConfirmed18Plus) {
      res.status(400).json({
        error: 'Age verification (18+) is required before creating a financial account.',
      });
      return;
    }
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      res.status(400).json({
        error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number.',
      });
      return;
    }

    const db = loadDatabase();
    if (db.users.some((u) => u.email === email)) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    const hashed = hashPasswordSync(password);
    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const newUser = {
      id: userId,
      fullName,
      email,
      passwordHashHex: hashed.hashHex,
      saltHex: hashed.saltHex,
      iterations: hashed.iterations,
      ageConfirmed18Plus,
      emailDigestOptIn,
      createdAt: new Date().toISOString(),
    };

    const vault = createDefaultVault(userId);
    if (startFresh) {
      vault.transactions = [];
      vault.accounts = [
        {
          id: 'acc_hdfc_01',
          name: 'Primary Savings',
          bankName: 'HDFC Bank',
          accountNumberMasked: '•••• 4312',
          balance: 0,
          type: 'SAVINGS',
          cardBrand: 'VISA',
          color: '#7654E8',
        },
        {
          id: 'acc_sbi_02',
          name: 'Secondary Savings',
          bankName: 'SBI Bank',
          accountNumberMasked: '•••• 8821',
          balance: 0,
          type: 'SAVINGS',
          cardBrand: 'RUPAY',
          color: '#37B879',
        },
      ];
    }

    db.users.push(newUser);
    db.vaults[userId] = vault;
    saveDatabase(db);

    const token = signJwtHs256(newUser, db.jwtSecretHex);
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        emailDigestOptIn: newUser.emailDigestOptIn,
        createdAt: newUser.createdAt,
      },
      vault,
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const db = loadDatabase();
    const user = db.users.find((u) => u.email === email);
    if (!user || !verifyPasswordTimingSafe(password, user)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!db.vaults[user.id]) {
      db.vaults[user.id] = createDefaultVault(user.id);
      saveDatabase(db);
    }

    const token = signJwtHs256(user, db.jwtSecretHex);
    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        emailDigestOptIn: user.emailDigestOptIn,
        createdAt: user.createdAt,
      },
      vault: db.vaults[user.id],
    });
  });

  app.post('/api/auth/demo', (_req: Request, res: Response) => {
    const db = loadDatabase();
    let demoUser = db.users.find((u) => u.email === 'parth@cashcompass.local');
    if (!demoUser) {
      const creds = hashPasswordSync('CashCompass@2026');
      demoUser = {
        id: 'usr_parth_demo',
        fullName: 'Parth',
        email: 'parth@cashcompass.local',
        passwordHashHex: creds.hashHex,
        saltHex: creds.saltHex,
        iterations: creds.iterations,
        ageConfirmed18Plus: true,
        emailDigestOptIn: false,
        createdAt: new Date().toISOString(),
      };
      db.users.push(demoUser);
    }
    if (!db.vaults[demoUser.id]) {
      db.vaults[demoUser.id] = createDefaultVault(demoUser.id);
    }
    saveDatabase(db);

    const token = signJwtHs256(demoUser, db.jwtSecretHex);
    res.json({
      token,
      user: {
        id: demoUser.id,
        fullName: demoUser.fullName,
        email: demoUser.email,
        emailDigestOptIn: demoUser.emailDigestOptIn,
        createdAt: demoUser.createdAt,
      },
      vault: db.vaults[demoUser.id],
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    const user = db.users.find((u) => u.id === req.auth!.sub);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (!db.vaults[user.id]) {
      db.vaults[user.id] = createDefaultVault(user.id);
      saveDatabase(db);
    }
    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        emailDigestOptIn: user.emailDigestOptIn,
        createdAt: user.createdAt,
      },
      vault: db.vaults[user.id],
    });
  });

  app.post('/api/auth/rotate-secret', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    db.jwtSecretHex = crypto.randomBytes(32).toString('hex');
    saveDatabase(db);
    const user = db.users.find((u) => u.id === req.auth!.sub)!;
    const freshToken = signJwtHs256(user, db.jwtSecretHex);
    res.json({
      message: 'Rotated 256-bit HS256 JWT signing secret and re-issued active session token.',
      token: freshToken,
      jwtKeyBits: db.jwtSecretHex.length * 4,
    });
  });

  app.post('/api/auth/email-preferences', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    const user = db.users.find((u) => u.id === req.auth!.sub);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    user.emailDigestOptIn = Boolean(req.body?.emailDigestOptIn);
    saveDatabase(db);
    res.json({
      emailDigestOptIn: user.emailDigestOptIn,
      unsubscribeUrl: `/api/unsubscribe?uid=${encodeURIComponent(user.id)}`,
    });
  });

  app.delete('/api/auth/account', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const receipt = deleteAccountPermanently(req.auth!.sub);
    res.json({
      deleted: true,
      receipt,
    });
  });

  // ============================================================================
  // FINANCIAL DATA & ENGINE ROUTES (Per-User Persistent Vault)
  // ============================================================================

  app.get('/api/finance/state', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    const userId = req.auth!.sub;
    if (!db.vaults[userId]) {
      db.vaults[userId] = createDefaultVault(userId);
      saveDatabase(db);
    }
    res.json({ vault: db.vaults[userId] });
  });

  app.post('/api/finance/transactions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    const vault = db.vaults[req.auth!.sub] || createDefaultVault(req.auth!.sub);
    const body = req.body as Partial<Transaction>;

    if (!body.title || typeof body.amount !== 'number' || body.amount <= 0) {
      res.status(400).json({ error: 'Valid transaction title and positive amount are required.' });
      return;
    }

    const created: Transaction = {
      id: `tx_srv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      title: String(body.title).trim(),
      amount: Number(body.amount),
      type: body.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
      category: (body.category as TransactionCategory) || 'Other',
      date: body.date || new Date().toISOString().split('T')[0],
      time: body.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paymentMethod: body.paymentMethod || 'UPI',
      accountId: body.accountId || vault.accounts[0]?.id || 'acc_hdfc_01',
      merchant: body.merchant || String(body.title).trim(),
      notes: body.notes,
      isRecurring: Boolean(body.isRecurring),
    };

    vault.transactions = [created, ...vault.transactions];
    vault.accounts = vault.accounts.map((acc) => {
      if (acc.id === created.accountId) {
        const delta = created.type === 'INCOME' ? created.amount : -created.amount;
        return { ...acc, balance: Math.max(0, acc.balance + delta) };
      }
      return acc;
    });
    vault.updatedAt = new Date().toISOString();
    db.vaults[req.auth!.sub] = vault;
    saveDatabase(db);

    res.status(201).json({ transaction: created, vault });
  });

  // Statement Import with Cross-Account Deduplication & UPI Bank Auto-Discovery (Requirement #1)
  app.post('/api/finance/import', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    const vault = db.vaults[req.auth!.sub] || createDefaultVault(req.auth!.sub);
    const incoming: Transaction[] = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
    const discoveredAccounts: BankAccount[] = Array.isArray(req.body?.discoveredAccounts)
      ? req.body.discoveredAccounts
      : [];
    const replaceAll = Boolean(req.body?.replaceAll);
    const targetAccountId: string = req.body?.accountId || vault.accounts[0]?.id || 'acc_hdfc_01';

    // Auto-link any newly discovered bank accounts from UPI statement ("Paid by India Post Payment Bank 0262", etc.)
    const accountIdRemap = new Map<string, string>();
    let newAccountsLinked = 0;

    for (const disc of discoveredAccounts) {
      if (!disc || !disc.id || !disc.bankName) continue;
      const last4 = disc.accountNumberMasked?.slice(-4) || '';
      const existing = vault.accounts.find(
        (a) =>
          a.id === disc.id ||
          (last4.length === 4 && a.accountNumberMasked.endsWith(last4))
      );
      if (existing) {
        accountIdRemap.set(disc.id, existing.id);
      } else {
        vault.accounts.push({
          id: disc.id,
          name: disc.name || `${disc.bankName} UPI`,
          bankName: disc.bankName,
          accountNumberMasked: disc.accountNumberMasked || `•••• ${last4}`,
          balance: Math.max(0, Number(disc.balance) || 0),
          type: disc.type || 'SAVINGS',
          cardBrand: disc.cardBrand || 'RUPAY',
          color: disc.color || '#7654E8',
        });
        accountIdRemap.set(disc.id, disc.id);
        newAccountsLinked++;
      }
    }

    if (replaceAll) {
      vault.transactions = incoming;
    } else {
      const seen = new Set(vault.transactions.map((t) => normalizeTxFingerprint(t)));
      const uniqueAdded: Transaction[] = [];
      let duplicatesSkipped = 0;

      for (const rawTx of incoming) {
        if (!rawTx || typeof rawTx.amount !== 'number' || rawTx.amount <= 0) continue;
        const fp = normalizeTxFingerprint(rawTx);
        if (seen.has(fp)) {
          duplicatesSkipped++;
          continue;
        }
        seen.add(fp);
        const mappedAcctId =
          (rawTx.accountId && accountIdRemap.get(rawTx.accountId)) ||
          rawTx.accountId ||
          targetAccountId;

        uniqueAdded.push({
          ...rawTx,
          id: rawTx.id || `tx_imp_${Date.now()}_${uniqueAdded.length}`,
          accountId: mappedAcctId,
        });
      }

      vault.transactions = [...uniqueAdded, ...vault.transactions].sort((a, b) =>
        b.date.localeCompare(a.date)
      );

      // Update per-account balances (INCOME adds, EXPENSE subtracts, Self TRANSFER is neutral across combined wealth)
      const deltaByAcc = new Map<string, number>();
      for (const tx of uniqueAdded) {
        if (tx.type === 'TRANSFER') continue;
        const delta = tx.type === 'INCOME' ? tx.amount : -tx.amount;
        deltaByAcc.set(tx.accountId, (deltaByAcc.get(tx.accountId) || 0) + delta);
      }

      vault.accounts = vault.accounts.map((acc) => {
        const d = deltaByAcc.get(acc.id);
        if (!d) return acc;
        return { ...acc, balance: Math.max(0, acc.balance + d) };
      });

      vault.updatedAt = new Date().toISOString();
      db.vaults[req.auth!.sub] = vault;
      saveDatabase(db);

      res.json({
        importedCount: uniqueAdded.length,
        duplicatesSkipped,
        newAccountsLinked,
        vault,
      });
      return;
    }

    vault.updatedAt = new Date().toISOString();
    db.vaults[req.auth!.sub] = vault;
    saveDatabase(db);
    res.json({ importedCount: incoming.length, duplicatesSkipped: 0, newAccountsLinked, vault });
  });

  // Category Correction with Merchant-Wide Propagation (Requirement #2)
  app.patch(
    '/api/finance/transactions/:id/category',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const vault = db.vaults[req.auth!.sub];
      if (!vault) {
        res.status(404).json({ error: 'Vault not found.' });
        return;
      }
      const txId = String(req.params.id);
      const newCategory = req.body?.category as TransactionCategory;
      if (!newCategory) {
        res.status(400).json({ error: 'Target category is required.' });
        return;
      }

      const result = propagateMerchantCategory(vault.transactions, txId, newCategory);
      vault.transactions = result.updatedTransactions;
      vault.updatedAt = new Date().toISOString();
      saveDatabase(db);

      res.json({
        changedIds: result.changedIds,
        matchedMerchant: result.matchedMerchant,
        vault,
      });
    }
  );

  // Anomaly Confirmation / Dismissal Override (Requirement #4 & Extra Point #3)
  app.patch(
    '/api/finance/anomalies/:id',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const vault = db.vaults[req.auth!.sub];
      if (!vault) {
        res.status(404).json({ error: 'Vault not found.' });
        return;
      }
      const anomalyId = String(req.params.id);
      const status = req.body?.status === 'CONFIRMED' ? 'CONFIRMED' : 'DISMISSED';
      vault.reviewedAnomalies[anomalyId] = status;
      vault.updatedAt = new Date().toISOString();
      saveDatabase(db);

      res.json({ anomalyId, status, vault });
    }
  );

  // Toggle What-If Subscription Cancellation
  app.post(
    '/api/finance/recurring/toggle',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const vault = db.vaults[req.auth!.sub];
      if (!vault) {
        res.status(404).json({ error: 'Vault not found.' });
        return;
      }
      const recId = String(req.body?.recurringId || '');
      if (vault.cancelledRecurringIds.includes(recId)) {
        vault.cancelledRecurringIds = vault.cancelledRecurringIds.filter((id) => id !== recId);
      } else if (recId) {
        vault.cancelledRecurringIds = [...vault.cancelledRecurringIds, recId];
      }
      vault.updatedAt = new Date().toISOString();
      saveDatabase(db);
      res.json({ cancelledRecurringIds: vault.cancelledRecurringIds, vault });
    }
  );

  // Goals CRUD
  app.post('/api/finance/goals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    const vault = db.vaults[req.auth!.sub];
    if (!vault) {
      res.status(404).json({ error: 'Vault not found.' });
      return;
    }
    const body = req.body as Partial<SavingsGoal>;
    const created: SavingsGoal = {
      id: `goal_${Date.now()}`,
      title: String(body.title || 'New Goal').trim(),
      targetAmount: Math.max(100, Number(body.targetAmount) || 10000),
      currentAmount: Math.max(0, Number(body.currentAmount) || 0),
      deadlineDate: body.deadlineDate || '2027-01-31',
      category: body.category || 'Personal Goal',
      icon: body.icon || 'laptop',
      isCompleted: (Number(body.currentAmount) || 0) >= (Number(body.targetAmount) || 10000),
      monthlyContribution: Number(body.monthlyContribution) || 2000,
    };
    vault.goals = [...vault.goals, created];
    vault.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.status(201).json({ goal: created, vault });
  });

  app.post(
    '/api/finance/goals/:id/contribute',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const db = loadDatabase();
      const vault = db.vaults[req.auth!.sub];
      if (!vault) {
        res.status(404).json({ error: 'Vault not found.' });
        return;
      }
      const goalId = String(req.params.id);
      const amount = Math.max(0, Number(req.body?.amount) || 0);
      vault.goals = vault.goals.map((g) => {
        if (g.id === goalId) {
          const nextVal = g.currentAmount + amount;
          return { ...g, currentAmount: nextVal, isCompleted: nextVal >= g.targetAmount };
        }
        return g;
      });
      vault.updatedAt = new Date().toISOString();
      saveDatabase(db);
      res.json({ vault });
    }
  );

  // Reset Demo Data
  app.post('/api/finance/reset', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    const fresh = createDefaultVault(req.auth!.sub);
    db.vaults[req.auth!.sub] = fresh;
    saveDatabase(db);
    res.json({ vault: fresh });
  });

  // Deterministic Purchase Simulator & Assistant API endpoints
  app.post('/api/simulator/evaluate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    const vault = db.vaults[req.auth!.sub] || createDefaultVault(req.auth!.sub);
    const totalBalance = vault.accounts.reduce((s, a) => s + a.balance, 0);
    const scenarios = simulatePurchaseScenarios(
      {
        itemName: String(req.body?.itemName || 'Planned Purchase'),
        amount: Math.max(100, Number(req.body?.amount) || 50000),
        plannedDate: String(req.body?.plannedDate || '2026-11'),
        priority: req.body?.priority || 'WANT',
        customReserveThreshold: Number(req.body?.customReserveThreshold) || 15000,
      },
      vault.transactions,
      totalBalance
    );
    res.json({ scenarios });
  });

  app.post('/api/assistant/ask', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDatabase();
    const vault = db.vaults[req.auth!.sub] || createDefaultVault(req.auth!.sub);
    const totalBalance = vault.accounts.reduce((s, a) => s + a.balance, 0);
    const reply = queryLocalAssistant(
      String(req.body?.query || ''),
      vault.transactions,
      totalBalance
    );
    res.json({ reply });
  });

  // ============================================================================
  // SECURITY & COMPLIANCE ROUTES (SSRF Guard + One-Click Unsubscribe)
  // ============================================================================

  app.post('/api/security/ssrf-check', (req: Request, res: Response) => {
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    const db = loadDatabase();
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.toLowerCase();
      if (parsed.protocol !== 'https:') {
        res.status(400).json({
          allowed: false,
          reason: 'Blocked: Only strict https:// URLs are permitted.',
        });
        return;
      }
      if (
        host === 'localhost' ||
        host === '169.254.169.254' ||
        host === 'metadata.google.internal' ||
        host.endsWith('.internal') ||
        host.endsWith('.local') ||
        host.includes(':') ||
        isPrivateIp(host)
      ) {
        res.status(403).json({
          allowed: false,
          reason: 'SSRF Guard blocked loopback, private RFC1918 IP, or cloud metadata target.',
        });
        return;
      }
      res.json({
        allowed: true,
        normalizedOrigin: parsed.origin,
        jwtKeyBits: db.jwtSecretHex.length * 4,
      });
    } catch {
      res.status(400).json({ allowed: false, reason: 'Invalid URL format.' });
    }
  });

  app.get('/api/unsubscribe', (req: Request, res: Response) => {
    const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
    if (uid) {
      const db = loadDatabase();
      const user = db.users.find((u) => u.id === uid);
      if (user) {
        user.emailDigestOptIn = false;
        saveDatabase(db);
      }
    }
    res
      .status(200)
      .type('html')
      .send(
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed — CashCompass</title></head><body style="font-family:Inter,system-ui,sans-serif;background:#F7F6FC;padding:2.5rem;color:#171725"><div style="max-width:460px;margin:0 auto;background:#FFFFFF;padding:2rem;border-radius:20px;border:1px solid #ECEAF3"><h1 style="font-size:1.35rem;color:#7654E8;margin-top:0">Unsubscribed Immediately</h1><p style="font-size:0.95rem;color:#77758A;line-height:1.5">Your email address has been removed from optional CashCompass digest notifications (RFC 8058 One-Click Unsubscribe). Zero marketing emails will be sent.</p><p style="margin-top:1.5rem"><a href="/" style="display:inline-block;background:#7654E8;color:#FFFFFF;text-decoration:none;padding:0.7rem 1.2rem;border-radius:12px;font-weight:700;font-size:0.875rem">Return to CashCompass</a></p></div></body></html>'
      );
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.info(`CashCompass full-stack server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
