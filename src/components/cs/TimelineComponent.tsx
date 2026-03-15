import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CalendarDays, 
  Mail, 
  Phone, 
  FileText, 
  DollarSign, 
  CheckCircle, 
  Star,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
  user_name: string;
  metadata: Record<string, unknown>;
}

interface TimelineComponentProps {
  events: TimelineEvent[];
}

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  meeting: CalendarDays,
  email: Mail,
  call: Phone,
  contract: FileText,
  payment: DollarSign,
  activity: CheckCircle,
  nps_response: Star,
};

const EVENT_COLORS: Record<string, string> = {
  meeting: "bg-blue-500",
  email: "bg-purple-500",
  call: "bg-green-500",
  contract: "bg-orange-500",
  payment: "bg-emerald-500",
  activity: "bg-primary",
  nps_response: "bg-yellow-500",
};

export function TimelineComponent({ events }: TimelineComponentProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "pt-BR" ? ptBR : enUS;

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{t("cs.noTimelineEvents")}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-6">
          {events.map((event, index) => {
            const Icon = EVENT_ICONS[event.type] || MessageSquare;
            const color = EVENT_COLORS[event.type] || "bg-muted";

            return (
              <div key={event.id} className="relative pl-10">
                {/* Icon circle */}
                <div 
                  className={`absolute left-0 w-8 h-8 rounded-full ${color} flex items-center justify-center`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>

                {/* Content */}
                <div className="bg-card border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.date), "PPp", { locale: dateLocale })}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("cs.byUser")}: {event.user_name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
