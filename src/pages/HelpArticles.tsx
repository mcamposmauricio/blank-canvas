import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Copy, Archive, ExternalLink, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  status: string;
  collection_id: string | null;
  updated_at: string;
  collection_name?: string;
}

interface Collection {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  pending_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export default function HelpArticles() {
  const { t } = useLanguage();
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: arts }, { data: cols }, { data: tenant }] = await Promise.all([
      supabase.from("help_articles").select("id, title, subtitle, slug, status, collection_id, updated_at").eq("tenant_id", tenantId!).order("updated_at", { ascending: false }),
      supabase.from("help_collections").select("id, name").eq("tenant_id", tenantId!).eq("status", "active").order("order_index"),
      supabase.from("tenants").select("slug").eq("id", tenantId!).single(),
    ]);
    if (tenant) setTenantSlug(tenant.slug);
    setCollections(cols ?? []);
    const colMap = new Map((cols ?? []).map(c => [c.id, c.name]));
    setArticles((arts ?? []).map(a => ({ ...a, collection_name: a.collection_id ? colMap.get(a.collection_id) : undefined })));
    setLoading(false);
  };

  const filtered = articles.filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (collectionFilter !== "all" && a.collection_id !== collectionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || (a.subtitle ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const handleArchive = async (id: string) => {
    await supabase.from("help_articles").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", id);
    toast({ title: t("help.archiveSuccess") });
    loadData();
  };

  const handlePublish = async (id: string) => {
    await supabase.from("help_articles").update({ status: "published", published_at: new Date().toISOString() }).eq("id", id);
    toast({ title: t("help.publishSuccess") });
    loadData();
  };

  const handleCopyLink = (slug: string) => {
    const base = tenantSlug ? `/${tenantSlug}/help` : "/help";
    navigator.clipboard.writeText(`${window.location.origin}${base}/a/${slug}`);
    toast({ title: t("help.linkCopied") });
  };

  const handleDuplicate = async (art: Article) => {
    const { data: versions } = await supabase
      .from("help_article_versions")
      .select("editor_schema_json, html_snapshot")
      .eq("article_id", art.id)
      .order("version_number", { ascending: false })
      .limit(1);

    const { data: newArt } = await supabase
      .from("help_articles")
      .insert({
        tenant_id: tenantId!,
        title: `${art.title} (cópia)`,
        subtitle: art.subtitle,
        slug: `${art.slug}-copy-${Date.now()}`,
        status: "draft",
        collection_id: art.collection_id,
        created_by_user_id: (await supabase.auth.getUser()).data.user!.id,
      })
      .select("id")
      .single();

    if (newArt && versions?.[0]) {
      await supabase.from("help_article_versions").insert({
        tenant_id: tenantId!,
        article_id: newArt.id,
        version_number: 1,
        editor_schema_json: versions[0].editor_schema_json,
        html_snapshot: versions[0].html_snapshot,
        change_summary: "Duplicado",
        created_by_user_id: (await supabase.auth.getUser()).data.user!.id,
      });
    }

    toast({ title: t("help.saveSuccess") });
    loadData();
  };

  const publicHelpUrl = tenantSlug ? `${window.location.origin}/${tenantSlug}/help` : `${window.location.origin}/help`;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t("help.articles")} subtitle={t("help.title")}>
        <Button onClick={() => navigate("/help/articles/new")}><Plus className="h-4 w-4 mr-2" />{t("help.newArticle")}</Button>
      </PageHeader>

      {/* Link to public Help Center */}
      <a
        href={publicHelpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ExternalLink className="h-4 w-4" />
        Abrir Help Center público
      </a>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("help.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("help.filterByStatus")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("help.allStatuses")}</SelectItem>
            <SelectItem value="draft">{t("help.status.draft")}</SelectItem>
            <SelectItem value="published">{t("help.status.published")}</SelectItem>
            <SelectItem value="archived">{t("help.status.archived")}</SelectItem>
            <SelectItem value="pending_review">{t("help.status.pending_review")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={collectionFilter} onValueChange={setCollectionFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder={t("help.filterByCollection")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("help.allCollections")}</SelectItem>
            {collections.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("help.articleTitle")}</TableHead>
              <TableHead>{t("help.articleCollection")}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{t("help.updatedAt")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("help.noArticles")}</TableCell></TableRow>
            ) : (
              filtered.map(art => (
                <TableRow key={art.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/help/articles/${art.id}/edit`)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{art.title}</p>
                        {art.subtitle && <p className="text-xs text-muted-foreground truncate max-w-[300px]">{art.subtitle}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{art.collection_name || "—"}</TableCell>
                  <TableCell><Badge className={statusColors[art.status] || ""}>{t(`help.status.${art.status}`)}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(art.updated_at), "dd/MM/yy HH:mm")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        {art.status === "draft" && <DropdownMenuItem onClick={() => handlePublish(art.id)}><ExternalLink className="h-4 w-4 mr-2" />{t("help.publish")}</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => handleDuplicate(art)}><Copy className="h-4 w-4 mr-2" />{t("help.duplicate")}</DropdownMenuItem>
                        {art.status === "published" && <DropdownMenuItem onClick={() => handleCopyLink(art.slug)}><Copy className="h-4 w-4 mr-2" />{t("help.copyLink")}</DropdownMenuItem>}
                        {art.status !== "archived" && <DropdownMenuItem onClick={() => handleArchive(art.id)}><Archive className="h-4 w-4 mr-2" />{t("help.archive")}</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
