-- Add secondary_categories column to source_rules
ALTER TABLE public.source_rules
ADD COLUMN secondary_categories text[] DEFAULT '{}'::text[];

-- Add secondary_categories column to merchant_rules (legacy fallback)
ALTER TABLE public.merchant_rules
ADD COLUMN secondary_categories text[] DEFAULT '{}'::text[];
