# MiBudget Onboarding Experience (DEPRECATED)

## ⚠️ Status: DEPRECATED

**Date**: January 20, 2026  
**Reason**: Simplified to fixed configuration for personal use  
**Migration**: Moved to archived for potential future revival

## Overview

The MiBudget onboarding experience was designed to guide new users through a seamless journey from account creation to fully configured financial management. The flow was designed to be intuitive, progressive, and flexible, allowing users to import existing data or start fresh while maintaining the ability to abort and restart at any point.

**This implementation has been deprecated in favor of a fixed configuration for personal use.**

## High-Level User Journey (DEPRECATED)

### Phase 1: Welcome & Preferences
**Goal**: Capture essential user preferences for personalized experience
- Welcome screen with brief app introduction
- Basic information collection (name, account name)
- Preference selection (currency, date format, number format, timezone)
- Progress to data import decision

### Phase 2: Data Import Choice
**Goal**: Allow users to import existing data or start fresh
- Three options: "Import Data", "Start Fresh", or "Import Later"
- File upload interface for CSV, Excel, QFX, OFX formats
- Drag-and-drop functionality with format validation
- Preview of first 10 rows for verification

### Phase 3: Data Mapping & Validation
**Goal**: Intelligently map imported data to MiBudget structure
- Automatic detection of merchant, date, and amount columns
- Sequential column mapping (one at a time for non-mandatory columns)
- Data type matching with existing MiBudget fields
- Option to ignore columns or create new field values
- Merchant display name assignment for matched merchants
- Data validation and error highlighting
- Preview with user-preferred formatting

### Phase 4: Post-Import Configuration
**Goal**: Complete data setup and prepare visualization
- Selection of additional MiBudget columns not in uploaded data
- Default value configuration for missing fields
- Initial category and sub-category assignment
- Account configuration and defaults
- Transition to Sankey view with pre-populated data
- Table view option showing all years with data + current year

### Phase 5: Income Stream Discovery
**Goal**: Identify and organize recurring income patterns
- Analysis of imported transactions for recurring patterns
- Presentation of discovered income streams
- User confirmation and customization of each stream
- Manual addition of recurring income streams
- Integration with projection system

### Phase 6: Budget Finalization
**Goal**: Complete budget structure with default setup
- Automatic creation of "Primary" and "Special" budgets
- Budget allocation and limit configuration
- Account assignment to budgets
- Final budget review and adjustments

### Phase 7: Review & Completion
**Goal**: Final verification and transition to main application
- Comprehensive summary of all configurations
- Final adjustment opportunities
- Completion celebration and transition to dashboard
- Optional tutorial overlay

## Key Features (DEPRECATED)

### Flexible Progression
- Users can skip import and start fresh
- Import later option available from main app
- Save progress between steps
- Return to previous steps for modifications

### Intelligent Data Processing
- Automatic column detection and mapping
- Fuzzy matching for field suggestions
- Data validation with error highlighting
- Preference-based formatting throughout

### Abort Functionality
- Persistent "Abort Setup" button (Phases 2-5)
- Returns to import choice screen
- Preserves user preferences
- Confirmation dialog before aborting

### Personalization
- Currency, date, and number format preferences
- Customizable account names
- User-defined categories and budgets
- Flexible income stream naming

## User Experience Principles (DEPRECATED)

### Progressive Disclosure
- Complex features revealed gradually
- Contextual help and guidance
- Clear progress indicators
- Minimal cognitive load per step

### Data Privacy
- Client-side file processing
- No data sharing during import
- Secure storage of preferences
- User control over all data

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- Mobile-responsive design
- Clear visual hierarchy

---

## Current Implementation Status (DEPRECATED)

### ✅ Completed Infrastructure (Now Archived)
- **Database Schema**: user_profiles table with onboarding_status field
- **Authentication System**: AuthContext extended with onboarding tracking
- **Currency Support**: DKK and European formatting implemented
- **Component Structure**: Onboarding components ready but disabled
- **State Management**: Onboarding state hooks prepared

### 🚫 Currently Disabled (Permanently)
- **Onboarding UI**: All onboarding components are disabled in ProtectedRoute
- **Import Flow**: File upload and data mapping features not active
- **Progress Tracking**: Onboarding status tracking not exposed to users

### 🔄 Ready for Future Revival
When ready to revive onboarding:
1. Review archived components in `/src/components/Onboarding/`
2. Update ProtectedRoute to show onboarding flow
3. Enable onboarding components in UI
4. Test complete flow with sample data
5. Configure feature flags for gradual rollout

---

## Technical Implementation Details (DEPRECATED)

### Database Schema Extensions (Archived)

