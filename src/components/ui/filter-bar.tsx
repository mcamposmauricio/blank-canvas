import { cn } from "@/lib/utils";
import { Filter } from "lucide-react";

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

export function FilterBar({ children, className, showIcon = true }: FilterBarProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap bg-muted/30 rounded-xl px-4 py-3", className)}>
      {showIcon && <Filter className="h-4 w-4 text-muted-foreground shrink-0" />}
      {children}
    </div>
  );
}
