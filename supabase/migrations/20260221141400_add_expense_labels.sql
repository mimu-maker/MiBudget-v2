CREATE TYPE expense_label AS ENUM ('Fixed Committed', 'Variable Essential', 'Discretionary');

ALTER TABLE categories ADD COLUMN label expense_label;
ALTER TABLE sub_categories ADD COLUMN label expense_label;
