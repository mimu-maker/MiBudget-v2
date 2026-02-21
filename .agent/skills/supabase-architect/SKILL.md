---
name: supabase-architect
description: Manages schema and RLS policies for MiBudget's "Multi-Ready" architecture.
---
# Instructions
1. **Schema:** Ensure `transactions`, `merchant_rules`, and `budgets` are ready for an `account_id` foreign key.
2. **AI Categorization:** Manage the logic for the `merchant_rules` engine.
3. **Migrations:** Use the Supabase MCP to apply SQL changes without user manual input.
