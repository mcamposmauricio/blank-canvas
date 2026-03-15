import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface TagItem {
  id: string;
  name: string;
  color: string | null;
  created_at: string | null;
  usage_count: number;
}

const TagManagementSection = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [form, setForm] = useState({ name: "", color: "#6366f1" });
  const [deleteTag, setDeleteTag] = useState<TagItem | null>(null);

  const fetchTags = useCallback(async () => {
    const { data: tagsData } = await supabase
      .from("chat_tags")
      .select("id, name, color, created_at")
      .order("name");

    if (tagsData) {
      // Count usage for each tag
      const { data: usageData } = await supabase
        .from("chat_room_tags")
        .select("tag_id");

      const usageMap = new Map<string, number>();
      (usageData ?? []).forEach((u) => {
        usageMap.set(u.tag_id, (usageMap.get(u.tag_id) ?? 0) + 1);
      });

      setTags(tagsData.map((tag) => ({
        ...tag,
        usage_count: usageMap.get(tag.id) ?? 0,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

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
      await supabase.from("chat_tags").update({
        name: form.name,
        color: form.color,
      }).eq("id", editingTag.id);
    } else {
      await supabase.from("chat_tags").insert({
        user_id: session.user.id,
        name: form.name,
        color: form.color,
      });
    }

    setDialogOpen(false);
    toast({ title: t("chat.settings.saved") });
    fetchTags();
  };

  const confirmDelete = async () => {
    if (!deleteTag) return;
    // Delete room_tags references first
    await supabase.from("chat_room_tags").delete().eq("tag_id", deleteTag.id);
    // Then delete the tag
    await supabase.from("chat_tags").delete().eq("id", deleteTag.id);
    setDeleteTag(null);
    toast({ title: t("chat.settings.saved") });
    fetchTags();
  };

  if (loading) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t("chat.tags.manage_title")}</CardTitle>
              <CardDescription>{t("chat.tags.manage_description")}</CardDescription>
            </div>
            <Button size="sm" onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              {t("chat.tags.new")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("chat.tags.no_tags")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("chat.tags.name")}</TableHead>
                  <TableHead>{t("chat.tags.color")}</TableHead>
                  <TableHead className="text-center">{t("chat.tags.usage_count")}</TableHead>
                  <TableHead>{t("chat.tags.created_at")}</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <Badge variant="outline" style={{ borderColor: tag.color ?? undefined, color: tag.color ?? undefined }}>
                        {tag.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: tag.color ?? "#6366f1" }} />
                        <span className="text-xs text-muted-foreground font-mono">{tag.color}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">{tag.usage_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tag.created_at ? format(new Date(tag.created_at), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(tag)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTag(tag)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTag} onOpenChange={(open) => !open && setDeleteTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.tags.delete_confirm")}
              {deleteTag && deleteTag.usage_count > 0 && (
                <span className="block mt-2 font-medium">
                  Esta tag está sendo usada em {deleteTag.usage_count} conversa(s).
                </span>
              )}
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
