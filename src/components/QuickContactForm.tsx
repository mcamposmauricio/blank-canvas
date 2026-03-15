import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CompanySelector } from "@/components/CompanySelector";
import { CustomFieldsEditor } from "@/components/CustomFieldsEditor";

interface QuickContactFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
  preselectedCompanyId?: string;
}

export const QuickContactForm = ({ onSuccess, onCancel, preselectedCompanyId }: QuickContactFormProps) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    company_id: preselectedCompanyId || "",
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    external_id: "",
    custom_fields: {} as Record<string, string>,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (preselectedCompanyId) {
      setFormData(prev => ({ ...prev, company_id: preselectedCompanyId }));
    }
  }, [preselectedCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_id) {
      toast({
        title: t("common.error"),
        description: t("companyContacts.selectCompany"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("auth.error"));

      // Check if this is the first contact for the company
      const { count } = await supabase
        .from("company_contacts")
        .select("*", { count: "exact", head: true })
        .eq("company_id", formData.company_id);

      const { error } = await supabase.from("company_contacts").insert({
        company_id: formData.company_id,
        user_id: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role || null,
        department: formData.department || null,
        external_id: formData.external_id || null,
        is_primary: count === 0,
        custom_fields: Object.keys(formData.custom_fields).length > 0 ? formData.custom_fields : {},
      } as any);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("contacts.addSuccess"),
      });

      setFormData({
        company_id: preselectedCompanyId || "",
        name: "",
        email: "",
        phone: "",
        role: "",
        department: "",
        external_id: "",
        custom_fields: {},
      });
      onSuccess();
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!preselectedCompanyId && (
        <div className="space-y-2">
          <Label>{t("companyContacts.selectCompany")} *</Label>
          <CompanySelector
            value={formData.company_id || null}
            onChange={(id) => setFormData({ ...formData, company_id: id || "" })}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">{t("contacts.name")} *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder={t("contacts.emailPlaceholder")}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{t("contacts.phone")}</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder={t("contacts.phonePlaceholder")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">{t("companyContacts.role")}</Label>
          <Input
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder={t("companyContacts.rolePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">{t("companyContacts.department")}</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder={t("companyContacts.departmentPlaceholder")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="external_id">{t("companyContacts.externalId")}</Label>
        <Input
          id="external_id"
          value={formData.external_id}
          onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
          placeholder={t("companyContacts.externalIdPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">
          {t("companyContacts.externalIdHelp")}
        </p>
      </div>

      <CustomFieldsEditor
        value={formData.custom_fields}
        onChange={(fields) => setFormData({ ...formData, custom_fields: fields })}
      />

      <div className="flex gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            {t("common.cancel")}
          </Button>
        )}
        <Button type="submit" disabled={saving} className="flex-1">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("contacts.addContact")}
        </Button>
      </div>
    </form>
  );
};
