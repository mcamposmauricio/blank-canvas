
-- ============================================================
-- HELP CENTER: 5 tables + RLS + triggers + realtime
-- ============================================================

-- 1. help_collections
CREATE TABLE public.help_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  status text NOT NULL DEFAULT 'active',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

ALTER TABLE public.help_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage help_collections"
  ON public.help_collections FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Public can view active help_collections"
  ON public.help_collections FOR SELECT TO anon
  USING (status = 'active');

CREATE TRIGGER update_help_collections_updated_at
  BEFORE UPDATE ON public.help_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. help_articles
CREATE TABLE public.help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.help_collections(id) ON DELETE SET NULL,
  title text NOT NULL,
  subtitle text,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  visibility text NOT NULL DEFAULT 'public',
  current_version_id uuid,
  published_at timestamptz,
  archived_at timestamptz,
  created_by_user_id uuid NOT NULL,
  updated_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage help_articles"
  ON public.help_articles FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Public can view published help_articles"
  ON public.help_articles FOR SELECT TO anon
  USING (status = 'published');

CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. help_article_versions
CREATE TABLE public.help_article_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  editor_schema_json jsonb NOT NULL DEFAULT '{"blocks":[]}'::jsonb,
  html_snapshot text,
  change_summary text,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.help_article_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage help_article_versions"
  ON public.help_article_versions FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Public can view published article versions"
  ON public.help_article_versions FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.help_articles
    WHERE help_articles.id = help_article_versions.article_id
      AND help_articles.status = 'published'
  ));

-- 4. help_article_events (analytics)
CREATE TABLE public.help_article_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.help_article_versions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  visitor_id text,
  session_id text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.help_article_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view help_article_events"
  ON public.help_article_events FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Public can insert help_article_events"
  ON public.help_article_events FOR INSERT TO anon
  WITH CHECK (true);

-- 5. help_site_settings
CREATE TABLE public.help_site_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  public_base_url text,
  home_title text DEFAULT 'Central de Ajuda',
  home_subtitle text DEFAULT 'Como podemos ajudar?',
  theme text NOT NULL DEFAULT 'light',
  brand_logo_url text,
  brand_primary_color text DEFAULT '#3B82F6',
  brand_secondary_color text,
  footer_html text,
  contact_channels_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  custom_css text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.help_site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage help_site_settings"
  ON public.help_site_settings FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Public can view help_site_settings"
  ON public.help_site_settings FOR SELECT TO anon
  USING (true);

CREATE TRIGGER update_help_site_settings_updated_at
  BEFORE UPDATE ON public.help_site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FK: help_articles.current_version_id -> help_article_versions
ALTER TABLE public.help_articles
  ADD CONSTRAINT help_articles_current_version_id_fkey
  FOREIGN KEY (current_version_id) REFERENCES public.help_article_versions(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_help_articles_tenant_status ON public.help_articles(tenant_id, status);
CREATE INDEX idx_help_articles_collection ON public.help_articles(collection_id);
CREATE INDEX idx_help_article_events_article ON public.help_article_events(article_id, event_type);
CREATE INDEX idx_help_article_events_occurred ON public.help_article_events(occurred_at);
CREATE INDEX idx_help_article_versions_article ON public.help_article_versions(article_id, version_number);

-- Realtime for help_articles
ALTER PUBLICATION supabase_realtime ADD TABLE public.help_articles;
