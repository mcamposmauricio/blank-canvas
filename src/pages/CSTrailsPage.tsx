import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Route as RouteIcon, Trash2, Edit2, CheckCircle, Circle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default function CSTrailsPage() {
  const { t } = useLanguage();
  const { user, tenantId, hasPermission } = useAuth();
  const canEditCS = hasPermission('cs.trails', 'edit');
  const canDeleteCS = hasPermission('cs.trails', 'delete');
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "default" as "default" | "overdue" | "attention",
  });
  const [activities, setActivities] = useState<Array<{ name: string; description: string; estimated_days: number }>>([]);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["trail-templates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("trail_templates")
        .select("*, trail_template_activities(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { activities: typeof activities }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: template, error: templateError } = await supabase
        .from("trail_templates")
        .insert({
          user_id: user.id,
          tenant_id: tenantId,
          name: data.name,
          description: data.description,
          type: data.type,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      if (data.activities.length > 0) {
        const activitiesData = data.activities.map((act, index) => ({
          trail_template_id: template.id,
          name: act.name,
          description: act.description,
          estimated_days: act.estimated_days,
          order_index: index,
        }));

        const { error: activitiesError } = await supabase
          .from("trail_template_activities")
          .insert(activitiesData);

        if (activitiesError) throw activitiesError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-templates"] });
      toast.success(t("cs.trails.createSuccess"));
      resetForm();
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trail_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-templates"] });
      toast.success(t("cs.trails.deleteSuccess"));
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", type: "default" });
    setActivities([]);
    setEditingTemplate(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error(t("cs.trails.nameRequired"));
      return;
    }
    createMutation.mutate({ ...formData, activities });
  };

  const addActivity = () => {
    setActivities([...activities, { name: "", description: "", estimated_days: 1 }]);
  };

  const updateActivity = (index: number, field: string, value: string | number) => {
    const updated = [...activities];
    updated[index] = { ...updated[index], [field]: value };
    setActivities(updated);
  };

  const removeActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "attention": return "bg-warning text-warning-foreground";
      case "overdue": return "bg-destructive text-destructive-foreground";
      default: return "bg-primary text-primary-foreground";
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
        <PageHeader title={t("cs.trails.title")} subtitle={t("cs.trails.subtitle")} />
          {canEditCS && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("cs.trails.addTemplate")}
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{t("cs.trails.newTemplate")}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("cs.trails.name")}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t("cs.trails.namePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("cs.trails.description")}</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t("cs.trails.descriptionPlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("cs.trails.type")}</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData({ ...formData, type: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">{t("cs.trails.typeDefault")}</SelectItem>
                        <SelectItem value="attention">{t("cs.trails.typeAttention")}</SelectItem>
                        <SelectItem value="overdue">{t("cs.trails.typeOverdue")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t("cs.trails.activities")}</Label>
                      <Button variant="outline" size="sm" onClick={addActivity}>
                        <Plus className="h-4 w-4 mr-1" />
                        {t("cs.trails.addActivity")}
                      </Button>
                    </div>
                    {activities.map((activity, index) => (
                      <Card key={index}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder={t("cs.trails.activityName")}
                              value={activity.name}
                              onChange={(e) => updateActivity(index, "name", e.target.value)}
                            />
                            <Input
                              type="number"
                              className="w-24"
                              placeholder={t("cs.trails.days")}
                              value={activity.estimated_days}
                              onChange={(e) => updateActivity(index, "estimated_days", parseInt(e.target.value) || 1)}
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeActivity(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <Textarea
                            placeholder={t("cs.trails.activityDescription")}
                            value={activity.description}
                            onChange={(e) => updateActivity(index, "description", e.target.value)}
                            className="text-sm"
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
        ) : templates.length === 0 ? (
          <Card className="rounded-lg border bg-card shadow-sm">
            <CardContent className="py-12 text-center">
              <RouteIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">{t("cs.trails.noTemplates")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template: any) => (
              <Card key={template.id} className="rounded-lg border bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                    </div>
                    <Badge className={getTypeColor(template.type)}>
                      {t(`cs.trails.type${template.type.charAt(0).toUpperCase() + template.type.slice(1)}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {template.trail_template_activities?.length || 0} {t("cs.trails.activitiesCount")}
                    </p>
                    <div className="space-y-1">
                      {template.trail_template_activities?.slice(0, 3).map((act: any) => (
                        <div key={act.id} className="flex items-center gap-2 text-sm">
                          <Circle className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{act.name}</span>
                        </div>
                      ))}
                      {template.trail_template_activities?.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{template.trail_template_activities.length - 3} {t("cs.trails.more")}
                        </p>
                      )}
                    </div>
                  </div>
                  {canDeleteCS && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => deleteMutation.mutate(template.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t("common.delete")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
