import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Headphones, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CSMWithChat {
  id: string;
  name: string;
  email: string;
  is_chat_enabled: boolean | null;
  chat_max_conversations: number | null;
}

interface Team {
  id: string;
  name: string;
}

interface TeamMember {
  team_id: string;
  attendant_id: string;
}

interface AttendantProfile {
  id: string;
  csm_id: string;
  status: string | null;
  skill_level: string | null;
  max_conversations: number | null;
  active_conversations: number | null;
}

const STATUS_OPTIONS = [
  { value: "online", label: "Online", color: "bg-green-500" },
  { value: "busy", label: "Ocupado", color: "bg-amber-400" },
  { value: "offline", label: "Offline", color: "bg-muted-foreground/40" },
];

const SKILL_OPTIONS = [
  { value: "junior", label: "Junior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
];

const AttendantsTab = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [csms, setCsms] = useState<CSMWithChat[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [attendantProfiles, setAttendantProfiles] = useState<AttendantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAttendant, setSavingAttendant] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: csmsData }, { data: teamsData }, { data: membersData }, { data: profilesData }] = await Promise.all([
      supabase.from("csms").select("id, name, email, is_chat_enabled, chat_max_conversations").order("name"),
      supabase.from("chat_teams").select("id, name").order("name"),
      supabase.from("chat_team_members").select("team_id, attendant_id"),
      supabase.from("attendant_profiles").select("id, csm_id, status, skill_level, max_conversations, active_conversations"),
    ]);
    setCsms((csmsData as CSMWithChat[]) ?? []);
    setTeams(teamsData ?? []);
    setTeamMembers((membersData as TeamMember[]) ?? []);
    setAttendantProfiles((profilesData as AttendantProfile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleChatEnabled = async (csmId: string, enabled: boolean) => {
    const { error } = await supabase.from("csms").update({ is_chat_enabled: enabled }).eq("id", csmId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: enabled ? t("chat.attendants.enabled") : t("chat.attendants.disabled") });

      if (enabled) {
        // Wait for trigger to create attendant_profile, then auto-assign to default team
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: freshProfiles } = await supabase
          .from("attendant_profiles")
          .select("id")
          .eq("csm_id", csmId);
        const attProfile = freshProfiles?.[0];
        if (attProfile) {
          // Check if already in any team
          const { data: existingMemberships } = await supabase
            .from("chat_team_members")
            .select("id")
            .eq("attendant_id", attProfile.id);
          if (!existingMemberships || existingMemberships.length === 0) {
            // Find default team
            const { data: defaultTeam } = await supabase
              .from("chat_teams")
              .select("id, tenant_id")
              .eq("is_default", true)
              .limit(1)
              .maybeSingle();
            if (defaultTeam) {
              await supabase.from("chat_team_members").insert({
                team_id: defaultTeam.id,
                attendant_id: attProfile.id,
                tenant_id: defaultTeam.tenant_id,
              });
            }
          }
        }
      }

      fetchAll();
    }
  };

  const getAttendantProfile = (csmId: string) => attendantProfiles.find(p => p.csm_id === csmId);
  const getAttendantId = (csmId: string) => getAttendantProfile(csmId)?.id;

  const updateAttendantProfile = async (csmId: string, updates: Partial<AttendantProfile>) => {
    const attId = getAttendantId(csmId);
    if (!attId) return;
    setSavingAttendant(csmId);
    const { data: updated, error } = await supabase
      .from("attendant_profiles")
      .update(updates)
      .eq("id", attId)
      .select("id");
    if (error || !updated || updated.length === 0) {
      toast({
        title: "Erro",
        description: error?.message ?? "Sem permissão para atualizar este perfil",
        variant: "destructive",
      });
    } else {
      setAttendantProfiles(prev => prev.map(p => p.id === attId ? { ...p, ...updates } : p));
    }
    setSavingAttendant(null);
  };

  const getCsmTeams = (csmId: string) => {
    const attId = getAttendantId(csmId);
    if (!attId) return [];
    return teamMembers.filter(m => m.attendant_id === attId).map(m => teams.find(t => t.id === m.team_id)).filter(Boolean) as Team[];
  };

  const addToTeam = async (csmId: string, teamId: string) => {
    const attId = getAttendantId(csmId);
    if (!attId) return;
    const { data: teamData } = await supabase.from("chat_teams").select("tenant_id").eq("id", teamId).single();
    await supabase.from("chat_team_members").insert({
      team_id: teamId,
      attendant_id: attId,
      tenant_id: teamData?.tenant_id,
    });
    fetchAll();
  };

  const removeFromTeam = async (csmId: string, teamId: string) => {
    const attId = getAttendantId(csmId);
    if (!attId) return;
    await supabase.from("chat_team_members").delete().eq("team_id", teamId).eq("attendant_id", attId);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (csms.length === 0) {
    return (
      <div className="rounded-lg border bg-card shadow-sm p-8 text-center text-muted-foreground">
        <Headphones className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>{t("chat.attendants.no_csms")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {csms.map((csm) => {
        const profile = getAttendantProfile(csm.id);
        const csmTeams = getCsmTeams(csm.id);
        const availableTeams = teams.filter(t => !csmTeams.some(ct => ct.id === t.id));
        const currentStatus = profile?.status ?? "offline";
        const statusConfig = STATUS_OPTIONS.find(s => s.value === currentStatus) ?? STATUS_OPTIONS[2];
        const isSaving = savingAttendant === csm.id;

        return (
          <Card key={csm.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {csm.is_chat_enabled && profile && (
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusConfig.color)} />
                  )}
                  <CardTitle className="text-base">{csm.name}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  {csm.is_chat_enabled && (
                    <Badge variant="secondary" className="text-xs">{t("chat.attendants.active")}</Badge>
                  )}
                  <Switch checked={csm.is_chat_enabled ?? false} onCheckedChange={(v) => toggleChatEnabled(csm.id, v)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{csm.email}</p>
              {csm.is_chat_enabled && profile && (
                <>
                  {/* Status + Skill + Capacity row */}
                  <div className="mt-3 flex flex-wrap gap-3 items-center">
                    {/* Status selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <select
                        className="text-xs border rounded px-1.5 py-0.5 bg-background"
                        value={currentStatus}
                        disabled={isSaving}
                        onChange={(e) => updateAttendantProfile(csm.id, { status: e.target.value })}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Skill Level */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Nível:</span>
                      <select
                        className="text-xs border rounded px-1.5 py-0.5 bg-background"
                        value={profile.skill_level ?? "junior"}
                        disabled={isSaving}
                        onChange={(e) => updateAttendantProfile(csm.id, { skill_level: e.target.value })}
                      >
                        {SKILL_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Max conversations */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Cap.:</span>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        className="h-6 w-14 text-xs px-1.5 py-0"
                        value={profile.max_conversations ?? 5}
                        disabled={isSaving}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            updateAttendantProfile(csm.id, { max_conversations: val });
                          }
                        }}
                      />
                    </div>

                    {/* Active conversations (read-only) */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-xs text-muted-foreground">Ativas:</span>
                      <Badge variant="outline" className="text-xs h-5 px-1.5">
                        {profile.active_conversations ?? 0}
                      </Badge>
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-1.5">{t("chat.teams.title")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {csmTeams.map(team => (
                        <Badge key={team.id} variant="outline" className="text-xs gap-1">
                          {team.name}
                          <button onClick={() => removeFromTeam(csm.id, team.id)} className="ml-0.5 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {availableTeams.length > 0 && (
                        <select
                          className="text-xs border rounded px-1.5 py-0.5 bg-background"
                          value=""
                          onChange={(e) => { if (e.target.value) addToTeam(csm.id, e.target.value); }}
                        >
                          <option value="">+ {t("chat.teams.addMember")}</option>
                          {availableTeams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AttendantsTab;
