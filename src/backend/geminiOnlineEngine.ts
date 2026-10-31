import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  Transaction,
  TransactionCategory,
  PurchasePriority,
  RefundTrackerItem,
  WarrantyVaultItem,
  PriceCreepAlert,
  BankAccount,
} from '../../FRONTEND/src/types/finance.ts';
import type { UserFinancialVault } from './store.ts';
import { simulatePurchaseScenarios } from '../../FRONTEND/src/services/simulator.ts';
import { calculateCategorySpending } from '../../FRONTEND/src/services/financeEngine.ts';
import {
  detectRecurringPayments,
  calculateTotalRecurringMonthly,
} from '../../FRONTEND/src/services/recurringDetector.ts';
import { formatINR } from '../../FRONTEND/src/constants/theme.ts';
import { queryLocalAssistant, type AssistantMessage } from '../../FRONTEND/src/services/assistantEngine.ts';

const GEMINI_MODEL = 'gemini-3.8-flash';

function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function formatGeminiError(err: any): { status: number; message: string } {
  const raw = String(err?.message || err || '');
  const code = Number(err?.status || err?.code || 500);
  if (
    code === 403 ||
    code === 400 && raw.includes('API_KEY') ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('API_KEY_INVALID')
  ) {
    return {
      status: 403,
      message:
        'Gemini API key issue detected. Please check or select a valid key in the Settings > Secrets panel.',
    };
  }
  if (code === 429 || raw.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        'Gemini API quota reached. Upgrading to a billing-enabled key in Settings > Secrets increases your quota.',
    };
  }
  return {
    status: 500,
    message: raw || 'Online Gemini AI request failed.',
  };
}

export function hasConfiguredGeminiKey(): boolean {
  const k = process.env.GEMINI_API_KEY || '';
  return Boolean(k && k !== 'MY_GEMINI_API_KEY' && k.trim().length > 8);
}

interface RawGmailEmail {
  id: string;
  subject: string;
  from: string;
  dateIso: string;
  timeLabel: string;
  bodyText: string;
}

function decodeBase64UrlUtf8(data: string): string {
  try {
    const padded = data.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((data.length + 3) % 4);
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8377;/g, '₹')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBodyFromPayload(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64UrlUtf8(payload.body.data);
  }
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        const txt = decodeBase64UrlUtf8(part.body.data);
        if (txt.trim()) return txt;
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = decodeBase64UrlUtf8(part.body.data);
        const clean = stripHtmlTags(html);
        if (clean) return clean;
      }
      if (Array.isArray(part.parts)) {
        const nested = extractBodyFromPayload(part);
        if (nested) return nested;
      }
    }
  }
  if (payload.body?.data) {
    return stripHtmlTags(decodeBase64UrlUtf8(payload.body.data));
  }
  return '';
}

