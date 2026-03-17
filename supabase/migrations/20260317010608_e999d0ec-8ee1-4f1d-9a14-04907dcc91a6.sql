
-- Robust dedup: keep only the row with MAX(id) per csm_id
DELETE FROM public.chat_team_members
WHERE attendant_id NOT IN (
  SELECT DISTINCT ON (csm_id) id
  FROM public.attendant_profiles
  ORDER BY csm_id, created_at DESC NULLS LAST, id DESC
);

DELETE FROM public.attendant_profiles
WHERE id NOT IN (
  SELECT DISTINCT ON (csm_id) id
  FROM public.attendant_profiles
  ORDER BY csm_id, created_at DESC NULLS LAST, id DESC
);

-- Now add unique constraint
ALTER TABLE public.attendant_profiles
  ADD CONSTRAINT attendant_profiles_csm_id_unique UNIQUE (csm_id);

-- Recreate the sync function to handle INSERT + UPDATE
CREATE OR REPLACE FUNCTION public.sync_csm_chat_enabled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_chat_enabled = true THEN
    INSERT INTO attendant_profiles (csm_id, user_id, display_name, tenant_id)
    VALUES (NEW.id, NEW.user_id, NEW.name, NEW.tenant_id)
    ON CONFLICT (csm_id) DO NOTHING;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.is_chat_enabled = false AND OLD.is_chat_enabled = true THEN
    DELETE FROM attendant_profiles WHERE csm_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-create trigger for INSERT OR UPDATE
DROP TRIGGER IF EXISTS sync_csm_chat_enabled_trigger ON public.csms;

CREATE TRIGGER sync_csm_chat_enabled_trigger
  AFTER INSERT OR UPDATE OF is_chat_enabled ON public.csms
  FOR EACH ROW
  EXECUTE FUNCTION sync_csm_chat_enabled();
