import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Copy, Check, Code, FileJson, AlertCircle, ChevronDown, Sparkles, Terminal, BookOpen } from "lucide-react";

interface ChatWidgetDocsTabProps {
  widgetPosition: string;
  widgetPrimaryColor: string;
  widgetCompanyName: string;
  widgetButtonShape: string;
}

interface FieldDef {
  id: string;
  key: string;
  label: string;
  field_type: string;
  target: string;
  maps_to: string | null;
  display_order: number;
}

const EXAMPLE_VALUES: Record<string, any> = {
  text: '"Exemplo"',
  decimal: "1500.00",
  integer: "10",
  url: '"https://exemplo.com"',
  boolean: "true",
  date: '"2026-01-15"',
};

const TYPE_LABELS: Record<string, string> = {
  text: "string",
  decimal: "number",
  integer: "number",
  url: "string",
  boolean: "boolean",
  date: "string (ISO)",
};

const RESERVED_FIELDS = [
  { key: "name", type: "string", desc: "Nome completo do visitante. Obrigatório junto com email para ativar o auto-start (pula formulário).", required: true },
  { key: "email", type: "string", desc: "Email do visitante. Obrigatório junto com name para ativar o auto-start (pula formulário).", required: true },
  { key: "phone", type: "string", desc: "Telefone do visitante. Formato livre (ex: +55 11 99999-9999).", required: false },
  { key: "company_id", type: "string", desc: "ID externo único da empresa no seu sistema (ex: 'EMP-123'). Mapeia para contacts.external_id — se existir, vincula; se não, cria nova empresa.", required: false },
  { key: "company_name", type: "string", desc: "Nome da empresa. Usado como fallback se company_id não for informado. Se company_id existir, atualiza o nome.", required: false },
  { key: "mrr", type: "number", desc: "Monthly Recurring Revenue. Atualiza diretamente a coluna mrr na empresa vinculada.", required: false },
  { key: "contract_value", type: "number", desc: "Valor total do contrato. Atualiza diretamente a coluna contract_value na empresa.", required: false },
  { key: "company_sector", type: "string", desc: "Setor de atuação da empresa (ex: 'Tecnologia', 'Saúde'). Atualiza coluna company_sector.", required: false },
  { key: "company_document", type: "string", desc: "CNPJ ou documento da empresa. Atualiza coluna company_document.", required: false },
];

const DATA_ATTRIBUTES = [
  { attr: "data-api-key", desc: "Chave de API (Chat API Key). Permite identificação automática do visitante via external_id.", example: "ck_live_abc123..." },
  { attr: "data-external-id", desc: "ID do usuário no seu sistema. Usado junto com api-key para vincular o visitante ao cadastro.", example: "user_456" },
  { attr: "data-position", desc: "Posição do botão do chat na tela.", example: "right | left" },
  { attr: "data-primary-color", desc: "Cor principal do widget (hex).", example: "#7C3AED" },
  { attr: "data-company-name", desc: "Nome exibido no cabeçalho do chat.", example: "Suporte" },
  { attr: "data-button-shape", desc: "Formato do botão flutuante.", example: "circle | square" },
];

