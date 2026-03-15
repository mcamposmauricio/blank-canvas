import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Send, Loader2, History, RotateCcw, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/utils/helpSlug";
import { editorSchemaToHtml } from "@/utils/helpBlocks";
import { RichTextEditor } from "@/components/help/RichTextEditor";
import { ArticlePreview } from "@/components/help/ArticlePreview";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { format } from "date-fns";

interface Collection { id: string; name: string; }
interface Version { id: string; version_number: number; change_summary: string | null; created_at: string; created_by_user_id: string; }


export default function HelpArticleEditor() {
  const { t } = useLanguage();
  const { tenantId, user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = !id || id === "new";

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlugState] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const [htmlContent, setHtmlContent] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [changeSummary, setChangeSummary] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    loadCollections();
    if (!isNew) loadArticle();
  }, [tenantId, id]);

  const loadCollections = async () => {
    const { data } = await supabase.from("help_collections").select("id, name").eq("tenant_id", tenantId!).eq("status", "active").order("order_index");
    setCollections(data ?? []);
  };

  const loadArticle = async () => {
    setLoading(true);
    const { data: art } = await supabase.from("help_articles").select("*").eq("id", id!).single();
    if (!art) { navigate("/help/articles"); return; }

    setTitle(art.title);
    setSubtitle(art.subtitle || "");
    setSlugState(art.slug);
    setCollectionId(art.collection_id);
    setStatus(art.status);

    if (art.current_version_id) {
      const { data: ver } = await supabase.from("help_article_versions").select("editor_schema_json, html_snapshot").eq("id", art.current_version_id).single();
      if (ver) {
        // Try new HTML format first, then legacy blocks, then raw html_snapshot
        const html = editorSchemaToHtml(ver.editor_schema_json) || ver.html_snapshot || "";
        setHtmlContent(html);
      }
    }

    const { data: vers } = await supabase.from("help_article_versions").select("id, version_number, change_summary, created_at, created_by_user_id").eq("article_id", id!).order("version_number", { ascending: false });
    setVersions(vers ?? []);
    setLoading(false);
  };

  const handleSave = async (publishAction?: "publish" | "archive") => {
    if (!tenantId || !user || !title.trim()) return;
    setSaving(true);

    const finalSlug = slug || slugify(title);
    const editorSchema = { html: htmlContent };

    let newStatus = status;
    if (publishAction === "publish") newStatus = "published";
    else if (publishAction === "archive") newStatus = "archived";

    try {
      let articleId = id;

      if (isNew) {
        const { data: art, error } = await supabase.from("help_articles").insert({
          tenant_id: tenantId,
          title,
          subtitle: subtitle || null,
          slug: finalSlug,
          status: newStatus,
          collection_id: collectionId,
          created_by_user_id: user.id,
          updated_by_user_id: user.id,
          published_at: newStatus === "published" ? new Date().toISOString() : null,
        }).select("id").single();

        if (error) throw error;
        articleId = art!.id;
      } else {
        await supabase.from("help_articles").update({
          title,
          subtitle: subtitle || null,
          slug: finalSlug,
          status: newStatus,
          collection_id: collectionId,
          updated_by_user_id: user.id,
          published_at: newStatus === "published" ? new Date().toISOString() : null,
          archived_at: newStatus === "archived" ? new Date().toISOString() : null,
        }).eq("id", id!);
      }

      const nextVersion = versions.length > 0 ? versions[0].version_number + 1 : 1;
      const { data: ver } = await supabase.from("help_article_versions").insert({
        tenant_id: tenantId,
        article_id: articleId!,
        version_number: nextVersion,
        editor_schema_json: editorSchema as any,
        html_snapshot: htmlContent,
        change_summary: changeSummary || (isNew ? "Versão inicial" : `Versão ${nextVersion}`),
        created_by_user_id: user.id,
      }).select("id").single();

      if (ver) {
        await supabase.from("help_articles").update({ current_version_id: ver.id }).eq("id", articleId!);
      }

      setStatus(newStatus);
      setChangeSummary("");
      toast({ title: t("help.saveSuccess") });

      if (isNew) {
        navigate(`/help/articles/${articleId}/edit`, { replace: true });
      } else {
        loadArticle();
      }
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleRestoreVersion = async (versionId: string) => {
    const { data: ver } = await supabase.from("help_article_versions").select("editor_schema_json, html_snapshot").eq("id", versionId).single();
    if (ver) {
      const html = editorSchemaToHtml(ver.editor_schema_json) || ver.html_snapshot || "";
      setHtmlContent(html);
      toast({ title: "Versão restaurada. Salve para confirmar." });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const editorContent = (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <PageHeader title={isNew ? t("help.newArticle") : t("help.editArticle")} subtitle={t("help.articles")}>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/help/articles")}>{t("team.cancel")}</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="hidden lg:inline-flex"
          >
            {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showPreview ? "Ocultar Preview" : "Preview"}
          </Button>
          <Button variant="outline" onClick={() => handleSave()}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}{t("help.saveDraft")}</Button>
          {status !== "published" && (
            <Button onClick={() => handleSave("publish")}><Send className="h-4 w-4 mr-2" />{t("help.publish")}</Button>
          )}
        </div>
      </PageHeader>

      {/* Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t("help.articleTitle")}</Label>
          <Input value={title} onChange={e => { setTitle(e.target.value); if (isNew) setSlugState(slugify(e.target.value)); }} placeholder="Título do artigo" className="text-lg font-semibold" />
        </div>
        <div className="space-y-1.5">
          <Label>{t("help.articleSlug")}</Label>
          <Input value={slug} onChange={e => setSlugState(e.target.value)} placeholder="slug-do-artigo" className="font-mono text-sm" />
        </div>
        <div className="space-y-1.5 lg:col-span-2">
          <Label>{t("help.articleSubtitle")}</Label>
          <Textarea value={subtitle} onChange={e => setSubtitle(e.target.value)} rows={2} placeholder="Descrição curta do artigo" />
        </div>
        <div className="space-y-1.5">
          <Label>{t("help.articleCollection")}</Label>
          <Select value={collectionId || "none"} onValueChange={v => setCollectionId(v === "none" ? null : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem coleção</SelectItem>
              {collections.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Badge className="text-xs">{t(`help.status.${status}`)}</Badge>
        </div>
      </div>

      <Separator />

      {/* Rich text editor */}
      <RichTextEditor content={htmlContent} onChange={setHtmlContent} />

      {/* Change summary */}
      {!isNew && (
        <div className="space-y-1.5">
          <Label>Resumo da alteração (opcional)</Label>
          <Input value={changeSummary} onChange={e => setChangeSummary(e.target.value)} placeholder="Ex: Corrigido link do vídeo" />
        </div>
      )}
    </div>
  );

  const versionsSidebar = (
    <div className="w-72 border-l bg-muted/30 overflow-y-auto p-4 space-y-4 hidden lg:block">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4" />
        <h3 className="text-sm font-medium">{t("help.versionHistory")}</h3>
      </div>
      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma versão salva ainda.</p>
      ) : (
        <div className="space-y-2">
          {versions.map(v => (
            <Card key={v.id} className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">v{v.version_number}</span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => handleRestoreVersion(v.id)}>
                  <RotateCcw className="h-3 w-3 mr-1" />Restaurar
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(v.created_at), "dd/MM/yy HH:mm")}</p>
              {v.change_summary && <p className="text-[10px] text-muted-foreground truncate">{v.change_summary}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {showPreview ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={55} minSize={35}>
            {editorContent}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={25}>
            <div className="h-full border-l overflow-y-auto">
              <div className="sticky top-0 bg-muted/50 px-4 py-2 border-b">
                <span className="text-xs font-medium text-muted-foreground">Preview</span>
              </div>
              <ArticlePreview title={title} subtitle={subtitle} htmlContent={htmlContent} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        editorContent
      )}
      {!showPreview && versionsSidebar}
    </div>
  );
}
