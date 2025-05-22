/*
  # Update credit_transactions RLS policies

  1. Changes
    - Add policy to allow admins to insert credit transactions for refunds
    - Maintain existing policy for users to read their own transactions
    - Ensure admins can manage all credit transactions

  2. Security
    - Maintain row-level security
    - Add specific policy for refund transactions
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own credit_transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can manage all credit_transactions" ON credit_transactions;

-- Create policy for users to read their own transactions
CREATE POLICY "Users can read their own credit_transactions"
ON credit_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for admins to manage all credit transactions
CREATE POLICY "Admins can manage all credit_transactions"
ON credit_transactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Admin'
  )
);

-- Create policy for system functions to manage credit transactions
CREATE POLICY "System can manage credit transactions"
ON credit_transactions
FOR ALL
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;