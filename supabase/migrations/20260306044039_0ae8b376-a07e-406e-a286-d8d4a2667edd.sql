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
  v_override         RECORD;
  v_is_priority      boolean := false;
  v_assigned         boolean := false;
  v_outside_hours    boolean := false;
  v_now_dow          integer;
  v_now_time         time;
  v_now_date         date;
  v_bh_exists        boolean := false;
  v_tenant_id        uuid;
  v_category_id      uuid;
  v_in_break         boolean := false;
BEGIN
  IF NEW.status IS DISTINCT FROM 'waiting' THEN RETURN NEW; END IF;
  IF NEW.contact_id IS NULL THEN RETURN NEW; END IF;

  v_tenant_id := (SELECT tenant_id FROM public.user_profiles WHERE user_id = NEW.owner_user_id LIMIT 1);

  v_now_dow := EXTRACT(DOW FROM NOW() AT TIME ZONE 'America/Sao_Paulo')::integer;
  v_now_time := (NOW() AT TIME ZONE 'America/Sao_Paulo')::time;
  v_now_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

  SELECT * INTO v_override
  FROM public.chat_business_hour_overrides
  WHERE tenant_id = v_tenant_id AND override_date = v_now_date;

  IF FOUND THEN
    IF v_override.is_closed THEN
      v_outside_hours := true;
    ELSIF v_override.start_time IS NOT NULL AND v_override.end_time IS NOT NULL THEN
      IF v_now_time < v_override.start_time::time OR v_now_time > v_override.end_time::time THEN
        v_outside_hours := true;
      END IF;
    END IF;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM public.chat_business_hours
      WHERE tenant_id = v_tenant_id
    ) INTO v_bh_exists;

    IF v_bh_exists THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.chat_business_hours
        WHERE tenant_id = v_tenant_id
          AND day_of_week = v_now_dow
          AND is_active = true
          AND start_time::time <= v_now_time
          AND end_time::time >= v_now_time
      ) THEN
        v_outside_hours := true;
      END IF;

      IF NOT v_outside_hours THEN
        SELECT EXISTS(
          SELECT 1 FROM public.chat_business_hour_breaks b
          JOIN public.chat_business_hours bh ON bh.id = b.business_hour_id
          WHERE bh.tenant_id = v_tenant_id
            AND bh.day_of_week = v_now_dow
            AND bh.is_active = true
            AND b.start_time::time <= v_now_time
            AND b.end_time::time > v_now_time
        ) INTO v_in_break;

        IF v_in_break THEN
          v_outside_hours := true;
        END IF;
      END IF;
    END IF;
  END IF;

  SELECT service_category_id, service_priority
  INTO v_contact
  FROM public.contacts
  WHERE id = NEW.contact_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  v_category_id := v_contact.service_category_id;
  IF v_category_id IS NULL THEN
    SELECT id INTO v_category_id
    FROM public.chat_service_categories
    WHERE tenant_id = v_tenant_id AND is_default = true
    LIMIT 1;
    
    IF v_category_id IS NULL THEN RETURN NEW; END IF;
  END IF;

  v_is_priority := lower(coalesce(v_contact.service_priority, '')) IN ('alta', 'critica', 'crítica');

  FOR v_cat_team IN
    SELECT id, team_id
    FROM public.chat_category_teams
    WHERE category_id = v_category_id
    ORDER BY priority_order ASC NULLS LAST
  LOOP
    SELECT *
    INTO v_config
    FROM public.chat_assignment_configs
    WHERE category_team_id = v_cat_team.id;

    IF NOT FOUND OR NOT v_config.enabled THEN CONTINUE; END IF;

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

    IF FOUND THEN
      NEW.attendant_id  := v_eligible.id;
      NEW.assigned_at   := now();

      IF NOT v_outside_hours THEN
        NEW.status := 'active';
      END IF;

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
        NEW.assigned_at  := now();

        IF NOT v_outside_hours THEN
          NEW.status := 'active';
        END IF;

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