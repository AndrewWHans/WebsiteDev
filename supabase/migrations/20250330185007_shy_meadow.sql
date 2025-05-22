/*
  # Fix timezone handling in private requests

  1. Changes
    - Add timezone handling to private_ride_requests table
    - Add function to ensure dates are stored in UTC
    - Add trigger to handle timezone conversion
*/

-- Create function to handle timezone conversion
CREATE OR REPLACE FUNCTION handle_private_ride_request_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure pickup_date is stored in UTC
  NEW.pickup_date = NEW.pickup_date AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle dates before insert/update
CREATE TRIGGER convert_private_ride_request_dates
  BEFORE INSERT OR UPDATE ON private_ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_private_ride_request_dates();

-- Update existing records to ensure they're in UTC
UPDATE private_ride_requests
SET pickup_date = pickup_date AT TIME ZONE 'UTC'
WHERE pickup_date IS NOT NULL;