/*
  # Add referral system functionality

  1. New Functions
    - `process_referral`: Processes a referral when a new user signs up with a referral code
    - `get_referral_reward`: Gets the reward amount for referrals from system settings
    - `update_referral_reward`: Updates the referral reward amount in system settings

  2. New Columns
    - Add `referrer_id` to profiles table to track who referred each user
    - Add `referral_code` to auth.users metadata for signup tracking

  3. Security
    - Maintain existing RLS policies
*/

-- Add referrer_id column to profiles table
ALTER TABLE profiles
ADD COLUMN referrer_id UUID REFERENCES profiles(id) NULL;

-- Add referral_reward setting if it doesn't exist
INSERT INTO system_settings (key, value, description)
VALUES ('referral_reward', '300', 'Number of miles granted to users for successful referrals')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Create function to get referral reward amount
CREATE OR REPLACE FUNCTION get_referral_reward()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward_amount INTEGER;
BEGIN
  -- Get reward amount from system settings
  SELECT COALESCE(value::INTEGER, 300) INTO v_reward_amount
  FROM system_settings
  WHERE key = 'referral_reward';
  
  -- Return default value if not found
  RETURN COALESCE(v_reward_amount, 300);
END;
$$;

-- Create function to update referral reward amount
CREATE OR REPLACE FUNCTION update_referral_reward(p_reward_amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input
  IF p_reward_amount < 0 THEN
    RAISE EXCEPTION 'Reward amount cannot be negative';
  END IF;
  
  -- Update or insert the setting
  INSERT INTO system_settings (key, value, description)
  VALUES (
    'referral_reward', 
    p_reward_amount::TEXT, 
    'Number of miles granted to users for successful referrals'
  )
  ON CONFLICT (key) DO UPDATE
  SET value = p_reward_amount::TEXT;
  
  RAISE LOG 'Updated referral reward to %', p_reward_amount;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error updating referral reward: %', SQLERRM;
  RETURN FALSE;
END;
$$;

-- Create function to process referrals
CREATE OR REPLACE FUNCTION process_referral(
  p_user_id UUID,
  p_referral_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
  v_reward_amount INTEGER;
  v_referral_count INTEGER;
BEGIN
  -- Validate referral code
  SELECT user_id INTO v_referrer_id
  FROM referral_codes
  WHERE code = p_referral_code;
  
  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;
  
  -- Prevent self-referrals
  IF v_referrer_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot refer yourself';
  END IF;
  
  -- Check if user already has a referrer
  DECLARE
    v_existing_referrer UUID;
  BEGIN
    SELECT referrer_id INTO v_existing_referrer
    FROM profiles
    WHERE id = p_user_id;
    
    IF v_existing_referrer IS NOT NULL THEN
      RAISE EXCEPTION 'User already has a referrer';
    END IF;
  END;
  
  -- Update user's profile with referrer_id
  UPDATE profiles
  SET referrer_id = v_referrer_id
  WHERE id = p_user_id;
  
  -- Get referral reward amount
  v_reward_amount := get_referral_reward();
  
  -- Add miles to referrer's wallet
  UPDATE wallet_points
  SET points = points + v_reward_amount
  WHERE user_id = v_referrer_id;
  
  -- Add point transaction for referral reward
  INSERT INTO point_transactions (
    user_id,
    points,
    description,
    type,
    reference_id
  ) VALUES (
    v_referrer_id,
    v_reward_amount,
    'Referral reward for new user signup',
    'referral',
    p_user_id::text
  );
  
  -- Increment referral code uses
  UPDATE referral_codes
  SET uses = uses + 1
  WHERE user_id = v_referrer_id;
  
  -- Get updated referral count
  SELECT uses INTO v_referral_count
  FROM referral_codes
  WHERE user_id = v_referrer_id;
  
  -- Log the referral
  RAISE LOG 'Processed referral: user % referred by %, awarded % miles (total referrals: %)', 
    p_user_id, v_referrer_id, v_reward_amount, v_referral_count;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  -- Log error and re-raise
  RAISE LOG 'Error processing referral: %', SQLERRM;
  RAISE;
END;
$$;

-- Update handle_new_user function to check for referral code
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_miles_bonus INTEGER;
  v_referral_code TEXT;
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
  
  -- Check for referral code in user metadata
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    -- Process the referral
    BEGIN
      PERFORM process_referral(NEW.id, v_referral_code);
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't prevent user creation
      RAISE LOG 'Error processing referral for new user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$;