#### User Profiles Table (Current - Simplified)
```sql
-- Current user_profiles structure (simplified)
CREATE TABLE public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    currency TEXT DEFAULT 'DKK' NOT NULL, -- Fixed to DKK
    timezone TEXT DEFAULT 'Europe/Copenhagen' NOT NULL, -- Fixed to CET
    role TEXT DEFAULT 'admin' NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    is_setup_complete BOOLEAN DEFAULT TRUE NOT NULL, -- Always true
    onboarding_status TEXT DEFAULT 'completed' NOT NULL CHECK (onboarding_status IN ('not_started', 'profile_setup', 'preferences_configured', 'categories_added', 'first_transaction', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### Component Architecture (Archived)

#### Main Onboarding Component (DISABLED)
```
src/components/Onboarding/ [ARCHIVED]
├── OnboardingFlow.tsx              # Main orchestrator component (DISABLED)
├── hooks/
│   ├── useOnboardingState.ts       # State management (ARCHIVED)
│   ├── useFileUpload.ts            # File handling (ARCHIVED)
│   └── useDataAnalysis.ts          # Data processing algorithms (ARCHIVED)
├── shared/
│   ├── ProgressIndicator.tsx       # Step progress visualization (ARCHIVED)
│   ├── DataPreview.tsx             # Generic data preview component (ARCHIVED)
│   └── AbortButton.tsx             # Persistent abort functionality (ARCHIVED)
└├── steps/
    ├── WelcomeStep.tsx             # Phase 1: Welcome & preferences (ARCHIVED)
    ├── ImportChoiceStep.tsx        # Phase 2: Import decision (ARCHIVED)
    ├── FileUploadStep.tsx          # Phase 2: File upload (ARCHIVED)
    ├── ColumnMappingStep.tsx        # Phase 3: Sequential column mapping (ARCHIVED)
    ├── PostImportConfigStep.tsx     # Phase 4: Post-import configuration (ARCHIVED)
    ├── SankeyViewStep.tsx          # Phase 4: Data visualization (ARCHIVED)
    ├── IncomeDiscoveryStep.tsx     # Phase 5: Income analysis (ARCHIVED)
    ├── BudgetFinalizationStep.tsx   # Phase 6: Budget setup (ARCHIVED)
    └── ReviewStep.tsx              # Phase 7: Final review (ARCHIVED)
```

## Making Available to Others (Future Consideration)

### Package Structure (When Revived)
```
mibudget-onboarding/
├── src/
│   ├── components/          # Reusable onboarding components
│   ├── hooks/             # Custom hooks for onboarding state
│   ├── utils/             # Data processing utilities
│   └── types/             # TypeScript definitions
├── docs/                  # Documentation and examples
├── tests/                 # Test suites
└── package.json           # Package configuration
```

### Distribution Options (Future)
1. **NPM Package**: `@mibudget/onboarding-flow`
2. **GitHub Repository**: Standalone onboarding library
3. **Component Library**: Storybook documentation
4. **Integration Guide**: Step-by-step setup instructions

### Customization Points (Future)
- **Theme Integration**: Adaptable to different UI frameworks
- **Data Schema**: Configurable for different data structures
- **Step Configuration**: Customizable onboarding steps
- **Localization**: Multi-language support infrastructure

---

## Migration to Fixed Configuration

### Current Implementation (January 2026)
- **Fixed Currency**: DKK (Danish Krone)
- **Fixed Timezone**: Europe/Copenhagen (CET)
- **Fixed Date Format**: YY/MM/DD
- **Fixed Number Format**: x,xxx.xx kr
- **Fixed Users**: Michael & Tanja (shared account)
- **Fixed Budgets**: Primary, Special, Klintemarken

### Removed Features
- User preference selection
- Currency/timezone choice
- Account name customization
- Import flow
- Onboarding checklist

### Retained Infrastructure
- Database schema (simplified)
- Authentication system (enhanced with device trust)
- Currency formatting utilities (fixed to DKK)
- User profile management (simplified)

---

## Revival Instructions (Future)

If needed in the future:

1. **Review Archived Components**: Check `/src/components/Onboarding/` directory
2. **Update Database Schema**: Add back preference fields
3. **Restore ProtectedRoute**: Enable onboarding flow
4. **Update AuthContext**: Restore preference management
5. **Test Integration**: Ensure compatibility with current system

### Files to Review
- `/src/components/Onboarding/` (archived components)
- `/src/contexts/AuthContext.tsx` (simplified version)
- `/src/components/Auth/ProtectedRoute.tsx` (onboarding disabled)
- `/src/lib/currency.ts` (formatting utilities)

---

**Note**: This onboarding system was fully functional but deprecated in favor of a simplified, fixed configuration for personal use. The code remains available for future reference or revival.
