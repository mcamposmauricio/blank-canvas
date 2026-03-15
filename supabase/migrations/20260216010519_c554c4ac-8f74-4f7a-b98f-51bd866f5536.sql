
-- Trigger to sync attendant_profiles.display_name with user_profiles.display_name
CREATE OR REPLACE FUNCTION public.sync_attendant_display_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    UPDATE public.attendant_profiles
    SET display_name = NEW.display_name, updated_at = now()
    WHERE user_id = NEW.user_id
      AND NEW.display_name IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_attendant_name_on_profile_update
AFTER UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_attendant_display_name();

-- Also sync existing attendant display names now
UPDATE public.attendant_profiles ap
SET display_name = up.display_name
FROM public.user_profiles up
WHERE ap.user_id = up.user_id
  AND up.display_name IS NOT NULL
  AND ap.display_name IS DISTINCT FROM up.display_name;
