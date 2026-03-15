import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, X } from "lucide-react";

interface BrandSettings {
  company_name: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

interface PendingData {
  has_pending: boolean;
  campaign_id?: string;
  token?: string;
  contact_name?: string;
  message?: string;
  brand_settings?: BrandSettings | null;
  reason?: string;
}

// Skeleton Loading Component
const WidgetSkeleton = () => (
  <div className="flex items-center justify-center p-3 h-full overflow-hidden">
    <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md animate-pulse overflow-hidden">
      {/* Close button skeleton */}
      <div className="flex justify-end mb-3">
        <div className="w-4 h-4 bg-gray-200 rounded"></div>
      </div>
      
      {/* Greeting skeleton */}
      <div className="h-3 bg-gray-100 rounded w-24 mb-1"></div>
      
      {/* Question skeleton */}
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      
      {/* Score buttons skeleton */}
      <div className="flex justify-between gap-1 mb-2">
        {[...Array(11)].map((_, i) => (
          <div key={i} className="w-7 h-7 bg-gray-200 rounded-full"></div>
        ))}
      </div>
      
      {/* Labels skeleton */}
      <div className="flex justify-between mb-4">
        <div className="h-3 bg-gray-100 rounded w-16"></div>
        <div className="h-3 bg-gray-100 rounded w-20"></div>
      </div>
      
      {/* Textarea skeleton - space reserved */}
      <div className="h-14 bg-gray-100 rounded-lg mb-2"></div>
      
      {/* Button skeleton */}
      <div className="h-9 bg-gray-200 rounded-full"></div>
    </div>
  </div>
);

const NPSEmbed = () => {
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get("api_key");
  const externalId = searchParams.get("external_id");

  const [loading, setLoading] = useState(true);
  const [pendingData, setPendingData] = useState<PendingData | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey && externalId) {
      checkPendingNPS();
    } else {
      setLoading(false);
      setError("Missing api_key or external_id");
    }
  }, [apiKey, externalId]);

  const checkPendingNPS = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-nps-pending", {
        body: { api_key: apiKey, external_id: externalId }
      });

      if (error) throw error;
      setPendingData(data);

      // Notify parent window about survey availability
      if (data?.has_pending) {
        window.parent?.postMessage({
          type: "nps-ready",
          external_id: externalId
        }, "*");
      } else {
        window.parent?.postMessage({
          type: "nps-no-survey",
          external_id: externalId,
          reason: data?.reason || "unknown"
        }, "*");
      }
    } catch (err: any) {
      console.error("Error checking NPS:", err);
      setError(err.message);

      // Notify parent about error
      window.parent?.postMessage({
        type: "nps-no-survey",
        external_id: externalId,
        reason: "error"
      }, "*");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedScore === null || !pendingData?.token) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-embedded-response", {
        body: {
          api_key: apiKey,
          token: pendingData.token,
          score: selectedScore,
          comment: comment.trim() || null
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setSubmitted(true);

      // Notify parent window with external_id
      window.parent?.postMessage({
        type: "nps-complete",
        score: selectedScore,
        external_id: externalId
      }, "*");
    } catch (err: any) {
      console.error("Error submitting response:", err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    window.parent?.postMessage({
      type: "nps-dismiss",
      external_id: externalId
    }, "*");
  };

  // Apply brand colors
  const brandColors = pendingData?.brand_settings;
  const primaryColor = brandColors?.primary_color || "#1E7345";

  // Loading state with skeleton
  if (loading) {
    return <WidgetSkeleton />;
  }

  // Dismissed or no pending NPS
  if (dismissed || !pendingData?.has_pending) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-3 h-full overflow-hidden">
        <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md text-center overflow-hidden">
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="flex items-center justify-center p-3 h-full overflow-hidden">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center animate-scale-in overflow-hidden">
          <div 
            className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle2 className="h-6 w-6" style={{ color: primaryColor }} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Obrigado!</h2>
          <p className="text-sm text-gray-500">Sua avaliação foi registrada.</p>
        </div>
      </div>
    );
  }

  // Main widget
  return (
    <div className="flex items-center justify-center p-3 h-full overflow-hidden">
      <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md relative flex flex-col overflow-hidden">
        {/* Close button - discrete */}
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content area */}
        <div className="flex-1">
          {/* Greeting */}
          {pendingData.contact_name && (
            <p className="text-sm text-gray-500 mb-1">
              Olá, {pendingData.contact_name.split(" ")[0]}
            </p>
          )}
          
          {/* Question */}
          <h3 className="text-base font-medium text-gray-900 mb-4 pr-8 leading-relaxed">
            {pendingData.message || "Em uma escala de 0 a 10, o quanto você nos recomendaria?"}
          </h3>

          {/* Score buttons */}
          <div className="flex justify-between gap-1 mb-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <button
                key={score}
                onClick={() => setSelectedScore(score)}
                className={`
                  w-7 h-7 rounded-full text-xs font-medium 
                  transition-all duration-200 ease-out
                  ${selectedScore === score 
                    ? "text-white scale-110 shadow-md" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }
                `}
                style={selectedScore === score ? { backgroundColor: primaryColor } : {}}
              >
                {score}
              </button>
            ))}
          </div>

          {/* Labels */}
          <div className="flex justify-between text-xs text-gray-400 mb-4">
            <span>Improvável</span>
            <span>Muito provável</span>
          </div>
        </div>

        {/* Comment and submit area - fixed space */}
        <div className="mt-auto">
          {selectedScore !== null ? (
            <div className="space-y-2 animate-fade-in">
              <Textarea
                placeholder="Conte-nos mais (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="resize-none border-gray-200 focus:border-gray-300 text-sm min-h-0"
              />

              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="w-full h-9 rounded-full font-medium transition-all"
                style={{ 
                  backgroundColor: submitting ? `${primaryColor}cc` : primaryColor,
                  color: 'white'
                }}
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Enviando...</span>
                  </div>
                ) : (
                  "Enviar"
                )}
              </Button>
            </div>
          ) : (
            /* Reserved space for comment area */
            <div className="h-[76px]"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NPSEmbed;
