
-- ============================================================
-- PART 1: Drop 6 redundant triggers on chat_rooms
-- ============================================================

-- 1. auto_assign_chat_room (AFTER INSERT — broken, can't modify NEW)
DROP TRIGGER IF EXISTS auto_assign_chat_room ON public.chat_rooms;

-- 2. trg_chat_timeline_update (duplicate of chat_timeline_on_room_change)
DROP TRIGGER IF EXISTS trg_chat_timeline_update ON public.chat_rooms;

-- 3. trg_decrement_attendant_on_close (no WHEN clause — fires on ALL updates)
DROP TRIGGER IF EXISTS trg_decrement_attendant_on_close ON public.chat_rooms;

-- 4. decrement_active_on_room_delete (no WHEN clause, duplicate of decrement_on_room_delete)
DROP TRIGGER IF EXISTS decrement_active_on_room_delete ON public.chat_rooms;

-- 5. trg_resync_attendant_counter (INSERT/DELETE/UPDATE — too broad)
DROP TRIGGER IF EXISTS trg_resync_attendant_counter ON public.chat_rooms;

-- 6. update_company_contact_metrics_on_close (duplicate of trg_update_chat_metrics)
DROP TRIGGER IF EXISTS update_company_contact_metrics_on_close ON public.chat_rooms;

-- ============================================================
-- PART 2: ensure_tenant_chat_defaults function
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_tenant_chat_defaults(p_tenant_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_team_id uuid;
  v_default_category_id uuid;
  v_category_team_id uuid;
BEGIN
  -- 1. Ensure default team exists
  SELECT id INTO v_default_team_id
  FROM chat_teams
  WHERE tenant_id = p_tenant_id AND is_default = true
  LIMIT 1;

  IF v_default_team_id IS NULL THEN
    INSERT INTO chat_teams (name, description, is_default, tenant_id, user_id)
    VALUES ('Geral', 'Time padrão', true, p_tenant_id, p_user_id)
    RETURNING id INTO v_default_team_id;
  END IF;

  -- 2. Ensure default category exists
  SELECT id INTO v_default_category_id
  FROM chat_service_categories
  WHERE tenant_id = p_tenant_id AND is_default = true
  LIMIT 1;

  IF v_default_category_id IS NULL THEN
    INSERT INTO chat_service_categories (name, description, is_default, tenant_id, user_id)
    VALUES ('Geral', 'Categoria padrão', true, p_tenant_id, p_user_id)
    RETURNING id INTO v_default_category_id;
  END IF;

  -- 3. Ensure category-team link exists
  SELECT id INTO v_category_team_id
  FROM chat_category_teams
  WHERE category_id = v_default_category_id AND team_id = v_default_team_id AND tenant_id = p_tenant_id
  LIMIT 1;

  IF v_category_team_id IS NULL THEN
    INSERT INTO chat_category_teams (category_id, team_id, priority_order, tenant_id)
    VALUES (v_default_category_id, v_default_team_id, 0, p_tenant_id)
    RETURNING id INTO v_category_team_id;
  END IF;

  -- 4. Ensure assignment config exists and is enabled for the default link
  INSERT INTO chat_assignment_configs (category_team_id, enabled, model, tenant_id)
  VALUES (v_category_team_id, true, 'round_robin', p_tenant_id)
  ON CONFLICT (category_team_id) DO UPDATE SET enabled = true
  WHERE chat_assignment_configs.category_team_id = v_category_team_id;
END;
$$;

-- ============================================================
-- PART 3: Add unique constraint on chat_assignment_configs(category_team_id)
-- to support ON CONFLICT
-- ============================================================

-- First check if it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chat_assignment_configs_category_team_id_unique'
  ) THEN
    ALTER TABLE public.chat_assignment_configs
      ADD CONSTRAINT chat_assignment_configs_category_team_id_unique UNIQUE (category_team_id);
  END IF;
END $$;

-- ============================================================
-- PART 4: Update sync_csm_chat_enabled to auto-provision + auto-link
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_csm_chat_enabled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_att_id uuid;
  v_default_team_id uuid;
BEGIN
  IF NEW.is_chat_enabled = true THEN
    -- Ensure tenant defaults exist
    PERFORM ensure_tenant_chat_defaults(NEW.tenant_id, NEW.user_id);

    -- Create attendant profile
    INSERT INTO attendant_profiles (csm_id, user_id, display_name, tenant_id)
    VALUES (NEW.id, NEW.user_id, NEW.name, NEW.tenant_id)
    ON CONFLICT (csm_id) DO NOTHING;

    -- Get the attendant profile id
    SELECT id INTO v_att_id FROM attendant_profiles WHERE csm_id = NEW.id;

    -- Auto-link to default team if not already a member of any team
    IF v_att_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM chat_team_members WHERE attendant_id = v_att_id
    ) THEN
      SELECT id INTO v_default_team_id
      FROM chat_teams
      WHERE tenant_id = NEW.tenant_id AND is_default = true
      LIMIT 1;

      IF v_default_team_id IS NOT NULL THEN
        INSERT INTO chat_team_members (team_id, attendant_id, tenant_id)
        VALUES (v_default_team_id, v_att_id, NEW.tenant_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.is_chat_enabled = false AND OLD.is_chat_enabled = true THEN
    DELETE FROM attendant_profiles WHERE csm_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- PART 5: Trigger on user_profiles to provision defaults for new tenants
-- ============================================================

CREATE OR REPLACE FUNCTION public.provision_tenant_chat_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only provision if this user has a tenant_id
  IF NEW.tenant_id IS NOT NULL THEN
    PERFORM ensure_tenant_chat_defaults(NEW.tenant_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_tenant_chat_defaults ON public.user_profiles;

CREATE TRIGGER trg_provision_tenant_chat_defaults
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION provision_tenant_chat_defaults();
