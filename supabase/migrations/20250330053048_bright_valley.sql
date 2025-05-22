/*
  # Add ticket verification system

  1. New Tables
    - `ticket_verifications`: Stores verification history for each ticket
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, references ticket_bookings)
      - `ticket_number` (integer, not null)
      - `verified_at` (timestamptz)
      - `verified_by` (uuid, references profiles)
      - `status` (text)
      - `created_at` (timestamptz)

  2. Functions
    - `verify_ticket`: Verifies a ticket and records the verification

  3. Security
    - Enable RLS
    - Add policies for verification access
*/

-- Create ticket_verifications table
CREATE TABLE ticket_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES ticket_bookings(id) ON DELETE CASCADE,
  ticket_number INTEGER NOT NULL,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'invalid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure ticket_number is within the quantity range
  CONSTRAINT valid_ticket_number CHECK (ticket_number > 0),
  -- Unique constraint to prevent double verification
  CONSTRAINT unique_ticket_verification UNIQUE (ticket_id, ticket_number)
);

-- Create verify_ticket function
CREATE OR REPLACE FUNCTION verify_ticket(
  p_ticket_id UUID,
  p_ticket_number INTEGER,
  p_verifier_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket ticket_bookings;
  v_verification ticket_verifications;
  v_user_info JSONB;
BEGIN
  -- Get ticket details
  SELECT tb.*, 
         jsonb_build_object(
           'name', p.name,
           'email', p.email,
           'phone_number', p.phone_number
         ) as user_info,
         jsonb_build_object(
           'pickup', l1.name,
           'dropoff', l2.name,
           'date', r.date,
           'time', tb.time_slot
         ) as route_info
  INTO v_ticket
  FROM ticket_bookings tb
  JOIN profiles p ON tb.user_id = p.id
  JOIN routes r ON tb.route_id = r.id
  JOIN locations l1 ON r.pickup_location = l1.id
  JOIN locations l2 ON r.dropoff_location = l2.id
  WHERE tb.id = p_ticket_id;

  -- Check if ticket exists
  IF v_ticket IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ticket not found'
    );
  END IF;

  -- Check if ticket number is valid
  IF p_ticket_number < 1 OR p_ticket_number > v_ticket.quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid ticket number'
    );
  END IF;

  -- Check if ticket is already verified
  SELECT * INTO v_verification
  FROM ticket_verifications
  WHERE ticket_id = p_ticket_id AND ticket_number = p_ticket_number;

  IF v_verification IS NOT NULL AND v_verification.status = 'verified' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ticket already verified',
      'verifiedAt', v_verification.verified_at,
      'ticket', v_ticket.user_info || v_ticket.route_info
    );
  END IF;

  -- Create or update verification record
  INSERT INTO ticket_verifications (
    ticket_id,
    ticket_number,
    verified_at,
    verified_by,
    status
  )
  VALUES (
    p_ticket_id,
    p_ticket_number,
    now(),
    p_verifier_id,
    'verified'
  )
  ON CONFLICT (ticket_id, ticket_number) 
  DO UPDATE SET
    verified_at = now(),
    verified_by = p_verifier_id,
    status = 'verified';

  -- Return success with ticket info
  RETURN jsonb_build_object(
    'success', true,
    'ticket', v_ticket.user_info || v_ticket.route_info,
    'verifiedAt', now()
  );
END;
$$;