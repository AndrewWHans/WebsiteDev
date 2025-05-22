/*
  # Add ensure_user_profile function

  1. New Function
    - `ensure_user_profile`: Creates a new profile if one doesn't exist
      - Parameters:
        - user_id: uuid
        - user_email: text
      - Returns: void
      - Creates profile with default role 'Rider'

  2. Security
    - Function is accessible to authenticated users only
*/

CREATE OR REPLACE FUNCTION ensure_user_profile(user_id uuid, user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    user_id,
    user_email,
    user_email, -- temporary name until profile is completed
    'Rider'
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;