import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const PendingApproval = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-dark-hero p-4 gap-6">
      <img src="/logo-icon-dark.svg" alt="Journey" className="h-10 w-10" />
      <Card className="w-full max-w-md p-8 text-center space-y-4 border-white/10 bg-card/80 backdrop-blur-sm">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-xl font-semibold">{t("chat.pending.title")}</h1>
        <p className="text-muted-foreground">{t("chat.pending.description")}</p>
      </Card>
    </div>
  );
};

export default PendingApproval;
