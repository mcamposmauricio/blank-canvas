import { useRef, useEffect, useCallback, useState } from "react";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Paintbrush, Link2 } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface BannerRichEditorProps {
  initialHtml?: string;
  textAlign: "left" | "center" | "right";
  onChangeAlign: (align: "left" | "center" | "right") => void;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
}

const TEXT_COLORS = [
  "#FFFFFF", "#000000", "#EF4444", "#F97316", "#EAB308",
  "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280",
];

const CharCounter = ({ editorRef }: { editorRef: React.RefObject<HTMLDivElement> }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const update = () => setCount(el.textContent?.length ?? 0);
    update();
    el.addEventListener("input", update);
    return () => el.removeEventListener("input", update);
  }, [editorRef]);
  const remaining = 160 - count;
  return (
    <span className={`text-[10px] font-mono tabular-nums ${remaining < 0 ? "text-destructive font-semibold" : remaining <= 20 ? "text-amber-500" : "text-muted-foreground"}`}>
      {count}/160
    </span>
  );
};

const BannerRichEditor = ({
  initialHtml,
  textAlign,
  onChangeAlign,
  onChange,
  placeholder = "Texto do banner...",
}: BannerRichEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    if (editorRef.current && !initialized.current) {
      if (initialHtml) {
        editorRef.current.innerHTML = initialHtml;
      }
      initialized.current = true;
    }
  }, [initialHtml]);

  const sanitizeLinks = (html: string): string => {
    const div = document.createElement("div");
    div.innerHTML = html;
    div.querySelectorAll("a").forEach((a) => {
      a.style.wordBreak = "break-all";
    });
    return div.innerHTML;
  };

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const plainText = editorRef.current.textContent ?? "";
    // Enforce 160 char limit
    if (plainText.length > 160) {
      // Truncate text content back to 160
      const sel = window.getSelection();
      const range = sel?.getRangeAt(0);
      editorRef.current.textContent = plainText.slice(0, 160);
      // Restore cursor to end
      if (range) {
        const newRange = document.createRange();
        newRange.selectNodeContents(editorRef.current);
        newRange.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(newRange);
      }
    }
    const sanitized = sanitizeLinks(editorRef.current.innerHTML);
    onChange(sanitized, editorRef.current.textContent ?? "");
  }, [onChange]);

  const execCmd = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    handleInput();
  };

  const insertLink = () => {
    if (!linkUrl) return;
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    editorRef.current?.focus();
    document.execCommand("createLink", false, url);
    handleInput();
    setLinkUrl("");
    setLinkOpen(false);
  };

  return (
    <div className="space-y-1.5">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap border rounded-md p-1 bg-muted/30">
        <Toggle size="sm" className="h-7 w-7 p-0" pressed={false} onPressedChange={() => execCmd("bold")} aria-label="Bold">
          <Bold className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" className="h-7 w-7 p-0" pressed={false} onPressedChange={() => execCmd("italic")} aria-label="Italic">
          <Italic className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" className="h-7 w-7 p-0" pressed={false} onPressedChange={() => execCmd("underline")} aria-label="Underline">
          <Underline className="h-3.5 w-3.5" />
        </Toggle>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Text color */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="inline-flex items-center justify-center rounded-md h-7 w-7 text-sm hover:bg-muted" aria-label="Text color">
              <Paintbrush className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="bottom" align="start">
            <div className="grid grid-cols-5 gap-1">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => execCmd("foreColor", color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Insert link */}
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="inline-flex items-center justify-center rounded-md h-7 w-7 text-sm hover:bg-muted" aria-label="Insert link">
              <Link2 className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-2" side="bottom" align="start">
            <Label className="text-xs">URL do link</Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://exemplo.com"
              className="h-8 text-xs"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertLink(); } }}
            />
            <Button size="sm" className="w-full h-7 text-xs" onClick={insertLink} disabled={!linkUrl}>
              Inserir
            </Button>
          </PopoverContent>
        </Popover>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Alignment */}
        <Toggle size="sm" className="h-7 w-7 p-0" pressed={textAlign === "left"} onPressedChange={() => onChangeAlign("left")} aria-label="Align left">
          <AlignLeft className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" className="h-7 w-7 p-0" pressed={textAlign === "center"} onPressedChange={() => onChangeAlign("center")} aria-label="Align center">
          <AlignCenter className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" className="h-7 w-7 p-0" pressed={textAlign === "right"} onPressedChange={() => onChangeAlign("right")} aria-label="Align right">
          <AlignRight className="h-3.5 w-3.5" />
        </Toggle>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const el = editorRef.current;
            if (!el) return;
            const lines = el.innerHTML.split(/<br\s*\/?>|<\/div>|<\/p>/).filter(Boolean);
            if (lines.length >= 2) {
              e.preventDefault();
            }
          }
        }}
        data-placeholder={placeholder}
        className="min-h-[3.5rem] max-h-[4.5rem] overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
        style={{ textAlign, lineHeight: "1.4" }}
      />
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">Máx. 80 caracteres por linha (2 linhas). Use Enter para quebrar linha.</p>
        <CharCounter editorRef={editorRef} />
      </div>
    </div>
  );
};

export default BannerRichEditor;
