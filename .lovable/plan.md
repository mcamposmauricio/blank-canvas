

# Plano: Importação Completa do Help Center (155 artigos + 1589 imagens)

## Contexto

- **Origem:** JSON exportado do tenant `bd0d9374-6253-4070-947c-0f0e85b8d036` (projeto antigo `mfmkxpdufcbwydixbbbe`)
- **Destino:** Tenant `eee96b59-d7da-45cf-93f1-e3ab0796e678` (projeto `ydnblcgygkbqioowbnhz`)
- **User_id destino:** `e89e32e3-cd89-4998-a455-b16178cbfffe`
- **Conteúdo:** 1 site_settings, ~17 collections, ~155 articles, ~155+ versions, ~1589 imagens

## Mapeamento de URLs (diferença entre projetos)

As imagens nos artigos podem referenciar 3 origens diferentes. Todas precisam de download + re-upload + replace:

| Padrão de URL origem | Ação |
|---|---|
| `https://mfmkxpdufcbwydixbbbe.supabase.co/storage/v1/object/public/help-images/...` | Download → Upload no bucket `help-images` do projeto `ydnblcgygkbqioowbnhz` → Replace URL |
| `https://downloads.intercomcdn.com/...` | Download → Upload → Replace URL |
| `https://help.marqponto.com.br/hc/article_attachments/...` | Download → Upload → Replace URL |

**URL destino:** `https://ydnblcgygkbqioowbnhz.supabase.co/storage/v1/object/public/help-images/imported/{uuid}.{ext}`

O find/replace deve ser feito em **3 campos** de cada version:
- `editor_schema_json` (JSON stringificado — replace dentro de valores de `src`)
- `html_snapshot` (HTML — replace em atributos `src`)

E em **4 campos** do `help_site_settings`:
- `brand_logo_url`, `hero_image_url`, `favicon_url`, `footer_logo_url`

## Etapas

### 1. Edge function `import-help-center` (dados textuais)

Recebe o JSON completo via POST. Executa com service_role:

1. **Upsert `help_site_settings`** — com tenant_id destino, preservando cores, CSS, links
2. **Insert `help_collections`** — novos UUIDs, mapeando old_id → new_id
3. **Insert `help_articles`** — novos UUIDs, mapeando collection_id via mapa do passo 2
4. **Insert `help_article_versions`** — novos UUIDs, linkando ao article_id novo
5. **Update `help_articles.current_version_id`** — apontar para a version recém criada

Nesta etapa os artigos são inseridos **com as URLs originais** (ainda apontando para o projeto antigo / Intercom). Isso garante que a importação de dados não falhe por timeout.

### 2. Script Python — download + upload de imagens + replace URLs

Executado via `lov-exec` em batches:

1. **Extrair todas URLs únicas** dos `editor_schema_json` e `html_snapshot` de todas as versions importadas (query no banco)
2. **Para cada URL:** download → upload no bucket `help-images/imported/` do projeto novo
3. **Criar mapa** `{url_antiga: url_nova}`
4. **UPDATE em batch** nos campos `editor_schema_json` e `html_snapshot` com `REPLACE()` encadeado
5. **UPDATE** nos 4 campos de URL do `help_site_settings`

Batches de 50 imagens por iteração para evitar timeout.

### 3. Validação

- Verificar contagem: 155 articles, ~17 collections
- Verificar que nenhuma URL antiga persiste nos `html_snapshot`
- Verificar que imagens carregam via URL pública do novo bucket

## Arquivos

| Tipo | Arquivo |
|---|---|
| Edge function (temporária) | `supabase/functions/import-help-center/index.ts` |
| Script de imagens | Executado via `lov-exec` (Python, não persiste no repo) |
| Config | `supabase/config.toml` — adicionar `[functions.import-help-center]` com `verify_jwt = false` |

## Riscos

- **URLs do Intercom com `expires=`**: se já expiraram, as imagens ficarão como links quebrados. Nesse caso será necessário re-exportar do Intercom
- **Timeout da edge function**: mitigado ao separar dados (etapa 1) de imagens (etapa 2)
- **Tamanho do JSON**: se > 2MB, pode precisar de chunking no POST — verificaremos no momento da execução

