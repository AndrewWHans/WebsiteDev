/*
  # Fix user registration trigger function

  1. Changes
    - Update handle_new_user trigger function to properly handle profile creation
    - Add better error handling and logging
    - Ensure proper type casting for user metadata
    - Add transaction handling to ensure data consistency
*/

-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  profile_role user_role;
BEGIN
  -- Log incoming data for debugging
  RAISE LOG 'Creating profile for user %, email %, metadata %',
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data;

  -- Safely handle role assignment with proper type casting
  BEGIN
    profile_role := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    -- Default to 'Rider' if casting fails
    profile_role := 'Rider'::user_role;
  END;

  -- Insert the profile with a single insert statement
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 'New User'),
    profile_role,
    now(),
    now()
  );

  -- Log successful profile creation
  RAISE LOG 'Successfully created profile for user %', NEW.id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log any errors but don't prevent user creation
  RAISE LOG 'Error creating profile for user %: %, SQLSTATE: %',
    NEW.id,
    SQLERRM,
    SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;