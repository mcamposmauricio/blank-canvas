
-- help_articles
DROP POLICY IF EXISTS "Public can view published help_articles" ON public.help_articles;
DROP POLICY IF EXISTS "Tenant members can manage help_articles" ON public.help_articles;

CREATE POLICY "Public can view published help_articles" ON public.help_articles FOR SELECT USING (status = 'published');
CREATE POLICY "Tenant members can manage help_articles" ON public.help_articles FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- help_article_versions
DROP POLICY IF EXISTS "Public can view published article versions" ON public.help_article_versions;
DROP POLICY IF EXISTS "Tenant members can manage help_article_versions" ON public.help_article_versions;

CREATE POLICY "Public can view published article versions" ON public.help_article_versions FOR SELECT USING (EXISTS (SELECT 1 FROM help_articles WHERE help_articles.id = help_article_versions.article_id AND help_articles.status = 'published'));
CREATE POLICY "Tenant members can manage help_article_versions" ON public.help_article_versions FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- help_collections
DROP POLICY IF EXISTS "Public can view active help_collections" ON public.help_collections;
DROP POLICY IF EXISTS "Tenant members can manage help_collections" ON public.help_collections;

CREATE POLICY "Public can view active help_collections" ON public.help_collections FOR SELECT USING (status = 'active');
CREATE POLICY "Tenant members can manage help_collections" ON public.help_collections FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- help_article_events
DROP POLICY IF EXISTS "Public can insert help_article_events" ON public.help_article_events;
DROP POLICY IF EXISTS "Tenant members can view help_article_events" ON public.help_article_events;

CREATE POLICY "Public can insert help_article_events" ON public.help_article_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Tenant members can view help_article_events" ON public.help_article_events FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
