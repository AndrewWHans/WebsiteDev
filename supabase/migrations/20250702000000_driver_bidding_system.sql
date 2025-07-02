/*
  # Driver Bidding System for Private Rides

  1. New Tables
    - `driver_bids`: Stores driver bids on private ride requests
      - `id` (uuid, primary key)
      - `ride_request_id` (uuid, foreign key to private_ride_requests)
      - `driver_id` (uuid, foreign key to profiles)
      - `bid_amount` (decimal, not null)
      - `status` (text, not null) - 'active', 'accepted', 'rejected', 'expired'
      - `notes` (text) - optional driver notes
      - `created_at` (timestamptz, not null)
      - `updated_at` (timestamptz, not null)

  2. Updates to private_ride_requests
    - Add `bidding_enabled` (boolean, default true)
    - Add `accepted_bid_id` (uuid, foreign key to driver_bids)
    - Add `min_bid_amount` (decimal) - optional minimum bid
    - Add `max_bid_amount` (decimal) - optional maximum bid

  3. Security
    - Enable RLS on driver_bids table
    - Add policies for drivers to manage their own bids
    - Add policies for users to view bids on their requests
    - Add policies for admins to manage all bids
*/

-- Create driver_bids table
CREATE TABLE IF NOT EXISTS driver_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_request_id UUID NOT NULL REFERENCES private_ride_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bid_amount DECIMAL(10,2) NOT NULL CHECK (bid_amount > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'rejected', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ride_request_id, driver_id) -- One bid per driver per ride request
);

-- Create updated_at trigger for driver_bids
CREATE TRIGGER update_driver_bids_updated_at
  BEFORE UPDATE ON driver_bids
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add new columns to private_ride_requests table
ALTER TABLE private_ride_requests 
ADD COLUMN IF NOT EXISTS bidding_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS accepted_bid_id UUID REFERENCES driver_bids(id),
ADD COLUMN IF NOT EXISTS min_bid_amount DECIMAL(10,2) CHECK (min_bid_amount > 0),
ADD COLUMN IF NOT EXISTS max_bid_amount DECIMAL(10,2) CHECK (max_bid_amount > 0);

-- Add constraint to ensure max_bid_amount > min_bid_amount when both are set
ALTER TABLE private_ride_requests 
ADD CONSTRAINT check_bid_amounts 
CHECK (
  (min_bid_amount IS NULL AND max_bid_amount IS NULL) OR
  (min_bid_amount IS NOT NULL AND max_bid_amount IS NOT NULL AND max_bid_amount > min_bid_amount) OR
  (min_bid_amount IS NOT NULL AND max_bid_amount IS NULL) OR
  (min_bid_amount IS NULL AND max_bid_amount IS NOT NULL)
);

-- Enable RLS on driver_bids
ALTER TABLE driver_bids ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for driver_bids
CREATE POLICY "Drivers can view their own bids"
  ON driver_bids
  FOR SELECT
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can create their own bids"
  ON driver_bids
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own active bids"
  ON driver_bids
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id AND status = 'active');

CREATE POLICY "Users can view bids on their ride requests"
  ON driver_bids
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private_ride_requests
      WHERE private_ride_requests.id = driver_bids.ride_request_id
      AND private_ride_requests.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all bids"
  ON driver_bids
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS driver_bids_ride_request_id_idx ON driver_bids(ride_request_id);
CREATE INDEX IF NOT EXISTS driver_bids_driver_id_idx ON driver_bids(driver_id);
CREATE INDEX IF NOT EXISTS driver_bids_status_idx ON driver_bids(status);
CREATE INDEX IF NOT EXISTS driver_bids_created_at_idx ON driver_bids(created_at);

-- Create function to automatically reject other bids when one is accepted
CREATE OR REPLACE FUNCTION handle_bid_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- If a bid is being accepted, reject all other active bids for the same ride request
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE driver_bids 
    SET status = 'rejected', updated_at = now()
    WHERE ride_request_id = NEW.ride_request_id 
    AND id != NEW.id 
    AND status = 'active';
    
    -- Update the private_ride_requests table to set the accepted bid
    UPDATE private_ride_requests 
    SET accepted_bid_id = NEW.id, updated_at = now()
    WHERE id = NEW.ride_request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle bid acceptance
CREATE TRIGGER handle_bid_acceptance_trigger
  AFTER UPDATE ON driver_bids
  FOR EACH ROW
  EXECUTE FUNCTION handle_bid_acceptance();

-- Create function to validate bid amounts against min/max constraints
CREATE OR REPLACE FUNCTION validate_bid_amount()
RETURNS TRIGGER AS $$
DECLARE
  ride_request RECORD;
BEGIN
  -- Get the ride request details
  SELECT min_bid_amount, max_bid_amount, bidding_enabled
  INTO ride_request
  FROM private_ride_requests
  WHERE id = NEW.ride_request_id;
  
  -- Check if bidding is enabled
  IF NOT ride_request.bidding_enabled THEN
    RAISE EXCEPTION 'Bidding is not enabled for this ride request';
  END IF;
  
  -- Check minimum bid amount
  IF ride_request.min_bid_amount IS NOT NULL AND NEW.bid_amount < ride_request.min_bid_amount THEN
    RAISE EXCEPTION 'Bid amount must be at least $%', ride_request.min_bid_amount;
  END IF;
  
  -- Check maximum bid amount
  IF ride_request.max_bid_amount IS NOT NULL AND NEW.bid_amount > ride_request.max_bid_amount THEN
    RAISE EXCEPTION 'Bid amount cannot exceed $%', ride_request.max_bid_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate bid amounts
CREATE TRIGGER validate_bid_amount_trigger
  BEFORE INSERT OR UPDATE ON driver_bids
  FOR EACH ROW
  EXECUTE FUNCTION validate_bid_amount(); 