import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Plus, Tag, X, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ChatTag {
  id: string;
  name: string;
  color: string;
}

interface ChatTagSelectorProps {
  roomId: string;
  compact?: boolean;
}

const RANDOM_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
];

export function ChatTagSelector({ roomId, compact }: ChatTagSelectorProps) {
  const { user } = useAuth();
  const [allTags, setAllTags] = useState<ChatTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [tagsRes, roomTagsRes] = await Promise.all([
      supabase.from("chat_tags").select("id, name, color").order("name"),
      supabase.from("chat_room_tags").select("tag_id").eq("room_id", roomId),
    ]);
    setAllTags(
      (tagsRes.data ?? []).map((t) => ({ id: t.id, name: t.name, color: t.color ?? "#6366f1" }))
    );
    setSelectedTagIds(new Set((roomTagsRes.data ?? []).map((rt) => rt.tag_id)));
  }, [roomId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedTags = allTags.filter((t) => selectedTagIds.has(t.id));
  const availableTags = allTags.filter(
    (t) => !selectedTagIds.has(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  );

  const addTag = async (tagId: string) => {
    const { error } = await supabase
      .from("chat_room_tags")
      .insert({ room_id: roomId, tag_id: tagId });
    if (!error) {
      setSelectedTagIds((prev) => new Set(prev).add(tagId));
    }
  };

  const removeTag = async (tagId: string) => {
    const { error } = await supabase
      .from("chat_room_tags")
      .delete()
      .eq("room_id", roomId)
      .eq("tag_id", tagId);
    if (!error) {
      setSelectedTagIds((prev) => {
        const next = new Set(prev);
        next.delete(tagId);
        return next;
      });
    }
  };

  const createTag = async () => {
    const name = newTagName.trim();
    if (!name || !user) return;
    setCreating(true);
    const color = RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
    const { data, error } = await supabase
      .from("chat_tags")
      .insert({ name, color, user_id: user.id })
      .select("id, name, color")
      .single();

    if (error) {
      toast.error("Erro ao criar tag");
      setCreating(false);
      return;
    }

    await supabase.from("chat_room_tags").insert({ room_id: roomId, tag_id: data.id });

    setAllTags((prev) => [...prev, { id: data.id, name: data.name, color: data.color ?? color }]);
    setSelectedTagIds((prev) => new Set(prev).add(data.id));
    setNewTagName("");
    setCreating(false);
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center gap-2">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</span>
      </div>

      {/* Selected tags as compact badges */}
      <div className="flex flex-wrap gap-1.5">
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="cursor-pointer transition-all text-xs ring-1 ring-offset-1"
            style={{
              borderColor: tag.color,
              color: "white",
              backgroundColor: tag.color,
            }}
            onClick={() => removeTag(tag.id)}
          >
            {tag.name}
            <X className="h-3 w-3 ml-1" />
          </Badge>
        ))}

        {/* Add tag button with popover */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs gap-1 px-2"
            >
              <Plus className="h-3 w-3" />
              Adicionar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            {/* Search input */}
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tag..."
                className="h-7 text-xs pl-7"
                autoFocus
              />
            </div>

            {/* Available tags list */}
            <div className="max-h-36 overflow-y-auto space-y-0.5">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => addTag(tag.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted/80 transition-colors text-left"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="truncate">{tag.name}</span>
                </button>
              ))}
              {availableTags.length === 0 && !search && (
                <p className="text-[11px] text-muted-foreground text-center py-2">Todas as tags já foram adicionadas</p>
              )}
              {availableTags.length === 0 && search && (
                <p className="text-[11px] text-muted-foreground text-center py-2">Nenhuma tag encontrada</p>
              )}
            </div>

            {/* Create new tag */}
            <div className="border-t mt-2 pt-2 flex gap-1.5">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nova tag..."
                className="h-7 text-xs"
                onKeyDown={(e) => e.key === "Enter" && createTag()}
              />
              <Button
                size="sm"
                className="h-7 text-xs px-2"
                onClick={createTag}
                disabled={creating || !newTagName.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
