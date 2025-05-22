/*
  # Add route date to payment_links table

  1. Changes
    - Add route_date column to payment_links table with a default value
    - Update trigger function to handle route date
    - Add check constraint to ensure route_date is not null

  2. Security
    - Maintain existing RLS policies
*/

-- Add route_date column with a default value
ALTER TABLE payment_links
ADD COLUMN route_date DATE DEFAULT CURRENT_DATE NOT NULL;

-- Update existing payment links with route dates
UPDATE payment_links pl
SET route_date = r.date
FROM routes r
WHERE pl.route_id = r.id;

-- Remove the default after updating existing records
ALTER TABLE payment_links
ALTER COLUMN route_date DROP DEFAULT;

-- Update trigger function to include route date in logging
CREATE OR REPLACE FUNCTION handle_payment_link_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment_link was added and status is still pending
  IF NEW.payment_link IS NOT NULL 
     AND OLD.payment_link IS NULL 
     AND NEW.status = 'pending' THEN
    
    -- Log the update with route date
    RAISE LOG 'Payment link updated for payment_link id: %, link: %, date: %',
      NEW.id,
      NEW.payment_link,
      NEW.route_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;