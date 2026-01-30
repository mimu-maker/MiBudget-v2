# 🚀 Go-Live Readiness Checklist

This document tracks the critical requirements and cleanup steps required for final production release.

## 🔐 1. Authentication & Security
- [x] **Master Profile Mapping**: Verify both authorized emails map to the shared household profile.
- [x] **Restricted Access**: Google OAuth restricted to `ALLOWED_EMAILS` in `authUtils.ts`.
- [ ] **QA Backdoor Removal**: 
    - [ ] Delete `qa@mimu.dev` from `ALLOWED_EMAILS`.
    - [ ] Delete `automation@mimu.dev` from `ALLOWED_EMAILS`.
- [x] **Production Env**: Set `VITE_DEV_BYPASS_AUTH=false`.
- [x] **Session Policy**: Verify 45-day persistence for trusted devices and 15-minute timeout for untrusted.

## 🏗️ 2. Infrastructure & Data
- [x] **Database Migrations**: All migrations from `supabase/migrations/` applied to production.
- [ ] **RLS Audit**: Confirm Row Level Security (RLS) is active on all tables with authenticated-only access.
- [ ] **Edge Functions**: Deploy Gemini integration and merchant decoding functions.

## 🎨 3. UI/UX & Localization
- [x] **Danish Formatting**: Fixed DKK currency and YY/MM/DD date format throughout.
- [x] **Budget Clarity**: "UNDER/OVER" status labels implemented.
- [ ] **Mathematical Integrity**: (BUD-003) Validate Annual/Monthly/% auto-calculation rules.
- [ ] **YTD Visuals**: "Budget YTD" vs "Spent YTD" comparison column verified.

## 📉 4. Cleanup
- [ ] **Sidebar Cleanup**: Remove the "Debug: Force Clear" and associated diagnostic buttons.
- [ ] **Log Purge**: Remove developer-only `console.log` statements from production build.
- [ ] **Mock Data**: Ensure all mock data references are replaced by real Supabase fetches.
