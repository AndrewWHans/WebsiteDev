/*
  # Fix routes and locations relationship

  1. Changes
    - Convert pickup_location and dropoff_location columns to UUID type
    - Add proper foreign key constraints to locations table
    - Handle existing data conversion safely
    - Add indexes for performance

  2. Security
    - Maintain existing RLS policies
*/

-- First, create temporary columns to store the new UUIDs
ALTER TABLE routes 
ADD COLUMN pickup_location_new uuid,
ADD COLUMN dropoff_location_new uuid;

-- Convert existing text values to UUIDs if they exist using a safer approach
DO $$
BEGIN
  -- Update pickup_location values that are valid UUIDs
  UPDATE routes 
  SET pickup_location_new = CAST(pickup_location AS uuid)
  FROM locations
  WHERE pickup_location IS NOT NULL 
  AND pickup_location = locations.id::text;

  -- Update dropoff_location values that are valid UUIDs
  UPDATE routes 
  SET dropoff_location_new = CAST(dropoff_location AS uuid)
  FROM locations
  WHERE dropoff_location IS NOT NULL 
  AND dropoff_location = locations.id::text;
END $$;

-- Drop the old columns
ALTER TABLE routes 
DROP COLUMN IF EXISTS pickup_location,
DROP COLUMN IF EXISTS dropoff_location;

-- Rename the new columns
ALTER TABLE routes 
RENAME COLUMN pickup_location_new TO pickup_location;

ALTER TABLE routes 
RENAME COLUMN dropoff_location_new TO dropoff_location;

-- Add foreign key constraints
ALTER TABLE routes
ADD CONSTRAINT routes_pickup_location_fkey 
FOREIGN KEY (pickup_location) 
REFERENCES locations(id),
ADD CONSTRAINT routes_dropoff_location_fkey 
FOREIGN KEY (dropoff_location) 
REFERENCES locations(id);

-- Add indexes for better join performance
CREATE INDEX IF NOT EXISTS routes_pickup_location_idx ON routes (pickup_location);
CREATE INDEX IF NOT EXISTS routes_dropoff_location_idx ON routes (dropoff_location);