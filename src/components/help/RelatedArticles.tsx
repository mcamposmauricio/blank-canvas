import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";

interface RelatedArticlesProps {
  articleId: string;
  collectionId: string | null;
  tenantId: string;
  helpBase: string;
  primaryColor?: string;
}

interface RelatedArticle {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
}

export function RelatedArticles({ articleId, collectionId, tenantId, helpBase, primaryColor = "#3B82F6" }: RelatedArticlesProps) {
  const [articles, setArticles] = useState<RelatedArticle[]>([]);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!collectionId) return;

      const { data } = await supabase
        .from("help_articles")
        .select("id, title, subtitle, slug")
        .eq("tenant_id", tenantId)
        .eq("collection_id", collectionId)
        .eq("status", "published")
        .neq("id", articleId)
        .order("updated_at", { ascending: false })
        .limit(3);

      setArticles(data || []);
    };

    fetchRelated();
  }, [articleId, collectionId, tenantId]);

  if (articles.length === 0) return null;

  return (
    <div className="mt-12 pt-8" style={{ borderTop: "1px solid #e2e8f0" }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: "#0f172a" }}>
        Artigos relacionados
      </h3>
      <div className="grid gap-3">
        {articles.map((article) => (
          <Link
            key={article.id}
            to={`${helpBase}/a/${article.slug}`}
            className="flex items-start gap-3 p-4 rounded-xl transition-all duration-200 group"
            style={{ backgroundColor: "#f8fafc" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${primaryColor}08`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f8fafc";
            }}
          >
            <FileText className="h-5 w-5 mt-0.5 shrink-0" style={{ color: primaryColor }} />
            <div className="min-w-0">
              <p
                className="text-sm font-medium group-hover:underline truncate"
                style={{ color: "#0f172a" }}
              >
                {article.title}
              </p>
              {article.subtitle && (
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "#64748b" }}>
                  {article.subtitle}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
