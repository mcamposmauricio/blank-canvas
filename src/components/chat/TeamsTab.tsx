import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Users, Shield } from "lucide-react";

interface Team {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  member_count: number;
}

const TeamsTab = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const fetchTeams = async () => {
    setLoading(true);
    const [{ data: teamsData }, { data: membersData }] = await Promise.all([
      supabase.from("chat_teams").select("id, name, description, is_default").order("name"),
      supabase.from("chat_team_members").select("team_id"),
    ]);

    const counts: Record<string, number> = {};
    (membersData ?? []).forEach((m: any) => { counts[m.team_id] = (counts[m.team_id] || 0) + 1; });

    let allTeams = (teamsData ?? []).map((t: any) => ({ ...t, member_count: counts[t.id] || 0 })) as Team[];

    // Auto-create default team if none exists
    const hasDefault = allTeams.some(t => t.is_default);
    if (!hasDefault) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: newTeam } = await supabase
          .from("chat_teams")
          .insert({
            user_id: session.user.id,
            name: t("chat.teams.defaultTeam"),
            is_default: true,
          } as any)
          .select("id, name, description, is_default")
          .single();
        if (newTeam) {
          allTeams = [{ ...(newTeam as any), member_count: 0 }, ...allTeams];
          // Auto-link to default category if it exists
          const { data: defaultCat } = await supabase
            .from("chat_service_categories")
            .select("id, tenant_id")
            .eq("is_default", true)
            .limit(1)
            .maybeSingle();
          if (defaultCat) {
            const { data: existingLink } = await supabase
              .from("chat_category_teams")
              .select("id")
              .eq("category_id", defaultCat.id)
              .eq("team_id", (newTeam as any).id)
              .maybeSingle();
            if (!existingLink) {
              await supabase.from("chat_category_teams").insert({
                category_id: defaultCat.id,
                team_id: (newTeam as any).id,
                tenant_id: defaultCat.tenant_id,
              } as any);
            }
          }
        }
      }
    }

    // Sort: default first, then alphabetical
    allTeams.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.name.localeCompare(b.name);
    });

    setTeams(allTeams);
    setLoading(false);
  };

  useEffect(() => { fetchTeams(); }, []);

  const openDialog = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setForm({ name: team.name, description: team.description || "" });
    } else {
      setEditingTeam(null);
      setForm({ name: "", description: "" });
    }
    setDialogOpen(true);
  };

  const saveTeam = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (editingTeam) {
      await supabase.from("chat_teams").update({ name: form.name, description: form.description || null }).eq("id", editingTeam.id);
    } else {
      await supabase.from("chat_teams").insert({ user_id: session.user.id, name: form.name, description: form.description || null } as any);
    }
    setDialogOpen(false);
    toast({ title: t("chat.settings.saved") });
    fetchTeams();
  };

  const deleteTeam = async () => {
    if (!deleteId) return;
    await supabase.from("chat_teams").delete().eq("id", deleteId);
    setDeleteId(null);
    toast({ title: t("chat.settings.saved") });
    fetchTeams();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-1" /> {t("chat.teams.create")}
        </Button>
      </div>

      {teams.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{t("chat.teams.noTeams")}</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{team.name}</CardTitle>
                    {team.is_default && (
                      <Badge variant="default" className="text-xs gap-1">
                        <Shield className="h-3 w-3" />
                        {t("chat.teams.default")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />{team.member_count}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(team)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {team.is_default ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("chat.teams.cannotDeleteDefault")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(team.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {team.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{team.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? t("chat.teams.edit") : t("chat.teams.create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("chat.teams.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("chat.teams.namePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("chat.teams.description")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveTeam} disabled={!form.name.trim()}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.teams.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("chat.teams.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={deleteTeam}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamsTab;
