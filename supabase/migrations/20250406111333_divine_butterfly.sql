/*
  # Add miles fields to payment_links table

  1. Changes
    - Add miles_amount column to payment_links table
    - Add miles_discount column to payment_links table
    - Update verify_and_redeem_payment function to handle miles redemption
*/

-- Add miles columns to payment_links table
ALTER TABLE payment_links
ADD COLUMN miles_amount INTEGER DEFAULT 0,
ADD COLUMN miles_discount DECIMAL(10,2) DEFAULT 0;

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
    v_miles_amount := v_payment.miles_amount;
    v_miles_discount := v_payment.miles_discount;

    -- Create ticket booking
    INSERT INTO ticket_bookings (
      user_id,
      route_id,
      time_slot,
      quantity,
      total_price,
      status,
      booking_date,
      stripe_payment_intent_id  -- Store Stripe payment ID
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
      'Miles earned from ticket purchase',
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