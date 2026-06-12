# MiBudget — Product Vision

## Problem Statement

Managing household finances in a spreadsheet is friction-heavy across five dimensions:

1. **Repetitive categorisation** — known merchants (e.g. Netto = Groceries) require manual category assignment on every import, costing minutes per batch
2. **Clunky reconciliation** — money-in-transit (work reimbursements, household splits, interpersonal debts) has no structured tracking; items get forgotten
3. **Limited visualisation** — spreadsheets can't produce rich, interactive charts; identifying unexpected spend requires manual scanning
4. **Lost receipts** — no capture at point of purchase; transactions arrive days later with no context, and paper trails (warranty, insurance) are lost
5. **Rigid budgets** — annual budgets can't model mid-year changes (e.g. a car payment starting in July) without corrupting the annual figure or leaving it intentionally incorrect

---

## Vision

> **Import, confirm, done.**

MiBudget does the heavy lifting — auto-classifying known merchants, flagging exceptions, matching receipts — so the user spends less than 5 minutes processing a month of transactions. The reward is instant, trustworthy clarity on budget performance and financial trajectory without any manual work.

The core loop: **import → auto-classify → confirm exceptions → clear view of how you're doing**

---

## Primary Users

| User | Role |
|---|---|
| Michael Mullally | Admin — primary user, Danish household |
| Tanja Mullally | Editor — shared account, full read/write |
| Demo | Public sandbox — resets after 15 min idle or on sign-out |

---

## Product Scope

**Phase 1 — Household-first (current)**
Built for the Mullally household. Privately hosted, single-account architecture with two named users. Not a consumer product, but architected (localisation, account model, multi-user) to support broader use if product potential is validated.

**Phase 2 — Evaluate potential**
Once Phase 1 delivers a seamless experience for the household, evaluate: receipt capture, AI merchant identification, and multi-household viability. No commitment to any of these until Phase 1 is complete and stable.

---

## Success Criteria

- A full month of bank transactions is processed in under 5 minutes
- Fewer than 5 transactions require manual categorisation per import
- Budget vs actual view is accurate and trustworthy immediately after import
- All money-in-transit items are visible in one place and cleared when settled
- Projections reflect the real starting cash position and forward budget accurately
- No spreadsheet is needed for any regular finance task

---

## Non-Goals (Phase 1)

- No mobile app
- No bank API integration (CSV import only)
- No multi-household or SaaS features
- No AI-generated financial advice
- No receipt capture (Phase 2)
- No AI merchant identification (Phase 2)
