import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Loader2, Headphones, Volume2 } from "lucide-react";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { cn } from "@/lib/utils";

const CHAT_STATUS_OPTIONS = [
  { value: "online", label: "Online", color: "bg-green-500", description: "Disponível para receber novos chats automaticamente" },
  { value: "busy", label: "Ocupado", color: "bg-amber-400", description: "Visível mas não recebe chats automáticos" },
  { value: "offline", label: "Offline", color: "bg-muted-foreground/40", description: "Indisponível para atendimento" },
];

const SPECIALTIES = [
  { value: "implementacao", labelKey: "cs.status.implementacao" },
  { value: "onboarding", labelKey: "cs.status.onboarding" },
  { value: "acompanhamento", labelKey: "cs.status.acompanhamento" },
  { value: "churn", labelKey: "cs.status.churn" },
];

export default function MyProfile() {
  const { user, isChatEnabled } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [specialty, setSpecialty] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Chat attendant status
  const [attendantId, setAttendantId] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState<string>("offline");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");

    const fetchProfile = async () => {
      const [{ data }, { data: attendantData }] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("display_name, phone, department, specialty, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("attendant_profiles")
          .select("id, status, sound_enabled")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (data) {
        setDisplayName(data.display_name ?? "");
        setPhone(data.phone ?? "");
        setDepartment(data.department ?? "");
        setSpecialty(data.specialty ?? []);
        setAvatarUrl(data.avatar_url);
      }
      if (attendantData) {
        setAttendantId(attendantData.id);
        setChatStatus(attendantData.status ?? "offline");
        setSoundEnabled(attendantData.sound_enabled !== false);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleAvatarChange = async (url: string) => {
    setAvatarUrl(url || null);
    if (user) {
      await supabase.from("user_profiles").update({ avatar_url: url || null }).eq("user_id", user.id);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("user_profiles")
      .update({
        display_name: displayName,
        phone,
        department,
        specialty,
        avatar_url: avatarUrl,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("profile.saved") });
    }
  };

  const handleChatStatusChange = async (newStatus: string) => {
    if (!attendantId) return;
    setSavingStatus(true);
    setChatStatus(newStatus);
    // Clear previous_status on manual change (intentional choice)
    await supabase.from("attendant_profiles").update({ status: newStatus, previous_status: null } as any).eq("id", attendantId);
    setSavingStatus(false);
    toast({ title: `Status de chat: ${CHAT_STATUS_OPTIONS.find(s => s.value === newStatus)?.label}` });
  };

  const toggleSpecialty = (value: string) => {
    setSpecialty((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const currentStatusConfig = CHAT_STATUS_OPTIONS.find(s => s.value === chatStatus) ?? CHAT_STATUS_OPTIONS[2];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("profile.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("profile.subtitle")}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Chat Status Card — only for attendants */}
            {isChatEnabled && attendantId && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Status de Atendimento</CardTitle>
                    <span className={cn("h-2.5 w-2.5 rounded-full ml-auto", currentStatusConfig.color)} />
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Seu status define se você receberá novos chats automaticamente.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {CHAT_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        disabled={savingStatus}
                        onClick={() => handleChatStatusChange(opt.value)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                          chatStatus === opt.value
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        <span className={cn("h-3 w-3 rounded-full", opt.color)} />
                        <span className="font-medium text-xs">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{currentStatusConfig.description}</p>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="sound-toggle" className="text-sm font-medium cursor-pointer">
                        Notificações sonoras
                      </Label>
                    </div>
                    <Switch
                      id="sound-toggle"
                      checked={soundEnabled}
                      onCheckedChange={async (checked) => {
                        setSoundEnabled(checked);
                        if (attendantId) {
                          await supabase.from("attendant_profiles").update({ sound_enabled: checked }).eq("id", attendantId);
                          toast({ title: checked ? "Som ativado" : "Som desativado" });
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{displayName || email}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                <ImageUploadField
                  value={avatarUrl}
                  onChange={handleAvatarChange}
                  label={t("profile.changePhoto")}
                  bucket="logos"
                  folder={user?.id ?? "avatars"}
                  dimensions="200x200px"
                  maxSizeMB={1}
                  accept=".png,.jpg,.webp"
                  previewHeight="h-24"
                />

                <div className="space-y-2">
                  <Label>{t("profile.displayName")}</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t("profile.displayNameHint")}</p>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label>{t("profile.phone")}</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>

                <div className="space-y-2">
                  <Label>{t("profile.department")}</Label>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Ex: Customer Success" />
                </div>

                <div className="space-y-2">
                  <Label>{t("profile.specialties")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {SPECIALTIES.map((s) => (
                      <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={specialty.includes(s.value)}
                          onCheckedChange={() => toggleSpecialty(s.value)}
                        />
                        <span className="text-sm">{t(s.labelKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {saving ? "..." : t("settings.save")}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
    </div>
  );
}

