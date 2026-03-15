import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X, Loader2, Settings2, Database, FileText, Eye, Check, Building2, Save, Trash2, ArrowRight } from "lucide-react";

interface FieldRule {
  id: string;
  banner_id: string;
  field_key: string;
  field_value: string;
  field_source: string;
  operator: string;
}

interface FieldDef {
  key: string;
  label: string;
}

interface MatchedCompany {
  id: string;
  name: string;
  trade_name: string | null;
}

interface StagedRule {
  tempId: string;
  source: string;
  key: string;
  operator: string;
  value: string;
  matches: MatchedCompany[];
}

interface PreviewResult {
  existing: MatchedCompany[];
  toAdd: MatchedCompany[];
  toRemove: MatchedCompany[];
}

const NATIVE_FIELDS: { key: string; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Nome" },
  { key: "email", label: "Email" },
  { key: "company_document", label: "CNPJ" },
  { key: "company_sector", label: "Setor" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "Estado" },
  { key: "external_id", label: "ID Externo" },
  { key: "service_priority", label: "Prioridade" },
  { key: "cs_status", label: "Status CS" },
  { key: "mrr", label: "MRR", numeric: true },
  { key: "contract_value", label: "Valor Contrato", numeric: true },
  { key: "health_score", label: "Health Score", numeric: true },
];

const OPERATORS = [
  { value: "equals", label: "=" },
  { value: "greater_than", label: ">" },
  { value: "less_than", label: "<" },
  { value: "greater_or_equal", label: "≥" },
  { value: "less_or_equal", label: "≤" },
];

const OPERATOR_LABELS: Record<string, string> = {
  equals: "=",
  greater_than: ">",
  less_than: "<",
  greater_or_equal: "≥",
  less_or_equal: "≤",
};

function matchValue(rawVal: any, ruleValue: string, operator: string): boolean {
  if (operator === "equals") {
    return String(rawVal).toLowerCase() === ruleValue.toLowerCase();
  }
  const numA = Number(rawVal);
  const numB = Number(ruleValue);
  if (isNaN(numA) || isNaN(numB)) return false;
  switch (operator) {
    case "greater_than": return numA > numB;
    case "less_than": return numA < numB;
    case "greater_or_equal": return numA >= numB;
    case "less_or_equal": return numA <= numB;
    default: return String(rawVal).toLowerCase() === ruleValue.toLowerCase();
  }
}

interface Props {
  bannerId: string | null;
  rules: FieldRule[];
  onChanged: () => void;
}

