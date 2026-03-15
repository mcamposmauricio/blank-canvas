
-- chat_banners
CREATE TABLE public.chat_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  bg_color text DEFAULT '#3B82F6',
  text_color text DEFAULT '#FFFFFF',
  link_url text,
  link_label text,
  has_voting boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_banners ENABLE ROW LEVEL SECURITY;

-- Trigger to set tenant_id
CREATE TRIGGER set_chat_banners_tenant_id
  BEFORE INSERT ON public.chat_banners
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_user();

-- Trigger for updated_at
CREATE TRIGGER update_chat_banners_updated_at
  BEFORE UPDATE ON public.chat_banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Tenant CRUD
CREATE POLICY "Tenant members can manage banners"
  ON public.chat_banners FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS: Public SELECT (widget)
CREATE POLICY "Public can view active banners"
  ON public.chat_banners FOR SELECT
  USING (is_active = true);

-- chat_banner_assignments
CREATE TABLE public.chat_banner_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id uuid NOT NULL REFERENCES public.chat_banners(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  is_active boolean DEFAULT true,
  views_count integer DEFAULT 0,
  vote text,
  voted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_banner_assignments ENABLE ROW LEVEL SECURITY;

-- RLS: Tenant CRUD
CREATE POLICY "Tenant members can manage banner assignments"
  ON public.chat_banner_assignments FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS: Public SELECT (widget)
CREATE POLICY "Public can view active assignments"
  ON public.chat_banner_assignments FOR SELECT
  USING (is_active = true);

-- RLS: Public UPDATE (widget votes/views)
CREATE POLICY "Public can update assignment votes"
  ON public.chat_banner_assignments FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Add widget config columns to chat_settings
ALTER TABLE public.chat_settings
  ADD COLUMN IF NOT EXISTS widget_position text DEFAULT 'right',
  ADD COLUMN IF NOT EXISTS widget_primary_color text DEFAULT '#7C3AED';

-- Enable realtime for assignments
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_banner_assignments;
