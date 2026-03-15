import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Users, Mail, Phone, Trash2, Building2 } from "lucide-react";

const SPECIALTIES = ["implementacao", "onboarding", "acompanhamento", "churn"];

export default function CSMsPage() {
  const { t } = useLanguage();
  const { user, tenantId, hasPermission } = useAuth();
  const canEditCS = hasPermission('cs', 'edit');
  const canDeleteCS = hasPermission('cs', 'delete');
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    specialty: ["implementacao"] as string[],
  });

  const { data: csms = [], isLoading } = useQuery({
    queryKey: ["csms"],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("csms")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  const { data: companyCounts = {} } = useQuery({
    queryKey: ["csm-company-counts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      const { data, error } = await supabase
        .from("contacts")
        .select("csm_id")
        .eq("is_company", true)
        .not("csm_id", "is", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((contact) => {
        if (contact.csm_id) {
          counts[contact.csm_id] = (counts[contact.csm_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("csms").insert({
        user_id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        department: data.department || null,
        specialty: data.specialty,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["csms"] });
      toast.success(t("cs.csms.createSuccess"));
      resetForm();
    },
    onError: () => {
      toast.error(t("common.error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("csms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["csms"] });
      toast.success(t("cs.csms.deleteSuccess"));
    },
  });

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", department: "", specialty: ["implementacao"] });
    setIsDialogOpen(false);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error(t("cs.csms.requiredFields"));
      return;
    }
    createMutation.mutate(formData);
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData((prev) => ({
      ...prev,
      specialty: prev.specialty.includes(specialty)
        ? prev.specialty.filter((s) => s !== specialty)
        : [...prev.specialty, specialty],
    }));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t("cs.csms.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("cs.csms.subtitle")}</p>
          </div>
          {canEditCS && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("cs.csms.addCSM")}
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("cs.csms.newCSM")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("cs.csms.name")} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t("cs.csms.namePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("cs.csms.email")} *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t("cs.csms.emailPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("cs.csms.phone")}</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={t("cs.csms.phonePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("cs.csms.department")}</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder={t("cs.csms.departmentPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("cs.csms.specialties")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SPECIALTIES.map((specialty) => (
                      <div key={specialty} className="flex items-center space-x-2">
                        <Checkbox
                          id={specialty}
                          checked={formData.specialty.includes(specialty)}
                          onCheckedChange={() => toggleSpecialty(specialty)}
                        />
                        <label htmlFor={specialty} className="text-sm cursor-pointer">
                          {t(`cs.status.${specialty}`)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
        ) : csms.length === 0 ? (
          <Card className="rounded-lg border bg-card shadow-sm">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">{t("cs.csms.noCSMs")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {csms.map((csm: any) => (
              <Card key={csm.id} className="rounded-lg border bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(csm.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{csm.name}</CardTitle>
                      {csm.department && (
                        <p className="text-sm text-muted-foreground">{csm.department}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{csm.email}</span>
                    </div>
                    {csm.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{csm.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {companyCounts[csm.id] || 0} {t("cs.csms.companies")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {csm.specialty?.map((spec: string) => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {t(`cs.status.${spec}`)}
                      </Badge>
                    ))}
                  </div>
                  {canDeleteCS && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => deleteMutation.mutate(csm.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t("common.delete")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
