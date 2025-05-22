/*
  # Fix payment_links table

  1. Changes
    - Drop existing payment_links table
    - Recreate table with correct schema
    - Add RLS policies
    - Add triggers
*/

-- Drop existing table and related objects
DROP TABLE IF EXISTS payment_links CASCADE;

-- Create payment_links table
CREATE TABLE payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  time_slot TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount > 0),
  payment_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read their own payment links"
  ON payment_links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payment links"
  ON payment_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create trigger function for payment link updates
CREATE OR REPLACE FUNCTION handle_payment_link_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment_link was added and status is still pending
  IF NEW.payment_link IS NOT NULL 
     AND OLD.payment_link IS NULL 
     AND NEW.status = 'pending' THEN
    
    -- Log the update
    RAISE LOG 'Payment link updated for payment_link id: %, link: %',
      NEW.id,
      NEW.payment_link;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment link updates
CREATE TRIGGER on_payment_link_update
  AFTER UPDATE ON payment_links
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_link_update();