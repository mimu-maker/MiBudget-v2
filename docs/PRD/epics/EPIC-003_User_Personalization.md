# EPIC-003: User Personalization & Localization

## 🎯 Objective
Enable users to customize their MiBudget experience, starting with account-wide localization settings (Currency, Date Format, Language) and moving towards per-user preferences.

## ❗ Problem Statement
Currently, the application has hardcoded localization (English text, assumed formats). Users Michael and Tanja need a hybrid setup: English UI language but Danish currency and date formats. The current `AuthContext` is also overloaded, handling profile data alongside authentication state.

## ✅ Success Criteria
- [ ] **Schema Support**: `user_profiles` table supports `language`, `date_format`, and `amount_format`.
- [ ] **Default Settings**: New profiles (and existing Master Account) default to:
    - Language: `en-US` (English)
    - Currency: `DKK` (Danish Krone)
    - Date Format: `YY/MM/DD`
    - Amount Format: `x.xxx,xx` (Danish style)
- [ ] **Settings UI**: A new "General" tab in Settings allows modifying these values.
- [ ] **Architecture**: Profile state is managed in a dedicated `ProfileContext`, separate from `AuthContext`.
- [ ] **Sidebar Identity**: Sidebar displays the User's Name (e.g., "Michael") and Avatar instead of just email.

## 📋 Requirements & Technical Details

### Phase 1: Account-Level Localization (Current Scope)
- Since Michael and Tanja share a "Master Profile" ID in the backend (`master-account-id`), these settings will apply to **both** users when changed.
- **Fields**:
    - `language`: Enum (`en-US`, `da-DK`). Default `en-US`.
    - `currency`: Enum (`DKK`, `USD`, `EUR`). Default `DKK`.
    - `date_format`: Enum (`YYYY-MM-DD`, `DD/MM/YYYY`, `YY/MM/DD`). Default `YY/MM/DD`.
    - `amount_format`: Enum (`comma_decimal` aka 1.000,00, `dot_decimal` aka 1,000.00). Default `comma_decimal`.

### Phase 2: True Per-User Customization (Wishlist / Blocked)
- **Goal**: Allow Michael to see English and Tanja to see Danish on the same account.
- **Blocker**: Currently, the `AuthContext` forces a shared `user_profile` ID. We need to decouple "Account Settings" (shared) from "User Preferences" (individual).
- **Proposed Solution**: Create a new table `user_preferences` linked to the specific `auth.users.id`, carrying `theme`, `language`, and `sidebar_collapsed` state.

## 🛠️ Implementation Plan
1.  **DB Migration**: Add columns to `user_profiles`.
2.  **Refactor**: Split `AuthContext` -> `AuthContext` + `ProfileContext` + `SessionTimer`.
3.  **UI**: Build `GeneralSettings.tsx`.
4.  **Sidebar**: Update to use `ProfileContext.full_name`.

## 🚀 Status
**Status**: `In Progress`
