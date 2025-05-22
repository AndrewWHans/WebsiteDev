/*
  # Create profile pictures storage bucket

  1. New Storage Bucket
    - `profile-pictures`: For storing user profile pictures
    - Public access enabled
    - Security policies for authenticated users to upload their own photos
*/

-- Create storage bucket for profile pictures if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for profile pictures bucket

-- Allow authenticated users to insert their own profile photos
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

-- Allow authenticated users to update their own profile photos
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
)
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

-- Allow authenticated users to read their own profile photos
CREATE POLICY "Users can read their own profile pictures"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

-- Allow public access to profile pictures (for display)
CREATE POLICY "Public read access to profile pictures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');