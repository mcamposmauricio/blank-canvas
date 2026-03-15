import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Building2, Users, Send, Calendar } from "lucide-react";
import { slugify } from "@/utils/helpSlug";

const OrganizationSettingsTab = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { tenantId, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [stats, setStats] = useState({ members: 0, companies: 0, campaigns: 0 });

  useEffect(() => {
    if (tenantId) fetchOrganization();
  }, [tenantId]);

  const fetchOrganization = async () => {
    try {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId!)
        .single();

      if (tenant) {
        setName(tenant.name);
        setSlug(tenant.slug || "");
        setCreatedAt(tenant.created_at || "");
      }

      const [membersRes, companiesRes, campaignsRes] = await Promise.all([
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("is_company", true),
        supabase.from("campaigns").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        members: membersRes.count || 0,
        companies: companiesRes.count || 0,
        campaigns: campaignsRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const finalSlug = slug ? slugify(slug) : null;

      if (finalSlug) {
        const { data: existing } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", finalSlug)
          .neq("id", tenantId)
          .maybeSingle();

        if (existing) {
          toast({
            title: t("common.error"),
            description: t("organization.slugInUse"),
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      setSlug(finalSlug || "");

      const { error } = await supabase
        .from("tenants")
        .update({ name, slug: finalSlug })
        .eq("id", tenantId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("organization.saveSuccess"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { label: t("organization.members"), value: stats.members, icon: Users },
    { label: t("organization.companies"), value: stats.companies, icon: Building2 },
    { label: t("organization.campaigns"), value: stats.campaigns, icon: Send },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t("organization.title")}</h2>
        <p className="text-muted-foreground">{t("organization.subtitle")}</p>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <Label htmlFor="org-name">{t("organization.name")}</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("organization.namePlaceholder")}
            className="mt-2"
            disabled={!isAdmin}
          />
        </div>

        <div>
          <Label htmlFor="org-slug">{t("organization.slug")}</Label>
          <Input
            id="org-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onBlur={() => setSlug(slug ? slugify(slug) : "")}
            placeholder={t("organization.slugPlaceholder")}
            className="mt-2"
            disabled={!isAdmin}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("organization.slugDescription")}
          </p>
        </div>

        {createdAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {t("organization.createdAt")}: {new Date(createdAt).toLocaleDateString()}
          </div>
        )}

        {isAdmin && (
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("settings.saveChanges")}
          </Button>
        )}
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-3">{t("organization.usage")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettingsTab;
