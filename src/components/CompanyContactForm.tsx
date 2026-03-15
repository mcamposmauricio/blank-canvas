import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { PhoneInput } from "@/components/PhoneInput";
import { CustomFieldsEditor } from "@/components/CustomFieldsEditor";

interface CompanyContactFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  is_primary: boolean;
  external_id: string;
  custom_fields: Record<string, string>;
}

interface CompanyContactFormProps {
  initialData?: Partial<CompanyContactFormData>;
  onSubmit: (data: CompanyContactFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  showPrimaryOption?: boolean;
}

export function CompanyContactForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  submitLabel,
  showPrimaryOption = true 
}: CompanyContactFormProps) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyContactFormData>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    role: initialData?.role || "",
    department: initialData?.department || "",
    is_primary: initialData?.is_primary || false,
    external_id: initialData?.external_id || "",
    custom_fields: (initialData?.custom_fields as Record<string, string>) || {},
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(formData);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof CompanyContactFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("contacts.name")} *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder={t("companyContacts.namePlaceholder")}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t("contacts.email")} *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder={t("contacts.emailPlaceholder")}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{t("companyContacts.phone")} *</Label>
        <PhoneInput
          id="phone"
          value={formData.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          placeholder={t("contacts.phonePlaceholder")}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">{t("companyContacts.role")}</Label>
          <Input
            id="role"
            value={formData.role}
            onChange={(e) => updateField("role", e.target.value)}
            placeholder={t("companyContacts.rolePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">{t("companyContacts.department")}</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => updateField("department", e.target.value)}
            placeholder={t("companyContacts.departmentPlaceholder")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="external_id">{t("companyContacts.externalId")}</Label>
        <Input
          id="external_id"
          value={formData.external_id}
          onChange={(e) => updateField("external_id", e.target.value)}
          placeholder={t("companyContacts.externalIdPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">
          {t("companyContacts.externalIdHelp")}
        </p>
      </div>

      <CustomFieldsEditor
        value={formData.custom_fields}
        onChange={(fields) => updateField("custom_fields", fields as any)}
      />

      {showPrimaryOption && (
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="is_primary">{t("companyContacts.isPrimary")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("companyContacts.isPrimaryDescription")}
            </p>
          </div>
          <Switch
            id="is_primary"
            checked={formData.is_primary}
            onCheckedChange={(checked) => updateField("is_primary", checked)}
          />
        </div>
      )}

      <div className="flex gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            {t("common.cancel")}
          </Button>
        )}
        <Button type="submit" disabled={saving} className="flex-1">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel || t("common.save")}
        </Button>
      </div>
    </form>
  );
}
