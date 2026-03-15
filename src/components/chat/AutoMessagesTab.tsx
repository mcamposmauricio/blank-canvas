import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  WifiOff,
  Clock,
  ListOrdered,
  UserCheck,
  ArrowRightLeft,
  Star,
  Sunrise,
  UserX,
  Save,
  Archive,
  ChevronUp,
  ChevronDown,
  SaveAll,
  type LucideIcon,
} from "lucide-react";

interface AutoRule {
  id: string;
  rule_type: string;
  is_enabled: boolean;
  trigger_minutes: number | null;
  message_content: string | null;
  sort_order?: number;
  close_resolution_status?: string;
}

interface AutoMessageTypeConfig {
  rule_type: string;
  icon: LucideIcon;
  hasMinutes: boolean;
  defaultEnabled: boolean;
  defaultMinutes?: number;
  group: "main_flow" | "other";
  flowStep?: number;
}

const AUTO_MESSAGE_TYPES: AutoMessageTypeConfig[] = [
  // Main Flow (sequential chain)
  { rule_type: "welcome_message", icon: MessageSquare, hasMinutes: false, defaultEnabled: true, group: "main_flow", flowStep: 1 },
  { rule_type: "inactivity_warning", icon: Clock, hasMinutes: true, defaultEnabled: true, defaultMinutes: 10, group: "main_flow", flowStep: 2 },
  { rule_type: "inactivity_warning_2", icon: Clock, hasMinutes: true, defaultEnabled: true, defaultMinutes: 10, group: "main_flow", flowStep: 3 },
  { rule_type: "auto_close", icon: Archive, hasMinutes: true, defaultEnabled: true, defaultMinutes: 10, group: "main_flow", flowStep: 4 },
  // Other messages
  { rule_type: "queue_position", icon: ListOrdered, hasMinutes: false, defaultEnabled: false, group: "other" },
  { rule_type: "attendant_assigned", icon: UserCheck, hasMinutes: false, defaultEnabled: false, group: "other" },
  { rule_type: "transfer_notice", icon: ArrowRightLeft, hasMinutes: false, defaultEnabled: false, group: "other" },
  { rule_type: "attendant_absence", icon: UserX, hasMinutes: true, defaultEnabled: false, defaultMinutes: 5, group: "other" },
  { rule_type: "offline_message", icon: WifiOff, hasMinutes: false, defaultEnabled: false, group: "other" },
  { rule_type: "post_service_csat", icon: Star, hasMinutes: false, defaultEnabled: false, group: "other" },
  { rule_type: "return_online", icon: Sunrise, hasMinutes: false, defaultEnabled: false, group: "other" },
];

const MAIN_FLOW_TYPES = ["welcome_message", "inactivity_warning", "inactivity_warning_2", "auto_close"];

