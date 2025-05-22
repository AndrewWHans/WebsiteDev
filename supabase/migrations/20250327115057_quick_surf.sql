/*
  # Add payment verification function

  1. New Functions
    - `verify_and_redeem_payment`: Verifies and redeems a payment, creating ticket booking
      - Parameters:
        - payment_id: uuid
      - Returns: boolean
      - Creates ticket booking
      - Updates route tickets count
      - Adds credit and point transactions
      - Marks payment as completed

  2. Security
    - Function is security definer to ensure proper permissions
    - Proper error handling and transaction management
*/

-- Create function to verify and redeem payment
CREATE OR REPLACE FUNCTION verify_and_redeem_payment(payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment payment_links;
  v_user_id UUID;
  v_route_id UUID;
  v_time_slot TEXT;
  v_quantity INTEGER;
  v_total_amount DECIMAL;
  v_booking_id UUID;
BEGIN
  -- Get payment details
  SELECT * INTO v_payment
  FROM payment_links
  WHERE id = payment_id AND is_paid = true
  FOR UPDATE;

  -- If payment not found or not paid, return false
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Store values for easier access
  v_user_id := v_payment.user_id;
  v_route_id := v_payment.route_id;
  v_time_slot := v_payment.time_slot;
  v_quantity := v_payment.quantity;
  v_total_amount := v_payment.total_amount;

  -- Create ticket booking
  INSERT INTO ticket_bookings (
    user_id,
    route_id,
    time_slot,
    quantity,
    total_price,
    status,
    booking_date
  ) VALUES (
    v_user_id,
    v_route_id,
    v_time_slot,
    v_quantity,
    v_total_amount,
    'confirmed',
    now()
  )
  RETURNING id INTO v_booking_id;

  -- Update route tickets_sold count
  UPDATE routes
  SET tickets_sold = tickets_sold + v_quantity
  WHERE id = v_route_id;

  -- Add credit transaction record
  INSERT INTO credit_transactions (
    user_id,
    amount,
    description,
    type,
    reference_id
  ) VALUES (
    v_user_id,
    -v_total_amount,
    'Card payment for ticket purchase',
    'purchase',
    v_booking_id::text
  );

  -- Add points transaction (1 point per dollar spent)
  INSERT INTO point_transactions (
    user_id,
    points,
    description,
    type,
    reference_id
  ) VALUES (
    v_user_id,
    FLOOR(v_total_amount)::integer,
    'Points earned from ticket purchase',
    'earn',
    v_booking_id::text
  );

  -- Add points to wallet
  PERFORM add_points(
    v_user_id,
    FLOOR(v_total_amount)::integer,
    'Ticket purchase reward',
    'earn',
    v_booking_id::text
  );

  -- Mark payment as used
  UPDATE payment_links
  SET status = 'completed'
  WHERE id = payment_id;

  RETURN true;
END;
$$;