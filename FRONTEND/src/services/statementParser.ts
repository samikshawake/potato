import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {
  Transaction,
  TransactionCategory,
  TransactionType,
  PaymentMethod,
  BankAccount,
} from '../types/finance.ts';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface ParsedStatementResult {
  bankName: string;
  totalRecords: number;
  totalCredits: number;
  totalDebits: number;
  totalSelfTransfers: number;
  dateRange: string;
  transactions: Transaction[];
  discoveredAccounts: BankAccount[];
  parsingNotes: string[];
  duplicatesRemoved?: number;
}

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

const BANK_COLORS = ['#7654E8', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

/**
 * Intelligent categorization based on Indian UPI & bank narration keywords
 */
export const categorizeNarration = (
  narration: string,
  txType?: TransactionType
): { category: TransactionCategory; paymentMethod: PaymentMethod } => {
  const text = narration.toLowerCase();

  if (txType === 'TRANSFER' || /self\s*transfer/i.test(text)) {
    return { category: 'Other', paymentMethod: 'UPI' };
  }

  let paymentMethod: PaymentMethod = 'UPI';
  if (text.includes('neft')) paymentMethod = 'NEFT';
  else if (text.includes('imps')) paymentMethod = 'IMPS';
  else if (text.includes('atm') || text.includes('cash wdl')) paymentMethod = 'ATM';
  else if (text.includes('pos') || text.includes('card') || text.includes('e-com'))
    paymentMethod = 'CARD';
  else if (text.includes('ach') || text.includes('autopay') || text.includes('mandate'))
    paymentMethod = 'AUTO_DEBIT';

  if (
    text.includes('salary') ||
    text.includes('payroll') ||
    text.includes('stipend') ||
    text.includes('bonus') ||
    text.includes('payout') ||
    text.includes('consulting')
  ) {
    return { category: 'Salary', paymentMethod };
  }
  if (text.includes('rent') || text.includes('landlord') || text.includes('housing')) {
    return { category: 'Rent', paymentMethod };
  }
  if (
    text.includes('zomato') ||
    text.includes('swiggy') ||
    text.includes('blinkit') ||
    text.includes('zepto') ||
    text.includes('burger') ||
    text.includes('cafe') ||
    text.includes('chai') ||
    text.includes('restaurant') ||
    text.includes('dine') ||
    text.includes('biryani') ||
    text.includes('grocery') ||
    text.includes('groceries') ||
    text.includes('basket') ||
    text.includes('supermarket') ||
    text.includes('bakery') ||
    text.includes('dairy')
  ) {
    return { category: 'Food', paymentMethod };
  }
  if (
    text.includes('bescom') ||
    text.includes('electricity') ||
    text.includes('airtel') ||
    text.includes('jio') ||
    text.includes('water') ||
    text.includes('broadband') ||
    text.includes('gas') ||
    text.includes('emi') ||
    text.includes('educational') ||
    text.includes('charitable') ||
    text.includes('trust') ||
    text.includes('college') ||
    text.includes('university') ||
    text.includes('school') ||
    text.includes('tuition') ||
    text.includes('institute') ||
    text.includes('recharge')
  ) {
    return { category: 'Bills', paymentMethod };
  }
  if (
    text.includes('amazon') ||
    text.includes('flipkart') ||
    text.includes('myntra') ||
    text.includes('croma') ||
    text.includes('uniqlo') ||
    text.includes('retail') ||
    text.includes('store') ||
    text.includes('mart')
  ) {
    return { category: 'Shopping', paymentMethod };
  }
  if (
    text.includes('uber') ||
    text.includes('ola') ||
    text.includes('rapido') ||
    text.includes('petrol') ||
    text.includes('fuel') ||
    text.includes('indianoil') ||
    text.includes('hpcl') ||
    text.includes('bpcl') ||
    text.includes('metro') ||
    text.includes('flight') ||
    text.includes('makemytrip') ||
    text.includes('irctc') ||
    text.includes('redbus')
  ) {
    return { category: 'Travel', paymentMethod };
  }
  if (
    text.includes('netflix') ||
    text.includes('spotify') ||
    text.includes('pvr') ||
    text.includes('inox') ||
    text.includes('bookmyshow') ||
    text.includes('prime') ||
    text.includes('hotstar') ||
    text.includes('youtube')
  ) {
    return { category: 'Entertainment', paymentMethod };
  }
  if (
    text.includes('apollo') ||
    text.includes('pharmacy') ||
    text.includes('hospital') ||
    text.includes('clinic') ||
    text.includes('medical') ||
    text.includes('lab')
  ) {
    return { category: 'Healthcare', paymentMethod };
  }
  if (
    text.includes('zerodha') ||
    text.includes('groww') ||
    text.includes('mutual fund') ||
    text.includes('sip')
  ) {
    return { category: 'Investments', paymentMethod };
  }

  return { category: 'Other', paymentMethod };
};

/**
 * Timezone-safe date + time parser supporting:
 * - "01 Apr, 2026" / "01 Apr, 2026 11:36 AM" / "01 Apr 2026\n11:36 AM"
 * - "2026-04-01"
 * - "01/04/2026" or "01-04-2026"
 */
export function parseUpiDateAndTime(raw: string): { date: string; time: string } {
  const normalized = raw.replace(/\s+/g, ' ').trim();
  const timeMatch = normalized.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\b/);
  const time = timeMatch ? timeMatch[1].toUpperCase().replace(/\s+/g, ' ').trim() : '12:00 PM';

  // DD MMM, YYYY or DD MMM YYYY (exact format in user's UPI screenshot: "01 Apr, 2026")
  const dMonY = normalized.match(
    /\b(\d{1,2})\s+([A-Za-z]{3,9}),?\s+(\d{4})\b/
  );
  if (dMonY) {
    const day = dMonY[1].padStart(2, '0');
    const mon = MONTH_MAP[dMonY[2].toLowerCase()];
    const year = dMonY[3];
    if (mon) {
      return { date: `${year}-${mon}-${day}`, time };
    }
  }

  // YYYY-MM-DD
  const iso = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return { date: `${iso[1]}-${iso[2]}-${iso[3]}`, time };
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return { date: `${year}-${month}-${day}`, time };
  }

  return { date: '2026-04-01', time };
}

