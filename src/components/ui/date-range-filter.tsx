import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check, ChevronRight, ArrowLeft } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  dateFrom: string | null;
  dateTo: string | null;
  onChange: (dateFrom: string | null, dateTo: string | null) => void;
  maxRangeMonths?: number;
  className?: string;
}

type PresetKey = "today" | "yesterday" | "last7" | "last15" | "last30" | "thisMonth" | "lastMonth" | "custom";

interface Preset {
  key: PresetKey;
  label: string;
  getRange: () => { from: string; to: string };
}

const fmt = (d: Date) => format(d, "yyyy-MM-dd");
const fmtDisplay = (iso: string) => format(new Date(iso + "T00:00:00"), "dd/MM/yy", { locale: ptBR });

const presets: Preset[] = [
  { key: "today", label: "Hoje", getRange: () => { const d = new Date(); return { from: fmt(d), to: fmt(d) }; } },
  { key: "yesterday", label: "Ontem", getRange: () => { const d = subDays(new Date(), 1); return { from: fmt(d), to: fmt(d) }; } },
  { key: "last7", label: "Últimos 7 dias", getRange: () => ({ from: fmt(subDays(new Date(), 6)), to: fmt(new Date()) }) },
  { key: "last15", label: "Últimos 15 dias", getRange: () => ({ from: fmt(subDays(new Date(), 14)), to: fmt(new Date()) }) },
  { key: "last30", label: "Últimos 30 dias", getRange: () => ({ from: fmt(subDays(new Date(), 29)), to: fmt(new Date()) }) },
  { key: "thisMonth", label: "Mês atual", getRange: () => ({ from: fmt(startOfMonth(new Date())), to: fmt(new Date()) }) },
  { key: "lastMonth", label: "Mês passado", getRange: () => { const d = subMonths(new Date(), 1); return { from: fmt(startOfMonth(d)), to: fmt(endOfMonth(d)) }; } },
];

function detectPreset(dateFrom: string | null, dateTo: string | null): PresetKey {
  if (!dateFrom || !dateTo) return "last7";
  for (const p of presets) {
    const r = p.getRange();
    if (r.from === dateFrom && r.to === dateTo) return p.key;
  }
  return "custom";
}

export function DateRangeFilter({ dateFrom, dateTo, onChange, maxRangeMonths = 3, className }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(dateFrom ? new Date(dateFrom + "T00:00:00") : undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(dateTo ? new Date(dateTo + "T00:00:00") : undefined);

  const activePreset = useMemo(() => detectPreset(dateFrom, dateTo), [dateFrom, dateTo]);

  const triggerLabel = useMemo(() => {
    const presetLabel = presets.find(p => p.key === activePreset)?.label;
    if (dateFrom && dateTo) {
      const rangeStr = `${fmtDisplay(dateFrom)} — ${fmtDisplay(dateTo)}`;
      if (activePreset !== "custom" && presetLabel) {
        return { primary: presetLabel, secondary: rangeStr };
      }
      return { primary: rangeStr, secondary: null };
    }
    return { primary: presetLabel ?? "Período", secondary: null };
  }, [activePreset, dateFrom, dateTo]);

  const handlePreset = (preset: Preset) => {
    const r = preset.getRange();
    onChange(r.from, r.to);
    setShowCustom(false);
    setOpen(false);
  };

  const handleApplyCustom = () => {
    if (customFrom && customTo) {
      const diffDays = differenceInCalendarDays(customTo, customFrom);
      if (diffDays < 0) return;
      if (diffDays > maxRangeMonths * 31) return;
      onChange(fmt(customFrom), fmt(customTo));
      setShowCustom(false);
      setOpen(false);
    }
  };

  const maxDate = new Date();
  const rangeExceeded = customFrom && customTo && differenceInCalendarDays(customTo, customFrom) > maxRangeMonths * 31;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 h-9 min-w-[160px] justify-start font-normal border-border/60 hover:border-border hover:bg-accent/50 transition-all",
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-[13px] font-medium truncate">{triggerLabel.primary}</span>
          {triggerLabel.secondary && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline">· {triggerLabel.secondary}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
        {!showCustom ? (
          <div className="p-1.5 min-w-[200px]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-2.5 pt-1.5 pb-1">Período</p>
            {presets.map(p => {
              const isActive = activePreset === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => handlePreset(p)}
                  className={cn(
                    "w-full text-left text-[13px] px-2.5 py-2 rounded-md transition-all flex items-center gap-2",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  <span className={cn(
                    "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                    isActive ? "border-primary bg-primary" : "border-muted-foreground/30"
                  )}>
                    {isActive && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </span>
                  {p.label}
                </button>
              );
            })}
            <div className="border-t border-border/50 my-1" />
            <button
              onClick={() => {
                setCustomFrom(dateFrom ? new Date(dateFrom + "T00:00:00") : undefined);
                setCustomTo(dateTo ? new Date(dateTo + "T00:00:00") : undefined);
                setShowCustom(true);
              }}
              className={cn(
                "w-full text-left text-[13px] px-2.5 py-2 rounded-md transition-all flex items-center gap-2",
                activePreset === "custom"
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-accent text-foreground"
              )}
            >
              <span className={cn(
                "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                activePreset === "custom" ? "border-primary bg-primary" : "border-muted-foreground/30"
              )}>
                {activePreset === "custom" && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </span>
              Personalizado
              <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCustom(false)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Voltar
              </button>
              <span className="text-[10px] text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">Máx. {maxRangeMonths} meses</span>
            </div>

            {/* Selected range summary */}
            <div className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-2">
              <div className="flex-1 text-center">
                <p className="text-[10px] text-muted-foreground">De</p>
                <p className="text-[13px] font-medium">{customFrom ? format(customFrom, "dd/MM/yyyy") : "—"}</p>
              </div>
              <div className="text-muted-foreground text-[11px]">→</div>
              <div className="flex-1 text-center">
                <p className="text-[10px] text-muted-foreground">Até</p>
                <p className="text-[13px] font-medium">{customTo ? format(customTo, "dd/MM/yyyy") : "—"}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div>
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  locale={ptBR}
                  disabled={(date) => date > maxDate}
                  className="rounded-md border pointer-events-auto"
                />
              </div>
              <div>
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  locale={ptBR}
                  disabled={(date) => date > maxDate}
                  className="rounded-md border pointer-events-auto"
                />
              </div>
            </div>
            {rangeExceeded && (
              <p className="text-[11px] text-destructive">O período não pode exceder {maxRangeMonths} meses.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCustom(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleApplyCustom} disabled={!customFrom || !customTo || !!rangeExceeded}>
                Aplicar
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