function parseRegexFallbackFromEmails(
  emails: RawGmailEmail[],
  defaultAccountId: string
): Transaction[] {
  const out: Transaction[] = [];
  for (const em of emails) {
    const combined = `${em.subject} ${em.bodyText}`;
    const amtMatch = combined.match(/(?:₹|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (!amtMatch) continue;
    const amount = parseFloat(amtMatch[1].replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 50_000_000) continue;

    const lower = combined.toLowerCase();
    const isCredit =
      lower.includes('credited') ||
      lower.includes('received') ||
      lower.includes('salary') ||
      lower.includes('deposited');
    const isDebit =
      lower.includes('debited') ||
      lower.includes('paid') ||
      lower.includes('spent') ||
      lower.includes('order') ||
      lower.includes('invoice') ||
      lower.includes('receipt');
    if (!isCredit && !isDebit) continue;

    const upiMatch = combined.match(/(?:UPI(?:\s*Ref(?:\s*No)?|\s*Transaction\s*ID)?[:\s#-]+)([0-9]{8,16})/i);
    let category: TransactionCategory = isCredit ? 'Pocket Money' : 'Shopping';
    if (lower.includes('salary') || lower.includes('payroll')) category = 'Salary';
    else if (lower.includes('swiggy') || lower.includes('zomato') || lower.includes('food') || lower.includes('cafe'))
      category = 'Food';
    else if (lower.includes('uber') || lower.includes('ola') || lower.includes('irctc') || lower.includes('flight'))
      category = 'Travel';
    else if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('prime'))
      category = 'Entertainment';
    else if (lower.includes('electricity') || lower.includes('broadband') || lower.includes('airtel') || lower.includes('bill'))
      category = 'Bills';

    const cleanSender = em.from.replace(/<[^>]+>/g, '').replace(/"/g, '').trim() || 'Merchant';
    const title = em.subject.slice(0, 64) || cleanSender;

    out.push({
      id: `tx_gmail_${em.id}`,
      title,
      amount,
      type: isCredit ? 'INCOME' : 'EXPENSE',
      category,
      date: em.dateIso,
      time: em.timeLabel,
      paymentMethod: upiMatch ? 'UPI' : 'CARD',
      accountId: defaultAccountId,
      merchant: cleanSender.slice(0, 40),
      upiTransactionId: upiMatch?.[1] || `gmail_${em.id}`,
      notes: 'Synced from Gmail',
    });
  }
  return out;
}

export async function fetchAndParseGmailInbox(
  gmailAccessToken: string,
  filterPreset: 'all' | 'receipts' | 'refunds' = 'all',
  defaultAccountId: string = 'acc_hdfc_01'
): Promise<{
  scannedEmails: number;
  transactions: Transaction[];
  discoveredAccounts: BankAccount[];
  refundItems: RefundTrackerItem[];
  warrantyItems: WarrantyVaultItem[];
  priceCreepAlerts: PriceCreepAlert[];
}> {
  let query =
    '(debited OR credited OR UPI OR "Rs." OR "INR" OR receipt OR invoice OR refund OR warranty OR subscription OR statement) newer_than:90d';
  if (filterPreset === 'receipts') {
    query = '(receipt OR invoice OR order OR warranty OR delivered OR "Rs." OR "INR") newer_than:120d';
  } else if (filterPreset === 'refunds') {
    query = '(refund OR reversal OR cancelled OR "free trial" OR subscription OR auto-debit) newer_than:120d';
  }

  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=${encodeURIComponent(
    query
  )}`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${gmailAccessToken}` },
  });

  if (listRes.status === 401 || listRes.status === 403) {
    const errBody = await listRes.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message ||
        'Gmail authorization expired or lacks permission. Please sign in with Google again.'
    );
  }
  if (!listRes.ok) {
    throw new Error(`Gmail API returned status ${listRes.status}.`);
  }

  const listData = (await listRes.json()) as { messages?: { id: string }[] };
  const messageRefs = Array.isArray(listData.messages) ? listData.messages.slice(0, 18) : [];

  if (messageRefs.length === 0) {
    return {
      scannedEmails: 0,
      transactions: [],
      discoveredAccounts: [],
      refundItems: [],
      warrantyItems: [],
      priceCreepAlerts: [],
    };
  }

  const rawEmails: RawGmailEmail[] = [];
  await Promise.all(
    messageRefs.map(async (ref) => {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(
            ref.id
          )}?format=full`,
          { headers: { Authorization: `Bearer ${gmailAccessToken}` } }
        );
        if (!msgRes.ok) return;
        const msg = await msgRes.json();
        const headers: { name: string; value: string }[] = msg?.payload?.headers || [];
        const getHeader = (n: string) =>
          headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value || '';

        const subject = getHeader('Subject');
        const from = getHeader('From');
        const internalMs = Number(msg.internalDate) || Date.now();
        const dt = new Date(internalMs);
        const dateIso = dt.toISOString().split('T')[0];
        const timeLabel = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const fullBody = extractBodyFromPayload(msg.payload) || String(msg.snippet || '');

        rawEmails.push({
          id: ref.id,
          subject: subject.slice(0, 140),
          from: from.slice(0, 100),
          dateIso,
          timeLabel,
          bodyText: fullBody.slice(0, 900),
        });
      } catch {
        // skip unreadable individual message
      }
    })
  );

  if (rawEmails.length === 0) {
    return {
      scannedEmails: 0,
      transactions: [],
      discoveredAccounts: [],
      refundItems: [],
      warrantyItems: [],
      priceCreepAlerts: [],
    };
  }

  if (!hasConfiguredGeminiKey()) {
    return {
      scannedEmails: rawEmails.length,
      transactions: parseRegexFallbackFromEmails(rawEmails, defaultAccountId),
      discoveredAccounts: [],
      refundItems: [],
      warrantyItems: [],
      priceCreepAlerts: [],
    };
  }

  try {
    const ai = createGeminiClient();
    const emailDigestPrompt = rawEmails
      .map(
        (e, i) =>
          `Email #${i + 1} [ID:${e.id}] Date:${e.dateIso} Time:${e.timeLabel}\nFrom: ${e.from}\nSubject: ${e.subject}\nBody: ${e.bodyText}`
      )
      .join('\n\n---\n\n');

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Extract real financial transactions, pending or processed refunds, product warranty/return-window receipts, and subscription trial/price-hike alerts from the user's Gmail messages below. Ignore promotional newsletters or marketing offers that are not actual user transactions, orders, refunds, or active trials.\n\n${emailDigestPrompt}`,
      config: {
        systemInstruction:
          'You are a precision financial email parser for Indian & global bank alerts, UPI notifications, e-commerce invoices, refund confirmations, and subscription notices. Convert amounts to positive numbers in INR (if USD, multiply by 84). Only output genuine user transactions, refunds, warranties, or trial/price-hike alerts.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  emailId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  merchant: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  type: { type: Type.STRING, description: 'INCOME, EXPENSE, or TRANSFER' },
                  category: {
                    type: Type.STRING,
                    description:
                      'Food, Rent, Shopping, Travel, Bills, Entertainment, Salary, Pocket Money, Investments, Healthcare, or Other',
                  },
                  date: { type: Type.STRING, description: 'YYYY-MM-DD' },
                  time: { type: Type.STRING },
                  paymentMethod: {
                    type: Type.STRING,
                    description: 'UPI, NEFT, IMPS, ATM, CARD, or AUTO_DEBIT',
                  },
                  upiTransactionId: { type: Type.STRING },
                  accountLast4: { type: Type.STRING },
                  bankLabel: { type: Type.STRING },
                },
              },
            },
            refunds: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  merchant: { type: Type.STRING },
                  title: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  initiatedDate: { type: Type.STRING },
                  expectedByDate: { type: Type.STRING },
                  status: { type: Type.STRING, description: 'PENDING or CREDITED' },
                  sourceEmailSubject: { type: Type.STRING },
                },
              },
            },
            warranties: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING },
                  merchant: { type: Type.STRING },
                  purchaseDate: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  returnWindowEnds: { type: Type.STRING },
                  warrantyExpires: { type: Type.STRING },
                  invoiceRef: { type: Type.STRING },
                },
              },
            },
            priceAlerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  serviceName: { type: Type.STRING },
                  previousAmount: { type: Type.NUMBER },
                  newAmount: { type: Type.NUMBER },
                  detectedDate: { type: Type.STRING },
                  alertType: {
                    type: Type.STRING,
                    description: 'PRICE_HIKE or FREE_TRIAL_ENDING',
                  },
                  note: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const discoveredMap = new Map<string, BankAccount>();

    const transactions: Transaction[] = (Array.isArray(parsed.transactions)
      ? parsed.transactions
      : []
    )
      .filter((t: any) => t && Number(t.amount) > 0 && t.title)
      .map((t: any, idx: number) => {
        const last4 = String(t.accountLast4 || '').replace(/\D/g, '').slice(-4);
        let acctId = defaultAccountId;
        if (last4.length === 4) {
          acctId = `acc_gmail_${last4}`;
          if (!discoveredMap.has(acctId)) {
            discoveredMap.set(acctId, {
              id: acctId,
              name: `${t.bankLabel || 'Linked Account'} ${last4}`,
              bankName: String(t.bankLabel || 'Linked Account'),
              accountNumberMasked: `•••• ${last4}`,
              balance: 0,
              type: 'SAVINGS',
              cardBrand: 'RUPAY',
              color: '#7654E8',
            });
          }
        }
        const txType =
          t.type === 'INCOME' ? 'INCOME' : t.type === 'TRANSFER' ? 'TRANSFER' : 'EXPENSE';
        return {
          id: `tx_gm_${t.emailId || idx}_${Date.now()}`,
          title: String(t.title).trim(),
          merchant: String(t.merchant || t.title).trim(),
          amount: Math.round(Number(t.amount) * 100) / 100,
          type: txType,
          category: String(t.category || 'Other').trim(),
          date: /^\d{4}-\d{2}-\d{2}$/.test(String(t.date || ''))
            ? String(t.date)
            : new Date().toISOString().split('T')[0],
          time: String(t.time || '12:00 PM'),
          paymentMethod: (['UPI', 'NEFT', 'IMPS', 'ATM', 'CARD', 'AUTO_DEBIT'].includes(
            String(t.paymentMethod)
          )
            ? t.paymentMethod
            : 'UPI') as Transaction['paymentMethod'],
          accountId: acctId,
          upiTransactionId: String(t.upiTransactionId || `gmail_${t.emailId || idx}`),
          bankLabel: t.bankLabel ? String(t.bankLabel) : undefined,
          notes: 'Synced via Gmail',
        };
      });

    const refundItems: RefundTrackerItem[] = (Array.isArray(parsed.refunds) ? parsed.refunds : [])
      .filter((r: any) => r && Number(r.amount) > 0)
      .map((r: any, idx: number) => ({
        id: `ref_gm_${Date.now()}_${idx}`,
        merchant: String(r.merchant || 'Merchant'),
        title: String(r.title || 'Order Refund'),
        amount: Number(r.amount),
        initiatedDate: String(r.initiatedDate || new Date().toISOString().split('T')[0]),
        expectedByDate: String(r.expectedByDate || new Date().toISOString().split('T')[0]),
        status: r.status === 'CREDITED' ? 'CREDITED' : 'PENDING',
        sourceEmailSubject: r.sourceEmailSubject ? String(r.sourceEmailSubject) : undefined,
      }));

    const warrantyItems: WarrantyVaultItem[] = (Array.isArray(parsed.warranties)
      ? parsed.warranties
      : []
    )
      .filter((w: any) => w && w.productName)
      .map((w: any, idx: number) => ({
        id: `war_gm_${Date.now()}_${idx}`,
        productName: String(w.productName),
        merchant: String(w.merchant || 'Store'),
        purchaseDate: String(w.purchaseDate || new Date().toISOString().split('T')[0]),
        amount: Math.max(0, Number(w.amount) || 0),
        returnWindowEnds: String(w.returnWindowEnds || new Date().toISOString().split('T')[0]),
        warrantyExpires: String(w.warrantyExpires || '2027-10-31'),
        invoiceRef: w.invoiceRef ? String(w.invoiceRef) : undefined,
      }));

    const priceCreepAlerts: PriceCreepAlert[] = (Array.isArray(parsed.priceAlerts)
      ? parsed.priceAlerts
      : []
    )
      .filter((p: any) => p && p.serviceName)
      .map((p: any, idx: number) => ({
        id: `pc_gm_${Date.now()}_${idx}`,
        serviceName: String(p.serviceName),
        previousAmount: Math.max(0, Number(p.previousAmount) || 0),
        newAmount: Math.max(0, Number(p.newAmount) || 0),
        detectedDate: String(p.detectedDate || new Date().toISOString().split('T')[0]),
        alertType: p.alertType === 'FREE_TRIAL_ENDING' ? 'FREE_TRIAL_ENDING' : 'PRICE_HIKE',
        note: String(p.note || 'Subscription billing update detected in Gmail.'),
      }));

    const finalTransactions =
      transactions.length > 0
        ? transactions
        : parseRegexFallbackFromEmails(rawEmails, defaultAccountId);

    return {
      scannedEmails: rawEmails.length,
      transactions: finalTransactions,
      discoveredAccounts: Array.from(discoveredMap.values()),
      refundItems,
      warrantyItems,
      priceCreepAlerts,
    };
  } catch (err) {
    // Fallback to deterministic parser if Gemini experiences transient network error
    const fallbackTxs = parseRegexFallbackFromEmails(rawEmails, defaultAccountId);
    if (fallbackTxs.length > 0) {
      return {
        scannedEmails: rawEmails.length,
        transactions: fallbackTxs,
        discoveredAccounts: [],
        refundItems: [],
        warrantyItems: [],
        priceCreepAlerts: [],
      };
    }
    throw err;
  }
}

