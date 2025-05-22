/*
  # Fix auth flow and profile creation

  1. Changes
    - Add better error handling to profile creation
    - Fix race conditions in auth flow
    - Add transaction support
    - Add detailed logging
    - Fix profile creation trigger
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role user_role;
BEGIN
  -- Start transaction
  BEGIN
    -- Get role from metadata or default to Rider
    BEGIN
      _role := COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'Rider'::user_role
      );
    EXCEPTION WHEN OTHERS THEN
      _role := 'Rider'::user_role;
      RAISE LOG 'Error parsing role, defaulting to Rider: %', SQLERRM;
    END;

    -- Create profile with retry logic
    FOR i IN 1..3 LOOP
      BEGIN
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
          COALESCE(NEW.email, ''),
          COALESCE(NEW.email, 'New User'),
          _role,
          now(),
          now()
        )
        ON CONFLICT (id) DO NOTHING;

        -- If we get here, insert succeeded
        EXIT;
      EXCEPTION WHEN OTHERS THEN
        -- Log error and retry if not last attempt
        IF i < 3 THEN
          RAISE LOG 'Profile creation attempt % failed: %', i, SQLERRM;
          PERFORM pg_sleep(0.1); -- Small delay between retries
        ELSE
          RAISE LOG 'All profile creation attempts failed for user %', NEW.id;
          RETURN NEW; -- Don't block user creation if profile fails
        END IF;
      END;
    END LOOP;

    -- Create wallet with retry logic
    FOR i IN 1..3 LOOP
      BEGIN
        PERFORM ensure_wallet_exists(NEW.id);
        EXIT;
      EXCEPTION WHEN OTHERS THEN
        IF i < 3 THEN
          RAISE LOG 'Wallet creation attempt % failed: %', i, SQLERRM;
          PERFORM pg_sleep(0.1);
        ELSE
          RAISE LOG 'All wallet creation attempts failed for user %', NEW.id;
          -- Don't block user creation if wallet fails
        END IF;
      END;
    END LOOP;

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    -- Log any unexpected errors but don't block user creation
    RAISE LOG 'Unexpected error in handle_new_user for %: %', NEW.id, SQLERRM;
    RETURN NEW;
  END;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update ensure_user_profile function with better error handling
CREATE OR REPLACE FUNCTION ensure_user_profile(user_id uuid, user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Start transaction
  BEGIN
    -- Check if profile exists
    IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
      RETURN;
    END IF;

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
      'Rider',
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create wallet
    PERFORM ensure_wallet_exists(user_id);

  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in ensure_user_profile: %', SQLERRM;
    -- Continue without error to prevent blocking auth
  END;
END;
$$;