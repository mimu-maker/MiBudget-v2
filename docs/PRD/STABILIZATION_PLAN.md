# 🛠️ Stabilization Plan

Tracking active bugs and logic errors identified during the "Production Evolution" phase.

## 🔴 Critical Path (Calculations)

### BUD-003: Three-Column Math Drift
- **Issue**: The `% of Total` column in the Budget Table remains at 0% even after edits.
- **Root Cause**: Likely a broken reactivity chain where `totalIncome` is not updated or correctly passed to the percentage calculation logic.
- **Fix**: Re-evaluate `totalIncome` on every budget change and ensure the `% of Total` uses the most recent aggregate.

### BUD-004: Incorrect "Vs Budget" Logic
- **Issue**: Comparing the *Full Year Budget* against *Year-to-Date Spending* creates misleading drift data.
- **Root Cause**: The current `remaining` calculation is `budget_amount - spent`, where `budget_amount` is often interpreted as the annual target.
- **Fix**: 
    1. Implement a **Budget YTD** column: `(Monthly Budget * Elapsed Months)`.
    2. Update **Vs Budget** to compare **Budget YTD** against **Actual Spent YTD**.

## 🟠 Security / Auth
### AUTH-001: Device Trust Disabled (Dev Override)
- **Issue**: Session timer integer overflow caused immediate logout loop on trusted devices.
- **Action**: Trust Prompt hidden & Session Timeout forced to 24 days universally.
- **Requirement**: **MUST** re-enable prompt and trust logic before Production Release.


## 🟢 UI Polish

### BUD-005: New Financial Columns
- **Task**: Add the **Budget YTD** column to the `BudgetTable` for visual comparison against **Actual Spend YTD**.
- **Status**: ✅ FIXED.

### BUD-006: Dark Mode (Wishlist)
- **Task**: Implement a high-performance OLED Dark Mode that preserves the premium financial aesthetics.
- **Status**: 📅 BACKLOG.

---

### BUD-007: Budget UI Refactor (Unplanned Expenses)
- **Task**: Rename "Special" -> "Unplanned Expenses", merge into Expenditure card as a tail section, and hide headers for Feeder Budgets.
- **Status**: ✅ FIXED.

### BUD-008: Budget Balancing Selection Logic
- **Task**: Enforce category selection for Budget Balancing and automatically select "Unplanned Expenses" if available.
- **Status**: ✅ FIXED.

---

## 📋 Triage History
| Date | ID | Issue | Status |
| :--- | :--- | :--- | :--- |
| 2026-01-26 | BUD-001 | Sub-Category Auto-Clearing | ✅ FIXED |
| 2026-01-26 | BUD-002 | Main Category Editability | ✅ FIXED |
| 2026-01-27 | BUD-003 | % Column stays at 0% | ✅ FIXED |
| 2026-01-27 | BUD-004 | Vs Budget Math Fix | ✅ FIXED |
| 2026-01-27 | BUD-005 | Budget YTD Column | ✅ FIXED |
| 2026-02-05 | BUD-007 | Unplanned Expenses Refactor | ✅ FIXED |
| 2026-02-05 | BUD-008 | Budget Balancing Default | ✅ FIXED |

---

## 🧪 Regression Testing Requirements
- **Budget Table Vertical Alignment**: Ensure that "Unplanned Expenses" tail section columns align perfectly with "Primary Expenses".
- **Feeder Budget Headers**: Confirm that column headers (Annual, Monthly, etc.) are hidden for Feeder groups but the data remains visible.
- **Settings Toggle Logic**: Verify that enabling Budget Balancing without a prior selection correctly auto-populates "Unplanned Expenses".
