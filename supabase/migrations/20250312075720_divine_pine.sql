/*
  # Add locations table and modify routes table

  1. New Tables
    - `locations`: Stores preset pickup/dropoff locations
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `address` (text, not null)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references profiles)
      - `active` (boolean)

  2. Changes to Routes Table
    - Add time_slots array
    - Add location reference columns
    - Rename capacity columns
*/

-- Create locations table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create policies for locations
CREATE POLICY "Admins can manage locations"
ON locations
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Admin'
  )
);

CREATE POLICY "All users can view active locations"
ON locations
FOR SELECT
TO authenticated
USING (active = true);

-- Modify routes table - Add new columns
ALTER TABLE routes 
  ADD COLUMN time_slots TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN pickup_location_id UUID REFERENCES locations(id),
  ADD COLUMN dropoff_location_id UUID REFERENCES locations(id);

-- Modify routes table - Rename columns (separate statements to avoid syntax error)
ALTER TABLE routes RENAME COLUMN min_capacity TO min_threshold;
ALTER TABLE routes RENAME COLUMN max_capacity TO max_capacity_per_slot;