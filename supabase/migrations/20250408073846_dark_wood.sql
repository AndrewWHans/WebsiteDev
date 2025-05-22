/*
  # Add registration miles bonus

  1. New System Settings
    - `registration_miles_bonus`: Number of miles granted to new users upon registration
    - Default value: 50 miles

  2. New Functions
    - Update handle_new_user function to grant miles to new users
    - Add function to update registration miles bonus setting

  3. Security
    - Maintain existing RLS policies
*/

-- Add registration_miles_bonus setting if it doesn't exist
INSERT INTO system_settings (key, value, description)
VALUES ('registration_miles_bonus', '50', 'Number of miles granted to new users upon registration')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Create function to get registration miles bonus
CREATE OR REPLACE FUNCTION get_registration_miles_bonus()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_miles_bonus INTEGER;
BEGIN
  -- Get miles bonus from system settings
  SELECT COALESCE(value::INTEGER, 50) INTO v_miles_bonus
  FROM system_settings
  WHERE key = 'registration_miles_bonus';
  
  -- Return default value if not found
  RETURN COALESCE(v_miles_bonus, 50);
END;
$$;

-- Update handle_new_user function to grant miles to new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miles_bonus INTEGER;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.email, 'New User'),
    'Rider',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create wallet entries
  PERFORM ensure_wallet_exists(NEW.id);
  
  -- Get registration miles bonus
  v_miles_bonus := get_registration_miles_bonus();
  
  -- Grant registration miles bonus if greater than 0
  IF v_miles_bonus > 0 THEN
    -- Add miles to wallet
    UPDATE wallet_points
    SET points = points + v_miles_bonus
    WHERE user_id = NEW.id;
    
    -- Add point transaction for registration bonus
    INSERT INTO point_transactions (
      user_id,
      points,
      description,
      type,
      reference_id
    ) VALUES (
      NEW.id,
      v_miles_bonus,
      'Welcome bonus for new registration',
      'promotion',
      'registration_bonus'
    );
    
    RAISE LOG 'Granted % miles to new user %', v_miles_bonus, NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create function to update registration miles bonus
CREATE OR REPLACE FUNCTION update_registration_miles_bonus(p_miles_amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input
  IF p_miles_amount < 0 THEN
    RAISE EXCEPTION 'Miles amount cannot be negative';
  END IF;
  
  -- Update or insert the setting
  INSERT INTO system_settings (key, value, description)
  VALUES (
    'registration_miles_bonus', 
    p_miles_amount::TEXT, 
    'Number of miles granted to new users upon registration'
  )
  ON CONFLICT (key) DO UPDATE
  SET value = p_miles_amount::TEXT;
  
  RAISE LOG 'Updated registration miles bonus to %', p_miles_amount;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error updating registration miles bonus: %', SQLERRM;
  RETURN FALSE;
END;
$$;