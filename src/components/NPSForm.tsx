import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { BarChart3, CheckCircle } from "lucide-react";

interface BrandSettings {
  company_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

interface NPSFormProps {
  brandSettings: BrandSettings;
  onSubmit?: (score: number, comment: string) => void;
  submitting?: boolean;
  submitted?: boolean;
  isPreview?: boolean;
}

const NPSForm = ({ 
  brandSettings, 
  onSubmit, 
  submitting = false, 
  submitted = false,
  isPreview = false 
}: NPSFormProps) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(isPreview ? 5 : null);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (selectedScore !== null && onSubmit) {
      onSubmit(selectedScore, comment);
    }
  };

  if (submitted && !isPreview) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: `linear-gradient(135deg, ${brandSettings.primary_color}, ${brandSettings.secondary_color})`
        }}
      >
        <Card className="w-full max-w-md p-8 text-center bg-background/95 backdrop-blur">
          {brandSettings.logo_url && (
            <img
              src={brandSettings.logo_url}
              alt="Logo"
              className="max-h-16 object-contain mx-auto mb-4"
            />
          )}
          <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: brandSettings.accent_color }} />
          <h1 className="text-2xl font-bold mb-2">Obrigado!</h1>
          <p className="text-muted-foreground">Sua resposta foi registrada com sucesso.</p>
        </Card>
      </div>
    );
  }

  const content = (
    <Card className="w-full max-w-2xl p-8 bg-background/95 backdrop-blur">
      <div className="flex items-center justify-center mb-8">
        {brandSettings.logo_url ? (
          <img
            src={brandSettings.logo_url}
            alt="Logo"
            className="max-h-12 object-contain mr-3"
          />
        ) : (
          <BarChart3 className="h-12 w-12 mr-3" style={{ color: brandSettings.primary_color }} />
        )}
        <h1 className="text-3xl font-bold">
          {brandSettings.company_name || "Pesquisa de Satisfação"}
        </h1>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-6 text-center">
          Em uma escala de 0 a 10, qual a probabilidade de você recomendar nossos serviços?
        </h2>

        <div className="grid grid-cols-11 gap-2 mb-2">
          {Array.from({ length: 11 }, (_, i) => i).map((score) => (
            <button
              key={score}
              onClick={() => !isPreview && setSelectedScore(score)}
              disabled={isPreview}
              className="aspect-square rounded-lg border-2 font-semibold text-lg transition-all hover:scale-105 disabled:cursor-default"
              style={{
                borderColor: selectedScore === score ? brandSettings.primary_color : 'hsl(var(--border))',
                backgroundColor: selectedScore === score 
                  ? (score >= 9 ? brandSettings.accent_color : score >= 7 ? brandSettings.secondary_color : '#ef4444')
                  : 'transparent',
                color: selectedScore === score ? 'white' : 'inherit',
                transform: selectedScore === score ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {score}
            </button>
          ))}
        </div>

        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>Muito improvável</span>
          <span>Muito provável</span>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Comentários adicionais (opcional)
        </label>
        <Textarea
          value={comment}
          onChange={(e) => !isPreview && setComment(e.target.value)}
          placeholder="Conte-nos mais sobre sua experiência..."
          rows={4}
          disabled={isPreview}
        />
      </div>

      <Button 
        onClick={handleSubmit} 
        className="w-full" 
        disabled={submitting || isPreview}
        style={{ backgroundColor: brandSettings.primary_color }}
      >
        {submitting ? "Enviando..." : "Enviar Resposta"}
      </Button>
    </Card>
  );

  if (isPreview) {
    return content;
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${brandSettings.primary_color}, ${brandSettings.secondary_color})`
      }}
    >
      {content}
    </div>
  );
};

export default NPSForm;
