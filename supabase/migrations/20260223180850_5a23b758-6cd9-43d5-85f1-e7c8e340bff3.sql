
INSERT INTO user_roles (user_id, role)
SELECT up.user_id, 'admin'::app_role
FROM user_profiles up
WHERE up.invite_status = 'accepted'
  AND up.tenant_id IS NOT NULL
  AND up.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = up.user_id AND ur.role = 'admin'
  )
  AND NOT EXISTS (
    SELECT 1 FROM csms c WHERE c.user_id = up.user_id
  );
