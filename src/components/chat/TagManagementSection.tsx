import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface TagItem {
  id: string;
  name: string;
  color: string | null;
  created_at: string | null;
}

const TAGS_PER_PAGE = 24;

const TagManagementSection = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [form, setForm] = useState({ name: "", color: "#6366f1" });
  const [deleteTag, setDeleteTag] = useState<TagItem | null>(null);
  const [deleteUsageCount, setDeleteUsageCount] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchTags = useCallback(async () => {
    const { data } = await supabase
      .from("chat_tags")
      .select("id, name, color, created_at")
      .order("name");
    if (data) setTags(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const filtered = useMemo(() => {
    if (!search) return tags;
    const q = search.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / TAGS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * TAGS_PER_PAGE, currentPage * TAGS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search]);

  const openDialog = (tag?: TagItem) => {
    if (tag) {
      setEditingTag(tag);
      setForm({ name: tag.name, color: tag.color ?? "#6366f1" });
    } else {
      setEditingTag(null);
      setForm({ name: "", color: "#6366f1" });
    }
    setDialogOpen(true);
  };

  const saveTag = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (editingTag) {
      await supabase.from("chat_tags").update({ name: form.name, color: form.color }).eq("id", editingTag.id);
    } else {
      await supabase.from("chat_tags").insert({ user_id: session.user.id, name: form.name, color: form.color });
    }
    setDialogOpen(false);
    toast({ title: t("chat.settings.saved") });
    fetchTags();
  };

  const handleDeleteClick = async (tag: TagItem) => {
    setDeleteTag(tag);
    setDeleteUsageCount(null);
    const { count } = await supabase
      .from("chat_room_tags")
      .select("tag_id", { count: "exact", head: true })
      .eq("tag_id", tag.id);
    setDeleteUsageCount(count ?? 0);
  };

  const confirmDelete = async () => {
    if (!deleteTag) return;
    await supabase.from("chat_room_tags").delete().eq("tag_id", deleteTag.id);
    await supabase.from("chat_tags").delete().eq("id", deleteTag.id);
    setDeleteTag(null);
    toast({ title: t("chat.settings.saved") });
    fetchTags();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">{t("chat.tags.manage_title")}</CardTitle>
              <CardDescription>{t("chat.tags.manage_description")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">{filtered.length} tags</span>
              <Button size="sm" onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                {t("chat.tags.new")}
              </Button>
            </div>
          </div>
          {tags.length > 0 && (
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 max-w-xs"
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "Nenhuma tag encontrada" : t("chat.tags.no_tags")}
            </p>
          ) : (
            <>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left font-medium px-3 py-2 text-muted-foreground">Cor</th>
                      <th className="text-left font-medium px-3 py-2 text-muted-foreground">Nome</th>
                      <th className="text-left font-medium px-3 py-2 text-muted-foreground hidden sm:table-cell">Criada em</th>
                      <th className="text-right font-medium px-3 py-2 text-muted-foreground w-20">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((tag) => (
                      <tr key={tag.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 w-10">
                          <div className="h-3 w-3 rounded-full ring-1 ring-border" style={{ backgroundColor: tag.color ?? "#6366f1" }} />
                        </td>
                        <td className="px-3 py-2 font-medium">{tag.name}</td>
                        <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                          {tag.created_at ? format(new Date(tag.created_at), "dd/MM/yyyy") : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(tag)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick(tag)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((p, idx, arr) => (
                          <PaginationItem key={p}>
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <span className="px-2 text-muted-foreground">…</span>
                            )}
                            <PaginationLink isActive={p === currentPage} onClick={() => setPage(p)} className="cursor-pointer">
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? t("common.edit") : t("chat.tags.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("chat.tags.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Suporte Técnico" />
            </div>
            <div className="space-y-2">
              <Label>{t("chat.tags.color")}</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-28" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveTag} disabled={!form.name.trim()}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTag} onOpenChange={(open) => !open && setDeleteTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.tags.delete_confirm")}
              {deleteUsageCount === null ? (
                <span className="block mt-2 text-muted-foreground text-xs">Verificando uso...</span>
              ) : deleteUsageCount > 0 ? (
                <span className="block mt-2 font-medium">
                  Esta tag está sendo usada em {deleteUsageCount} conversa(s).
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TagManagementSection;
