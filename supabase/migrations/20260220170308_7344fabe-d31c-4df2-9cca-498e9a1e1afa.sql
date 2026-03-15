
-- Política: Admins do tenant podem atualizar qualquer attendant_profile do seu tenant
CREATE POLICY "Tenant admins can update attendant profiles"
ON public.attendant_profiles
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);
