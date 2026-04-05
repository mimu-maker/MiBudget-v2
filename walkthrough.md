# Walkthrough: Recon Feature & Sub-category Improvements

This update implements the new Recon flow and addresses sub-category selection.

## 1. Recon Feature Implementation
Added the ability to "Complete Recon" for transaction groups that possess both positive and negative values.

*   **Completion Flow**: When reviewing groups matching these criteria in the Reconciliation tab, a "Complete Recon" button becomes available in the entity group header.
*   **Validation Check**: Users are guided to ensure all line items inside the group have both a `category` and `sub_category` populated. Attempting to complete the flow without these flags will issue a warning.
*   **Outstanding Amount Summary**: If the positive and negative amounts don't exactly equal zero, the confirmation dialog will warn users of the net outstanding amount prior to execution.
*   **Audit Reference Note**: Completing the flow successfully appends `"Recon: [Entity Name]"` to the underlying notes of all modified transactions and marks them as Reconciled.

## 2. Key Fixes & Enhancements (Previous)

1.  **Contextual Filtering in Transactions Table**:
    *   The sub-category filter in the table header now detects if a category filter (e.g., "Household") is active.
    *   Sub-categories belonging to the active category are prioritized and placed in a dedicated **"Sub-categories for [Category]"** group at the top.
    *   All other sub-categories from other categories remain available in an **"Other Sub-categories"** group below.
    *   This prevents the "random shit" feeling by organizing sub-categories contextually.

2.  **Comprehensive Data Discovery**:
    *   Previously, the sub-category filter only used categories from `settings`. It now also pulls from the live budget data (database/hooks), ensuring that dynamic sub-categories (like "Insurance" in "Household") are always visible in the filter.

3.  **Improved Sub-category Editing UI**:
    *   Replaced the generic `SmartSelector` with a new, purpose-built `SubCategorySelector` component.
    *   Grouped sub-categories by their parent category for clear visual organization.
    *   Ensured that selecting a sub-category from a different parent category correctly updates both the transaction's category and sub-category.

4.  **Automatic Heading & Grouping**:
    *   Added `CommandGroup` headings to both editing and filtering dropdowns to provide much-needed structure.
    *   Highlighted associated sub-categories in blue with a "Maps To" visual indicator to clarify why they are prioritized.

## Verification Steps

1.  Navigate to the **Transactions** -> **Reconciliation** tab and locate an entity group containing both positive and negative values.
2.  Press **Complete Recon**. Ensure the system blocks completion if any sub-categories are missing.
3.  Set all sub-categories and press **Complete Recon** again. Confirm the dialog displays any net positive or negative remaining balance before continuing.
4.  Proceed with confirmation, observe the transactions clear, and check their underlying notes for the appended `Recon:` reference string.
