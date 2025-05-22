/*
  # Add St. Petersburg as a city option

  1. Changes
    - Update city check constraint to include St. Petersburg
    - Ensure existing routes are not affected
*/

-- Update the city check constraint to include St. Petersburg
ALTER TABLE routes
DROP CONSTRAINT IF EXISTS routes_city_check;

ALTER TABLE routes
ADD CONSTRAINT routes_city_check 
CHECK (city IN ('Miami', 'Orlando', 'Tampa', 'St. Petersburg'));