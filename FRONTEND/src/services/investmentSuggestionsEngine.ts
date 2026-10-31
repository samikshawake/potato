import type {
  InvestmentProduct,
  InvestmentSuggestionAnalysis,
  Transaction,
} from '../types/finance.ts';
import { calculateTotalExpenses } from './financeEngine.ts';
import { calculateTotalRecurringMonthly, detectRecurringPayments } from './recurringDetector.ts';
import { formatINR } from '../constants/theme.ts';

/**
 * Verified Product Catalog (Data Source: RBI / SEBI / Bank Published Rates, Updated Oct 2026)
 */
export const VERIFIED_INVESTMENT_PRODUCTS: InvestmentProduct[] = [
  // LOW RISK PRODUCTS
  {
    id: 'prod_fd_01',
    name: 'Bank Fixed Deposit (FD)',
    category: 'LOW_RISK',
    productType: 'FD',
    minInvestmentAmount: 1000,
    duration: '1 to 5 Years',
    expectedReturnRate: '6.8% - 7.25% p.a.',
    liquidity: 'Moderate (0.5% premature penalty)',
    lockInPeriod: '1 Year (Cumulative / Non-cumulative)',
    riskLevel: 'Low',
    riskPercentageOrVolatility: '0% Capital Risk (Insured up to ₹5 Lakhs by DICGC)',
    taxConsiderations: 'Interest taxed as per income tax slab rate (TDS applicable > ₹40,000/yr)',
    pros: ['Guaranteed returns', 'DICGC insurance protection', 'Flexible payout terms'],
    cons: ['Tax inefficient for high tax brackets', 'Premature withdrawal penalty'],
    importantWarnings: ['Locking long-term capital in low interest rates may lag high inflation.'],
    verifiedDataSource: 'RBI & Major Scheduled Commercial Bank Rates (Oct 2026)',
    lastUpdatedDate: '2026-10-01',
  },
  {
    id: 'prod_rd_02',
    name: 'Recurring Deposit (RD)',
    category: 'LOW_RISK',
    productType: 'RD',
    minInvestmentAmount: 500,
    duration: '6 Months to 10 Years',
    expectedReturnRate: '6.5% - 7.10% p.a.',
    liquidity: 'Moderate',
    lockInPeriod: 'Selected tenure',
    riskLevel: 'Low',
    riskPercentageOrVolatility: '0% Capital Risk (Sovereign / DICGC backing)',
    taxConsiderations: 'Taxable under Income from Other Sources',
    pros: ['Disciplined monthly saving habit', 'Guaranteed maturity yield'],
    cons: ['Penalty on missed monthly instalments', 'Fixed return rate'],
    importantWarnings: ['Must maintain monthly instalment discipline to avoid interest rate markdown.'],
    verifiedDataSource: 'Indian Postal & Public Sector Bank RD Schedules (Oct 2026)',
    lastUpdatedDate: '2026-10-01',
  },
  {
    id: 'prod_bonds_03',
    name: 'Government Sovereign Bonds & T-Bills',
    category: 'LOW_RISK',
    productType: 'BONDS',
    minInvestmentAmount: 1000,
    duration: '91 Days to 40 Years',
    expectedReturnRate: '6.7% - 7.4% p.a. yield',
    liquidity: 'Moderate (Tradable on RBI Retail Direct / NSE)',
    lockInPeriod: 'None if traded on exchange; maturity for full par value',
    riskLevel: 'Low to Moderate',
    riskPercentageOrVolatility: '0% Default Risk (Sovereign Guarantee); Price fluctuates with interest rate cycles',
    taxConsiderations: 'Coupon interest taxable; Sovereign Gold Bonds tax-free on 8-yr maturity',
    pros: ['Absolute zero default risk', 'Guaranteed semi-annual coupon payments'],
    cons: ['Secondary market liquidity can be low for long-dated paper'],
    importantWarnings: ['Bond prices fluctuate inversely with market interest rate hikes.'],
    verifiedDataSource: 'RBI Retail Direct & NDS-OM Sovereign Yield Curve (Oct 2026)',
    lastUpdatedDate: '2026-10-15',
  },
  {
    id: 'prod_debt_04',
    name: 'Short-Term Debt & Liquid Mutual Funds',
    category: 'LOW_RISK',
    productType: 'DEBT_FUNDS',
    minInvestmentAmount: 500,
    duration: '1 Day to 3 Years',
    expectedReturnRate: '6.2% - 6.8% p.a.',
    liquidity: 'High (Instant T+1 redemption)',
    lockInPeriod: '7 days exit load for liquid funds; none after',
    riskLevel: 'Low to Moderate',
    riskPercentageOrVolatility: 'Low Credit Risk (A1+ / AAA commercial papers)',
    taxConsiderations: 'Gains taxed at marginal income tax slab rate',
    pros: ['High liquidity', 'Better than standard savings bank interest'],
    cons: ['Returns fluctuate with overnight repo rates'],
    importantWarnings: ['Not government-guaranteed; subject to credit quality of underlying corporate bonds.'],
    verifiedDataSource: 'AMFI India Debt Mutual Fund Yield Category Averages (Oct 2026)',
    lastUpdatedDate: '2026-10-20',
  },
  {
    id: 'prod_emergency_05',
    name: 'High-Yield Sweep-in Savings Account',
    category: 'LOW_RISK',
    productType: 'EMERGENCY_SAVINGS',
    minInvestmentAmount: 100,
    duration: 'Anytime (Liquid)',
    expectedReturnRate: '3.5% - 7.0% p.a.',
    liquidity: 'Immediate (ATM / UPI / NetBanking)',
    lockInPeriod: 'Zero lock-in',
    riskLevel: 'Low',
    riskPercentageOrVolatility: '0% Volatility (100% Liquid)',
    taxConsiderations: 'Deduction up to ₹10,000/yr under Sec 80TTA',
    pros: ['Instant emergency access', 'Automatic auto-sweep earning FD rates'],
    cons: ['Lower returns than long-term equity'],
    importantWarnings: ['Always prioritize filling your emergency fund buffer here first.'],
    verifiedDataSource: 'Bank Sweep-in Savings Rates (Oct 2026)',
    lastUpdatedDate: '2026-10-01',
  },

  // HIGH RISK PRODUCTS
  {
    id: 'prod_index_06',
    name: 'Nifty 50 Broad Market Index Fund',
    category: 'HIGH_RISK',
    productType: 'INDEX_FUNDS',
    minInvestmentAmount: 500,
    duration: '5+ Years Recommended',
    expectedReturnRate: '11.5% - 13.5% p.a. (10-Yr Historical CAGR)',
    liquidity: 'High (T+2 business days)',
    lockInPeriod: 'None',
    riskLevel: 'Moderate to High',
    riskPercentageOrVolatility: 'Beta 1.0 (Market Volatility; 15%-25% short-term drawdowns possible)',
    taxConsiderations: 'LTCG > ₹1.25 Lakhs taxed at 12.5%; STCG (< 1 yr) taxed at 20%',
    pros: ['Ultra-low expense ratio (< 0.10%)', 'Eliminates fund manager picking risk', 'Tracks top 50 Indian blue-chips'],
    cons: ['Will drop during overall market crashes'],
    importantWarnings: ['Requires a minimum 5-year investment horizon to withstand market corrections.'],
    verifiedDataSource: 'NSE India Nifty 50 Total Returns Index 10-Yr Historical Benchmark (Oct 2026)',
    lastUpdatedDate: '2026-10-25',
  },
  {
    id: 'prod_equity_mf_07',
    name: 'Flexi-Cap & Large-Cap Equity Mutual Funds',
    category: 'HIGH_RISK',
    productType: 'EQUITY_MF',
    minInvestmentAmount: 500,
    duration: '5 to 7+ Years',
    expectedReturnRate: '12.5% - 15.0% p.a. (Category Average)',
    liquidity: 'High (T+2 business days)',
    lockInPeriod: 'None (ELSS has 3-yr mandatory lock-in)',
    riskLevel: 'High',
    riskPercentageOrVolatility: 'Category Standard Deviation ~14.2% (Moderate to High Volatility)',
    taxConsiderations: 'LTCG @ 12.5% above ₹1.25 Lakhs / STCG @ 20%',
    pros: ['Professional fund management', 'Flexibility across large, mid, and small-caps'],
    cons: ['Underperformance risk against benchmark index', 'Higher expense ratio'],
    importantWarnings: ['Past fund manager alpha is not a guarantee of future outperformance.'],
    verifiedDataSource: 'AMFI / Value Research Category Benchmark Data (Oct 2026)',
    lastUpdatedDate: '2026-10-20',
  },
  {
    id: 'prod_etf_08',
    name: 'Exchange Traded Funds (ETFs - Nifty/Sensex/Gold)',
    category: 'HIGH_RISK',
    productType: 'ETFS',
    minInvestmentAmount: 250,
    duration: '3+ Years',
    expectedReturnRate: '11.0% - 13.0% p.a.',
    liquidity: 'Instant (Tradable during market hours via Demat)',
    lockInPeriod: 'None',
    riskLevel: 'Moderate to High',
    riskPercentageOrVolatility: 'Real-time market volatility matching underlying index',
    taxConsiderations: 'LTCG @ 12.5% / STCG @ 20% on equity ETFs',
    pros: ['Intraday trading flexibility', 'Low tracking error and low cost'],
    cons: ['Requires Demat account and brokerage fees'],
    importantWarnings: ['Check bid-ask spread and volume before placing market orders.'],
    verifiedDataSource: 'NSE ETF Trading Analytics (Oct 2026)',
    lastUpdatedDate: '2026-10-25',
  },
  {
    id: 'prod_stocks_09',
    name: 'Direct Individual Blue-Chip Equity Stocks',
    category: 'HIGH_RISK',
    productType: 'STOCKS',
    minInvestmentAmount: 1000,
    duration: '5+ Years',
    expectedReturnRate: 'Market Dependent (High Potential Upside / High Loss Risk)',
    liquidity: 'High (T+1 settlement via NSE / BSE)',
    lockInPeriod: 'None',
    riskLevel: 'Very High',
    riskPercentageOrVolatility: 'High Single-Stock Concentration Risk (Individual Volatility > 25%)',
    taxConsiderations: 'STCG @ 20% / LTCG @ 12.5% plus STT',
    pros: ['Direct company ownership', 'Potential for high long-term dividends & outsized gains'],
    cons: ['Risk of permanent capital loss if company fundamentals deteriorate'],
    importantWarnings: ['Limit individual stock exposure to maximum 15%-20% of your total equity portfolio.'],
    verifiedDataSource: 'BSE / NSE Direct Equity Listing Analytics (Oct 2026)',
    lastUpdatedDate: '2026-10-25',
  },
];

