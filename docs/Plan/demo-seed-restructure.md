# Plan: Demo Seed Restructure — Categories, Sub-categories & Transactions

## Goal

Simplify the demo category/sub-category structure so that:
1. Every sub-category has actual transactions (no ghost budgets)
2. Sub-category names are clear and appropriate for a US household
3. Empty categories (Personal Care, Gifts & Giving, Transfer) are removed
4. Existing transactions are re-classified to cover newly named sub-categories — no new rows added

## Source of Truth

`reset_demo_account()` restores from `demo_seed_*` tables on every login.
Changes must go to **both** seed tables AND live tables for the demo account.

---

## Target Structure

| Category | Sub-categories | Expense Type |
|---|---|---|
| **Housing** | Mortgage, Home Maintenance, Property Tax | Fixed/Variable/Fixed |
| **Food** | Groceries, Restaurants, Coffee & Cafés | Variable/Discretionary/Discretionary |
| **Transport** | Car Payment, Fuel, Auto Insurance, Rideshare, Car Repair | Fixed/Variable/Fixed/Discretionary/Variable |
| **Shopping** | Electronics & Tech, Home Goods, Clothing & Apparel | Discretionary/Variable/Discretionary |
| **Health** | Pharmacy, Doctor & Dental | Variable/Variable |
| **Entertainment** | Movies & Shows, Streaming & Music | Discretionary/Fixed |
| **Utilities** | Electricity, Internet & Cable, Phone | Variable/Fixed/Fixed |
| **Savings** | Monthly Savings, Emergency Fund, Retirement (401k) | Variable/Variable/Fixed |
| **Income** | Salary & Wages | — |
| **Slush Fund** | Home Projects, Travel & Vacation, Big Purchases | Discretionary/Discretionary/Discretionary |

**DROP entirely:** Personal Care, Gifts & Giving, Transfer

---

## Sub-category Renames (demo_seed_sub_categories + live sub_categories)

| Old name | New name | ID |
|---|---|---|
| Movies | Movies & Shows | ...000000000802 |
| Streaming | Streaming & Music | ...000000000801 |
| Dining Out | Restaurants | ...000000000402 |
| Coffee & Drinks | Coffee & Cafés | ...000000000403 |
| Medicine | Pharmacy | ...000000000602 |
| Doctor Visits | Doctor & Dental | ...000000000603 |
| Maintenance | Home Maintenance | ...000000000203 |
| Electronics | Electronics & Tech | ...000000000702 |
| Household | Home Goods | ...000000000703 |
| Clothing | Clothing & Apparel | ...000000000701 |
| Short-Term Savings | Monthly Savings | ...000000001203 |
| Retirement (401k/IRA) | Retirement (401k) | ...000000001202 |
| Home Improvement | Home Projects | ...000000001301 |
| Vacation & Travel | Travel & Vacation | ...000000001302 |
| Large Purchases | Big Purchases | ...000000001304 |

---

## Transaction Re-classifications (demo_seed_transactions + live transactions)

All UPDATEs on existing rows — no INSERTs.

| From | To category | To sub_category | Selection rule |
|---|---|---|---|
| Food / Restaurants | Food | Coffee & Cafés | 24 cheapest Restaurants transactions (amount DESC, take last 24) |
| Health / Pharmacy | Health | Doctor & Dental | 12 largest Pharmacy transactions (amount ASC, most expensive = doctor visits) |
| Housing / Home Maintenance | Housing | Property Tax | 4 transactions with amount BETWEEN -700 AND -400 (quarterly property tax ~$550) |
| Shopping / General (all 50) | Shopping | Home Goods (35) + Clothing & Apparel (15) | First 15 by amount (largest = clothing items) → Clothing; remainder → Home Goods |
| Transfer / Savings (51 total) | Savings | Monthly Savings (27) | First 27 (monthly Jan-Dec, consistent amounts ~$500) |
| Transfer / Savings (51 total) | Savings | Emergency Fund (12) | Next 12 (mid-range amounts) |
| Transfer / Savings (51 total) | Savings | Retirement (401k) (12) | Last 12 (fixed amounts, likely payroll deduction simulation) |
| Transport / Fuel (98 total) | Transport | Car Repair | 10 largest Fuel transactions (one-off repair bills, not regular fills) |
| Utilities / Phone (12 total) | Utilities | Internet & Cable | 6 alternate months (even months = internet bill) |

