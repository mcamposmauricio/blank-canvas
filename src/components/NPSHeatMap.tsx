import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { BrazilMap, STATE_NAMES, getNPSColor } from "./BrazilMap";
import { MapPin, TrendingUp, Users } from "lucide-react";

interface StateNPS {
  state: string;
  npsScore: number;
  totalResponses: number;
  promoters: number;
  passives: number;
  detractors: number;
}

interface NPSHeatMapProps {
  campaignId?: string | null;
}

export function NPSHeatMap({ campaignId }: NPSHeatMapProps) {
  const { t } = useLanguage();
  const [stateData, setStateData] = useState<StateNPS[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const fetchStateData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get responses with contact state directly - simplified query
      // The state is stored directly on the contact record
      let query = supabase
        .from("responses")
        .select(`
          score,
          contact_id,
          contacts!inner (
            state
          ),
          campaigns!inner (
            user_id
          )
        `)
        .eq("campaigns.user_id", user.id);

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }

      const { data: responses, error: responsesError } = await query;
      if (responsesError) throw responsesError;

      if (!responses || responses.length === 0) {
        setStateData([]);
        return;
      }

      // Aggregate responses by state directly from contacts
      const stateAggregation: Record<string, { promoters: number; passives: number; detractors: number }> = {};

      responses.forEach((response: any) => {
        const state = response.contacts?.state;
        if (!state) return;

        if (!stateAggregation[state]) {
          stateAggregation[state] = { promoters: 0, passives: 0, detractors: 0 };
        }

        if (response.score >= 9) {
          stateAggregation[state].promoters++;
        } else if (response.score >= 7) {
          stateAggregation[state].passives++;
        } else {
          stateAggregation[state].detractors++;
        }
      });

      // Calculate NPS for each state
      const stateNPSData: StateNPS[] = Object.entries(stateAggregation).map(([state, data]) => {
        const total = data.promoters + data.passives + data.detractors;
        const npsScore = total > 0 ? Math.round(((data.promoters - data.detractors) / total) * 100) : 0;
        
        return {
          state,
          npsScore,
          totalResponses: total,
          promoters: data.promoters,
          passives: data.passives,
          detractors: data.detractors,
        };
      });

      setStateData(stateNPSData);
    } catch (error) {
      console.error("Error fetching state NPS data:", error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchStateData();
  }, [fetchStateData]);

  const hoveredStateData = hoveredState ? stateData.find(s => s.state === hoveredState) : null;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        {t("heatmap.title")}
      </h3>

      {stateData.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t("heatmap.noData")}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 relative">
            <BrazilMap
              data={stateData}
              onStateHover={setHoveredState}
              hoveredState={hoveredState}
            />
            
            {/* Tooltip */}
            {hoveredStateData && (
              <div className="absolute top-4 right-4 bg-popover border rounded-lg shadow-lg p-4 min-w-[200px] z-10">
                <h4 className="font-semibold text-lg mb-2">
                  {STATE_NAMES[hoveredStateData.state]} ({hoveredStateData.state})
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      NPS Score
                    </span>
                    <span className="font-bold" style={{ color: getNPSColor(hoveredStateData.npsScore) }}>
                      {hoveredStateData.npsScore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {t("heatmap.responses")}
                    </span>
                    <span className="font-medium">{hoveredStateData.totalResponses}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-success">😊 {t("dashboard.promoters")}</span>
                      <span>{hoveredStateData.promoters}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warning">😐 {t("dashboard.neutrals")}</span>
                      <span>{hoveredStateData.passives}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-destructive">😞 {t("dashboard.detractors")}</span>
                      <span>{hoveredStateData.detractors}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {t("heatmap.legend")}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: "hsl(142, 76%, 36%)" }} />
                <span className="text-sm">{t("heatmap.legendHigh")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: "hsl(142, 76%, 56%)" }} />
                <span className="text-sm">{t("heatmap.legendMediumHigh")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: "hsl(48, 96%, 53%)" }} />
                <span className="text-sm">{t("heatmap.legendNeutral")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: "hsl(25, 95%, 53%)" }} />
                <span className="text-sm">{t("heatmap.legendLow")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: "hsl(0, 84%, 60%)" }} />
                <span className="text-sm">{t("heatmap.legendVeryLow")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: "hsl(var(--muted))" }} />
                <span className="text-sm">{t("heatmap.noData")}</span>
              </div>
            </div>

            {/* State Rankings */}
            {stateData.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  {t("heatmap.ranking")}
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stateData
                    .sort((a, b) => b.npsScore - a.npsScore)
                    .map((state, index) => (
                      <div
                        key={state.state}
                        className={`flex items-center justify-between p-2 rounded transition-colors ${
                          hoveredState === state.state ? "bg-muted" : ""
                        }`}
                        onMouseEnter={() => setHoveredState(state.state)}
                        onMouseLeave={() => setHoveredState(null)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
                          <span className="font-medium">{state.state}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {state.totalResponses} {t("heatmap.responses")}
                          </span>
                          <span
                            className="font-bold text-sm min-w-[40px] text-right"
                            style={{ color: getNPSColor(state.npsScore) }}
                          >
                            {state.npsScore}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
