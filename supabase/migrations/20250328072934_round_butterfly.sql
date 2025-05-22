/*
  # Add payment link policies for webhook

  1. Changes
    - Add policies to allow webhook to create payment links
    - Add policies to allow webhook to update payment links
    - Add policies to allow system functions to manage payment links
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create their own payment links" ON payment_links;
DROP POLICY IF EXISTS "Users can read their own payment links" ON payment_links;

-- Create new policies
CREATE POLICY "Users can create their own payment links"
ON payment_links
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own payment links"
ON payment_links
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for system functions and webhooks
CREATE POLICY "System can manage all payment links"
ON payment_links
FOR ALL
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;