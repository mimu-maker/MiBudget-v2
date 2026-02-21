---
description: Run this before requesting a USER review. It ensures technical and strategic alignment.
---
# Pre-Review Verification Workflow

This workflow ensures that code is not just "working," but meets MiBudget's specific architectural and strategic standards.

## 1. Requirement Traceability
// turbo
Invoke @[prd-compliance] to verify that the changes match the **Acceptance Criteria** in `Mibudget_PRD.md`.
**Benefit:** Prevents "hallucinated" features and ensures core logic (like non-editable totals) is preserved.

## 2. Localization Audit
// turbo
Invoke @[locale-guardian] to check for hardcoded strings or incorrect date formats.
**Benefit:** Ensures the product is "Danish-ready" and maintains the 24-hour time format required by the PRD.

## 3. Code Health Check
// turbo
Invoke @[clean-code] to audit function length and SRP compliance.
**Benefit:** Keeps the codebase maintainable and prevents technical debt from accumulating early.

## 4. Final Summary
Provide a consolidated report highlighting:
- [✅] PRD Compliance
- [✅] Localization Accuracy
- [✅] Refactoring Wins
