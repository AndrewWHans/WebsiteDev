/*
  # Add system_settings table for application configuration

  1. New Tables
    - `system_settings`: Stores application-wide configuration settings
      - `key` (text, primary key)
      - `value` (text, not null)
      - `description` (text)
      - `created_at` (timestamptz, not null)
      - `updated_at` (timestamptz, not null)

  2. Security
    - Enable RLS
    - Add policies for admin access
    - Add initial point value setting
*/

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_timestamp
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_system_settings_updated_at();

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admins can manage system settings"
ON system_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Admin'
  )
);

-- Insert initial point value setting
INSERT INTO system_settings (key, value, description)
VALUES ('point_value', '0.02', 'Monetary value of each point in USD')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description;