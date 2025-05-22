/*
  # Fix route time schema

  1. Changes
    - Make time column nullable since we're using time_slots array
    - Add default value for time column
    - Add check constraint for time_slots array
*/

-- Make time column nullable and add default value
ALTER TABLE routes 
  ALTER COLUMN time DROP NOT NULL,
  ALTER COLUMN time SET DEFAULT '00:00:00';

-- Add check constraint to ensure time_slots array is not empty
ALTER TABLE routes
  ADD CONSTRAINT time_slots_not_empty 
  CHECK (array_length(time_slots, 1) > 0);