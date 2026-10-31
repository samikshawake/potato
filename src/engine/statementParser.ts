import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';
import { sharedTokenizer } from '../ml/sentencePieceTokenizer';
import type {
  DeduplicatedEntry,
  IngestionReport,
  Transaction,
  TransactionCategory,
} from '../types/finance';

// Bundle pdf.worker locally for 100% air-gapped offline execution in Web & Capacitor
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    // Fallback handled gracefully during getDocument
  }
}

const CATEGORY_KEYWORDS: { category: TransactionCategory; terms: string[] }[] = [
  {
    category: 'Bonus & Irregular Income',
    terms: ['BONUS', 'FESTIVAL INCENTIVE', 'ANNUAL PERFORMANCE', 'VARIABLE PAYOUT', 'TAX REFUND', 'GIFT CREDIT', 'DIVIDEND'],
  },
  {
    category: 'Salary & Income',
    terms: ['SALARY', 'PAYROLL', 'STIPEND', 'MONTHLY PAY', 'EMPLOYER', 'DIRECT DEP', 'RETAINER CREDIT', 'CLIENT INVOICE'],
  },
  {
    category: 'Self Transfer',
    terms: ['SELF TRANSFER', 'OWN ACCOUNT', 'CC BILL PAYMENT', 'CREDIT CARD AUTOPAY', 'INTERNAL TRF'],
  },
  {
    category: 'Rent & Housing',
    terms: ['RENT', 'LANDLORD', 'HOUSING', 'SOCIETY MAINT', 'NOBROKER', 'NESTAWAY', 'APARTMENT'],
  },
  {
    category: 'EMI & Loans',
    terms: ['EMI', 'LOAN', 'BAJAJ FIN', 'HDFC HOME LOAN', 'ICICI AUTO LOAN', 'MORTGAGE', 'LENDING'],
  },
  {
    category: 'Subscriptions',
    terms: [
      'NETFLIX',
      'SPOTIFY',
      'AMAZON PRIME',
      'PRIME VIDEO',
      'HOTSTAR',
      'YOUTUBE PREMIUM',
      'ICLOUD',
      'APPLE COM BILL',
      'GOOGLE ONE',
      'CULT FIT',
      'GYM MEMBERSHIP',
      'CHATGPT',
      'ADOBE',
    ],
  },
  {
    category: 'Food & Dining',
    terms: [
      'SWIGGY',
      'ZOMATO',
      'BLINKIT',
      'INSTAMART',
      'ZEPTO',
      'BIGBASKET',
      'DMART',
      'STARBUCKS',
      'CAFE',
      'RESTAURANT',
      'BAKERY',
      'DOMINOS',
      'MCDONALDS',
      'GROCERY',
      'SUPERMARKET',
    ],
  },
  {
    category: 'Travel & Commute',
    terms: [
      'UBER',
      'OLA',
      'RAPIDO',
      'METRO',
      'IRCTC',
      'INDIGO',
      'VISTARA',
      'MAKEMYTRIP',
      'AIR INDIA',
      'PETROL',
      'SHELL',
      'INDIAN OIL',
      'HPCL',
      'BPCL',
      'FASTAG',
      'FLIGHT',
    ],
  },
  {
    category: 'Utilities & Bills',
    terms: [
      'ELECTRICITY',
      'BESCOM',
      'MSEB',
      'TATA POWER',
      'AIRTEL',
      'JIO',
      'ACT FIBERNET',
      'BROADBAND',
      'WATER BILL',
      'GAS AGENCY',
      'INDANE',
      'POSTPAID',
    ],
  },
  {
    category: 'Healthcare',
    terms: ['APOLLO', 'PHARMACY', 'PHARMEASY', '1MG', 'HOSPITAL', 'CLINIC', 'DIAGNOSTIC', 'MEDICAL', 'DENTAL'],
  },
  {
    category: 'Shopping',
    terms: ['AMAZON', 'FLIPKART', 'MYNTRA', 'AJIO', 'CROMA', 'RELIANCE DIGITAL', 'DECATHLON', 'ZARA', 'UNIQLO', 'NYKAA', 'STORE'],
  },
];

