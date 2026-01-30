# EPIC-004: AI Merchant Identification (Gemini Integration)

## 🎯 Objective
Eliminate the burden of decoding cryptic bank statement text by using Gemini AI to automatically identify merchants, clean up their names, and suggest appropriate categories.

## ❗ Problem Statement
Bank statement text like `MC/VISA DK K BILKA S@NDERBOR` is difficult to read and automate. Currently, users have to manually clean these names and search for rules. We need a way to solve this "at first sight."

## ✅ Success Criteria
- [ ] **AI Name Cleaning**: Transform cryptic strings into readable names (e.g. "Bilka Sønderborg").
- [ ] **Smart Categorization**: Predict the correct budget category based on global merchant knowledge.
- [ ] **Confidence Scoring**: Only auto-apply if the AI is certain; otherwise, present as a suggestion.
- [ ] **Reduced Friction**: A one-click "Identify & Save Rule" experience within the Merchant Manager.
- [ ] **Low Latency**: AI identification happens in < 2 seconds.

## 📋 Requirements
- Supabase Edge Function to securely communicate with the Gemini API.
- Integration hook in the frontend to trigger "AI Identify" for unknown merchants.
- System prompt for Gemini that understands Danish retail context.
- Fallback mechanism for when AI identification fails or is unavailable.

## 🛠️ Implementation Status
**Status**: `Proposed`

Conceptual design is complete. Implementation of the Edge Function is the next logic step.

### Proof of Work
- [MerchantManager.tsx](file:///Users/mimu/Datto%20Workplace/mimu.dev%20Projects/MiBudget/src/components/Settings/MerchantManager.tsx) - Targeted UI for integration.
