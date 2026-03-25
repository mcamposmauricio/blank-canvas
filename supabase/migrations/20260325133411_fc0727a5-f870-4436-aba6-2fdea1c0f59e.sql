
-- Remove conflicting triggers
DROP TRIGGER IF EXISTS decrement_on_room_close ON public.chat_rooms;
DROP TRIGGER IF EXISTS decrement_on_room_delete ON public.chat_rooms;
DROP TRIGGER IF EXISTS resync_attendant_on_room_change ON public.chat_rooms;

-- Recreate with full scope (INSERT + DELETE + UPDATE of attendant_id and status)
CREATE TRIGGER resync_attendant_on_room_change
AFTER INSERT OR DELETE OR UPDATE OF attendant_id, status
ON public.chat_rooms
FOR EACH ROW
EXECUTE FUNCTION resync_attendant_counter_on_room_change();
