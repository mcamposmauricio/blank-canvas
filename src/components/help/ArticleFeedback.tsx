import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface ArticleFeedbackProps {
  articleId: string;
  tenantId: string;
  primaryColor?: string;
}

export function ArticleFeedback({ articleId, tenantId, primaryColor = "#3B82F6" }: ArticleFeedbackProps) {
  const [voted, setVoted] = useState<boolean | null>(null);
  const [counts, setCounts] = useState({ helpful: 0, notHelpful: 0 });

  const visitorId = localStorage.getItem("help_visitor_id") || "";

  useEffect(() => {
    // Check if visitor already voted
    const checkVote = async () => {
      if (!visitorId) return;
      const { data } = await supabase
        .from("help_article_feedback")
        .select("helpful")
        .eq("article_id", articleId)
        .eq("visitor_id", visitorId)
        .maybeSingle();
      if (data) setVoted(data.helpful);
    };

    // Get counts
    const fetchCounts = async () => {
      const [{ count: helpfulCount }, { count: notHelpfulCount }] = await Promise.all([
        supabase.from("help_article_feedback").select("id", { count: "exact", head: true }).eq("article_id", articleId).eq("helpful", true),
        supabase.from("help_article_feedback").select("id", { count: "exact", head: true }).eq("article_id", articleId).eq("helpful", false),
      ]);
      setCounts({ helpful: helpfulCount || 0, notHelpful: notHelpfulCount || 0 });
    };

    checkVote();
    fetchCounts();
  }, [articleId, visitorId]);

  const handleVote = async (helpful: boolean) => {
    if (voted !== null) return;
    setVoted(helpful);
    setCounts((prev) => ({
      helpful: prev.helpful + (helpful ? 1 : 0),
      notHelpful: prev.notHelpful + (helpful ? 0 : 1),
    }));

    await supabase.from("help_article_feedback").insert({
      tenant_id: tenantId,
      article_id: articleId,
      helpful,
      visitor_id: visitorId || null,
    });
  };

  return (
    <div className="mt-12 pt-8" style={{ borderTop: "1px solid #e2e8f0" }}>
      <p className="text-sm font-medium mb-3" style={{ color: "#475569" }}>
        Este artigo foi útil?
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleVote(true)}
          disabled={voted !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: voted === true ? `${primaryColor}15` : "#f1f5f9",
            color: voted === true ? primaryColor : "#64748b",
            border: voted === true ? `1px solid ${primaryColor}40` : "1px solid transparent",
            cursor: voted !== null ? "default" : "pointer",
            opacity: voted === false ? 0.5 : 1,
          }}
        >
          <ThumbsUp className="h-4 w-4" />
          Sim {counts.helpful > 0 && `(${counts.helpful})`}
        </button>
        <button
          onClick={() => handleVote(false)}
          disabled={voted !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: voted === false ? "#fef2f2" : "#f1f5f9",
            color: voted === false ? "#ef4444" : "#64748b",
            border: voted === false ? "1px solid #fecaca" : "1px solid transparent",
            cursor: voted !== null ? "default" : "pointer",
            opacity: voted === true ? 0.5 : 1,
          }}
        >
          <ThumbsDown className="h-4 w-4" />
          Não {counts.notHelpful > 0 && `(${counts.notHelpful})`}
        </button>
      </div>
      {voted !== null && (
        <p className="text-xs mt-2" style={{ color: "#94a3b8" }}>
          Obrigado pelo seu feedback!
        </p>
      )}
    </div>
  );
}
