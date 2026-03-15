
-- Create chat_assignment_configs table
CREATE TABLE public.chat_assignment_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  category_team_id uuid NOT NULL REFERENCES public.chat_category_teams(id) ON DELETE CASCADE,

  -- Main toggle
  enabled boolean NOT NULL DEFAULT false,

  -- Distribution model
  model text NOT NULL DEFAULT 'round_robin',

  -- Eligibility filters
  online_only boolean NOT NULL DEFAULT true,
  capacity_limit integer NOT NULL DEFAULT 3,
  allow_over_capacity boolean NOT NULL DEFAULT false,

  -- Priority
  priority_bypass boolean NOT NULL DEFAULT false,

  -- Fallback
  fallback_mode text NOT NULL DEFAULT 'queue_unassigned',
  fallback_team_id uuid REFERENCES public.chat_teams(id) ON DELETE SET NULL,

  -- Round Robin pointer
  rr_last_attendant_id uuid,

  -- Advanced rules
  advanced_reassign_enabled boolean NOT NULL DEFAULT false,
  advanced_reassign_minutes integer NOT NULL DEFAULT 10,
  advanced_notify_enabled boolean NOT NULL DEFAULT false,
  advanced_prefer_senior boolean NOT NULL DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.chat_assignment_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members manage assignment configs"
  ON public.chat_assignment_configs FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_chat_assignment_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_chat_assignment_configs_updated_at
  BEFORE UPDATE ON public.chat_assignment_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_assignment_configs_updated_at();

-- Add skill_level to attendant_profiles
ALTER TABLE public.attendant_profiles
  ADD COLUMN IF NOT EXISTS skill_level text DEFAULT 'junior';
