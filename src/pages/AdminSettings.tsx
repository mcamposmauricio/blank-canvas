import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Plus, Edit, Trash2, Headphones, Users, Tag, Clock, CheckCircle2, XCircle, MessageSquare, Settings2, ChevronDown, Copy } from "lucide-react";
import AutoMessagesTab from "@/components/chat/AutoMessagesTab";
import { Separator } from "@/components/ui/separator";
import ChatApiKeysTab from "@/components/ChatApiKeysTab";
import WidgetPreview from "@/components/chat/WidgetPreview";
import AttendantsTab from "@/components/chat/AttendantsTab";
import TeamsTab from "@/components/chat/TeamsTab";
import CategoriesTab from "@/components/chat/CategoriesTab";
import CustomFieldDefinitionsTab from "@/components/chat/CustomFieldDefinitionsTab";
import ChatWidgetDocsTab from "@/components/chat/ChatWidgetDocsTab";
import TagManagementSection from "@/components/chat/TagManagementSection";
import WorkspaceDisplayTab from "@/components/chat/WorkspaceDisplayTab";

interface Macro {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  category: string | null;
  is_private: boolean;
  user_id: string;
}

interface BusinessHour {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface BusinessHourBreak {
  id?: string;
  business_hour_id: string;
  start_time: string;
  end_time: string;
  message: string;
}

interface BusinessHourOverride {
  id?: string;
  override_date: string;
  is_closed: boolean;
  start_time: string;
  end_time: string;
  label: string;
  offline_message: string;
}


const DAY_NAMES_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const AdminSettings = () => {
  const { tab } = useParams();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const savedSettingsRef = useRef<typeof settings | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // General settings
  const [settings, setSettings] = useState({
    id: "",
    welcome_message: "Bem-vindo ao nosso chat!",
    offline_message: "Estamos offline no momento.",
    auto_assignment: true,
    max_queue_size: 50,
    require_approval: false,
    widget_position: "right",
    widget_primary_color: "#7C3AED",
    widget_company_name: "",
    widget_button_shape: "circle",
    // Widget display configs
    show_outside_hours_banner: true,
    outside_hours_title: "Estamos fora do horário de atendimento.",
    outside_hours_message: "Sua mensagem ficará registrada e responderemos assim que voltarmos.",
    show_all_busy_banner: true,
    all_busy_title: "Todos os atendentes estão ocupados no momento.",
    all_busy_message: "Você está na fila e será atendido em breve. Por favor, aguarde.",
    waiting_message: "Aguardando atendimento...",
    show_email_field: true,
    show_phone_field: true,
    form_intro_text: "Preencha seus dados para iniciar o atendimento.",
    show_chat_history: true,
    show_csat: true,
    allow_file_attachments: true,
  });

  // Macros
  const [macros, setMacros] = useState<Macro[]>([]);
  const [macroSearch, setMacroSearch] = useState("");
  const [macroDialog, setMacroDialog] = useState(false);
  const [editingMacro, setEditingMacro] = useState<Macro | null>(null);
  const [macroForm, setMacroForm] = useState({ title: "", content: "", shortcut: "", category: "", is_private: false });

  // Business Hours
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [breaks, setBreaks] = useState<BusinessHourBreak[]>([]);
  const [overrides, setOverrides] = useState<BusinessHourOverride[]>([]);
  const [newOverride, setNewOverride] = useState<BusinessHourOverride>({ override_date: "", is_closed: true, start_time: "08:00", end_time: "18:00", label: "", offline_message: "" });
  const [allowReopenResolved, setAllowReopenResolved] = useState(false);
  const fetchAll = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Settings
    const { data: settingsData } = await supabase
      .from("chat_settings")
      .select("*")
      .maybeSingle();

    if (settingsData) {
      const s = settingsData as any;
      const loaded = {
        id: settingsData.id,
        welcome_message: settingsData.welcome_message ?? "",
        offline_message: settingsData.offline_message ?? "",
        auto_assignment: settingsData.auto_assignment ?? true,
        max_queue_size: settingsData.max_queue_size ?? 50,
        require_approval: settingsData.require_approval ?? false,
        widget_position: s.widget_position ?? "right",
        widget_primary_color: s.widget_primary_color ?? "#7C3AED",
        widget_company_name: s.widget_company_name ?? "",
        widget_button_shape: s.widget_button_shape ?? "circle",
        show_outside_hours_banner: s.show_outside_hours_banner ?? true,
        outside_hours_title: s.outside_hours_title ?? "Estamos fora do horário de atendimento.",
        outside_hours_message: s.outside_hours_message ?? "Sua mensagem ficará registrada e responderemos assim que voltarmos.",
        show_all_busy_banner: s.show_all_busy_banner ?? true,
        all_busy_title: s.all_busy_title ?? "Todos os atendentes estão ocupados no momento.",
        all_busy_message: s.all_busy_message ?? "Você está na fila e será atendido em breve. Por favor, aguarde.",
        waiting_message: s.waiting_message ?? "Aguardando atendimento...",
        show_email_field: s.show_email_field ?? true,
        show_phone_field: s.show_phone_field ?? true,
        form_intro_text: s.form_intro_text ?? "Preencha seus dados para iniciar o atendimento.",
        show_chat_history: s.show_chat_history ?? true,
        show_csat: s.show_csat ?? true,
        allow_file_attachments: s.allow_file_attachments ?? true,
        allow_multiple_chats: s.allow_multiple_chats ?? false,
      };
      setSettings(loaded);
      savedSettingsRef.current = loaded;
      setHasUnsavedChanges(false);
      setAllowReopenResolved(s.allow_reopen_resolved ?? false);
    }

    // Macros - show public macros + own private macros
    const { data: macrosData } = await supabase
      .from("chat_macros")
      .select("id, title, content, shortcut, category, is_private, user_id")
      .or(`is_private.eq.false,user_id.eq.${session.user.id}`)
      .order("created_at");
    setMacros((macrosData as Macro[]) ?? []);

    // Business Hours
    const { data: hoursData } = await supabase
      .from("chat_business_hours")
      .select("id, day_of_week, start_time, end_time, is_active")
      .order("day_of_week");

    if (hoursData && hoursData.length > 0) {
      setHours(hoursData);

      // Fetch breaks for existing hours
      const hourIds = hoursData.map(h => h.id);
      const { data: breaksData } = await supabase
        .from("chat_business_hour_breaks")
        .select("id, business_hour_id, start_time, end_time, message")
        .in("business_hour_id", hourIds);
      setBreaks((breaksData as BusinessHourBreak[]) ?? []);
    } else {
      const defaults: BusinessHour[] = Array.from({ length: 7 }, (_, i) => ({
        day_of_week: i,
        start_time: "08:00",
        end_time: "18:00",
        is_active: i >= 1 && i <= 5,
      }));
      setHours(defaults);
      setBreaks([]);
    }

    // Overrides (ausências/feriados)
    const { data: overridesData } = await supabase
      .from("chat_business_hour_overrides")
      .select("id, override_date, is_closed, start_time, end_time, label, offline_message")
      .gte("override_date", new Date().toISOString().slice(0, 10))
      .order("override_date");
    setOverrides((overridesData as BusinessHourOverride[]) ?? []);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Save general settings
  const handleSaveGeneral = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload: Record<string, any> = {
      user_id: session.user.id,
      welcome_message: settings.welcome_message,
      offline_message: settings.offline_message,
      auto_assignment: settings.auto_assignment,
      max_queue_size: settings.max_queue_size,
      require_approval: settings.require_approval,
      widget_position: settings.widget_position,
      widget_primary_color: settings.widget_primary_color,
      widget_company_name: settings.widget_company_name,
      widget_button_shape: settings.widget_button_shape,
      show_outside_hours_banner: settings.show_outside_hours_banner,
      outside_hours_title: settings.outside_hours_title,
      outside_hours_message: settings.outside_hours_message,
      show_all_busy_banner: settings.show_all_busy_banner,
      all_busy_title: settings.all_busy_title,
      all_busy_message: settings.all_busy_message,
      waiting_message: settings.waiting_message,
      show_email_field: settings.show_email_field,
      show_phone_field: settings.show_phone_field,
      form_intro_text: settings.form_intro_text,
      show_chat_history: settings.show_chat_history,
      show_csat: settings.show_csat,
      allow_file_attachments: settings.allow_file_attachments,
      allow_multiple_chats: (settings as any).allow_multiple_chats ?? false,
    };

    if (settings.id) {
      await supabase.from("chat_settings").update(payload as any).eq("id", settings.id);
    } else {
      await supabase.from("chat_settings").insert(payload as any);
    }

    toast({ title: t("chat.settings.saved") });
    savedSettingsRef.current = { ...settings };
    setHasUnsavedChanges(false);
    setSaving(false);
  };

