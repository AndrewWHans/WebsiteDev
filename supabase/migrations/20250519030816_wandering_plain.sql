/*
  # Add hidden_cities system setting

  1. Changes
    - Add hidden_cities setting to system_settings table
    - Add policy for authenticated users to read system settings
    - Ensure proper JSON format for hidden cities list
*/

-- Add hidden_cities setting if it doesn't exist
INSERT INTO system_settings (key, value, description)
VALUES ('hidden_cities', '[]', 'List of cities hidden from the shuttles page')
ON CONFLICT (key) DO NOTHING;

-- Add policy for authenticated users to read system settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Authenticated users can read system settings'
    AND tablename = 'system_settings'
  ) THEN
    CREATE POLICY "Authenticated users can read system settings"
      ON system_settings
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;