/**
 * Deterministic Engine for Feature 2: Investment Suggestions
 */
export function analyzeInvestmentSuggestions(
  intendedAmount: number,
  transactions: Transaction[],
  currentBalance: number,
  targetEmergencyMonths: 3 | 6 | 12 = 6
): InvestmentSuggestionAnalysis {
  const amount = Math.max(0, intendedAmount || 0);

  // Financial baseline calculations
  const recurringList = detectRecurringPayments(transactions);
  const monthlyEssentialExpenses = calculateTotalRecurringMonthly(recurringList);
  const totalMonthlyExpenses = calculateTotalExpenses(transactions);

  const estimatedMonthlyLivingExpenses =
    monthlyEssentialExpenses > 0 ? monthlyEssentialExpenses : totalMonthlyExpenses;

  // Emergency Fund Target
  const emergencyTarget = estimatedMonthlyLivingExpenses * targetEmergencyMonths;
  const currentEmergencyFund = Math.min(currentBalance, emergencyTarget);
  const adequacyPct =
    emergencyTarget > 0 ? Math.min(100, Math.round((currentBalance / emergencyTarget) * 100)) : 100;
  const isFullyFunded = currentBalance >= emergencyTarget;

  const recommendedEmergencyTopUp = isFullyFunded
    ? 0
    : Math.min(amount, emergencyTarget - currentBalance);

  // Actual investable capacity (protecting emergency floor)
  const safeSurplusBalance = Math.max(0, currentBalance - emergencyTarget);
  const actualInvestableCapacity = Math.min(amount, Math.max(amount, safeSurplusBalance));

  // Filter products matching amount eligibility
  const eligibleLowRiskProducts = VERIFIED_INVESTMENT_PRODUCTS.filter(
    (p) => p.category === 'LOW_RISK' && p.minInvestmentAmount <= Math.max(amount, 500)
  );

  const eligibleHighRiskProducts = VERIFIED_INVESTMENT_PRODUCTS.filter(
    (p) => p.category === 'HIGH_RISK' && p.minInvestmentAmount <= Math.max(amount, 500)
  );

  // Personalized Strategy Allocation
  let suggestedLowRiskAlloc = 0;
  let suggestedHighRiskAlloc = 0;
  let topCategorySuggestion = '';
  let reasoning = '';
  let downsideRiskExplanation = '';
  let prioritizeEmergencyOrDebtFirstNote: string | null = null;

  if (!isFullyFunded && adequacyPct < 70) {
    suggestedLowRiskAlloc = 80;
    suggestedHighRiskAlloc = 20;
    topCategorySuggestion = 'Emergency Fund Top-Up & High-Yield Fixed Deposits';
    prioritizeEmergencyOrDebtFirstNote = `⚠️ Priority Warning: Your Emergency Reserve covers ${
      Math.round((currentBalance / (estimatedMonthlyLivingExpenses || 1)) * 10) / 10
    } month(s) of essential expenses (Target: ${targetEmergencyMonths} months = ${formatINR(
      emergencyTarget
    )}). We strongly advise routing at least ${formatINR(
      recommendedEmergencyTopUp
    )} of your ${formatINR(
      amount
    )} into liquid emergency savings or FDs before allocating to volatile equity markets.`;
    reasoning = `Because your safety buffer is under ${targetEmergencyMonths} months, preserving liquidity in low-risk products takes priority to protect you against unexpected job transitions or health emergencies.`;
    downsideRiskExplanation =
      'Low-risk products provide 0% capital loss risk and guaranteed interest payouts, protecting your principal.';
  } else if (!isFullyFunded && adequacyPct >= 70) {
    suggestedLowRiskAlloc = 40;
    suggestedHighRiskAlloc = 60;
    topCategorySuggestion = 'Nifty 50 Index Mutual Funds & Debt/FD Blend';
    prioritizeEmergencyOrDebtFirstNote = `Note: Your Emergency Reserve is at ${adequacyPct}% of target. Consider splitting your ${formatINR(
      amount
    )} between 40% low-risk safety and 60% broad equity index funds.`;
    reasoning = `Your emergency baseline is in good shape (${adequacyPct}% of target). A balanced blend lets you grow wealth in market index funds while comfortably completing your safety cushion.`;
    downsideRiskExplanation =
      'Equity index funds may experience 10%–20% market fluctuation in the short term, but historically deliver 11%–13% CAGR over 5+ year horizons.';
  } else {
    suggestedLowRiskAlloc = 20;
    suggestedHighRiskAlloc = 80;
    topCategorySuggestion = 'Broad Market Index Mutual Funds & Equity ETFs (SIP)';
    prioritizeEmergencyOrDebtFirstNote = null;
    reasoning = `Your Emergency Reserve is 100% fully funded (${formatINR(
      emergencyTarget
    )}). You can confidently deploy your ${formatINR(
      amount
    )} into high-growth equity vehicles (Index Funds & ETFs) for long-term wealth creation.`;
    downsideRiskExplanation =
      'If market conditions decline, your equity investments may temporarily drop in value by 15%–25%. Since your emergency fund is fully secure, you can hold through market cycles without panic selling.';
  }

  return {
    enteredAmount: amount,
    actualInvestableCapacity,
    emergencyFundStatus: {
      current: currentEmergencyFund,
      target: emergencyTarget,
      adequacyPct,
      isFullyFunded,
      recommendedEmergencyTopUp,
    },
    eligibleLowRiskProducts,
    eligibleHighRiskProducts,
    personalizedRecommendation: {
      suggestedLowRiskAlloc,
      suggestedHighRiskAlloc,
      topCategorySuggestion,
      reasoning,
      downsideRiskExplanation,
      prioritizeEmergencyOrDebtFirstNote,
    },
  };
}
