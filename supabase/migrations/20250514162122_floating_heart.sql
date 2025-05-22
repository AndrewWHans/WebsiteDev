/*
  # Add archived status to routes table

  1. Changes
    - Update status check constraint to include 'archived' status
    - Add index for better query performance
*/

-- Update status check constraint to include 'archived' status
ALTER TABLE routes
DROP CONSTRAINT IF EXISTS routes_status_check;

ALTER TABLE routes
ADD CONSTRAINT routes_status_check 
CHECK (status IN ('active', 'inactive', 'completed', 'cancelled', 'archived'));

-- Add index for status column if it doesn't exist
CREATE INDEX IF NOT EXISTS routes_status_idx ON routes(status);