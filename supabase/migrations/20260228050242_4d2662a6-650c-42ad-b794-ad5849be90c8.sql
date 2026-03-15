
CREATE POLICY "Public can view tenant slugs"
  ON public.tenants
  FOR SELECT
  USING (true);