function cleanNumeric(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val !== 'string') return 0;
  const stripped = val
    .replace(/(?:INR|Rs\.?|₹|\$|,|\s)/gi, '')
    .replace(/(cr|dr)$/i, '')
    .trim();
  const n = parseFloat(stripped);
  return isNaN(n) ? 0 : n;
}

function buildBankAccountId(bankName: string, last4: string): string {
  const slug = bankName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18);
  return `acc_upi_${slug}_${last4}`;
}

interface ParsedUpiDetails {
  title: string;
  merchant: string;
  type: TransactionType;
  upiTransactionId?: string;
  paidByOrToLine?: string;
  bankName?: string;
  accountLast4?: string;
  accountId?: string;
}

/**
 * Parses the "Transaction details" block from Google Pay / Paytm / PhonePe UPI statements:
 * Examples from user's screenshot:
 * 1) "Paid to SHRI SHAMRAO PATIL YADRAVKAR EDUCATIONAL AND CHARITABLE TRUST
 *     UPI Transaction ID: 645776339229
 *     Paid by India Post Payment Bank 0262"
 * 2) "Received from Ananya Potadar
 *     UPI Transaction ID: 645713846834
 *     Paid to Bank of India 3628"
 * 3) "Self transfer to India Post Payment Bank 0262
 *     UPI Transaction ID: 645750350390
 *     Paid by HDFC Bank 1442"
 */
export function parseUpiTransactionDetailsBlock(rawDetails: string): ParsedUpiDetails {
  const flat = rawDetails
    .replace(/\r/g, '\n')
    .split(/\n|\|/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');

  // 1. Extract UPI Transaction ID
  const upiMatch = flat.match(
    /(?:UPI\s*Transaction\s*ID|UPI\s*Ref(?:\.\s*|\s+)No|UTR|Transaction\s*ID)\s*[:\-]?\s*([A-Za-z0-9]{6,24})/i
  );
  const upiTransactionId = upiMatch ? upiMatch[1].trim() : undefined;

  // 2. Extract settlement bank line ("Paid by India Post Payment Bank 0262", "Paid to Bank of India 3628", "Debited from HDFC Bank 1442")
  let paidByOrToLine: string | undefined;
  let bankName: string | undefined;
  let accountLast4: string | undefined;
  let settlementVerb = '';

  const lines = flat.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const bankMatch = line.match(
      /^(Paid\s+by|Paid\s+to|Debited\s+from|Credited\s+to)\s+(.+?)\s+(?:XX+|••••\s*|ending\s+)?(\d{3,4})$/i
    );
    if (bankMatch) {
      // Ensure we don't confuse line 0 "Self transfer to India Post Payment Bank 0262" with settlement line,
      // and don't confuse line 0 if there is only 1 line unless it says "Paid by / Debited from / Credited to".
      const verb = bankMatch[1].toLowerCase();
      if (i > 0 || verb.startsWith('paid by') || verb.startsWith('debited') || verb.startsWith('credited')) {
        settlementVerb = verb;
        bankName = bankMatch[2].trim();
        accountLast4 = bankMatch[3].trim();
        paidByOrToLine = `${bankMatch[1]} ${bankName} ${accountLast4}`;
        break;
      }
    }
  }

  // Fallback inline match when details are collapsed on a single line
  if (!paidByOrToLine) {
    const inlineBank = flat.match(
      /\b(Paid\s+by|Paid\s+to|Debited\s+from|Credited\s+to)\s+([A-Za-z][A-Za-z\s.&]{2,42}?(?:Bank|SBI|HDFC|ICICI|Axis|Kotak|Paytm|Post)[A-Za-z\s]*?)\s+(?:XX+|••••\s*)?(\d{3,4})\b/i
    );
    if (inlineBank) {
      settlementVerb = inlineBank[1].toLowerCase();
      bankName = inlineBank[2].trim();
      accountLast4 = inlineBank[3].trim();
      paidByOrToLine = `${inlineBank[1]} ${bankName} ${accountLast4}`;
    }
  }

  // 3. Extract clean primary action + counterparty title
  let cleanTitle = flat
    .replace(
      /(?:UPI\s*Transaction\s*ID|UPI\s*Ref(?:\.\s*|\s+)No|UTR|Transaction\s*ID)\s*[:\-]?\s*[A-Za-z0-9]{6,24}/gi,
      ''
    )
    .trim();

  if (paidByOrToLine) {
    const escaped = paidByOrToLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanTitle = cleanTitle.replace(new RegExp(escaped, 'i'), '').trim();
  }

  cleanTitle = cleanTitle
    .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[•\-–|,\s]+|[•\-–|,\s]+$/g, '')
    .trim();
  if (!cleanTitle) {
    cleanTitle = 'UPI Transaction';
  }

  // 4. Determine transaction direction accurately
  let type: TransactionType = 'EXPENSE';
  if (/^self\s*transfer\b/i.test(cleanTitle) || /\bself\s*transfer\s+(?:to|from)\b/i.test(cleanTitle)) {
    type = 'TRANSFER';
  } else if (
    /^received\s+from\b/i.test(cleanTitle) ||
    /^refund\s+from\b/i.test(cleanTitle) ||
    /^cashback\b/i.test(cleanTitle) ||
    /^credited\b/i.test(cleanTitle) ||
    settlementVerb.startsWith('credited to') ||
    (settlementVerb.startsWith('paid to') && !/^paid\s+to\b/i.test(cleanTitle))
  ) {
    type = 'INCOME';
  } else {
    type = 'EXPENSE';
  }

  // 5. Extract counterparty / merchant name for merchant-wide category correction
  const merchant = cleanTitle
    .replace(/^(?:Paid\s+to|Received\s+from|Self\s+transfer\s+to|Self\s+transfer\s+from|Bill\s+paid\s+to|Refund\s+from)\s+/i, '')
    .trim() || cleanTitle;

  const accountId =
    bankName && accountLast4 ? buildBankAccountId(bankName, accountLast4) : undefined;

  return {
    title: cleanTitle,
    merchant,
    type,
    upiTransactionId,
    paidByOrToLine,
    bankName,
    accountLast4,
    accountId,
  };
}

