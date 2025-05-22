/*
  # Add function to ensure profile exists

  1. New Functions
    - `ensure_user_profile`: Creates a profile if it doesn't exist for a given user
    
  2. Changes
    - Add function that can be called during sign in to ensure profile exists
    - Add better error handling and logging
    - Use upsert to handle race conditions
*/

-- Create function to ensure user profile exists
CREATE OR REPLACE FUNCTION ensure_user_profile(user_id uuid, user_email text)
RETURNS void AS $$
BEGIN
  -- Log the function call
  RAISE LOG 'ensure_user_profile called for user: %, email: %',
    user_id,
    user_email;

  -- Insert profile if it doesn't exist
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role
  )
  VALUES (
    user_id,
    user_email,
    'New User',
    'Rider'::user_role
  )
  ON CONFLICT (id) DO NOTHING;

  -- Log the result
  RAISE LOG 'Profile ensured for user: %', user_id;
EXCEPTION WHEN OTHERS THEN
  -- Log any errors but don't throw them
  RAISE LOG 'Error in ensure_user_profile for user %: %, SQLSTATE: %',
    user_id,
    SQLERRM,
    SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;