import { Fragment } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import TeamSettingsTab from "@/components/TeamSettingsTab";
import OrganizationSettingsTab from "@/components/OrganizationSettingsTab";
import ExternalApiTab from "@/components/ExternalApiTab";
import { PageHeader } from "@/components/ui/page-header";

const Settings = () => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("common.noPermission") || "Sem permissão para acessar esta página."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <PageHeader title={t("settings.title")} subtitle={t("settings.pageSubtitle")} />

        <Tabs defaultValue="team" className="space-y-6">
          <TabsList className="w-full lg:w-auto lg:inline-flex flex-wrap">
            <TabsTrigger value="team" className="flex items-center gap-2" title={t("settings.tabs.team")}>
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.team")}</span>
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2" title={t("settings.tabs.organization")}>
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.organization")}</span>
            </TabsTrigger>
            <TabsTrigger value="externalApi" className="flex items-center gap-2" title={t("settings.tabs.externalApi")}>
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.externalApi")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <TeamSettingsTab />
          </TabsContent>

          <TabsContent value="organization">
            <OrganizationSettingsTab />
          </TabsContent>

          <TabsContent value="externalApi">
            <ExternalApiTab />
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default Settings;
