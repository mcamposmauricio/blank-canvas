
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Mail, Bell, Key, Code2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import BrandSettingsTab from "@/components/BrandSettingsTab";
import EmailSettingsTab from "@/components/EmailSettingsTab";
import NotificationSettingsTab from "@/components/NotificationSettingsTab";
import ApiKeysTab from "@/components/ApiKeysTab";
import NPSWidgetTab from "@/components/NPSWidgetTab";
import { PageHeader } from "@/components/ui/page-header";

const NPSSettings = () => {
  const { t } = useLanguage();
  const { isAdmin, hasPermission } = useAuth();
  const showApiKeys = isAdmin || hasPermission('nps.settings', 'manage');

  return (
    <div className="space-y-6">
        <PageHeader title={t("npsSettings.title")} subtitle={t("npsSettings.subtitle")} />

        <Tabs defaultValue="brand" className="space-y-6">
          <TabsList className="w-full lg:w-auto lg:inline-flex flex-wrap">
            <TabsTrigger value="brand" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.brand")}</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.email")}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.notifications")}</span>
            </TabsTrigger>
            <TabsTrigger value="widget" className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">Widget</span>
            </TabsTrigger>
            {showApiKeys && (
              <TabsTrigger value="apikeys" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">{t("settings.tabs.apiKeys")}</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="brand">
            <BrandSettingsTab />
          </TabsContent>

          <TabsContent value="email">
            <EmailSettingsTab />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettingsTab />
          </TabsContent>

          <TabsContent value="widget">
            <NPSWidgetTab />
          </TabsContent>

          {showApiKeys && (
            <TabsContent value="apikeys">
              <ApiKeysTab />
            </TabsContent>
          )}
        </Tabs>
    </div>
  );
};

export default NPSSettings;