export default function ChatWidgetDocsTab({ widgetPosition, widgetPrimaryColor, widgetCompanyName, widgetButtonShape }: ChatWidgetDocsTabProps) {
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [refOpen, setRefOpen] = useState(false);

  useEffect(() => {
    const fetchFields = async () => {
      const { data } = await supabase
        .from("chat_custom_field_definitions" as any)
        .select("*")
        .order("display_order", { ascending: true });
      setFields((data as any as FieldDef[]) ?? []);
      setLoading(false);
    };
    fetchFields();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItems((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedItems((prev) => ({ ...prev, [id]: false })), 2000);
  };

  const CopyBtn = ({ text, id, label }: { text: string; id: string; label?: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyToClipboard(text, id)}
      className="h-8 gap-1.5 text-xs shrink-0"
    >
      {copiedItems[id] ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {label ?? (copiedItems[id] ? "Copiado!" : "Copiar")}
    </Button>
  );

  // ─── Build embed script ───
  const companyName = widgetCompanyName || "Suporte";
  const embedAnon = `<script src="${window.location.origin}/nps-chat-embed.js"
  data-position="${widgetPosition}"
  data-primary-color="${widgetPrimaryColor}"
  data-company-name="${companyName}"
  data-button-shape="${widgetButtonShape}">
</script>`;

  const embedIdentified = `<script src="${window.location.origin}/nps-chat-embed.js"
  data-api-key="SUA_CHAT_API_KEY"
  data-external-id="ID_DO_USUARIO_NO_SEU_SISTEMA"
  data-position="${widgetPosition}"
  data-primary-color="${widgetPrimaryColor}"
  data-company-name="${companyName}"
  data-button-shape="${widgetButtonShape}">
</script>`;

  // ─── Build update snippet (improved with blocks) ───
  const buildUpdateSnippet = () => {
    const lines: string[] = [];
    lines.push("window.NPSChat.update({");
    lines.push("  // ── Identificação do visitante (obrigatório para auto-start) ──");
    lines.push('  name: usuario.nome,');
    lines.push('  email: usuario.email,');
    lines.push('  phone: usuario.telefone,');
    lines.push("");
    lines.push("  // ── Empresa (vinculação e dados cadastrais) ──");
    lines.push('  company_id: usuario.empresa_id,       // external_id — vincula ou cria empresa');
    lines.push('  company_name: usuario.empresa_nome,    // nome exibido da empresa');
    lines.push("");
    lines.push("  // ── Campos diretos da empresa (atualizados no cadastro) ──");
    lines.push('  mrr: usuario.mrr,                      // Monthly Recurring Revenue');
    lines.push('  contract_value: usuario.contrato,      // Valor total do contrato');
    lines.push('  company_sector: usuario.setor,         // Setor de atuação');
    lines.push('  company_document: usuario.cnpj,        // CNPJ da empresa');

    if (fields.length > 0) {
      lines.push("");
      lines.push("  // ── Campos customizados (configurados pelo admin) ──");
      fields.forEach((f, i) => {
        const comma = i < fields.length - 1 ? "," : "";
        lines.push(`  ${f.key}: usuario.${f.key}${comma}  // ${f.label} (${TYPE_LABELS[f.field_type] ?? f.field_type})`);
      });
    }

    lines.push("});");
    return lines.join("\n");
  };

  // ─── Build vibecoding prompt (complete, self-sufficient) ───
  const buildVibecodingPrompt = () => {
    const origin = window.location.origin;
    const L: string[] = [];

    L.push("# Integração: Widget de Chat ao Vivo");
    L.push("");
    L.push("## Sobre o Widget");
    L.push("Widget embeddable de chat em tempo real. Funciona via um `<script>` que injeta um iframe no site do cliente.");
    L.push("Fluxo: script carrega → busca configuração dinâmica (`get-widget-config`: campos customizados + settings) → resolve visitante com upsert completo (`resolve-chat-visitor`) → cria iframe com flags de decisão (`auto_start`, `needs_form`, `has_history`).");
    L.push("O backend centraliza todo o upsert (visitor + contato + empresa) ANTES do chat iniciar. O `chat_room` é criado com `contact_id` e `company_contact_id`, alimentando o side panel do atendente automaticamente.");
    L.push("");

    // ── Installation ──
    L.push("## Instalação");
    L.push("");
    L.push("### Modo Anônimo (visitante não autenticado)");
    L.push("Use quando não há login no site. O visitante preenche um formulário no chat antes de iniciar.");
    L.push("");
    L.push("```html");
    L.push(`<script src="${origin}/nps-chat-embed.js"`);
    L.push(`  data-position="${widgetPosition}"`);
    L.push(`  data-primary-color="${widgetPrimaryColor}"`);
    L.push(`  data-company-name="${companyName}"`);
    L.push(`  data-button-shape="${widgetButtonShape}">`);
    L.push("</script>");
    L.push("```");
    L.push("");
    L.push("### Modo Identificado (usuário autenticado)");
    L.push("Use quando o site tem login. O visitante é vinculado automaticamente ao cadastro via `api-key` + `external-id`.");
    L.push("");
    L.push("```html");
    L.push(`<script src="${origin}/nps-chat-embed.js"`);
    L.push('  data-api-key="SUA_CHAT_API_KEY"');
    L.push('  data-external-id="ID_DO_USUARIO_NO_SEU_SISTEMA"');
    L.push(`  data-position="${widgetPosition}"`);
    L.push(`  data-primary-color="${widgetPrimaryColor}"`);
    L.push(`  data-company-name="${companyName}"`);
    L.push(`  data-button-shape="${widgetButtonShape}">`);
    L.push("</script>");
    L.push("```");
    L.push("");

    // ── Attributes reference ──
    L.push("### Atributos do Script");
    L.push("| Atributo | Descrição |");
    L.push("|----------|-----------|");
    DATA_ATTRIBUTES.forEach(a => {
      L.push(`| \`${a.attr}\` | ${a.desc} Ex: \`${a.example}\` |`);
    });
    L.push("");

    // ── Identification ──
    L.push("## Identificação do Usuário via JavaScript");
    L.push("");
    L.push("Após o login do usuário, chame `window.NPSChat.update(payload)` para enviar os dados.");
    L.push("Se `name` + `email` estiverem no payload, o formulário de pré-chat é **pulado automaticamente** (auto-start).");
    L.push("O método pode ser chamado **múltiplas vezes** — os dados são mesclados incrementalmente.");
    L.push("");

    L.push("### Exemplo — React (useEffect)");
    L.push("```tsx");
    L.push("useEffect(() => {");
    L.push("  if (user && window.NPSChat) {");
    L.push("    window.NPSChat.update({");
    L.push("      name: user.name,");
    L.push("      email: user.email,");
    L.push("      phone: user.phone,");
    L.push("      company_id: user.companyId,");
    L.push("      company_name: user.companyName,");
    L.push("      mrr: user.mrr,");
    L.push("    });");
    L.push("  }");
    L.push("}, [user]);");
    L.push("```");
    L.push("");

    L.push("### Exemplo — Vue 3 (onMounted)");
    L.push("```vue");
    L.push("<script setup>");
    L.push("import { onMounted } from 'vue'");
    L.push("onMounted(() => {");
    L.push("  if (user.value && window.NPSChat) {");
    L.push("    window.NPSChat.update({");
    L.push("      name: user.value.name,");
    L.push("      email: user.value.email,");
    L.push("      company_id: user.value.companyId,");
    L.push("    });");
    L.push("  }");
    L.push("});");
    L.push("</script>");
    L.push("```");
    L.push("");

    L.push("### Exemplo — JavaScript puro");
    L.push("```javascript");
    L.push("document.addEventListener('DOMContentLoaded', function() {");
    L.push("  // Aguardar o widget carregar");
    L.push("  var checkWidget = setInterval(function() {");
    L.push("    if (window.NPSChat) {");
    L.push("      clearInterval(checkWidget);");
    L.push("      window.NPSChat.update({");
    L.push("        name: 'João Silva',");
    L.push("        email: 'joao@empresa.com',");
    L.push("        company_id: 'EMP-123',");
    L.push("      });");
    L.push("    }");
    L.push("  }, 200);");
    L.push("});");
    L.push("```");
    L.push("");

    // ── Fields ──
    L.push("## Campos do Payload (`update()`)");
    L.push("");
    L.push("### Campos de Identificação (obrigatórios para auto-start)");
    L.push("| Campo | Tipo | Descrição |");
    L.push("|-------|------|-----------|");
    L.push("| `name` | string | Nome completo do visitante |");
    L.push("| `email` | string | Email do visitante |");
    L.push("");
    L.push("### Campos Opcionais do Visitante");
    L.push("| Campo | Tipo | Descrição |");
    L.push("|-------|------|-----------|");
    L.push("| `phone` | string | Telefone (formato livre) |");
    L.push("");
    L.push("### Campos da Empresa");
    L.push("| Campo | Tipo | Descrição |");
    L.push("|-------|------|-----------|");
    L.push("| `company_id` | string | **ID externo único** da empresa no seu sistema. Mapeia para `contacts.external_id`. Se existir, vincula; se não, cria nova empresa. |");
    L.push("| `company_name` | string | Nome da empresa. Usado como fallback se `company_id` não for informado. Se `company_id` existir, atualiza o nome. |");
    L.push("| `mrr` | number | Monthly Recurring Revenue (ex: 5000.00) |");
    L.push("| `contract_value` | number | Valor total do contrato (ex: 60000.00) |");
    L.push("| `company_sector` | string | Setor de atuação (ex: 'Tecnologia') |");
    L.push("| `company_document` | string | CNPJ da empresa (ex: '12.345.678/0001-90') |");

    if (fields.length > 0) {
      L.push("");
      L.push("### Campos Customizados (configurados pelo admin desta integração)");
      L.push("| Campo | Tipo | Descrição | Destino |");
      L.push("|-------|------|-----------|---------|");
      fields.forEach(f => {
        const dest = f.target === "company" ? "Empresa" : "Contato";
        L.push(`| \`${f.key}\` | ${TYPE_LABELS[f.field_type] ?? f.field_type} | ${f.label} | ${dest} |`);
      });
    }

    L.push("");

    // ── Behavior ──
    L.push("## Comportamento");
    L.push("");
    L.push("### Árvore de Decisão ao Abrir o Chat");
    L.push("");
    L.push("1. **`external_id` + `name` + `email` enviados** → Backend faz upsert (visitor + contato + empresa) → Retorna `auto_start: true` → Chat inicia direto, sem formulário.");
    L.push("2. **`external_id` enviado mas SEM `name`/`email`** → Backend retorna `needs_form: true` → Widget exibe formulário obrigatório → Ao preencher, backend faz upsert e inicia chat.");
    L.push("3. **SEM `external_id` mas com `name` + `email`** → Backend busca contato por email → Se encontrar: vincula e retorna `auto_start: true` → Se não: cria novo contato.");
    L.push("4. **Nenhum dado enviado** → Widget exibe formulário obrigatório (modo anônimo).");
    L.push("");
    L.push("### Regras Gerais");
    L.push("");
    L.push("- **Vinculação de empresa**: `company_id` busca uma empresa existente por `external_id`. Se não encontrar, cria automaticamente.");
    L.push("- **Prioridade**: Se `company_id` e `company_name` forem enviados juntos, `company_id` tem prioridade para vinculação. `company_name` atualiza o nome.");
    L.push("- **Campos customizados**: São mesclados via JSONB merge — campos existentes são preservados, apenas os enviados são atualizados.");
    L.push("- **Múltiplas chamadas**: `update()` pode ser chamado quantas vezes for necessário. Os dados são acumulados.");
    L.push("- **Sem `update()`**: O widget funciona normalmente em modo visitante anônimo (formulário de pré-chat).");
    L.push("- **Upsert centralizado**: Todo o processamento (visitor, contato, empresa, campos customizados) é feito no backend antes do chat iniciar. O iframe NÃO faz upsert.");
    L.push("");
    L.push("### Side Panel do Atendente");
    L.push("");
    L.push("Todos os dados (empresa, MRR, Health Score, campos customizados) aparecem automaticamente no painel lateral do atendente assim que ele aceita o chat.");
    L.push("O backend preenche `contact_id` e `company_contact_id` no `chat_room` durante o upsert. O `VisitorInfoPanel` lê esses IDs e carrega os dados automaticamente.");
    L.push("");

    // ── Full example ──
    L.push("## Payload Completo de Exemplo");
    L.push("");
    L.push("```json");
    L.push(buildPayloadJson());
    L.push("```");
    L.push("");

    // ── Troubleshooting ──
    L.push("## Troubleshooting");
    L.push("");
    L.push("| Problema | Solução |");
    L.push("|----------|---------|");
    L.push("| Widget não aparece | Verifique se o script está antes do `</body>` e a URL está correta. |");
    L.push("| Formulário não pula | Envie `name` **e** `email` via `update()`. Ambos são obrigatórios para auto-start. |");
    L.push("| `update()` não funciona | Verifique se `window.NPSChat` existe antes de chamar. O script pode não ter carregado ainda. |");
    L.push("| Empresa não vincula | Verifique se `company_id` corresponde ao `external_id` cadastrado. Se não existir, será criada nova. |");
    L.push("| Campos custom não aparecem | Os campos precisam estar configurados na aba 'Campos Customizados' do admin. |");

    return L.join("\n");
  };

  // ─── Build payload JSON ───
  const buildPayloadJson = () => {
    const lines: string[] = ["{"];
    lines.push('  // Identificação (obrigatório para auto-start)');
    lines.push('  "name": "João Silva",');
    lines.push('  "email": "joao@empresa.com",');
    lines.push('  "phone": "(11) 99999-9999",');
    lines.push("");
    lines.push('  // Empresa');
    lines.push('  "company_id": "EMP-123",');
    lines.push('  "company_name": "Empresa Exemplo Ltda",');
    lines.push("");
    lines.push('  // Campos diretos da empresa');
    lines.push('  "mrr": 5000.00,');
    lines.push('  "contract_value": 60000.00,');
    lines.push('  "company_sector": "Tecnologia",');

    if (fields.length > 0) {
      lines.push('  "company_document": "12.345.678/0001-90",');
      lines.push("");
      lines.push('  // Campos customizados');
      fields.forEach((f, i) => {
        const val = EXAMPLE_VALUES[f.field_type] ?? '"Exemplo"';
        const comma = i < fields.length - 1 ? "," : "";
        lines.push(`  "${f.key}": ${val}${comma}  // ${f.label}`);
      });
    } else {
      lines.push('  "company_document": "12.345.678/0001-90"');
    }

    lines.push("}");
    return lines.join("\n");
  };

  // ─── Copy all (full doc) ───
  const buildFullDoc = () => {
    const parts: string[] = [];
    parts.push("# Documentação Completa — Widget de Chat ao Vivo\n");

    // Install
    parts.push("## 1. Instalação do Widget\n");
    parts.push("Cole um dos scripts abaixo antes do `</body>` no HTML do seu site.\n");
    parts.push("### Modo Anônimo (visitante sem login)\nUse quando o site não tem autenticação. O visitante preenche um formulário antes de iniciar o chat.\n");
    parts.push("```html\n" + embedAnon + "\n```\n");
    parts.push("### Modo Identificado (usuário autenticado)\nUse quando o site tem login. O visitante é vinculado automaticamente ao cadastro.\n");
    parts.push("```html\n" + embedIdentified + "\n```\n");
    parts.push("### Atributos do Script\n");
    parts.push("| Atributo | Descrição | Exemplo |");
    parts.push("|----------|-----------|---------|");
    DATA_ATTRIBUTES.forEach(a => {
      parts.push(`| \`${a.attr}\` | ${a.desc} | \`${a.example}\` |`);
    });
    parts.push("");

    // Identify
    parts.push("## 2. Identificação do Usuário\n");
    parts.push("Após o login, chame `window.NPSChat.update()` para enviar os dados do usuário logado.\n");
    parts.push("Se `name` + `email` estiverem presentes, o formulário de pré-chat é pulado automaticamente (auto-start).\n");
    parts.push("```javascript\n" + buildUpdateSnippet() + "\n```\n");

    // Fields
    parts.push("## 3. Referência de Campos\n");
    parts.push("### Campos Reservados\n");
    parts.push("| Campo | Tipo | Obrigatório | Descrição |");
    parts.push("|-------|------|-------------|-----------|");
    RESERVED_FIELDS.forEach(f => {
      parts.push(`| \`${f.key}\` | ${f.type} | ${f.required ? "⚠️ Auto-start" : "Não"} | ${f.desc} |`);
    });

    if (fields.length > 0) {
      parts.push("\n### Campos Customizados\n");
      parts.push("| Campo | Tipo | Descrição | Destino |");
      parts.push("|-------|------|-----------|---------|");
      fields.forEach(f => {
        parts.push(`| \`${f.key}\` | ${TYPE_LABELS[f.field_type] ?? f.field_type} | ${f.label} | ${f.target === "company" ? "Empresa" : "Contato"} |`);
      });
    }

    // Behavior
    parts.push("\n## 4. Comportamento\n");
    parts.push("### Árvore de Decisão\n");
    parts.push("1. `external_id` + `name` + `email` → Backend faz upsert (visitor + contato + empresa) → `auto_start: true` → Chat direto, sem formulário.");
    parts.push("2. `external_id` sem `name`/`email` → `needs_form: true` → Formulário obrigatório.");
    parts.push("3. Sem `external_id` + `name` + `email` → Backend busca contato por email → Vincula ou cria.");
    parts.push("4. Nenhum dado → Formulário obrigatório (modo anônimo).\n");
    parts.push("### Regras Gerais\n");
    parts.push("- **Upsert centralizado**: Todo processamento (visitor, contato, empresa) é feito no backend antes do chat iniciar.");
    parts.push("- **company_id**: Busca empresa existente por `external_id`. Se não encontrar, cria nova.");
    parts.push("- **Prioridade**: `company_id` tem prioridade sobre `company_name` para vinculação.");
    parts.push("- **Campos customizados**: Mesclados via JSONB merge (campos existentes preservados).");
    parts.push("- **Múltiplas chamadas**: `update()` pode ser chamado várias vezes. Dados são acumulados.");
    parts.push("- **Sem `update()`**: Widget funciona em modo anônimo (formulário de pré-chat).\n");
    parts.push("### Side Panel do Atendente\n");
    parts.push("Todos os dados (empresa, MRR, Health Score, campos customizados) aparecem automaticamente no painel lateral do atendente ao aceitar o chat.");
    parts.push("O backend preenche `contact_id` e `company_contact_id` no `chat_room` durante o upsert.");

    // Payload
    parts.push("\n## 5. Payload de Exemplo\n```json\n" + buildPayloadJson() + "\n```");

    // Flow
    parts.push("\n## 6. Fluxo Interno\n");
    parts.push("1. Script (`nps-chat-embed.js`) carrega no site do cliente");
    parts.push("2. Se `data-api-key` presente → busca configuração dinâmica (`get-widget-config`) com campos customizados do tenant");
    parts.push("3. Se `data-api-key` + `data-external-id` → chama `resolve-chat-visitor` com upsert completo");
    parts.push("4. Backend retorna flags: `auto_start` (pular form), `needs_form` (exibir form), `has_history` (tem histórico)");
    parts.push("5. Cria iframe com widget de chat, passando flags e IDs resolvidos");
    parts.push("6. `window.NPSChat.update(payload)` envia dados ao iframe e ao backend simultaneamente");
    parts.push("7. Dados persistidos: visitor, contato, empresa e campos customizados atualizados via JSONB merge");

    // Behavior
    parts.push("\n## 7. Comportamento\n");
    parts.push("### Árvore de Decisão\n");
    parts.push("1. `external_id` + `name` + `email` → Backend faz upsert → `auto_start: true` → Chat direto");
    parts.push("2. `external_id` sem `name`/`email` → `needs_form: true` → Formulário obrigatório");
    parts.push("3. Sem `external_id` + `name` + `email` → Backend busca por email → Vincula ou cria");
    parts.push("4. Nenhum dado → Formulário obrigatório (modo anônimo)\n");
    parts.push("### Side Panel do Atendente\n");
    parts.push("Todos os dados (empresa, MRR, Health Score, campos customizados) aparecem automaticamente no painel lateral do atendente.");
    parts.push("O backend preenche `contact_id` e `company_contact_id` no `chat_room` durante o upsert.");

    return parts.join("\n");
  };

  if (loading) return null;

  const updateSnippet = buildUpdateSnippet();
  const vibePrompt = buildVibecodingPrompt();
  const payloadJson = buildPayloadJson();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Documentação e Integração
            </CardTitle>
            <CardDescription className="mt-1">
              Guia completo para instalar e integrar o widget. Copie e envie ao desenvolvedor do seu cliente.
            </CardDescription>
          </div>
          <CopyBtn text={buildFullDoc()} id="copy-all" label={copiedItems["copy-all"] ? "Copiado!" : "Copiar tudo"} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ─── Step 1: Install ─── */}
        <div className="relative rounded-lg border border-primary/20 bg-primary/[0.03]">
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Instale o Widget
                </h4>
                <CopyBtn text={embedAnon + "\n\n" + embedIdentified} id="step1" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Cole um dos scripts abaixo antes do <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> no HTML do seu site.
              </p>
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Visitante anônimo</span>
                  <p className="text-[11px] text-muted-foreground mb-1">Use quando o site não tem login. O visitante preenche formulário.</p>
                  <pre className="bg-muted/80 p-3 rounded-md text-xs overflow-x-auto mt-1 font-mono"><code>{embedAnon}</code></pre>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Usuário identificado (via API Key)</span>
                  <p className="text-[11px] text-muted-foreground mb-1">Use quando o site tem login. Vincula o visitante automaticamente.</p>
                  <pre className="bg-muted/80 p-3 rounded-md text-xs overflow-x-auto mt-1 font-mono"><code>{embedIdentified}</code></pre>
                </div>
              </div>

              {/* Data attributes table */}
              <div className="mt-3 border border-border/50 rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] py-1.5">Atributo</TableHead>
                      <TableHead className="text-[11px] py-1.5">Descrição</TableHead>
                      <TableHead className="text-[11px] py-1.5">Exemplo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DATA_ATTRIBUTES.map((a) => (
                      <TableRow key={a.attr}>
                        <TableCell className="font-mono text-[11px] py-1.5">{a.attr}</TableCell>
                        <TableCell className="text-[11px] text-muted-foreground py-1.5">{a.desc}</TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground py-1.5">{a.example}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Step 2: Identify ─── */}
        <div className="relative rounded-lg border border-accent/20 bg-accent/[0.03]">
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">2</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Identifique o Usuário
                  <Badge variant="secondary" className="text-[10px]">Opcional</Badge>
                </h4>
                <CopyBtn text={updateSnippet} id="step2" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Quando o usuário logar na sua plataforma, envie os dados dele para pular o formulário de identificação.
                Se <code className="bg-muted px-1 rounded">name</code> e <code className="bg-muted px-1 rounded">email</code> estiverem presentes, o chat inicia automaticamente (auto-start).
              </p>
              <pre className="bg-muted/80 p-3 rounded-md text-xs overflow-x-auto font-mono"><code>{updateSnippet}</code></pre>
            </div>
          </div>
        </div>

        {/* ─── Step 3: Vibecoding ─── */}
        <div className="relative rounded-lg border border-amber-500/30 bg-amber-500/[0.04]">
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-primary-foreground text-xs font-bold">3</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Prompt para Vibecoding (IA)
                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">Novo</Badge>
                </h4>
                <div className="flex items-center gap-1.5">
                  <CopyBtn text={vibePrompt} id="step3" />
                  <CopyBtn text={vibePrompt} id="step3-cursor" label={copiedItems["step3-cursor"] ? "Copiado!" : "Copiar para Cursor/Lovable"} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Copie o prompt abaixo e cole na sua ferramenta de IA (Cursor, Lovable, Windsurf, etc.) para que ela implemente a integração completa automaticamente.
                O prompt é auto-suficiente — contém toda a documentação necessária.
              </p>
              <pre className="bg-muted/80 p-3 rounded-md text-xs overflow-x-auto max-h-96 font-mono"><code>{vibePrompt}</code></pre>
            </div>
          </div>
        </div>

        {/* ─── Collapsible: Full Reference ─── */}
        <Collapsible open={refOpen} onOpenChange={setRefOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-10 text-sm text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                Referência completa da API
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${refOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-5 pt-3">

            {/* Flow */}
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
              <h4 className="text-sm font-semibold text-foreground mb-2">Fluxo Interno do Widget</h4>
              <p>1. Script (<code className="bg-muted px-1 rounded">nps-chat-embed.js</code>) carrega no site do cliente</p>
              <p>2. Se <code className="bg-muted px-1 rounded">data-api-key</code> presente → busca configuração dinâmica (<code className="bg-muted px-1 rounded">get-widget-config</code>) com campos customizados do tenant</p>
              <p>3. Se <code className="bg-muted px-1 rounded">data-api-key</code> + <code className="bg-muted px-1 rounded">data-external-id</code> → chama <code className="bg-muted px-1 rounded">resolve-chat-visitor</code> com upsert completo</p>
              <p>4. Backend retorna flags: <code className="bg-muted px-1 rounded">auto_start</code> (pular form), <code className="bg-muted px-1 rounded">needs_form</code> (exibir form), <code className="bg-muted px-1 rounded">has_history</code> (tem histórico)</p>
              <p>5. Cria iframe com widget de chat, passando flags e IDs resolvidos</p>
              <p>6. <code className="bg-muted px-1 rounded">window.NPSChat.update(payload)</code> envia dados ao iframe e ao backend simultaneamente</p>
              <p>7. Dados persistidos: visitor, contato, empresa e campos customizados atualizados via JSONB merge</p>
            </div>

            {/* Reserved Fields */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Campos Reservados (sempre disponíveis)</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Obrigatório</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RESERVED_FIELDS.map((f) => (
                    <TableRow key={f.key}>
                      <TableCell className="font-mono text-xs">{f.key}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{f.type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={f.required ? "destructive" : "secondary"} className="text-xs">
                          {f.required ? "Auto-start" : "Opcional"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Custom Fields */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Campos Customizados Configurados</h4>
              {fields.length === 0 ? (
                <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Nenhum campo customizado configurado. Use a seção <strong>"Campos Customizados do Chat"</strong> acima para definir campos adicionais.
                  </span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Destino</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs">{f.key}</TableCell>
                        <TableCell className="text-sm">{f.label}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABELS[f.field_type] ?? f.field_type}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={f.target === "company" ? "default" : "secondary"} className="text-xs">
                            {f.target === "company" ? "Empresa" : "Contato"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Behavior notes */}
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
              <h4 className="text-sm font-semibold text-foreground mb-2">Regras de Comportamento</h4>
              <p className="font-semibold text-foreground mt-1">Árvore de Decisão:</p>
              <p>1. <code className="bg-muted px-1 rounded">external_id</code> + <code className="bg-muted px-1 rounded">name</code> + <code className="bg-muted px-1 rounded">email</code> → Backend faz upsert → <code className="bg-muted px-1 rounded">auto_start: true</code> → Chat direto</p>
              <p>2. <code className="bg-muted px-1 rounded">external_id</code> sem <code className="bg-muted px-1 rounded">name</code>/<code className="bg-muted px-1 rounded">email</code> → <code className="bg-muted px-1 rounded">needs_form: true</code> → Formulário obrigatório</p>
              <p>3. Sem <code className="bg-muted px-1 rounded">external_id</code> + <code className="bg-muted px-1 rounded">name</code> + <code className="bg-muted px-1 rounded">email</code> → Backend busca por email → Vincula ou cria</p>
              <p>4. Nenhum dado → Formulário obrigatório (modo anônimo)</p>
              <p className="font-semibold text-foreground mt-2">Regras Gerais:</p>
              <p>• <strong>Upsert centralizado</strong>: Todo processamento (visitor, contato, empresa, campos customizados) é feito no backend antes do chat iniciar.</p>
              <p>• <strong>company_id</strong>: Busca empresa por <code className="bg-muted px-1 rounded">external_id</code>. Se não encontrar, cria nova.</p>
              <p>• <strong>Custom fields</strong>: Mesclados via JSONB merge — campos existentes preservados, apenas os enviados são atualizados.</p>
              <p>• <strong>Múltiplas chamadas</strong>: <code className="bg-muted px-1 rounded">update()</code> pode ser chamado quantas vezes for necessário.</p>
              <p className="font-semibold text-foreground mt-2">Side Panel do Atendente:</p>
              <p>• Todos os dados (empresa, MRR, Health Score, campos customizados) aparecem automaticamente no painel lateral do atendente ao aceitar o chat.</p>
              <p>• O backend preenche <code className="bg-muted px-1 rounded">contact_id</code> e <code className="bg-muted px-1 rounded">company_contact_id</code> no <code className="bg-muted px-1 rounded">chat_room</code> durante o upsert.</p>
            </div>

            {/* Payload Example */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  Payload de Exemplo
                </h4>
                <CopyBtn text={payloadJson} id="payload" />
              </div>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-80 font-mono"><code>{payloadJson}</code></pre>
            </div>

          </CollapsibleContent>
        </Collapsible>

      </CardContent>
    </Card>
  );
}
