import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Server, Check, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmailSettings {
  id?: string;
  provider: "default" | "gmail" | "smtp";
  gmail_client_id?: string;
  gmail_client_secret?: string;
  gmail_refresh_token?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from_email?: string;
  smtp_from_name?: string;
  smtp_secure?: boolean;
  is_verified?: boolean;
}

const EmailSettingsTab = () => {
  const [settings, setSettings] = useState<EmailSettings>({
    provider: "default",
    smtp_secure: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
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

      const { data, error } = await supabase
        .from("user_email_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          provider: data.provider as "default" | "gmail" | "smtp",
          gmail_client_id: data.gmail_client_id || "",
          gmail_client_secret: data.gmail_client_secret || "",
          gmail_refresh_token: data.gmail_refresh_token || "",
          smtp_host: data.smtp_host || "",
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || "",
          smtp_password: data.smtp_password || "",
          smtp_from_email: data.smtp_from_email || "",
          smtp_from_name: data.smtp_from_name || "",
          smtp_secure: data.smtp_secure ?? true,
          is_verified: data.is_verified ?? false,
        });
      }
    } catch (error: any) {
      console.error("Error fetching email settings:", error);
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
        provider: settings.provider,
        gmail_client_id: settings.gmail_client_id || null,
        gmail_client_secret: settings.gmail_client_secret || null,
        gmail_refresh_token: settings.gmail_refresh_token || null,
        smtp_host: settings.smtp_host || null,
        smtp_port: settings.smtp_port || null,
        smtp_user: settings.smtp_user || null,
        smtp_password: settings.smtp_password || null,
        smtp_from_email: settings.smtp_from_email || null,
        smtp_from_name: settings.smtp_from_name || null,
        smtp_secure: settings.smtp_secure,
        is_verified: false,
      };

      const { error } = settings.id
        ? await supabase.from("user_email_settings").update(settingsData).eq("id", settings.id)
        : await supabase.from("user_email_settings").insert(settingsData);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("settings.email.saveSuccess"),
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

  const handleTestConfig = async () => {
    setTesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("settings.userNotAuthenticated"));

      const { data, error } = await supabase.functions.invoke("test-email-config", {
        body: {
          provider: settings.provider,
          gmailClientId: settings.gmail_client_id,
          gmailClientSecret: settings.gmail_client_secret,
          gmailRefreshToken: settings.gmail_refresh_token,
          smtpHost: settings.smtp_host,
          smtpPort: settings.smtp_port,
          smtpUser: settings.smtp_user,
          smtpPassword: settings.smtp_password,
          smtpFromEmail: settings.smtp_from_email,
          smtpFromName: settings.smtp_from_name,
          smtpSecure: settings.smtp_secure,
          testEmail: user.email,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: t("common.success"),
          description: t("settings.email.testSuccess"),
        });
      } else {
        throw new Error(data.error || t("settings.email.testError"));
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("settings.email.testError"),
        variant: "destructive",
      });
    } finally {
      setTesting(false);
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
        <h2 className="text-lg font-semibold mb-2">{t("settings.email.title")}</h2>
        <p className="text-muted-foreground">
          {t("settings.email.subtitle")}
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <Label htmlFor="provider">{t("settings.email.provider")}</Label>
          <Select
            value={settings.provider}
            onValueChange={(value: "default" | "gmail" | "smtp") =>
              setSettings({ ...settings, provider: value })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t("settings.email.providerDefault")}
                </div>
              </SelectItem>
              <SelectItem value="gmail">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t("settings.email.providerGmail")}
                </div>
              </SelectItem>
              <SelectItem value="smtp">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  {t("settings.email.providerSmtp")}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.provider === "default" && (
          <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
            <Check className="h-5 w-5 text-green-500" />
            <p className="text-sm text-muted-foreground">
              {t("settings.email.defaultDescription")}
            </p>
          </div>
        )}

        {settings.provider === "gmail" && (
          <div className="space-y-4 border-t pt-4">
            <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-700">
                  {t("settings.email.gmailInstructions")}
                </p>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {t("settings.email.gmailConsoleLink")}
                </a>
              </div>
            </div>

            <div>
              <Label htmlFor="gmail-client-id">{t("settings.email.gmailClientId")}</Label>
              <Input
                id="gmail-client-id"
                value={settings.gmail_client_id || ""}
                onChange={(e) => setSettings({ ...settings, gmail_client_id: e.target.value })}
                placeholder="xxxx.apps.googleusercontent.com"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="gmail-client-secret">{t("settings.email.gmailClientSecret")}</Label>
              <Input
                id="gmail-client-secret"
                type="password"
                value={settings.gmail_client_secret || ""}
                onChange={(e) => setSettings({ ...settings, gmail_client_secret: e.target.value })}
                placeholder="••••••••"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="gmail-refresh-token">{t("settings.email.gmailRefreshToken")}</Label>
              <Input
                id="gmail-refresh-token"
                type="password"
                value={settings.gmail_refresh_token || ""}
                onChange={(e) => setSettings({ ...settings, gmail_refresh_token: e.target.value })}
                placeholder="••••••••"
                className="mt-2"
              />
            </div>
          </div>
        )}

        {settings.provider === "smtp" && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-host">{t("settings.email.smtpHost")}</Label>
                <Input
                  id="smtp-host"
                  value={settings.smtp_host || ""}
                  onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="smtp-port">{t("settings.email.smtpPort")}</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={settings.smtp_port || 587}
                  onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                  placeholder="587"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-user">{t("settings.email.smtpUser")}</Label>
                <Input
                  id="smtp-user"
                  value={settings.smtp_user || ""}
                  onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                  placeholder="user@example.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="smtp-password">{t("settings.email.smtpPassword")}</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={settings.smtp_password || ""}
                  onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                  placeholder="••••••••"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-from-email">{t("settings.email.smtpFromEmail")}</Label>
                <Input
                  id="smtp-from-email"
                  type="email"
                  value={settings.smtp_from_email || ""}
                  onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })}
                  placeholder="noreply@empresa.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="smtp-from-name">{t("settings.email.smtpFromName")}</Label>
                <Input
                  id="smtp-from-name"
                  value={settings.smtp_from_name || ""}
                  onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
                  placeholder="Minha Empresa"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="smtp-secure"
                checked={settings.smtp_secure}
                onCheckedChange={(checked) => setSettings({ ...settings, smtp_secure: checked })}
              />
              <Label htmlFor="smtp-secure">{t("settings.email.smtpSecure")}</Label>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          {settings.provider !== "default" && (
            <Button
              variant="outline"
              onClick={handleTestConfig}
              disabled={testing || !canEditSettings}
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("settings.email.testConfig")}
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !canEditSettings} className="flex-1">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("settings.saveChanges")}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default EmailSettingsTab;