const AutoMessagesTab = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [rules, setRules] = useState<AutoRule[]>([]);
  const [localEdits, setLocalEdits] = useState<Record<string, { message_content?: string; trigger_minutes?: number | null; close_resolution_status?: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAndSeed = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: rulesData } = await supabase
      .from("chat_auto_rules")
      .select("id, rule_type, is_enabled, trigger_minutes, message_content, close_resolution_status")
      .order("created_at");

    const existing = rulesData ?? [];
    const existingTypes = new Set(existing.map((r) => r.rule_type));

    const toInsert = AUTO_MESSAGE_TYPES.filter((t) => !existingTypes.has(t.rule_type));

    if (toInsert.length > 0) {
      const inserts = toInsert.map((cfg) => ({
        user_id: session.user.id,
        rule_type: cfg.rule_type,
        is_enabled: cfg.defaultEnabled,
        trigger_minutes: cfg.defaultMinutes ?? null,
        message_content: t(`chat.autoMsg.${cfg.rule_type}.default`),
      }));

      const { data: inserted } = await supabase
        .from("chat_auto_rules")
        .insert(inserts)
        .select("id, rule_type, is_enabled, trigger_minutes, message_content");

      setRules([...existing, ...(inserted ?? [])]);
    } else {
      setRules(existing);
    }

    setLoading(false);
  }, [t]);

  useEffect(() => {
    fetchAndSeed();
  }, [fetchAndSeed]);

  const getRuleForType = (ruleType: string): AutoRule | undefined =>
    rules.find((r) => r.rule_type === ruleType);

  const toggleRule = async (rule: AutoRule, enabled: boolean) => {
    await supabase.from("chat_auto_rules").update({ is_enabled: enabled }).eq("id", rule.id);
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_enabled: enabled } : r));
  };

  const saveRule = async (rule: AutoRule) => {
    const edits = localEdits[rule.id];
    if (!edits) return;

    setSavingId(rule.id);
    const updates: Record<string, any> = {};
    if (edits.message_content !== undefined) updates.message_content = edits.message_content;
    if (edits.trigger_minutes !== undefined) updates.trigger_minutes = Math.max(5, edits.trigger_minutes ?? 5);
    if (edits.close_resolution_status !== undefined) updates.close_resolution_status = edits.close_resolution_status;

    await supabase.from("chat_auto_rules").update(updates).eq("id", rule.id);
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, ...updates } : r));
    setLocalEdits((prev) => {
      const next = { ...prev };
      delete next[rule.id];
      return next;
    });
    toast({ title: t("chat.settings.rules.savedRule") });
    setSavingId(null);
  };

  const saveAllChanges = async () => {
    setSavingAll(true);
    const editEntries = Object.entries(localEdits);
    for (const [ruleId, edits] of editEntries) {
      const updates: Record<string, any> = {};
      if (edits.message_content !== undefined) updates.message_content = edits.message_content;
      if (edits.trigger_minutes !== undefined) updates.trigger_minutes = Math.max(5, edits.trigger_minutes ?? 5);
      if (edits.close_resolution_status !== undefined) updates.close_resolution_status = edits.close_resolution_status;
      await supabase.from("chat_auto_rules").update(updates).eq("id", ruleId);
      setRules((prev) => prev.map((r) => r.id === ruleId ? { ...r, ...updates } : r));
    }
    setLocalEdits({});
    toast({ title: t("chat.settings.rules.savedRule") });
    setSavingAll(false);
  };

  const getLocalValue = (rule: AutoRule, field: "message_content" | "trigger_minutes") => {
    const edit = localEdits[rule.id];
    if (edit && field in edit) return edit[field as keyof typeof edit];
    return rule[field];
  };

  const setLocalEdit = (ruleId: string, field: string, value: any) => {
    setLocalEdits((prev) => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], [field]: value },
    }));
  };

  const hasUnsavedChanges = (ruleId: string) => !!localEdits[ruleId];
  const hasAnyUnsavedChanges = Object.keys(localEdits).length > 0;

  // Reorder main flow rules
  const getOrderedMainFlowTypes = (): string[] => {
    // Use sort_order from rules if available, otherwise use default order
    const mainRules = MAIN_FLOW_TYPES.map((rt) => getRuleForType(rt)).filter(Boolean) as AutoRule[];
    const hasSortOrder = mainRules.some((r) => (r.sort_order ?? 0) > 0);
    if (hasSortOrder) {
      mainRules.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return mainRules.map((r) => r.rule_type);
    }
    return MAIN_FLOW_TYPES;
  };

  const moveMainFlowRule = async (ruleType: string, direction: "up" | "down") => {
    const ordered = getOrderedMainFlowTypes();
    const idx = ordered.indexOf(ruleType);
    if (direction === "up" && idx <= 0) return;
    if (direction === "down" && idx >= ordered.length - 1) return;

    const newOrdered = [...ordered];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newOrdered[idx], newOrdered[swapIdx]] = [newOrdered[swapIdx], newOrdered[idx]];

    // Update sort_order for all main flow rules
    const updates = newOrdered.map((rt, i) => {
      const rule = getRuleForType(rt);
      return rule ? { id: rule.id, sort_order: i + 1 } : null;
    }).filter(Boolean) as { id: string; sort_order: number }[];

    for (const u of updates) {
      await supabase.from("chat_auto_rules").update({ sort_order: u.sort_order }).eq("id", u.id);
    }

    setRules((prev) =>
      prev.map((r) => {
        const upd = updates.find((u) => u.id === r.id);
        return upd ? { ...r, sort_order: upd.sort_order } : r;
      })
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const orderedMainFlow = getOrderedMainFlowTypes();
  const otherTypes = AUTO_MESSAGE_TYPES.filter((t) => t.group === "other");

  const renderRuleAccordionItem = (cfg: AutoMessageTypeConfig, flowStep?: number, flowIndex?: number, flowTotal?: number) => {
    const rule = getRuleForType(cfg.rule_type);
    if (!rule) return null;
    const Icon = cfg.icon;
    const isDisabled = !rule.is_enabled;
    const isMainFlow = cfg.group === "main_flow";

    return (
      <AccordionItem key={rule.id} value={rule.id} className="border border-border/50 rounded-lg mb-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-0">
          {/* Reorder buttons for main flow */}
          {isMainFlow && flowIndex !== undefined && flowTotal !== undefined && (
            <div className="flex flex-col gap-0.5 mr-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                disabled={flowIndex === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  moveMainFlowRule(cfg.rule_type, "up");
                }}
                title={t("chat.autoMsg.moveUp")}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                disabled={flowIndex === flowTotal - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  moveMainFlowRule(cfg.rule_type, "down");
                }}
                title={t("chat.autoMsg.moveDown")}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          )}

          <AccordionTrigger className="flex-1 hover:no-underline py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {flowStep && (
                <div className="flex items-center justify-center rounded-full bg-primary text-primary-foreground w-6 h-6 text-xs font-bold shrink-0">
                  {flowStep}
                </div>
              )}
              <div className="rounded-md bg-primary/10 p-1.5">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium text-sm text-left flex-1 min-w-0 truncate">
                {t(`chat.autoMsg.${cfg.rule_type}.title`)}
              </span>
              <Badge
                variant={rule.is_enabled ? "promoter" : "secondary"}
                className="text-[10px] px-1.5 py-0 h-5 shrink-0"
              >
                {rule.is_enabled ? t("chat.autoMsg.active") : t("chat.autoMsg.inactive")}
              </Badge>
              {hasUnsavedChanges(rule.id) && (
                <div className="w-2 h-2 rounded-full bg-warning shrink-0" title={t("chat.autoMsg.pendingChanges")} />
              )}
            </div>
          </AccordionTrigger>

          <Switch
            checked={rule.is_enabled}
            onCheckedChange={(v) => toggleRule(rule, v)}
            className="ml-2 shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <AccordionContent className="px-4 pb-4 pt-0">
          <p className="text-xs text-muted-foreground mb-3">
            {t(`chat.autoMsg.${cfg.rule_type}.description`)}
          </p>
          <div className={`space-y-3 transition-opacity ${isDisabled ? "opacity-40 pointer-events-none" : ""}`}>
            {cfg.hasMinutes && (
              <div className="space-y-1.5">
                <Label className="text-xs">{t("chat.autoMsg.minutesLabel")}</Label>
                <Input
                  type="number"
                  min={5}
                  value={getLocalValue(rule, "trigger_minutes") ?? ""}
                  onChange={(e) => setLocalEdit(rule.id, "trigger_minutes", Math.max(5, Number(e.target.value) || 5))}
                  className="w-[120px]"
                />
                <p className="text-[11px] text-muted-foreground">{t("chat.autoMsg.minutesMin")}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("chat.settings.macros.content")}</Label>
              <Textarea
                value={(getLocalValue(rule, "message_content") as string) ?? ""}
                onChange={(e) => setLocalEdit(rule.id, "message_content", e.target.value)}
                rows={3}
              />
            </div>
            {cfg.rule_type === "auto_close" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Status ao encerrar automaticamente</Label>
                <Select
                  value={(() => {
                    const edit = localEdits[rule.id];
                    if (edit && edit.close_resolution_status !== undefined) return edit.close_resolution_status;
                    return rule.close_resolution_status ?? "inactive";
                  })()}
                  onValueChange={(v) => setLocalEdit(rule.id, "close_resolution_status", v)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="resolved">Resolvida</SelectItem>
                    <SelectItem value="inactive">Inativada</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Define o status da conversa quando encerrada automaticamente.</p>
              </div>
            )}
            {hasUnsavedChanges(rule.id) && (
              <Button
                size="sm"
                onClick={() => saveRule(rule)}
                disabled={savingId === rule.id}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {savingId === rule.id ? t("chat.settings.rules.savingRule") : t("common.save")}
              </Button>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("chat.settings.rules.title")}</CardTitle>
            <CardDescription>{t("chat.settings.rules.description")}</CardDescription>
          </div>
          {hasAnyUnsavedChanges && (
            <Button
              size="sm"
              onClick={saveAllChanges}
              disabled={savingAll}
              className="shrink-0"
            >
              <SaveAll className="h-3.5 w-3.5 mr-1.5" />
              {savingAll ? t("chat.settings.rules.savingRule") : t("chat.autoMsg.saveAll")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Main Flow Group with Timeline */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t("chat.autoMsg.mainFlowGroup")}
          </p>
          <div className="relative pl-4">
            {/* Vertical timeline line */}
            <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-border" />
            <Accordion type="multiple" className="space-y-2">
              {orderedMainFlow.map((ruleType, index) => {
                const cfg = AUTO_MESSAGE_TYPES.find((t) => t.rule_type === ruleType);
                if (!cfg) return null;
                return (
                  <div key={ruleType} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-4 top-4 z-10">
                      <div className="w-[15px] h-[15px] rounded-full bg-primary border-2 border-background flex items-center justify-center">
                        <span className="text-[8px] font-bold text-primary-foreground">{index + 1}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {renderRuleAccordionItem(cfg, index + 1, index, orderedMainFlow.length)}
                    </div>
                  </div>
                );
              })}
            </Accordion>
          </div>
        </div>

        {/* Other Messages Group */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t("chat.autoMsg.otherGroup")}
          </p>
          <Accordion type="multiple" className="space-y-2">
            {otherTypes.map((cfg) => renderRuleAccordionItem(cfg))}
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoMessagesTab;