export function categorizeTransactionWithTokenizer(
  description: string,
  type: 'debit' | 'credit',
  customRules: Record<string, TransactionCategory> = {}
): {
  category: TransactionCategory;
  confidence: number;
  normalizedMerchant: string;
  merchantTokens: string[];
} {
  const { normalizedMerchant, tokens } = sharedTokenizer.extractMerchantTokens(description);
  const upperDesc = description.toUpperCase();

  // 1. User-learned merchant rules take top priority
  if (customRules[normalizedMerchant]) {
    return {
      category: customRules[normalizedMerchant],
      confidence: 0.99,
      normalizedMerchant,
      merchantTokens: tokens,
    };
  }
  for (const [stem, cat] of Object.entries(customRules)) {
    if (normalizedMerchant.includes(stem) || stem.includes(normalizedMerchant)) {
      return {
        category: cat,
        confidence: 0.96,
        normalizedMerchant,
        merchantTokens: tokens,
      };
    }
  }

  // 2. Credit inflows classification
  if (type === 'credit') {
    for (const group of CATEGORY_KEYWORDS) {
      if (
        (group.category === 'Bonus & Irregular Income' ||
          group.category === 'Salary & Income' ||
          group.category === 'Self Transfer') &&
        group.terms.some((t) => upperDesc.includes(t))
      ) {
        return {
          category: group.category,
          confidence: 0.94,
          normalizedMerchant,
          merchantTokens: tokens,
        };
      }
    }
    return {
      category: 'Salary & Income',
      confidence: 0.78,
      normalizedMerchant,
      merchantTokens: tokens,
    };
  }

  // 3. Debit outflows classification using subword & phrase matching
  for (const group of CATEGORY_KEYWORDS) {
    if (group.category === 'Salary & Income' || group.category === 'Bonus & Irregular Income') continue;
    if (group.terms.some((t) => upperDesc.includes(t))) {
      return {
        category: group.category,
        confidence: 0.92,
        normalizedMerchant,
        merchantTokens: tokens,
      };
    }
  }

  return {
    category: 'Other',
    confidence: 0.62,
    normalizedMerchant,
    merchantTokens: tokens,
  };
}

export function normalizeBankDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^["']|["']$/g, '');

  // ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmyMatch) {
    let [, d, m, y] = dmyMatch;
    if (y.length === 2) y = `20${y}`;
    const numD = parseInt(d, 10);
    const numM = parseInt(m, 10);
    if (numM > 12 && numD <= 12) {
      // Handle MM/DD/YYYY fallback
      return `${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`;
    }
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD Mon YYYY (e.g. 15 Aug 2026 or 15-Aug-26)
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const namedMatch = trimmed.match(/^(\d{1,2})[\s-/]+([A-Za-z]{3,9})[\s-,/]+(\d{2,4})/);
  if (namedMatch) {
    let [, d, mon, y] = namedMatch;
    const mCode = months[mon.slice(0, 3).toLowerCase()];
    if (mCode) {
      if (y.length === 2) y = `20${y}`;
      return `${y}-${mCode}-${d.padStart(2, '0')}`;
    }
  }

  return null;
}

function cleanNumericValue(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val !== 'string') return 0;
  const cleaned = val
    .replace(/[₹$,\s]/g, '')
    .replace(/\b(?:INR|RS\.?|CR|DR)\b/gi, '')
    .trim();
  if (!cleaned || cleaned === '-') return 0;
  // Handle accounting parentheses (1,200.00)
  if (/^\(.*\)$/.test(cleaned)) {
    return -Math.abs(parseFloat(cleaned.slice(1, -1)) || 0);
  }
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferAccountIdentity(fileName: string, overrideAccountName?: string): {
  accountId: string;
  accountName: string;
} {
  if (overrideAccountName && overrideAccountName.trim()) {
    const clean = overrideAccountName.trim();
    return {
      accountId: clean.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      accountName: clean,
    };
  }
  const upper = fileName.toUpperCase();
  if (upper.includes('HDFC')) return { accountId: 'hdfc-savings', accountName: 'HDFC Savings ••4821' };
  if (upper.includes('ICICI')) return { accountId: 'icici-salary', accountName: 'ICICI Salary ••9104' };
  if (upper.includes('SBI')) return { accountId: 'sbi-card', accountName: 'SBI Credit Card ••3319' };
  if (upper.includes('AXIS')) return { accountId: 'axis-checking', accountName: 'Axis Priority ••7740' };

  const base = fileName.replace(/\.(csv|pdf)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Primary Bank Account';
  return {
    accountId: base.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28),
    accountName: base.slice(0, 30),
  };
}

