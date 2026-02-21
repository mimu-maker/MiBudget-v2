-- Migration to add color to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color VARCHAR(20);
