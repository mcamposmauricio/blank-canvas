import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Pencil, Trash2, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/utils/helpSlug";

const ICON_GROUPS = [
  { label: "Geral", icons: ["📚", "📖", "📝", "📋", "📌", "📎", "📂", "🗂️", "🗃️", "📄"] },
  { label: "Suporte", icons: ["💬", "❓", "✅", "⚠️", "🔔", "🛟", "🆘", "📞", "📧", "💡"] },
  { label: "Tecnologia", icons: ["💻", "📱", "🌐", "🔒", "⚙️", "🔧", "🛠️", "🧩", "🔗", "📡"] },
  { label: "Negócios", icons: ["📊", "📈", "💰", "🛒", "🏢", "🤝", "🏆", "🎯", "📦", "💎"] },
  { label: "Pessoas", icons: ["👥", "🎓", "🧑‍💻", "👋", "🌟", "🚀", "🎉", "⭐", "🎨", "📅"] },
];

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  status: string;
  order_index: number;
  article_count?: number;
}

export default function HelpCollections() {
  const { t } = useLanguage();
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📚");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (tenantId) loadCollections(); }, [tenantId]);

  const loadCollections = async () => {
    const { data: cols } = await supabase.from("help_collections").select("*").eq("tenant_id", tenantId!).order("order_index");
    const { data: articles } = await supabase.from("help_articles").select("collection_id").eq("tenant_id", tenantId!).eq("status", "published").not("collection_id", "is", null);
    const countMap: Record<string, number> = {};
    (articles ?? []).forEach(a => { if (a.collection_id) countMap[a.collection_id] = (countMap[a.collection_id] || 0) + 1; });
    setCollections((cols ?? []).map(c => ({ ...c, article_count: countMap[c.id] || 0 })));
  };

  const openCreate = () => { setEditing(null); setName(""); setSlug(""); setDescription(""); setIcon("📚"); setDialogOpen(true); };
  const openEdit = (c: Collection) => { setEditing(c); setName(c.name); setSlug(c.slug); setDescription(c.description || ""); setIcon(c.icon || "📚"); setDialogOpen(true); };

  const handleSave = async () => {
    if (!name.trim() || !tenantId) return;
    setSaving(true);
    const finalSlug = slug || slugify(name);
    if (editing) {
      await supabase.from("help_collections").update({ name, slug: finalSlug, description: description || null, icon }).eq("id", editing.id);
    } else {
      await supabase.from("help_collections").insert({ tenant_id: tenantId, name, slug: finalSlug, description: description || null, icon, order_index: collections.length });
    }
    toast({ title: t("help.collectionSaveSuccess") });
    setSaving(false);
    setDialogOpen(false);
    loadCollections();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("help_collections").delete().eq("id", id);
    toast({ title: t("help.collectionDeleteSuccess") });
    loadCollections();
  };

  const moveCollection = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= collections.length) return;
    const updated = [...collections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setCollections(updated);
    await Promise.all(updated.map((c, i) => supabase.from("help_collections").update({ order_index: i }).eq("id", c.id)));
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t("help.collections")} subtitle={t("help.title")}>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />{t("help.newCollection")}</Button>
      </PageHeader>

      {collections.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{t("help.noCollections")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {collections.map((col, i) => (
            <Card key={col.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center gap-4 py-3 px-4">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveCollection(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">▲</button>
                  <button onClick={() => moveCollection(i, 1)} disabled={i === collections.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">▼</button>
                </div>
                <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                <span className="text-xl">{col.icon || "📚"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{col.name}</p>
                  {col.description && <p className="text-xs text-muted-foreground truncate">{col.description}</p>}
                </div>
                <Badge variant="secondary" className="text-xs">{col.article_count ?? 0} artigos</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(col)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(col.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("help.editArticle") : t("help.newCollection")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("help.collectionName")}</Label>
              <Input value={name} onChange={e => { setName(e.target.value); if (!editing) setSlug(slugify(e.target.value)); }} placeholder={t("help.collectionNamePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.collectionSlug")}</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug-da-colecao" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.collectionIcon")}</Label>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-lg border bg-muted/50 flex items-center justify-center text-2xl">
                  {icon}
                </div>
                <Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="📚" className="w-24 text-center" />
              </div>
              <div className="space-y-2 max-h-48 overflow-auto rounded-lg border bg-muted/30 p-3">
                {ICON_GROUPS.map(group => (
                  <div key={group.label}>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">{group.label}</p>
                    <div className="flex flex-wrap gap-1">
                      {group.icons.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setIcon(emoji)}
                          className={`h-9 w-9 rounded-md flex items-center justify-center text-lg transition-all duration-150 hover:bg-accent ${icon === emoji ? "ring-2 ring-primary bg-primary/10" : "hover:scale-110"}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.collectionDescription")}</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("team.cancel")}</Button>
              <Button onClick={handleSave} disabled={saving || !name.trim()}>{saving ? "..." : t("team.save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
