import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Loader2, ShieldCheck, ChevronDown, Copy, Users, BarChart3, MessageSquare,
  Headphones, Settings, BookOpen, UserCheck, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

const SPECIALTIES = ["implementacao", "onboarding", "acompanhamento", "churn"];

interface UserProfile {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  phone?: string | null;
  department?: string | null;
  specialty?: string[] | null;
}

interface Permission {
  module: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage: boolean;
}

type Action = "view" | "edit" | "delete" | "manage";
type Level = "none" | "view" | "edit" | "delete" | "manage";

interface PermNode {
  key: string;
  labelKey: string;
  actions: Action[];
  children?: PermNode[];
}

// ─── Group icons & colors ─────────────────────────────────────────────────────
const GROUP_META: Record<string, { icon: typeof BarChart3; color: string }> = {
  cs: { icon: BarChart3, color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950" },
  nps: { icon: Users, color: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950" },
  chat: { icon: MessageSquare, color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950" },
  contacts: { icon: UserCheck, color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950" },
  settings: { icon: Settings, color: "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-950" },
  help: { icon: BookOpen, color: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950" },
};

const PERMISSION_TREE: PermNode[] = [
  {
    key: "cs",
    labelKey: "team.module.cs",
    actions: ["view", "edit", "delete", "manage"],
    children: [
      { key: "cs.dashboard",          labelKey: "team.submodule.cs.dashboard",          actions: ["view"] },
      { key: "cs.kanban",             labelKey: "team.submodule.cs.kanban",              actions: ["view", "edit"] },
      { key: "cs.trails",             labelKey: "team.submodule.cs.trails",              actions: ["view", "edit", "delete"] },
      { key: "cs.csms",               labelKey: "team.submodule.cs.csms",                actions: ["view", "manage"] },
      { key: "cs.reports.health",     labelKey: "team.submodule.cs.reports.health",      actions: ["view"] },
      { key: "cs.reports.churn",      labelKey: "team.submodule.cs.reports.churn",       actions: ["view"] },
      { key: "cs.reports.financial",  labelKey: "team.submodule.cs.reports.financial",   actions: ["view"] },
    ],
  },
  {
    key: "nps",
    labelKey: "team.module.nps",
    actions: ["view", "edit", "delete", "manage"],
    children: [
      { key: "nps.dashboard",  labelKey: "team.submodule.nps.dashboard",  actions: ["view"] },
      { key: "nps.campaigns",  labelKey: "team.submodule.nps.campaigns",  actions: ["view", "edit", "delete"] },
      { key: "nps.settings",   labelKey: "team.submodule.nps.settings",   actions: ["view", "manage"] },
    ],
  },
  {
    key: "chat",
    labelKey: "team.module.chat",
    actions: ["view", "edit", "delete", "manage"],
    children: [
      { key: "chat.workspace",              labelKey: "team.submodule.chat.workspace",              actions: ["view"] },
      { key: "chat.history",                labelKey: "team.submodule.chat.history",                actions: ["view"] },
      { key: "chat.banners",                labelKey: "team.submodule.chat.banners",                actions: ["view", "edit", "delete", "manage"] },
      { key: "chat.broadcasts",             labelKey: "team.submodule.chat.broadcasts",             actions: ["view", "edit", "delete", "manage"] },
      { key: "chat.dashboard",              labelKey: "team.submodule.chat.dashboard",              actions: ["view"] },
      { key: "chat.csat",                   labelKey: "team.submodule.chat.csat",                   actions: ["view"] },
      { key: "chat.reports",                labelKey: "team.submodule.chat.reports",                actions: ["view"] },
      { key: "chat.settings.general",       labelKey: "team.submodule.chat.settings.general",       actions: ["view", "manage"] },
      { key: "chat.settings.widget",        labelKey: "team.submodule.chat.settings.widget",        actions: ["view", "manage"] },
      { key: "chat.settings.macros",        labelKey: "team.submodule.chat.settings.macros",        actions: ["view", "edit", "delete"] },
      { key: "chat.settings.attendants",    labelKey: "team.submodule.chat.settings.attendants",    actions: ["view", "manage"] },
      { key: "chat.settings.teams",         labelKey: "team.submodule.chat.settings.teams",         actions: ["view", "manage"] },
      { key: "chat.settings.categories",    labelKey: "team.submodule.chat.settings.categories",    actions: ["view", "manage"] },
      { key: "chat.settings.apikeys",       labelKey: "team.submodule.chat.settings.apikeys",       actions: ["view", "manage"] },
      { key: "chat.settings.custom_fields", labelKey: "team.submodule.chat.settings.custom_fields", actions: ["view", "manage"] },
      { key: "chat.settings.auto_rules",    labelKey: "team.submodule.chat.settings.auto_rules",    actions: ["view", "manage"] },
      { key: "chat.settings.business_hours",labelKey: "team.submodule.chat.settings.business_hours",actions: ["view", "manage"] },
      { key: "chat.settings.assignment",    labelKey: "team.submodule.chat.settings.assignment",    actions: ["view", "manage"] },
    ],
  },
  {
    key: "contacts",
    labelKey: "team.module.contacts",
    actions: ["view", "edit", "delete"],
    children: [
      { key: "contacts.companies", labelKey: "team.submodule.contacts.companies", actions: ["view", "edit", "delete"] },
      { key: "contacts.people",    labelKey: "team.submodule.contacts.people",    actions: ["view", "edit", "delete"] },
    ],
  },
  {
    key: "settings",
    labelKey: "team.module.settings",
    actions: ["view", "manage"],
    children: [
      { key: "settings.team",         labelKey: "team.submodule.settings.team",         actions: ["view", "manage"] },
      { key: "settings.organization", labelKey: "team.submodule.settings.organization", actions: ["view", "manage"] },
      { key: "settings.apikeys",      labelKey: "team.submodule.settings.apikeys",      actions: ["view", "manage"] },
    ],
  },
  {
    key: "help",
    labelKey: "team.module.help",
    actions: ["view", "edit", "delete", "manage"],
    children: [
      { key: "help.overview",     labelKey: "team.submodule.help.overview",     actions: ["view"] },
      { key: "help.articles",     labelKey: "team.submodule.help.articles",     actions: ["view", "edit", "delete", "manage"] },
      { key: "help.collections",  labelKey: "team.submodule.help.collections",  actions: ["view", "edit", "delete"] },
      { key: "help.settings",     labelKey: "team.submodule.help.settings",     actions: ["view", "manage"] },
      { key: "help.analytics",    labelKey: "team.submodule.help.analytics",    actions: ["view"] },
      { key: "help.import",       labelKey: "team.submodule.help.import",       actions: ["manage"] },
    ],
  },
];

// All unique module keys
const ALL_MODULE_KEYS: string[] = [];
PERMISSION_TREE.forEach((g) => {
  ALL_MODULE_KEYS.push(g.key);
  g.children?.forEach((c) => ALL_MODULE_KEYS.push(c.key));
});

// ─── Level helpers ────────────────────────────────────────────────────────────
const LEVEL_HIERARCHY: Level[] = ["none", "view", "edit", "delete", "manage"];

function getLevel(perm: Permission): Level {
  if (perm.can_manage) return "manage";
  if (perm.can_delete) return "delete";
  if (perm.can_edit) return "edit";
  if (perm.can_view) return "view";
  return "none";
}

function levelToPerms(level: Level): Omit<Permission, "module"> {
  return {
    can_view: ["view", "edit", "delete", "manage"].includes(level),
    can_edit: ["edit", "delete", "manage"].includes(level),
    can_delete: ["delete", "manage"].includes(level),
    can_manage: level === "manage",
  };
}

function availableLevels(actions: Action[]): Level[] {
  const levels: Level[] = ["none"];
  if (actions.includes("view")) levels.push("view");
  if (actions.includes("edit")) levels.push("edit");
  if (actions.includes("delete")) levels.push("delete");
  if (actions.includes("manage")) levels.push("manage");
  return levels;
}

// ─── Preset Profiles ──────────────────────────────────────────────────────────
type PermMap = Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean; can_manage: boolean }>;

function allTrue(): PermMap {
  const m: PermMap = {};
  ALL_MODULE_KEYS.forEach((k) => { m[k] = { can_view: true, can_edit: true, can_delete: true, can_manage: true }; });
  return m;
}

function allView(): PermMap {
  const m: PermMap = {};
  ALL_MODULE_KEYS.forEach((k) => { m[k] = { can_view: true, can_edit: false, can_delete: false, can_manage: false }; });
  return m;
}

function buildProfile(keys: string[], actions: Partial<Record<string, Action[]>>): PermMap {
  const m: PermMap = {};
  ALL_MODULE_KEYS.forEach((k) => { m[k] = { can_view: false, can_edit: false, can_delete: false, can_manage: false }; });
  keys.forEach((k) => {
    const a = actions[k] || ["view"];
    m[k] = {
      can_view: a.includes("view"),
      can_edit: a.includes("edit"),
      can_delete: a.includes("delete"),
      can_manage: a.includes("manage"),
    };
  });
  return m;
}

interface PresetProfile {
  id: string;
  labelKey: string;
  isAdmin: boolean;
  perms: PermMap;
}

const PRESET_PROFILES: PresetProfile[] = [
  { id: "admin", labelKey: "team.profile.admin", isAdmin: true, perms: allTrue() },
  {
    id: "cs_manager", labelKey: "team.profile.csManager", isAdmin: false,
    perms: buildProfile(
      ["cs", "cs.dashboard", "cs.kanban", "cs.trails", "cs.csms", "cs.reports.health", "cs.reports.churn", "cs.reports.financial",
       "nps", "nps.dashboard", "nps.campaigns", "nps.settings",
       "contacts", "contacts.companies", "contacts.people"],
      {
        cs: ["view", "edit", "delete", "manage"],
        "cs.dashboard": ["view"], "cs.kanban": ["view", "edit"], "cs.trails": ["view", "edit", "delete"],
        "cs.csms": ["view", "manage"],
        "cs.reports.health": ["view"], "cs.reports.churn": ["view"], "cs.reports.financial": ["view"],
        nps: ["view", "edit", "manage"], "nps.dashboard": ["view"], "nps.campaigns": ["view", "edit"], "nps.settings": ["view", "manage"],
        contacts: ["view", "edit"], "contacts.companies": ["view", "edit"], "contacts.people": ["view", "edit"],
      }
    ),
  },
  {
    id: "chat_attendant", labelKey: "team.profile.chatAttendant", isAdmin: false,
    perms: buildProfile(
      ["chat", "chat.workspace", "chat.history", "chat.settings.macros", "chat.banners", "chat.dashboard"],
      {
        chat: ["view"], "chat.workspace": ["view"], "chat.history": ["view"],
        "chat.settings.macros": ["view", "edit"],
        "chat.banners": ["view"], "chat.dashboard": ["view"],
      }
    ),
  },
  {
    id: "nps_analyst", labelKey: "team.profile.npsAnalyst", isAdmin: false,
    perms: buildProfile(
      ["nps", "nps.dashboard", "nps.campaigns"],
      { nps: ["view", "edit"], "nps.dashboard": ["view"], "nps.campaigns": ["view", "edit"] }
    ),
  },
  { id: "viewer", labelKey: "team.profile.viewer", isAdmin: false, perms: allView() },
  {
    id: "custom", labelKey: "team.profile.custom", isAdmin: false,
    perms: {} as PermMap,
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
  onSaved: () => void;
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────
export default function UserPermissionsDialog({ open, onOpenChange, profile, onSaved }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isAdminToggle, setIsAdminToggle] = useState(false);
  const [permissions, setPermissions] = useState<Map<string, Permission>>(new Map());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState("custom");
  const [csOpen, setCsOpen] = useState(false);

  // CS fields
  const [csPhone, setCsPhone] = useState("");
  const [csDepartment, setCsDepartment] = useState("");
  const [csSpecialty, setCsSpecialty] = useState<string[]>([]);

  // Copy from user
  const [tenantUsers, setTenantUsers] = useState<UserProfile[]>([]);
  const [copyPopoverOpen, setCopyPopoverOpen] = useState(false);

  useEffect(() => {
    if (open && profile) loadData();
  }, [open, profile]);

  const loadData = async () => {
    if (!profile || !profile.user_id) return;
    setLoading(true);
    setSelectedProfile("custom");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.user_id);
    setIsAdminToggle(roles?.some((r) => r.role === "admin") ?? false);

    const { data: perms } = await supabase
      .from("user_permissions")
      .select("module, can_view, can_edit, can_delete, can_manage")
      .eq("user_id", profile.user_id);

    const permMap = new Map<string, Permission>();
    ALL_MODULE_KEYS.forEach((key) => {
      permMap.set(key, { module: key, can_view: false, can_edit: false, can_delete: false, can_manage: false });
    });
    (perms ?? []).forEach((p) => {
      permMap.set(p.module, {
        module: p.module,
        can_view: p.can_view ?? false,
        can_edit: p.can_edit ?? false,
        can_delete: p.can_delete ?? false,
        can_manage: p.can_manage ?? false,
      });
    });
    setPermissions(permMap);

    setCsPhone(profile.phone || "");
    setCsDepartment(profile.department || "");
    setCsSpecialty(profile.specialty || []);

    // Load tenant users for "copy from"
    const { data: users } = await supabase
      .from("user_profiles")
      .select("id, user_id, email, display_name, avatar_url, is_active")
      .neq("user_id", profile.user_id);
    setTenantUsers((users ?? []) as UserProfile[]);

    setLoading(false);
  };

  const applyPreset = (profileId: string) => {
    setSelectedProfile(profileId);
    const preset = PRESET_PROFILES.find((p) => p.id === profileId);
    if (!preset || profileId === "custom") return;

    setIsAdminToggle(preset.isAdmin);
    const permMap = new Map<string, Permission>();
    ALL_MODULE_KEYS.forEach((key) => {
      const p = preset.perms[key] || { can_view: false, can_edit: false, can_delete: false, can_manage: false };
      permMap.set(key, { module: key, ...p });
    });
    setPermissions(permMap);
  };

  const copyFromUser = async (userId: string) => {
    setCopyPopoverOpen(false);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setIsAdminToggle(roles?.some((r) => r.role === "admin") ?? false);

    const { data: perms } = await supabase
      .from("user_permissions")
      .select("module, can_view, can_edit, can_delete, can_manage")
      .eq("user_id", userId);

    const permMap = new Map<string, Permission>();
    ALL_MODULE_KEYS.forEach((key) => {
      permMap.set(key, { module: key, can_view: false, can_edit: false, can_delete: false, can_manage: false });
    });
    (perms ?? []).forEach((p) => {
      permMap.set(p.module, {
        module: p.module,
        can_view: p.can_view ?? false,
        can_edit: p.can_edit ?? false,
        can_delete: p.can_delete ?? false,
        can_manage: p.can_manage ?? false,
      });
    });
    setPermissions(permMap);
    setSelectedProfile("custom");
    toast({ title: t("team.permsCopied") });
  };

  const setModuleLevel = (moduleKey: string, level: Level) => {
    setSelectedProfile("custom");
    setPermissions((prev) => {
      const next = new Map(prev);
      const permsData = levelToPerms(level);
      next.set(moduleKey, { module: moduleKey, ...permsData });

      // If setting a parent to "none", also set all children to "none"
      const parentNode = PERMISSION_TREE.find((g) => g.key === moduleKey);
      if (parentNode && level === "none") {
        (parentNode.children ?? []).forEach((child) => {
          next.set(child.key, { module: child.key, can_view: false, can_edit: false, can_delete: false, can_manage: false });
        });
      }

      return next;
    });
  };

  const toggleCsSpecialty = (spec: string) => {
    setCsSpecialty((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleSave = async () => {
    if (!profile || !profile.user_id) return;
    setSaving(true);

    try {
      const { data: currentRoles } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", profile.user_id)
        .eq("role", "admin");

      const hasAdmin = (currentRoles?.length ?? 0) > 0;
      if (isAdminToggle && !hasAdmin) {
        await supabase.from("user_roles").insert({ user_id: profile.user_id, role: "admin" as const });
      } else if (!isAdminToggle && hasAdmin) {
        await supabase.from("user_roles").delete().eq("user_id", profile.user_id).eq("role", "admin");
      }

      const permsArray = Array.from(permissions.values());
      for (const perm of permsArray) {
        await supabase.from("user_permissions").upsert(
          {
            user_id: profile.user_id,
            module: perm.module,
            can_view: perm.can_view,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
            can_manage: perm.can_manage,
          },
          { onConflict: "user_id,module" }
        );
      }

      await supabase
        .from("user_profiles")
        .update({ phone: csPhone || null, department: csDepartment || null, specialty: csSpecialty } as any)
        .eq("id", profile.id);

      const { data: existingCsm } = await supabase
        .from("csms")
        .select("id")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (existingCsm) {
        await supabase.from("csms").update({
          phone: csPhone || null,
          department: csDepartment || null,
          specialty: csSpecialty,
          name: profile.display_name || profile.email.split("@")[0],
          email: profile.email,
        }).eq("id", existingCsm.id);
      } else {
        await supabase.from("csms").insert({
          user_id: profile.user_id,
          name: profile.display_name || profile.email.split("@")[0],
          email: profile.email,
          phone: csPhone || null,
          department: csDepartment || null,
          specialty: csSpecialty,
        });
      }

      toast({ title: t("team.saveSuccess") });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: t("team.saveError"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : profile?.email?.slice(0, 2).toUpperCase() ?? "?";

  const activeProfile = PRESET_PROFILES.find((p) => p.id === selectedProfile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogHeader className="mb-0">
            <DialogTitle className="sr-only">{t("team.editPermissions")}</DialogTitle>
            <DialogDescription className="sr-only">{t("team.editPermissionsDesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 ring-2 ring-primary/10">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate">{profile?.display_name || profile?.email}</p>
              <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Action bar: Admin + Profile + Copy */}
            <div className="px-6 py-3 bg-muted/30 border-b border-border shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                {/* Admin toggle */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <Label htmlFor="admin-toggle" className="text-sm font-medium cursor-pointer">{t("team.administrator")}</Label>
                  <Switch
                    id="admin-toggle"
                    checked={isAdminToggle}
                    onCheckedChange={(v) => { setIsAdminToggle(v); setSelectedProfile(v ? "admin" : "custom"); }}
                    className="scale-90"
                  />
                </div>

                {/* Profile selector */}
                <Select value={selectedProfile} onValueChange={applyPreset}>
                  <SelectTrigger className="h-9 w-[200px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_PROFILES.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {t(p.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Copy from user */}
                <Popover open={copyPopoverOpen} onOpenChange={setCopyPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 text-sm">
                      <Copy className="h-3.5 w-3.5" />
                      {t("team.copyFromUser")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="start">
                    <p className="text-xs font-medium text-muted-foreground mb-2 px-2">{t("team.selectUserToCopy")}</p>
                    <ScrollArea className="max-h-48">
                      <div className="space-y-0.5">
                        {tenantUsers.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => u.user_id && copyFromUser(u.user_id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm hover:bg-accent transition-colors"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] bg-muted">
                                {(u.display_name || u.email).slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm">{u.display_name || u.email}</p>
                            </div>
                          </button>
                        ))}
                        {tenantUsers.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3">{t("team.noOtherUsers")}</p>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {/* Active profile badge */}
                {selectedProfile !== "custom" && activeProfile && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {selectedProfile === "admin" && <ShieldCheck className="h-3 w-3" />}
                    {selectedProfile === "viewer" && <Eye className="h-3 w-3" />}
                    {t(activeProfile.labelKey)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="px-6 py-4 space-y-4">

                {/* CS Info - collapsible */}
                <Collapsible open={csOpen} onOpenChange={setCsOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", csOpen && "rotate-180")} />
                    {t("team.csInfo")}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("cs.csms.phone")}</Label>
                        <Input value={csPhone} onChange={(e) => setCsPhone(e.target.value)} placeholder={t("cs.csms.phonePlaceholder")} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("cs.csms.department")}</Label>
                        <Input value={csDepartment} onChange={(e) => setCsDepartment(e.target.value)} placeholder={t("cs.csms.departmentPlaceholder")} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t("cs.csms.specialties")}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {SPECIALTIES.map((spec) => (
                          <div key={spec} className="flex items-center space-x-2">
                            <Checkbox id={`cs-${spec}`} checked={csSpecialty.includes(spec)} onCheckedChange={() => toggleCsSpecialty(spec)} />
                            <label htmlFor={`cs-${spec}`} className="text-xs cursor-pointer">{t(`cs.status.${spec}`)}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </CollapsibleContent>
                </Collapsible>

                {/* Permissions Table */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">{t("team.modulePermissions")}</p>
                    <p className="text-xs text-muted-foreground">{t("team.permLevel")}</p>
                  </div>

                  {/* Permission groups */}
                  <div className="space-y-2">
                    {PERMISSION_TREE.map((group) => {
                      const parentPerm = permissions.get(group.key) ?? { module: group.key, can_view: false, can_edit: false, can_delete: false, can_manage: false };
                      const parentLevel = isAdminToggle ? "manage" : getLevel(parentPerm);
                      const parentDisabled = parentLevel === "none";
                      const meta = GROUP_META[group.key];
                      const Icon = meta?.icon ?? Settings;
                      const parentLevels = availableLevels(group.actions);

                      return (
                        <div key={group.key} className="rounded-lg border border-border overflow-hidden">
                          {/* Group header row */}
                          <div className={cn("flex items-center gap-2 px-3 py-2", meta?.color || "bg-muted")}>
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-sm font-semibold flex-1">{t(group.labelKey)}</span>
                            <Select
                              value={isAdminToggle ? "manage" : parentLevel}
                              onValueChange={(val) => setModuleLevel(group.key, val as Level)}
                              disabled={isAdminToggle}
                            >
                              <SelectTrigger className="h-7 w-[140px] text-xs bg-background/80 border-border/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {parentLevels.map((lvl) => (
                                  <SelectItem key={lvl} value={lvl} className="text-xs">
                                    {t(`team.level.${lvl}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Children rows */}
                          <div className="divide-y divide-border/50">
                            {(group.children ?? []).map((child) => {
                              const childPerm = permissions.get(child.key) ?? { module: child.key, can_view: false, can_edit: false, can_delete: false, can_manage: false };
                              const childLevel = isAdminToggle ? "manage" : getLevel(childPerm);
                              const childDisabled = isAdminToggle || parentDisabled;
                              const childLevels = availableLevels(child.actions);

                              return (
                                <div
                                  key={child.key}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 transition-colors",
                                    childDisabled && !isAdminToggle ? "opacity-40" : "hover:bg-muted/30"
                                  )}
                                >
                                  <span className={cn(
                                    "text-sm flex-1 pl-6",
                                    childDisabled && !isAdminToggle ? "text-muted-foreground/50" : "text-muted-foreground"
                                  )}>
                                    {t(child.labelKey)}
                                  </span>
                                  <Select
                                    value={childDisabled && !isAdminToggle ? "none" : (isAdminToggle ? "manage" : childLevel)}
                                    onValueChange={(val) => setModuleLevel(child.key, val as Level)}
                                    disabled={childDisabled}
                                  >
                                    <SelectTrigger className={cn(
                                      "h-7 w-[140px] text-xs",
                                      childDisabled && !isAdminToggle && "bg-muted/50"
                                    )}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {childLevels.map((lvl) => (
                                        <SelectItem key={lvl} value={lvl} className="text-xs">
                                          {t(`team.level.${lvl}`)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border flex justify-end gap-2 bg-background shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("team.cancel")}</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("team.save")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
