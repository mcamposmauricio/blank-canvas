
-- Table for controlling which modules are enabled per tenant
CREATE TABLE public.tenant_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module)
);

ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

-- Only master users can manage tenant modules
CREATE POLICY "Master can manage tenant modules"
  ON public.tenant_modules FOR ALL
  TO authenticated
  USING (is_master(auth.uid()))
  WITH CHECK (is_master(auth.uid()));

-- Tenant members can view their own modules (to know what's enabled)
CREATE POLICY "Tenant members can view own modules"
  ON public.tenant_modules FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
