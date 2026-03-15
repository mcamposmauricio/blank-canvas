
CREATE TABLE public.help_article_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  article_id uuid NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  helpful boolean NOT NULL,
  visitor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.help_article_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert help_article_feedback"
  ON public.help_article_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Tenant members can view help_article_feedback"
  ON public.help_article_feedback FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));
