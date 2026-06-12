# MiBudget — Product Requirements Document

**Version**: 1.1 | **Date**: 2026-05-03 | **Status**: Living document

> For the problem statement and product vision see [product-vision.md](product-vision.md).
> For detailed epic specs see [epics/](epics/).

---

## Users

| User | Role | Access |
|---|---|---|
| Michael | Admin | Full read/write — primary user |
| Tanja | Editor | Full read/write — shared account |
| Demo | Public sandbox | Full read/write — resets after 15 min idle or on sign-out |

---

## Epic Status

| Epic | Title | Status |
|---|---|---|
| EPIC-001 | Authentication | ✅ Complete |
| EPIC-002 | Budget Management | 🟡 Core done; month-level override pending |
| EPIC-003 | Transaction Management | ✅ Complete |
| EPIC-003b | User Personalization | 🟡 In progress |
| EPIC-004 | AI Merchant Identification | 🔲 Phase 2 |
| EPIC-005 | Insights & Projections | 🟡 Core done; starting cash + 1/3/5yr view pending |
| EPIC-006 | Smart Receipts | 🔲 Phase 2 |

---

## User Stories & Requirements

---

### Epic 1 — Transaction Import & Classification

**As Michael, I want known merchants auto-categorised on import so that I spend less than 5 minutes processing a month of transactions.**

| # | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| R1.1 | Transactions matching a classification rule are categorised without manual input | Zero interaction required for matched transactions; land in correct category/subcat | Must |
| R1.2 | Unmatched transactions flagged Pending Triage | All unmatched surface in Triage view | Must |
| R1.3 | Rule can be created inline from any transaction | Save rule from transaction row; applies to future imports | Must |
| R1.4 | Rules support "Always Ask" mode | Matched transactions surface for confirmation rather than auto-completing | Must |
| R1.5 | Bulk actions in Triage | Assign category, change status, delete — all as bulk operations | Should |
| R1.6 | Phase 3: merchant_rules + source_rules merged into classification_rules | Single rules table with match_type discriminator; single management UI | Must |

---

### Epic 2 — Splits & Reconciliation

**As Michael, I want to split transactions and track money-in-transit so that shared expenses, reimbursements, and debts are never lost.**

| # | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| R2.1 | Transaction split across multiple categories/subcategories | N split lines, each with independent category + subcat + amount | Must |
| R2.2 | Split line (or whole transaction) flagged Pending Reconciliation with reason | Reason field captures counterparty/context | Must |
| R2.3 | All pending reconciliation items in one filtered view | Dedicated filter shows all outstanding items | Must |
| R2.4 | Marking reconciled removes from pending view | Status → Reconciled excludes from pending filters | Must |
| R2.5 | Supports all three money-in-transit types | Work reimbursements, household splits, interpersonal debts | Must |

---

### Epic 3 — Budget Management

**As Michael, I want to set a budget that reflects how I actually spend — including mid-year changes — so that my budget vs actual view is always meaningful.**

| # | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| R3.1 | Annual budget per category and sub-category | Each has an annual target; monthly view shows ÷12 alongside actual | Must |
| R3.2 | Historical averages visible when setting budget | Prior year actuals shown as reference during setup | Must |
| R3.3 | **Month-level override for exceptions** | Any category can have per-month amounts overriding the default monthly figure; UI mirrors projections month-expansion pattern | Must — **GAP** |
| R3.4 | Annual total reflects sum of monthly overrides | When monthly values exist, annual = sum of 12 months | Must — **GAP** |
| R3.5 | Alert threshold per category (default 80%) | Category highlights when actual spend reaches threshold % of budget | Should |
| R3.6 | Budget groups: Income / Expenditure / Klintemarken / Special | All four groups visible and togglable | Must |
| R3.7 | Parent categories show calculated totals only (read-only) | Main category amounts are read-only aggregates of sub-categories | Must |
| R3.8 | Three-column auto-calculation (Annual / Monthly / % of Income) | Editing any column auto-calculates the other two | Should |

---

### Epic 4 — Overview Dashboard

**As Michael, I want a rich, interactive view of my financial position for any period so that I can identify unexpected spend instantly.**

| # | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| R4.1 | Period selector: month, quarter, YTD, year, 6m, 90d, All, custom | All options work; default is current month | Must |
| R4.2 | Summary cards: Total Income, Total Expenses, Net Savings | Cards update with selected period | Must |
| R4.3 | Cash Flow chart: monthly bars + cumulative line | Both series correct for selected period | Must |
| R4.4 | Sankey diagram with drill-down to transactions | Clicking a flow opens filtered transaction list | Must — **GAP** |
| R4.5 | Category Analysis tab | Exists; foundation in place | Must |
| R4.6 | Category Analysis: legend on right | Repositioned; readable at all viewport sizes | Should — **REFINEMENT** |
| R4.7 | Category Analysis: drill-down to transactions | Clicking category opens filtered transaction list | Must — **REFINEMENT** |
| R4.8 | Toggle filters: CORE / FEEDER / SLUSH | Each correctly includes/excludes transaction group | Must |

