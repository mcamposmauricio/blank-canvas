import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell, BellRing } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

interface NotificationSettings {
  id?: string;
  notify_on_response: boolean;
  notify_email: string;
  notify_promoters: boolean;
  notify_neutrals: boolean;
  notify_detractors: boolean;
}

const NotificationSettingsTab = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    notify_on_response: false,
    notify_email: "",
    notify_promoters: true,
    notify_neutrals: true,
    notify_detractors: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const canEditSettings = hasPermission('settings', 'edit');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || "");

      const { data, error } = await supabase
        .from("user_notification_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          notify_on_response: data.notify_on_response ?? false,
          notify_email: data.notify_email || user.email || "",
          notify_promoters: data.notify_promoters ?? true,
          notify_neutrals: data.notify_neutrals ?? true,
          notify_detractors: data.notify_detractors ?? true,
        });
      } else {
        setSettings(prev => ({
          ...prev,
          notify_email: user.email || "",
        }));
      }
    } catch (error: any) {
      console.error("Error fetching notification settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("settings.userNotAuthenticated"));

      const settingsData = {
        user_id: user.id,
        notify_on_response: settings.notify_on_response,
        notify_email: settings.notify_email || user.email,
        notify_promoters: settings.notify_promoters,
        notify_neutrals: settings.notify_neutrals,
        notify_detractors: settings.notify_detractors,
      };

      const { error } = settings.id
        ? await supabase.from("user_notification_settings").update(settingsData).eq("id", settings.id)
        : await supabase.from("user_notification_settings").insert(settingsData);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("settings.notifications.saveSuccess"),
      });

      fetchSettings();
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">{t("settings.notifications.title")}</h2>
        <p className="text-muted-foreground">
          {t("settings.notifications.subtitle")}
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.notify_on_response ? (
              <BellRing className="h-5 w-5 text-primary" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="notify-toggle" className="text-base font-medium">
                {t("settings.notifications.enableNotifications")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.notifications.enableDescription")}
              </p>
            </div>
          </div>
          <Switch
            id="notify-toggle"
            checked={settings.notify_on_response}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, notify_on_response: checked })
            }
          />
        </div>

        {settings.notify_on_response && (
          <>
            <div className="border-t pt-6">
              <Label htmlFor="notify-email">{t("settings.notifications.email")}</Label>
              <Input
                id="notify-email"
                type="email"
                value={settings.notify_email}
                onChange={(e) => setSettings({ ...settings, notify_email: e.target.value })}
                placeholder={userEmail}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("settings.notifications.emailDescription")}
              </p>
            </div>

            <div className="border-t pt-6">
              <Label className="text-base font-medium mb-4 block">
                {t("settings.notifications.filterByType")}
              </Label>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="notify-promoters"
                    checked={settings.notify_promoters}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, notify_promoters: !!checked })
                    }
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <Label htmlFor="notify-promoters" className="font-normal">
                      {t("settings.notifications.promoters")}
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="notify-neutrals"
                    checked={settings.notify_neutrals}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, notify_neutrals: !!checked })
                    }
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <Label htmlFor="notify-neutrals" className="font-normal">
                      {t("settings.notifications.neutrals")}
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="notify-detractors"
                    checked={settings.notify_detractors}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, notify_detractors: !!checked })
                    }
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <Label htmlFor="notify-detractors" className="font-normal">
                      {t("settings.notifications.detractors")}
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="pt-4 border-t">
          <Button onClick={handleSave} disabled={saving || !canEditSettings} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("settings.saveChanges")}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotificationSettingsTab;