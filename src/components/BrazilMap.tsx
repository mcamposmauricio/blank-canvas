import { useMemo } from "react";

interface StateData {
  state: string;
  npsScore: number;
  totalResponses: number;
}

interface BrazilMapProps {
  data: StateData[];
  onStateClick?: (state: string) => void;
  onStateHover?: (state: string | null) => void;
  hoveredState?: string | null;
}

// NPS Score to color mapping with gradient colors
const getNPSColor = (score: number | null): string => {
  if (score === null) return "hsl(var(--muted))";
  if (score >= 70) return "hsl(142, 76%, 36%)"; // Green - High NPS
  if (score >= 30) return "hsl(142, 76%, 50%)"; // Light Green - Medium-High
  if (score >= 0) return "hsl(48, 96%, 53%)"; // Yellow - Neutral
  if (score >= -30) return "hsl(25, 95%, 53%)"; // Orange - Low
  return "hsl(0, 84%, 60%)"; // Red - Very Low
};

// Realistic Brazilian state paths (properly scaled SVG paths)
const BRAZIL_STATES: Record<string, { path: string; labelPos: { x: number; y: number } }> = {
  AC: {
    path: "M119.2,230.5 L130.8,228.3 L142.5,231.2 L148.3,238.7 L152.1,249.2 L147.8,258.4 L138.2,262.1 L125.4,259.8 L115.6,252.3 L112.8,241.8 L115.2,233.6 Z",
    labelPos: { x: 132, y: 246 }
  },
  AL: {
    path: "M482.3,215.8 L492.5,212.3 L498.7,217.5 L499.2,226.8 L493.5,232.4 L483.2,230.6 L479.8,223.1 Z",
    labelPos: { x: 489, y: 222 }
  },
  AP: {
    path: "M298.5,62.3 L312.8,55.6 L325.4,58.9 L332.1,68.4 L330.5,82.3 L321.8,92.5 L308.2,95.8 L295.6,89.2 L290.3,76.5 L293.2,65.8 Z",
    labelPos: { x: 311, y: 75 }
  },
  AM: {
    path: "M155.3,108.5 L185.2,102.3 L218.5,98.6 L248.3,105.2 L268.5,118.6 L278.2,138.5 L275.6,162.3 L265.8,182.5 L248.3,195.6 L225.6,202.3 L198.5,198.6 L172.3,188.5 L152.5,172.3 L145.8,148.6 L148.2,125.3 Z",
    labelPos: { x: 208, y: 152 }
  },
  BA: {
    path: "M395.5,185.2 L425.3,178.5 L455.2,182.3 L478.5,195.6 L492.3,215.5 L495.6,238.2 L488.5,262.3 L472.3,282.5 L448.5,295.6 L418.6,298.2 L392.3,288.5 L378.5,268.6 L375.2,242.3 L382.3,218.5 L390.5,198.6 Z",
    labelPos: { x: 432, y: 238 }
  },
  CE: {
    path: "M452.5,148.3 L472.3,142.5 L488.5,148.6 L498.2,162.3 L495.6,178.5 L482.3,192.3 L462.5,195.6 L445.3,188.5 L438.2,172.3 L442.5,155.6 Z",
    labelPos: { x: 468, y: 168 }
  },
  DF: {
    path: "M362.5,268.3 L375.2,265.5 L382.3,272.6 L380.5,282.3 L370.8,288.5 L360.2,285.6 L358.3,275.8 Z",
    labelPos: { x: 370, y: 277 }
  },
  ES: {
    path: "M465.3,295.5 L478.5,290.2 L488.2,298.3 L490.5,312.5 L482.3,322.8 L468.5,325.2 L458.2,318.5 L458.5,305.3 Z",
    labelPos: { x: 474, y: 308 }
  },
  GO: {
    path: "M338.5,248.3 L365.2,242.5 L388.5,252.3 L398.2,272.5 L392.3,295.6 L372.5,312.3 L348.6,315.5 L328.5,305.6 L322.3,282.5 L328.2,262.3 Z",
    labelPos: { x: 358, y: 278 }
  },
  MA: {
    path: "M358.5,118.3 L388.2,108.5 L418.5,115.6 L438.3,132.5 L442.5,155.2 L432.3,178.5 L408.5,192.3 L378.6,188.5 L355.3,172.3 L348.2,148.5 L352.5,128.6 Z",
    labelPos: { x: 395, y: 152 }
  },
  MT: {
    path: "M248.5,188.3 L285.2,178.5 L318.5,185.6 L342.3,202.5 L352.5,228.2 L348.3,258.5 L332.5,285.6 L305.6,298.2 L272.3,295.5 L245.5,278.6 L235.2,252.3 L238.5,222.5 L245.3,198.6 Z",
    labelPos: { x: 292, y: 238 }
  },
  MS: {
    path: "M285.5,305.3 L318.2,298.5 L342.5,312.3 L352.3,338.5 L345.2,368.2 L322.5,388.5 L292.6,392.3 L268.5,378.5 L258.2,352.3 L262.5,325.6 L275.3,310.5 Z",
    labelPos: { x: 305, y: 348 }
  },
  MG: {
    path: "M362.5,278.3 L398.2,268.5 L432.5,278.6 L458.3,298.5 L468.5,325.2 L462.3,355.5 L438.5,378.6 L405.6,388.2 L372.3,382.5 L348.5,362.6 L342.3,332.3 L348.5,305.6 Z",
    labelPos: { x: 402, y: 328 }
  },
  PA: {
    path: "M268.5,78.3 L308.2,68.5 L348.5,75.6 L378.3,92.5 L395.5,118.2 L398.3,148.5 L385.5,175.6 L358.6,192.3 L322.3,198.5 L288.5,188.6 L262.3,168.5 L252.5,138.2 L255.3,108.5 L262.5,88.6 Z",
    labelPos: { x: 325, y: 135 }
  },
  PB: {
    path: "M478.5,188.3 L498.2,185.5 L512.5,192.6 L515.3,205.2 L505.6,215.5 L488.3,218.2 L475.5,210.5 L475.2,198.3 Z",
    labelPos: { x: 495, y: 202 }
  },
  PR: {
    path: "M322.5,378.3 L358.2,368.5 L388.5,378.6 L405.3,398.5 L402.5,422.3 L382.6,442.5 L352.3,448.2 L325.5,438.5 L312.3,418.6 L315.2,395.3 Z",
    labelPos: { x: 358, y: 408 }
  },
  PE: {
    path: "M448.5,192.3 L485.2,185.5 L512.5,195.6 L518.3,212.5 L508.5,228.2 L482.3,235.5 L452.5,228.6 L442.3,212.3 L445.2,198.5 Z",
    labelPos: { x: 480, y: 210 }
  },
  PI: {
    path: "M402.5,138.3 L428.2,132.5 L448.5,145.6 L458.3,168.5 L452.5,192.3 L432.6,208.5 L405.3,212.2 L385.5,198.6 L378.2,175.3 L385.3,152.5 L395.5,142.3 Z",
    labelPos: { x: 418, y: 172 }
  },
  RJ: {
    path: "M438.5,355.3 L462.2,348.5 L482.5,358.6 L488.3,375.5 L478.5,392.3 L455.6,398.5 L435.3,388.6 L432.5,372.3 Z",
    labelPos: { x: 460, y: 373 }
  },
  RN: {
    path: "M475.5,162.3 L498.2,155.5 L515.5,162.6 L522.3,178.5 L515.5,192.3 L495.6,198.5 L478.3,190.6 L472.5,175.3 Z",
    labelPos: { x: 498, y: 177 }
  },
  RS: {
    path: "M318.5,448.3 L358.2,438.5 L392.5,448.6 L412.3,472.5 L408.5,502.3 L385.6,528.5 L352.3,538.2 L318.5,532.5 L295.6,508.6 L292.3,478.3 L302.5,455.5 Z",
    labelPos: { x: 352, y: 488 }
  },
  RO: {
    path: "M178.5,198.3 L215.2,188.5 L245.5,198.6 L258.3,222.5 L252.5,248.3 L232.6,268.5 L202.3,272.2 L175.5,258.6 L165.2,235.3 L168.5,212.5 Z",
    labelPos: { x: 212, y: 232 }
  },
  RR: {
    path: "M198.5,42.3 L225.2,35.5 L248.5,45.6 L258.3,68.5 L252.5,92.3 L232.6,108.5 L205.3,108.2 L182.5,92.6 L175.2,68.3 L182.5,48.5 Z",
    labelPos: { x: 218, y: 72 }
  },
  SC: {
    path: "M352.5,438.3 L388.2,432.5 L412.5,445.6 L418.3,468.5 L405.5,488.3 L378.6,495.5 L352.3,488.6 L342.5,468.3 L345.3,448.5 Z",
    labelPos: { x: 378, y: 465 }
  },
  SP: {
    path: "M352.5,358.3 L398.2,345.5 L432.5,358.6 L448.3,382.5 L442.5,412.3 L418.6,432.5 L382.3,438.2 L352.5,428.5 L335.3,405.6 L338.5,378.3 Z",
    labelPos: { x: 392, y: 392 }
  },
  SE: {
    path: "M488.5,235.3 L502.2,230.5 L512.5,238.6 L512.3,252.5 L502.5,262.3 L488.6,258.5 L482.3,248.6 L485.2,238.3 Z",
    labelPos: { x: 498, y: 248 }
  },
  TO: {
    path: "M358.5,172.3 L385.2,162.5 L408.5,175.6 L418.3,202.5 L412.5,232.3 L392.6,252.5 L365.3,258.2 L342.5,245.6 L335.2,218.3 L342.5,192.5 L352.3,178.6 Z",
    labelPos: { x: 372, y: 212 }
  },
};

