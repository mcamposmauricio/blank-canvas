
-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Public can view published help_articles" ON public.help_articles;

CREATE POLICY "Public can view published help_articles"
  ON public.help_articles
  FOR SELECT
  USING (status = 'published');
