/*
  # Update point_transactions RLS policies

  1. Changes
    - Add new policy to allow users to create point transactions for deal redemptions
    - Policy ensures users can only create transactions for themselves
    - Validates transaction type is 'redeem' and description matches expected format

  2. Security
    - Users can only create transactions for their own user_id
    - Transaction type must be 'redeem'
    - Description must match expected format for deal redemptions
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can create point transactions for deal purchases" ON point_transactions;

-- Create new policy
CREATE POLICY "Users can create point transactions for deal purchases"
ON point_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  type = 'redeem' AND
  description LIKE 'Miles redeemed for deal purchase: %'
);