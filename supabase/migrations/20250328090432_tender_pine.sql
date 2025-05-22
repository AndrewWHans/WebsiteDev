/*
  # Add refunded status to ticket_bookings table

  1. Changes
    - Update status check constraint to include 'refunded' status
    - Add stripe_payment_intent_id column to ticket_bookings table
*/

-- Update status check constraint
ALTER TABLE ticket_bookings 
DROP CONSTRAINT IF EXISTS ticket_bookings_status_check;

ALTER TABLE ticket_bookings
ADD CONSTRAINT ticket_bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'refunded'));

-- Add stripe_payment_intent_id column
ALTER TABLE ticket_bookings
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;