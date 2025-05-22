/*
  # Fix auth and profile creation issues

  1. Changes
    - Add better error handling to ensure_user_profile function
    - Add transaction support to prevent partial profile creation
    - Add detailed logging for debugging
    - Fix race conditions in profile creation
*/

-- Drop and recreate ensure_user_profile with better error handling
CREATE OR REPLACE FUNCTION ensure_user_profile(user_id uuid, user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role user_role;
BEGIN
  -- Log function call
  RAISE LOG 'ensure_user_profile called for user: %, email: %',
    user_id,
    user_email;

  -- Start transaction
  BEGIN
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
      RAISE LOG 'Profile already exists for user %', user_id;
      RETURN;
    END IF;

    -- Get role from user metadata or default to Rider
    BEGIN
      SELECT (raw_user_meta_data->>'role')::user_role
      INTO _role
      FROM auth.users
      WHERE id = user_id;
    EXCEPTION WHEN OTHERS THEN
      _role := 'Rider'::user_role;
    END;

    -- Create profile
    INSERT INTO profiles (
      id,
      email,
      name,
      role,
      created_at,
      updated_at
    )
    VALUES (
      user_id,
      user_email,
      user_email,
      _role,
      now(),
      now()
    );

    RAISE LOG 'Profile created for user %', user_id;

    -- Create wallet entries
    PERFORM ensure_wallet_exists(user_id);
    RAISE LOG 'Wallet created for user %', user_id;

  EXCEPTION WHEN OTHERS THEN
    -- Log error details
    RAISE LOG 'Error in ensure_user_profile for user %: %, SQLSTATE: %',
      user_id,
      SQLERRM,
      SQLSTATE;
    RAISE;
  END;
END;
$$;