/*
  # Fix double miles redemption in Stripe webhook

  1. Changes
    - Update stripe-webhook handler to prevent double miles redemption
    - Add transaction safety to ensure miles are only deducted once
    - Add better error handling and logging
*/

-- Create a function to check if miles have already been redeemed
CREATE OR REPLACE FUNCTION have_miles_been_redeemed(
  p_user_id UUID,
  p_reference_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if a redemption transaction already exists for this reference
  SELECT EXISTS (
    SELECT 1
    FROM point_transactions
    WHERE user_id = p_user_id
      AND reference_id = p_reference_id
      AND type = 'redeem'
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;

-- Update the redeem_miles function to check for existing redemptions
CREATE OR REPLACE FUNCTION redeem_miles(
  p_user_id UUID,
  p_miles_amount INTEGER,
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_miles_value DECIMAL;
  v_miles_balance INTEGER;
  v_discount_amount DECIMAL;
  v_already_redeemed BOOLEAN;
BEGIN
  -- Check if miles have already been redeemed for this reference
  IF p_reference_id IS NOT NULL THEN
    SELECT have_miles_been_redeemed(p_user_id, p_reference_id) INTO v_already_redeemed;
    
    IF v_already_redeemed THEN
      RAISE LOG 'Miles already redeemed for user % with reference %', p_user_id, p_reference_id;
      RETURN 0; -- Return 0 to indicate no additional redemption
    END IF;
  END IF;

  -- Get current miles value
  v_miles_value := get_miles_value();
  
  -- Get user's miles balance
  SELECT points INTO v_miles_balance
  FROM wallet_points
  WHERE user_id = p_user_id;
  
  -- Validate miles balance
  IF v_miles_balance IS NULL THEN
    RAISE EXCEPTION 'User has no miles balance';
  END IF;
  
  IF v_miles_balance < p_miles_amount THEN
    RAISE EXCEPTION 'Insufficient miles balance (% available, % requested)', 
      v_miles_balance, p_miles_amount;
  END IF;
  
  -- Calculate discount amount
  v_discount_amount := p_miles_amount * v_miles_value;
  
  -- Create point transaction for redemption
  INSERT INTO point_transactions (
    user_id,
    points,
    description,
    type,
    reference_id
  ) VALUES (
    p_user_id,
    -p_miles_amount,
    p_description,
    'redeem',
    p_reference_id
  );
  
  -- Update miles balance
  UPDATE wallet_points
  SET points = points - p_miles_amount
  WHERE user_id = p_user_id;
  
  -- Log the redemption
  RAISE LOG 'Miles redeemed successfully: % miles for user % with reference %', 
    p_miles_amount, p_user_id, p_reference_id;
  
  -- Return discount amount
  RETURN v_discount_amount;
EXCEPTION WHEN OTHERS THEN
  -- Log error and re-raise
  RAISE LOG 'Error in redeem_miles: %', SQLERRM;
  RAISE;
END;
$$;

-- Update verify_and_redeem_payment function to NOT handle miles redemption
-- This prevents double redemption since miles are now handled separately in the webhook
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
  v_miles_amount INTEGER;
  v_miles_discount DECIMAL;
  v_route_info RECORD;
BEGIN
  -- Start transaction
  BEGIN
    -- Get payment details with FOR UPDATE to lock the row
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
    v_miles_amount := COALESCE(v_payment.miles_amount, 0);
    v_miles_discount := COALESCE(v_payment.miles_discount, 0);

    -- Get route info for transaction descriptions
    SELECT 
      r.id,
      pickup.name AS pickup_name,
      dropoff.name AS dropoff_name
    INTO v_route_info
    FROM routes r
    JOIN locations pickup ON r.pickup_location = pickup.id
    JOIN locations dropoff ON r.dropoff_location = dropoff.id
    WHERE r.id = v_route_id;

    -- Create ticket booking
    INSERT INTO ticket_bookings (
      user_id,
      route_id,
      time_slot,
      quantity,
      total_price,
      status,
      booking_date,
      stripe_payment_intent_id
    ) VALUES (
      v_user_id,
      v_route_id,
      v_time_slot,
      v_quantity,
      v_total_amount,
      'confirmed',
      now(),
      v_payment.stripe_payment_intent_id
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
      'Card payment for ticket purchase: ' || 
      COALESCE(v_route_info.pickup_name, '') || ' to ' || 
      COALESCE(v_route_info.dropoff_name, ''),
      'purchase',
      v_booking_id::text
    );

    -- NOTE: Miles redemption is now handled separately in the webhook
    -- to prevent double redemption

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
      'Miles earned from ticket purchase',
      'earn',
      v_booking_id::text
    );

    -- Add points to wallet
    UPDATE wallet_points
    SET points = points + FLOOR(v_total_amount)::integer
    WHERE user_id = v_user_id;

    -- Mark payment as completed
    UPDATE payment_links
    SET status = 'completed'
    WHERE id = payment_id;

    -- If we get here, everything succeeded
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    -- Log error details
    RAISE LOG 'Error in verify_and_redeem_payment: %, SQLSTATE: %',
      SQLERRM,
      SQLSTATE;
    RETURN false;
  END;
END;
$$;