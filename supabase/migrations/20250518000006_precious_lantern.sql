-- First drop the existing function to avoid return type error
DROP FUNCTION IF EXISTS process_deal_payment(text, text, uuid, uuid, integer, numeric, integer, numeric);

-- Create or replace the process_deal_payment function with improved error handling
CREATE OR REPLACE FUNCTION process_deal_payment(
  p_session_id TEXT,
  p_payment_intent_id TEXT,
  p_user_id UUID,
  p_deal_id UUID,
  p_quantity INTEGER,
  p_total_amount DECIMAL,
  p_miles_amount INTEGER DEFAULT 0,
  p_miles_discount DECIMAL DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_deal_info RECORD;
  v_result JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Get deal info
    SELECT 
      id, 
      title, 
      price,
      location_name,
      deal_date
    INTO v_deal_info
    FROM deals
    WHERE id = p_deal_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Deal not found: %', p_deal_id;
    END IF;
    
    -- Log the payment processing
    RAISE LOG 'Processing deal payment: deal=%, user=%, amount=%, miles=%',
      p_deal_id, p_user_id, p_total_amount, p_miles_amount;
    
    -- Create deal booking
    INSERT INTO deal_bookings (
      user_id,
      deal_id,
      quantity,
      total_price,
      status,
      booking_date,
      stripe_payment_intent_id,
      miles_redeemed
    ) VALUES (
      p_user_id,
      p_deal_id,
      p_quantity,
      p_total_amount,
      'confirmed',
      now(),
      p_payment_intent_id,
      p_miles_amount
    )
    RETURNING id INTO v_booking_id;
    
    -- Process miles redemption if miles were applied
    IF p_miles_amount > 0 AND p_miles_amount IS NOT NULL THEN
      -- Check if miles have already been redeemed for this payment
      IF NOT (SELECT EXISTS (
        SELECT 1
        FROM point_transactions
        WHERE user_id = p_user_id
          AND reference_id = p_payment_intent_id
          AND type = 'redeem'
      )) THEN
        -- Deduct miles from user's wallet
        UPDATE wallet_points
        SET points = points - p_miles_amount
        WHERE user_id = p_user_id;
        
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
          'Miles redeemed for deal purchase: ' || v_deal_info.title,
          'redeem',
          p_payment_intent_id
        );
        
        RAISE LOG 'Miles redeemed: % miles for user % with payment %',
          p_miles_amount, p_user_id, p_payment_intent_id;
      ELSE
        RAISE LOG 'Miles already redeemed for payment %', p_payment_intent_id;
      END IF;
    END IF;
    
    -- Add points transaction (1 point per dollar spent)
    INSERT INTO point_transactions (
      user_id,
      points,
      description,
      type,
      reference_id
    ) VALUES (
      p_user_id,
      FLOOR(p_total_amount)::integer,
      'Miles earned from deal purchase: ' || v_deal_info.title,
      'earn',
      v_booking_id::text
    );
    
    -- Add points to wallet
    UPDATE wallet_points
    SET points = points + FLOOR(p_total_amount)::integer
    WHERE user_id = p_user_id;
    
    -- Increment deal purchases count
    UPDATE deals
    SET 
      purchases = purchases + p_quantity,
      updated_at = now()
    WHERE id = p_deal_id;
    
    -- Set result
    v_result := jsonb_build_object(
      'success', true,
      'booking_id', v_booking_id,
      'deal_id', p_deal_id,
      'user_id', p_user_id,
      'amount', p_total_amount,
      'miles_redeemed', p_miles_amount
    );
    
    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    -- Log error details
    RAISE LOG 'Error processing deal payment: %, SQLSTATE: %',
      SQLERRM,
      SQLSTATE;
      
    -- Return error information
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'deal_id', p_deal_id,
      'user_id', p_user_id
    );
  END;
END;
$$;

-- Create function to check if miles have been redeemed for a specific payment
-- Only create if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'have_miles_been_redeemed'
  ) THEN
    EXECUTE $FUNC$
    CREATE FUNCTION have_miles_been_redeemed(
      p_user_id UUID,
      p_reference_id TEXT
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $INNER$
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
    $INNER$;
    $FUNC$;
  END IF;
END
$$;

-- Add miles_redeemed column to ticket_bookings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_bookings' AND column_name = 'miles_redeemed'
  ) THEN
    ALTER TABLE ticket_bookings ADD COLUMN miles_redeemed INTEGER;
  END IF;
END
$$;

-- Create policy to allow system to manage deal_bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'System can manage all deal_bookings'
    AND tablename = 'deal_bookings'
  ) THEN
    EXECUTE 'CREATE POLICY "System can manage all deal_bookings" ON deal_bookings FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END
$$;