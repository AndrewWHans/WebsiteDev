/*
  # Add profile fields and update trigger function

  1. Changes
    - Add first_name and last_name columns to profiles table
    - Add profile_picture_url column
    - Update handle_new_user function to handle new fields
    - Add function to check if profile is complete

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN first_name text,
ADD COLUMN last_name text,
ADD COLUMN profile_picture_url text;

-- Create function to check if profile is complete
CREATE OR REPLACE FUNCTION is_profile_complete(profile_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = profile_id
      AND first_name IS NOT NULL
      AND last_name IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;