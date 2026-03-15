import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Tag, X, Search, Shield, Settings2 } from "lucide-react";
import { AssignmentConfigPanel } from "@/components/chat/AssignmentConfigPanel";
import { CategoryFieldRules } from "@/components/chat/CategoryFieldRules";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
}

interface Team {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  service_category_id: string | null;
}

const CategoriesTab = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categoryTeams, setCategoryTeams] = useState<{ id: string; category_id: string; team_id: string }[]>([]);
  const [fieldRules, setFieldRules] = useState<{ id: string; category_id: string; field_key: string; field_value: string; field_source: string; operator: string }[]>([]);
  const [fieldDefs, setFieldDefs] = useState<{ key: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#6366f1" });

  // Bulk add companies state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<string | null>(null);
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: cats }, { data: tms }, { data: comps }, { data: catTeams }, { data: rules }, { data: defs }] = await Promise.all([
      supabase.from("chat_service_categories").select("id, name, description, color, is_default").order("name"),
      supabase.from("chat_teams").select("id, name").order("name"),
      supabase.from("contacts").select("id, name, trade_name, service_category_id").eq("is_company", true).order("name"),
      supabase.from("chat_category_teams").select("id, category_id, team_id"),
      supabase.from("chat_category_field_rules" as any).select("id, category_id, field_key, field_value, field_source, operator"),
      supabase.from("chat_custom_field_definitions").select("key, label").eq("target", "company").eq("is_active", true),
    ]);

    let allCats = (cats as Category[]) ?? [];

    // Auto-create default category if none exists
    const hasDefault = allCats.some(c => c.is_default);
    if (!hasDefault) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: newCat } = await supabase
          .from("chat_service_categories")
          .insert({
            user_id: session.user.id,
            name: t("chat.categories.defaultQueue"),
            color: "#6B7280",
            is_default: true,
          } as any)
          .select("id, name, description, color, is_default")
          .single();
        if (newCat) {
          allCats = [newCat as Category, ...allCats];
          // Auto-link to default team if it exists
          const { data: defaultTeam } = await supabase
            .from("chat_teams")
            .select("id, tenant_id")
            .eq("is_default", true)
            .limit(1)
            .maybeSingle();
          if (defaultTeam) {
            // Check if link already exists
            const { data: existingLink } = await supabase
              .from("chat_category_teams")
              .select("id")
              .eq("category_id", (newCat as Category).id)
              .eq("team_id", defaultTeam.id)
              .maybeSingle();
            if (!existingLink) {
              await supabase.from("chat_category_teams").insert({
                category_id: (newCat as Category).id,
                team_id: defaultTeam.id,
                tenant_id: defaultTeam.tenant_id,
              } as any);
            }
          }
        }
      }
    }

    // Sort: default first, then alphabetical
    allCats.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.name.localeCompare(b.name);
    });

    setCategories(allCats);
    setTeams(tms ?? []);
    setCompanies((comps as Company[]) ?? []);
    setCategoryTeams((catTeams as any[]) ?? []);
    setFieldRules(((rules as unknown) as { id: string; category_id: string; field_key: string; field_value: string; field_source: string; operator: string }[]) ?? []);
    setFieldDefs(((defs as unknown) as { key: string; label: string }[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openDialog = (cat?: Category) => {
    if (cat) {
      setEditingCat(cat);
      setForm({ name: cat.name, description: cat.description || "", color: cat.color });
    } else {
      setEditingCat(null);
      setForm({ name: "", description: "", color: "#6366f1" });
    }
    setDialogOpen(true);
  };

  const saveCategory = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (editingCat) {
      await supabase.from("chat_service_categories").update({ name: form.name, description: form.description || null, color: form.color }).eq("id", editingCat.id);
    } else {
      await supabase.from("chat_service_categories").insert({ user_id: session.user.id, name: form.name, description: form.description || null, color: form.color } as any);
    }
    setDialogOpen(false);
    toast({ title: t("chat.settings.saved") });
    fetchAll();
  };

  const deleteCategory = async () => {
    if (!deleteId) return;
    await supabase.from("contacts").update({ service_category_id: null } as any).eq("service_category_id", deleteId);
    await supabase.from("chat_service_categories").delete().eq("id", deleteId);
    setDeleteId(null);
    toast({ title: t("chat.settings.saved") });
    fetchAll();
  };

  const unassignCompany = async (companyId: string) => {
    await supabase.from("contacts").update({ service_category_id: null } as any).eq("id", companyId);
    fetchAll();
  };

  const addTeamToCategory = async (categoryId: string, teamId: string) => {
    const { data: catData } = await supabase.from("chat_service_categories").select("tenant_id").eq("id", categoryId).single();
    await supabase.from("chat_category_teams").insert({ category_id: categoryId, team_id: teamId, tenant_id: (catData as any)?.tenant_id } as any);
    fetchAll();
  };

  const removeTeamFromCategory = async (categoryId: string, teamId: string) => {
    await supabase.from("chat_category_teams").delete().eq("category_id", categoryId).eq("team_id", teamId);
    fetchAll();
  };

  const openBulkDialog = (categoryId: string) => {
    setBulkCategoryId(categoryId);
    setBulkSearch("");
    // Pre-select already assigned companies
    const assigned = companies.filter(c => c.service_category_id === categoryId);
    setBulkSelected(new Set(assigned.map(c => c.id)));
    setBulkDialogOpen(true);
  };

  // All companies available for this category (assigned to it or unassigned)
  const manageable = companies.filter(c => !c.service_category_id || c.service_category_id === bulkCategoryId);

  const filteredManageable = manageable.filter(c => {
    const search = bulkSearch.toLowerCase();
    return (c.trade_name || c.name).toLowerCase().includes(search);
  });

  const toggleBulkSelect = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (bulkSelected.size === filteredManageable.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(filteredManageable.map(c => c.id)));
    }
  };

  const saveBulkCompanies = async () => {
    if (!bulkCategoryId) return;
    const selectedIds = Array.from(bulkSelected);
    // Assign selected companies to this category
    for (const comp of manageable) {
      if (selectedIds.includes(comp.id) && comp.service_category_id !== bulkCategoryId) {
        await supabase.from("contacts").update({ service_category_id: bulkCategoryId } as any).eq("id", comp.id);
      } else if (!selectedIds.includes(comp.id) && comp.service_category_id === bulkCategoryId) {
        await supabase.from("contacts").update({ service_category_id: null } as any).eq("id", comp.id);
      }
    }
    setBulkDialogOpen(false);
    toast({ title: t("chat.settings.saved") });
    fetchAll();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-1" /> {t("chat.categories.create")}
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{t("chat.categories.noCategories")}</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {categories.map((cat) => {
            const catCompanies = companies.filter(c => c.service_category_id === cat.id);
            const catTeamLinks = categoryTeams.filter(ct => ct.category_id === cat.id);
            const catTeamIds = catTeamLinks.map(ct => ct.team_id);
            const assignedTeams = teams.filter(t => catTeamIds.includes(t.id));
            const availableTeams = teams.filter(t => !catTeamIds.includes(t.id));

            return (
              <Card key={cat.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <CardTitle className="text-base">{cat.name}</CardTitle>
                      {cat.is_default && (
                        <Badge variant="default" className="text-xs gap-1">
                          <Shield className="h-3 w-3" />
                          {t("chat.categories.default")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(cat)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {cat.is_default ? (
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
                              <p>{t("chat.categories.cannotDeleteDefault")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(cat.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}

                  {/* Teams */}
                  <div>
                    <p className="text-xs font-medium mb-1.5">{t("chat.categories.responsibleTeams")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedTeams.map(team => (
                        <Badge key={team.id} variant="outline" className="text-xs gap-1">
                          {team.name}
                          <button onClick={() => removeTeamFromCategory(cat.id, team.id)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                      {availableTeams.length > 0 && (
                        <select className="text-xs border rounded px-1.5 py-0.5 bg-background" value="" onChange={(e) => { if (e.target.value) addTeamToCategory(cat.id, e.target.value); }}>
                          <option value="">+ {t("chat.categories.addTeam")}</option>
                          {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Assignment Config Panels */}
                  {catTeamLinks.length > 0 && (
                    <div className="space-y-2">
                      {catTeamLinks.map(link => {
                        const team = teams.find(t => t.id === link.team_id);
                        if (!team) return null;
                        return (
                          <AssignmentConfigPanel
                            key={link.id}
                            categoryTeamId={link.id}
                            teamName={team.name}
                            allTeams={teams}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Auto Rules */}
                  <CategoryFieldRules
                    categoryId={cat.id}
                    rules={fieldRules}
                    fieldDefs={fieldDefs}
                    onChanged={fetchAll}
                  />

                  {/* Companies */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium">{t("chat.categories.companies")}</p>
                    <Badge variant="secondary" className="text-xs">
                      {catCompanies.length} {catCompanies.length === 1 ? "empresa" : "empresas"}
                    </Badge>
                    <Button variant="outline" size="sm" className="text-xs h-6 ml-auto" onClick={() => openBulkDialog(cat.id)}>
                      <Settings2 className="h-3 w-3 mr-1" /> Gerenciar empresas
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Category create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? t("chat.categories.edit") : t("chat.categories.create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("chat.categories.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("chat.categories.namePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("chat.categories.description")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("chat.categories.color")}</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-28" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveCategory} disabled={!form.name.trim()}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk add companies dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("chat.categories.addCompanies")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder={t("chat.categories.searchCompany")}
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="text-xs" onClick={toggleSelectAll}>
                {bulkSelected.size === filteredManageable.length && filteredManageable.length > 0
                  ? t("chat.categories.deselectAll")
                  : t("chat.categories.selectAll")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {bulkSelected.size} {t("chat.categories.selectedCount")}
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
              {filteredManageable.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 text-center">{t("companies.noCompaniesFound")}</p>
              ) : (
                filteredManageable.map(comp => (
                  <label key={comp.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={bulkSelected.has(comp.id)}
                      onCheckedChange={() => toggleBulkSelect(comp.id)}
                    />
                    <span className="text-sm">{comp.trade_name || comp.name}</span>
                    {comp.service_category_id === bulkCategoryId && (
                      <Badge variant="outline" className="text-xs ml-auto">Vinculada</Badge>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveBulkCompanies}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.categories.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("chat.categories.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={deleteCategory}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoriesTab;
