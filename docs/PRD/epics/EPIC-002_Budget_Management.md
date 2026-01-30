# EPIC-002: Budget Management & Annual Planning

## 🎯 Objective
Provide a flexible and intuitive interface for planning household expenses across Primary, Special, and Klintemarken budgets, with automated calculations across different time periods.

## ❗ Problem Statement
Budgeting can be complex when switching between annual goals and monthly spending. Users need to see how their spending relates to their income in real-time without doing manual math for frequency conversions or percentages.

## ✅ Success Criteria
- [x] **Predefined Budgets**: Direct support for "Primary", "Special", and "Klintemarken" categories.
- [ ] **Read-Only Parent Categories**: Main categories show calculated totals from their sub-categories (Non-editable).
- [ ] **Dual-Editing Columns**: Editing any one of Annual, Monthly, or % of Income auto-calculates the other two.
- [x] **Persistence**: Budget allocations are saved to `budgets` and `budget_category_limits` tables correctly.
- [x] **Precision**: DKK amounts are handled with appropriate decimal precision (x.xxx,xx kr).

## 📋 Requirements & Calculation Logic
### Core Architecture
- **Categories**: Calculated totals from sub-categories (Read-only total display).
- **Sub-categories**: Individually editable budget amounts.
- **Three Adjustment Columns**: Annual, Monthly, % of Income.

### Column Calculations
- **Annual**: Monthly × 12
- **Monthly**: Annual ÷ 12
- **% of Income**: (Sub-category Annual ÷ Total Household Income Annual) × 100

### Auto-calculation Rules
- **Edit Annual** → Update Monthly (Annual/12) and % (Annual/TotalIncome).
- **Edit Monthly** → Update Annual (Monthly*12) and % (Annual/TotalIncome).
- **Edit %** → Update Monthly (% * TotalIncome / 12) and Annual (Monthly*12).

## 🛠️ Implementation Status
**Status**: `In Progress`

### User Stories
#### Story: BUD-001 - Fix Sub-Category Auto-Clearing Bug
**User Story:** As a user managing my budget, I want to edit sub-category amounts without them auto-clearing, so that I can accurately set my budget allocations.
**Status:** ❌ `BLOCKING`
**Acceptance Criteria:**
- [ ] Input field retains focus and value during editing.
- [ ] Value persists after blur/enter key press.
- [ ] Auto-calculation updates other two columns correctly.

#### Story: BUD-002 - Remove Main Category Amount Fields
**User Story:** As a user, I want main categories to show calculated totals only, so that I understand they're aggregates of sub-categories.
**Status:** ❌ `BLOCKING`
**Acceptance Criteria:**
- [ ] Main category amounts are displayed as read-only text.
- [ ] Visual distinction between editable sub-categories and read-only main categories.

#### Story: BUD-003 - Implement Three-Column Auto-Calculation
**User Story:** As a user setting budget amounts, I want to edit any of the three columns and have the others auto-calculate.
**Status:** 🟡 `IN PROGRESS`
**Acceptance Criteria:**
- [ ] Edits in any column trigger the logic defined in "Auto-calculation Rules".
- [ ] Error handling for invalid inputs (negative numbers, text).

#### Story: CAT-001 - Complete Category Management System
**User Story:** As a budget administrator, I want to manage budget categories through a proper interface.
**Status:** 🟢 `UP NEXT`

### Proof of Work
- [Budget.tsx](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/pages/Budget.tsx) - Core budget management UI.
- [useAnnualBudget.ts](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/hooks/useAnnualBudget.ts) - Hook for budget calculations and state.
