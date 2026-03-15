
-- Bug 1: Policy SELECT pública em chat_settings para visitantes anônimos lerem widgetConfig
CREATE POLICY "Public can read chat widget config"
ON public.chat_settings FOR SELECT
USING (true);

-- Bug 2: Corrigir assign_chat_room() — remover referência à coluna inexistente owner_user_id em chat_business_hours
CREATE OR REPLACE FUNCTION public.assign_chat_room()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contact          RECORD;
  v_cat_team         RECORD;
  v_config           RECORD;
  v_eligible         RECORD;
  v_is_priority      boolean := false;
  v_assigned         boolean := false;
  v_now_dow          integer;
  v_now_time         time;
  v_bh_exists        boolean := false;
  v_tenant_id        uuid;
BEGIN
  -- Only process new 'waiting' rooms that have a contact_id
  IF NEW.status IS DISTINCT FROM 'waiting' THEN RETURN NEW; END IF;
  IF NEW.contact_id IS NULL THEN RETURN NEW; END IF;

  -- Resolve tenant_id for this room's owner
  v_tenant_id := (SELECT tenant_id FROM public.user_profiles WHERE user_id = NEW.owner_user_id LIMIT 1);

  v_now_dow := EXTRACT(DOW FROM NOW() AT TIME ZONE 'America/Sao_Paulo')::integer;
  v_now_time := (NOW() AT TIME ZONE 'America/Sao_Paulo')::time;

  -- Check if there are any business hours records for this tenant (using tenant_id only — column owner_user_id does NOT exist)
  SELECT EXISTS(
    SELECT 1 FROM public.chat_business_hours
    WHERE tenant_id = v_tenant_id
  ) INTO v_bh_exists;

  -- If business hours are configured, check if current time is within active hours
  IF v_bh_exists THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.chat_business_hours
      WHERE tenant_id = v_tenant_id
        AND day_of_week = v_now_dow
        AND is_active = true
        AND start_time::time <= v_now_time
        AND end_time::time >= v_now_time
    ) THEN
      -- Outside business hours — leave room in waiting, do not assign
      RETURN NEW;
    END IF;
  END IF;

  -- 1. Fetch contact for service category and priority
  SELECT service_category_id, service_priority
  INTO v_contact
  FROM public.contacts
  WHERE id = NEW.contact_id;

  IF NOT FOUND OR v_contact.service_category_id IS NULL THEN RETURN NEW; END IF;

  -- Normalize priority comparison
  v_is_priority := lower(coalesce(v_contact.service_priority, '')) IN ('alta', 'critica', 'crítica');

  -- 2. Loop over category_team links ordered by priority_order
  FOR v_cat_team IN
    SELECT id, team_id
    FROM public.chat_category_teams
    WHERE category_id = v_contact.service_category_id
    ORDER BY priority_order ASC NULLS LAST
  LOOP
    -- 3. Get assignment config for this category_team link
    SELECT *
    INTO v_config
    FROM public.chat_assignment_configs
    WHERE category_team_id = v_cat_team.id;

    IF NOT FOUND OR NOT v_config.enabled THEN CONTINUE; END IF;

    -- 4a. Round Robin
    IF v_config.model = 'round_robin' AND v_config.rr_last_attendant_id IS NOT NULL THEN
      SELECT ap.id, ap.active_conversations, ap.skill_level, ap.user_id
      INTO v_eligible
      FROM public.attendant_profiles ap
      JOIN public.chat_team_members ctm ON ctm.attendant_id = ap.id
      WHERE ctm.team_id = v_cat_team.team_id
        AND (NOT v_config.online_only OR ap.status = 'online')
        AND (v_config.allow_over_capacity OR COALESCE(ap.active_conversations, 0) < v_config.capacity_limit)
        AND ap.id > v_config.rr_last_attendant_id
      ORDER BY ap.id ASC
      LIMIT 1;

      IF NOT FOUND THEN
        SELECT ap.id, ap.active_conversations, ap.skill_level, ap.user_id
        INTO v_eligible
        FROM public.attendant_profiles ap
        JOIN public.chat_team_members ctm ON ctm.attendant_id = ap.id
        WHERE ctm.team_id = v_cat_team.team_id
          AND (NOT v_config.online_only OR ap.status = 'online')
          AND (v_config.allow_over_capacity OR COALESCE(ap.active_conversations, 0) < v_config.capacity_limit)
        ORDER BY ap.id ASC
        LIMIT 1;
      END IF;

    -- 4b. Priority bypass
    ELSIF v_is_priority AND v_config.priority_bypass THEN
      SELECT ap.id, ap.active_conversations, ap.skill_level, ap.user_id
      INTO v_eligible
      FROM public.attendant_profiles ap
      JOIN public.chat_team_members ctm ON ctm.attendant_id = ap.id
      WHERE ctm.team_id = v_cat_team.team_id
        AND (NOT v_config.online_only OR ap.status = 'online')
        AND (v_config.allow_over_capacity OR COALESCE(ap.active_conversations, 0) < v_config.capacity_limit)
      ORDER BY
        CASE WHEN v_config.advanced_prefer_senior THEN
          CASE lower(coalesce(ap.skill_level, 'junior'))
            WHEN 'senior' THEN 0
            WHEN 'pleno'  THEN 1
            ELSE 2
          END
        ELSE 0 END ASC,
        COALESCE(ap.active_conversations, 0) ASC
      LIMIT 1;

    -- 4c. Least Busy (default)
    ELSE
      SELECT ap.id, ap.active_conversations, ap.skill_level, ap.user_id
      INTO v_eligible
      FROM public.attendant_profiles ap
      JOIN public.chat_team_members ctm ON ctm.attendant_id = ap.id
      WHERE ctm.team_id = v_cat_team.team_id
        AND (NOT v_config.online_only OR ap.status = 'online')
        AND (v_config.allow_over_capacity OR COALESCE(ap.active_conversations, 0) < v_config.capacity_limit)
      ORDER BY COALESCE(ap.active_conversations, 0) ASC
      LIMIT 1;
    END IF;

    -- 5. Assign
    IF FOUND THEN
      NEW.attendant_id  := v_eligible.id;
      NEW.status        := 'active';
      NEW.assigned_at   := now();

      UPDATE public.attendant_profiles
      SET active_conversations = COALESCE(active_conversations, 0) + 1,
          updated_at = now()
      WHERE id = v_eligible.id;

      UPDATE public.chat_assignment_configs
      SET rr_last_attendant_id = v_eligible.id,
          updated_at = now()
      WHERE id = v_config.id;

      v_assigned := true;
      EXIT;
    END IF;

    -- 6. Fallback team
    IF NOT v_assigned
       AND v_config.fallback_mode = 'fallback_team'
       AND v_config.fallback_team_id IS NOT NULL
    THEN
      SELECT ap.id, ap.active_conversations, ap.skill_level, ap.user_id
      INTO v_eligible
      FROM public.attendant_profiles ap
      JOIN public.chat_team_members ctm ON ctm.attendant_id = ap.id
      WHERE ctm.team_id = v_config.fallback_team_id
        AND ap.status = 'online'
        AND COALESCE(ap.active_conversations, 0) < v_config.capacity_limit
      ORDER BY COALESCE(ap.active_conversations, 0) ASC
      LIMIT 1;

      IF FOUND THEN
        NEW.attendant_id := v_eligible.id;
        NEW.status       := 'active';
        NEW.assigned_at  := now();

        UPDATE public.attendant_profiles
        SET active_conversations = COALESCE(active_conversations, 0) + 1,
            updated_at = now()
        WHERE id = v_eligible.id;

        v_assigned := true;
        EXIT;
      END IF;
    END IF;

  END LOOP;

  RETURN NEW;
END;
$function$;

-- Bug 3: Adicionar coluna widget_company_name em chat_settings
ALTER TABLE public.chat_settings
  ADD COLUMN IF NOT EXISTS widget_company_name text DEFAULT '';

-- Melhoria 4: Trigger AFTER DELETE em chat_rooms para decrementar active_conversations
CREATE OR REPLACE FUNCTION public.decrement_on_room_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If the deleted room had an assigned attendant and was active, decrement their counter
  IF OLD.attendant_id IS NOT NULL AND OLD.status IN ('active', 'waiting') THEN
    UPDATE public.attendant_profiles
    SET active_conversations = GREATEST(0, COALESCE(active_conversations, 0) - 1),
        updated_at = now()
    WHERE id = OLD.attendant_id;
  END IF;
  RETURN OLD;
END;
$function$;

CREATE TRIGGER decrement_active_on_room_delete
AFTER DELETE ON public.chat_rooms
FOR EACH ROW EXECUTE FUNCTION public.decrement_on_room_delete();
