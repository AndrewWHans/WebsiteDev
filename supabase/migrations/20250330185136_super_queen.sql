/*
  # Set timezone configuration to EST/EDT

  1. Changes
    - Set timezone to 'America/New_York' for the database
    - Add functions to handle timezone conversions
    - Update existing functions to use EST/EDT
*/

-- Set timezone to America/New_York (EST/EDT)
ALTER DATABASE postgres SET timezone TO 'America/New_York';

-- Create function to convert UTC to EST/EDT
CREATE OR REPLACE FUNCTION to_est(timestamptz)
RETURNS timestamptz AS $$
BEGIN
  RETURN $1 AT TIME ZONE 'America/New_York';
END;
$$ LANGUAGE plpgsql;

-- Create function to convert EST/EDT to UTC
CREATE OR REPLACE FUNCTION to_utc(timestamptz)
RETURNS timestamptz AS $$
BEGIN
  RETURN $1 AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql;

-- Update handle_private_ride_request_dates function
CREATE OR REPLACE FUNCTION handle_private_ride_request_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Store dates in EST/EDT
  NEW.pickup_date := NEW.pickup_date AT TIME ZONE 'America/New_York';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing records to EST/EDT
UPDATE private_ride_requests
SET pickup_date = pickup_date AT TIME ZONE 'America/New_York'
WHERE pickup_date IS NOT NULL;

-- Update routes table dates
UPDATE routes
SET date = date AT TIME ZONE 'America/New_York'
WHERE date IS NOT NULL;

-- Update ticket_bookings dates
UPDATE ticket_bookings
SET booking_date = booking_date AT TIME ZONE 'America/New_York'
WHERE booking_date IS NOT NULL;