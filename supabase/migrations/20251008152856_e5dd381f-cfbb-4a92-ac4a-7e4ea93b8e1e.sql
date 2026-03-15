-- Fix security warning: Add search_path to function
CREATE OR REPLACE FUNCTION public.update_campaign_send_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign_sends when a response is received
  UPDATE public.campaign_sends
  SET response_at = NEW.responded_at
  WHERE campaign_id = NEW.campaign_id
  AND contact_id = NEW.contact_id
  AND response_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;