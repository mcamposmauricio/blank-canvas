import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Save } from "lucide-react";

interface WorkspaceSettings {
  ws_sort_order: string;
  ws_show_metrics: boolean;
  ws_show_contact_data: boolean;
  ws_show_custom_fields: boolean;
  ws_show_timeline: boolean;
  ws_show_recent_chats: boolean;
  ws_show_company_external_id: boolean;
  ws_show_contact_external_id: boolean;
  ws_recent_chats_count: number;
  ws_show_company_info: boolean;
  ws_show_company_cnpj: boolean;
  ws_show_company_sector: boolean;
  ws_show_company_location: boolean;
  ws_show_metric_health: boolean;
  ws_show_metric_mrr: boolean;
  ws_show_metric_contract: boolean;
  ws_show_metric_nps: boolean;
  ws_show_metric_renewal: boolean;
  ws_show_contact_department: boolean;
  ws_show_contact_chat_stats: boolean;
  ws_hidden_custom_fields: string[];
  ws_timeline_max_events: number;
  ws_default_panel_open: boolean;
}

const DEFAULTS: WorkspaceSettings = {
  ws_sort_order: "last_message",
  ws_show_metrics: true,
  ws_show_contact_data: true,
  ws_show_custom_fields: true,
  ws_show_timeline: true,
  ws_show_recent_chats: true,
  ws_show_company_external_id: true,
  ws_show_contact_external_id: true,
  ws_recent_chats_count: 5,
  ws_show_company_info: true,
  ws_show_company_cnpj: true,
  ws_show_company_sector: true,
  ws_show_company_location: true,
  ws_show_metric_health: true,
  ws_show_metric_mrr: true,
  ws_show_metric_contract: true,
  ws_show_metric_nps: true,
  ws_show_metric_renewal: true,
  ws_show_contact_department: true,
  ws_show_contact_chat_stats: true,
  ws_hidden_custom_fields: [],
  ws_timeline_max_events: 10,
  ws_default_panel_open: true,
};