function registerDiscoveredAccount(
  map: Map<string, BankAccount>,
  bankName?: string,
  last4?: string,
  accountId?: string
) {
  if (!bankName || !last4 || !accountId) return;
  if (map.has(accountId)) return;
  const color = BANK_COLORS[map.size % BANK_COLORS.length];
  map.set(accountId, {
    id: accountId,
    name: `${bankName} UPI`,
    bankName,
    accountNumberMasked: `•••• ${last4}`,
    balance: 0,
    type: 'SAVINGS',
    cardBrand: 'RUPAY',
    color,
  });
}

function makeDedupeKey(
  date: string,
  type: TransactionType,
  amount: number,
  title: string,
  upiId?: string
): string {
  if (upiId && upiId.trim().length >= 6) {
    return `upi:${upiId.trim().toLowerCase()}`;
  }
  return `${date}|${type}|${Math.round(amount * 100)}|${title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24)}`;
}

/**
 * Parses unstructured / multi-line UPI statement text blocks (used by both PDF.js and Paste Text)
 * Matches the exact Google Pay / Paytm UPI statement table shown in the user's screenshot:
 * Date & time | Transaction details | Amount
 */
export function parseUpiStatementTextBlocks(
  allLines: string[],
  fallbackAccountId: string = 'acc_hdfc_01'
): {
  transactions: Transaction[];
  discoveredAccounts: BankAccount[];
  duplicatesRemoved: number;
  totalCredits: number;
  totalDebits: number;
  totalSelfTransfers: number;
  minDate: string;
  maxDate: string;
} {
  const cleanedLines = allLines
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !/^date\s*&\s*time\s+transaction\s+details\s+amount$/i.test(l) &&
        !/^page\s+\d+\s+of\s+\d+$/i.test(l) &&
        !/^statement\s+of\s+transactions/i.test(l)
    );

  // Detect date anchors starting each transaction block: "01 Apr, 2026" or "2026-10-01" or "01/04/2026"
  const dateStartRegex =
    /^(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*,?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i;

  const blocks: string[][] = [];
  let currentBlock: string[] | null = null;

  for (const line of cleanedLines) {
    if (dateStartRegex.test(line)) {
      if (currentBlock && currentBlock.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = [line];
    } else if (currentBlock) {
      currentBlock.push(line);
    }
  }
  if (currentBlock && currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  const transactions: Transaction[] = [];
  const accountsMap = new Map<string, BankAccount>();
  const seen = new Set<string>();
  let duplicatesRemoved = 0;
  let totalCredits = 0;
  let totalDebits = 0;
  let totalSelfTransfers = 0;
  let minDate = '';
  let maxDate = '';

  blocks.forEach((blockLines, idx) => {
    const joined = blockLines.join('\n');

    // 1. Parse Date & Time from first two lines of block
    const dateTimeProbe = blockLines.slice(0, 3).join(' ');
    const { date: dateStr, time } = parseUpiDateAndTime(dateTimeProbe);

    // 2. Extract Amount (either ₹50 / Rs. 50 / INR 50 anywhere in block, or trailing amount + optional CR/DR on line 0)
    let amount = 0;
    let explicitCrDr = '';
    let blockWithoutAmount = joined;

    const currencyMatch = joined.match(
      /([+-])?\s*(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)\s*(CR|DR|CREDIT|DEBIT)?/i
    );
    if (currencyMatch) {
      amount = cleanNumeric(currencyMatch[2]);
      explicitCrDr = (currencyMatch[3] || (currencyMatch[1] === '+' ? 'CR' : currencyMatch[1] === '-' ? 'DR' : '')).toUpperCase();
      blockWithoutAmount = joined.replace(currencyMatch[0], ' ');
    } else {
      // Classic single-line PDF fallback: "2026-10-01 Salary Credit TechCorp 65000 CR"
      const classicLine = blockLines[0].match(
        /^(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4})\s+(.+?)\s+([\d,]+(?:\.\d{1,2})?)\s*(CR|DR|CREDIT|DEBIT)?$/i
      );
      if (classicLine) {
        amount = cleanNumeric(classicLine[3]);
        explicitCrDr = (classicLine[4] || '').toUpperCase();
        blockWithoutAmount = `${classicLine[1]}\n${classicLine[2]}`;
      }
    }

    if (amount <= 0) return;

    // 3. Strip leading date & standalone time tokens so only "Transaction details" remain
    const detailsLines = blockWithoutAmount
      .split('\n')
      .map((line) =>
        line
          .replace(
            /^(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*,?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i,
            ''
          )
          .replace(/^\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/, '')
          .trim()
      )
      .filter(Boolean);

    const parsedDetails = parseUpiTransactionDetailsBlock(detailsLines.join('\n'));

    // Override direction if explicit CR/DR was present on a classic bank PDF
    let finalType: TransactionType = parsedDetails.type;
    if (finalType !== 'TRANSFER') {
      if (explicitCrDr === 'CR' || explicitCrDr === 'CREDIT') finalType = 'INCOME';
      else if (explicitCrDr === 'DR' || explicitCrDr === 'DEBIT') finalType = 'EXPENSE';
      else if (
        finalType === 'EXPENSE' &&
        /salary|payroll|deposit|bonus|refund|neft\s*cr/i.test(parsedDetails.title) &&
        !/^paid\s+to\b/i.test(parsedDetails.title)
      ) {
        finalType = 'INCOME';
      }
    }

    const dedupeKey = makeDedupeKey(
      dateStr,
      finalType,
      amount,
      parsedDetails.title,
      parsedDetails.upiTransactionId
    );
    if (seen.has(dedupeKey)) {
      duplicatesRemoved++;
      return;
    }
    seen.add(dedupeKey);

    registerDiscoveredAccount(
      accountsMap,
      parsedDetails.bankName,
      parsedDetails.accountLast4,
      parsedDetails.accountId
    );

    const { category, paymentMethod } = categorizeNarration(parsedDetails.title, finalType);
    if (finalType === 'INCOME') totalCredits += amount;
    else if (finalType === 'EXPENSE') totalDebits += amount;
    else totalSelfTransfers += amount;

    if (!minDate || dateStr < minDate) minDate = dateStr;
    if (!maxDate || dateStr > maxDate) maxDate = dateStr;

    const resolvedAccountId = parsedDetails.accountId || fallbackAccountId;
    const bankLabel =
      parsedDetails.bankName && parsedDetails.accountLast4
        ? `${parsedDetails.bankName} ${parsedDetails.accountLast4}`
        : undefined;

    transactions.push({
      id: `upi_tx_${Date.now()}_${idx}`,
      title: parsedDetails.title,
      amount,
      type: finalType,
      category,
      date: dateStr,
      time,
      paymentMethod: parsedDetails.upiTransactionId ? 'UPI' : paymentMethod,
      accountId: resolvedAccountId,
      merchant: parsedDetails.merchant,
      upiTransactionId: parsedDetails.upiTransactionId,
      paidByOrToLine: parsedDetails.paidByOrToLine,
      bankLabel,
      notes: parsedDetails.upiTransactionId
        ? `UPI Transaction ID: ${parsedDetails.upiTransactionId}${
            parsedDetails.paidByOrToLine ? ` • ${parsedDetails.paidByOrToLine}` : ''
          }`
        : undefined,
      isRecurring:
        finalType === 'EXPENSE' &&
        /rent|netflix|spotify|bescom|airtel|emi|autopay|mandate/i.test(parsedDetails.title),
    });
  });

  return {
    transactions,
    discoveredAccounts: Array.from(accountsMap.values()),
    duplicatesRemoved,
    totalCredits,
    totalDebits,
    totalSelfTransfers,
    minDate,
    maxDate,
  };
}

/**
 * Parses raw CSV (or pasted UPI statement text) completely offline.
 * Supports:
 * 1) Exact Google Pay / Paytm UPI CSV format ("Date & time", "Transaction details", "Amount")
 *    including multi-line quoted cells with "UPI Transaction ID: ..." and "Paid by <Bank> <Last4>"
 * 2) Standard Indian Bank CSVs ("Date, Narration, Withdrawal, Deposit")
 * 3) Raw pasted UPI statement text blocks copied directly from a PDF statement
 */
export const parseOfflineStatementCSV = (
  csvContent: string,
  accountId: string = 'acc_hdfc_01'
): ParsedStatementResult => {
  const trimmed = csvContent.trim();

  // If user pasted raw multi-line UPI text without commas, parse via UPI block parser directly
  if (
    !trimmed.includes(',') &&
    (/UPI\s*Transaction\s*ID/i.test(trimmed) ||
      /\b(?:Paid\s+to|Received\s+from|Self\s+transfer)\b/i.test(trimmed))
  ) {
    const blockRes = parseUpiStatementTextBlocks(trimmed.split(/\r?\n/), accountId);
    const bankLabel =
      blockRes.discoveredAccounts.length > 0
        ? `UPI Statement (${blockRes.discoveredAccounts.map((a) => `${a.bankName} ${a.accountNumberMasked.slice(-4)}`).join(', ')})`
        : 'UPI Transaction Statement';
    return {
      bankName: bankLabel,
      totalRecords: blockRes.transactions.length,
      totalCredits: blockRes.totalCredits,
      totalDebits: blockRes.totalDebits,
      totalSelfTransfers: blockRes.totalSelfTransfers,
      dateRange:
        blockRes.minDate && blockRes.maxDate
          ? `${blockRes.minDate} to ${blockRes.maxDate}`
          : 'Extracted Period',
      transactions: blockRes.transactions,
      discoveredAccounts: blockRes.discoveredAccounts,
      duplicatesRemoved: blockRes.duplicatesRemoved,
      parsingNotes: [
        `Parsed ${blockRes.transactions.length} UPI statement rows (${blockRes.discoveredAccounts.length} linked bank account(s) detected)`,
        'Deduplicated by 12-digit UPI Transaction ID & excluded self-transfers from spending',
      ],
    };
  }

  const parsedPapa = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: true,
  });

  const parsedTransactions: Transaction[] = [];
  const accountsMap = new Map<string, BankAccount>();
  let totalCredits = 0;
  let totalDebits = 0;
  let totalSelfTransfers = 0;
  let minDate = '';
  let maxDate = '';
  let duplicatesRemoved = 0;
  const seenKeys = new Set<string>();

  if (
    parsedPapa.data &&
    parsedPapa.data.length > 0 &&
    parsedPapa.meta.fields &&
    parsedPapa.meta.fields.length >= 2
  ) {
    const fields = parsedPapa.meta.fields;
    const lowerMap = fields.map((f) => ({ raw: f, low: f.toLowerCase().trim() }));

    const dateKey =
      lowerMap.find((f) => f.low.includes('date'))?.raw || fields[0];
    const timeColKey = lowerMap.find(
      (f) => f.raw !== dateKey && f.low === 'time'
    )?.raw;
    const descKey =
      lowerMap.find(
        (f) =>
          f.low.includes('transaction detail') ||
          f.low.includes('details') ||
          f.low.includes('narration') ||
          f.low.includes('description') ||
          f.low.includes('particular') ||
          f.low.includes('merchant') ||
          f.low.includes('title')
      )?.raw || fields[1];

    const upiIdColKey = lowerMap.find(
      (f) => f.low.includes('upi') && f.low.includes('id')
    )?.raw;
    const paidByColKey = lowerMap.find(
      (f) =>
        f.low.includes('paid by') ||
        f.low.includes('paid to') ||
        f.low.includes('account') ||
        f.low.includes('bank')
    )?.raw;

    const debitKey = lowerMap.find(
      (f) =>
        f.raw !== descKey &&
        (f.low.includes('withdrawal') || f.low.includes('debit') || /\bdr\b/.test(f.low))
    )?.raw;
    const creditKey = lowerMap.find(
      (f) =>
        f.raw !== descKey &&
        (f.low.includes('deposit') || f.low.includes('credit') || /\bcr\b/.test(f.low))
    )?.raw;
    const amountKey = lowerMap.find((f) => f.low.includes('amount'))?.raw;
    const typeKey = lowerMap.find((f) => f.low.includes('type') || f.low.includes('dr/cr'))?.raw;

    parsedPapa.data.forEach((row, index) => {
      const rawDateAndTime = [row[dateKey] || '', timeColKey ? row[timeColKey] || '' : '']
        .filter(Boolean)
        .join(' ');
      const { date: dateStr, time } = parseUpiDateAndTime(rawDateAndTime);

      const combinedDetailsParts = [row[descKey] || ''];
      if (upiIdColKey && row[upiIdColKey]) {
        combinedDetailsParts.push(`UPI Transaction ID: ${row[upiIdColKey]}`);
      }
      if (paidByColKey && paidByColKey !== descKey && row[paidByColKey]) {
        const pb = row[paidByColKey].trim();
        combinedDetailsParts.push(
          /^(paid|debited|credited)/i.test(pb) ? pb : `Paid by ${pb}`
        );
      }

      const rawDetails = combinedDetailsParts.filter(Boolean).join('\n');
      const isUpiStyleRow =
        /UPI\s*Transaction\s*ID/i.test(rawDetails) ||
        /^(?:Paid\s+to|Received\s+from|Self\s+transfer)/i.test(rawDetails.trim()) ||
        Boolean(upiIdColKey);

      const parsedDetails = parseUpiTransactionDetailsBlock(rawDetails || 'Bank Transaction');

      let amount = 0;
      let type: TransactionType = parsedDetails.type;

      if (debitKey || creditKey) {
        const debitVal = debitKey ? cleanNumeric(row[debitKey]) : 0;
        const creditVal = creditKey ? cleanNumeric(row[creditKey]) : 0;
        if (creditVal > 0) {
          amount = creditVal;
          if (type !== 'TRANSFER') type = 'INCOME';
        } else if (debitVal > 0) {
          amount = debitVal;
          if (type !== 'TRANSFER') type = 'EXPENSE';
        }
      } else if (amountKey) {
        const rawAmtStr = String(row[amountKey] || '');
        const rawAmt = cleanNumeric(rawAmtStr);
        amount = Math.abs(rawAmt);
        const tVal = typeKey ? (row[typeKey] || '').toUpperCase() : '';

        if (!isUpiStyleRow) {
          if (
            tVal.includes('CR') ||
            tVal.includes('INCOME') ||
            tVal.includes('CREDIT') ||
            rawAmtStr.trim().startsWith('+')
          ) {
            type = 'INCOME';
          } else if (tVal.includes('TRANSFER') || /self\s*transfer/i.test(rawDetails)) {
            type = 'TRANSFER';
          } else {
            type = 'EXPENSE';
          }
        } else {
          // In UPI statements ("Date & time, Transaction details, Amount"), amount has no +/- sign;
          // direction comes from "Paid to ..." vs "Received from ..." vs "Self transfer to ..."
          if (rawAmtStr.trim().startsWith('+') && type !== 'TRANSFER') type = 'INCOME';
          else if (rawAmtStr.trim().startsWith('-') && type !== 'TRANSFER') type = 'EXPENSE';
        }
      }

      if (amount <= 0) return;

      const dedupeFp = makeDedupeKey(
        dateStr,
        type,
        amount,
        parsedDetails.title,
        parsedDetails.upiTransactionId
      );
      if (seenKeys.has(dedupeFp)) {
        duplicatesRemoved++;
        return;
      }
      seenKeys.add(dedupeFp);

      registerDiscoveredAccount(
        accountsMap,
        parsedDetails.bankName,
        parsedDetails.accountLast4,
        parsedDetails.accountId
      );

      const { category, paymentMethod } = categorizeNarration(parsedDetails.title, type);
      if (type === 'INCOME') totalCredits += amount;
      else if (type === 'EXPENSE') totalDebits += amount;
      else totalSelfTransfers += amount;

      if (!minDate || dateStr < minDate) minDate = dateStr;
      if (!maxDate || dateStr > maxDate) maxDate = dateStr;

      const resolvedAccountId = parsedDetails.accountId || accountId;
      const bankLabel =
        parsedDetails.bankName && parsedDetails.accountLast4
          ? `${parsedDetails.bankName} ${parsedDetails.accountLast4}`
          : undefined;

      parsedTransactions.push({
        id: `stmt_tx_${Date.now()}_${index}`,
        title: parsedDetails.title,
        amount,
        type,
        category,
        date: dateStr,
        time,
        paymentMethod: parsedDetails.upiTransactionId ? 'UPI' : paymentMethod,
        accountId: resolvedAccountId,
        merchant: parsedDetails.merchant,
        upiTransactionId: parsedDetails.upiTransactionId,
        paidByOrToLine: parsedDetails.paidByOrToLine,
        bankLabel,
        notes: parsedDetails.upiTransactionId
          ? `UPI Transaction ID: ${parsedDetails.upiTransactionId}${
              parsedDetails.paidByOrToLine ? ` • ${parsedDetails.paidByOrToLine}` : ''
            }`
          : undefined,
        isRecurring:
          type === 'EXPENSE' &&
          /rent|netflix|spotify|bescom|airtel|emi|autopay|mandate/i.test(parsedDetails.title),
      });
    });
  }

  const discoveredAccounts = Array.from(accountsMap.values());
  let detectedBank = 'UPI / Bank Statement';
  if (discoveredAccounts.length > 0) {
    detectedBank = `UPI Statement (${discoveredAccounts
      .map((a) => `${a.bankName} ${a.accountNumberMasked.slice(-4)}`)
      .join(', ')})`;
  } else if (/india post/i.test(csvContent)) {
    detectedBank = 'India Post Payment Bank';
  } else if (/bank of india/i.test(csvContent)) {
    detectedBank = 'Bank of India';
  } else if (/hdfc/i.test(csvContent)) {
    detectedBank = 'HDFC Bank Ltd';
  } else if (/sbi|state bank/i.test(csvContent)) {
    detectedBank = 'State Bank of India';
  }

  return {
    bankName: detectedBank,
    totalRecords: parsedTransactions.length,
    totalCredits,
    totalDebits,
    totalSelfTransfers,
    dateRange: minDate && maxDate ? `${minDate} to ${maxDate}` : 'Extracted Period',
    transactions: parsedTransactions,
    discoveredAccounts,
    duplicatesRemoved,
    parsingNotes: [
      `Detected format: ${detectedBank}`,
      `Parsed ${parsedTransactions.length} verified rows (${duplicatesRemoved} duplicates skipped)`,
      discoveredAccounts.length > 0
        ? `Auto-linked ${discoveredAccounts.length} bank account(s) from UPI settlement lines`
        : '100% local parsing — zero raw bank statement bytes sent externally',
    ],
  };
};

