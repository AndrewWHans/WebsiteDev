/*
  # Fix point_transactions RLS policies

  1. Changes
    - Drop existing problematic policies
    - Create new policies with proper permissions
    - Add policy for users to create redemption transactions for deals
    - Add policy for admins to manage all transactions
    - Add system-level policy for edge functions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create point transactions for deal purchases" ON point_transactions;
DROP POLICY IF EXISTS "Users can read their own point_transactions" ON point_transactions;
DROP POLICY IF EXISTS "Users can read their own point transactions" ON point_transactions;
DROP POLICY IF EXISTS "Admins can manage all point transactions" ON point_transactions;

-- Create new policies with proper permissions
-- Allow users to read their own transactions
CREATE POLICY "Users can read their own point_transactions"
ON point_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to create redemption transactions for deals
CREATE POLICY "Users can create point transactions for deal purchases"
ON point_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid()) AND 
  (type = 'redeem') AND 
  (description LIKE 'Miles redeemed for deal purchase: %')
);

-- Allow admins to manage all transactions
CREATE POLICY "Admins can manage all point transactions"
ON point_transactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Admin'
  )
);

-- Create system-level policy to allow edge functions to create transactions
CREATE POLICY "System can manage all point transactions"
ON point_transactions
FOR ALL
USING (true)
WITH CHECK (true);