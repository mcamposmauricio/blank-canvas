
-- Create is_master security definer function
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'master'
  )
$$;

-- Master RLS policies on key tables

CREATE POLICY "Master full access on tenants"
ON public.tenants FOR ALL
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Master can view all profiles"
ON public.user_profiles FOR SELECT
USING (is_master(auth.uid()));

CREATE POLICY "Master can update all profiles"
ON public.user_profiles FOR UPDATE
USING (is_master(auth.uid()));

CREATE POLICY "Master can insert profiles"
ON public.user_profiles FOR INSERT
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Master can manage all roles"
ON public.user_roles FOR ALL
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Master can view all contacts"
ON public.contacts FOR SELECT
USING (is_master(auth.uid()));

CREATE POLICY "Master can view all campaigns"
ON public.campaigns FOR SELECT
USING (is_master(auth.uid()));

CREATE POLICY "Master can view all chat rooms"
ON public.chat_rooms FOR SELECT
USING (is_master(auth.uid()));

CREATE POLICY "Master can manage all chat settings"
ON public.chat_settings FOR ALL
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Master can manage all brand settings"
ON public.brand_settings FOR ALL
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Master can view all email settings"
ON public.user_email_settings FOR SELECT
USING (is_master(auth.uid()));

CREATE POLICY "Master can manage all csms"
ON public.csms FOR ALL
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Master can view all responses"
ON public.responses FOR SELECT
USING (is_master(auth.uid()));

CREATE POLICY "Master can view all permissions"
ON public.user_permissions FOR SELECT
USING (is_master(auth.uid()));
