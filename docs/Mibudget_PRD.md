# Epic: MiBudget Personal Finance Management System

## 🎯Objective & Scope
### Objective

A comprehensive personal finance management application that provides streamlined budget tracking, transaction management, and financial projections for a shared household account. MiBudget delivers immediate value through fixed Danish Krone formatting, simplified authentication, and intuitive financial oversight.

**In Scope:** 
- Personal finance tracking with fixed DKK currency formatting
- Shared account access for two users (Michael & Tanja)
- Transaction management with AI-powered categorization
- Budget tracking across three predefined budgets (Primary, Special, Klintemarken)
- Financial projections and overview dashboards
- Device-based security with Google OAuth authentication
- Danish locale formatting (dates, currency, timezone)

**Out of Scope:** 
- Multi-currency support
- Individual user accounts
- Complex onboarding flows
- Mobile applications
- Third-party bank integrations
- Investment/portfolio tracking

---

## KPI & Goals 
| Goal | KPI | Target/Timeframe | Measurement Method |
| :--- | :--- | :--- | :--- |
| User Adoption | Session Frequency | Daily usage by both users | Supabase analytics tracking |
| Data Quality | Transaction Categorization Rate | 95% auto-categorized within 30 days | Database query of categorized vs uncategorized |
| User Experience | Device Trust Acceptance | 100% trust confirmation on new devices | Authentication event tracking |
| Financial Insight | Budget Adherence | Monthly variance < 10% across all budgets | Budget vs actual spending analysis |
| System Reliability | Uptime | 99.5% availability | Supabase monitoring and error tracking |

---

## Pre-requisites 
*List any accounts, API keys, or environments needed before starting.*

### Required Accounts
- **Google Cloud Project**: For OAuth 2.0 authentication
- **Supabase Project**: Database and authentication backend
- **Allowed Google Accounts**: michaelmullally@gmail.com, tanjen2@gmail.com

### Environment Variables
```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### Development Environment
- Node.js 18+ and npm
- Modern web browser with JavaScript enabled
- Git for version control

---

## Requirements 
**User Story:** 
* **As a:** Shared household user 
* **I want to:** Track and manage our personal finances in a single, unified application 
* **So that I can:** Maintain oversight of our spending, stay within budget, and make informed financial decisions together 

| Requirement | Acceptance Criteria | Notes |
| :--- | :--- | :--- |
| **Authentication** | Users can sign in with Google OAuth using allowed emails only | Both emails map to shared master account |
| **Device Security** | New devices require trust confirmation, sessions timeout appropriately | 45 days for trusted, 15 minutes for untrusted |
| **Transaction Management** | Users can add, edit, and categorize transactions with DKK formatting | AI-powered auto-categorization available |
| **Budget Tracking** | Three predefined budgets (Primary, Special, Klintemarken) with spending limits | Visual indicators for budget adherence |
| **Financial Overview** | Dashboard shows spending trends, budget status, and projections | Interactive charts and period selection |
| **Danish Formatting** | All amounts display as "x.xxx,xx kr", dates as "YY/MM/DD", CET timezone | Fixed formatting throughout application |
| **Shared Access** | Both users can view and edit the same financial data | Real-time synchronization |
| **Data Validation** | Transaction validation dashboard for reviewing uncategorized items | Manual review and correction workflow |

---

## Design & Tech Notes 
* **Supporting Docs:** [ONBOARDING_FLOW.md](./ONBOARDING_FLOW.md), [SIMPLIFIED_SETUP_SUMMARY.md](./SIMPLIFIED_SETUP_SUMMARY.md) 
* **Designs:** Modern React-based UI with shadcn/ui components, responsive design for desktop use
* **Implementation Notes:** 
  - **Frontend**: React 18 + TypeScript + Vite
  - **UI Framework**: shadcn/ui + Tailwind CSS
  - **Backend**: Supabase (PostgreSQL + Auth + Realtime)
  - **State Management**: React Query + Context API
  - **Authentication**: Google OAuth with email restrictions
  - **Database Schema**: Transactions, user_profiles, merchant_rules tables
  - **AI Features**: Transaction categorization using merchant rules engine
* **Rollout Plan:** 
  1. **Development Setup**: Clone repository, install dependencies, configure environment variables
  2. **Database Migration**: Run Supabase migrations to create required tables
  3. **Authentication Configuration**: Set up Google OAuth with allowed email domains
  4. **Local Testing**: Run `npm run dev` for development server
  5. **Production Deployment**: Deploy via Vercel/Netlify with Supabase integration

### Technical Architecture

```typescript
// Core Application Structure
src/
├── components/
│   ├── Auth/           # Authentication components
│   ├── Budget/         # Budget tracking UI
│   ├── Transactions/   # Transaction management
│   ├── Overview/       # Dashboard components
│   └── ui/            # Reusable UI components
├── contexts/          # React contexts for state
├── hooks/            # Custom React hooks
├── lib/              # Utility functions (currency, dates)
├── pages/            # Route components
└── integrations/
    └── supabase/     # Database client configuration
