/*
  # Add phone number to profiles table

  1. Changes
    - Add phone_number column to profiles table
    - Add validation check for phone number format
*/

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number text;

-- Add check constraint for phone number format (optional, allows NULL)
ALTER TABLE profiles
ADD CONSTRAINT phone_number_format 
CHECK (
  phone_number IS NULL OR 
  phone_number ~ '^\+?1?\d{10,}$'
);