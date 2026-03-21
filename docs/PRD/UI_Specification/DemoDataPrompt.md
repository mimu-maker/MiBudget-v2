# Prompt for Generating Demo Account Data

Copy the text below and paste it into your preferred LLM Web UI (like ChatGPT, Claude, or Google AI Studio). Then, optionally attach or paste a sample of your exported budget data so it knows the names of the categories and merchants you actually use.

---

**Prompt:**

Act as an expert financial data generator. I am attaching an export of my real budget data. I need you to understand all my specific categories, sub-categories, merchant names, budget amounts, and standard income to build a "Demo Account" JSON dataset. The Demo Account should represent a completely healthy, "normal" family household operating in USD, based closely on my standard expenses but fully randomized/anonymized to protect my real data.

Your output MUST be a valid JSON array of 1900 transaction objects spanning consistently from January 1, 2024, to the present day, and stretching 1 month into the future (predicted planned transactions).

The JSON output MUST STRICTLY follow this schema for each transaction object:
- `date`: string (Format: YYYY-MM-DD)
- `merchant`: string (A realistic payee name, derived/inspired by my export. E.g. "Whole Foods", "Netflix", "Shell Gas", "Chase Auto", "Wells Fargo Mortgage")
- `amount`: number (Negative for all expenses, positive for all income/salary transfers)
- `account`: string (Use realistic names like "Demo Checking", "Credit Card")
- `status`: string (Must strictly be one of exactly four values: `Pending`, `Pending Reconciliation`, `Complete`, `Excluded`)
- `category`: string (Derived from my actual core categories, e.g., "Housing", "Transport", "Food")
- `sub_category`: string (Derived from my actual sub-categories, e.g., "Mortgage", "Car Payment", "Groceries")
- `planned`: boolean (True for fixed monthly subscriptions/salary/loans, False for ad-hoc variable spending)
- `recurring`: string (Use `Monthly`, `Weekly`, `Yearly`, or `N/A`)

**Crucial Distribution Requirements (Do not ignore this):**
1. Generate exact salary deposits (`amount`: positive value) representing a standard monthly paycheck across the timeline.
2. Include consistent large fixed costs every single month: Mortgage/Rent, Car Payments, Insurance.
3. The `status` field distribution is critical for my UI testing. Out of the 1900 transactions:
   - Exactly **50** must have `status: "Pending"` (Recent dates only)
   - Exactly **50** must have `status: "Pending Reconciliation"` (Crucial for the Validation UI!)
   - Exactly **100** must have `status: "Excluded"`
   - The remaining **1700** must have `status: "Complete"`
4. Ensure the overall math works out to a slightly positive net-cash flow at the end of each month (Income slightly > Expenses).

Output only the raw JSON array containing the 1900 transaction objects so I can easily copy and inject it into my system to seed the Demo Account.

---
