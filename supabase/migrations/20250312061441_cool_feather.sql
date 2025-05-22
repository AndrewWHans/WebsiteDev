/*
  # Add trigger for automatic profile creation

  1. New Trigger Function
    - `handle_new_user`: Creates a profile when a new user is created
      - Triggered after insert on auth.users
      - Creates profile with:
        - id: user's UUID
        - email: user's email
        - name: temporary (email)
        - role: 'Rider'

  2. Security
    - Function is security definer to ensure it has necessary permissions
    - Search path is explicitly set to public for security
*/

-- Create trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.email,
    'Rider'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();