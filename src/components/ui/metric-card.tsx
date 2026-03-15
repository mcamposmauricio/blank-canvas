import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  delta?: number | null;
  deltaInverted?: boolean;
  subtitle?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-accent",
  iconBgColor = "bg-accent/10",
  delta,
  deltaInverted = false,
  subtitle,
  className,
}: MetricCardProps) {
  const isPositive = delta != null && delta > 0;
  const deltaColor = deltaInverted
    ? isPositive ? "text-destructive" : "text-success"
    : isPositive ? "text-success" : "text-destructive";

  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-sm p-4 animate-fade-in", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
            {title}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            {delta != null && delta !== 0 && (
              <span className={cn("flex items-center gap-0.5 text-[10px] font-medium", deltaColor)}>
                {isPositive ? "↑" : "↓"} {Math.abs(delta)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl", iconBgColor)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>
    </div>
  );
}
