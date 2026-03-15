import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { Copy, Check, Key, Globe, FileJson, BookOpen, MessageSquare } from "lucide-react";
import ImportApiKeysTab from "@/components/ImportApiKeysTab";

const ExternalApiTab = () => {
  const { t } = useLanguage();
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const endpointUrl = `${supabaseUrl}/functions/v1/import-external-data`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItems(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedItems(prev => ({ ...prev, [id]: false })), 2000);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(text, id)} className="h-7 px-2">
      {copiedItems[id] ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );

  const companiesPayload = `{
  "type": "companies",
  "data": [
    {
      "nome": "Empresa X Ltda",
      "email": "contato@empresax.com",
      "telefone": "(11) 99999-9999",
      "cnpj": "12.345.678/0001-90",
      "nome_fantasia": "Empresa X",
      "setor": "Tecnologia",
      "rua": "Rua das Flores",
      "numero": "123",
      "complemento": "Sala 4",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01001-000",
      "custom_fields": {
        "plano": "Enterprise",
        "origem": "Parceiro",
        "segmento": "B2B"
      }
    }
  ],
  "skip_duplicates": true
}`;

  const contactsPayload = `{
  "type": "contacts",
  "data": [
    {
      "nome": "João Silva",
      "email": "joao@empresax.com",
      "telefone": "(11) 98888-7777",
      "cargo": "Diretor Comercial",
      "departamento": "Comercial",
      "contato_principal": true,
      "empresa_email": "contato@empresax.com",
      "external_id": "usr_12345",
      "custom_fields": {
        "nivel_acesso": "admin",
        "data_onboarding": "2025-01-15"
      }
    }
  ],
  "skip_duplicates": true
}`;

  const companiesUpdatePayload = `{
  "type": "companies",
  "update_existing": true,
  "data": [
    {
      "nome": "Empresa X Ltda",
      "email": "contato@empresax.com",
      "telefone": "(11) 91111-2222",
      "setor": "Tecnologia e Inovação",
      "custom_fields": {
        "plano": "Enterprise Plus"
      }
    }
  ]
}`;

  const contactsUpdatePayload = `{
  "type": "contacts",
  "update_existing": true,
  "data": [
    {
      "nome": "João Silva",
      "email": "joao@empresax.com",
      "empresa_email": "contato@empresax.com",
      "cargo": "VP Comercial",
      "custom_fields": {
        "nivel_acesso": "superadmin"
      }
    }
  ]
}`;

  const curlCompanies = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_IMPORT_API_KEY" \\
  -d '${companiesPayload}'`;

  const curlContacts = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_IMPORT_API_KEY" \\
  -d '${contactsPayload}'`;

  const successResponse = `{
  "success": true,
  "summary": {
    "total": 10,
    "imported": 6,
    "updated": 2,
    "skipped": 1,
    "errors": [
      {
        "row": 3,
        "email": "invalido@",
        "reason": "Invalid email"
      }
    ]
  }
}`;

  const companyFields = [
    { name: "nome", required: true, type: "string", desc: t("externalApi.fields.nome") },
    { name: "email", required: true, type: "string", desc: t("externalApi.fields.email") },
    { name: "telefone", required: false, type: "string", desc: t("externalApi.fields.telefone") },
    { name: "cnpj", required: false, type: "string", desc: t("externalApi.fields.cnpj") },
    { name: "nome_fantasia", required: false, type: "string", desc: t("externalApi.fields.nomeFantasia") },
    { name: "setor", required: false, type: "string", desc: t("externalApi.fields.setor") },
    { name: "rua", required: false, type: "string", desc: t("externalApi.fields.rua") },
    { name: "numero", required: false, type: "string", desc: t("externalApi.fields.numero") },
    { name: "complemento", required: false, type: "string", desc: t("externalApi.fields.complemento") },
    { name: "bairro", required: false, type: "string", desc: t("externalApi.fields.bairro") },
    { name: "cidade", required: false, type: "string", desc: t("externalApi.fields.cidade") },
    { name: "estado", required: false, type: "string", desc: t("externalApi.fields.estado") },
    { name: "cep", required: false, type: "string", desc: t("externalApi.fields.cep") },
    { name: "custom_fields", required: false, type: "object", desc: t("externalApi.fields.customFields") },
  ];

  const contactFields = [
    { name: "nome", required: true, type: "string", desc: t("externalApi.fields.nome") },
    { name: "email", required: true, type: "string", desc: t("externalApi.fields.contactEmail") },
    { name: "empresa_email", required: true, type: "string", desc: t("externalApi.fields.empresaEmail") },
    { name: "telefone", required: false, type: "string", desc: t("externalApi.fields.telefone") },
    { name: "cargo", required: false, type: "string", desc: t("externalApi.fields.cargo") },
    { name: "departamento", required: false, type: "string", desc: t("externalApi.fields.departamento") },
    { name: "contato_principal", required: false, type: "boolean", desc: t("externalApi.fields.contatoPrincipal") },
    { name: "external_id", required: false, type: "string", desc: t("externalApi.fields.externalId"), recommended: true },
    { name: "custom_fields", required: false, type: "object", desc: t("externalApi.fields.customFields") },
  ];

  const errorResponses = [
    { status: "401", scenario: t("externalApi.errors.invalidKey"), body: '{ "error": "Invalid or inactive API key" }' },
    { status: "400", scenario: t("externalApi.errors.invalidPayload"), body: '{ "error": "type and data are required" }' },
    { status: "400", scenario: t("externalApi.errors.invalidType"), body: '{ "error": "type must be \'companies\' or \'contacts\'" }' },
    { status: "400", scenario: t("externalApi.errors.emptyData"), body: '{ "error": "data must be a non-empty array" }' },
    { status: "400", scenario: t("externalApi.errors.maxRecords"), body: '{ "error": "Maximum 500 records per request" }' },
    { status: "500", scenario: t("externalApi.errors.internal"), body: '{ "error": "Internal server error" }' },
  ];

  return (
    <div className="space-y-6">
      {/* Section 1: API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t("externalApi.keysTitle")}
          </CardTitle>
          <CardDescription>{t("externalApi.keysDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ImportApiKeysTab />
        </CardContent>
      </Card>

      {/* Section 2: Endpoint & Auth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("externalApi.endpointTitle")}
          </CardTitle>
          <CardDescription>{t("externalApi.endpointDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("externalApi.endpoint")}</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all">
                POST {endpointUrl}
              </code>
              <CopyButton text={endpointUrl} id="endpoint" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t("externalApi.authTitle")}</label>
            <p className="text-sm text-muted-foreground mt-1">{t("externalApi.authDescription")}</p>
            <code className="block bg-muted px-3 py-2 rounded-md text-sm font-mono mt-2">
              x-api-key: import_xxxxxxxxxx...
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Payloads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            {t("externalApi.payloadsTitle")}
          </CardTitle>
          <CardDescription>{t("externalApi.payloadsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="companies-json">
            <TabsList className="w-full flex-wrap h-auto gap-1">
              <TabsTrigger value="companies-json">{t("externalApi.companiesJson")}</TabsTrigger>
              <TabsTrigger value="contacts-json">{t("externalApi.contactsJson")}</TabsTrigger>
              <TabsTrigger value="companies-update">{t("externalApi.companiesJsonUpdate")}</TabsTrigger>
              <TabsTrigger value="contacts-update">{t("externalApi.contactsJsonUpdate")}</TabsTrigger>
              <TabsTrigger value="curl-companies">cURL {t("externalApi.companies")}</TabsTrigger>
              <TabsTrigger value="curl-contacts">cURL {t("externalApi.contacts")}</TabsTrigger>
            </TabsList>
            <TabsContent value="companies-json">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-96"><code>{companiesPayload}</code></pre>
                <CopyButton text={companiesPayload} id="companies-json" />
              </div>
            </TabsContent>
            <TabsContent value="contacts-json">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-96"><code>{contactsPayload}</code></pre>
                <CopyButton text={contactsPayload} id="contacts-json" />
              </div>
            </TabsContent>
            <TabsContent value="companies-update">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-96"><code>{companiesUpdatePayload}</code></pre>
                <CopyButton text={companiesUpdatePayload} id="companies-update" />
              </div>
            </TabsContent>
            <TabsContent value="contacts-update">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-96"><code>{contactsUpdatePayload}</code></pre>
                <CopyButton text={contactsUpdatePayload} id="contacts-update" />
              </div>
            </TabsContent>
            <TabsContent value="curl-companies">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-96"><code>{curlCompanies}</code></pre>
                <CopyButton text={curlCompanies} id="curl-companies" />
              </div>
            </TabsContent>
            <TabsContent value="curl-contacts">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-96"><code>{curlContacts}</code></pre>
                <CopyButton text={curlContacts} id="curl-contacts" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Section 4: Field Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t("externalApi.fieldsTitle")}
          </CardTitle>
          <CardDescription>{t("externalApi.fieldsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="company-fields">
            <TabsList>
              <TabsTrigger value="company-fields">{t("externalApi.companies")}</TabsTrigger>
              <TabsTrigger value="contact-fields">{t("externalApi.contacts")}</TabsTrigger>
            </TabsList>
            <TabsContent value="company-fields">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("externalApi.fieldName")}</TableHead>
                    <TableHead>{t("externalApi.fieldRequired")}</TableHead>
                    <TableHead>{t("externalApi.fieldType")}</TableHead>
                    <TableHead>{t("externalApi.fieldDesc")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyFields.map((f) => (
                    <TableRow key={f.name}>
                      <TableCell className="font-mono text-sm">{f.name}</TableCell>
                      <TableCell>
                        <Badge variant={f.required ? "destructive" : "secondary"}>
                          {f.required ? t("externalApi.required") : t("externalApi.optional")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{f.type}</TableCell>
                      <TableCell className="text-sm">{f.desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="contact-fields">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("externalApi.fieldName")}</TableHead>
                    <TableHead>{t("externalApi.fieldRequired")}</TableHead>
                    <TableHead>{t("externalApi.fieldType")}</TableHead>
                    <TableHead>{t("externalApi.fieldDesc")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactFields.map((f) => (
                    <TableRow key={f.name}>
                      <TableCell className="font-mono text-sm">{f.name}</TableCell>
                      <TableCell>
                        <Badge variant={f.required ? "destructive" : (f as any).recommended ? "default" : "secondary"}>
                          {f.required ? t("externalApi.required") : (f as any).recommended ? t("externalApi.recommended") : t("externalApi.optional")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{f.type}</TableCell>
                      <TableCell className="text-sm">{f.desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>

          {/* custom_fields explanation */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">custom_fields</h4>
            <p className="text-sm text-muted-foreground">{t("externalApi.customFieldsExplanation")}</p>
          </div>

          {/* external_id explanation */}
          <div className="mt-3 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">external_id</h4>
            <p className="text-sm text-muted-foreground">{t("externalApi.externalIdExplanation")}</p>
          </div>

          {/* skip_duplicates explanation */}
          <div className="mt-3 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">skip_duplicates</h4>
            <p className="text-sm text-muted-foreground">{t("externalApi.skipDuplicatesExplanation")}</p>
          </div>

          {/* update_existing explanation */}
          <div className="mt-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-medium text-sm mb-2">update_existing</h4>
            <p className="text-sm text-muted-foreground">{t("externalApi.updateExistingExplanation")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Responses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("externalApi.responsesTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">{t("externalApi.successResponse")}</h4>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto"><code>{successResponse}</code></pre>
              <CopyButton text={successResponse} id="success-response" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">{t("externalApi.errorResponses")}</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>{t("externalApi.scenario")}</TableHead>
                  <TableHead>Body</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorResponses.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono">{e.status}</TableCell>
                    <TableCell className="text-sm">{e.scenario}</TableCell>
                    <TableCell className="font-mono text-xs">{e.body}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExternalApiTab;
