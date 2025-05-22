/*
  # Add index for payment_links is_paid column

  1. Changes
    - Add index on is_paid column for better query performance
    - Add index on status column for better query performance
    - Add index on user_id and route_id for better join performance
*/

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS payment_links_is_paid_idx ON payment_links (is_paid);
CREATE INDEX IF NOT EXISTS payment_links_status_idx ON payment_links (status);
CREATE INDEX IF NOT EXISTS payment_links_user_id_idx ON payment_links (user_id);
CREATE INDEX IF NOT EXISTS payment_links_route_id_idx ON payment_links (route_id);