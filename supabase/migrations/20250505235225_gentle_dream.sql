/*
  # Add extensions to deals table for location and date/time

  1. Changes
    - Add location_name column to deals table
    - Add location_address column to deals table
    - Add deal_date column to deals table
    - Add deal_time column to deals table
    - Add indexes for better query performance
*/

-- Add new columns to deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS deal_date DATE,
ADD COLUMN IF NOT EXISTS deal_time TIME;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS deals_location_name_idx ON deals (location_name);
CREATE INDEX IF NOT EXISTS deals_deal_date_idx ON deals (deal_date);