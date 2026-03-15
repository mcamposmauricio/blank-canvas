import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { ExternalLink } from "lucide-react";

interface FieldDef {
  id: string;
  key: string;
  label: string;
  field_type: string;
  target: string;
  display_order: number | null;
  is_active: boolean;
}

interface CustomFieldsDisplayProps {
  fields: Record<string, any> | null | undefined;
  target?: "company" | "contact";
}

// ── Helpers ──

function isUrl(val: string) {
  return /^(https?:\/\/|www\.)/i.test(val);
}

function makeHref(val: string) {
  return val.startsWith("http") ? val : `https://${val}`;
}

function ClickableLink({ href, label }: { href: string; label?: string }) {
  const display = label ?? href.replace(/^https?:\/\//, "").slice(0, 40);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate inline-flex items-center gap-1">
      {display}
      <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
    </a>
  );
}

function autoLinkify(val: any): React.ReactNode {
  const str = String(val);
  if (isUrl(str)) return <ClickableLink href={makeHref(str)} />;
  return str;
}

// ── Complex type renderers (exported for reuse) ──

export function SimpleList({ items }: { items: any[] }) {
  return (
    <ul className="space-y-0.5 text-xs">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className="text-muted-foreground mt-1 shrink-0">•</span>
          <span className="break-words">{autoLinkify(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export function UrlList({ items }: { items: any[] }) {
  return (
    <ul className="space-y-1 text-xs">
      {items.map((item, i) => {
        const str = String(item);
        const href = str.startsWith("http") ? str : `https://${str}`;
        return (
          <li key={i}>
            <ClickableLink href={href} />
          </li>
        );
      })}
    </ul>
  );
}

export function ObjectList({ items }: { items: Record<string, any>[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((obj, i) => {
        if (typeof obj !== "object" || obj === null) {
          return <div key={i} className="text-xs break-words">{autoLinkify(obj)}</div>;
        }
        return (
          <div key={i} className="border border-border rounded-md p-2 space-y-1 bg-muted/30">
            {Object.entries(obj).map(([key, val]) => (
              <div key={key} className="flex items-start justify-between text-[11px] gap-2">
                <span className="text-muted-foreground shrink-0">{key}</span>
                <span className="font-medium text-right break-words max-w-[65%]">
                  {val != null && isUrl(String(val)) ? <ClickableLink href={makeHref(String(val))} /> : autoLinkify(val)}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function JsonDisplay({ obj }: { obj: Record<string, any> }) {
  if (typeof obj !== "object" || obj === null) {
    return <span className="text-xs break-words">{autoLinkify(obj)}</span>;
  }
  return (
    <div className="space-y-1 text-[11px]">
      {Object.entries(obj).map(([key, val]) => (
        <div key={key} className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground shrink-0">{key}</span>
          <span className="font-medium text-right break-words max-w-[65%]">
            {val != null && isUrl(String(val)) ? <ClickableLink href={makeHref(String(val))} /> : autoLinkify(val)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Detect if value is complex ──

export function isComplexValue(value: any, fieldType: string): boolean {
  if (["list", "list_url", "list_object", "json"].includes(fieldType)) return true;
  if (Array.isArray(value)) return true;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return true;
  return false;
}

// ── Smart format ──

function parseIfString(value: any): any {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null) return parsed;
    } catch {}
  }
  return value;
}

export function formatComplexValue(value: any, fieldType: string): React.ReactNode | null {
  const resolved = parseIfString(value);

  // Explicit types
  if (fieldType === "list" && Array.isArray(resolved)) return <SimpleList items={resolved} />;
  if (fieldType === "list_url" && Array.isArray(resolved)) return <UrlList items={resolved} />;
  if (fieldType === "list_object" && Array.isArray(resolved)) return <ObjectList items={resolved as Record<string, any>[]} />;
  if (fieldType === "json" && typeof resolved === "object" && !Array.isArray(resolved)) return <JsonDisplay obj={resolved} />;

  // Auto-detect for text or unknown types
  if (Array.isArray(resolved)) {
    if (resolved.length === 0) return null;
    if (typeof resolved[0] === "object" && resolved[0] !== null && typeof resolved[0] !== "string") return <ObjectList items={resolved as Record<string, any>[]} />;
    if (resolved.every(item => isUrl(String(item)))) return <UrlList items={resolved} />;
    return <SimpleList items={resolved} />;
  }

  if (typeof resolved === "object" && resolved !== null) return <JsonDisplay obj={resolved} />;

  return null;
}

function formatFieldValue(value: any, fieldType: string) {
  if (value === null || value === undefined || value === "") return null;

  // Check complex types first
  const complex = formatComplexValue(value, fieldType);
  if (complex) return complex;

  switch (fieldType) {
    case "decimal":
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
    case "integer":
      return Number(value).toLocaleString("pt-BR");
    case "date":
      try {
        return new Date(value).toLocaleDateString("pt-BR");
      } catch {
        return String(value);
      }
    case "url":
      return <ClickableLink href={makeHref(String(value))} />;
    case "boolean":
      return (
        <Badge variant={value === true || value === "true" ? "default" : "secondary"} className="text-[10px]">
          {value === true || value === "true" ? "Sim" : "Não"}
        </Badge>
      );
    default: {
      const str = String(value);
      if (isUrl(str)) return <ClickableLink href={makeHref(str)} />;
      return str;
    }
  }
}

export function CustomFieldsDisplay({ fields, target }: CustomFieldsDisplayProps) {
  const { t } = useLanguage();

  const { data: fieldDefs = [] } = useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_custom_field_definitions" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as any as FieldDef[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!fields || Object.keys(fields).length === 0) return null;

  const defsForTarget = target ? fieldDefs.filter((d) => d.target === target) : fieldDefs;
  const defsByKey = new Map(defsForTarget.map((d) => [d.key, d]));

  type DisplayEntry = { key: string; label: string; value: any; fieldType: string; order: number };
  const entries: DisplayEntry[] = [];

  for (const [key, val] of Object.entries(fields)) {
    if (val === null || val === undefined || val === "") continue;
    const def = defsByKey.get(key);
    if (def) {
      entries.push({ key, label: def.label, value: val, fieldType: def.field_type, order: def.display_order ?? 999 });
    } else {
      entries.push({ key, label: key, value: val, fieldType: "text", order: 9999 });
    }
  }

  entries.sort((a, b) => a.order - b.order);
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("customFields.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {entries.map((entry) => {
          const formatted = formatFieldValue(entry.value, entry.fieldType);
          if (formatted === null) return null;
          const complex = isComplexValue(parseIfString(entry.value), entry.fieldType);
          return (
            <div key={entry.key} className={complex ? "space-y-1" : "flex justify-between items-center"}>
              <span className="text-muted-foreground">{entry.label}</span>
              {complex ? (
                <div className="pl-1">{formatted}</div>
              ) : (
                <span className="font-medium text-right max-w-[60%] truncate">{formatted}</span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Compact version for use in cards/panels (no Card wrapper) */
export function CustomFieldsInline({
  fields,
  target,
  maxFields = 2,
}: CustomFieldsDisplayProps & { maxFields?: number }) {
  const { data: fieldDefs = [] } = useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_custom_field_definitions" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as any as FieldDef[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!fields || Object.keys(fields).length === 0) return null;

  const defsForTarget = target ? fieldDefs.filter((d) => d.target === target) : fieldDefs;
  const defsByKey = new Map(defsForTarget.map((d) => [d.key, d]));

  const entries: { key: string; label: string; value: any; fieldType: string; order: number }[] = [];

  for (const [key, val] of Object.entries(fields)) {
    if (val === null || val === undefined || val === "") continue;
    const def = defsByKey.get(key);
    if (def) {
      entries.push({ key, label: def.label, value: val, fieldType: def.field_type, order: def.display_order ?? 999 });
    }
  }

  entries.sort((a, b) => a.order - b.order);
  const visible = entries.slice(0, maxFields);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-1">
      {visible.map((entry) => {
        const formatted = formatFieldValue(entry.value, entry.fieldType);
        if (formatted === null) return null;
        const complex = isComplexValue(parseIfString(entry.value), entry.fieldType);
        return (
          <div key={entry.key} className={complex ? "space-y-1 text-xs" : "flex items-center justify-between text-xs"}>
            <span className="text-muted-foreground truncate mr-2">{entry.label}</span>
            {complex ? (
              <div className="pl-1">{formatted}</div>
            ) : (
              <span className="font-medium text-right truncate max-w-[60%]">{formatted}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
