# EPIC-003: Transaction Management & Manual Triage

## 🎯 Objective
Empower users to accurately track every DKK spent by providing a robust ingestion and triage system that minimizes manual effort while ensuring 100% data accuracy.

## ❗ Problem Statement
Raw transaction data from banks is often confusing and inconsistent. Users need a "Triage" zone where new items are staged, reviewed, and categorized before being committed to the final budget reports.

## ✅ Success Criteria
- [x] **Transaction Ingestion**: Support for manual entry and bulk CSV import.
- [x] **Triage Workflow**: Ability to mark transactions as "Needs Review" vs "Complete".
- [x] **DKK Formatting**: All currency displays strictly follow the Danish "x.xxx,xx kr" format.
- [x] **Category Assignment**: Frictionless assignment of transactions to sub-categories.
- [x] **Filtering**: Fast search and date range filtering for auditing past spending.
- [x] **Automatic Assignment**: Budget month/year automatically assigned based on transaction date.

## 📋 Requirements
- **Interactive Transaction List**: Table with sorting, filtering, and status badges.
- **Bulk Action Support**: Apply categories, statuses, or move to budgets for multiple items at once.
- **Triage Logic**:
  - `New` items from bank import enter "Needs Review" status.
  - `Completed` items are locked from general triage views but visible in history.
- **CSV Import Brain**: Fuzzy matching and pattern memory for recurring transactions.
- **Validation Views**: Dedicated dashboards to find uncategorized or "Pending Triage" items.

### Visual States
- **Resolved Merchant (Blue Pill)**:
  - Displayed when a transaction's `clean_merchant` matches an existing **Merchant Rule**.
  - Indicates "Keep Consistent": This merchant is known and managed.
- **Unresolved (Plain Text)**:
  - Default state for any transaction not linked to a rule.
  - Shows the input text (or cleaned text if available) but without the pill styling.
- **Confidence Score**:
  - Internal metric (0-1) used ONLY by the Settings Wizard for sorting rule suggestions.
  - Does NOT affect the main transaction table UI.

## 🛠️ Implementation Status
**Status**: `Complete - Pending Review`

The transaction table and triage workflow are the most mature parts of the application.

### Proof of Work
- [TransactionsTable.tsx](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/components/Transactions/TransactionsTable.tsx) - Main UI for transaction management.
- [TriageDashboard.tsx](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/components/Transactions/TriageDashboard.tsx) - Focused view for items needing attention.
- [importBrain.ts](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/lib/importBrain.ts) - Logic for parsing and mapping bank data.
- [ValidationDashboard.tsx](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/components/Transactions/ValidationDashboard.tsx) - Data integrity check UI.
