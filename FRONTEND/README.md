# CashCompass — Offline-First Explainable Personal Finance Assistant

> **Problem Statement 4:** Personal Finance Assistant That Explains Its Answers  
> **Platform:** React Native (Expo) • TypeScript • Expo Router • Native SVG  
> **Design Theme:** Soft Lavender & Clean White with Vector Mascot ("Finny the Fox")

---

## 🌟 Highlights & Architecture

- **100% Offline-First Architecture:** All calculations, spending analysis, anomaly detection, recurring payment schedules, and purchase simulations occur strictly on the physical device with zero cloud APIs, zero live LLM dependencies, and zero telemetry. Works in Airplane Mode.
- **Explainable Financial Decisions:** Every single recommendation, affordability assessment, and anomaly notification is accompanied by a transparent "How did we calculate this?" step-by-step mathematical breakdown showing inputs, formulas, reserve floor preservation, and explicit model limitations.
- **Indian Financial Context & Formatting:** Native support for UPI transactions, NEFT, IMPS, ATM withdrawals, BESCOM Electricity, Indiranagar House Rent, Swiggy/Zomato, Blinkit, and formatted in Indian Rupee notation (`₹1,25,000.00`).
- **Core Unique Feature — Purchase Decision Simulator:** Simulates major capital purchases (e.g. *"Can I afford to purchase a laptop for ₹50,000 next month?"*) across 3 deterministic scenarios:
  1. **Buy Now:** Evaluates instant balance erosion and emergency reserve floor buffer.
  2. **Buy Next Month:** Factors in verified recurring salary deposits and committed obligations to compute projected net cash flow.
  3. **Save for 3 Months:** Amortizes savings over 90 days with zero stress on daily liquidity.

---

## 📱 Implemented Screen Directory

1. **Splash & Onboarding (`src/app/onboarding.tsx`):**
   - CashCompass branding, 3 core value propositions, vector mascot, page indicators, and device privacy pledge.
2. **Home Dashboard (`src/app/index.tsx`):**
   - Personal greeting (*"Hey, Parth 👋"*), offline status badge, notification bell.
   - Total Balance (`₹48,320`), eye visibility toggle, HDFC Bank primary card chip with masked card number `•••• 4312`.
   - Compact Dual Cards: Total Income `₹1,05,000` (+8.4%) & Total Expenses `₹56,680` (-4.1%).
   - Spendings & Goals Donut Chart with centered vector mascot, percentage gauge (54%), and category dots.
   - AI Insights card with lightbulb bubble, feature shortcuts, savings goal card, and recent transaction log.
3. **Transaction History & Filter (`src/app/transactions.tsx`):**
   - Live search by merchant, title, note, or amount.
   - Filter chips: All, Expense, Income, Recurring.
   - Category filters: Food, Rent, Shopping, Travel, Bills, Entertainment, Healthcare, etc.
   - Transaction detail modal with storage guarantees and timestamp metadata.
4. **Spending Insights & Visuals (`src/app/insights.tsx`):**
   - 3 interactive working tabs: **Spending**, **Recurring**, and **Anomalies**.
   - AI Forecast pill-shaped vertical bar chart (Sun, Mon, Tue with highlighted day `₹1,730`, Wed, Thr, Fri, Sat).
   - Category distribution comparison cards.
5. **Recurring Payments Tracker (`src/app/recurring.tsx`):**
   - Committed monthly total calculation (`₹17,429/month`).
   - Active and upcoming subscription cards: Rent, BESCOM Electricity, Airtel Fiber Broadband, Netflix, Spotify, Bajaj Consumer EMI.
   - Explicit disclaimer regarding automated pattern estimation.
6. **Financial Anomaly Detection (`src/app/anomalies.tsx`):**
   - Flags transactions exceeding 2.2x category baseline without accusing the user of fraud.
   - Interactive local review actions: *"Confirm Legitimate"* or *"Ignore Alert"*.
7. **Purchase Decision Simulator (`src/app/simulator.tsx`):**
   - Live interactive parameters: Item name, purchase cost (₹), customizable reserve floor (default ₹15,000), priority level.
   - Preset chips (Laptop ₹50k, Phone ₹25k, Bike ₹1.2L, Trip ₹18k).
   - Evaluates 3 scenarios with Green (Safe), Yellow (Caution), and Red (Depletes Reserve) status badges.
   - Collapsible mathematical audit trail: Starting balance, Expected income, Expected expenses, Net remaining, Safety buffer.
8. **Detailed Financial Analysis (`src/app/analysis.tsx`):**
   - Runway, monthly burn rate, discretionary surplus pool, and data coverage metrics.
   - Transparent documentation of model limitations (steady income assumptions, unbilled credit card charges, price inflation).
9. **Offline AI Assistant Chat (`src/app/assistant.tsx`):**
   - Friendly mascot identity ("Finny").
   - Local rule-based engine answering key financial queries with structured calculation cards:
     - *"Can I afford a laptop next month?"*
     - *"Where did my money go?"*
     - *"What are my recurring payments?"*
     - *"Why did my spending increase?"*
     - *"How much can I save?"*
