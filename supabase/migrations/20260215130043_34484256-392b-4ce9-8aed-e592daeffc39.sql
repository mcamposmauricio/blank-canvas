
-- 1. chat_teams
CREATE TABLE public.chat_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  description text,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.chat_teams ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_tenant_id_chat_teams BEFORE INSERT ON public.chat_teams
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

CREATE POLICY "Tenant members can view chat_teams" ON public.chat_teams FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant members can insert chat_teams" ON public.chat_teams FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant members can update chat_teams" ON public.chat_teams FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant members can delete chat_teams" ON public.chat_teams FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 2. chat_team_members
CREATE TABLE public.chat_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.chat_teams(id) ON DELETE CASCADE,
  attendant_id uuid NOT NULL REFERENCES public.attendant_profiles(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, attendant_id)
);
ALTER TABLE public.chat_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage chat_team_members" ON public.chat_team_members FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- 3. chat_service_categories
CREATE TABLE public.chat_service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.chat_service_categories ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_tenant_id_chat_service_categories BEFORE INSERT ON public.chat_service_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

CREATE POLICY "Tenant members can view chat_service_categories" ON public.chat_service_categories FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant members can insert chat_service_categories" ON public.chat_service_categories FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant members can update chat_service_categories" ON public.chat_service_categories FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant members can delete chat_service_categories" ON public.chat_service_categories FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 4. chat_category_teams
CREATE TABLE public.chat_category_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.chat_service_categories(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.chat_teams(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  priority_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, team_id)
);
ALTER TABLE public.chat_category_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage chat_category_teams" ON public.chat_category_teams FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- 5. Alter contacts table
ALTER TABLE public.contacts ADD COLUMN service_category_id uuid REFERENCES public.chat_service_categories(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN service_priority text DEFAULT 'normal';