export async function parseCsvStatementFile(
  file: File,
  customRules: Record<string, TransactionCategory> = {},
  overrideAccountName?: string
): Promise<Transaction[]> {
  const text = await file.text();
  return parseCsvStatementText(text, file.name, customRules, overrideAccountName);
}

export function parseCsvStatementText(
  csvText: string,
  fileName: string,
  customRules: Record<string, TransactionCategory> = {},
  overrideAccountName?: string
): Transaction[] {
  // Strip bank preamble lines before header row if statement starts with metadata
  const rawLines = csvText.split(/\r?\n/);
  let headerLineIdx = 0;
  for (let i = 0; i < Math.min(20, rawLines.length); i++) {
    const l = rawLines[i].toLowerCase();
    if (l.includes('date') && (l.includes('narration') || l.includes('description') || l.includes('particulars') || l.includes('amount') || l.includes('debit') || l.includes('withdrawal'))) {
      headerLineIdx = i;
      break;
    }
  }
  const trimmedCsv = rawLines.slice(headerLineIdx).join('\n');

  const parsed = Papa.parse<Record<string, string>>(trimmedCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const defaultAccount = inferAccountIdentity(fileName, overrideAccountName);
  const transactions: Transaction[] = [];

  parsed.data.forEach((row, index) => {
    const keys = Object.keys(row);
    const dateKey = keys.find((k) => k.includes('date') || k === 'dt');
    const descKey = keys.find(
      (k) =>
        k.includes('narration') ||
        k.includes('description') ||
        k.includes('particular') ||
        k.includes('merchant') ||
        k.includes('remarks') ||
        k.includes('details')
    );
    const debitKey = keys.find(
      (k) => k !== descKey && (k.includes('debit') || k.includes('withdrawal') || /\bdr\b/.test(k))
    );
    const creditKey = keys.find(
      (k) => k !== descKey && (k.includes('credit') || k.includes('deposit') || /\bcr\b/.test(k))
    );
    const amountKey = keys.find((k) => k === 'amount' || k.includes('txn amount') || k.includes('transaction amount'));
    const typeKey = keys.find((k) => k === 'type' || k.includes('dr/cr') || k.includes('txn type'));
    const balKey = keys.find((k) => k.includes('balance') || k.includes('closing'));
    const refKey = keys.find((k) => k.includes('ref') || k.includes('utr') || k.includes('chq'));
    const acctKey = keys.find((k) => k.includes('account'));

    const rawDate = dateKey ? row[dateKey] : '';
    const normDate = normalizeBankDate(rawDate);
    if (!normDate) return;

    const description = (descKey ? row[descKey] : Object.values(row).join(' ')).trim();
    if (!description) return;

    let amount = 0;
    let type: 'debit' | 'credit' = 'debit';

    const debitVal = debitKey ? Math.abs(cleanNumericValue(row[debitKey])) : 0;
    const creditVal = creditKey ? Math.abs(cleanNumericValue(row[creditKey])) : 0;

    if (debitVal > 0 || creditVal > 0) {
      if (creditVal > debitVal) {
        amount = creditVal;
        type = 'credit';
      } else {
        amount = debitVal;
        type = 'debit';
      }
    } else if (amountKey) {
      const signed = cleanNumericValue(row[amountKey]);
      const explicitType = typeKey ? (row[typeKey] || '').toLowerCase() : '';
      if (explicitType.includes('cr') || explicitType.includes('credit') || explicitType.includes('income')) {
        type = 'credit';
        amount = Math.abs(signed);
      } else if (explicitType.includes('dr') || explicitType.includes('debit') || explicitType.includes('expense')) {
        type = 'debit';
        amount = Math.abs(signed);
      } else {
        type = signed < 0 ? 'debit' : 'credit';
        // Many single-column card statements list positive numbers as debits unless 'CR' is in text
        if (signed > 0 && !/\b(salary|credit|refund|bonus|deposit|neft cr)\b/i.test(description)) {
          type = 'debit';
        }
        amount = Math.abs(signed);
      }
    }

    if (amount <= 0) return;

    const balanceAfter = balKey && row[balKey] ? cleanNumericValue(row[balKey]) : undefined;
    const referenceId = refKey && row[refKey] ? row[refKey].trim() : undefined;

    const rowAccount =
      !overrideAccountName && acctKey && row[acctKey]?.trim()
        ? inferAccountIdentity(row[acctKey], row[acctKey])
        : defaultAccount;

    const catInfo = categorizeTransactionWithTokenizer(description, type, customRules);

    transactions.push({
      id: `txn-${rowAccount.accountId}-${normDate}-${index}-${Math.round(amount)}`,
      date: normDate,
      description,
      normalizedMerchant: catInfo.normalizedMerchant,
      merchantTokens: catInfo.merchantTokens,
      amount: Math.round(amount * 100) / 100,
      type,
      balanceAfter,
      accountId: rowAccount.accountId,
      accountName: rowAccount.accountName,
      sourceFile: fileName,
      sourceFormat: 'CSV',
      referenceId,
      category: catInfo.category,
      categoryConfidence: catInfo.confidence,
    });
  });

  return transactions;
}

export async function parsePdfStatementFile(
  file: File,
  customRules: Record<string, TransactionCategory> = {},
  overrideAccountName?: string
): Promise<Transaction[]> {
  const arrayBuffer = await file.arrayBuffer();
  const extractedLines: string[] = [];

  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      // Group text items by approximate Y coordinate (row)
      const rowMap = new Map<number, { x: number; str: string }[]>();

      for (const item of textContent.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const y = Math.round((item.transform?.[5] ?? 0) / 4) * 4;
        const x = item.transform?.[4] ?? 0;
        const list = rowMap.get(y) ?? [];
        list.push({ x, str: item.str.trim() });
        rowMap.set(y, list);
      }

      const sortedYs = [...rowMap.keys()].sort((a, b) => b - a);
      for (const y of sortedYs) {
        const items = rowMap.get(y)!.sort((a, b) => a.x - b.x);
        extractedLines.push(items.map((i) => i.str).join('  '));
      }
    }
  } catch {
    // Fallback plain-text stream scan for simple uncompressed PDFs
    const rawStr = new TextDecoder('latin1').decode(arrayBuffer);
    const parenthetical = [...rawStr.matchAll(/\(([^()]{4,200})\)/g)].map((m) => m[1]);
    extractedLines.push(...parenthetical);
  }

  return parsePdfStatementLines(extractedLines, file.name, customRules, overrideAccountName);
}