---

### Epic 5 — Projections

**As Michael, I want to see where I'll be financially in 1, 3, and 5 years so that I can make informed decisions about major expenditure.**

| # | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| R5.1 | 12-month forward cash flow projection | Projected line from today, based on budget | Must |
| R5.2 | **1 / 3 / 5 year projection views** | User can switch time horizons; chart scales accordingly | Must — **GAP** |
| R5.3 | Projection based on budget type + Slush toggle | Budget group selection affects projected trajectory | Must |
| R5.4 | **Manual starting cash holdings input** | User enters "cash on hand" figure seeding projection baseline; persisted between sessions; not synced to bank | Must — **GAP** |
| R5.5 | Category-level projected vs actual | Drill into any category to see projected vs actual | Should |
| R5.6 | Suggest from historical averages (SuggestProjectionsWizard) | Wizard proposes values based on prior year actuals | Should |

---

### Epic 6 — Settings

**As Michael, I want full control over categories, rules, and profile settings so that the app reflects my household's structure precisely.**

| # | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| R6.1 | Add / edit / reorder categories and sub-categories | Changes immediately reflected across all views | Must |
| R6.2 | Manage classification rules | Single UI after Phase 3 merge | Must |
| R6.3 | Profile: currency, language, date format, amount format | All formatting preferences applied globally | Must |
| R6.4 | CSV import: upload, column mapping, preview before commit | No transactions committed without review step | Must |
| R6.5 | Feature flags: Feeder Budgets, Budget Balancing | Flags toggle relevant UI sections without data loss | Should |

---

### Epic 7 — Authentication & Access

**As Michael, I want secure, frictionless access for both myself and Tanja, with a safe public demo that doesn't touch our data.**

| # | Requirement | Acceptance Criteria | Priority |
|---|---|---|---|
| R7.1 | Google OAuth for Michael and Tanja | Both authenticate via Google; share one account | Must |
| R7.2 | Demo account resets after 15 min idle or on sign-out | Demo data returns to seed state; production data untouched | Must |
| R7.3 | Device trust: 45-day session trusted / 15-min inactivity otherwise | Trust policy applied correctly per device | Must |

---

## Domain Concepts

### Feeder Budget (Klintemarken)
The Mullally family owns a property (Klintemarken) with its own rental income and expenses. Tracked as `category_group = 'klintemarken'` within the same account. `enableFeederBudgets` flag controls the dedicated budget UI sections; transactions always appear in main cash flow regardless.

### Special / Slush Fund
Discretionary savings/spending tracked separately from core household budget. Toggled in the overview with the SLUSH button (`category_group = 'special'`).

### Splits
A transaction can be split for two distinct purposes:
1. **Category split** — divide a transaction across multiple categories/subcategories
2. **Reconciliation split** — flag a portion as money-in-transit (reimbursable, owed, shared)

---

## Phase 1 Refinement Backlog

Items confirmed as gaps or refinements — all Phase 1:

| Item | Epic | Priority |
|---|---|---|
| Month-level budget override | Budget (R3.3, R3.4) | Must |
| Starting cash holdings for projections | Projections (R5.4) | Must |
| 1/3/5 year projection views | Projections (R5.2) | Must |
| Sankey drill-down to transactions | Dashboard (R4.4) | Must |
| Category Analysis drill-down | Dashboard (R4.7) | Must |
| Category Analysis legend on right | Dashboard (R4.6) | Should |
| Phase 3: classification rules merge | Rules (R1.6) | Must |

---

## Phase 2 — Out of Scope Until Phase 1 Complete

| Epic | Description |
|---|---|
| EPIC-004 | AI Merchant Identification — auto-identify unknown merchants via AI |
| EPIC-006 | Smart Receipts — capture at purchase, auto-match to bank transaction, itemised splits |
| Market evaluation | Multi-household architecture, product viability assessment |

---

## Open Questions

- How should month-level budget overrides interact with the last-year comparison column — use monthly actuals or annual ÷ 12?
- Projections starting cash: confirmed persisted between sessions — what happens when the user hasn't set it yet (zero baseline or prompt)?
- Sankey drill-down: open in sidebar or navigate to Transactions with filter applied?
