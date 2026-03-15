CREATE TABLE public.chat_category_field_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.chat_service_categories(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  field_key text NOT NULL,
  field_value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_category_field_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members manage category field rules"
  ON public.chat_category_field_rules FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));