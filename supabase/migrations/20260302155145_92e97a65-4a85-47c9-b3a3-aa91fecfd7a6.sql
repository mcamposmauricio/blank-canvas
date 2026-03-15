-- Add trigger to auto-set tenant_id on chat_business_hour_breaks
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_business_hour()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.business_hour_id IS NOT NULL THEN
    NEW.tenant_id := (SELECT tenant_id FROM public.chat_business_hours WHERE id = NEW.business_hour_id LIMIT 1);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER set_break_tenant_id
BEFORE INSERT ON public.chat_business_hour_breaks
FOR EACH ROW
EXECUTE FUNCTION public.set_tenant_id_from_business_hour();