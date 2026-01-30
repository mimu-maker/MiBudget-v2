---
name: prd-compliance
description: Maps code implementations to Mibudget_PRD.md Acceptance Criteria.
---
# Instructions
1. **BUD-001 Check:** Verify that `setEditingBudget(null)` is NOT causing input unmounting.
2. **BUD-002 Check:** Ensure main category rows are read-only and have no click handlers.
3. **Security:** Verify 45-day trusted device logic vs 15-minute untrusted timeout.
4. **Validation:** Read the 'Requirements' table in `Mibudget_PRD.md` before approving any PR.
