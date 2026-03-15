import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

interface CustomFieldsEditorProps {
  value: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  fieldNames?: string[];
  maxFields?: number;
}

export function CustomFieldsEditor({
  value,
  onChange,
  fieldNames,
  maxFields = 10,
}: CustomFieldsEditorProps) {
  const { t } = useLanguage();

  const entries = Object.entries(value);
  const fixedKeys = fieldNames || [];
  const dynamicEntries = entries.filter(([key]) => !fixedKeys.includes(key));
  const totalCount = fixedKeys.length + dynamicEntries.length;

  const updateValue = (key: string, val: string) => {
    onChange({ ...value, [key]: val });
  };

  const addField = () => {
    if (totalCount >= maxFields) return;
    const newKey = `campo_${Date.now()}`;
    onChange({ ...value, [newKey]: "" });
  };

  const removeField = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  const renameField = (oldKey: string, newName: string) => {
    if (newName === oldKey) return;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
      next[k === oldKey ? newName : k] = v;
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{t("customFields.title")}</Label>

      {/* Fixed fields from config/import */}
      {fixedKeys.map((key) => (
        <div key={key} className="flex items-center gap-2">
          <Input
            value={key}
            disabled
            className="flex-1 bg-muted text-muted-foreground"
          />
          <Input
            value={value[key] || ""}
            onChange={(e) => updateValue(key, e.target.value)}
            placeholder={t("customFields.valuePlaceholder")}
            className="flex-1"
          />
        </div>
      ))}

      {/* Dynamic fields */}
      {dynamicEntries.map(([key, val]) => (
        <div key={key} className="flex items-center gap-2">
          <Input
            value={key.startsWith("campo_") ? "" : key}
            onChange={(e) => renameField(key, e.target.value || key)}
            placeholder={t("customFields.fieldNamePlaceholder")}
            className="flex-1"
          />
          <Input
            value={val}
            onChange={(e) => updateValue(key, e.target.value)}
            placeholder={t("customFields.valuePlaceholder")}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={() => removeField(key)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {totalCount < maxFields && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addField}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("customFields.addField")}
          <span className="text-muted-foreground ml-1 text-xs">
            ({totalCount}/{maxFields})
          </span>
        </Button>
      )}
    </div>
  );
}
