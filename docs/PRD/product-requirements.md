# MiBudget — Product Requirements

## What It Is

MiBudget is a private household budget management app for a Danish household (Michael + Tanja Mullally). It replaces spreadsheets with a structured, category-based view of income, spending, and projections.

It is **not** a general consumer product. It is purpose-built for one household with a second user (Tanja) sharing the same account, and a public demo account for showcasing.

---

## Users

| User | Role | Access |
|---|---|---|
| Michael | Admin | Full read/write |
| Tanja | Editor | Full read/write (same account) |
| Demo | Public sandbox | Full read/write (data resets after 15 min idle / on sign-out) |

---

## Core Features

### 1. Transaction Management
- Import bank CSV exports (Danish bank format)
- Auto-classify transactions via merchant rules and source rules
- Manual categorisation with inline editing
- Split transactions into multiple categories
- Statuses: `Complete`, `Pending Triage`, `Pending Reconciliation`, `Pending: <reason>`, `Excluded`, `Reconciled`
- Bulk actions: category assign, status change, delete
- Filter/search by date, category, status, amount, account
- Export to CSV/Drive

### 2. Budget
- Annual budget defined per category and sub-category via `budget_category_limits`
- Monthly view (annual ÷ 12) alongside actual spend
- Budget groups: Income, Expenditure, Klintemarken (feeder), Special (Slush Fund)
- Alert threshold per category (default 80%)
- Last-year comparison column

### 3. Overview Dashboard
- Period selector: month, quarter, YTD, year, 6m, 90d, All, custom
- Summary cards: Total Income, Total Expenses, Net Savings
- Cash Flow bar+line chart (monthly bars, cumulative line)
- Category Flow Sankey diagram
- Toggle filters: CORE / FEEDER / SLUSH
- By default shows all transactions except explicitly excluded ones

### 4. Projections
- 12-month forward cash flow
- Category-level projected vs actual
- Suggest from historical averages (SuggestProjectionsWizard)

### 5. Classification Rules Engine
- Merchant rules: match on normalised merchant name
- Source rules: match on raw bank description
- Auto-fills category, sub-category, budget, skip-triage, recurring flags
- Applied during import and manually via "Apply Rules" action
- Currently two tables; Phase 3 merges into one (`classification_rules`)

### 6. Settings
- Profile: currency, language, date format, amount format
- Categories: add/edit/reorder categories and sub-categories
- Rules: manage merchant and source rules
- Import: upload CSV, map columns, review before commit
- Feature flags: Feeder Budgets, Budget Balancing

---

## Feeder Budget (Klintemarken)

The Mullally family owns a property (Klintemarken) with its own income (rental) and expenses. This is tracked as a separate budget group (`category_group = 'klintemarken'`) within the same account. The `enableFeederBudgets` feature flag controls whether the dedicated feeder budget UI sections appear. The transactions always appear in the main cash flow regardless of this flag.

---

## Special / Slush Fund

Discretionary savings/spending tracked separately from the core household budget. Toggled in the overview with the SLUSH button (`category_group = 'special'`).

---

## Non-Goals

- No mobile app
- No bank API integration (CSV import only)
- No multi-household or SaaS model
- No AI-generated financial advice

---

## Epics (Aspirational / In Progress)

See `docs/PRD/epics/` for detailed feature specs:

| Epic | Status |
|---|---|
| EPIC-001: Authentication | ✅ Implemented (Google OAuth + demo + device trust) |
| EPIC-002: Budget Management | ✅ Core implemented; Phase 3 classification rules pending |
| EPIC-003: Transaction Management | ✅ Implemented |
| EPIC-003: User Personalization | ✅ Implemented (profile settings) |
| EPIC-004: AI Merchant Identification | 🔲 Not started |
| EPIC-005: Insights & Projections | ✅ Core implemented |
| EPIC-006: Smart Receipts | 🔲 Not started |