/**
 * Parses a real .csv, .pdf, or .txt statement File uploaded by the user completely in browser memory.
 * Specifically supports the multi-line Google Pay / Paytm / PhonePe UPI Statement PDF table:
 *   Date & time | Transaction details | Amount
 */
export async function parseUploadedBankStatementFile(
  file: File,
  accountId: string = 'acc_hdfc_01'
): Promise<ParsedStatementResult> {
  const lowerName = file.name.toLowerCase();

  if (
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.txt') ||
    file.type === 'text/csv' ||
    file.type === 'text/plain'
  ) {
    const csvText = await file.text();
    const res = parseOfflineStatementCSV(csvText, accountId);
    return {
      ...res,
      bankName: res.bankName === 'UPI / Bank Statement' ? `CSV: ${file.name}` : res.bankName,
    };
  }

  if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const allLines: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      // Group text items by approximate Y coordinate (3pt tolerance) to reconstruct visual rows
      const rowsByY = new Map<number, { x: number; str: string }[]>();
      for (const item of content.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const rawY = item.transform?.[5] ?? 0;
        // Find an existing Y bucket within 3.5 points so slightly offset columns stay on the same row
        let matchedY: number | undefined;
        for (const existingY of rowsByY.keys()) {
          if (Math.abs(existingY - rawY) <= 3.5) {
            matchedY = existingY;
            break;
          }
        }
        const bucketY = matchedY ?? Math.round(rawY * 10) / 10;
        const x = item.transform?.[4] ?? 0;
        const bucket = rowsByY.get(bucketY) || [];
        bucket.push({ x, str: item.str.trim() });
        rowsByY.set(bucketY, bucket);
      }

      const sortedYs = Array.from(rowsByY.keys()).sort((a, b) => b - a);
      for (const y of sortedYs) {
        const line = (rowsByY.get(y) || [])
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join(' ')
          // Merge split currency symbol e.g. "₹ 50" -> "₹50"
          .replace(/(₹|Rs\.?|INR)\s+(\d)/gi, '$1$2');
        allLines.push(line);
      }
    }

    const blockRes = parseUpiStatementTextBlocks(allLines, accountId);
    const fullText = allLines.join('\n');

    let detectedBank = `UPI PDF: ${file.name}`;
    if (blockRes.discoveredAccounts.length > 0) {
      detectedBank = `UPI PDF (${blockRes.discoveredAccounts
        .map((a) => `${a.bankName} ${a.accountNumberMasked.slice(-4)}`)
        .join(', ')})`;
    } else if (/google\s*pay|gpay/i.test(fullText)) {
      detectedBank = 'Google Pay UPI Statement PDF';
    } else if (/paytm/i.test(fullText)) {
      detectedBank = 'Paytm UPI Statement PDF';
    } else if (/phonepe/i.test(fullText)) {
      detectedBank = 'PhonePe UPI Statement PDF';
    } else if (/hdfc/i.test(fullText)) {
      detectedBank = 'HDFC Bank PDF Statement';
    } else if (/sbi|state bank/i.test(fullText)) {
      detectedBank = 'SBI Bank PDF Statement';
    }

    return {
      bankName: detectedBank,
      totalRecords: blockRes.transactions.length,
      totalCredits: blockRes.totalCredits,
      totalDebits: blockRes.totalDebits,
      totalSelfTransfers: blockRes.totalSelfTransfers,
      dateRange:
        blockRes.minDate && blockRes.maxDate
          ? `${blockRes.minDate} to ${blockRes.maxDate}`
          : 'Extracted PDF Period',
      transactions: blockRes.transactions,
      discoveredAccounts: blockRes.discoveredAccounts,
      duplicatesRemoved: blockRes.duplicatesRemoved,
      parsingNotes: [
        `Extracted ${pdf.numPages} PDF page(s) locally via PDF.js`,
        `Parsed ${blockRes.transactions.length} UPI transactions across ${
          blockRes.discoveredAccounts.length || 1
        } bank account(s)`,
        'Deduplicated by UPI Transaction ID & separated Self Transfers automatically',
      ],
    };
  }

  throw new Error('Unsupported file format. Please upload a .pdf or .csv UPI / bank statement.');
}

