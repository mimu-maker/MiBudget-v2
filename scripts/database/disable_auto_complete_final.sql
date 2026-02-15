-- Disable Auto-Complete System Wide
-- Run this script in your Supabase SQL Editor to reset all existing auto-complete configurations.

-- 1. Reset 'is_auto_complete' flag on all Sources
UPDATE sources 
SET is_auto_complete = false 
WHERE is_auto_complete = true;

-- 2. Reset 'skip_triage' (which enables auto-complete) on all Source Rules
UPDATE source_rules 
SET skip_triage = false 
WHERE skip_triage = true;

-- 3. Reset 'skip_triage' on legacy Merchant Rules
UPDATE merchant_rules 
SET skip_triage = false 
WHERE skip_triage = true;
