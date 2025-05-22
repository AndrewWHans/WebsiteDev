/*
  # Fix sign out issues and profile policies

  1. Changes
    - Drop and recreate profile policies to fix recursion issues
    - Add better role-based access control
    - Fix admin access without recursion
    - Add proper user authentication checks
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view basic profile info of others" ON public.profiles;

-- Create new, simplified policies without recursion
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
ON public.profiles
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.uid() = auth.users.id
    AND auth.users.raw_user_meta_data->>'role' = 'Admin'
  )
);

CREATE POLICY "Users can view basic info of riders"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id <> auth.uid() 
  AND role = 'Rider'
  AND EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.uid() = auth.users.id
  )
);