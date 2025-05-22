/*
  # Add support for miles-only payments

  1. Changes
    - Add function to process miles-only payments
    - Add better error handling and validation
    - Add transaction safety
*/

-- Create function to process miles-only payments
CREATE OR REPLACE FUNCTION process_miles_only_payment(
  p_user_id UUID,
  p_route_id UUID,
  p_time_slot TEXT,
  p_quantity INTEGER,
  p_miles_amount INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_miles_value DECIMAL;
  v_miles_balance INTEGER;
  v_route_price DECIMAL;
  v_total_price DECIMAL;
  v_miles_discount DECIMAL;
  v_booking_id UUID;
  v_route_info RECORD;
  v_available_seats INTEGER;
BEGIN
  -- Start transaction
  BEGIN
    -- Get miles value
    v_miles_value := get_miles_value();
    
    -- Get user's miles balance with FOR UPDATE to lock the row
    SELECT points INTO v_miles_balance
    FROM wallet_points
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Validate miles balance
    IF v_miles_balance IS NULL THEN
      RAISE EXCEPTION 'User has no miles balance';
    END IF;
    
    IF v_miles_balance < p_miles_amount THEN
      RAISE EXCEPTION 'Insufficient miles balance (% available, % requested)', 
        v_miles_balance, p_miles_amount;
    END IF;
    
    -- Get route details
    SELECT price INTO v_route_price
    FROM routes
    WHERE id = p_route_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Route not found';
    END IF;
    
    -- Calculate total price and miles discount
    v_total_price := v_route_price * p_quantity;
    v_miles_discount := p_miles_amount * v_miles_value;
    
    -- Validate miles discount covers total price
    IF v_miles_discount < v_total_price THEN
      RAISE EXCEPTION 'Miles discount (%) does not cover total price (%)', 
        v_miles_discount, v_total_price;
    END IF;
    
    -- Check available seats
    SELECT 
      r.max_capacity_per_slot - COALESCE(SUM(tb.quantity), 0) INTO v_available_seats
    FROM 
      routes r
      LEFT JOIN ticket_bookings tb ON r.id = tb.route_id 
        AND tb.time_slot = p_time_slot
        AND tb.status IN ('confirmed', 'completed')
    WHERE 
      r.id = p_route_id
    GROUP BY 
      r.max_capacity_per_slot;
    
    IF v_available_seats < p_quantity THEN
      RAISE EXCEPTION 'Not enough seats available (% available, % requested)', 
        v_available_seats, p_quantity;
    END IF;
    
    -- Get route info for transaction descriptions
    SELECT 
      r.id,
      pickup.name AS pickup_name,
      dropoff.name AS dropoff_name
    INTO v_route_info
    FROM routes r
    JOIN locations pickup ON r.pickup_location = pickup.id
    JOIN locations dropoff ON r.dropoff_location = dropoff.id
    WHERE r.id = p_route_id;
    
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
      p_user_id,
      p_route_id,
      p_time_slot,
      p_quantity,
      0, -- Free because fully covered by miles
      'confirmed',
      now()
    )
    RETURNING id INTO v_booking_id;
    
    -- Update route tickets_sold count
    UPDATE routes
    SET tickets_sold = tickets_sold + p_quantity
    WHERE id = p_route_id;
    
    -- Add point transaction for redemption
    INSERT INTO point_transactions (
      user_id,
      points,
      description,
      type,
      reference_id
    ) VALUES (
      p_user_id,
      -p_miles_amount,
      'Miles redeemed for ticket purchase: ' || 
      COALESCE(v_route_info.pickup_name, '') || ' to ' || 
      COALESCE(v_route_info.dropoff_name, ''),
      'redeem',
      v_booking_id::text
    );
    
    -- Update miles balance
    UPDATE wallet_points
    SET points = points - p_miles_amount
    WHERE user_id = p_user_id;
    
    -- Log the transaction
    RAISE LOG 'Miles-only payment processed: % miles for booking % by user %', 
      p_miles_amount, v_booking_id, p_user_id;
    
    -- Return booking ID
    RETURN v_booking_id;
  EXCEPTION WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE LOG 'Error in process_miles_only_payment: %', SQLERRM;
    RAISE;
  END;
END;
$$;