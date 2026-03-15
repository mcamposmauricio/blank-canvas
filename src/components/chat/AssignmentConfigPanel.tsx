import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, HelpCircle, Zap, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
}

interface AssignmentConfig {
  id: string | null;
  enabled: boolean;
  model: "round_robin" | "least_busy";
  online_only: boolean;
  capacity_limit: number;
  allow_over_capacity: boolean;
  priority_bypass: boolean;
  fallback_mode: "queue_unassigned" | "fallback_team";
  fallback_team_id: string | null;
  advanced_reassign_enabled: boolean;
  advanced_reassign_minutes: number;
  advanced_notify_enabled: boolean;
  advanced_prefer_senior: boolean;
}

const DEFAULT_CONFIG: AssignmentConfig = {
  id: null,
  enabled: false,
  model: "round_robin",
  online_only: true,
  capacity_limit: 3,
  allow_over_capacity: false,
  priority_bypass: false,
  fallback_mode: "queue_unassigned",
  fallback_team_id: null,
  advanced_reassign_enabled: false,
  advanced_reassign_minutes: 10,
  advanced_notify_enabled: false,
  advanced_prefer_senior: false,
};

interface Props {
  categoryTeamId: string;
  teamName: string;
  allTeams: Team[];
}

const HelpTip = ({ text }: { text: string }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 pt-1">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{label}</span>
    <div className="h-px flex-1 bg-border" />
  </div>
);

