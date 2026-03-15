import { useState } from "react";

interface NPSWidgetPreviewProps {
  position: "left" | "right";
  primaryColor: string;
}

const NPSWidgetPreview = ({ position, primaryColor }: NPSWidgetPreviewProps) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(7);

  const getScoreColor = (score: number) => {
    if (score <= 6) return "#EF4444";
    if (score <= 8) return "#F59E0B";
    return "#22C55E";
  };

  return (
    <div className="relative w-full h-[400px] bg-muted/50 rounded-lg border overflow-hidden">
      {/* Mock browser bar */}
      <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
            www.seusite.com.br
          </div>
        </div>
      </div>

      {/* Mock page content */}
      <div className="p-6 space-y-3">
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-5/6 bg-muted rounded" />
        <div className="h-20 w-full bg-muted rounded mt-4" />
      </div>

      {/* NPS Popup */}
      <div
        className="absolute bottom-4 w-[240px] bg-background rounded-xl shadow-2xl border overflow-hidden flex flex-col"
        style={{
          ...(position === "right" ? { right: "16px" } : { left: "16px" }),
        }}
      >
        {/* Header */}
        <div
          className="p-3 text-center"
          style={{ backgroundColor: primaryColor, color: "#fff" }}
        >
          <p className="text-[10px] font-semibold">Qual a probabilidade de nos recomendar?</p>
        </div>

        {/* Score buttons */}
        <div className="p-2">
          <div className="flex gap-[2px] justify-center">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                className="w-[18px] h-[18px] rounded text-[8px] font-bold flex items-center justify-center transition-all"
                style={{
                  backgroundColor: selectedScore === i ? getScoreColor(i) : "transparent",
                  color: selectedScore === i ? "#fff" : "inherit",
                  border: `1px solid ${selectedScore === i ? getScoreColor(i) : "#d1d5db"}`,
                }}
                onClick={() => setSelectedScore(i)}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1 px-1">
            <span className="text-[7px] text-muted-foreground">Nada provável</span>
            <span className="text-[7px] text-muted-foreground">Muito provável</span>
          </div>
        </div>

        {/* Feedback field */}
        <div className="px-3 pb-2">
          <div className="h-10 w-full bg-muted rounded border text-[8px] px-2 pt-1 text-muted-foreground">
            Conte-nos mais...
          </div>
        </div>

        {/* Submit */}
        <div className="px-3 pb-3">
          <div
            className="h-6 w-full rounded flex items-center justify-center text-[9px] text-white font-medium"
            style={{ backgroundColor: primaryColor }}
          >
            Enviar
          </div>
        </div>
      </div>
    </div>
  );
};

export default NPSWidgetPreview;
