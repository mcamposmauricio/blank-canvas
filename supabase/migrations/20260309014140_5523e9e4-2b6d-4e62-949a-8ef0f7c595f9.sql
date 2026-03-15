-- Create chat_banner_field_rules table for rule-based segmentation
CREATE TABLE public.chat_banner_field_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banner_id uuid NOT NULL REFERENCES public.chat_banners(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  field_source text NOT NULL DEFAULT 'native',
  field_key text NOT NULL,
  operator text NOT NULL DEFAULT 'equals',
  field_value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to chat_banners
ALTER TABLE public.chat_banners
ADD COLUMN IF NOT EXISTS position text NOT NULL DEFAULT 'top',
ADD COLUMN IF NOT EXISTS auto_dismiss_seconds integer,
ADD COLUMN IF NOT EXISTS display_frequency text NOT NULL DEFAULT 'always',
ADD COLUMN IF NOT EXISTS border_style text NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS shadow_style text NOT NULL DEFAULT 'none';

-- Enable RLS on chat_banner_field_rules
ALTER TABLE public.chat_banner_field_rules ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant members
CREATE POLICY "Tenant members can manage banner field rules"
ON public.chat_banner_field_rules
FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Trigger to set tenant_id from banner
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_banner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.banner_id IS NOT NULL THEN
    NEW.tenant_id := (SELECT tenant_id FROM public.chat_banners WHERE id = NEW.banner_id LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_tenant_id_from_banner_trigger
BEFORE INSERT ON public.chat_banner_field_rules
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_banner();