export const AssignmentConfigPanel = ({ categoryTeamId, teamName, allTeams }: Props) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<AssignmentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_assignment_configs" as any)
      .select("*")
      .eq("category_team_id", categoryTeamId)
      .maybeSingle();

    if (data) {
      setConfig({
        id: (data as any).id,
        enabled: (data as any).enabled ?? false,
        model: (data as any).model ?? "round_robin",
        online_only: (data as any).online_only ?? true,
        capacity_limit: (data as any).capacity_limit ?? 3,
        allow_over_capacity: (data as any).allow_over_capacity ?? false,
        priority_bypass: (data as any).priority_bypass ?? false,
        fallback_mode: (data as any).fallback_mode ?? "queue_unassigned",
        fallback_team_id: (data as any).fallback_team_id ?? null,
        advanced_reassign_enabled: (data as any).advanced_reassign_enabled ?? false,
        advanced_reassign_minutes: (data as any).advanced_reassign_minutes ?? 10,
        advanced_notify_enabled: (data as any).advanced_notify_enabled ?? false,
        advanced_prefer_senior: (data as any).advanced_prefer_senior ?? false,
      });
    } else {
      setConfig({ ...DEFAULT_CONFIG });
    }
    setLoading(false);
  };

  useEffect(() => { fetchConfig(); }, [categoryTeamId]);

  const saveConfig = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const { data: catTeam } = await supabase
      .from("chat_category_teams")
      .select("tenant_id")
      .eq("id", categoryTeamId)
      .single();

    const payload = {
      category_team_id: categoryTeamId,
      tenant_id: (catTeam as any)?.tenant_id ?? null,
      enabled: config.enabled,
      model: config.model,
      online_only: config.online_only,
      capacity_limit: config.capacity_limit,
      allow_over_capacity: config.allow_over_capacity,
      priority_bypass: config.priority_bypass,
      fallback_mode: config.fallback_mode,
      fallback_team_id: config.fallback_mode === "fallback_team" ? config.fallback_team_id : null,
      advanced_reassign_enabled: config.advanced_reassign_enabled,
      advanced_reassign_minutes: config.advanced_reassign_minutes,
      advanced_notify_enabled: config.advanced_notify_enabled,
      advanced_prefer_senior: config.advanced_prefer_senior,
    };

    let error: any;
    if (config.id) {
      ({ error } = await (supabase.from("chat_assignment_configs" as any).update(payload).eq("id", config.id)));
    } else {
      const { data: inserted, error: insertError } = await (supabase.from("chat_assignment_configs" as any).insert(payload).select().single());
      error = insertError;
      if (inserted) setConfig(prev => ({ ...prev, id: (inserted as any).id }));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: config.enabled ? "⚡ Atribuição automática ativada!" : "Configuração salva", description: config.enabled ? `${teamName} agora recebe chats automaticamente` : "Configuração salva sem alterar o roteamento" });
    }
  };

  const set = (patch: Partial<AssignmentConfig>) => setConfig(prev => ({ ...prev, ...patch }));
  const disabled = !config.enabled;

  const activeSummary = config.enabled
    ? [
        config.model === "round_robin" ? "Round Robin" : "Least Busy",
        config.online_only ? "Online only" : "Online+Offline",
        `Cap. ${config.capacity_limit}`,
        config.priority_bypass ? "Prioridade fura fila" : null,
      ].filter(Boolean).join(" · ")
    : null;

  if (loading) return null;

  return (
    <Collapsible open={panelOpen} onOpenChange={setPanelOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors text-left group">
          <div className="flex items-center gap-2">
            {config.enabled
              ? <Zap className="h-3.5 w-3.5 text-primary" />
              : <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/40" />
            }
            <span className="text-xs font-medium">
              Atribuição Automática — {teamName}
            </span>
            {activeSummary && (
              <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                {activeSummary}
              </span>
            )}
            {!config.enabled && (
              <span className="text-[10px] text-muted-foreground">Desligada</span>
            )}
          </div>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", panelOpen && "rotate-180")} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 border border-border rounded-lg p-4 space-y-4 bg-card/50">
          {/* Main toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Ativar Atribuição Automática</Label>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => set({ enabled: v })}
            />
          </div>

          {/* Info banner when OFF */}
          {!config.enabled && (
            <div className="flex items-start gap-2 bg-muted/50 rounded-md px-3 py-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Atribuição automática desligada. Os atendentes precisarão pegar os chats manualmente ou transferir entre si.</span>
            </div>
          )}

          {/* Active summary badge */}
          {config.enabled && activeSummary && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
              <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs text-primary font-medium">Ativo: {activeSummary}</span>
            </div>
          )}

          <div className={cn("space-y-4 transition-opacity", disabled && "opacity-50 pointer-events-none")}>
            {/* Distribution model */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-medium">Modelo de atribuição</Label>
                <HelpTip text="Determina como os chats serão distribuídos entre os atendentes elegíveis do time." />
              </div>
              <Select value={config.model} onValueChange={(v) => set({ model: v as any })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin">
                    <div>
                      <span className="font-medium">Round Robin</span>
                      <span className="text-muted-foreground ml-2 text-xs">— distribui em sequência, equilibrado</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="least_busy">
                    <div>
                      <span className="font-medium">Least Busy</span>
                      <span className="text-muted-foreground ml-2 text-xs">— envia para quem tem menos chats ativos</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Online & Capacity row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">Somente online</Label>
                  <HelpTip text="Apenas atendentes com status 'Online' receberão novos chats automaticamente." />
                </div>
                <Switch checked={config.online_only} onCheckedChange={(v) => set({ online_only: v })} />
              </div>
              <div className="flex items-center gap-2 bg-muted/30 rounded-md px-3 py-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Label className="text-xs whitespace-nowrap">Capacidade</Label>
                  <HelpTip text="Número máximo de chats simultâneos por atendente. Ao atingir o limite, ele é ignorado na fila de atribuição." />
                </div>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={config.capacity_limit}
                  onChange={(e) => set({ capacity_limit: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="h-7 w-14 text-xs text-center"
                />
              </div>
            </div>

            {/* Allow over capacity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">Permitir atribuir mesmo com capacidade lotada</Label>
                <HelpTip text="Mesmo com capacidade esgotada, o sistema continuará atribuindo chats. Use com cautela — pode sobrecarregar os atendentes." />
              </div>
              <Switch checked={config.allow_over_capacity} onCheckedChange={(v) => set({ allow_over_capacity: v })} />
            </div>

            <SectionDivider label="Prioridade" />

            {/* Priority bypass */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">Empresa prioritária fura fila</Label>
                <HelpTip text="Empresas marcadas como 'Alta' ou 'Crítica' no cadastro vão para o melhor atendente disponível, ignorando a fila normal." />
              </div>
              <Switch checked={config.priority_bypass} onCheckedChange={(v) => set({ priority_bypass: v })} />
            </div>

            <SectionDivider label="Fallback" />

            {/* Fallback mode */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-medium">Quando não houver atendentes elegíveis</Label>
                <HelpTip text="Define o que acontece quando todos os atendentes do time estão offline ou com capacidade lotada." />
              </div>
              <Select value={config.fallback_mode} onValueChange={(v) => set({ fallback_mode: v as any })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="queue_unassigned">Manter na fila sem atendente atribuído</SelectItem>
                  <SelectItem value="fallback_team">Enviar para time fallback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fallback team select */}
            {config.fallback_mode === "fallback_team" && (
              <div className="space-y-1.5 pl-2 border-l-2 border-primary/30">
                <Label className="text-xs font-medium">Time de fallback</Label>
                <Select
                  value={config.fallback_team_id ?? ""}
                  onValueChange={(v) => set({ fallback_team_id: v || null })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecionar time..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allTeams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Advanced rules accordion */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group">
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", advancedOpen && "rotate-180")} />
                  <span className="font-medium">Regras Avançadas (opcional)</span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 space-y-3 pl-3 border-l-2 border-border">
                  {/* Reassign on no response */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs">Reatribuir se sem 1ª resposta em</Label>
                        <HelpTip text="Se o atendente atribuído não enviar a primeira resposta nesse tempo, o chat será redistribuído para outro atendente elegível do mesmo time." />
                      </div>
                      <Switch
                        checked={config.advanced_reassign_enabled}
                        onCheckedChange={(v) => set({ advanced_reassign_enabled: v })}
                      />
                    </div>
                    {config.advanced_reassign_enabled && (
                      <div className="flex items-center gap-2 pl-1">
                        <Input
                          type="number"
                          min={1}
                          max={120}
                          value={config.advanced_reassign_minutes}
                          onChange={(e) => set({ advanced_reassign_minutes: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="h-7 w-16 text-xs text-center"
                        />
                        <span className="text-xs text-muted-foreground">minutos sem resposta</span>
                      </div>
                    )}
                  </div>

                  {/* Notify on SLA breach */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">Notificar líder/supervisor em caso de SLA estourado</Label>
                      <HelpTip text="Quando o tempo de resposta esperado for excedido, uma notificação será enviada para o responsável do time." />
                    </div>
                    <Switch
                      checked={config.advanced_notify_enabled}
                      onCheckedChange={(v) => set({ advanced_notify_enabled: v })}
                    />
                  </div>

                  {/* Prefer senior for priority */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">Preferir atendentes Sênior para empresas prioritárias</Label>
                      <HelpTip text="Quando uma empresa prioritária iniciar um chat, o sistema tentará atribuir a um atendente com nível 'Senior' antes dos demais." />
                    </div>
                    <Switch
                      checked={config.advanced_prefer_senior}
                      onCheckedChange={(v) => set({ advanced_prefer_senior: v })}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground">
              {config.enabled ? "Alterações entrarão em vigor no próximo chat" : "Salvar não alterará o roteamento atual"}
            </span>
            <Button size="sm" className="h-7 text-xs" onClick={saveConfig} disabled={saving}>
              {saving ? "Salvando..." : config.enabled ? "⚡ Salvar e ativar" : "Salvar (sem ativar)"}
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
