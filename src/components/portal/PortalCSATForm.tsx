import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2 } from "lucide-react";

interface PortalCSATFormProps {
  onSubmit: (score: number, comment: string) => Promise<void>;
}

const PortalCSATForm = ({ onSubmit }: PortalCSATFormProps) => {
  const { t } = useLanguage();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) return;
    setSubmitting(true);
    await onSubmit(score, comment);
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center text-center space-y-3 py-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium">{t("chat.portal.thanks")}</p>
        <p className="text-xs text-muted-foreground">Sua avaliação nos ajuda a melhorar nosso atendimento.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4 border-t pt-4">
      <p className="text-sm font-medium text-center">{t("chat.portal.rate_service")}</p>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} onClick={() => setScore(v)} className="focus:outline-none transition-transform hover:scale-110">
            <Star className={`h-8 w-8 ${v <= score ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Textarea
        placeholder={t("chat.portal.rate_comment")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button className="w-full" onClick={handleSubmit} disabled={score === 0 || submitting}>
        {t("chat.portal.submit_rating")}
      </Button>
    </div>
  );
};

export default PortalCSATForm;