  // Track unsaved changes
  const updateSettings = useCallback((newSettings: typeof settings) => {
    setSettings(newSettings);
    if (savedSettingsRef.current) {
      const changed = JSON.stringify(newSettings) !== JSON.stringify(savedSettingsRef.current);
      setHasUnsavedChanges(changed);
    }

    // Auto-save boolean switches with debounce
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      // Only auto-save if the change was a boolean toggle (compare booleans only)
      if (savedSettingsRef.current) {
        const boolKeys = [
          "show_outside_hours_banner", "show_all_busy_banner", "show_email_field",
          "show_phone_field", "show_chat_history", "show_csat", "allow_file_attachments",
          "auto_assignment", "require_approval", "allow_multiple_chats"
        ] as const;
        const boolChanged = boolKeys.some(
          (k) => (newSettings as any)[k] !== (savedSettingsRef.current as any)[k]
        );
        const textChanged = Object.keys(newSettings).some((k) => {
          if (boolKeys.includes(k as any) || k === "id") return false;
          return (newSettings as any)[k] !== (savedSettingsRef.current as any)[k];
        });
        // If only booleans changed (no text edits), auto-save
        if (boolChanged && !textChanged) {
          handleSaveGeneral();
        }
      }
    }, 1500);
  }, []);

  // Macro CRUD
  const openMacroDialog = (macro?: Macro) => {
    if (macro) {
      setEditingMacro(macro);
      setMacroForm({ title: macro.title, content: macro.content, shortcut: macro.shortcut ?? "", category: macro.category ?? "", is_private: macro.is_private ?? false });
    } else {
      setEditingMacro(null);
      setMacroForm({ title: "", content: "", shortcut: "", category: "", is_private: false });
    }
    setMacroDialog(true);
  };

  const saveMacro = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (editingMacro) {
      await supabase.from("chat_macros").update({
        title: macroForm.title,
        content: macroForm.content,
        shortcut: macroForm.shortcut || null,
        category: macroForm.category || null,
        is_private: macroForm.is_private,
      } as any).eq("id", editingMacro.id);
    } else {
      await supabase.from("chat_macros").insert({
        user_id: session.user.id,
        title: macroForm.title,
        content: macroForm.content,
        shortcut: macroForm.shortcut || null,
        category: macroForm.category || null,
        is_private: macroForm.is_private,
      } as any);
    }

    setMacroDialog(false);
    toast({ title: t("chat.settings.saved") });
    fetchAll();
  };

  const deleteMacro = async (id: string) => {
    await supabase.from("chat_macros").delete().eq("id", id);
    toast({ title: t("chat.settings.saved") });
    fetchAll();
  };

  // Save Business Hours
  const saveBusinessHours = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    for (const h of hours) {
      if (h.id) {
        await supabase.from("chat_business_hours").update({
          start_time: h.start_time,
          end_time: h.end_time,
          is_active: h.is_active,
        }).eq("id", h.id);
      } else {
        await supabase.from("chat_business_hours").insert({
          user_id: session.user.id,
          day_of_week: h.day_of_week,
          start_time: h.start_time,
          end_time: h.end_time,
          is_active: h.is_active,
        });
      }
    }

    toast({ title: t("chat.settings.saved") });
    setSaving(false);
    fetchAll();
  };

  // Save a break
  const addBreak = async (businessHourId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("chat_business_hour_breaks").insert({
      business_hour_id: businessHourId,
      tenant_id: null, // will be set by trigger
      start_time: "12:00",
      end_time: "13:00",
      message: "Estamos em intervalo. Retornaremos em breve.",
    } as any);
    fetchAll();
  };

  const deleteBreak = async (breakId: string) => {
    await supabase.from("chat_business_hour_breaks").delete().eq("id", breakId);
    fetchAll();
  };

  const updateBreak = async (breakId: string, field: string, value: string) => {
    await supabase.from("chat_business_hour_breaks").update({ [field]: value } as any).eq("id", breakId);
  };

  // Overrides (ausências)
  const addOverride = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !newOverride.override_date) return;
    await supabase.from("chat_business_hour_overrides").insert({
      user_id: session.user.id,
      override_date: newOverride.override_date,
      is_closed: newOverride.is_closed,
      start_time: newOverride.is_closed ? null : newOverride.start_time,
      end_time: newOverride.is_closed ? null : newOverride.end_time,
      label: newOverride.label || null,
      offline_message: newOverride.offline_message || null,
    } as any);
    setNewOverride({ override_date: "", is_closed: true, start_time: "08:00", end_time: "18:00", label: "", offline_message: "" });
    toast({ title: "Ausência cadastrada!" });
    fetchAll();
  };

  const deleteOverride = async (id: string) => {
    await supabase.from("chat_business_hour_overrides").delete().eq("id", id);
    toast({ title: "Ausência removida" });
    fetchAll();
  };

  // Allow reopen resolved toggle
  const toggleAllowReopenResolved = async (value: boolean) => {
    setAllowReopenResolved(value);
    if (settings.id) {
      await supabase.from("chat_settings").update({ allow_reopen_resolved: value } as any).eq("id", settings.id);
      toast({ title: t("chat.settings.saved") });
    }
  };

  const dayNames = language === "pt-BR" ? DAY_NAMES_PT : DAY_NAMES_EN;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("chat.settings.title")}</h1>
          <p className="text-muted-foreground">{t("chat.settings.subtitle")}</p>
        </div>

        <Tabs defaultValue={tab ?? "widget"}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="widget" className="flex items-center gap-2 relative">
              <Settings2 className="h-4 w-4" />
              Widget e Instalação
              {hasUnsavedChanges && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />}
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Equipe
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {t("chat.categories.title")}
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t("chat.settings.tab_rules")}
            </TabsTrigger>
            <TabsTrigger value="macros">{t("chat.settings.tab_macros")}</TabsTrigger>
            <TabsTrigger value="hours">{t("chat.settings.tab_hours")}</TabsTrigger>
            <TabsTrigger value="workspace" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Workspace
            </TabsTrigger>
          </TabsList>

          {/* ===== Widget e Instalação Tab ===== */}
          <TabsContent value="widget" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Config */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("chat.settings.widgetConfig")}</CardTitle>
                  <CardDescription>{t("chat.settings.widgetConfigDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("chat.settings.companyName")}</Label>
                    <Input
                      value={settings.widget_company_name}
                      onChange={(e) => setSettings({ ...settings, widget_company_name: e.target.value })}
                      placeholder="Minha Empresa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("chat.settings.primaryColor")}</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.widget_primary_color}
                        onChange={(e) => setSettings({ ...settings, widget_primary_color: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={settings.widget_primary_color}
                        onChange={(e) => setSettings({ ...settings, widget_primary_color: e.target.value })}
                        className="w-28"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("chat.settings.widgetPosition")}</Label>
                    <RadioGroup
                      value={settings.widget_position}
                      onValueChange={(v) => setSettings({ ...settings, widget_position: v })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="right" id="pos-right" />
                        <Label htmlFor="pos-right">{t("chat.settings.posRight")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="left" id="pos-left" />
                        <Label htmlFor="pos-left">{t("chat.settings.posLeft")}</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>Formato do Botão</Label>
                    <RadioGroup
                      value={settings.widget_button_shape}
                      onValueChange={(v) => setSettings({ ...settings, widget_button_shape: v })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="circle" id="shape-circle" />
                        <Label htmlFor="shape-circle">Círculo</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="square" id="shape-square" />
                        <Label htmlFor="shape-square">Quadrado</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Button onClick={handleSaveGeneral} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? t("common.saving") : t("common.save")}
                  </Button>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                   <WidgetPreview
                    position={settings.widget_position as "left" | "right"}
                    primaryColor={settings.widget_primary_color}
                    companyName={settings.widget_company_name || "Suporte"}
                    buttonShape={settings.widget_button_shape as "circle" | "square"}
                    showEmailField={settings.show_email_field}
                    showPhoneField={settings.show_phone_field}
                    formIntroText={settings.form_intro_text}
                    showOutsideHoursBanner={settings.show_outside_hours_banner}
                    outsideHoursTitle={settings.outside_hours_title}
                    outsideHoursMessage={settings.outside_hours_message}
                    showAllBusyBanner={settings.show_all_busy_banner}
                    allBusyTitle={settings.all_busy_title}
                    allBusyMessage={settings.all_busy_message}
                    waitingMessage={settings.waiting_message}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Behavior & Messages Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comportamento e Mensagens</CardTitle>
                <CardDescription>Configure o que o widget exibe em cada situação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Outside Hours - Collapsible */}
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-1 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors group">
                    <span>Fora do Horário de Atendimento</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pb-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Exibir aviso quando fora do horário</Label>
                      <Switch
                        checked={settings.show_outside_hours_banner}
                        onCheckedChange={(v) => updateSettings({ ...settings, show_outside_hours_banner: v })}
                      />
                    </div>
                    <div className={`space-y-3 transition-opacity ${settings.show_outside_hours_banner ? "" : "opacity-40 pointer-events-none"}`}>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Título</Label>
                        <Input
                          value={settings.outside_hours_title}
                          onChange={(e) => updateSettings({ ...settings, outside_hours_title: e.target.value })}
                          disabled={!settings.show_outside_hours_banner}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Mensagem</Label>
                        <Textarea
                          value={settings.outside_hours_message}
                          onChange={(e) => updateSettings({ ...settings, outside_hours_message: e.target.value })}
                          disabled={!settings.show_outside_hours_banner}
                          rows={2}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Separator />

                {/* All Busy - Collapsible */}
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-1 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors group">
                    <span>Atendentes Ocupados</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pb-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Exibir aviso quando todos estão ocupados</Label>
                      <Switch
                        checked={settings.show_all_busy_banner}
                        onCheckedChange={(v) => updateSettings({ ...settings, show_all_busy_banner: v })}
                      />
                    </div>
                    <div className={`space-y-3 transition-opacity ${settings.show_all_busy_banner ? "" : "opacity-40 pointer-events-none"}`}>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Título</Label>
                        <Input
                          value={settings.all_busy_title}
                          onChange={(e) => updateSettings({ ...settings, all_busy_title: e.target.value })}
                          disabled={!settings.show_all_busy_banner}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Mensagem</Label>
                        <Textarea
                          value={settings.all_busy_message}
                          onChange={(e) => updateSettings({ ...settings, all_busy_message: e.target.value })}
                          disabled={!settings.show_all_busy_banner}
                          rows={2}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Separator />

                {/* Form - Collapsible */}
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-1 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors group">
                    <span>Formulário Inicial</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pb-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Texto introdutório</Label>
                      <Input
                        value={settings.form_intro_text}
                        onChange={(e) => updateSettings({ ...settings, form_intro_text: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Texto na tela de aguardo</Label>
                      <Input
                        value={settings.waiting_message}
                        onChange={(e) => updateSettings({ ...settings, waiting_message: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-6">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm">Exibir campo Email</Label>
                        <Switch
                          checked={settings.show_email_field}
                          onCheckedChange={(v) => updateSettings({ ...settings, show_email_field: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm">Exibir campo Telefone</Label>
                        <Switch
                          checked={settings.show_phone_field}
                          onCheckedChange={(v) => updateSettings({ ...settings, show_phone_field: v })}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Separator />

                {/* Features - Collapsible */}
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-1 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors group">
                    <span>Funcionalidades</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pb-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <Label className="text-sm">Histórico de conversas</Label>
                        <Switch
                          checked={settings.show_chat_history}
                          onCheckedChange={(v) => updateSettings({ ...settings, show_chat_history: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <Label className="text-sm">CSAT ao encerrar</Label>
                        <Switch
                          checked={settings.show_csat}
                          onCheckedChange={(v) => updateSettings({ ...settings, show_csat: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <Label className="text-sm">Envio de arquivos</Label>
                        <Switch
                          checked={settings.allow_file_attachments}
                          onCheckedChange={(v) => updateSettings({ ...settings, allow_file_attachments: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div>
                          <Label className="text-sm">Múltiplos chats simultâneos</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Permite que o visitante tenha mais de um chat ativo</p>
                        </div>
                        <Switch
                          checked={(settings as any).allow_multiple_chats ?? false}
                          onCheckedChange={(v) => updateSettings({ ...settings, allow_multiple_chats: v } as any)}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex items-center gap-3 mt-4">
                  <Button onClick={handleSaveGeneral} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? t("common.saving") : t("common.save")}
                  </Button>
                  {hasUnsavedChanges && (
                    <span className="text-xs text-destructive flex items-center gap-1">
                      • Alterações não salvas
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Custom Field Definitions */}
            <CustomFieldDefinitionsTab />

            {/* Developer Documentation */}
            <ChatWidgetDocsTab
              widgetPosition={settings.widget_position}
              widgetPrimaryColor={settings.widget_primary_color}
              widgetCompanyName={settings.widget_company_name}
              widgetButtonShape={settings.widget_button_shape}
            />

            {/* API Keys section */}
            <ChatApiKeysTab />
          </TabsContent>

          {/* ===== Equipe Tab ===== */}
          <TabsContent value="team" className="mt-4 space-y-6">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Headphones className="h-5 w-5" />
                {t("chat.attendants.title")}
              </h2>
              <AttendantsTab />
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Users className="h-5 w-5" />
                {t("chat.teams.title")}
              </h2>
              <TeamsTab />
            </div>
          </TabsContent>

          {/* ===== Regras de Atendimento Tab ===== */}
          <TabsContent value="categories" className="mt-4 space-y-4">
            {/* Global Assignment Config */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuração Global</CardTitle>
                <CardDescription>Controle o comportamento geral de atribuição de conversas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t("chat.settings.auto_assignment")}</Label>
                  <Switch
                    checked={settings.auto_assignment}
                    onCheckedChange={(v) => updateSettings({ ...settings, auto_assignment: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("chat.settings.max_queue")}</Label>
                  <Input
                    type="number"
                    value={settings.max_queue_size}
                    onChange={(e) => setSettings({ ...settings, max_queue_size: Number(e.target.value) })}
                    className="w-32"
                  />
                </div>
                <Button onClick={handleSaveGeneral} disabled={saving} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? t("common.saving") : t("common.save")}
                </Button>
              </CardContent>
            </Card>

            <CategoriesTab />
          </TabsContent>

          {/* ===== Msgs Automáticas Tab ===== */}
          <TabsContent value="rules" className="space-y-4 mt-4">
            <AutoMessagesTab />

            {/* Reopen resolved config */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reabrir Chats Resolvidos</CardTitle>
                <CardDescription>Permite que atendentes reabram conversas já finalizadas para tratar assuntos pendentes. Ao encerrar novamente, uma nova avaliação CSAT será solicitada e substituirá a nota anterior.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label>Permitir reabrir chats resolvidos</Label>
                  <Switch
                    checked={allowReopenResolved}
                    onCheckedChange={toggleAllowReopenResolved}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Macros & Tags Tab ===== */}
          <TabsContent value="macros" className="space-y-4 mt-4">
            {/* Tag Management */}
            <TagManagementSection />

            {/* Macros */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("chat.settings.macros.title")}</CardTitle>
                    <CardDescription>{t("chat.settings.macros.description")}</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => openMacroDialog()}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("chat.settings.macros.new")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {macros.length > 0 && (
                  <div className="mb-4">
                    <Input
                      placeholder="Buscar macros..."
                      value={macroSearch}
                      onChange={(e) => setMacroSearch(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                )}
                {macros.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("chat.gerencial.no_data")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("chat.settings.macros.title_label")}</TableHead>
                        <TableHead>Conteúdo</TableHead>
                        <TableHead>{t("chat.settings.macros.shortcut")}</TableHead>
                        <TableHead>{t("chat.settings.macros.category")}</TableHead>
                        <TableHead className="w-[100px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {macros
                        .filter((m) => {
                          if (!macroSearch) return true;
                          const q = macroSearch.toLowerCase();
                          return m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q) || (m.shortcut?.toLowerCase().includes(q)) || (m.category?.toLowerCase().includes(q));
                        })
                        .map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {m.title}
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${m.is_private ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                                {m.is_private ? "Particular" : "Pública"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{m.content.slice(0, 80)}</TableCell>
                          <TableCell className="font-mono text-sm">{m.shortcut ?? "—"}</TableCell>
                          <TableCell>{m.category ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMacroDialog(m)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMacro(m.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Horários Tab ===== */}
          <TabsContent value="hours" className="space-y-4 mt-4">
            {/* Current time indicator */}
            {(() => {
              const now = new Date();
              const dow = now.getDay();
              const hh = String(now.getHours()).padStart(2, "0");
              const mm = String(now.getMinutes()).padStart(2, "0");
              const timeStr = `${hh}:${mm}`;
              const todayHour = hours.find((h) => h.day_of_week === dow);
              const isWithinHours = todayHour?.is_active &&
                todayHour.start_time <= timeStr &&
                todayHour.end_time >= timeStr;
              return (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${isWithinHours ? "bg-green-500/10 border-green-500/30 text-green-600" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
                  {isWithinHours
                    ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                    : <XCircle className="h-4 w-4 shrink-0" />}
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>
                    Agora são {timeStr} ({dayNames[dow]}){" "}
                    {isWithinHours
                      ? `— dentro do horário de atendimento (${todayHour.start_time}–${todayHour.end_time})`
                      : todayHour?.is_active
                        ? `— FORA do horário configurado (${todayHour.start_time}–${todayHour.end_time})`
                        : "— FORA do horário (dia desativado)"}
                  </span>
                </div>
              );
            })()}

            {/* Weekly hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("chat.settings.hours.title")}</CardTitle>
                <CardDescription>{t("chat.settings.hours.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hours.map((h, i) => {
                    const hourBreaks = h.id ? breaks.filter(b => b.business_hour_id === h.id) : [];
                    return (
                      <div key={h.day_of_week} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="w-24 text-sm font-medium">{dayNames[h.day_of_week]}</span>
                          <Input
                            type="time"
                            value={h.start_time}
                            className="w-[110px]"
                            onChange={(e) => {
                              const updated = [...hours];
                              updated[i] = { ...updated[i], start_time: e.target.value };
                              setHours(updated);
                            }}
                          />
                          <span className="text-muted-foreground text-xs">às</span>
                          <Input
                            type="time"
                            value={h.end_time}
                            className="w-[110px]"
                            onChange={(e) => {
                              const updated = [...hours];
                              updated[i] = { ...updated[i], end_time: e.target.value };
                              setHours(updated);
                            }}
                          />
                          <Switch
                            checked={h.is_active}
                            onCheckedChange={(v) => {
                              const updated = [...hours];
                              updated[i] = { ...updated[i], is_active: v };
                              setHours(updated);
                            }}
                          />
                          {h.id && h.is_active && (
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => addBreak(h.id!)}>
                              <Plus className="h-3 w-3 mr-1" />
                              Intervalo
                            </Button>
                          )}
                        </div>
                        {/* Breaks for this day */}
                        {hourBreaks.map((brk) => (
                          <div key={brk.id} className="ml-28 flex items-center gap-2 pl-3 border-l-2 border-muted">
                            <span className="text-xs text-muted-foreground">Intervalo:</span>
                            <Input
                              type="time"
                              defaultValue={brk.start_time}
                              className="w-[100px] h-8 text-xs"
                              onBlur={(e) => brk.id && updateBreak(brk.id, "start_time", e.target.value)}
                            />
                            <span className="text-xs text-muted-foreground">–</span>
                            <Input
                              type="time"
                              defaultValue={brk.end_time}
                              className="w-[100px] h-8 text-xs"
                              onBlur={(e) => brk.id && updateBreak(brk.id, "end_time", e.target.value)}
                            />
                            <Input
                              defaultValue={brk.message ?? ""}
                              placeholder="Mensagem do intervalo"
                              className="h-8 text-xs flex-1 max-w-[250px]"
                              onBlur={(e) => brk.id && updateBreak(brk.id, "message", e.target.value)}
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => brk.id && deleteBreak(brk.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <Button onClick={saveBusinessHours} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? t("common.saving") : t("common.save")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const firstActive = hours.find(h => h.is_active);
                      if (!firstActive) return;
                      setHours(hours.map(h => ({
                        ...h,
                        start_time: firstActive.start_time,
                        end_time: firstActive.end_time,
                      })));
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar horário para todos
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Ausências / Feriados */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ausências e Feriados</CardTitle>
                <CardDescription>Cadastre datas específicas onde o horário semanal não se aplica (feriados, recesso, etc.).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add override form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-xs">Data</Label>
                    <Input
                      type="date"
                      value={newOverride.override_date}
                      onChange={(e) => setNewOverride({ ...newOverride, override_date: e.target.value })}
                      min={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      value={newOverride.label}
                      onChange={(e) => setNewOverride({ ...newOverride, label: e.target.value })}
                      placeholder="Ex: Feriado Nacional"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mensagem offline</Label>
                    <Input
                      value={newOverride.offline_message}
                      onChange={(e) => setNewOverride({ ...newOverride, offline_message: e.target.value })}
                      placeholder="Mensagem para o visitante"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mt-1">
                      <Switch
                        checked={newOverride.is_closed}
                        onCheckedChange={(v) => setNewOverride({ ...newOverride, is_closed: v })}
                      />
                      <Label className="text-xs">{newOverride.is_closed ? "Sem expediente" : "Horário especial"}</Label>
                    </div>
                    {!newOverride.is_closed && (
                      <div className="flex items-center gap-1">
                        <Input type="time" value={newOverride.start_time} className="w-[90px] h-7 text-xs" onChange={(e) => setNewOverride({ ...newOverride, start_time: e.target.value })} />
                        <span className="text-xs">–</span>
                        <Input type="time" value={newOverride.end_time} className="w-[90px] h-7 text-xs" onChange={(e) => setNewOverride({ ...newOverride, end_time: e.target.value })} />
                      </div>
                    )}
                    <Button size="sm" onClick={addOverride} disabled={!newOverride.override_date}>
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {/* List of overrides */}
                {overrides.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ausência cadastrada.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Mensagem</TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overrides.map((ov) => (
                        <TableRow key={ov.id}>
                          <TableCell className="font-medium">{new Date(ov.override_date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{ov.label || "—"}</TableCell>
                          <TableCell>
                            {ov.is_closed ? (
                              <span className="text-xs text-destructive font-medium">Sem expediente</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">{ov.start_time}–{ov.end_time}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{ov.offline_message || "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => ov.id && deleteOverride(ov.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Workspace Tab ===== */}
          <TabsContent value="workspace" className="mt-4">
            <WorkspaceDisplayTab />
          </TabsContent>
        </Tabs>

        {/* Macro Dialog */}
        <Dialog open={macroDialog} onOpenChange={setMacroDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMacro ? t("chat.settings.macros.title_label") : t("chat.settings.macros.new")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("chat.settings.macros.title_label")}</Label>
                <Input
                  value={macroForm.title}
                  onChange={(e) => setMacroForm({ ...macroForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("chat.settings.macros.content")}</Label>
                <Textarea
                  value={macroForm.content}
                  onChange={(e) => setMacroForm({ ...macroForm, content: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("chat.settings.macros.shortcut")}</Label>
                  <Input
                    value={macroForm.shortcut}
                    onChange={(e) => setMacroForm({ ...macroForm, shortcut: e.target.value })}
                    placeholder="/saudacao"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("chat.settings.macros.category")}</Label>
                  <Input
                    value={macroForm.category}
                    onChange={(e) => setMacroForm({ ...macroForm, category: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="macro-private">Macro particular</Label>
                  <p className="text-xs text-muted-foreground">Visível apenas para você</p>
                </div>
                <Switch
                  id="macro-private"
                  checked={macroForm.is_private}
                  onCheckedChange={(v) => setMacroForm({ ...macroForm, is_private: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMacroDialog(false)}>{t("common.cancel")}</Button>
              <Button onClick={saveMacro} disabled={!macroForm.title || !macroForm.content}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default AdminSettings;
