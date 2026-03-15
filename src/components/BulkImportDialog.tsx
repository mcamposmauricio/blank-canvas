import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Upload, Plus, X, FileUp, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Papa from "papaparse";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "companies" | "contacts";
  onSuccess: () => void;
}

const COMPANY_FIXED_COLUMNS = [
  "nome", "email", "telefone", "cnpj", "nome_fantasia", "setor",
  "rua", "numero", "complemento", "bairro", "cidade", "estado", "cep",
  "external_id",
];

const CONTACT_FIXED_COLUMNS = [
  "nome", "email", "telefone", "cargo", "departamento",
  "contato_principal", "empresa_email", "external_id",
];

type Step = "config" | "instructions" | "upload" | "processing" | "done";

interface ParsedRow {
  data: Record<string, string>;
  errors: string[];
  valid: boolean;
}

export function BulkImportDialog({ open, onOpenChange, type, onSuccess }: BulkImportDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("config");
  const [customFieldNames, setCustomFieldNames] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: number; errorDetails: string[] }>({
    success: 0, errors: 0, errorDetails: [],
  });

  const fixedColumns = type === "companies" ? COMPANY_FIXED_COLUMNS : CONTACT_FIXED_COLUMNS;

  const resetState = () => {
    setStep("config");
    setCustomFieldNames([]);
    setParsedRows([]);
    setProgress(0);
    setImportResult({ success: 0, errors: 0, errorDetails: [] });
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  // Custom fields config
  const addCustomField = () => {
    if (customFieldNames.length >= 10) return;
    setCustomFieldNames([...customFieldNames, ""]);
  };

  const updateCustomField = (index: number, value: string) => {
    const next = [...customFieldNames];
    next[index] = value;
    setCustomFieldNames(next);
  };

  const removeCustomField = (index: number) => {
    setCustomFieldNames(customFieldNames.filter((_, i) => i !== index));
  };

  // CSV template download
  const downloadTemplate = () => {
    const validCustomFields = customFieldNames.filter(Boolean);
    const allColumns = [...fixedColumns, ...validCustomFields];
    const csv = Papa.unparse({ fields: allColumns, data: [] });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `modelo_${type === "companies" ? "empresas" : "contatos"}.csv`;
    link.click();
  };

  // CSV parse with duplicate validation
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fetch existing data for duplicate checking
    let existingEmails = new Set<string>();
    let existingCnpjs = new Set<string>();
    let existingContactEmails = new Map<string, Set<string>>(); // companyEmail -> Set<contactEmail>

    if (type === "companies") {
      const { data: existing } = await supabase
        .from("contacts")
        .select("email, company_document")
        .eq("is_company", true);
      if (existing) {
        existingEmails = new Set(existing.map(c => c.email?.toLowerCase().trim()).filter(Boolean));
        existingCnpjs = new Set(
          existing.map(c => c.company_document?.replace(/\D/g, "")).filter(Boolean) as string[]
        );
      }
    } else {
      // For contacts, fetch existing company contacts grouped by company email
      const { data: companies } = await supabase
        .from("contacts")
        .select("id, email")
        .eq("is_company", true);
      if (companies && companies.length > 0) {
        const companyIds = companies.map(c => c.id);
        const { data: contacts } = await supabase
          .from("company_contacts")
          .select("email, company_id")
          .in("company_id", companyIds);
        if (contacts) {
          const companyIdToEmail = new Map(companies.map(c => [c.id, c.email?.toLowerCase().trim()]));
          for (const contact of contacts) {
            const compEmail = companyIdToEmail.get(contact.company_id) || "";
            if (!existingContactEmails.has(compEmail)) {
              existingContactEmails.set(compEmail, new Set());
            }
            existingContactEmails.get(compEmail)!.add(contact.email?.toLowerCase().trim());
          }
        }
      }
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const seenEmails = new Set<string>();
        const seenCnpjs = new Set<string>();

        const rows: ParsedRow[] = (results.data as Record<string, string>[]).map((row) => {
          const errors: string[] = [];
          if (!row.nome?.trim()) errors.push(t("bulkImport.errorNameRequired"));
          if (!row.email?.trim()) errors.push(t("bulkImport.errorEmailRequired"));
          
          const emailLower = row.email?.trim().toLowerCase() || "";
          if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
            errors.push(t("bulkImport.errorEmailInvalid"));
          }

          if (type === "companies") {
            // Check duplicate email against DB
            if (emailLower && existingEmails.has(emailLower)) {
              errors.push(t("bulkImport.errorDuplicateEmail"));
            }
            // Check duplicate email within CSV
            if (emailLower && seenEmails.has(emailLower)) {
              errors.push(t("bulkImport.errorDuplicateInFile"));
            }
            if (emailLower) seenEmails.add(emailLower);

            // Check duplicate CNPJ
            const cnpjClean = row.cnpj?.replace(/\D/g, "") || "";
            if (cnpjClean) {
              if (existingCnpjs.has(cnpjClean)) {
                errors.push(t("bulkImport.errorDuplicateCnpj"));
              }
              if (seenCnpjs.has(cnpjClean)) {
                errors.push(t("bulkImport.errorDuplicateInFile"));
              }
              seenCnpjs.add(cnpjClean);
            }
          } else {
            // Contacts
            if (!row.empresa_email?.trim()) {
              errors.push(t("bulkImport.errorCompanyEmailRequired"));
            } else {
              const compEmail = row.empresa_email.trim().toLowerCase();
              const existingSet = existingContactEmails.get(compEmail);
              if (existingSet && emailLower && existingSet.has(emailLower)) {
                errors.push(t("bulkImport.errorContactDuplicate"));
              }
            }
            // Check duplicate within CSV (same email + same company)
            const csvKey = `${emailLower}|${row.empresa_email?.trim().toLowerCase() || ""}`;
            if (emailLower && seenEmails.has(csvKey)) {
              errors.push(t("bulkImport.errorDuplicateInFile"));
            }
            if (emailLower) seenEmails.add(csvKey);
          }

          return { data: row, errors, valid: errors.length === 0 };
        });
        setParsedRows(rows);
        setStep("upload");
      },
      error: () => {
        toast({ title: t("common.error"), description: t("bulkImport.parseError"), variant: "destructive" });
      },
    });

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [type, t, toast]);

  const validRows = parsedRows.filter((r) => r.valid);
  const errorRows = parsedRows.filter((r) => !r.valid);

  // Import logic
  const handleImport = async () => {
    setStep("processing");
    setProgress(0);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: t("common.error"), description: t("auth.error"), variant: "destructive" });
      return;
    }

    const validCustomFields = customFieldNames.filter(Boolean);
    let success = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    const batchSize = 50;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);

      if (type === "companies") {
        const records = batch.map((row) => {
          const customFields: Record<string, string> = {};
          for (const key of validCustomFields) {
            if (row.data[key]) customFields[key] = row.data[key];
          }
          // Also detect extra columns not in fixed list
          for (const [k, v] of Object.entries(row.data)) {
            if (!fixedColumns.includes(k) && !validCustomFields.includes(k) && v) {
              customFields[k] = v;
            }
          }
          return {
            user_id: user.id,
            name: row.data.nome?.trim(),
            email: row.data.email?.trim() || null,
            phone: row.data.telefone?.trim() || null,
            company_document: row.data.cnpj?.trim() || null,
            trade_name: row.data.nome_fantasia?.trim() || null,
            company_sector: row.data.setor?.trim() || null,
            external_id: row.data.external_id?.trim() || null,
            street: row.data.rua?.trim() || null,
            street_number: row.data.numero?.trim() || null,
            complement: row.data.complemento?.trim() || null,
            neighborhood: row.data.bairro?.trim() || null,
            city: row.data.cidade?.trim() || null,
            state: row.data.estado?.trim() || null,
            zip_code: row.data.cep?.trim() || null,
            is_company: true,
            custom_fields: Object.keys(customFields).length > 0 ? customFields : {},
          };
        });

        const { error, data } = await supabase.from("contacts").insert(records as any).select("id");
        if (error) {
          errors += batch.length;
          errorDetails.push(`${t("bulkImport.batchError")}: ${error.message}`);
        } else {
          success += data?.length || 0;
        }
      } else {
        // Contacts - need to resolve company_id via empresa_email
        for (const row of batch) {
          try {
            const companyEmail = row.data.empresa_email?.trim();
            const { data: company } = await supabase
              .from("contacts")
              .select("id")
              .eq("email", companyEmail)
              .eq("is_company", true)
              .maybeSingle();

            if (!company) {
              errors++;
              errorDetails.push(`${row.data.email}: ${t("bulkImport.companyNotFound")} (${companyEmail})`);
              continue;
            }

            const customFields: Record<string, string> = {};
            for (const key of validCustomFields) {
              if (row.data[key]) customFields[key] = row.data[key];
            }
            for (const [k, v] of Object.entries(row.data)) {
              if (!fixedColumns.includes(k) && !validCustomFields.includes(k) && v) {
                customFields[k] = v;
              }
            }

            const isPrimary = row.data.contato_principal?.trim().toLowerCase();

            const { error } = await supabase.from("company_contacts").insert({
              company_id: company.id,
              user_id: user.id,
              name: row.data.nome?.trim(),
              email: row.data.email?.trim(),
              phone: row.data.telefone?.trim() || null,
              role: row.data.cargo?.trim() || null,
              department: row.data.departamento?.trim() || null,
              is_primary: isPrimary === "sim" || isPrimary === "yes" || isPrimary === "true",
              external_id: row.data.external_id?.trim() || null,
              custom_fields: Object.keys(customFields).length > 0 ? customFields : {},
            } as any);

            if (error) {
              errors++;
              errorDetails.push(`${row.data.email}: ${error.message}`);
            } else {
              success++;
            }
          } catch (err: any) {
            errors++;
            errorDetails.push(`${row.data.email}: ${err.message}`);
          }
        }
      }

      setProgress(Math.round(((i + batch.length) / validRows.length) * 100));
    }

    setImportResult({ success, errors, errorDetails });
    setStep("done");
    if (success > 0) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === "companies" ? t("bulkImport.titleCompanies") : t("bulkImport.titleContacts")}
          </DialogTitle>
        </DialogHeader>

        {/* Step: Config custom fields */}
        {step === "config" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("bulkImport.configDescription")}</p>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("customFields.title")}</Label>
              {customFieldNames.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={name}
                    onChange={(e) => updateCustomField(idx, e.target.value)}
                    placeholder={t("customFields.fieldNamePlaceholder")}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomField(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {customFieldNames.length < 10 && (
                <Button type="button" variant="outline" size="sm" onClick={addCustomField} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  {t("customFields.addField")} ({customFieldNames.length}/10)
                </Button>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => handleClose(false)} className="flex-1">
                {t("common.cancel")}
              </Button>
              <Button onClick={() => setStep("instructions")} className="flex-1">
                {t("bulkImport.next")}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Instructions & Download */}
        {step === "instructions" && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium">{t("bulkImport.instructionsTitle")}</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>{t("bulkImport.step1")}</li>
                <li>{t("bulkImport.step2")}</li>
                <li>{t("bulkImport.step3")}</li>
                {type === "contacts" && <li>{t("bulkImport.step4CompanyEmail")}</li>}
                {type === "contacts" && (
                  <li className="text-primary font-medium">{t("bulkImport.step5ExternalId")}</li>
                )}
                <li>{t("bulkImport.step6Upload")}</li>
              </ol>
            </div>

            <Button variant="outline" className="w-full" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              {t("bulkImport.downloadTemplate")}
            </Button>

            <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t("bulkImport.dropzone")}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("config")} className="flex-1">
                {t("bulkImport.back")}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Upload preview */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="default" className="bg-primary">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {validRows.length} {t("bulkImport.valid")}
              </Badge>
              {errorRows.length > 0 && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errorRows.length} {t("bulkImport.withErrors")}
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">{t("contacts.name")}</th>
                    <th className="p-2 text-left">{t("contacts.email")}</th>
                    <th className="p-2 text-left">{t("bulkImport.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 100).map((row, idx) => (
                    <tr key={idx} className={row.valid ? "" : "bg-destructive/10"}>
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">{row.data.nome || "-"}</td>
                      <td className="p-2">{row.data.email || "-"}</td>
                      <td className="p-2">
                        {row.valid ? (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        ) : (
                          <span className="text-destructive">{row.errors.join(", ")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setParsedRows([]); setStep("instructions"); }} className="flex-1">
                {t("bulkImport.back")}
              </Button>
              <Button onClick={handleImport} disabled={validRows.length === 0} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                {t("bulkImport.import")} {validRows.length} {t("bulkImport.records")}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">{t("bulkImport.processing")}</p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-primary mb-2" />
              <p className="text-lg font-medium">{t("bulkImport.complete")}</p>
            </div>

            <div className="flex items-center gap-4 justify-center">
              <Badge variant="default" className="bg-primary">
                {importResult.success} {t("bulkImport.imported")}
              </Badge>
              {importResult.errors > 0 && (
                <Badge variant="destructive">
                  {importResult.errors} {t("bulkImport.failed")}
                </Badge>
              )}
            </div>

            {importResult.errorDetails.length > 0 && (
              <ScrollArea className="h-[200px] border rounded-lg p-3">
                <div className="space-y-1 text-xs text-destructive">
                  {importResult.errorDetails.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              </ScrollArea>
            )}

            <Button onClick={() => handleClose(false)} className="w-full">
              {t("bulkImport.close")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