/**
 * Generates a real valid PDF statement in the EXACT Google Pay / UPI Statement table layout
 * shown in the user's reference image:
 *   Date & time | Transaction details | Amount
 */
export function buildSamplePdfBlob(): Blob {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const rows = [
    {
      date: '01 Apr, 2026',
      time: '11:36 AM',
      detail: 'Paid to SHRI SHAMRAO PATIL YADRAVKAR EDUCATIONAL AND CHARITABLE TRUST',
      upiId: 'UPI Transaction ID: 645776339229',
      bank: 'Paid by India Post Payment Bank 0262',
      amount: 'Rs. 50',
    },
    {
      date: '01 Apr, 2026',
      time: '12:59 PM',
      detail: 'Received from Ananya Potadar',
      upiId: 'UPI Transaction ID: 645713846834',
      bank: 'Paid to Bank of India 3628',
      amount: 'Rs. 100',
    },
    {
      date: '01 Apr, 2026',
      time: '04:50 PM',
      detail: 'Self transfer to India Post Payment Bank 0262',
      upiId: 'UPI Transaction ID: 645750350390',
      bank: 'Paid by HDFC Bank 1442',
      amount: 'Rs. 700',
    },
    {
      date: '02 Apr, 2026',
      time: '10:05 AM',
      detail: 'Paid to Suresh Kumar House Rent Indiranagar',
      upiId: 'UPI Transaction ID: 645812904411',
      bank: 'Paid by HDFC Bank 1442',
      amount: 'Rs. 12,000',
    },
    {
      date: '05 Apr, 2026',
      time: '08:15 PM',
      detail: 'Paid to Swiggy Food Delivery',
      upiId: 'UPI Transaction ID: 645899231088',
      bank: 'Paid by India Post Payment Bank 0262',
      amount: 'Rs. 480',
    },
    {
      date: '10 Apr, 2026',
      time: '09:30 AM',
      detail: 'Received from TechCorp India Salary Credit',
      upiId: 'UPI Transaction ID: 645940118200',
      bank: 'Paid to HDFC Bank 1442',
      amount: 'Rs. 65,000',
    },
  ];

  const ops: string[] = [];
  const drawText = (x: number, y: number, size: number, text: string) => {
    ops.push(`BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(text)}) Tj ET`);
  };

  drawText(40, 755, 13, 'UPI Transaction Statement');
  drawText(40, 728, 10, 'Date & time');
  drawText(145, 728, 10, 'Transaction details');
  drawText(505, 728, 10, 'Amount');

  let y = 698;
  for (const r of rows) {
    drawText(40, y, 9, r.date);
    drawText(145, y, 9, r.detail);
    drawText(505, y, 9, r.amount);

    drawText(40, y - 14, 8, r.time);
    drawText(145, y - 14, 8, r.upiId);

    drawText(145, y - 28, 8, r.bank);
    y -= 56;
  }

  const streamBody = ops.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamBody.length} >>\nstream\n${streamBody}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
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

