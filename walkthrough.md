# Walkthrough: Sub-category Selection & Filtering Improvement

This update addresses the issue where sub-category selection and filtering were inconsistent, incomplete, or showed unrelated categories.

## Key Fixes & Enhancements

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

1.  Navigate to the **Transactions** tab.
2.  Apply a filter for a specific category (e.g., "Household").
3.  Click the filter icon on the **Sub-category** column.
    *   **Verify**: You should see a group named "Sub-categories for Household" on top.
    *   **Verify**: Other sub-categories should be below in "Other Sub-categories".
4.  Clear all filters and check the Sub-category filter again.
    *   **Verify**: All sub-categories should be listed under "All Sub-categories".
5.  Click on a sub-category cell in a row to edit it.
    *   **Verify**: The dropdown should show sub-categories grouped by their parent category (Income, Property, etc.).
    *   **Verify**: Choosing a sub-category belonging to a different category than currently set should update both fields in the transaction record.

These changes ensure a premium, predictable, and robust user experience across all transaction views.