export async function answerAssistantWithGemini(
  query: string,
  vault: UserFinancialVault,
  totalIncome: number,
  totalExpenses: number,
  totalBalance: number
): Promise<AssistantMessage> {
  // Always compute 100% of math deterministically in code first (Problem Statement Requirement)
  const localBaseline = queryLocalAssistant(query, vault.transactions, totalBalance);
  const categories = calculateCategorySpending(vault.transactions);
  const recurring = detectRecurringPayments(vault.transactions);
  const totalRecurring = calculateTotalRecurringMonthly(recurring);
  const hourlyNetWage = Math.max(100, Math.round(totalIncome / 176));

  const priceMatch = query.match(/₹?\s?(\d+(?:[,.]\d+)?(?:\s?k)?)/i);
  let targetAmount = 50000;
  if (priceMatch) {
    const raw = priceMatch[1].replace(/,/g, '').trim();
    if (raw.toLowerCase().endsWith('k')) {
      targetAmount = parseFloat(raw) * 1000;
    } else {
      const n = parseFloat(raw);
      if (!Number.isNaN(n) && n >= 100) targetAmount = n;
    }
  }

  const scenarios = simulatePurchaseScenarios(
    {
      itemName: 'Planned Purchase',
      amount: targetAmount,
      plannedDate: '2026-11',
      priority: 'WANT',
      customReserveThreshold: 15000,
    },
    vault.transactions,
    totalBalance
  );
  const nextMonth = scenarios[1] || scenarios[0];
  const hoursOfWork = Math.round((targetAmount / hourlyNetWage) * 10) / 10;
  const pendingRefundTotal = (vault.refundItems || [])
    .filter((r) => r.status === 'PENDING')
    .reduce((s, r) => s + r.amount, 0);

  if (!hasConfiguredGeminiKey()) {
    return localBaseline;
  }

  const ai = createGeminiClient();
  const deterministicContext = JSON.stringify({
    totalIncome,
    totalExpenses,
    totalBalance,
    hourlyNetWage,
    topCategories: categories.slice(0, 5),
    recurringMonthlyTotal: totalRecurring,
    recurringItems: recurring.slice(0, 6).map((r) => ({ name: r.name, amount: r.amount })),
    pendingRefundTotal,
    activePriceAlerts: (vault.priceCreepAlerts || []).length,
    affordabilitySimulationForQueryAmount: {
      evaluatedAmount: targetAmount,
      hoursOfWorkEquivalent: hoursOfWork,
      status: nextMonth.status,
      verdict: nextMonth.verdict,
      startingBalance: nextMonth.startingBalance,
      projectedIncome: nextMonth.projectedIncome,
      projectedRecurring: nextMonth.projectedRecurring,
      projectedVariable: nextMonth.projectedVariable,
      estimatedRemainingBalance: nextMonth.estimatedRemainingBalance,
      safetyReserve: nextMonth.configuredReserveFloor,
    },
  });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `User Question: "${query}"\n\nVerified Deterministic Financial Context (DO NOT invent or alter any rupee numbers—use these exact computed figures):\n${deterministicContext}`,
    config: {
      systemInstruction:
        'You are CashCompass AI, an explainable personal finance assistant. Answer concisely in 2-4 clear sentences using the exact rupee numbers provided in the deterministic context. Mention working-hours opportunity cost or pending refunds/price hikes when relevant. Never fabricate figures.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answerText: { type: Type.STRING },
          cardTitle: { type: Type.STRING },
          verdictSummary: { type: Type.STRING },
          suggestedQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      },
    },
  });

  const aiData = JSON.parse((response.text ?? '{}').trim());
  const lower = query.toLowerCase();
  const isAffordQuery =
    lower.includes('afford') ||
    lower.includes('buy') ||
    lower.includes('laptop') ||
    lower.includes('phone') ||
    lower.includes('bike') ||
    lower.includes('trip');

  const deterministicCard = isAffordQuery
    ? {
        title: aiData.cardTitle || `Affordability Check (${formatINR(targetAmount)})`,
        metrics: [
          { label: 'Total Balance', value: formatINR(totalBalance) },
          { label: 'Committed + Variable', value: formatINR(nextMonth.projectedRecurring + nextMonth.projectedVariable) },
          {
            label: 'Post-Purchase Balance',
            value: formatINR(nextMonth.estimatedRemainingBalance),
            isHighlight: true,
          },
          { label: 'Safety Buffer Floor', value: formatINR(nextMonth.configuredReserveFloor) },
          { label: 'Work-Hours Cost', value: `${hoursOfWork} hrs (@ ${formatINR(hourlyNetWage)}/hr)` },
        ],
        verdict: aiData.verdictSummary || nextMonth.verdict,
        explanation: nextMonth.explanation,
      }
    : localBaseline.calculationCard;

  return {
    id: `msg_ai_${Date.now()}`,
    sender: 'assistant',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    text: String(aiData.answerText || localBaseline.text),
    calculationCard: deterministicCard,
    suggestedQuestions:
      Array.isArray(aiData.suggestedQuestions) && aiData.suggestedQuestions.length > 0
        ? aiData.suggestedQuestions.slice(0, 4)
        : localBaseline.suggestedQuestions,
  };
}

