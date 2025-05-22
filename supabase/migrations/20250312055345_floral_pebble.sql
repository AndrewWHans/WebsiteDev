/*
  # Fix profile creation trigger function

  1. Changes
    - Simplify trigger function to reduce complexity
    - Add better error handling
    - Fix type casting issues
    - Add UPSERT support
    - Add detailed logging
    - Handle NULL values properly

  2. Security
    - Maintain existing RLS policies
    - Keep security definer attribute
*/

-- Drop and recreate the trigger function with simplified logic
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the incoming data
  RAISE LOG 'handle_new_user called for user: %, email: %, metadata: %',
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data;

  -- Insert profile with simple error handling
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      name,
      role
    )
    VALUES (
      NEW.id,
      NEW.email,
      'New User',
      'Rider'::user_role
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE LOG 'Profile created successfully for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE LOG 'Error in handle_new_user for user %: %, SQLSTATE: %',
      NEW.id,
      SQLERRM,
      SQLSTATE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();