/**
 * Pre-configured realistic UPI Transaction Statements matching the exact user screenshot format:
 *   Date & time | Transaction details | Amount
 */
export const SAMPLE_STATEMENTS = [
  {
    id: 'gpay_upi_statement_exact',
    title: 'UPI Statement — IPPB 0262, BOI 3628 & HDFC 1442',
    bankName: 'Multi-Bank UPI Statement (IPPB • BOI • HDFC)',
    accountId: 'acc_hdfc_01',
    accountNumber: '0262 • 3628 • 1442',
    dateRange: '01 Apr, 2026 - 20 Apr, 2026',
    summary:
      'Exact Date & time | Transaction details | Amount format with UPI Transaction IDs, Paid to, Received from, and Self transfer',
    csv: `Date & time,Transaction details,Amount
"01 Apr, 2026
11:36 AM","Paid to SHRI SHAMRAO PATIL YADRAVKAR EDUCATIONAL AND CHARITABLE TRUST
UPI Transaction ID: 645776339229
Paid by India Post Payment Bank 0262","₹50"
"01 Apr, 2026
12:59 PM","Received from Ananya Potadar
UPI Transaction ID: 645713846834
Paid to Bank of India 3628","₹100"
"01 Apr, 2026
04:50 PM","Self transfer to India Post Payment Bank 0262
UPI Transaction ID: 645750350390
Paid by HDFC Bank 1442","₹700"
"02 Apr, 2026
10:05 AM","Paid to Suresh Kumar House Rent Indiranagar
UPI Transaction ID: 645812904411
Paid by HDFC Bank 1442","₹12,000"
"05 Apr, 2026
08:15 PM","Paid to Swiggy Food Delivery
UPI Transaction ID: 645899231088
Paid by India Post Payment Bank 0262","₹480"
"10 Apr, 2026
09:30 AM","Received from TechCorp India Salary Credit
UPI Transaction ID: 645940118200
Paid to HDFC Bank 1442","₹65,000"
"14 Apr, 2026
06:20 PM","Paid to Airtel Fiber Broadband Bill
UPI Transaction ID: 646012883910
Paid by Bank of India 3628","₹1,061"
"18 Apr, 2026
09:10 PM","Paid to Netflix Subscription AutoPay
UPI Transaction ID: 646088712304
Paid by HDFC Bank 1442","₹499"`,
  },
  {
    id: 'oct_upi_statement',
    title: 'October UPI Passbook — Salary, Groceries & Bills',
    bankName: 'Multi-Bank UPI Statement (HDFC 1442 • SBI 8821)',
    accountId: 'acc_hdfc_01',
    accountNumber: '1442 • 8821',
    dateRange: '01 Oct, 2026 - 25 Oct, 2026',
    summary:
      'Received from Client Consulting +₹42,000, Blinkit Groceries, IndianOil Fuel, BESCOM Bill & Self transfer',
    csv: `Date & time,Transaction details,Amount
"10 Oct, 2026
11:15 AM","Received from Acme Consulting Milestone
UPI Transaction ID: 691022837461
Paid to State Bank of India 8821","₹42,000"
"12 Oct, 2026
07:42 PM","Paid to Blinkit Quick Groceries
UPI Transaction ID: 691044918273
Paid by HDFC Bank 1442","₹1,150"
"15 Oct, 2026
05:18 PM","Self transfer to State Bank of India 8821
UPI Transaction ID: 691077362519
Paid by HDFC Bank 1442","₹5,000"
"18 Oct, 2026
02:10 PM","Paid to MakeMyTrip Flight Booking
UPI Transaction ID: 691099182734
Paid by State Bank of India 8821","₹5,400"
"22 Oct, 2026
04:05 PM","Paid to Apollo Pharmacy Clinic
UPI Transaction ID: 691122938475
Paid by HDFC Bank 1442","₹1,100"`,
  },
];