---

## Sub-categories to DELETE

Remove from `demo_seed_sub_categories`, `demo_seed_bcl`, live `sub_categories`, live `budget_category_limits`:

- Entertainment: Hobbies (804), Sports & Events (803)
- Food: Meal Delivery (404)
- Health: Gym & Fitness (604), Health Insurance (601), Dental & Vision (605)
- Housing: Home Insurance (204)
- Personal Care: Haircuts & Beauty (901), Personal Hygiene (902), Pet Care (903)
- Gifts & Giving: Gifts (1001), Charitable Donations (1002), Birthdays & Holidays (1003)
- Shopping: General (704) — after re-classifying all transactions away from it
- Transfer: Savings (1102), Credit Card Payment (1101), Loan Payment (1103)
- Transport: Parking & Tolls (504)
- Utilities: Water & Sewer (303), Gas & Heating (302)
- Income: Freelance & Contract (102), Investment Income (103), Other Income (104)
- Slush Fund: Medical Emergency (1303), Car Major Repair (1305)

## Categories to DELETE

After all sub-categories removed:
- Personal Care
- Gifts & Giving
- Transfer (transactions re-classified to Savings)

---

## Budget Amounts (demo_seed_bcl, all 3 budget years)

Set monthly amounts to match actual 2025 spend +15-20% buffer:

| Sub-category | Monthly budget |
|---|---|
| Mortgage | 2,200 |
| Home Maintenance | 375 |
| Property Tax | 150 |
| Groceries | 850 |
| Restaurants | 880 |
| Coffee & Cafés | 100 |
| Pharmacy | 290 |
| Doctor & Dental | 80 |
| Car Payment | 430 |
| Fuel | 650 |
| Auto Insurance | 180 |
| Rideshare | 400 |
| Car Repair | 75 |
| Electronics & Tech | 375 |
| Home Goods | 420 |
| Clothing & Apparel | 120 |
| Electricity | 150 |
| Internet & Cable | 85 |
| Phone | 75 |
| Movies & Shows | 230 |
| Streaming & Music | 50 |
| Monthly Savings | 1,350 |
| Emergency Fund | 600 |
| Retirement (401k) | 600 |
| Salary & Wages | 13,300 (income) |
| Home Projects | 500 |
| Travel & Vacation | 600 |
| Big Purchases | 300 |

---

## Expense Type Labels (update sub_categories.label for demo account)

Use the `expense_label` enum: `Fixed Committed | Variable Essential | Discretionary`

| Sub-category | Type |
|---|---|
| Mortgage | Fixed Committed |
| Car Payment | Fixed Committed |
| Auto Insurance | Fixed Committed |
| Internet & Cable | Fixed Committed |
| Phone | Fixed Committed |
| Streaming & Music | Fixed Committed |
| Retirement (401k) | Fixed Committed |
| Property Tax | Fixed Committed |
| Groceries | Variable Essential |
| Fuel | Variable Essential |
| Electricity | Variable Essential |
| Home Maintenance | Variable Essential |
| Pharmacy | Variable Essential |
| Doctor & Dental | Variable Essential |
| Emergency Fund | Variable Essential |
| Monthly Savings | Variable Essential |
| Car Repair | Variable Essential |
| Restaurants | Discretionary |
| Coffee & Cafés | Discretionary |
| Home Goods | Variable Essential |
| Electronics & Tech | Discretionary |
| Clothing & Apparel | Discretionary |
| Rideshare | Discretionary |
| Movies & Shows | Discretionary |

---

## Validation Checklist

- [ ] Every sub-category in demo_seed_bcl has at least 8 transactions in demo_seed_transactions
- [ ] Transfer category is gone (no transactions, no categories, no budgets)
- [ ] Personal Care gone, Gifts & Giving gone
- [ ] Budget page shows 10 categories with reasonable USD monthly amounts
- [ ] Category Analysis shows all 8 expense categories in pie chart
- [ ] Savings category shows actual spend (not zero)
- [ ] Log out + log in as demo → reset restores clean state
- [ ] Expense Type column in Settings > Categories shows correct type per sub-category
