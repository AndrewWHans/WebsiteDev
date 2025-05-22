/*
  # Add categories to deals table

  1. Changes
    - Add category column to deals table
    - Add default categories for existing deals
    - Add index for better query performance
*/

-- Add category column to deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS deals_category_idx ON deals (category);

-- Update existing deals with default categories based on their titles
UPDATE deals
SET category = 
  CASE 
    WHEN title ILIKE '%bottle%' OR title ILIKE '%vip%' OR title ILIKE '%table%' THEN 'VIP Service'
    WHEN title ILIKE '%entry%' OR title ILIKE '%admission%' OR title ILIKE '%cover%' THEN 'Club Entry'
    WHEN title ILIKE '%drink%' OR title ILIKE '%bar%' OR title ILIKE '%cocktail%' THEN 'Drink Specials'
    WHEN title ILIKE '%food%' OR title ILIKE '%dinner%' OR title ILIKE '%meal%' THEN 'Food & Dining'
    WHEN title ILIKE '%event%' OR title ILIKE '%party%' OR title ILIKE '%festival%' THEN 'Events'
    ELSE 'Other'
  END
WHERE category IS NULL;