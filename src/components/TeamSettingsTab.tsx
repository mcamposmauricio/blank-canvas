import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck, Pencil, Copy, UserPlus, Mail, Phone, Building2, Loader2, Clock, Camera } from "lucide-react";
import UserPermissionsDialog from "@/components/UserPermissionsDialog";

const SPECIALTIES = ["implementacao", "onboarding", "acompanhamento", "churn"];

interface UserProfile {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  invite_status: string | null;
  invite_token: string | null;
  phone: string | null;
  department: string | null;
  specialty: string[] | null;
  tenant_id: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

const TeamSettingsTab = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { tenantId } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [permDialogOpen, setPermDialogOpen] = useState(false);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    specialty: [] as string[],
  });

  // Company counts per CSM
  const [companyCounts, setCompanyCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: profilesData }, { data: rolesData }] = await Promise.all([
      supabase.from("user_profiles").select("*").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    
    const loadedProfiles = (profilesData ?? []) as UserProfile[];
    setProfiles(loadedProfiles);
    setRoles((rolesData as UserRole[]) ?? []);

    // Load company counts for CSMs linked by user_id
    const userIds = loadedProfiles.filter(p => p.user_id).map(p => p.user_id!);
    if (userIds.length > 0) {
      const { data: csms } = await supabase
        .from("csms")
        .select("id, user_id")
        .in("user_id", userIds);

      if (csms && csms.length > 0) {
        const csmIds = csms.map(c => c.id);
        const { data: contacts } = await supabase
          .from("contacts")
          .select("csm_id")
          .eq("is_company", true)
          .in("csm_id", csmIds);

        const counts: Record<string, number> = {};
        // Map csm_id counts back to user_id
        const csmToUser = new Map(csms.map(c => [c.id, c.user_id]));
        contacts?.forEach(c => {
          if (c.csm_id) {
            const userId = csmToUser.get(c.csm_id);
            if (userId) {
              counts[userId] = (counts[userId] || 0) + 1;
            }
          }
        });
        setCompanyCounts(counts);
      }
    }

    setLoading(false);
  };

  const getUserRoles = (userId: string | null) => {
    if (!userId) return [];
    return roles.filter((r) => r.user_id === userId).map((r) => r.role);
  };

  const getRoleBadge = (profile: UserProfile) => {
    if (profile.invite_status === "pending") {
      return (
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {t("team.pending")}
        </Badge>
      );
    }
    const userRoles = getUserRoles(profile.user_id);
    if (userRoles.includes("admin")) {
      return <Badge variant="default"><ShieldCheck className="h-3 w-3 mr-1" />Admin</Badge>;
    }
    if (userRoles.includes("attendant")) {
      return <Badge variant="secondary">{t("team.role.attendant")}</Badge>;
    }
    return <Badge variant="outline">{t("team.role.user")}</Badge>;
  };

  const handleCopyInviteLink = (token: string) => {
    const link = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: t("team.linkCopied") });
  };

  const handleEditPermissions = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setPermDialogOpen(true);
  };

  const resetInviteForm = () => {
    setInviteForm({ name: "", email: "", phone: "", department: "", specialty: [] });
    setInviteOpen(false);
  };

  const toggleSpecialty = (spec: string) => {
    setInviteForm(prev => ({
      ...prev,
      specialty: prev.specialty.includes(spec)
        ? prev.specialty.filter(s => s !== spec)
        : [...prev.specialty, spec],
    }));
  };

  const handleInviteMember = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast({ title: t("team.inviteRequiredFields"), variant: "destructive" });
      return;
    }

    setInviteSaving(true);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .insert({
          email: inviteForm.email,
          display_name: inviteForm.name,
          phone: inviteForm.phone || null,
          department: inviteForm.department || null,
          specialty: inviteForm.specialty.length > 0 ? inviteForm.specialty : [],
          tenant_id: tenantId,
          invite_status: "pending",
          is_active: true,
        } as any)
        .select("invite_token")
        .single();

      if (error) throw error;

      // Copy invite link
      if (data?.invite_token) {
        const link = `${window.location.origin}/auth?invite=${data.invite_token}`;
        await navigator.clipboard.writeText(link);
        toast({
          title: t("team.inviteSuccess"),
          description: t("team.inviteLinkCopied"),
        });
      }

      resetInviteForm();
      loadData();
    } catch (err: any) {
      toast({ title: t("team.inviteError"), description: err.message, variant: "destructive" });
    } finally {
      setInviteSaving(false);
    }
  };

  const initials = (profile: UserProfile) => {
    if (profile.display_name) return profile.display_name.slice(0, 2).toUpperCase();
    return profile.email.slice(0, 2).toUpperCase();
  };

  const handleAvatarUpload = async (profile: UserProfile, file: File) => {
    const ext = file.name.split(".").pop();
    const userId = profile.user_id;
    if (!userId) return;
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: t("common.error"), description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from("user_profiles").update({ avatar_url: avatarUrl }).eq("user_id", userId);
    toast({ title: t("chat.settings.saved") });
    loadData();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("team.title")}</CardTitle>
              <CardDescription>{t("team.subtitle")}</CardDescription>
            </div>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t("team.inviteMember")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("team.noUsers")}
            </p>
          ) : (
            <div className="space-y-2">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative group">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={profile.avatar_url ?? undefined} />
                        <AvatarFallback>{initials(profile)}</AvatarFallback>
                      </Avatar>
                      {profile.user_id && (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                          <Camera className="h-4 w-4 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAvatarUpload(profile, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {profile.display_name || profile.email.split("@")[0]}
                        </span>
                        {getRoleBadge(profile)}
                        {!profile.is_active && (
                          <Badge variant="destructive" className="text-xs">
                            {t("team.inactive")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      {/* CS info row */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {profile.specialty && profile.specialty.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {profile.specialty.map(s => (
                              <Badge key={s} variant="secondary" className="text-xs py-0">
                                {t(`cs.status.${s}`)}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {profile.user_id && companyCounts[profile.user_id] && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {companyCounts[profile.user_id]} {t("cs.csms.companies")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {profile.invite_status === "pending" && profile.invite_token && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyInviteLink(profile.invite_token!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    {profile.user_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPermissions(profile)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        {t("team.editPermissions")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("team.inviteMember")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("team.memberName")} *</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) => setInviteForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t("cs.csms.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("auth.email")} *</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                placeholder={t("cs.csms.emailPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("cs.csms.phone")}</Label>
                <Input
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder={t("cs.csms.phonePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("cs.csms.department")}</Label>
                <Input
                  value={inviteForm.department}
                  onChange={(e) => setInviteForm(f => ({ ...f, department: e.target.value }))}
                  placeholder={t("cs.csms.departmentPlaceholder")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("cs.csms.specialties")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {SPECIALTIES.map((spec) => (
                  <div key={spec} className="flex items-center space-x-2">
                    <Checkbox
                      id={`invite-${spec}`}
                      checked={inviteForm.specialty.includes(spec)}
                      onCheckedChange={() => toggleSpecialty(spec)}
                    />
                    <label htmlFor={`invite-${spec}`} className="text-sm cursor-pointer">
                      {t(`cs.status.${spec}`)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetInviteForm}>
              {t("team.cancel")}
            </Button>
            <Button onClick={handleInviteMember} disabled={inviteSaving}>
              {inviteSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("team.sendInvite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserPermissionsDialog
        open={permDialogOpen}
        onOpenChange={setPermDialogOpen}
        profile={selectedProfile}
        onSaved={loadData}
      />
    </>
  );
};

export default TeamSettingsTab;
