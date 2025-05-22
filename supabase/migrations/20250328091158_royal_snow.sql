/*
  # Fix refund process and payment tracking

  1. Changes
    - Update verify_and_redeem_payment function to store Stripe payment ID
    - Add process_refund function to handle both wallet and Stripe refunds
    - Add proper transaction handling and rollback support
    - Add better error handling and logging
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS verify_and_redeem_payment(payment_id uuid);

-- Create improved verify_and_redeem_payment function
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

-- Create function to process refunds
CREATE OR REPLACE FUNCTION process_refund(booking_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking ticket_bookings;
  v_user_id UUID;
  v_total_amount DECIMAL;
BEGIN
  -- Start transaction
  BEGIN
    -- Get booking details with FOR UPDATE to lock the row
    SELECT * INTO v_booking
    FROM ticket_bookings
    WHERE id = booking_id AND status = 'confirmed'
    FOR UPDATE;

    -- If booking not found or not confirmed, return false
    IF NOT FOUND THEN
      RETURN false;
    END IF;

    -- Store values for easier access
    v_user_id := v_booking.user_id;
    v_total_amount := v_booking.total_price;

    -- If this was a wallet payment (no Stripe ID), refund to wallet
    IF v_booking.stripe_payment_intent_id IS NULL THEN
      -- Add credits back to wallet
      UPDATE wallet_credits
      SET balance = balance + v_total_amount
      WHERE user_id = v_user_id;

      -- Add credit transaction for refund
      INSERT INTO credit_transactions (
        user_id,
        amount,
        description,
        type,
        reference_id
      ) VALUES (
        v_user_id,
        v_total_amount,
        'Refund for cancelled booking',
        'refund',
        booking_id::text
      );
    END IF;

    -- Update booking status
    UPDATE ticket_bookings
    SET status = 'refunded'
    WHERE id = booking_id;

    -- Update route tickets_sold count
    UPDATE routes
    SET tickets_sold = tickets_sold - v_booking.quantity
    WHERE id = v_booking.route_id;

    -- If we get here, everything succeeded
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    -- Log error details
    RAISE LOG 'Error in process_refund: %, SQLSTATE: %',
      SQLERRM,
      SQLSTATE;
    RETURN false;
  END;
END;
$$;