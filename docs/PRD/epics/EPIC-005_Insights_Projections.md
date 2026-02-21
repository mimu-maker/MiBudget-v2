# EPIC-005: Financial Insights & Projections

## 🎯 Objective
Give users a forward-looking view of their finances, helping them anticipate future balances and stay on track with long-term savings goals.

## ❗ Problem Statement
Standard banking apps only show the past. Users need to know "If I spend this today, what is my balance at the end of next month?" to make confident financial decisions.

## ✅ Success Criteria
- [x] **Spending Trends**: Visual charts showing spending over time.
- [x] **Future Projections**: Calculation of estimated balances based on planned recurring transactions.
- [x] **Budget Adherence**: At-a-glance view of "Spent" vs "Budgeted" for the current period.
- [x] **Account Overviews**: Unified view of Primary vs Special budget health.
- [x] **Cash Flow Visualization**: Sankey charts and trend lines showing income vs. expenses.

## 📋 Requirements
- **Integration with Projections**: Uses the `projections` table to store future income/expenses.
- **Recurring Transaction Detection**: Logic to identify and project recurring bills.
- **Interactive Dashboards**: High-performance charts using Recharts.
- **DKK Formatting**: All financial values in charts strictly follow Danish standards.

## 🛠️ Implementation Status
**Status**: `Complete - Pending Review`

### User Stories
#### Story: UI-001 - Enhance Budget Visual Design
**User Story:** As a user, I want a clear, visually appealing budget interface, so that I can easily understand my financial situation at a glance.
**Status:** 🔵 `BACKLOG`
**Acceptance Criteria:**
- [ ] Improved visual hierarchy between main categories and sub-categories.
- [ ] Better color coding for different budget types.
- [ ] Responsive design improvements for mobile/PWA.

#### Story: PERF-001 - Optimize Budget Loading Performance
**User Story:** As a user, I want the budget page to load quickly and respond fast to edits.
**Status:** 🔵 `BACKLOG`
**Acceptance Criteria:**
- [ ] Budget data loads within 2 seconds.
- [ ] Sub-category updates reflect immediately without full page refresh.

### Proof of Work
- [Overview.tsx](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/pages/Overview.tsx) - Main financial dashboard.
- [ProjectionChart.tsx](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/components/Overview/ProjectionChart.tsx) - Visual projection component.
- [HistoryDashboard.tsx](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/components/Overview/HistoryDashboard.tsx) - Historical data visualization.