// Full state names
const STATE_NAMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export function BrazilMap({ data, onStateClick, onStateHover, hoveredState }: BrazilMapProps) {
  const stateDataMap = useMemo(() => {
    const map: Record<string, StateData> = {};
    data.forEach((d) => {
      map[d.state] = d;
    });
    return map;
  }, [data]);

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox="100 20 450 540"
        className="w-full h-full drop-shadow-lg"
        style={{ maxHeight: "450px" }}
      >
        <defs>
          {/* Gradient for ocean background */}
          <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
            <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.05" />
          </linearGradient>
          
          {/* Drop shadow filter */}
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
          
          {/* Glow effect for hovered states */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Inner shadow for depth */}
          <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feComponentTransfer in="SourceAlpha">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feGaussianBlur stdDeviation="2" />
            <feOffset dx="1" dy="2" result="offsetblur" />
            <feFlood floodColor="rgba(0,0,0,0.2)" result="color" />
            <feComposite in2="offsetblur" operator="in" />
            <feComposite in2="SourceAlpha" operator="in" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="100" y="20" width="450" height="540" fill="url(#oceanGradient)" rx="8" />
        
        {/* States */}
        <g filter="url(#dropShadow)">
          {Object.entries(BRAZIL_STATES).map(([stateCode, { path, labelPos }]) => {
            const stateData = stateDataMap[stateCode];
            const npsScore = stateData?.npsScore ?? null;
            const color = getNPSColor(npsScore);
            const isHovered = hoveredState === stateCode;
            const hasData = stateData !== undefined;
            
            return (
              <g key={stateCode} className="transition-all duration-300">
                {/* State shape */}
                <path
                  d={path}
                  fill={color}
                  stroke={isHovered ? "hsl(var(--primary))" : "hsl(var(--background))"}
                  strokeWidth={isHovered ? 2.5 : 1.2}
                  strokeLinejoin="round"
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    filter: isHovered ? "url(#glow) brightness(1.15)" : hasData ? "url(#innerShadow)" : "none",
                    transform: isHovered ? "scale(1.02)" : "scale(1)",
                    transformOrigin: `${labelPos.x}px ${labelPos.y}px`,
                    opacity: hasData ? 1 : 0.6,
                  }}
                  onMouseEnter={() => onStateHover?.(stateCode)}
                  onMouseLeave={() => onStateHover?.(null)}
                  onClick={() => onStateClick?.(stateCode)}
                />
                
                {/* State label */}
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isHovered ? "11" : "9"}
                  fontWeight={isHovered ? "700" : "600"}
                  fill={hasData ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                  className="pointer-events-none select-none transition-all duration-200"
                  style={{ 
                    textShadow: "0 1px 2px hsl(var(--background)), 0 0 4px hsl(var(--background))",
                    letterSpacing: "0.5px"
                  }}
                >
                  {stateCode}
                </text>

                {/* NPS score badge for states with data */}
                {hasData && stateData && isHovered && (
                  <g>
                    <rect
                      x={labelPos.x - 14}
                      y={labelPos.y + 10}
                      width="28"
                      height="14"
                      rx="4"
                      fill="hsl(var(--background))"
                      stroke={color}
                      strokeWidth="1.5"
                      opacity="0.95"
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y + 18}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="8"
                      fontWeight="bold"
                      fill={color}
                    >
                      {stateData.npsScore}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Decorative compass */}
        <g transform="translate(495, 480)" opacity="0.4">
          <circle r="18" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
          <line x1="0" y1="-15" x2="0" y2="15" stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
          <line x1="-15" y1="0" x2="15" y2="0" stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
          <text x="0" y="-22" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontWeight="bold">N</text>
          <polygon points="0,-12 -3,-5 0,-7 3,-5" fill="hsl(var(--primary))" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
}

export { STATE_NAMES, getNPSColor };
