
-- Part 2: Fix cross-tenant visibility on user_profiles

-- SELECT: split into tenant-scoped admin + self
DROP POLICY IF EXISTS "Admins or self can view profiles" ON user_profiles;

CREATE POLICY "Admins can view tenant profiles"
  ON user_profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: scope admin to own tenant
DROP POLICY IF EXISTS "Admins can insert any profile" ON user_profiles;

CREATE POLICY "Admins can insert tenant profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

-- UPDATE: scope admin to own tenant
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;

CREATE POLICY "Admins can update tenant profiles"
  ON user_profiles FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id = get_user_tenant_id(auth.uid())
  );
