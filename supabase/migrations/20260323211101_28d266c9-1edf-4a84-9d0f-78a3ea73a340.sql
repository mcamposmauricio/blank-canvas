
-- Fix RLS policies for chat_room_tags to allow tenant members (not just owner)
DROP POLICY IF EXISTS "Users can manage room tags" ON public.chat_room_tags;
DROP POLICY IF EXISTS "Users can view room tags" ON public.chat_room_tags;
DROP POLICY IF EXISTS "Users can insert room tags" ON public.chat_room_tags;
DROP POLICY IF EXISTS "Users can delete room tags" ON public.chat_room_tags;

-- Allow all tenant members to view tags for rooms in their tenant
CREATE POLICY "Tenant members can view room tags"
ON public.chat_room_tags FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr
    WHERE cr.id = chat_room_tags.room_id
    AND cr.tenant_id = public.get_user_tenant_id(auth.uid())
  )
);

-- Allow all tenant members to insert tags for rooms in their tenant
CREATE POLICY "Tenant members can insert room tags"
ON public.chat_room_tags FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr
    WHERE cr.id = chat_room_tags.room_id
    AND cr.tenant_id = public.get_user_tenant_id(auth.uid())
  )
);

-- Allow all tenant members to delete tags for rooms in their tenant
CREATE POLICY "Tenant members can delete room tags"
ON public.chat_room_tags FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr
    WHERE cr.id = chat_room_tags.room_id
    AND cr.tenant_id = public.get_user_tenant_id(auth.uid())
  )
);
