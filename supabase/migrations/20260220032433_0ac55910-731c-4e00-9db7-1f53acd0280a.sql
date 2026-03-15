
-- =====================================================
-- Auto Assignment Runtime: BEFORE INSERT trigger on chat_rooms
-- + AFTER UPDATE trigger to decrement active_conversations
-- =====================================================

-- Function: assign_chat_room (BEFORE INSERT trigger)
CREATE OR REPLACE FUNCTION public.assign_chat_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contact          RECORD;
  v_cat_team         RECORD;
  v_config           RECORD;
  v_eligible         RECORD;
  v_is_priority      boolean := false;
  v_assigned         boolean := false;
BEGIN
  -- Only process new 'waiting' rooms that have a contact_id
  IF NEW.status IS DISTINCT FROM 'waiting' THEN RETURN NEW; END IF;
  IF NEW.contact_id IS NULL THEN RETURN NEW; END IF;

  -- 1. Fetch contact for service category and priority
  SELECT service_category_id, service_priority
  INTO v_contact
  FROM public.contacts
  WHERE id = NEW.contact_id;

  IF NOT FOUND OR v_contact.service_category_id IS NULL THEN RETURN NEW; END IF;

  -- Normalize priority comparison (handle 'critica'/'crítica' variants)
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

    -- 4a. Round Robin: try attendants AFTER the last pointer first
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

      -- Wrap-around: if nothing found after pointer, restart from beginning
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

    -- 4b. Priority bypass: senior first (if advanced_prefer_senior), then least busy
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

    -- 4c. Least Busy (default for round_robin with no pointer, and explicit least_busy)
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

    -- 5. If we found an eligible attendant, assign now
    IF FOUND THEN
      NEW.attendant_id  := v_eligible.id;
      NEW.status        := 'active';
      NEW.assigned_at   := now();

      -- Increment active_conversations counter
      UPDATE public.attendant_profiles
      SET active_conversations = COALESCE(active_conversations, 0) + 1,
          updated_at = now()
      WHERE id = v_eligible.id;

      -- Advance Round Robin pointer
      UPDATE public.chat_assignment_configs
      SET rr_last_attendant_id = v_eligible.id,
          updated_at = now()
      WHERE id = v_config.id;

      v_assigned := true;
      EXIT; -- Stop after first successful assignment
    END IF;

    -- 6. Fallback: if no eligible in primary team and fallback_team configured
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
$$;

-- Trigger: BEFORE INSERT on chat_rooms
DROP TRIGGER IF EXISTS trg_assign_chat_room ON public.chat_rooms;
CREATE TRIGGER trg_assign_chat_room
  BEFORE INSERT ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_chat_room();

-- =====================================================
-- Decrement active_conversations when room is closed
-- =====================================================

CREATE OR REPLACE FUNCTION public.decrement_attendant_active_conversations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'closed'
     AND OLD.status IS DISTINCT FROM 'closed'
     AND OLD.attendant_id IS NOT NULL
  THEN
    UPDATE public.attendant_profiles
    SET active_conversations = GREATEST(0, COALESCE(active_conversations, 0) - 1),
        updated_at = now()
    WHERE id = OLD.attendant_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_attendant_on_close ON public.chat_rooms;
CREATE TRIGGER trg_decrement_attendant_on_close
  AFTER UPDATE ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_attendant_active_conversations();
