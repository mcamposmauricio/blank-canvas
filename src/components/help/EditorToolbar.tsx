import { type Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold, Italic, Underline, Strikethrough,
  Heading2, Heading3,
  List, ListOrdered,
  Link2, Link2Off,
  ImageIcon, Table2, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Quote,
  Undo2, Redo2,
} from "lucide-react";
import { useRef } from "react";

interface EditorToolbarProps {
  editor: Editor;
  onImageUpload: (file: File) => Promise<string | null>;
}

export function EditorToolbar({ editor, onImageUpload }: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await onImageUpload(file);
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    e.target.value = "";
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL do link:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const Btn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b bg-card px-2 py-1 sticky top-0 z-10">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <Btn onClick={() => editor.chain().focus().undo().run()} title="Desfazer"><Undo2 className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} title="Refazer"><Redo2 className="h-4 w-4" /></Btn>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Título H2"><Heading2 className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Título H3"><Heading3 className="h-4 w-4" /></Btn>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito"><Bold className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico"><Italic className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado"><Underline className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Tachado"><Strikethrough className="h-4 w-4" /></Btn>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista"><List className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada"><ListOrdered className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação/Callout"><Quote className="h-4 w-4" /></Btn>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Alinhar à esquerda"><AlignLeft className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centralizar"><AlignCenter className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Alinhar à direita"><AlignRight className="h-4 w-4" /></Btn>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Btn onClick={setLink} active={editor.isActive("link")} title="Link">{editor.isActive("link") ? <Link2Off className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}</Btn>
      <Btn onClick={handleImageClick} title="Inserir imagem"><ImageIcon className="h-4 w-4" /></Btn>
      <Btn onClick={insertTable} title="Inserir tabela"><Table2 className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divisor"><Minus className="h-4 w-4" /></Btn>
    </div>
  );
}
