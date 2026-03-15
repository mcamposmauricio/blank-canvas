import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

const EMOJI_CATEGORIES = [
  {
    label: "😀",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😋", "😛", "🤔", "🤗", "🤫", "😎", "🥳", "😢", "😭", "😤", "😡", "🤯", "😱", "😰", "🙄"],
  },
  {
    label: "👍",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "✌️", "🤞", "👋", "✋", "🖐️", "👌", "🤙", "👈", "👉", "👆", "👇"],
  },
  {
    label: "❤️",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "💯", "💥", "🔥", "⭐", "🌟", "✨", "⚡", "🎉", "🎊", "🏆", "🎯", "✅", "❌", "⚠️", "📌", "🔗", "💡", "📊", "📈", "📉", "🕐", "📝"],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="shrink-0 h-9 w-9" title="Emoji">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" side="top" align="start">
        <div className="flex gap-1 mb-2 border-b pb-1">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`text-sm px-2 py-1 rounded ${tab === i ? "bg-muted" : "hover:bg-muted/50"}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-0.5 max-h-40 overflow-auto">
          {EMOJI_CATEGORIES[tab].emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-base"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
