/*
  # Fix miles redemption in payment process

  1. Changes
    - Update verify_and_redeem_payment function to properly handle miles redemption
    - Add better error handling and transaction safety
    - Ensure miles are properly deducted when payment is completed
*/

-- Update verify_and_redeem_payment function to handle miles redemption
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

    -- Process miles redemption if miles were applied
    IF v_miles_amount > 0 THEN
      -- Deduct miles from user's wallet
      UPDATE wallet_points
      SET points = points - v_miles_amount
      WHERE user_id = v_user_id;
      
      -- Add point transaction for redemption
      INSERT INTO point_transactions (
        user_id,
        points,
        description,
        type,
        reference_id
      ) VALUES (
        v_user_id,
        -v_miles_amount,
        'Miles redeemed for ticket purchase: ' || 
        COALESCE(v_route_info.pickup_name, '') || ' to ' || 
        COALESCE(v_route_info.dropoff_name, ''),
        'redeem',
        v_booking_id::text
      );
      
      RAISE LOG 'Miles redeemed: % miles for user %', v_miles_amount, v_user_id;
    END IF;

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