export function BannerFieldRules({ bannerId, rules, onChanged }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([]);

  // Staging state
  const [stagedAdds, setStagedAdds] = useState<StagedRule[]>([]);
  const [stagedRemoveIds, setStagedRemoveIds] = useState<string[]>([]);

  // Add rule form state
  const [source, setSource] = useState<"custom" | "native">("native");
  const [selectedKey, setSelectedKey] = useState("");
  const [operator, setOperator] = useState("equals");
  const [value, setValue] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Preview state
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const bannerRules = rules.filter(r => r.banner_id === bannerId);
  const hasChanges = stagedAdds.length > 0 || stagedRemoveIds.length > 0;

  const getFieldLabel = (rule: { field_source: string; field_key: string }) => {
    if (rule.field_source === "native") {
      const nf = NATIVE_FIELDS.find(f => f.key === rule.field_key);
      return nf?.label || rule.field_key;
    }
    return fieldDefs.find(d => d.key === rule.field_key)?.label || rule.field_key;
  };

  const fetchAllCompanies = useCallback(async () => {
    const { data } = await supabase
      .from("contacts")
      .select("id, name, trade_name, custom_fields, company_sector, city, state, external_id, service_priority, cs_status, mrr, contract_value, health_score, email, company_document")
      .eq("is_company", true);
    return data || [];
  }, []);

  const fetchCompaniesAndMatch = useCallback(async (src: string, key: string, op: string, val: string): Promise<MatchedCompany[]> => {
    const companies = await fetchAllCompanies();
    const matches: MatchedCompany[] = [];
    for (const comp of companies) {
      const cf = (comp.custom_fields as Record<string, any>) || {};
      const rawVal = src === "native" ? (comp as any)[key] : cf[key];
      if (rawVal !== undefined && rawVal !== null && matchValue(rawVal, val, op)) {
        matches.push({ id: comp.id, name: comp.name, trade_name: comp.trade_name });
      }
    }
    return matches;
  }, [fetchAllCompanies]);

  const loadFieldDefs = async () => {
    const { data } = await supabase
      .from("chat_custom_field_definitions")
      .select("key, label")
      .eq("target", "company")
      .eq("is_active", true)
      .order("display_order");
    setFieldDefs((data ?? []) as FieldDef[]);
  };

  const handleOpenDialog = () => {
    loadFieldDefs();
    setPreviewResult(null);
    setDialogOpen(true);
  };

  const handleAddToStaging = async () => {
    if (!selectedKey || !value.trim()) return;
    setAddLoading(true);
    try {
      const matches = await fetchCompaniesAndMatch(source, selectedKey, operator, value.trim());
      const staged: StagedRule = {
        tempId: crypto.randomUUID(),
        source,
        key: selectedKey,
        operator,
        value: value.trim(),
        matches,
      };
      setStagedAdds(prev => [...prev, staged]);
      setValue("");
      setSelectedKey("");
      setOperator("equals");
      setPreviewResult(null); // invalidate preview
    } finally {
      setAddLoading(false);
    }
  };

  const removeStagedAdd = (tempId: string) => {
    setStagedAdds(prev => prev.filter(s => s.tempId !== tempId));
    setPreviewResult(null);
  };

  const toggleRemoveExisting = (ruleId: string) => {
    setStagedRemoveIds(prev =>
      prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
    );
    setPreviewResult(null);
  };

  // Build the effective rules list (existing minus removed + staged adds)
  const buildEffectiveRules = () => {
    const kept = bannerRules
      .filter(r => !stagedRemoveIds.includes(r.id))
      .map(r => ({ source: r.field_source, key: r.field_key, operator: r.operator, value: r.field_value }));
    const added = stagedAdds.map(s => ({ source: s.source, key: s.key, operator: s.operator, value: s.value }));
    return [...kept, ...added];
  };

  const handlePreview = async () => {
    if (!bannerId) return;
    setPreviewLoading(true);
    try {
      const companies = await fetchAllCompanies();
      const effectiveRules = buildEffectiveRules();

      // Apply AND logic: company must match ALL rules
      const matched: MatchedCompany[] = [];
      if (effectiveRules.length > 0) {
        for (const comp of companies) {
          const cf = (comp.custom_fields as Record<string, any>) || {};
          const allMatch = effectiveRules.every(rule => {
            const rawVal = rule.source === "native" ? (comp as any)[rule.key] : cf[rule.key];
            return rawVal !== undefined && rawVal !== null && matchValue(rawVal, rule.value, rule.operator);
          });
          if (allMatch) {
            matched.push({ id: comp.id, name: comp.name, trade_name: comp.trade_name });
          }
        }
      }

      // Fetch existing assignments
      const { data: existingAssignments } = await supabase
        .from("chat_banner_assignments")
        .select("contact_id")
        .eq("banner_id", bannerId);

      const existingIds = new Set((existingAssignments || []).map(a => a.contact_id));
      const matchedIds = new Set(matched.map(m => m.id));

      const existing = matched.filter(m => existingIds.has(m.id));
      const toAdd = matched.filter(m => !existingIds.has(m.id));

      // Companies that have assignments but no longer match
      const toRemoveIds = [...existingIds].filter(id => !matchedIds.has(id));
      const toRemove: MatchedCompany[] = [];
      for (const id of toRemoveIds) {
        const comp = companies.find(c => c.id === id);
        if (comp) toRemove.push({ id: comp.id, name: comp.name, trade_name: comp.trade_name });
      }

      setPreviewResult({ existing, toAdd, toRemove });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (!bannerId) return;
    setSaving(true);
    try {
      const { data: bannerData } = await supabase
        .from("chat_banners")
        .select("tenant_id")
        .eq("id", bannerId)
        .single();

      const tenantId = (bannerData as any)?.tenant_id;

      // Delete removed rules
      for (const ruleId of stagedRemoveIds) {
        await supabase.from("chat_banner_field_rules" as any).delete().eq("id", ruleId);
      }

      // Insert new rules
      for (const staged of stagedAdds) {
        await supabase.from("chat_banner_field_rules" as any).insert({
          banner_id: bannerId,
          tenant_id: tenantId,
          field_key: staged.key,
          field_value: staged.value,
          field_source: staged.source,
          operator: staged.operator,
        });
      }

      // Sync assignments: fetch final rules from DB, apply AND, create missing assignments
      const { data: finalRulesData } = await supabase
        .from("chat_banner_field_rules" as any)
        .select("field_key, field_value, field_source, operator")
        .eq("banner_id", bannerId);

      const finalRules = (finalRulesData as any[]) || [];

      if (finalRules.length > 0) {
        const companies = await fetchAllCompanies();
        const { data: existingAssignments } = await supabase
          .from("chat_banner_assignments")
          .select("contact_id")
          .eq("banner_id", bannerId);

        const existingIds = new Set((existingAssignments || []).map(a => a.contact_id));

        const toInsert: { banner_id: string; contact_id: string; tenant_id: string }[] = [];
        for (const comp of companies) {
          const cf = (comp.custom_fields as Record<string, any>) || {};
          const allMatch = finalRules.every((rule: any) => {
            const rawVal = rule.field_source === "native" ? (comp as any)[rule.field_key] : cf[rule.field_key];
            return rawVal !== undefined && rawVal !== null && matchValue(rawVal, rule.field_value, rule.operator);
          });
          if (allMatch && !existingIds.has(comp.id)) {
            toInsert.push({ banner_id: bannerId, contact_id: comp.id, tenant_id: tenantId });
          }
        }

        // Batch insert in chunks of 100
        for (let i = 0; i < toInsert.length; i += 100) {
          const chunk = toInsert.slice(i, i + 100);
          await supabase.from("chat_banner_assignments").insert(chunk);
        }
      }

      setStagedAdds([]);
      setStagedRemoveIds([]);
      setPreviewResult(null);
      toast({ title: t("chat.settings.saved") });
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      setStagedAdds([]);
      setStagedRemoveIds([]);
      setPreviewResult(null);
    }
    setDialogOpen(open);
  };

  const fieldOptions = source === "native"
    ? NATIVE_FIELDS.map(f => ({ key: f.key, label: f.label }))
    : fieldDefs;

  const totalRulesCount = bannerRules.length + stagedAdds.length - stagedRemoveIds.length;

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="text-xs h-7 gap-1.5"
        onClick={handleOpenDialog}
      >
        <Settings2 className="h-3 w-3" />
        Regras de segmentação ({totalRulesCount})
      </Button>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Regras de Segmentação Automática</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-4">
              {/* Existing (persisted) rules */}
              {bannerRules.length === 0 && stagedAdds.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma regra configurada. Adicione regras para segmentar automaticamente as empresas.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {bannerRules.map(rule => {
                    const isMarkedForRemoval = stagedRemoveIds.includes(rule.id);
                    return (
                      <div
                        key={rule.id}
                        className={`flex items-center gap-2 text-sm rounded-md px-3 py-1.5 transition-all ${
                          isMarkedForRemoval
                            ? "bg-destructive/10 line-through opacity-60"
                            : "bg-secondary/50"
                        }`}
                      >
                        {rule.field_source === "native" ? (
                          <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-medium">{getFieldLabel(rule)}</span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {OPERATOR_LABELS[rule.operator] || "="}
                        </Badge>
                        <span className="text-muted-foreground">"{rule.field_value}"</span>
                        <button
                          onClick={() => toggleRemoveExisting(rule.id)}
                          className={`ml-auto ${isMarkedForRemoval ? "text-primary hover:text-primary/80" : "hover:text-destructive"}`}
                          title={isMarkedForRemoval ? "Desfazer remoção" : "Marcar para remoção"}
                        >
                          {isMarkedForRemoval ? <Plus className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Staged additions */}
              {stagedAdds.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-primary flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Novas regras (não salvas)
                  </p>
                  {stagedAdds.map(staged => (
                    <div key={staged.tempId} className="rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        {staged.source === "native" ? (
                          <Database className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        <span className="font-medium">
                          {getFieldLabel({ field_source: staged.source, field_key: staged.key })}
                        </span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {OPERATOR_LABELS[staged.operator] || "="}
                        </Badge>
                        <span className="text-muted-foreground">"{staged.value}"</span>
                        <button onClick={() => removeStagedAdd(staged.tempId)} className="ml-auto hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>
                          {staged.matches.length > 0
                            ? `${staged.matches.length} empresa(s) correspondem`
                            : "Nenhuma empresa corresponde"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add rule form */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-medium">Adicionar nova regra</p>

                {/* Source selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Fonte do campo</Label>
                  <RadioGroup
                    value={source}
                    onValueChange={(v) => { setSource(v as "custom" | "native"); setSelectedKey(""); }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="native" id="src-native-banner" />
                      <Label htmlFor="src-native-banner" className="text-xs cursor-pointer">Campo nativo</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="custom" id="src-custom-banner" />
                      <Label htmlFor="src-custom-banner" className="text-xs cursor-pointer">Campo customizado</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Field + Operator + Value + Add button */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Campo</Label>
                    <select
                      className="w-full text-xs border rounded-md px-2 py-1.5 bg-background"
                      value={selectedKey}
                      onChange={(e) => setSelectedKey(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {fieldOptions.map(d => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-16 space-y-1">
                    <Label className="text-xs">Operador</Label>
                    <select
                      className="w-full text-xs border rounded-md px-2 py-1.5 bg-background"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                    >
                      {OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Valor</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Valor"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddToStaging(); }}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs px-2.5 gap-1"
                    onClick={handleAddToStaging}
                    disabled={!selectedKey || !value.trim() || addLoading}
                  >
                    {addLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Preview button */}
              {(bannerRules.length > 0 || stagedAdds.length > 0) && (
                <div className="border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-1.5"
                    onClick={handlePreview}
                    disabled={previewLoading || totalRulesCount === 0}
                  >
                    {previewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                    Pré-visualizar empresas afetadas
                  </Button>
                </div>
              )}

              {/* Preview results */}
              {previewResult && (
                <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Building2 className="h-4 w-4" />
                    <span>
                      {previewResult.existing.length + previewResult.toAdd.length} empresa(s) correspondem às regras
                    </span>
                  </div>

                  {/* Summary badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {previewResult.existing.length > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        {previewResult.existing.length} já vinculada(s)
                      </Badge>
                    )}
                    {previewResult.toAdd.length > 0 && (
                      <Badge variant="promoter" className="gap-1">
                        <ArrowRight className="h-3 w-3" />
                        {previewResult.toAdd.length} será(ão) adicionada(s)
                      </Badge>
                    )}
                    {previewResult.toRemove.length > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <X className="h-3 w-3" />
                        {previewResult.toRemove.length} não corresponde(m) mais
                      </Badge>
                    )}
                  </div>

                  {/* Company list */}
                  <ScrollArea className="max-h-40">
                    <div className="space-y-0.5">
                      {previewResult.toAdd.map(c => (
                        <div key={c.id} className="flex items-center gap-2 text-xs py-0.5">
                          <Badge variant="promoter" className="text-[10px] px-1 py-0 shrink-0">Nova</Badge>
                          <span>{c.trade_name || c.name}</span>
                        </div>
                      ))}
                      {previewResult.existing.map(c => (
                        <div key={c.id} className="flex items-center gap-2 text-xs py-0.5 text-muted-foreground">
                          <Check className="h-3 w-3 shrink-0" />
                          <span>{c.trade_name || c.name}</span>
                        </div>
                      ))}
                      {previewResult.toRemove.map(c => (
                        <div key={c.id} className="flex items-center gap-2 text-xs py-0.5 text-destructive line-through opacity-60">
                          <X className="h-3 w-3 shrink-0" />
                          <span>{c.trade_name || c.name}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button variant="outline" onClick={() => handleCloseDialog(false)}>
              {t("common.close")}
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={!hasChanges || saving || !bannerId}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BannerFieldRules;
