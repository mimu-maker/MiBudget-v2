ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en-US',
ADD COLUMN IF NOT EXISTS date_format text DEFAULT 'YY/MM/DD',
ADD COLUMN IF NOT EXISTS amount_format text DEFAULT 'comma_decimal';

-- Update existing rows to the requested defaults if they are null
UPDATE user_profiles 
SET 
  language = 'en-US', 
  date_format = 'YY/MM/DD', 
  amount_format = 'comma_decimal'
WHERE language IS NULL;
