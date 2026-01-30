# EPIC-006: Smart Receipt & Transaction Enrichment

> **Status:** 💡 **PROPOSED**  
> **Goal:** Transform the transaction log from a flat list into a rich, document-backed financial record with granular itemization.

---

## 📋 Context
Users currently see a single line item per transaction. However, a single "Supermarked" transaction often contains multiple distinct categories (Groceries, Household, Alcohol). Additionally, significant purchases lack backup documentation for warranty or tax purposes.

## ⭐ User Stories

### 1. File Attachment & Backup
**As a** user,  
**I want to** drag and drop a receipt (PDF/Image) onto a transaction row,  
**So that** the file is securely saved to Google Drive and linked to the transaction record for future reference.

### 2. AI Itemization
**As a** user,  
**I want** the system to scan the attached receipt using an LLM,  
**So that** it automatically extracts individual line items and prices without manual entry.

### 3. Granular Splitting
**As a** user,  
**I want to** split a single transaction into multiple sub-entries (by fixed amount, percentage, or selected items),  
**So that** I can assign different categories to different parts of a purchase (e.g., separating "Wine" from "Groceries").

---

## 🛠️ Technical Scope

### A. Frontend (React)
- **Dropzone**: Drag-and-drop area on `TransactionsTable` rows.
- **Split Modal**: UI for managing splits (Amount vs % vs Itemized).
- **Receipt Preview**: Visual indicator of attachment and preview modal.

### B. Backend (Supabase)
- **Storage**: Logic to handle file upload (Edge Function to GDrive).
- **Schema**: 
    - `transaction_items` table (FK to `transactions`).
    - `transactions` column `attachment_url` (or pointer to `transaction_files` if multiple allowed).

### C. Intelligence (Edge Functions)
- **OCR/Extraction**: Bridge to Gemini Pro 1.5.
- **Prompt Engineering**: Structured JSON output for receipt items.

---

## 📏 Acceptance Criteria

1.  **Upload**: User can drop a file; it appears as "Saved".
2.  **Drive Sync**: File actually appears in a designated GDrive folder (e.g., `MiBudget/Receipts/{Year}/{Month}`).
3.  **Item Extraction**: LLM returns a list of items with >90% price accuracy.
4.  **Splitting**: 
    - The sum of splits MUST equal the original total.
    - If "Itemizing", unassigned items grouping into a "Remainder" split.
5.  **Budget Impact**: Split categories correctly feed into the Budget/Actuals calculations.

---

## 🔗 Dependencies
- **@[api-expert]**: Google Drive API integration specifics.
- **@[supabase-architect]**: Schema for splits and JSONB vs Table decision.
- **@[product-owner]**: Validation of "Merchant Lookup" flow integration.

