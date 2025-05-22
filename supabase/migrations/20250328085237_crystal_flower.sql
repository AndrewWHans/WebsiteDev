/*
  # Add Stripe payment fields to payment_links table

  1. Changes
    - Add stripe_session_id column to store Stripe Checkout Session ID
    - Add stripe_payment_intent_id column to store Stripe Payment Intent ID
    - Add indexes for better query performance
*/

-- Add new columns for Stripe payment data
ALTER TABLE payment_links
ADD COLUMN stripe_session_id text,
ADD COLUMN stripe_payment_intent_id text;

-- Add indexes for the new columns
CREATE INDEX payment_links_stripe_session_id_idx ON payment_links (stripe_session_id);
CREATE INDEX payment_links_stripe_payment_intent_id_idx ON payment_links (stripe_payment_intent_id);

-- Update the webhook handler function to store these IDs
CREATE OR REPLACE FUNCTION handle_payment_link_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment_link was added and status is still pending
  IF NEW.payment_link IS NOT NULL 
     AND OLD.payment_link IS NULL 
     AND NEW.status = 'pending' THEN
    
    -- Log the update with payment details
    RAISE LOG 'Payment link updated for payment_link id: %, link: %, date: %, stripe_session_id: %, stripe_payment_intent_id: %',
      NEW.id,
      NEW.payment_link,
      NEW.route_date,
      NEW.stripe_session_id,
      NEW.stripe_payment_intent_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;