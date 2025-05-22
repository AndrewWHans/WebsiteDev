/*
  # Remove driver role check from ticket verification

  1. Changes
    - Remove driver role check from verify_ticket function
    - Keep all other functionality intact
    - Maintain transaction safety and error handling
*/

-- Drop existing function
DROP FUNCTION IF EXISTS verify_ticket(UUID, INTEGER, UUID);

-- Create improved verify_ticket function without driver check
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
  v_verification RECORD;
BEGIN
  -- Get ticket details with all necessary information
  SELECT 
    tb.id,
    tb.quantity,
    tb.time_slot,
    tb.status as booking_status,
    r.date,
    r.status as route_status,
    jsonb_build_object(
      'name', COALESCE(p.first_name || ' ' || p.last_name, p.name),
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

  -- Check if booking is confirmed
  IF v_ticket.booking_status != 'confirmed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ticket is not confirmed',
      'status', v_ticket.booking_status
    );
  END IF;

  -- Check if route is active
  IF v_ticket.route_status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Route is not active',
      'status', v_ticket.route_status
    );
  END IF;

  -- Get verification status
  SELECT * INTO v_verification
  FROM ticket_verifications
  WHERE ticket_id = p_ticket_id AND ticket_number = p_ticket_number;

  -- If ticket is already verified, return verification info
  IF v_verification IS NOT NULL AND v_verification.status = 'verified' THEN
    RETURN jsonb_build_object(
      'success', true,
      'isVerified', true,
      'verifiedAt', v_verification.verified_at,
      'verifiedBy', (SELECT name FROM profiles WHERE id = v_verification.verified_by),
      'ticket', jsonb_build_object(
        'name', v_ticket.user_info->>'name',
        'email', v_ticket.user_info->>'email',
        'phone_number', v_ticket.user_info->>'phone_number',
        'pickup', v_ticket.route_info->>'pickup',
        'dropoff', v_ticket.route_info->>'dropoff',
        'date', v_ticket.route_info->>'date',
        'time', v_ticket.route_info->>'time'
      )
    );
  END IF;

  -- If verifier ID is provided, verify the ticket
  IF p_verifier_id IS NOT NULL THEN
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

    -- Return success with verification details
    RETURN jsonb_build_object(
      'success', true,
      'isVerified', true,
      'verifiedAt', now(),
      'verifiedBy', (SELECT name FROM profiles WHERE id = p_verifier_id),
      'ticket', jsonb_build_object(
        'name', v_ticket.user_info->>'name',
        'email', v_ticket.user_info->>'email',
        'phone_number', v_ticket.user_info->>'phone_number',
        'pickup', v_ticket.route_info->>'pickup',
        'dropoff', v_ticket.route_info->>'dropoff',
        'date', v_ticket.route_info->>'date',
        'time', v_ticket.route_info->>'time'
      )
    );
  END IF;

  -- If no verifier ID, just return ticket info
  RETURN jsonb_build_object(
    'success', true,
    'isVerified', false,
    'ticket', jsonb_build_object(
      'name', v_ticket.user_info->>'name',
      'email', v_ticket.user_info->>'email',
      'phone_number', v_ticket.user_info->>'phone_number',
      'pickup', v_ticket.route_info->>'pickup',
      'dropoff', v_ticket.route_info->>'dropoff',
      'date', v_ticket.route_info->>'date',
      'time', v_ticket.route_info->>'time'
    )
  );
END;
$$;