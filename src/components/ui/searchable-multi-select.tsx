import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
  color?: string;
}

interface SearchableMultiSelectProps {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function SearchableMultiSelect({ label, options, selected, onChange, placeholder }: SearchableMultiSelectProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 min-w-[120px]">
          <Filter className="h-3.5 w-3.5" />
          <span className="truncate max-w-[100px]">{label}</span>
          {selected.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] rounded-full">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="start">
        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder ?? "Buscar..."}
            className="h-8 text-xs pl-8"
            autoFocus
          />
        </div>

        {/* Options list */}
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={() => toggle(opt.value)}
              />
              {opt.color && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
              )}
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-3">
              Nenhum resultado
            </p>
          )}
        </div>

        {/* Clear button */}
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[11px] mt-1"
            onClick={() => onChange([])}
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
