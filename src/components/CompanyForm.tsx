import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { CNPJInput, type CNPJData } from "@/components/CNPJInput";
import { CNPJPreview } from "@/components/CNPJPreview";
import { supabase } from "@/integrations/supabase/client";
import { CustomFieldsEditor } from "@/components/CustomFieldsEditor";

interface CompanyFormData {
  name: string;
  trade_name: string;
  email: string;
  phone: string;
  company_document: string;
  company_sector: string;
  external_id: string;
  street: string;
  street_number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  service_priority: string;
  service_category_id: string;
  custom_fields: Record<string, string>;
}

interface CompanyFormProps {
  initialData?: Partial<CompanyFormData>;
  onSubmit: (data: CompanyFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function CompanyForm({ initialData, onSubmit, onCancel, submitLabel }: CompanyFormProps) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [cnpjData, setCnpjData] = useState<CNPJData | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: initialData?.name || "",
    trade_name: initialData?.trade_name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    company_document: initialData?.company_document || "",
    company_sector: initialData?.company_sector || "",
    external_id: initialData?.external_id || "",
    street: initialData?.street || "",
    street_number: initialData?.street_number || "",
    complement: initialData?.complement || "",
    neighborhood: initialData?.neighborhood || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    zip_code: initialData?.zip_code || "",
    service_priority: initialData?.service_priority || "normal",
    service_category_id: initialData?.service_category_id || "",
    custom_fields: (initialData?.custom_fields as Record<string, string>) || {},
  });

  useEffect(() => {
    supabase.from("chat_service_categories").select("id, name, color").order("name").then(({ data }) => {
      setCategories(data ?? []);
    });
  }, []);

  const handleCNPJDataFetched = useCallback((data: CNPJData | null) => {
    setCnpjData(data);
  }, []);

  const handleUseCNPJData = useCallback(() => {
    if (cnpjData) {
      setFormData(prev => ({
        ...prev,
        name: cnpjData.razao_social || prev.name,
        trade_name: cnpjData.nome_fantasia || prev.trade_name,
        company_sector: cnpjData.cnae_fiscal_descricao || prev.company_sector,
        street: cnpjData.logradouro || prev.street,
        street_number: cnpjData.numero || prev.street_number,
        complement: cnpjData.complemento || prev.complement,
        neighborhood: cnpjData.bairro || prev.neighborhood,
        city: cnpjData.municipio || prev.city,
        state: cnpjData.uf || prev.state,
        zip_code: cnpjData.cep || prev.zip_code,
      }));
      setCnpjData(null);
    }
  }, [cnpjData]);

  const handleFillManually = useCallback(() => {
    setCnpjData(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(formData);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof CompanyFormData, value: string | Record<string, string>) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <CNPJInput
          value={formData.company_document}
          onChange={(value) => updateField("company_document", value)}
          onDataFetched={handleCNPJDataFetched}
        />
        
        {cnpjData && (
          <CNPJPreview
            data={cnpjData}
            onUseData={handleUseCNPJData}
            onFillManually={handleFillManually}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("companies.companyName")} *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder={t("companies.companyNamePlaceholder")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trade_name">{t("companies.tradeName")}</Label>
          <Input
            id="trade_name"
            value={formData.trade_name}
            onChange={(e) => updateField("trade_name", e.target.value)}
            placeholder={t("companies.tradeNamePlaceholder")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Label htmlFor="phone">{t("contacts.phone")}</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder={t("contacts.phonePlaceholder")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company_sector">{t("contacts.sector")}</Label>
          <Input
            id="company_sector"
            value={formData.company_sector}
            onChange={(e) => updateField("company_sector", e.target.value)}
            placeholder={t("contacts.sectorPlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="external_id">ID Externo</Label>
          <Input
            id="external_id"
            value={formData.external_id}
            onChange={(e) => updateField("external_id", e.target.value)}
            placeholder="Ex: EMP-123 (integração via widget)"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("chat.categories.servicePriority")}</Label>
          <Select value={formData.service_priority} onValueChange={(v) => updateField("service_priority", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t("chat.categories.priorityLow")}</SelectItem>
              <SelectItem value="normal">{t("chat.categories.priorityNormal")}</SelectItem>
              <SelectItem value="high">{t("chat.categories.priorityHigh")}</SelectItem>
              <SelectItem value="critical">{t("chat.categories.priorityCritical")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("chat.categories.serviceCategory")}</Label>
          <Select value={formData.service_category_id} onValueChange={(v) => updateField("service_category_id", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder={t("chat.categories.selectCategory")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="my-4" />

      <CustomFieldsEditor
        value={formData.custom_fields}
        onChange={(fields) => updateField("custom_fields", fields)}
      />

      <Separator className="my-4" />

      <div>
        <h4 className="font-medium mb-3">{t("address.title")}</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="street">{t("address.street")}</Label>
            <Input
              id="street"
              value={formData.street}
              onChange={(e) => updateField("street", e.target.value)}
              placeholder={t("address.streetPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="street_number">{t("address.number")}</Label>
            <Input
              id="street_number"
              value={formData.street_number}
              onChange={(e) => updateField("street_number", e.target.value)}
              placeholder={t("address.numberPlaceholder")}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="complement">{t("address.complement")}</Label>
            <Input
              id="complement"
              value={formData.complement}
              onChange={(e) => updateField("complement", e.target.value)}
              placeholder={t("address.complementPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="neighborhood">{t("address.neighborhood")}</Label>
            <Input
              id="neighborhood"
              value={formData.neighborhood}
              onChange={(e) => updateField("neighborhood", e.target.value)}
              placeholder={t("address.neighborhoodPlaceholder")}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="city">{t("address.city")}</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder={t("address.cityPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">{t("address.state")}</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => updateField("state", e.target.value)}
              placeholder={t("address.statePlaceholder")}
              maxLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip_code">{t("address.zipCode")}</Label>
            <Input
              id="zip_code"
              value={formData.zip_code}
              onChange={(e) => updateField("zip_code", e.target.value)}
              placeholder={t("address.zipCodePlaceholder")}
            />
          </div>
        </div>
      </div>

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
