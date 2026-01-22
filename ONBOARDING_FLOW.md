# MiBudget Onboarding Experience

## Overview

**⚠️ SIMPLIFIED IMPLEMENTATION**  
The MiBudget onboarding experience has been simplified to a fixed configuration for personal use. The complex onboarding flow has been deprecated and archived in favor of a streamlined setup with predefined preferences.

**Current Status**: Fixed configuration with DKK currency, CET timezone, and shared account access.

## Current Implementation (Simplified)

### Fixed Configuration
- **Currency**: DKK (Danish Krone) - x,xxx.xx kr format
- **Timezone**: Europe/Copenhagen (CET)
- **Date Format**: YY/MM/DD
- **Users**: Michael & Tanja (shared account via email mapping)
- **Budgets**: Primary, Special, Klintemarken (predefined)
- **Account Name**: MiBudget (fixed)

### Authentication Flow
1. **Google OAuth**: Sign in with allowed emails
2. **Email Mapping**: Both emails map to shared master account
3. **Device Trust**: New devices require trust confirmation
4. **Session Management**: 45 days for trusted devices, 15 minutes for untrusted
5. **Direct Access**: No onboarding flow, straight to main app

### User Experience
- **No Setup Screens**: Users go directly to main application
- **Fixed Preferences**: All formatting and preferences are predefined
- **Shared Data**: Both users see and edit the same data
- **Device Security**: Trust prompts for new devices

---

## Archived Complex Onboarding

The original comprehensive onboarding flow has been archived and can be found at:
`/docs/archived/ONBOARDING_FLOW_DEPRECATED.md`

### Archived Features
- Multi-step onboarding wizard
- Data import functionality
- User preference selection
- Currency/timezone customization
- Account naming
- Budget creation wizard

---

## Current Technical Implementation

### Database Schema (Simplified)
```sql
CREATE TABLE public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    currency TEXT DEFAULT 'DKK' NOT NULL,
    timezone TEXT DEFAULT 'Europe/Copenhagen' NOT NULL,
    role TEXT DEFAULT 'admin' NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    is_setup_complete BOOLEAN DEFAULT TRUE NOT NULL,
    onboarding_status TEXT DEFAULT 'completed' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### Authentication System
- **Email Restrictions**: Only michaelmullally@gmail.com and tanjen2@gmail.com
- **Master Account**: Both emails map to single shared account
- **Device Trust**: Per-device trust management
- **Session Timeout**: Variable based on device trust

### Currency Formatting
- **Fixed Format**: x,xxx.xx kr (European number format)
- **Currency Symbol**: kr (Danish Krone)
- **Decimal Separator**: Comma (,)
- **Thousands Separator**: Period (.)

### Date Formatting
- **Fixed Format**: YY/MM/DD
- **Timezone**: CET (Central European Time)
- **Examples**: 26/01/26, 15/02/26

### Budget Structure
- **Primary**: Main budget for regular expenses
- **Special**: Special occasions and irregular expenses
- **Klintemarken**: Property-specific budget

---

## User Access Management

### Allowed Users
- **Michael**: michaelmullally@gmail.com
- **Tanja**: tanjen2@gmail.com

### Device Trust System
- **New Devices**: Prompt for trust confirmation
- **Trusted Devices**: 45-day session timeout
- **Untrusted Devices**: 15-minute session timeout
- **Device ID**: Persistent per browser/device

### Session Management
- **Auto Sign-out**: Based on device trust and activity
- **Shared Account**: Both users access same data
- **No Profile Setup**: Direct access to main application

---

## Future Considerations

### Potential Revival
If needed in the future, the complex onboarding flow can be revived from:
- `/docs/archived/ONBOARDING_FLOW_DEPRECATED.md`
- Archived components in `/src/components/Onboarding/`

### Enhancement Opportunities
- Multi-account support
- Individual user preferences
- Advanced data import
- Custom budget creation
- Mobile app integration

---

## Making Available to Others

### Current Limitations
- Fixed configuration for personal use
- Danish Krone only
- Shared account model
- No customization options

### Future Distribution
When making available to others, consider:
- Revive complex onboarding flow
- Add currency selection
- Implement multi-account support
- Add preference customization
- Include data import functionality

### Package Structure (Future)
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

---

## Summary

The MiBudget onboarding experience has been simplified to provide immediate access with fixed preferences optimized for personal use. The complex onboarding flow remains archived for potential future revival or adaptation for broader distribution.

**Key Changes:**
- ✅ Fixed DKK currency and x,xxx.xx kr formatting
- ✅ Fixed CET timezone (Europe/Copenhagen)
- ✅ Fixed YY/MM/DD date format
- ✅ Shared account for Michael & Tanja
- ✅ Device trust security
- ✅ Direct app access (no onboarding screens)
- ✅ Predefined budget structure

The system now provides a streamlined, secure, and consistent experience for the intended users while maintaining the infrastructure for future expansion.
