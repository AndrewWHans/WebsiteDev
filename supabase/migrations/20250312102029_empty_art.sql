/*
  # Add ticket bookings table and related functions

  1. New Tables
    - `ticket_bookings`: Stores user ticket bookings
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `route_id` (uuid, references routes.id)
      - `time_slot` (text, not null)
      - `quantity` (integer, not null)
      - `total_price` (decimal, not null)
      - `status` (text, not null)
      - `booking_date` (timestamptz, not null)
      - `created_at` (timestamptz, not null)
      - `updated_at` (timestamptz, not null)

  2. New Functions
    - `book_ticket`: Process ticket booking and related operations
    - `get_available_seats`: Get available seats for a route and time slot
    - `update_route_metrics`: Update route metrics after booking

  3. Security
    - Enable RLS on ticket_bookings table
    - Add policies for users to read their own bookings
*/

-- Create ticket_bookings table
CREATE TABLE IF NOT EXISTS ticket_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  time_slot TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  booking_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create function to get available seats for a time slot
CREATE OR REPLACE FUNCTION get_available_seats(
  p_route_id UUID,
  p_time_slot TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_capacity INTEGER;
  v_booked_seats INTEGER;
BEGIN
  -- Get the max capacity per slot
  SELECT max_capacity_per_slot INTO v_max_capacity
  FROM routes
  WHERE id = p_route_id;
  
  -- Get the number of booked seats for this time slot
  SELECT COALESCE(SUM(quantity), 0) INTO v_booked_seats
  FROM ticket_bookings
  WHERE route_id = p_route_id 
    AND time_slot = p_time_slot
    AND status IN ('confirmed', 'pending');
  
  -- Return available seats
  RETURN v_max_capacity - v_booked_seats;
END;
$$;

-- Create function to book a ticket
CREATE OR REPLACE FUNCTION book_ticket(
  p_user_id UUID,
  p_route_id UUID,
  p_time_slot TEXT,
  p_quantity INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_route_price DECIMAL(10, 2);
  v_total_price DECIMAL(10, 2);
  v_available_seats INTEGER;
  v_user_credits DECIMAL(10, 2);
  v_booking_id UUID;
  v_route_name TEXT;
BEGIN
  -- Check if quantity is valid
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;
  
  -- Get route details
  SELECT price INTO v_route_price
  FROM routes
  WHERE id = p_route_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Route not found';
  END IF;
  
  -- Calculate total price
  v_total_price := v_route_price * p_quantity;
  
  -- Check available seats
  v_available_seats := get_available_seats(p_route_id, p_time_slot);
  
  IF v_available_seats < p_quantity THEN
    RAISE EXCEPTION 'Not enough seats available (% available, % requested)', 
      v_available_seats, p_quantity;
  END IF;
  
  -- Check user credits
  SELECT balance INTO v_user_credits
  FROM wallet_credits
  WHERE user_id = p_user_id;
  
  IF v_user_credits < v_total_price THEN
    RAISE EXCEPTION 'Insufficient credits (% needed, % available)', 
      v_total_price, v_user_credits;
  END IF;
  
  -- Get route name for transaction description
  SELECT 
    CONCAT(pickup.name, ' to ', dropoff.name) INTO v_route_name
  FROM 
    routes r
    JOIN locations pickup ON r.pickup_location = pickup.id
    JOIN locations dropoff ON r.dropoff_location = dropoff.id
  WHERE 
    r.id = p_route_id;
  
  -- Create booking record
  INSERT INTO ticket_bookings (
    user_id,
    route_id,
    time_slot,
    quantity,
    total_price,
    status,
    booking_date
  ) VALUES (
    p_user_id,
    p_route_id,
    p_time_slot,
    p_quantity,
    v_total_price,
    'confirmed',
    now()
  ) RETURNING id INTO v_booking_id;
  
  -- Deduct credits from wallet
  UPDATE wallet_credits
  SET balance = balance - v_total_price
  WHERE user_id = p_user_id;
  
  -- Add credit transaction
  INSERT INTO credit_transactions (
    user_id,
    amount,
    description,
    type,
    reference_id
  ) VALUES (
    p_user_id,
    -v_total_price,
    'Ticket purchase: ' || v_route_name || ' (' || p_quantity || ' seats)',
    'purchase',
    v_booking_id::text
  );
  
  -- Add point transaction (1 point per dollar spent)
  INSERT INTO point_transactions (
    user_id,
    points,
    description,
    type,
    reference_id
  ) VALUES (
    p_user_id,
    FLOOR(v_total_price)::integer,
    'Points earned: ' || v_route_name || ' purchase',
    'earn',
    v_booking_id::text
  );
  
  -- Add points to wallet
  PERFORM add_points(
    p_user_id, 
    FLOOR(v_total_price)::integer, 
    'Ticket purchase reward', 
    'earn', 
    v_booking_id::text
  );
  
  -- Update route metrics
  UPDATE routes
  SET 
    tickets_sold = tickets_sold + p_quantity,
    updated_at = now()
  WHERE id = p_route_id;
  
  RETURN v_booking_id;
EXCEPTION WHEN OTHERS THEN
  -- Log error and re-raise
  RAISE LOG 'Error in book_ticket: %', SQLERRM;
  RAISE;
END;
$$;

-- Enable RLS on ticket_bookings
ALTER TABLE ticket_bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read their own bookings"
ON ticket_bookings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_ticket_bookings_user_id ON ticket_bookings(user_id);
CREATE INDEX idx_ticket_bookings_route_id ON ticket_bookings(route_id);
CREATE INDEX idx_ticket_bookings_status ON ticket_bookings(status);