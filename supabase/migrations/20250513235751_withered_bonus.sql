/*
  # Add city column to deals table

  1. Changes
    - Add city column to deals table
    - Add check constraint for valid city values
    - Add index for better query performance
    - Set default city for new deals
*/

-- Add city column
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Miami';

-- Add check constraint to ensure valid city values
ALTER TABLE deals
ADD CONSTRAINT deals_city_check 
CHECK (city IN ('Miami', 'Orlando', 'Tampa', 'St. Petersburg', 'Oaxaca', 'Jersey Shore', 'Austin', 'Nashville'));

-- Add index for city column
CREATE INDEX IF NOT EXISTS deals_city_idx ON deals(city);

-- Set default city for existing deals in smaller batches
DO $$
DECLARE
  r RECORD;
  batch_size INT := 100;
  processed INT := 0;
BEGIN
  FOR r IN SELECT id FROM deals WHERE city IS NULL LIMIT batch_size
  LOOP
    UPDATE deals SET city = 'Miami' WHERE id = r.id;
    processed := processed + 1;
    
    -- Commit every 100 records to avoid long-running transactions
    IF processed % 100 = 0 THEN
      COMMIT;
    END IF;
  END LOOP;
END $$;