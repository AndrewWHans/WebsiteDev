/*
  # Create wallet-related tables for credits and points

  1. New Tables
    - `wallet_credits`: Stores user credit balances
      - `user_id` (uuid, primary key, references profiles.id)
      - `balance` (decimal, not null, default 0)
      - `updated_at` (timestamptz, not null, default now())
    
    - `wallet_points`: Stores user point balances
      - `user_id` (uuid, primary key, references profiles.id)
      - `points` (integer, not null, default 0)
      - `tier` (text, not null, default 'Bronze')
      - `updated_at` (timestamptz, not null, default now())
    
    - `credit_transactions`: Tracks credit transaction history
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null, references profiles.id)
      - `amount` (decimal, not null)
      - `description` (text, not null)
      - `type` (text, not null)
      - `reference_id` (text)
      - `created_at` (timestamptz, not null, default now())
    
    - `point_transactions`: Tracks point transaction history
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null, references profiles.id)
      - `points` (integer, not null)
      - `description` (text, not null)
      - `type` (text, not null)
      - `reference_id` (text)
      - `created_at` (timestamptz, not null, default now())
    
    - `referral_codes`: Stores user referral codes
      - `user_id` (uuid, primary key, references profiles.id)
      - `code` (text, not null, unique)
      - `created_at` (timestamptz, not null, default now())
      - `uses` (integer, not null, default 0)

  2. Functions
    - `generate_referral_code`: Generates a unique referral code
    - `ensure_wallet_exists`: Creates wallet entries for new users
    - `add_credits`: Adds credits to a user's wallet
    - `add_points`: Adds points to a user's wallet
    
  3. Triggers
    - `on_profile_created`: Creates wallet entries when a profile is created
    - `update_credits_updated_at`: Updates timestamp when wallet_credits is updated
    - `update_points_updated_at`: Updates timestamp when wallet_points is updated

  4. Security
    - Enable RLS on all tables
    - Add policies for users to read their own wallet data
*/

-- Create wallet_credits table
CREATE TABLE wallet_credits (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create wallet_points table
CREATE TABLE wallet_points (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  tier TEXT NOT NULL DEFAULT 'Bronze',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create credit_transactions table
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'reward', 'refund', 'adjustment', 'promotion')),
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create point_transactions table
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'adjustment', 'promotion', 'referral')),
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create referral_codes table
CREATE TABLE referral_codes (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uses INTEGER NOT NULL DEFAULT 0
);

-- Create function to generate a unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER := 0;
  pos INTEGER := 0;
BEGIN
  FOR i IN 1..8 LOOP
    pos := 1 + floor(random() * length(chars));
    result := result || substr(chars, pos, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create function to ensure wallet exists
-- Fixed ambiguity by renaming parameter to p_user_id
CREATE OR REPLACE FUNCTION ensure_wallet_exists(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create wallet_credits entry if it doesn't exist
  INSERT INTO wallet_credits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create wallet_points entry if it doesn't exist
  INSERT INTO wallet_points (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create referral code if it doesn't exist
  INSERT INTO referral_codes (user_id, code)
  VALUES (p_user_id, generate_referral_code())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Create function to add credits
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_type TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure wallet exists
  PERFORM ensure_wallet_exists(p_user_id);
  
  -- Add transaction record
  INSERT INTO credit_transactions (
    user_id, amount, description, type, reference_id
  ) VALUES (
    p_user_id, p_amount, p_description, p_type, p_reference_id
  );
  
  -- Update balance
  UPDATE wallet_credits
  SET balance = balance + p_amount
  WHERE user_id = p_user_id;
END;
$$;

-- Create function to add points
CREATE OR REPLACE FUNCTION add_points(
  p_user_id UUID,
  p_points INTEGER,
  p_description TEXT,
  p_type TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_points INTEGER;
  new_tier TEXT;
BEGIN
  -- Ensure wallet exists
  PERFORM ensure_wallet_exists(p_user_id);
  
  -- Add transaction record
  INSERT INTO point_transactions (
    user_id, points, description, type, reference_id
  ) VALUES (
    p_user_id, p_points, p_description, p_type, p_reference_id
  );
  
  -- Update points
  UPDATE wallet_points
  SET points = points + p_points
  WHERE user_id = p_user_id
  RETURNING points INTO new_points;
  
  -- Update tier based on new points
  new_tier := CASE
    WHEN new_points >= 5000 THEN 'Diamond'
    WHEN new_points >= 2000 THEN 'Platinum'
    WHEN new_points >= 1000 THEN 'Gold'
    WHEN new_points >= 500 THEN 'Silver'
    ELSE 'Bronze'
  END;
  
  -- Update tier if changed
  UPDATE wallet_points
  SET tier = new_tier
  WHERE user_id = p_user_id AND tier <> new_tier;
END;
$$;

-- Create trigger for wallet creation
CREATE OR REPLACE FUNCTION create_wallet_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create wallet entries
  PERFORM ensure_wallet_exists(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_wallet_for_profile();

-- Create trigger to update wallet_credits.updated_at
CREATE OR REPLACE FUNCTION update_credits_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_wallet_credits_timestamp
BEFORE UPDATE ON wallet_credits
FOR EACH ROW
EXECUTE FUNCTION update_credits_updated_at();

-- Create trigger to update wallet_points.updated_at
CREATE OR REPLACE FUNCTION update_points_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_wallet_points_timestamp
BEFORE UPDATE ON wallet_points
FOR EACH ROW
EXECUTE FUNCTION update_points_updated_at();

-- Enable RLS on all tables
ALTER TABLE wallet_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wallet_credits
CREATE POLICY "Users can read their own wallet_credits"
ON wallet_credits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for wallet_points
CREATE POLICY "Users can read their own wallet_points"
ON wallet_points
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for credit_transactions
CREATE POLICY "Users can read their own credit_transactions"
ON credit_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for point_transactions
CREATE POLICY "Users can read their own point_transactions"
ON point_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for referral_codes
CREATE POLICY "Users can read their own referral_codes"
ON referral_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add sample data for development
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get a user ID
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  -- Only proceed if we found a user
  IF test_user_id IS NOT NULL THEN
    -- Add initial wallet data
    PERFORM ensure_wallet_exists(test_user_id);
    
    -- Add some credit transactions
    PERFORM add_credits(test_user_id, 25.00, 'Welcome bonus', 'promotion');
    PERFORM add_credits(test_user_id, 50.00, 'Added funds', 'purchase', 'ch_123456');
    PERFORM add_credits(test_user_id, -15.00, 'Party Bus Ticket', 'purchase', 'order_789');
    PERFORM add_credits(test_user_id, 10.00, 'Referral reward', 'reward');
    
    -- Add some point transactions
    PERFORM add_points(test_user_id, 100, 'Welcome points', 'promotion');
    PERFORM add_points(test_user_id, 50, 'Completed profile', 'earn');
    PERFORM add_points(test_user_id, 200, 'First ride', 'earn');
    PERFORM add_points(test_user_id, 300, 'Referred a friend', 'referral');
    PERFORM add_points(test_user_id, -150, 'Redeemed for discount', 'redeem');
  END IF;
END;
$$;