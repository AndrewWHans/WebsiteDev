/*
  # Add private ride requests table

  1. New Tables
    - `private_ride_requests`: Stores private ride booking requests
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `phone_number` (text, not null)
      - `pickup_date` (date, not null)
      - `pickup_time` (time, not null)
      - `pickup_location` (text, not null)
      - `dropoff_location` (text, not null)
      - `passengers` (integer, not null)
      - `notes` (text)
      - `status` (text, not null)
      - `created_at` (timestamptz, not null)
      - `updated_at` (timestamptz, not null)

  2. Security
    - Enable RLS
    - Add policies for users to read their own requests
    - Add policies for admins to manage all requests
*/

-- Create private_ride_requests table
CREATE TABLE private_ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL CHECK (phone_number ~ '^\+?1?\d{10,}$'),
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  passengers INTEGER NOT NULL CHECK (passengers > 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create updated_at trigger
CREATE TRIGGER update_private_ride_requests_updated_at
  BEFORE UPDATE ON private_ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE private_ride_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read their own requests"
  ON private_ride_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests"
  ON private_ride_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all requests"
  ON private_ride_requests
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );