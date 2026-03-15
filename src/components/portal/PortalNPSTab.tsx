import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";

interface PortalNPSTabProps {
  companyId: string;
  contactName: string;
}

interface NPSResponse {
  id: string;
  score: number;
  comment: string | null;
  responded_at: string;
  campaigns: { name: string } | null;
}

export default function PortalNPSTab({ companyId, contactName }: PortalNPSTabProps) {
  const [responses, setResponses] = useState<NPSResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNPS = async () => {
      const { data } = await supabase
        .from("responses")
        .select("id, score, comment, responded_at, campaigns(name)")
        .eq("contact_id", companyId)
        .order("responded_at", { ascending: false })
        .limit(20);
      setResponses((data as any) || []);
      setLoading(false);
    };
    fetchNPS();
  }, [companyId]);

  const getScoreColor = (score: number) => {
    if (score >= 9) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (score >= 7) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const getLabel = (score: number) => {
    if (score >= 9) return "Promotor";
    if (score >= 7) return "Neutro";
    return "Detrator";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
        <p className="text-muted-foreground">Nenhuma pesquisa NPS respondida ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {responses.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">{r.campaigns?.name || "Campanha NPS"}</p>
                <Badge className={`text-xs ${getScoreColor(r.score)}`}>
                  {r.score} — {getLabel(r.score)}
                </Badge>
                {r.comment && (
                  <p className="text-sm text-muted-foreground italic mt-1">"{r.comment}"</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(r.responded_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