10. **Gamified Savings (`src/app/goals.tsx`):**
    - Level 7 golden star badge, 9,450 XP, saved streak indicators.
    - Today's mission (*"Save ₹500 on dining this week"*).
    - Badges showcase (Level 4 Saver, 10 Cups Saved, Grocery Guru).
    - #1 Monthly Savings Trophy Card (`₹24,000.00`).
    - Interactive goal creator with real-time progress updates.
11. **Settings & Local Storage (`src/app/settings.tsx`):**
    - Profile management, managed bank accounts overview.
    - Local SQLite architecture status (25 transactions, 0 KB cloud sync).
    - Export offline database snapshot as formatted JSON.
    - Reset demo data button to restore baseline figures.

---

## 🚀 How to Run the Mobile Application

### Prerequisites
- Node.js (v18+)
- npm or pnpm
- Expo Go app on your Android or iOS device (or an Android Emulator / iOS Simulator)

### Step 1: Open the Project Directory
```bash
cd finsight-mobile
```

### Step 2: Dependencies Installation
Dependencies are already installed. If running on a new machine:
```bash
npm install
```

### Step 3: Start the Expo Development Server
```bash
npx expo start
```
- **Run on Android Emulator:** Press `a` in the terminal or run `npx expo start --android`.
- **Run on Physical Phone:** Scan the QR code shown in the terminal using the **Expo Go** app on Android (or Camera app on iOS).
- **Run in Web Browser:** Press `w` in the terminal to view in Chrome / Edge.

### Step 4: Verify TypeScript & Code Quality
```bash
npm run lint
```
(Runs `tsc --noEmit` and verifies type safety).

---

## 📂 Project Structure

```
finsight-mobile/
├── assets/
├── src/
│   ├── app/                    # Expo Router Screen Routes
│   │   ├── _layout.tsx         # Global Providers & Stack Configuration
│   │   ├── index.tsx           # Home Dashboard & Quick Actions
│   │   ├── onboarding.tsx      # Onboarding & Privacy Welcome
│   │   ├── transactions.tsx    # Transaction Search, History & Details
│   │   ├── insights.tsx        # Spending Trends & Working Tabs
│   │   ├── recurring.tsx       # Recurring Commitments & Subscriptions
│   │   ├── anomalies.tsx       # Statistical Variance & Anomaly Review
│   │   ├── simulator.tsx       # Purchase Decision Simulator (Core Feature)
│   │   ├── analysis.tsx        # Detailed Limitations & Confidence Analysis
│   │   ├── assistant.tsx       # Local Rule-Based Chat Assistant
│   │   ├── goals.tsx           # Gamified Savings, Badges & Missions
│   │   └── settings.tsx        # Profile, Local Storage & Reset Demo
│   ├── components/             # Reusable UI & Visuals
│   │   ├── BalanceCard.tsx
│   │   ├── BottomNavigation.tsx
│   │   ├── ForecastBarChart.tsx
│   │   ├── Header.tsx
│   │   ├── IncomeExpenseCard.tsx
│   │   ├── InsightCard.tsx
│   │   ├── MascotAvatar.tsx    # Resolution-independent SVG Vector Mascot
│   │   ├── OfflineIndicator.tsx
│   │   ├── PurchaseScenarioCard.tsx
│   │   ├── RecurringPaymentCard.tsx
│   │   ├── SavingsGoalCard.tsx
│   │   ├── SpendingDonutChart.tsx
│   │   └── TransactionItem.tsx
│   ├── context/
│   │   └── FinanceContext.tsx  # Reactive Local State Store & Actions
│   ├── services/               # Deterministic Financial Engines
│   │   ├── anomalyDetector.ts
│   │   ├── assistantEngine.ts
│   │   ├── financeEngine.ts
│   │   ├── forecasting.ts
│   │   ├── recurringDetector.ts
│   │   └── simulator.ts
│   ├── data/                   # Realistic Indian Financial Seed Data
│   │   ├── demoAccounts.ts
│   │   ├── demoGoals.ts
│   │   └── demoTransactions.ts
│   ├── constants/              # Theme Tokens & Category Metadata
│   │   ├── categories.ts
│   │   └── theme.ts
│   └── types/                  # Strict TypeScript Data Models
│       └── finance.ts
├── app.json
├── babel.config.js
├── package.json
└── tsconfig.json
```

---

## 🔒 Privacy & Offline Integrity Guarantees

1. **Zero Cloud Network Calls:** The entire financial calculation engine, including cash flow forecasting and purchase simulation, executes synchronously in Javascript without internet connectivity.
2. **Transparent AI:** The assistant engine relies on explicit deterministic formulas rather than generative hallucinations.
3. **No Fake Bank Sync:** The demo data is explicitly presented as on-device mock data, providing a turnkey foundation to plug in local CSV statement parsers and `expo-sqlite` without architectural rework.
