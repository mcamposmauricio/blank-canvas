
-- Fix tenant_id trigger for campaign_contacts (no user_id column)
-- Replace with a trigger that derives tenant_id from the campaign

CREATE OR REPLACE FUNCTION public.set_tenant_id_from_campaign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.campaign_id IS NOT NULL THEN
    NEW.tenant_id := (SELECT tenant_id FROM public.campaigns WHERE id = NEW.campaign_id LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop the broken trigger and create correct one
DROP TRIGGER IF EXISTS auto_set_tenant_campaign_contacts ON public.campaign_contacts;

CREATE TRIGGER auto_set_tenant_campaign_contacts
  BEFORE INSERT ON public.campaign_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_campaign();

-- Same fix for campaign_sends (also no user_id column)
DROP TRIGGER IF EXISTS auto_set_tenant_campaign_sends ON public.campaign_sends;

CREATE TRIGGER auto_set_tenant_campaign_sends
  BEFORE INSERT ON public.campaign_sends
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_campaign();
