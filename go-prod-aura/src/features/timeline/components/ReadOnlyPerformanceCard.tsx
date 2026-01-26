import type { Performance } from "../timelineApi";
import { minToHHMM, hhmmToMin } from "../timelineApi";
import { hexToRgba } from "../utils/color";

// Couleurs AURA par statut
const STATUS_COLORS: Record<string, string> = {
  idee: "#919399",           // Gris
  offre_a_faire: "#FF9500",  // Mandarine
  draft: "#FF9500",          // Mandarine (compat)
  ready_to_send: "#661B7D",  // Violet Aura
  sent: "#007AFF",           // Saphir
  offre_envoyee: "#007AFF",  // Saphir (compat)
  accepted: "#34C759",       // Menthe
  offre_acceptee: "#34C759", // Menthe (compat)
  offre_validee: "#34C759",  // Menthe (compat)
  rejected: "#FF3B5C",       // Framboise
  offre_rejetee: "#FF3B5C",  // Framboise (compat)
  negotiating: "#8B5CF6",    // Violet
  legal_review: "#8B5CF6",   // Violet
  management_review: "#8B5CF6", // Violet
  expired: "#6B7280",        // Gris foncé
};

interface ReadOnlyPerformanceCardProps {
  performance: Performance;
  leftPercent: number;
  widthPercent: number;
  rowHeight: number;
}

export function ReadOnlyPerformanceCard({
  performance,
  leftPercent,
  widthPercent,
  rowHeight,
}: ReadOnlyPerformanceCardProps) {
  const startMin = hhmmToMin(performance.performance_time);
  const startTime = minToHHMM(startMin);

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes <= 0) return "";
    return `${minutes} min`;
  };

  const desiredHeight = 52;
  const effectiveHeight = Math.min(desiredHeight, Math.max(rowHeight - 8, 38));
  const verticalOffset = Math.max((rowHeight - effectiveHeight) / 2, 4);
  const height = effectiveHeight;
  const safeWidthPercent = Math.max(widthPercent, 2); // éviter disparition sur les très courtes durées
  
  // Couleur basée uniquement sur le statut (plus de couleur personnalisée)
  const accentColor = STATUS_COLORS[performance.booking_status] || "#919399";
  const backgroundTint = hexToRgba(accentColor, 0.16) || "#FFF7ED";
  const durationLabel = performance.duration ? formatDuration(performance.duration) : "";

  return (
    <div
      style={{
        position: "absolute",
        left: `${leftPercent}%`,
        width: `${safeWidthPercent}%`,
        top: `${verticalOffset}px`,
        height: `${height}px`,
        minWidth: "80px",
        borderColor: accentColor,
        backgroundColor: backgroundTint,
      }}
        className="
        relative
        pointer-events-none
        flex h-full flex-col justify-start gap-2 rounded-2xl border border-[1.2px]
        bg-white px-3.5 py-2.5 shadow-[0_6px_18px_rgba(53,16,97,0.12)]
      "
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-900 leading-tight"
        style={{ wordBreak: "break-word", whiteSpace: "normal" }}
      >
        {performance.artist_name || "Artiste inconnu"}
      </div>

        <div className="flex items-center justify-between text-[10px] font-semibold leading-none">
          <span style={{ color: accentColor }}>{startTime}</span>
          {durationLabel ? (
            <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">
              {durationLabel}
            </span>
          ) : (
            <span />
          )}
        </div>
    </div>
  );
}