```

### Database Schema
```sql
-- Phase 1: Single Account (Current Implementation)
user_profiles        # User preferences and settings
transactions         # Financial transactions  
merchant_rules      # AI categorization rules
budgets            # Budget definitions and limits

-- Phase 2: Multi-Account (Future-Ready Architecture)
-- accounts             # Top-level account container (independent)
-- account_users        # Many users per account relationship  
-- user_profiles        # User preferences and settings (per account)
-- transactions         # Financial transactions (scoped to account)
-- merchant_rules      # AI categorization rules (scoped to account)
-- budgets            # Budget definitions and limits (scoped to account)

-- Note: Current implementation designed for easy migration to multi-account
```

### Key Features Implementation
- **Currency Formatting**: Fixed DKK with European number format
- **Date Handling**: YY/MM/DD format in Copenhagen timezone
- **Security**: Device fingerprinting and trust management
- **Real-time Updates**: Supabase realtime subscriptions
- **Data Validation**: Transaction review and correction workflow

---

## Development Status

### ✅ Completed Features
- Google OAuth authentication with email restrictions
- Device trust and session management
- Fixed DKK currency formatting
- Danish date formatting (YY/MM/DD)
- Shared account access model
- Transaction management interface
- Budget tracking with three predefined budgets
- Overview dashboard with spending trends
- AI-powered transaction categorization
- Transaction validation dashboard
- Financial projections interface

### 🔄 Current Configuration
- **Currency**: DKK (Danish Krone) - x,xxx.xx kr format
- **Timezone**: Europe/Copenhagen (CET)
- **Users**: Michael & Tanja (shared account)
- **Budgets**: Primary, Special, Klintemarken
- **Authentication**: Google OAuth only (local auth disabled)

### 📋 Annual Budget System

#### Core Architecture
- **Categories**: Calculated totals from sub-categories (read-only)
- **Sub-categories**: Individually editable budget amounts
- **Three Adjustment Columns**: Annual, Monthly, % of Income
- **Auto-calculation**: Edit any column → other two auto-update

#### Budget Adjustment Logic
```
Housing (30% of income): $3,000  ← NOT editable
├── Rent: $2,000 (20% of income)     ← Editable
├── Utilities: $500 (5% of income)       ← Editable  
└── Maintenance: $500 (5% of income)    ← Editable
```

#### Column Calculations
- **Annual**: Monthly × 12
- **Monthly**: Direct input
- **% of Income**: (Sub-category ÷ Total Income) × 100

#### Auto-calculation Rules
- **Edit Annual** → Monthly ÷ 12, % = (annual ÷ 12) ÷ total income
- **Edit Monthly** → Annual × 12, % = monthly ÷ total income  
- **Edit %** → Monthly = (% × total income), Annual = monthly × 12
4. **Budget Tracking**: Verify budget limits and visual indicators
5. **Shared Access**: Confirm both users see identical data
6. **Date Formatting**: Verify YY/MM/DD format consistency

This PRD reflects the current implementation state of MiBudget as a streamlined personal finance management system optimized for shared household use with Danish formatting preferences.

---

## � User Stories & Implementation Status

### 🔴 **Critical Issues - Blocking**

#### Story: BUD-001 - Fix Sub-Category Auto-Clearing Bug
**User Story:** As a user managing my budget, I want to edit sub-category amounts without them auto-clearing after entering a value, so that I can accurately set my budget allocations.

**Current Status:** ❌ **BLOCKING**  
**Confidence:** 🟢 **HIGH** (Issue confirmed in code)  
**Problem:** Sub-category input fields clear immediately after entering values due to state management issues in `handleUpdateBudget` function.

**Technical Details:**
- Issue in `/src/pages/Budget.tsx` lines 109-120
- `setEditingBudget(null)` called immediately after update, causing input to unmount
- `refreshBudget()` call may be resetting the form state
- Input fields lose focus and clear value on blur/enter

**Acceptance Criteria:**
- [ ] User can click to edit sub-category annual/monthly/percent fields
- [ ] Input field retains focus and value during editing
- [ ] Value persists after blur/enter key press
- [ ] Auto-calculation updates other two columns correctly
- [ ] No form state reset during update process

---

#### Story: BUD-002 - Remove Main Category Amount Fields
**User Story:** As a user viewing my budget structure, I want main categories to show calculated totals only (not editable), so that I understand they're aggregates of sub-categories.

**Current Status:** ❌ **BLOCKING**  
**Confidence:** 🟢 **HIGH** (Confirmed in current UI)  
**Problem:** Main categories still display as editable amounts instead of read-only calculated totals.

**Technical Details:**
- Issue in `/src/pages/Budget.tsx` lines 313-322
- Main categories show formatted amounts but should be clearly non-interactive
- Need to remove any click handlers or edit capabilities from main category rows
- Should display calculated sum of sub-categories, not independent budget_amount

**Acceptance Criteria:**
- [ ] Main category amounts are displayed as read-only text
- [ ] No hover effects or click interactions on main category amounts
- [ ] Main category totals correctly sum all sub-category amounts
- [ ] Visual distinction between editable sub-categories and read-only main categories
- [ ] Tooltips or visual indicators showing main categories are calculated

---

### 🟡 **High Priority - In Progress**

#### Story: AUTH-001 - Complete Authentication Flow Testing
**User Story:** As a user, I want to sign in seamlessly with Google OAuth and access my budget data, so that I can manage my finances without authentication issues.

**Current Status:** 🟡 **IN PROGRESS**  
**Confidence:** 🟡 **MEDIUM** (Fixes applied but needs validation)  
**Recent Changes:** Fixed user ID mismatch in profile creation, restored device trust security.

**Technical Details:**
- Fixed `fetchUserProfile` user ID consistency in `/src/contexts/AuthContext.tsx`
- Restored device trust prompts and session timeouts
- Server running on http://localhost:8080/

**Acceptance Criteria:**
- [ ] Google OAuth login works for both allowed emails
- [ ] User profile creation succeeds on first login
- [ ] Device trust prompts appear for new devices
- [ ] Session timeouts work correctly (45 days trusted, 15 minutes untrusted)
- [ ] No authentication redirect loops

---

### 🟢 **Medium Priority - Up Next**

#### Story: BUD-003 - Implement Three-Column Auto-Calculation
**User Story:** As a user setting budget amounts, I want to edit any of the three columns (annual/monthly/percent) and have the others auto-calculate, so that I can work with my preferred budgeting method.

**Current Status:** 🟢 **UP NEXT**  
**Confidence:** 🟡 **MEDIUM** (Logic exists but may need refinement)  
**Technical Details:**
- Auto-calculation logic exists in `handleUpdateBudget` function
- Need to verify calculations work correctly after fixing BUD-001
- Should handle edge cases (zero income, invalid inputs)

**Acceptance Criteria:**
- [ ] Edit annual → monthly ÷ 12, % calculated automatically
- [ ] Edit monthly → annual × 12, % calculated automatically  
- [ ] Edit % → monthly and annual calculated based on total income
- [ ] Calculations respect DKK formatting and decimal precision
- [ ] Error handling for invalid inputs (negative numbers, text)

---

#### Story: CAT-001 - Complete Category Management System
**User Story:** As a budget administrator, I want to manage budget categories and sub-categories through a proper interface, so that I can customize my budget structure.

**Current Status:** 🟢 **UP NEXT**  
**Confidence:** 🟡 **MEDIUM** (Referenced in conversation but not implemented)  
**Technical Details:**
- Need to implement category creation/editing interface
- Should integrate with existing budget structure
- Need proper validation and constraints

**Acceptance Criteria:**
- [ ] Add new main categories with proper grouping
- [ ] Add/edit/delete sub-categories within main categories
- [ ] Category management UI accessible from budget page
- [ ] Validation for category names and budget allocations
- [ ] Proper database updates and state management

---

### 🔵 **Low Priority - Backlog**

#### Story: UI-001 - Enhance Budget Visual Design
**User Story:** As a user, I want a clear, visually appealing budget interface, so that I can easily understand my financial situation at a glance.

**Current Status:** 🔵 **BACKLOG**  
**Confidence:** 🟢 **HIGH** (UI improvements identified)  

**Acceptance Criteria:**
- [ ] Improved visual hierarchy between main categories and sub-categories
- [ ] Better color coding for different budget types
- [ ] Responsive design improvements for mobile devices
- [ ] Enhanced tooltips and help text
- [ ] Loading states and error handling improvements

---

#### Story: PERF-001 - Optimize Budget Loading Performance
**User Story:** As a user, I want the budget page to load quickly and respond fast to edits, so that I can manage my budget efficiently.

**Current Status:** 🔵 **BACKLOG**  
**Confidence:** 🟡 **MEDIUM** (Performance not yet measured)  

**Acceptance Criteria:**
- [ ] Budget data loads within 2 seconds
- [ ] Sub-category updates reflect immediately without full page refresh
- [ ] Optimized database queries for budget calculations
- [ ] Proper caching of budget data
- [ ] Loading indicators for async operations

---

## 🎯 Implementation Priority Matrix

### **Sprint Focus (Next 2-3 days)**
1. **BUD-001** - Fix sub-category auto-clearing (CRITICAL)
2. **BUD-002** - Remove main category editing (CRITICAL)  
3. **AUTH-001** - Complete authentication testing (HIGH)

### **Next Sprint (Following week)**
4. **BUD-003** - Three-column auto-calculation (MEDIUM)
5. **CAT-001** - Category management system (MEDIUM)

### **Future Enhancements**
6. **UI-001** - Visual design improvements (LOW)
7. **PERF-001** - Performance optimization (LOW)

---

## 📊 Overall Project Health

### **Completed Features ✅**
- Google OAuth authentication framework
- Danish Krone formatting (x.xxx,xx kr)
- Date formatting (YY/MM/DD) in CET timezone
- Budget structure with main categories and sub-categories
- Transaction management system
- Device security framework
- Annual budget data structure

### **Known Issues 🐛**
- Sub-category input fields auto-clear after editing (BUD-001)
- Main categories show editable amounts instead of read-only totals (BUD-002)
- Authentication flow needs final validation (AUTH-001)

### **Technical Debt 🏗️**
- Form state management in budget editing needs refactoring
- Error handling could be more robust
- Loading states need improvement across the application

---

---

## �🔍 Validation Checklist & Architecture Readiness

### Phase 1: Single Account Validation (Current)

| Requirement | Current Implementation | Status | Future-Ready Notes |
| :--- | :--- | :--- | :--- |
| **Two-User Access** | Michael & Tanja shared account | ✅ **WORKING** | Email mapping can be extended to account_users table |
| **Data Scoping Foundation** | Global tables (single account) | ✅ **ACCEPTABLE** | Tables designed to easily add account_id foreign keys |
| **Authentication System** | Google OAuth with email restrictions | ✅ **WORKING** | Auth context structured for account-based expansion |
| **Device Security** | Device trust with session management | ✅ **WORKING** | Account-agnostic, will work with multi-account |
| **Danish Formatting** | Fixed DKK, YY/MM/DD, CET timezone | ✅ **WORKING** | Per-account formatting ready for future preferences |

### Phase 2: Multi-Account Readiness Assessment

| Future Requirement | Current Architecture Readiness | Migration Complexity | Implementation Notes |
| :--- | :--- | :--- | :--- |
| **Account Containers** | 🟢 **READY** - Easy to add accounts table | 🟢 **LOW** | Simple migration, no data restructuring |
| **User-Account Relations** | 🟡 **PARTIAL** - Email mapping exists | 🟡 **MEDIUM** | Convert hardcoded mapping to account_users table |
| **Data Isolation** | 🟢 **READY** - Clean table structure | 🟢 **LOW** | Add account_id foreign keys to existing tables |
| **Account Switching** | 🟡 **PARTIAL** - Auth context ready | 🟡 **MEDIUM** | Add account selection UI and session management |
| **Independent Settings** | 🟢 **READY** - user_profiles table exists | 🟢 **LOW** | Add account_id relationship, migrate existing settings |

### Architecture Decisions for Future Expansion

#### ✅ **Good Decisions Made**
1. **Clean Table Structure** - No complex joins that would hinder multi-account
2. **Separate Auth Context** - Can be extended for account-based auth
3. **Modular Components** - UI components can be reused for account management
4. **Supabase Foundation** - Built-in support for multi-tenant patterns

#### � **Migration Strategy When Ready**
```sql
-- Phase 1: Add account infrastructure (minimal disruption)
CREATE TABLE accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE account_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES accounts(id),
    user_id UUID REFERENCES auth.users(id),
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 2: Migrate existing data to default account
INSERT INTO accounts (name) VALUES ('MiBudget');
-- Migrate existing user_profiles, transactions, budgets, merchant_rules
-- Add account_id foreign keys
```

### Current Implementation Philosophy

**"Single Account, Multi-Ready"** - The current implementation optimizes for the immediate need (two users, one account) while ensuring the architecture can scale to multi-account without major refactoring.

### Validation Test Cases

#### ✅ **Current Working Features (Phase 1)**
- [x] Google OAuth authentication for 2 specified emails
- [x] Device trust management with session timeouts
- [x] DKK currency formatting (x.xxx,xx kr)
- [x] Danish date formatting (YY/MM/DD) in CET timezone
- [x] Transaction entry/editing with AI categorization
- [x] Budget tracking across 3 predefined budgets
- [x] Shared data access for both users
- [x] Real-time updates via Supabase

#### 🟡 **Future-Ready Features (Phase 2 - When Needed)**
- [x] Database schema ready for account_id foreign keys
- [x] Authentication system structured for account expansion
- [x] Component architecture reusable for account management
- [ ] Account creation and management UI
- [ ] User invitation system for accounts
- [ ] Account switching interface
- [ ] Account-specific settings and preferences

### Implementation Timeline

#### **Phase 1: Complete (Current State)**
- ✅ Single shared account for Michael & Tanja
- ✅ All core financial features working
- ✅ Danish formatting and security implemented

#### **Phase 2: Future Expansion (When Required)**
- 🔄 Add accounts table and migrate existing data
- 🔄 Implement account_users relationship
- 🔄 Build account management UI
- 🔄 Add account switching functionality

### Architecture Benefits

1. **No Premature Complexity** - Current implementation stays simple for actual use case
2. **Low Migration Cost** - Easy to add multi-account when needed
3. **Clean Codebase** - No technical debt from unused multi-account features
4. **Scalable Foundation** - Supabase and React architecture support growth

---

**Summary**: The current single-account implementation is the right choice for the current two-user requirement while being architected for easy future expansion to multi-account when the need arises. The validation shows minimal migration complexity and a clear path forward.
