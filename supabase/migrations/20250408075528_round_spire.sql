/*
  # Add default system settings

  1. Changes
    - Insert default values for referral_reward and registration_miles_bonus if they don't exist
    - Ensures single row exists for each setting

  2. Security
    - No changes to RLS policies
*/

-- Insert referral_reward if it doesn't exist
INSERT INTO system_settings (key, value, description)
VALUES (
  'referral_reward',
  '300',
  'Number of miles awarded for successful referrals'
)
ON CONFLICT (key) DO NOTHING;

-- Insert registration_miles_bonus if it doesn't exist
INSERT INTO system_settings (key, value, description)
VALUES (
  'registration_miles_bonus',
  '50',
  'Number of miles awarded to new users upon registration'
)
ON CONFLICT (key) DO NOTHING;