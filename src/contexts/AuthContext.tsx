import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserPermission {
  module: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage: boolean;
}

interface TenantOption {
  tenantId: string;
  tenantName: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isMaster: boolean;
  isChatEnabled: boolean;
  loading: boolean;
  userDataLoading: boolean;
  tenantId: string | null;
  permissions: UserPermission[];
  hasPermission: (module: string, action: 'view' | 'edit' | 'delete' | 'manage') => boolean;
  // Multi-tenant
  availableTenants: TenantOption[];
  selectTenant: (tenantId: string) => void;
  needsTenantSelection: boolean;
  // Impersonation (ghost mode)
  isImpersonating: boolean;
  impersonatedTenantName: string | null;
  setImpersonation: (tenantId: string, tenantName: string) => void;
  clearImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);

  // Multi-tenant state
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(
    () => localStorage.getItem("selected-tenant-id")
  );

  // Impersonation state
  const [impersonatedTenantId, setImpersonatedTenantId] = useState<string | null>(null);
  const [impersonatedTenantName, setImpersonatedTenantName] = useState<string | null>(null);
  const isImpersonating = !!impersonatedTenantId;

  const setImpersonation = useCallback((tid: string, tname: string) => {
    setImpersonatedTenantId(tid);
    setImpersonatedTenantName(tname);
  }, []);

  const clearImpersonation = useCallback(() => {
    setImpersonatedTenantId(null);
    setImpersonatedTenantName(null);
  }, []);

  const selectTenant = useCallback((tid: string) => {
    setSelectedTenantId(tid);
    localStorage.setItem("selected-tenant-id", tid);
    setTenantId(tid);
  }, []);

  // Effective tenantId: impersonated overrides selected overrides real
  const effectiveTenantId = impersonatedTenantId ?? tenantId;

  // Whether user needs to pick a tenant
  const needsTenantSelection = availableTenants.length > 1 && !tenantId && !isImpersonating && !isMaster;

  const hasPermission = useCallback(
    (module: string, action: 'view' | 'edit' | 'delete' | 'manage'): boolean => {
      if (isAdmin) return true;

      const checkPerm = (perm: UserPermission): boolean => {
        if (perm.can_manage) return true;
        switch (action) {
          case 'view': return perm.can_view;
          case 'edit': return perm.can_edit;
          case 'delete': return perm.can_delete;
          case 'manage': return perm.can_manage;
          default: return false;
        }
      };

      const exactPerm = permissions.find((p) => p.module === module);
      if (exactPerm) return checkPerm(exactPerm);

      const parts = module.split('.');
      for (let i = parts.length - 1; i > 0; i--) {
        const parentKey = parts.slice(0, i).join('.');
        const parentPerm = permissions.find((p) => p.module === parentKey);
        if (parentPerm) return checkPerm(parentPerm);
      }

      return false;
    },
    [isAdmin, permissions]
  );

  const loadUserData = useCallback(async (currentUser: User) => {
    setUserDataLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id);

    const masterStatus = roles?.some((r) => r.role === "master") ?? false;
    const adminStatus = masterStatus || (roles?.some((r) => r.role === "admin") ?? false);
    setIsMaster(masterStatus);
    setIsAdmin(adminStatus);

    const { data: csm } = await supabase
      .from("csms")
      .select("is_chat_enabled")
      .eq("user_id", currentUser.id)
      .eq("is_chat_enabled", true)
      .maybeSingle();

    setIsChatEnabled(!!csm);

    if (!adminStatus) {
      const { data: perms } = await supabase
        .from("user_permissions")
        .select("module, can_view, can_edit, can_delete, can_manage")
        .eq("user_id", currentUser.id);
      setPermissions((perms as UserPermission[]) ?? []);
    } else {
      setPermissions([]);
    }

    // Fetch ALL accepted profiles for this user (multi-tenant support)
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("tenant_id")
      .eq("user_id", currentUser.id)
      .eq("invite_status", "accepted");

    const userTenantIds = (profiles || [])
      .map(p => p.tenant_id)
      .filter((tid): tid is string => !!tid);

    if (userTenantIds.length === 0) {
      setTenantId(null);
      setAvailableTenants([]);
    } else if (userTenantIds.length === 1) {
      setTenantId(userTenantIds[0]);
      setAvailableTenants([]);
    } else {
      // Multiple tenants — fetch names
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, name")
        .in("id", userTenantIds);

      const options: TenantOption[] = (tenantData || []).map(t => ({
        tenantId: t.id,
        tenantName: t.name,
      }));
      setAvailableTenants(options);

      // Use previously selected tenant if still valid, otherwise leave null for selection screen
      const savedTid = localStorage.getItem("selected-tenant-id");
      if (savedTid && userTenantIds.includes(savedTid)) {
        setTenantId(savedTid);
      } else if (userTenantIds.length > 0) {
        // Default to first tenant
        setTenantId(userTenantIds[0]);
        localStorage.setItem("selected-tenant-id", userTenantIds[0]);
      }
    }

    // Only update last_sign_in_at if profile already exists (no upsert — prevents orphan profile creation)
    if (profiles && profiles.length > 0) {
      await supabase.from("user_profiles")
        .update({ last_sign_in_at: new Date().toISOString() })
        .eq("user_id", currentUser.id);
    }
    setUserDataLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        currentUserIdRef.current = currentUser.id;
        await loadUserData(currentUser);
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;

      if (currentUser) {
        // Same user — token refresh or tab focus: skip full reload
        if (currentUser.id === currentUserIdRef.current) {
          setUser(currentUser);
          return;
        }
        // Different user (new login / account switch)
        currentUserIdRef.current = currentUser.id;
        setUser(currentUser);
        setUserDataLoading(true);
        setTimeout(() => loadUserData(currentUser), 0);
      } else {
        // Logout
        currentUserIdRef.current = null;
        setUser(null);
        setIsAdmin(false);
        setIsMaster(false);
        setIsChatEnabled(false);
        setPermissions([]);
        setTenantId(null);
        setAvailableTenants([]);
        setUserDataLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  return (
    <AuthContext.Provider value={{
      user, isAdmin, isMaster,
      isChatEnabled: isImpersonating ? true : isChatEnabled,
      loading, userDataLoading,
      tenantId: effectiveTenantId,
      permissions, hasPermission,
      availableTenants, selectTenant, needsTenantSelection,
      isImpersonating, impersonatedTenantName,
      setImpersonation, clearImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
