/*
  # Add miles redemption functionality

  1. New Functions
    - `redeem_miles`: Function to redeem miles for a discount
    - `get_miles_value`: Function to get the current miles value

  2. Changes
    - Add support for miles redemption in payment processing
    - Add transaction tracking for miles redemption
*/

-- Create function to get miles value
CREATE OR REPLACE FUNCTION get_miles_value()
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_miles_value DECIMAL;
BEGIN
  -- Get miles value from system settings
  SELECT COALESCE(value::DECIMAL, 0.02) INTO v_miles_value
  FROM system_settings
  WHERE key = 'point_value';
  
  -- Return default value if not found
  RETURN COALESCE(v_miles_value, 0.02);
END;
$$;

-- Create function to redeem miles
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
BEGIN
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
  
  -- Return discount amount
  RETURN v_discount_amount;
EXCEPTION WHEN OTHERS THEN
  -- Log error and re-raise
  RAISE LOG 'Error in redeem_miles: %', SQLERRM;
  RAISE;
END;
$$;