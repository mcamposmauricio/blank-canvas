import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyText?: string;
  className?: string;
}

export function ChartCard({ title, children, isEmpty, emptyText = "Sem dados", className }: ChartCardProps) {
  return (
    <div className={cn("rounded-xl border border-white/[0.06] bg-card shadow-sm", className)}>
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm font-medium">{title}</p>
      </div>
      <div className="px-4 pb-4">
        {isEmpty ? (
          <div className="h-[240px] flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
            <BarChart3 className="h-8 w-8" />
            <p className="text-[11px]">{emptyText}</p>
          </div>
        ) : (
          <div className="h-[240px]">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
