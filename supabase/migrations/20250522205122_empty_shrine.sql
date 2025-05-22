/*
  # Create deal_route_tags table

  1. New Tables
    - `deal_route_tags`
      - `id` (uuid, primary key)
      - `deal_id` (uuid, foreign key to deals)
      - `route_id` (uuid, foreign key to routes)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to profiles)
  
  2. Security
    - Enable RLS on `deal_route_tags` table
    - Add policy for admins to manage all deal_route_tags
    - Add policy for all authenticated users to read deal_route_tags
*/

-- Create the deal_route_tags table
CREATE TABLE IF NOT EXISTS deal_route_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE(deal_id, route_id)
);

-- Enable Row Level Security
ALTER TABLE deal_route_tags ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all deal_route_tags"
  ON deal_route_tags
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
  ));

CREATE POLICY "All users can read deal_route_tags"
  ON deal_route_tags
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS deal_route_tags_deal_id_idx ON deal_route_tags(deal_id);
CREATE INDEX IF NOT EXISTS deal_route_tags_route_id_idx ON deal_route_tags(route_id);