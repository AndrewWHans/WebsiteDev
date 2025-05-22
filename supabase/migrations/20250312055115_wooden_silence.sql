/*
  # Fix user registration trigger function

  1. Changes
    - Improve error handling in handle_new_user function
    - Add better validation for user metadata
    - Fix type casting issues
    - Add detailed error logging
    - Ensure proper transaction handling
*/

-- Drop and recreate the trigger function with improved error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  profile_role user_role;
BEGIN
  -- Log the start of profile creation
  RAISE LOG 'Starting profile creation for user %, email %',
    NEW.id,
    NEW.email;

  -- Validate and set the role with proper error handling
  BEGIN
    -- Extract role from metadata with validation
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL AND 
       NEW.raw_user_meta_data->>'role' IN ('Rider', 'Driver', 'Promoter', 'Employee', 'Admin') THEN
      profile_role := (NEW.raw_user_meta_data->>'role')::user_role;
    ELSE
      profile_role := 'Rider'::user_role;
    END IF;

    -- Insert the profile with validated data
    INSERT INTO public.profiles (
      id,
      email,
      name,
      role,
      college,
      greek_life,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 'New User'),
      profile_role,
      NULLIF(TRIM(NEW.raw_user_meta_data->>'college'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'greek_life'), ''),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE 
    SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      college = EXCLUDED.college,
      greek_life = EXCLUDED.greek_life,
      updated_at = now();

    -- Log successful profile creation
    RAISE LOG 'Successfully created profile for user % with role %',
      NEW.id,
      profile_role;

    RETURN NEW;

  EXCEPTION 
    WHEN invalid_text_representation THEN
      -- Handle invalid role type casting
      RAISE LOG 'Invalid role value in metadata for user %: %',
        NEW.id,
        NEW.raw_user_meta_data->>'role';
      
      -- Fall back to default role
      INSERT INTO public.profiles (id, email, name, role)
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 'New User'),
        'Rider'::user_role
      )
      ON CONFLICT (id) DO UPDATE 
      SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = now();
      
      RETURN NEW;
      
    WHEN OTHERS THEN
      -- Log detailed error information
      RAISE LOG 'Error creating profile for user %: %, SQLSTATE: %, DETAIL: %',
        NEW.id,
        SQLERRM,
        SQLSTATE,
        pg_exception_detail();
      
      -- Attempt basic profile creation with minimal data
      INSERT INTO public.profiles (id, email, name, role)
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        'New User',
        'Rider'::user_role
      )
      ON CONFLICT (id) DO UPDATE 
      SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = now();
      
      RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;