export function parsePdfStatementLines(
  lines: string[],
  fileName: string,
  customRules: Record<string, TransactionCategory> = {},
  overrideAccountName?: string
): Transaction[] {
  const account = inferAccountIdentity(fileName, overrideAccountName);
  const transactions: Transaction[] = [];

  const dateLineRegex = /^(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})\s+(.+)$/;

  lines.forEach((line, idx) => {
    const match = line.trim().match(dateLineRegex);
    if (!match) return;

    const normDate = normalizeBankDate(match[1]);
    if (!normDate) return;

    const rest = match[2].trim();
    // Extract trailing currency numbers (amount and optional closing balance)
    const numMatches = [...rest.matchAll(/([+-]?(?:₹|Rs\.?)?\s*\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+\.\d{2})\s*(CR|DR)?/gi)];
    if (numMatches.length === 0) return;

    // Usually second-to-last number is txn amount if last number is closing balance, or last if single number
    const primaryMatch = numMatches.length >= 2 ? numMatches[numMatches.length - 2] : numMatches[0];
    const balMatch = numMatches.length >= 2 ? numMatches[numMatches.length - 1] : undefined;

    const amount = Math.abs(cleanNumericValue(primaryMatch[1]));
    if (amount <= 0) return;

    const balanceAfter = balMatch ? cleanNumericValue(balMatch[1]) : undefined;
    const descEndIdx = primaryMatch.index ?? rest.length;
    const description = rest.slice(0, descEndIdx).replace(/\s+/g, ' ').trim() || 'Bank Statement Entry';

    const suffix = (primaryMatch[2] || '').toUpperCase();
    const isCredit =
      suffix === 'CR' ||
      /\b(SALARY|CREDIT|NEFT CR|BONUS|DEPOSIT|REFUND)\b/i.test(description) ||
      primaryMatch[1].trim().startsWith('+');
    const type: 'debit' | 'credit' = isCredit ? 'credit' : 'debit';

    const catInfo = categorizeTransactionWithTokenizer(description, type, customRules);

    transactions.push({
      id: `pdf-${account.accountId}-${normDate}-${idx}-${Math.round(amount)}`,
      date: normDate,
      description,
      normalizedMerchant: catInfo.normalizedMerchant,
      merchantTokens: catInfo.merchantTokens,
      amount: Math.round(amount * 100) / 100,
      type,
      balanceAfter,
      accountId: account.accountId,
      accountName: account.accountName,
      sourceFile: fileName,
      sourceFormat: 'PDF',
      category: catInfo.category,
      categoryConfidence: catInfo.confidence,
    });
  });

  return transactions;
}

