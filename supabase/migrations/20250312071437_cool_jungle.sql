/*
  # Fix infinite recursion in profiles policy

  1. Changes
    - Drop the problematic "Admins can view all profiles" policy that creates infinite recursion
    - Add a new policy that allows Admins to view all profiles without recursive query
  
  This fixes the error: "infinite recursion detected in policy for relation \"profiles\""
*/

-- Drop the problematic policy causing infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a new Admin policy that avoids recursion
-- This policy checks user claims directly instead of querying the profiles table
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  auth.jwt() ->> 'role' = 'authenticated' AND EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'Admin'
  )
);

-- Make sure authenticated users can always see their own profile, regardless of role
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);