export async function parsePurchasePlanWithGemini(
  prompt: string,
  totalIncome: number,
  recurringNames: string[]
): Promise<{
  itemName: string;
  purchaseAmount: number;
  priority: PurchasePriority;
  suggestedNewEmi: number;
  suggestedCancelNames: string[];
  dealTimingTip: string;
  hoursOfWorkRequired: number;
}> {
  const hourlyRate = Math.max(100, Math.round(totalIncome / 176));

  if (!hasConfiguredGeminiKey()) {
    const amtMatch = prompt.match(/(\d[\d,]*)/);
    const amt = amtMatch ? Math.max(500, Number(amtMatch[1].replace(/,/g, ''))) : 50000;
    return {
      itemName: 'Planned Purchase',
      purchaseAmount: amt,
      priority: 'WANT',
      suggestedNewEmi: 0,
      suggestedCancelNames: [],
      dealTimingTip: 'Compare upfront discount vs no-cost EMI processing fees before checkout.',
      hoursOfWorkRequired: Math.round((amt / hourlyRate) * 10) / 10,
    };
  }

  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `Extract structured purchase simulation parameters from this user plan: "${prompt}".\nKnown active subscriptions that could be paused if mentioned: ${recurringNames.join(', ')}.`,
    config: {
      systemInstruction:
        'Extract the item name, estimated cost in INR, priority (ESSENTIAL, WANT, INVESTMENT, or LUXURY), optional monthly EMI if the user mentions EMI/installments, any subscription names to pause, and a 1-sentence smart buying/deal-timing tip.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          itemName: { type: Type.STRING },
          purchaseAmount: { type: Type.NUMBER },
          priority: { type: Type.STRING },
          suggestedNewEmi: { type: Type.NUMBER },
          suggestedCancelNames: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          dealTimingTip: { type: Type.STRING },
        },
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  const amount = Math.max(100, Number(parsed.purchaseAmount) || 50000);
  const rawPrio = String(parsed.priority || 'WANT').toUpperCase();
  const validPrio: PurchasePriority = ['ESSENTIAL', 'WANT', 'INVESTMENT', 'LUXURY'].includes(
    rawPrio
  )
    ? (rawPrio as PurchasePriority)
    : 'WANT';

  return {
    itemName: String(parsed.itemName || 'Planned Purchase').trim(),
    purchaseAmount: amount,
    priority: validPrio,
    suggestedNewEmi: Math.max(0, Number(parsed.suggestedNewEmi) || 0),
    suggestedCancelNames: Array.isArray(parsed.suggestedCancelNames)
      ? parsed.suggestedCancelNames.map((s: any) => String(s).toLowerCase())
      : [],
    dealTimingTip: String(
      parsed.dealTimingTip ||
        'Paying upfront avoids EMI processing fees if your post-purchase reserve stays healthy.'
    ),
    hoursOfWorkRequired: Math.round((amount / hourlyRate) * 10) / 10,
  };
}