/**
 * Combines existing transactions with newly parsed multi-account transactions,
 * ensuring the exact same transaction from overlapping statement exports or
 * multi-format uploads (CSV + PDF of same period) is never counted twice.
 */
export function mergeAndDeduplicateTransactions(
  existing: Transaction[],
  incoming: Transaction[],
  filesProcessed: string[],
  parseLatencyMs: number
): { merged: Transaction[]; report: IngestionReport } {
  const merged = [...existing];
  const deduplicatedEntries: DeduplicatedEntry[] = [];
  const accountsSet = new Set<string>();

  for (const cand of incoming) {
    accountsSet.add(cand.accountName);

    // Check against already-ingested records from DIFFERENT statement exports or exact UTR match
    const duplicateMatch = merged.find((ex) => {
      // 1. Exact Reference / UTR match on the same account
      if (cand.referenceId && ex.referenceId && cand.referenceId === ex.referenceId && cand.accountId === ex.accountId) {
        return true;
      }

      // 2. Overlapping statement upload (different file, same account, same date, exact amount & merchant)
      if (
        cand.sourceFile !== ex.sourceFile &&
        cand.accountId === ex.accountId &&
        cand.date === ex.date &&
        cand.type === ex.type &&
        Math.abs(cand.amount - ex.amount) < 0.01 &&
        (cand.normalizedMerchant === ex.normalizedMerchant ||
          (cand.balanceAfter !== undefined &&
            ex.balanceAfter !== undefined &&
            Math.abs(cand.balanceAfter - ex.balanceAfter) < 0.01))
      ) {
        return true;
      }

      // 3. Cross-account mirror self-transfer on same date & exact amount (prevent double counting internal transfer)
      if (
        cand.accountId !== ex.accountId &&
        cand.date === ex.date &&
        Math.abs(cand.amount - ex.amount) < 0.01 &&
        cand.category === 'Self Transfer' &&
        ex.category === 'Self Transfer' &&
        cand.type !== ex.type
      ) {
        return true;
      }

      return false;
    });

    if (duplicateMatch) {
      deduplicatedEntries.push({
        droppedTransaction: {
          date: cand.date,
          description: cand.description,
          amount: cand.amount,
          type: cand.type,
          sourceFile: cand.sourceFile,
          accountName: cand.accountName,
        },
        matchedWithId: duplicateMatch.id,
        matchedSourceFile: duplicateMatch.sourceFile,
        reason:
          cand.referenceId && duplicateMatch.referenceId === cand.referenceId
            ? `Matching bank reference ID (${cand.referenceId}) already present`
            : cand.accountId !== duplicateMatch.accountId
            ? `Mirrored inter-account self-transfer matched with ${duplicateMatch.accountName}`
            : `Overlapping statement entry (${cand.date} · ₹${cand.amount.toLocaleString('en-IN')}) already imported from ${duplicateMatch.sourceFile}`,
      });
    } else {
      merged.push(cand);
    }
  }

  merged.sort((a, b) => b.date.localeCompare(a.date));

  const report: IngestionReport = {
    id: `ing-${Date.now()}`,
    timestamp: new Date().toISOString(),
    filesProcessed,
    totalRowsParsed: incoming.length,
    addedCount: incoming.length - deduplicatedEntries.length,
    deduplicatedCount: deduplicatedEntries.length,
    deduplicatedEntries,
    accountsUpdated: [...accountsSet],
    parseLatencyMs: Math.round(parseLatencyMs * 10) / 10,
  };

  return { merged, report };
}
