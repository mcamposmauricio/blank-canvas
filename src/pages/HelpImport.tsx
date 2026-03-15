import { useState, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractArticleMetadata, blocksToHtml } from "@/utils/helpBlocks";
import { slugify, ensureUniqueSlug } from "@/utils/helpSlug";

const repoFiles: Record<string, string> = import.meta.glob(
  ['/artigos 1/*.html', '/artigos 2/*.html'],
  { query: '?raw', import: 'default', eager: true }
) as any;

interface ImportItem {
  fileName: string;
  title: string;
  subtitle: string;
  blocksCount: number;
  warnings: string[];
  rawHtml: string;
  editorSchema: any;
  htmlSnapshot: string;
  collectionName: string;
}

export default function HelpImport() {
  const { t } = useLanguage();
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [autoPublish, setAutoPublish] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, warnings: 0 });
  const [loadingRepo, setLoadingRepo] = useState(false);

  const handleRepoImport = () => {
    setLoadingRepo(true);
    try {
      const parsed: ImportItem[] = [];
      for (const [path, html] of Object.entries(repoFiles)) {
        const parts = path.split('/');
        const fileName = parts[parts.length - 1];
        const collectionName = parts.length >= 3 ? parts[parts.length - 2] : '';
        const { title, subtitle, bodyBlocks } = extractArticleMetadata(html);
        const warnings: string[] = [];
        if (!title) warnings.push("Sem título (h1)");
        if (!subtitle) warnings.push("Sem subtítulo (h4)");
        parsed.push({
          fileName,
          title: title || fileName.replace(/\.html?$/, ''),
          subtitle,
          blocksCount: bodyBlocks.length,
          warnings,
          rawHtml: html,
          editorSchema: { blocks: bodyBlocks },
          htmlSnapshot: blocksToHtml(bodyBlocks),
          collectionName,
        });
      }
      setItems(parsed);
      setImported(false);
    } finally {
      setLoadingRepo(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const parsed: ImportItem[] = [];

    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) continue;
      const html = await file.text();
      const { title, subtitle, bodyBlocks } = extractArticleMetadata(html);
      const warnings: string[] = [];
      if (!title) warnings.push("Sem título (h1)");
      if (!subtitle) warnings.push("Sem subtítulo (h4)");

      // Infer collection from path if available
      const pathParts = (file as any).webkitRelativePath?.split("/") || [];
      const collectionName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";

      parsed.push({
        fileName: file.name,
        title: title || file.name.replace(/\.html?$/, ""),
        subtitle,
        blocksCount: bodyBlocks.length,
        warnings,
        rawHtml: html,
        editorSchema: { blocks: bodyBlocks },
        htmlSnapshot: blocksToHtml(bodyBlocks),
        collectionName,
      });
    }

    setItems(parsed);
    setImported(false);
  };

  const handleImport = async () => {
    if (!tenantId || !user || items.length === 0) return;
    setImporting(true);
    let success = 0;
    let warnings = 0;

    // Gather existing slugs
    const { data: existingArts } = await supabase.from("help_articles").select("slug").eq("tenant_id", tenantId);
    const existingSlugs = (existingArts ?? []).map(a => a.slug);

    // Create collections if needed
    const collectionMap = new Map<string, string>();
    const { data: existingCols } = await supabase.from("help_collections").select("id, name").eq("tenant_id", tenantId);
    (existingCols ?? []).forEach(c => collectionMap.set(c.name.toLowerCase(), c.id));

    for (const item of items) {
      if (item.collectionName && !collectionMap.has(item.collectionName.toLowerCase())) {
        const { data: newCol } = await supabase.from("help_collections").insert({
          tenant_id: tenantId,
          name: item.collectionName,
          slug: slugify(item.collectionName),
          order_index: collectionMap.size,
        }).select("id").single();
        if (newCol) collectionMap.set(item.collectionName.toLowerCase(), newCol.id);
      }
    }

    for (const item of items) {
      const slug = ensureUniqueSlug(slugify(item.title), existingSlugs);
      existingSlugs.push(slug);

      const collectionId = item.collectionName ? collectionMap.get(item.collectionName.toLowerCase()) : null;
      const status = autoPublish ? "published" : "draft";

      const { data: art } = await supabase.from("help_articles").insert({
        tenant_id: tenantId,
        title: item.title,
        subtitle: item.subtitle || null,
        slug,
        status,
        collection_id: collectionId || null,
        created_by_user_id: user.id,
        published_at: autoPublish ? new Date().toISOString() : null,
      }).select("id").single();

      if (art) {
        const { data: ver } = await supabase.from("help_article_versions").insert({
          tenant_id: tenantId,
          article_id: art.id,
          version_number: 1,
          editor_schema_json: item.editorSchema,
          html_snapshot: item.htmlSnapshot,
          change_summary: "Importado de HTML",
          created_by_user_id: user.id,
        }).select("id").single();

        if (ver) {
          await supabase.from("help_articles").update({ current_version_id: ver.id }).eq("id", art.id);
        }

        success++;
        if (item.warnings.length > 0) warnings++;
      }
    }

    setImportResults({ success, warnings });
    setImported(true);
    setImporting(false);
    toast({ title: `${success} ${t("help.importSuccess")}` });
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t("help.importTitle")} subtitle={t("help.importSubtitle")} />

      {!imported && (
        <>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className="h-10 w-10 text-muted-foreground/40 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">{t("help.importDragDrop")}</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".html,.htm"
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <FileText className="h-4 w-4 mr-2" />Selecionar arquivos
                </Button>
                <Button variant="outline" onClick={handleRepoImport} disabled={loadingRepo}>
                  {loadingRepo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FolderOpen className="h-4 w-4 mr-2" />}
                  Importar do repositório ({Object.keys(repoFiles).length})
                </Button>
              </div>
            </CardContent>
          </Card>

          {items.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{items.length} arquivo(s) detectado(s)</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch id="auto-publish" checked={autoPublish} onCheckedChange={setAutoPublish} />
                    <Label htmlFor="auto-publish" className="text-sm">{t("help.importAutoPublish")}</Label>
                  </div>
                  <Button onClick={handleImport} disabled={importing}>
                    {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t("help.importButton")} ({items.length})
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>{t("help.articleTitle")}</TableHead>
                      <TableHead>{t("help.articleCollection")}</TableHead>
                      <TableHead>Blocos</TableHead>
                      <TableHead>Avisos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{item.fileName}</TableCell>
                        <TableCell className="text-sm font-medium">{item.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.collectionName || "—"}</TableCell>
                        <TableCell><Badge variant="secondary">{item.blocksCount}</Badge></TableCell>
                        <TableCell>
                          {item.warnings.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                              <span className="text-xs text-yellow-600">{item.warnings.join(", ")}</span>
                            </div>
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}

      {imported && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">{importResults.success} artigos importados</p>
            {importResults.warnings > 0 && (
              <p className="text-sm text-muted-foreground mt-1">{importResults.warnings} com avisos</p>
            )}
            <Button variant="outline" className="mt-4" onClick={() => { setItems([]); setImported(false); }}>Importar mais</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