interface CustomFieldDef {
  id: string;
  key: string;
  label: string;
  is_active: boolean;
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function ToggleRow({ id, label, checked, onChange, disabled, indent }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; indent?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${indent ? "pl-6" : ""}`}>
      <Label htmlFor={id} className={disabled ? "text-muted-foreground" : ""}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

const WorkspaceDisplayTab = () => {
  const { toast } = useToast();
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [ws, setWs] = useState<WorkspaceSettings>(DEFAULTS);
  const [savedWs, setSavedWs] = useState<WorkspaceSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);

  const isDirty = JSON.stringify(ws) !== JSON.stringify(savedWs);

  useEffect(() => {
    (async () => {
      const [settingsRes, defsRes] = await Promise.all([
        supabase
          .from("chat_settings")
          .select("*")
          .maybeSingle(),
        supabase
          .from("chat_custom_field_definitions" as any)
          .select("id, key, label, is_active")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);

      if (settingsRes.data) {
        const d = settingsRes.data as any;
        setSettingsId(d.id);
        const loaded: WorkspaceSettings = {
          ws_sort_order: d.ws_sort_order ?? DEFAULTS.ws_sort_order,
          ws_show_metrics: d.ws_show_metrics ?? DEFAULTS.ws_show_metrics,
          ws_show_contact_data: d.ws_show_contact_data ?? DEFAULTS.ws_show_contact_data,
          ws_show_custom_fields: d.ws_show_custom_fields ?? DEFAULTS.ws_show_custom_fields,
          ws_show_timeline: d.ws_show_timeline ?? DEFAULTS.ws_show_timeline,
          ws_show_recent_chats: d.ws_show_recent_chats ?? DEFAULTS.ws_show_recent_chats,
          ws_show_company_external_id: d.ws_show_company_external_id ?? DEFAULTS.ws_show_company_external_id,
          ws_show_contact_external_id: d.ws_show_contact_external_id ?? DEFAULTS.ws_show_contact_external_id,
          ws_recent_chats_count: d.ws_recent_chats_count ?? DEFAULTS.ws_recent_chats_count,
          ws_show_company_info: d.ws_show_company_info ?? DEFAULTS.ws_show_company_info,
          ws_show_company_cnpj: d.ws_show_company_cnpj ?? DEFAULTS.ws_show_company_cnpj,
          ws_show_company_sector: d.ws_show_company_sector ?? DEFAULTS.ws_show_company_sector,
          ws_show_company_location: d.ws_show_company_location ?? DEFAULTS.ws_show_company_location,
          ws_show_metric_health: d.ws_show_metric_health ?? DEFAULTS.ws_show_metric_health,
          ws_show_metric_mrr: d.ws_show_metric_mrr ?? DEFAULTS.ws_show_metric_mrr,
          ws_show_metric_contract: d.ws_show_metric_contract ?? DEFAULTS.ws_show_metric_contract,
          ws_show_metric_nps: d.ws_show_metric_nps ?? DEFAULTS.ws_show_metric_nps,
          ws_show_metric_renewal: d.ws_show_metric_renewal ?? DEFAULTS.ws_show_metric_renewal,
          ws_show_contact_department: d.ws_show_contact_department ?? DEFAULTS.ws_show_contact_department,
          ws_show_contact_chat_stats: d.ws_show_contact_chat_stats ?? DEFAULTS.ws_show_contact_chat_stats,
          ws_hidden_custom_fields: d.ws_hidden_custom_fields ?? DEFAULTS.ws_hidden_custom_fields,
          ws_timeline_max_events: d.ws_timeline_max_events ?? DEFAULTS.ws_timeline_max_events,
          ws_default_panel_open: d.ws_default_panel_open ?? DEFAULTS.ws_default_panel_open,
        };
        setWs(loaded);
        setSavedWs(loaded);
      }

      setCustomFieldDefs((defsRes.data as any as CustomFieldDef[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const update = (patch: Partial<WorkspaceSettings>) => {
    setWs(prev => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    if (!settingsId) return;
    setSaving(true);
    const { error } = await supabase.from("chat_settings").update(ws as any).eq("id", settingsId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setSavedWs({ ...ws });
      toast({ title: "Configurações salvas" });
    }
  };

  const toggleCustomFieldHidden = (key: string, hidden: boolean) => {
    const current = ws.ws_hidden_custom_fields;
    const next = hidden
      ? [...current, key]
      : current.filter((k) => k !== key);
    update({ ws_hidden_custom_fields: next });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Button */}
      <div className="flex justify-end sticky top-0 z-10 bg-background py-2">
        <Button onClick={handleSave} disabled={!isDirty || saving} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>

      {/* Comportamento */}
      <SectionCard title="Comportamento" description="Configurações gerais do workspace.">
        <ToggleRow id="ws-default-open" label="Painel lateral aberto por padrão" checked={ws.ws_default_panel_open} onChange={(v) => update({ ws_default_panel_open: v })} />
        <Separator />
        <div className="space-y-1.5">
          <Label>Ordenação da Lista de Chats</Label>
          <Select value={ws.ws_sort_order} onValueChange={(v) => update({ ws_sort_order: v })}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_message">Última mensagem (padrão)</SelectItem>
              <SelectItem value="wait_time">Tempo de espera</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {/* Empresa */}
      <SectionCard title="Empresa" description="Controle quais campos da empresa exibir no painel lateral.">
        <ToggleRow id="ws-company-info" label="Exibir seção Empresa" checked={ws.ws_show_company_info} onChange={(v) => update({ ws_show_company_info: v })} />
        <Separator />
        <ToggleRow id="ws-company-cnpj" label="CNPJ" checked={ws.ws_show_company_cnpj} onChange={(v) => update({ ws_show_company_cnpj: v })} disabled={!ws.ws_show_company_info} indent />
        <ToggleRow id="ws-company-ext" label="External ID da Empresa" checked={ws.ws_show_company_external_id} onChange={(v) => update({ ws_show_company_external_id: v })} disabled={!ws.ws_show_company_info} indent />
        <ToggleRow id="ws-company-sector" label="Setor" checked={ws.ws_show_company_sector} onChange={(v) => update({ ws_show_company_sector: v })} disabled={!ws.ws_show_company_info} indent />
        <ToggleRow id="ws-company-location" label="Localização (Cidade/Estado)" checked={ws.ws_show_company_location} onChange={(v) => update({ ws_show_company_location: v })} disabled={!ws.ws_show_company_info} indent />
      </SectionCard>

      {/* Métricas */}
      <SectionCard title="Métricas" description="Controle quais métricas exibir no painel lateral.">
        <ToggleRow id="ws-metrics" label="Exibir seção Métricas" checked={ws.ws_show_metrics} onChange={(v) => update({ ws_show_metrics: v })} />
        <Separator />
        <ToggleRow id="ws-metric-health" label="Health Score" checked={ws.ws_show_metric_health} onChange={(v) => update({ ws_show_metric_health: v })} disabled={!ws.ws_show_metrics} indent />
        <ToggleRow id="ws-metric-mrr" label="MRR" checked={ws.ws_show_metric_mrr} onChange={(v) => update({ ws_show_metric_mrr: v })} disabled={!ws.ws_show_metrics} indent />
        <ToggleRow id="ws-metric-contract" label="Valor Contrato" checked={ws.ws_show_metric_contract} onChange={(v) => update({ ws_show_metric_contract: v })} disabled={!ws.ws_show_metrics} indent />
        <ToggleRow id="ws-metric-nps" label="NPS" checked={ws.ws_show_metric_nps} onChange={(v) => update({ ws_show_metric_nps: v })} disabled={!ws.ws_show_metrics} indent />
        <ToggleRow id="ws-metric-renewal" label="Data de Renovação" checked={ws.ws_show_metric_renewal} onChange={(v) => update({ ws_show_metric_renewal: v })} disabled={!ws.ws_show_metrics} indent />
      </SectionCard>

      {/* Dados do Contato */}
      <SectionCard title="Dados do Contato" description="Controle quais informações do contato exibir.">
        <ToggleRow id="ws-contact" label="Exibir seção Dados do Contato" checked={ws.ws_show_contact_data} onChange={(v) => update({ ws_show_contact_data: v })} />
        <Separator />
        <ToggleRow id="ws-contact-dept" label="Departamento" checked={ws.ws_show_contact_department} onChange={(v) => update({ ws_show_contact_department: v })} disabled={!ws.ws_show_contact_data} indent />
        <ToggleRow id="ws-contact-ext" label="External ID do Contato" checked={ws.ws_show_contact_external_id} onChange={(v) => update({ ws_show_contact_external_id: v })} disabled={!ws.ws_show_contact_data} indent />
        <ToggleRow id="ws-contact-stats" label="Estatísticas de Chat (sessões, CSAT, último chat)" checked={ws.ws_show_contact_chat_stats} onChange={(v) => update({ ws_show_contact_chat_stats: v })} disabled={!ws.ws_show_contact_data} indent />
      </SectionCard>

      {/* Campos Customizados */}
      <SectionCard title="Campos Customizados" description="Controle quais campos customizados exibir. Todos são visíveis por padrão.">
        <ToggleRow id="ws-custom" label="Exibir seção Campos Customizados" checked={ws.ws_show_custom_fields} onChange={(v) => update({ ws_show_custom_fields: v })} />
        {ws.ws_show_custom_fields && customFieldDefs.length > 0 && (
          <>
            <Separator />
            {customFieldDefs.map((fd) => {
              const isHidden = ws.ws_hidden_custom_fields.includes(fd.key);
              return (
                <ToggleRow
                  key={fd.id}
                  id={`ws-cf-${fd.key}`}
                  label={fd.label}
                  checked={!isHidden}
                  onChange={(v) => toggleCustomFieldHidden(fd.key, !v)}
                  indent
                />
              );
            })}
          </>
        )}
        {ws.ws_show_custom_fields && customFieldDefs.length === 0 && (
          <p className="text-xs text-muted-foreground pl-6">Nenhum campo customizado configurado.</p>
        )}
      </SectionCard>

      {/* Timeline */}
      <SectionCard title="Timeline" description="Controle a exibição de eventos na timeline.">
        <ToggleRow id="ws-timeline" label="Exibir Timeline" checked={ws.ws_show_timeline} onChange={(v) => update({ ws_show_timeline: v })} />
        {ws.ws_show_timeline && (
          <>
            <Separator />
            <div className="pl-6 space-y-1.5">
              <Label>Quantidade máxima de eventos</Label>
              <Select value={String(ws.ws_timeline_max_events)} onValueChange={(v) => update({ ws_timeline_max_events: Number(v) })}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 eventos</SelectItem>
                  <SelectItem value="10">10 eventos</SelectItem>
                  <SelectItem value="20">20 eventos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </SectionCard>

      {/* Chats Recentes */}
      <SectionCard title="Chats Recentes" description="Controle a exibição de chats recentes no painel.">
        <ToggleRow id="ws-recent" label="Exibir Chats Recentes" checked={ws.ws_show_recent_chats} onChange={(v) => update({ ws_show_recent_chats: v })} />
        {ws.ws_show_recent_chats && (
          <>
            <Separator />
            <div className="pl-6 space-y-1.5">
              <Label>Quantidade por página</Label>
              <Select value={String(ws.ws_recent_chats_count)} onValueChange={(v) => update({ ws_recent_chats_count: Number(v) })}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 chats</SelectItem>
                  <SelectItem value="10">10 chats</SelectItem>
                  <SelectItem value="15">15 chats</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
};

export default WorkspaceDisplayTab;
