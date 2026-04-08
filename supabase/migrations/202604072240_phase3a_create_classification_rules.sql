-- Phase 3a: Create classification_rules and backfill data
-- Created: 2026-04-07

CREATE TABLE IF NOT EXISTS public.classification_rules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL,

  -- Discriminator
  match_type           TEXT NOT NULL CHECK (match_type IN ('merchant', 'source')),

  -- Matching keys
  raw_name             TEXT,            -- merchant_name OR source_name
  clean_name           TEXT NOT NULL,   -- clean_merchant_name OR clean_source_name
  match_mode           TEXT NOT NULL DEFAULT 'contains' 
                          CHECK (match_mode IN ('exact', 'contains', 'starts_with')),

  -- Classification outputs
  auto_category        TEXT,
  auto_sub_category    TEXT,
  auto_budget          TEXT,
  skip_triage          BOOLEAN NOT NULL DEFAULT FALSE,
  auto_verify          BOOLEAN NOT NULL DEFAULT FALSE,
  auto_planned         BOOLEAN NOT NULL DEFAULT FALSE,
  auto_recurring       TEXT,
  secondary_categories TEXT[],

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account members can manage classification_rules" ON public.classification_rules;
CREATE POLICY "account members can manage classification_rules"
ON public.classification_rules
FOR ALL
USING (account_id = public.get_my_account_id())
WITH CHECK (account_id = public.get_my_account_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_classification_rules_account ON public.classification_rules(account_id);
CREATE INDEX IF NOT EXISTS idx_classification_rules_clean_name ON public.classification_rules(account_id, clean_name);

-- Backfill from merchant_rules
INSERT INTO classification_rules (
    id, account_id, user_id, match_type, raw_name, clean_name, match_mode, 
    auto_category, auto_sub_category, auto_budget, skip_triage, 
    auto_verify, auto_planned, auto_recurring, secondary_categories, 
    created_at, updated_at
)
SELECT 
    id, account_id, user_id, 'merchant', merchant_name, clean_merchant_name, COALESCE(match_mode,'contains'), 
    auto_category, auto_sub_category, auto_budget, skip_triage, 
    COALESCE(auto_verify,false), COALESCE(auto_planned,false), auto_recurring, secondary_categories, 
    created_at, updated_at
FROM merchant_rules
ON CONFLICT (id) DO NOTHING;

-- Backfill from source_rules
INSERT INTO classification_rules (
    account_id, user_id, match_type, raw_name, clean_name, match_mode, 
    auto_category, auto_sub_category, auto_budget, skip_triage, 
    auto_verify, auto_planned, auto_recurring, secondary_categories, 
    created_at, updated_at
)
SELECT 
    account_id, COALESCE(user_id, (SELECT user_id FROM user_profiles WHERE current_account_id = source_rules.account_id LIMIT 1)), 
    'source', source_name, COALESCE(clean_source_name, source_name), COALESCE(match_mode,'contains'), 
    auto_category, auto_sub_category, auto_budget, COALESCE(skip_triage,false), 
    false, COALESCE(auto_planned,false), auto_recurring, secondary_categories, 
    COALESCE(created_at,now()), COALESCE(updated_at,now())
FROM source_rules;
