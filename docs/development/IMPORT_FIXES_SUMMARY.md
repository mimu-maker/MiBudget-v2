# Import Fixes Applied

## Issues Fixed

### 1. Status Default ✅
- **Problem**: Default status was 'New' instead of 'Pending'
- **Fix**: Changed default status from 'New' to 'Pending'
- **Code**: `status: 'Pending'` in transaction defaults

### 2. Boolean Field Handling ✅
- **Problem**: Planned/Recurring 'yes' values not being captured
- **Fix**: Added comprehensive boolean parsing for various formats
- **Supported values**: 
  - **Truthy**: 'yes', 'y', 'true', '1', 'on', 'checked', 'x'
  - **Falsy**: 'no', 'n', 'false', '0', 'off', 'unchecked', ''
- **Code**: Added special handling for 'planned' and 'recurring' fields

### 3. Sub-Category Mapping ✅
- **Problem**: Sub-categories not showing due to field name mismatch
- **Fix**: Proper mapping between `processed.sub_category` and `transaction.subCategory`
- **Code**: Used destructuring to remove conflicting fields and proper field mapping

### 4. Status Validation ✅
- **Problem**: Invalid status values falling back to 'New'
- **Fix**: Changed fallback to 'Pending' and improved fuzzy matching
- **Code**: Updated status validation with proper fallback

## Import Behavior Now

### Default Values
- **Status**: 'Pending' (unless CSV has valid status)
- **Planned**: false (unless CSV has 'yes', 'y', 'true', etc.)
- **Recurring**: false (unless CSV has 'yes', 'y', 'true', etc.)

### CSV Priority
- **Categories**: Preserved if valid in dropdown, otherwise fuzzy-matched
- **Sub-categories**: Preserved from CSV
- **Status**: Preserved if valid option, otherwise 'Pending'
- **Budget**: Preserved if valid option, otherwise 'Budgeted'
- **Planned/Recurring**: Parsed from various boolean formats

### Boolean Field Support
Your CSV can use any of these formats for planned/recurring:
- 'yes', 'y', 'true', '1', 'on', 'checked', 'x' → true
- 'no', 'n', 'false', '0', 'off', 'unchecked', '' → false

## Test Again
Try importing your CSV again - all 399 rows should now have:
- ✅ Correct categories
- ✅ Correct status (Pending Triage preserved)
- ✅ Sub-categories showing
- ✅ Planned/Recurring flags captured
