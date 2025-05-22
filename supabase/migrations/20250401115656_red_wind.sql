/*
  # Add round trip functionality to private ride requests

  1. Changes
    - Add return_date column to private_ride_requests table
    - Add return_time column to private_ride_requests table
    - Add trip_type column to private_ride_requests table
    - Update trigger function to handle new columns
    - Add check constraint for trip_type values

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to private_ride_requests table
ALTER TABLE private_ride_requests
ADD COLUMN return_date DATE,
ADD COLUMN return_time TIME,
ADD COLUMN trip_type TEXT NOT NULL DEFAULT 'one-way' CHECK (trip_type IN ('one-way', 'round-trip'));

-- Update trigger function to handle timezone conversion for return_date
CREATE OR REPLACE FUNCTION handle_private_ride_request_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Store dates in EST/EDT
  NEW.pickup_date := NEW.pickup_date AT TIME ZONE 'America/New_York';
  
  -- Also handle return_date if it exists
  IF NEW.return_date IS NOT NULL THEN
    NEW.return_date := NEW.return_date AT TIME ZONE 'America/New_York';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add check constraint to ensure return date/time are provided for round trips
ALTER TABLE private_ride_requests
ADD CONSTRAINT round_trip_requires_return_info
CHECK (
  (trip_type = 'one-way') OR 
  (trip_type = 'round-trip' AND return_date IS NOT NULL AND return_time IS NOT NULL)
);

-- Add constraint to ensure return date is not before pickup date
ALTER TABLE private_ride_requests
ADD CONSTRAINT return_date_after_pickup
CHECK (
  (return_date IS NULL) OR 
  (return_date >= pickup_date)
);

-- Update existing records to have trip_type = 'one-way'
UPDATE private_ride_requests
SET trip_type = 'one-way'
WHERE trip_type IS NULL;