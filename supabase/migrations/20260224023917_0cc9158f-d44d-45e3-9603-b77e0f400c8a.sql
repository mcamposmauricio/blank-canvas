
CREATE TABLE public.chat_custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  target text NOT NULL DEFAULT 'company',
  maps_to text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, key)
);

ALTER TABLE public.chat_custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members manage custom field defs"
  ON public.chat_custom_field_definitions FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Trigger to auto-set tenant_id from user
CREATE TRIGGER set_tenant_id_chat_custom_field_defs
  BEFORE INSERT ON public.chat_custom_field_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_user();
