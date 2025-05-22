/*
  # Add city column to routes table

  1. Changes
    - Add city column to routes table
    - Add check constraint to ensure valid city values
    - Add index for better query performance
*/

-- Add city column with check constraint
ALTER TABLE routes
ADD COLUMN city TEXT NOT NULL DEFAULT 'Miami' CHECK (city IN ('Miami', 'Orlando', 'Tampa'));

-- Add index for city column
CREATE INDEX routes_city_idx ON routes(city);

-- Update existing routes to have a default city
UPDATE routes SET city = 'Miami' WHERE city IS NULL;