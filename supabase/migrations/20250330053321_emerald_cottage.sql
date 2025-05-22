/*
  # Fix verify_ticket function to properly handle JSONB data

  1. Changes
    - Update verify_ticket function to properly handle nested JSONB objects
    - Fix data structure returned by the function
    - Improve error handling and logging
*/

-- Drop and recreate the verify_ticket function with fixed JSONB handling
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
  v_ticket RECORD;
  v_verification ticket_verifications;
  v_result JSONB;
BEGIN
  -- Get ticket details with all necessary information
  SELECT 
    tb.id,
    tb.quantity,
    tb.time_slot,
    r.date,
    jsonb_build_object(
      'name', COALESCE(p.first_name || ' ' || p.last_name, p.name),
      'email', p.email,
      'phone_number', p.phone_number
    ) as user_data,
    jsonb_build_object(
      'pickup', l1.name,
      'dropoff', l2.name,
      'date', r.date,
      'time', tb.time_slot
    ) as route_data
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
      'name', v_ticket.user_data->>'name',
      'email', v_ticket.user_data->>'email',
      'phone_number', v_ticket.user_data->>'phone_number',
      'pickup', v_ticket.route_data->>'pickup',
      'dropoff', v_ticket.route_data->>'dropoff',
      'date', v_ticket.route_data->>'date',
      'time', v_ticket.route_data->>'time'
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

  -- Return success with flattened ticket info
  RETURN jsonb_build_object(
    'success', true,
    'name', v_ticket.user_data->>'name',
    'email', v_ticket.user_data->>'email',
    'phone_number', v_ticket.user_data->>'phone_number',
    'pickup', v_ticket.route_data->>'pickup',
    'dropoff', v_ticket.route_data->>'dropoff',
    'date', v_ticket.route_data->>'date',
    'time', v_ticket.route_data->>'time',
    'verifiedAt', now()
  );
END;
$$;