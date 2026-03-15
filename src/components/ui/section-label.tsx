import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p className={cn("text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 mb-3", className)}>
      {children}
    </p>
  );
}
