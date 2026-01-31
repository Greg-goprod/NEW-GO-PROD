import { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Edit2, Trash2, Clock } from "lucide-react";
import type { Performance, EventDay, EventStage } from "../timelineApi";
import { minToHHMM, hhmmToMin } from "../timelineApi";
// Les couleurs sont maintenant déterminées par le statut, pas de couleur personnalisée

interface PerformanceCardProps {
  performance: Performance;
  day: EventDay;
  stage: EventStage;
  stageIndex: number;
  onEdit: () => void;
  onDelete: () => void;
  onOpenTimePicker: () => void;
  isDragging: boolean;
  isInOverlay?: boolean; // Nouveau : indique si la carte est dans le DragOverlay
}

export function PerformanceCard({
  performance,
  stage,
  onEdit,
  onDelete,
  onOpenTimePicker,
  isInOverlay = false,
}: PerformanceCardProps) {
  // Ref pour détecter si un drag a été initié (pour éviter onClick après drag)
  const wasDraggingRef = useRef(false);
  
  // Ne pas appeler useDraggable si la carte est dans le DragOverlay
  const draggableHook = useDraggable({
    id: performance.id,
    data: {
      performance,
      event_day_id: performance.event_day_id,
      event_stage_id: performance.stage_id,
    },
    disabled: isInOverlay, // Désactiver le draggable dans l'overlay
  });
  
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingDnd } = isInOverlay 
    ? { attributes: {}, listeners: {}, setNodeRef: () => {}, transform: null, isDragging: false }
    : draggableHook;
    
  // Mettre à jour le ref quand le drag commence
  if (isDraggingDnd && !wasDraggingRef.current) {
    wasDraggingRef.current = true;
  }

  // Couleurs AURA selon le statut
  // Idée: Gris | Offre à faire/Draft: Mandarine | Prêt à envoyer: Violet Aura | Envoyé: Saphir | Accepté: Menthe | Rejeté: Framboise
  const getStatusStyles = (status: string) => {
    switch (status) {
      // Idée - Gris
      case "idee":
        return {
          bg: "bg-gray-50 dark:bg-gray-800",
          border: "border-2 border-gray-400 dark:border-gray-500",
          text: "text-gray-900 dark:text-gray-100",
          amount: "text-gray-600 dark:text-gray-400"
        };
      // Offre à faire / Draft - Mandarine (#FF9500)
      case "offre_a_faire":
      case "draft":
        return {
          bg: "bg-[#FF950015] dark:bg-[#FF950025]",
          border: "border-2 border-[#FF9500]",
          text: "text-gray-900 dark:text-gray-100",
          amount: "text-[#CC7700] dark:text-[#FF9500]"
        };
      // Prêt à envoyer - Violet Aura (#661B7D)
      case "ready_to_send":
        return {
          bg: "bg-[#661B7D15] dark:bg-[#661B7D25]",
          border: "border-2 border-[#661B7D] dark:border-[#9E61A9]",
          text: "text-gray-900 dark:text-gray-100",
          amount: "text-[#661B7D] dark:text-[#9E61A9]"
        };
      // Envoyé - Saphir (#007AFF)
      case "offre_envoyee":
      case "sent":
        return {
          bg: "bg-[#007AFF15] dark:bg-[#007AFF25]",
          border: "border-2 border-[#007AFF]",
          text: "text-gray-900 dark:text-gray-100",
          amount: "text-[#0055CC] dark:text-[#4DA3FF]"
        };
      // Accepté - Menthe (#34C759)
      case "offre_validee":
      case "offre_acceptee":
      case "accepted":
        return {
          bg: "bg-[#34C75915] dark:bg-[#34C75925]",
          border: "border-2 border-[#34C759]",
          text: "text-gray-900 dark:text-gray-100",
          amount: "text-[#248A3D] dark:text-[#34C759]"
        };
      // Rejeté - Framboise (#FF3B5C)
      case "offre_rejetee":
      case "rejected":
        return {
          bg: "bg-[#FF3B5C15] dark:bg-[#FF3B5C25]",
          border: "border-2 border-[#FF3B5C]",
          text: "text-gray-900 dark:text-gray-100",
          amount: "text-[#CC2244] dark:text-[#FF6B7F]"
        };
      // En négociation, etc. - Violet
      case "negotiating":
      case "legal_review":
      case "management_review":
        return {
          bg: "bg-violet-50 dark:bg-violet-900/20",
          border: "border-2 border-violet-400 dark:border-violet-500",
          text: "text-gray-900 dark:text-gray-100",
          amount: "text-violet-600 dark:text-violet-400"
        };
      // Expiré - Gris
      case "expired":
        return {
          bg: "bg-gray-100 dark:bg-gray-800",
          border: "border border-gray-400 dark:border-gray-600 border-dashed",
          text: "text-gray-500 dark:text-gray-400",
          amount: "text-gray-500 dark:text-gray-400"
        };
      default:
        return {
          bg: "bg-gray-50 dark:bg-gray-800",
          border: "border border-gray-300 dark:border-gray-600",
          text: "text-gray-900 dark:text-gray-100",
          amount: "text-gray-600 dark:text-gray-400"
        };
    }
  };

  // Couleurs basées uniquement sur le statut (plus de couleur personnalisée)
  const styles = getStatusStyles(performance.booking_status);

  // Calculer l'heure de fin
  const startMinutes = hhmmToMin(performance.performance_time);
  const endMinutes = startMinutes + performance.duration;
  const endTime = minToHHMM(endMinutes);

  // Le positionnement est géré par le conteneur parent (TimelineGrid)
  // On ne gère ici que le drag & drop
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDraggingDnd ? 1000 : 1,
    width: "100%",
    height: "100%",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        rounded-xl cursor-move select-none
        ${styles.bg} ${styles.border} ${styles.text}
        ${isDraggingDnd ? "shadow-xl" : "hover:shadow-md"}
        transition-all duration-200 overflow-hidden
      `}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Si un drag a été initié, ne pas ouvrir le modal
        if (wasDraggingRef.current) {
          wasDraggingRef.current = false; // Reset pour le prochain clic
          return;
        }
        // C'est un clic simple (pas un drag), ouvrir le modal d'édition
        e.stopPropagation();
        onEdit();
      }}
      title={`${performance.artist_name} – ${performance.performance_time} → ${endTime}, Durée: ${performance.duration} min, Scène: ${stage.name}${performance.fee_amount ? `, Cachet: ${performance.fee_amount} ${performance.fee_currency || ''}` : ''}, Statut: ${performance.booking_status}`}
    >
      <div className="p-2 h-full flex flex-col">
        {/* Nom de l'artiste */}
        <div className={`font-bold text-xs uppercase truncate mb-1 ${styles.text}`}>
          {performance.artist_name}
        </div>

        {/* Horaire de passage et icônes d'actions sur la même ligne */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs opacity-70">
            {performance.performance_time.substring(0, 5)}
          </div>
          
          <div className="flex items-center gap-0.5" 
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTimePicker();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Modifier l'heure"
            >
              <Clock className="w-3 h-3 opacity-60 hover:opacity-100" />
            </button>
            <button
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Modifier"
            >
              <Edit2 className="w-3 h-3 opacity-60 hover:opacity-100" />
            </button>
            <button
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Supprimer"
            >
              <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400 opacity-60 hover:opacity-100" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
