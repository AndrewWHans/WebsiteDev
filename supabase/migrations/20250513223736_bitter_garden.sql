/*
  # Add deal bookings table and related functions

  1. New Tables
    - `deal_bookings`: Stores user deal bookings
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `deal_id` (uuid, references deals.id)
      - `quantity` (integer, not null)
      - `total_price` (decimal, not null)
      - `status` (text, not null)
      - `booking_date` (timestamptz, not null)
      - `created_at` (timestamptz, not null)
      - `updated_at` (timestamptz, not null)
      - `stripe_payment_intent_id` (text)
      - `miles_redeemed` (integer)

  2. Security
    - Enable RLS on deal_bookings table
    - Add policies for users to read their own bookings
*/

-- Create deal_bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS deal_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'refunded')),
  booking_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_payment_intent_id TEXT,
  miles_redeemed INTEGER
);

-- Create updated_at trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_deal_bookings_updated_at'
  ) THEN
    CREATE TRIGGER update_deal_bookings_updated_at
      BEFORE UPDATE ON deal_bookings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- Enable RLS
ALTER TABLE deal_bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can read their own deal bookings'
    AND tablename = 'deal_bookings'
  ) THEN
    CREATE POLICY "Users can read their own deal bookings"
      ON deal_bookings
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_deal_bookings_user_id ON deal_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_bookings_deal_id ON deal_bookings(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_bookings_status ON deal_bookings(status);

-- Create function to process deal payments
CREATE OR REPLACE FUNCTION process_deal_payment(
  p_session_id TEXT,
  p_payment_intent_id TEXT,
  p_user_id UUID,
  p_deal_id UUID,
  p_quantity INTEGER,
  p_total_amount DECIMAL,
  p_miles_amount INTEGER,
  p_miles_discount DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_deal_info RECORD;
BEGIN
  -- Get deal info
  SELECT title, price INTO v_deal_info
  FROM deals
  WHERE id = p_deal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;
  
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
  IF p_miles_amount > 0 THEN
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
      v_booking_id::text
    );
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
  SET purchases = purchases + p_quantity
  WHERE id = p_deal_id;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error processing deal payment: %', SQLERRM;
  RETURN FALSE;
END;
$$;