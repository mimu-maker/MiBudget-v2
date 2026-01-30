# 🏦 MiBudget: The Household Finance OS
> **Status:** In Production Evolution  
> **Mission:** Transform fragmented household spending into a unified, predictive financial engine.

---

## 💎 Project Vision
MiBudget is not just a tracker; it is a **single source of truth** for a shared household. It bridges the gap between historical bank statements and future financial goals with a focus on precision, speed, and Danish cultural context.

### 🇩🇰 Core Localization Standards
*   **Currency**: Fixed Danish Krone (`x.xxx,xx kr`).
*   **Numerals**: European format (period thousands, comma decimals).
*   **Temporal**: YY/MM/DD format, Copenhagen (CET) timezone.
*   **Accessibility**: High-contrast, interactive dashboards optimized for desktop oversight.

---

## 🏛️ Strategic Architecture

### 1. "Single Account, Multi-Ready" (SAMR)
We currently operate on a **Master Account Philosophy**. 
- **Users**: Michael & Tanja.
- **Mapping**: Both authenticated Google identities map to a single `master_account`.
- **Logic**: This eliminates synchronization conflicts and ensures real-time parity in financial data.
- **Future-Proofing**: The DB schema includes `account_id` foreign keys, ready for a multi-tenant transition if needed.

### 2. The Annual Budget Engine
A sophisticated three-pronged adjustment system for sub-categories:
- **Annual**: Total yearly allocation.
- **Monthly**: Operational monthly ceiling.
- **% of Income**: Dynamic allocation based on total household revenue.
*Editing any one column triggers an atomic update across the triplet to maintain mathematical integrity.*

---

## 🗺️ Functional Epics & Status

### 🔐 [EPIC-001] Authentication & Trust
- **Implementation**: Google OAuth restricted to `allowed_emails`.
- **Security**: Device Trust Management (45-day persistence for trusted hardware).
- **Status**: ✅ **STABLE**

### 📊 [EPIC-002] Budget Planning
- **Components**: Three distinct budgets: **Primary**, **Special**, and **Klintemarken**.
- **UX**: Calculated main categories (read-only) with editable sub-categories.
- **Status**: 🔄 **ACTIVE** (Improving stability and visual feedback)

### 💸 [EPIC-003] Transaction Intake
- **Workflow**: CSV Import ➔ Fuzzy Mapping ➔ Staging ➔ Manual Triage.
- **Logic**: Merchant rules automatically categorize transactions based on historical patterns.
- **Status**: ✅ **FUNCTIONAL**

### 🧠 [EPIC-004] AI Intelligence
- **Integration**: Gemini Pro via Supabase Edge Functions.
- **Goal**: Decoding cryptic bank strings and suggesting merchant rules.
- **Status**: 💡 **PROPOSED**

### 🧾 [EPIC-006] Smart Receipts
- **Features**: File Drop (GDrive Backup), AI Itemization, Transaction Splitting.
- **Goal**: Granular tracking and document backup.
- **Status**: 💡 **PROPOSED**

---

---

## 🚀 Readiness & Stabilization

Before formal release, we track quality and security through two dedicated registers:

1.  **[Go-Live Readiness Checklist](./GO_LIVE_CHECKLIST.md)**: Final security, cleanup, and deployment gates.
2.  **[Stabilization Plan](./STABILIZATION_PLAN.md)**: Real-time tracking of calculation bugs and UI refinements.

---

## 📈 KPIs for Excellence
1.  **Zero Drift**: Budget variance remains < 3% MoM.
2.  **Interaction Velocity**: A transaction should be categorized in < 2 clicks.
3.  **Visual Clarity**: Immediate "Glanceability" of financial health (Green vs Red).

---
**MiBudget** — *Designed for clarity, built for security.*
