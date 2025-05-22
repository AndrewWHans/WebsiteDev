/*
  # Add feedback table for user suggestions

  1. New Tables
    - `feedback`: Stores user feedback and suggestions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `name` (text, not null)
      - `email` (text, not null)
      - `feedback_type` (text, not null)
      - `message` (text, not null)
      - `status` (text, not null)
      - `created_at` (timestamptz, not null)
      - `updated_at` (timestamptz, not null)

  2. Security
    - Enable RLS
    - Add policies for users to create and read their own feedback
    - Add policies for admins to manage all feedback
*/

-- Create feedback table
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('suggestion', 'bug', 'feature', 'other')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'implemented', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create updated_at trigger
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can create feedback"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read their own feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all feedback"
  ON feedback
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Create index for better query performance
CREATE INDEX feedback_user_id_idx ON feedback(user_id);
CREATE INDEX feedback_status_idx ON feedback(status);
CREATE INDEX feedback_created_at_idx ON feedback(created_at);