/*
  # Add RLS policies for point transactions

  1. Changes
    - Enable RLS on point_transactions table
    - Add policy for users to create point transactions for deal purchases
    - Add policy for users to read their own point transactions
    - Add policy for admins to manage all point transactions

  2. Security
    - Users can only create point transactions for themselves
    - Users can only read their own point transactions
    - Admins can manage all point transactions
    - Point transactions must be related to deal purchases
*/

-- Enable RLS on point_transactions table
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- Allow users to create point transactions for deal purchases
CREATE POLICY "Users can create point transactions for deal purchases"
ON point_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND 
  type = 'redeem' AND 
  description LIKE 'Miles redeemed for deal purchase: %'
);

-- Allow users to read their own point transactions
CREATE POLICY "Users can read their own point transactions"
ON point_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to manage all point transactions
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
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Admin'
  )
);