/*
  # Add Admin users to profiles

  1. Changes
    - Ensure that Admin role is properly set for users designated as administrators
    - Grant admins appropriate privileges
*/

-- Create a function to manage role assignments
CREATE OR REPLACE FUNCTION manage_user_role(
  p_user_id UUID,
  p_role user_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user's role in the profiles table
  UPDATE profiles
  SET role = p_role
  WHERE id = p_user_id;
END;
$$;

-- Create a policy to allow admins to view all profiles regardless of role
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'Admin'
  )
);

-- Create placeholder entries for future tables that will be needed:

-- Create a routes table to store ULimo routes if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'routes' AND schemaname = 'public') THEN
    EXECUTE 'CREATE TABLE public.routes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pickup_location TEXT NOT NULL,
      dropoff_location TEXT NOT NULL,
      date DATE NOT NULL,
      time TIME NOT NULL,
      price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
      max_capacity INTEGER NOT NULL CHECK (max_capacity > 0),
      min_capacity INTEGER NOT NULL CHECK (min_capacity > 0),
      tickets_sold INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT ''active'',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by UUID REFERENCES profiles(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )';
    
    EXECUTE 'ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY';
    
    -- Allow admins full access to routes
    EXECUTE 'CREATE POLICY "Admins can manage routes" 
      ON public.routes
      USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = ''Admin'')
      )';
      
    -- Allow all users to view active routes
    EXECUTE 'CREATE POLICY "All users can view active routes" 
      ON public.routes
      FOR SELECT
      USING (status = ''active'')';
  END IF;
END
$$;

-- Create a deals table for nightlife deals if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'deals' AND schemaname = 'public') THEN
    EXECUTE 'CREATE TABLE public.deals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
      image_url TEXT,
      purchases INTEGER NOT NULL DEFAULT 0,
      views INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT ''active'',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by UUID REFERENCES profiles(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )';
    
    EXECUTE 'ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY';
    
    -- Allow admins full access to deals
    EXECUTE 'CREATE POLICY "Admins can manage deals" 
      ON public.deals
      USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = ''Admin'')
      )';
      
    -- Allow all users to view active deals
    EXECUTE 'CREATE POLICY "All users can view active deals" 
      ON public.deals
      FOR SELECT
      USING (status = ''active'')';
  END IF;
END
$$;

-- Sample data: Set an initial admin user if one doesn't exist yet
DO $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  -- Check if there's already an admin user
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE role = 'Admin'
  ) INTO admin_exists;
  
  -- If no admin exists, make the first user an admin
  IF NOT admin_exists THEN
    UPDATE profiles
    SET role = 'Admin'
    WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);
  END IF;
END
$$;