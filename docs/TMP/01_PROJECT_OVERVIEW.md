# MiBudget — Project Context

## What It Is
A personal household budget tool for Michael & Tanja. No GTM ambitions — built to serve one household.

Tracks real bank transactions, maps them to sources and categories, handles reconciliation of shared expenses, and shows an annual budget view. Live at `https://mibudget.mimu.dev`.

## Direction
The app is the **visualisation layer**. Claude (via MCP + file upload) is the **intelligence layer** — doing categorisation, source mapping, reconciliation, and analysis conversationally rather than building more app features to automate it.

Work style: drop a CSV or ask a question, Claude queries Supabase directly and does the work. The app shows the results.

## Stack
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI)
- **Router**: React Router v6
- **Data**: TanStack Query v5
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Hosting**: Vercel
- **Repo**: `https://github.com/mimu-maker/MiBudget-v2` (local: `/Users/mimu/MiMU.dev/MiBudget`)

## Active Branch
`Claude_0.2` — never commit directly to main.

## Auth Model
- Google OAuth only. Allowlist: `michaelmullally@gmail.com`, `tanjen2@gmail.com`, `qa@mimu.dev`, `automation@mimu.dev`
- Michael & Tanja share one account (`92325837-1cf0-4157-82c6-82a233389b1a`)
- Demo account (`00000000-0000-4000-a000-000000000001`) — safe for testing

## ⚠️ Data Safety
**Never write to the production account.** ID: `92325837-1cf0-4157-82c6-82a233389b1a`
Schema changes require review before execution.

## Key Concepts
See `02_TRANSACTIONS_ARCHITECTURE.md` for transaction logic.
See `00_SUPABASE_QUICK_REF.md` for DB layout and useful queries.
See `04_WHAT_WAS_BUILT_AND_FIXED.md` for history of changes.

## Repo Structure (relevant parts)
```
src/
  components/
    Transactions/           # Table, validation dashboard, source mapping
    Budget/                 # Annual budget table
    Overview/               # Dashboard
    Settings/               # Source rules, categories
    Reconciliation/         # Recon pivot
  contexts/
    UnifiedAuthContext.tsx  # ← useAuth() — use this everywhere
  hooks/
    useAnnualBudget.ts
    useValidationStats.ts   # Sidebar badge counts
  lib/
    transactionConstants.ts # SETTLED_STATUSES, isSettled()
    authUtils.ts            # ALLOWED_EMAILS, isEmailAllowed()
docs/
  TMP/                      # ← Context files for Claude chat
  logs/                     # Dated decision logs
```
