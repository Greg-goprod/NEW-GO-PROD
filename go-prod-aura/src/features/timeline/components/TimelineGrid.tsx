import React, { useMemo, useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent, DragMoveEvent } from "@dnd-kit/core";
import { PerformanceCard } from "./PerformanceCard";
import type { EventDay, EventStage, Performance } from "../timelineApi";
import { snapTo5, minToHHMM, hhmmToMin } from "../timelineApi";

interface TimelineGridProps {
  days: EventDay[];
  stages: EventStage[];
  performances: Performance[];
  onCellCreate: (data: { event_day_id: string; stage_id: string; default_time: string; default_duration: number }) => void;
  onCardEdit: (performance: Performance) => void;
  onCardDelete: (performance: Performance) => void;
  onCardDrop: (data: { id: string; event_day_id: string; event_stage_id: string; performance_time: string }) => void;
  onOpenTimePicker: (performance: Performance) => void;
}

const STAGE_COLUMN_WIDTH = 240; // Largeur colonne scènes/dates (rétablie)
const ROW_HEIGHT = 70; // Hauteur réduite pour interface plus compacte

// Composant DroppableCell pour les cellules qui peuvent recevoir les drops
function DroppableCell({ 
  id, 
  data, 
  children, 
  className, 
  style, 
  onClick 
}: { 
  id: string; 
  data: { event_day_id: string; event_stage_id: string }; 
  children: React.ReactNode; 
  className: string; 
  style: React.CSSProperties; 
  onClick: (e: React.MouseEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'bg-violet-100/50 dark:bg-violet-900/20 ring-4 ring-violet-500 ring-inset' : ''}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function TimelineGrid({
  days,
  stages,
  performances,
  onCellCreate,
  onCardEdit,
  onCardDelete,
  onCardDrop,
  onOpenTimePicker,
}: TimelineGridProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activePerformance, setActivePerformance] = React.useState<Performance | null>(null);
  const [draggedTime, setDraggedTime] = React.useState<string | null>(null); // Heure calculée pendant le drag
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Configurer les sensors pour le drag & drop avec une activation plus rapide
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Distance réduite pour une activation plus rapide
      },
    })
  );

  // 1. CALCULER LA LARGEUR DISPONIBLE DYNAMIQUEMENT
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
        console.log('📐 Largeur container timeline:', width);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    
    // Retry après un court délai pour être sûr que le DOM est prêt
    setTimeout(updateWidth, 100);
    
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 2. TRIER LES SCÈNES PAR CAPACITÉ (plus grande → plus petite)
  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
  }, [stages]);

  // 3. CALCULER L'AMPLITUDE HORAIRE GLOBALE (+1h avant et +1h après)
  const { globalStartHour, totalHours } = useMemo(() => {
    if (days.length === 0) return { globalStartHour: 17, globalEndHour: 5, totalHours: 12 };

    let minHour = 24;
    let maxHour = 0;

    days.forEach(day => {
      const openHour = parseInt(day.open_time?.split(':')[0] || '18');
      const closeHour = parseInt(day.close_time?.split(':')[0] || '4');
      
      minHour = Math.min(minHour, openHour);
      
      // Si fermeture après minuit (ex: 02:00), ajouter 24
      if (closeHour < openHour) {
        maxHour = Math.max(maxHour, closeHour + 24);
      } else {
        maxHour = Math.max(maxHour, closeHour);
      }
    });

    // Pas de marge dans le calcul (les marges visuelles MARGIN_LEFT et MARGIN_RIGHT suffisent)
    const startWithMargin = minHour;
    const endWithMargin = maxHour;
    const totalHrs = endWithMargin - startWithMargin;
    
    return { 
      globalStartHour: startWithMargin, 
      globalEndHour: endWithMargin, 
      totalHours: totalHrs 
    };
  }, [days]);

  // 4. CALCULER DYNAMIQUEMENT LA LARGEUR D'UNE HEURE (RESPONSIVE)
  const HOUR_WIDTH = useMemo(() => {
    if (containerWidth === 0 || totalHours === 0) return 130; // Default
    
    // Largeur disponible = largeur totale - largeur colonne scènes - marges
    const availableWidth = containerWidth - STAGE_COLUMN_WIDTH - 32; // 32px de padding
    
    // +1 pour les 2 marges visuelles (0.5h avant + 0.5h après = 1h total)
    const totalHoursWithMargins = totalHours + 1;
    
    // Largeur par heure = largeur disponible / (heures + marges)
    const calculatedWidth = Math.max(availableWidth / totalHoursWithMargins, 80); // Min 80px par heure
    
    console.log('📊 HOUR_WIDTH calculé:', calculatedWidth, 'pour', totalHours, 'heures (+ 1h marges)');
    
    return calculatedWidth;
  }, [containerWidth, totalHours]);

  // 2ème colonne : Marge de 0.5 heure au début (équivalent 1/2 heure)
  const MARGIN_LEFT = HOUR_WIDTH / 2;
  // Dernière colonne : Marge de 0.5 heure à la fin (équivalent 1/2 heure)
  const MARGIN_RIGHT = HOUR_WIDTH / 2;

  // 5. GÉNÉRER LA BANDE HORAIRE (heures affichées)
  const timelineHours = useMemo(() => {
    const hours = [];
    for (let i = 0; i < totalHours; i++) { // Commence à 0 pour afficher toutes les heures
      const hour = (globalStartHour + i) % 24;
      hours.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        left: MARGIN_LEFT + (i * HOUR_WIDTH), // Première heure juste après la marge
        index: i,
      });
    }
    return hours;
  }, [globalStartHour, totalHours, HOUR_WIDTH, MARGIN_LEFT]);

  const MINUTE_WIDTH = HOUR_WIDTH / 60;
  const totalWidth = MARGIN_LEFT + (totalHours * HOUR_WIDTH) + MARGIN_RIGHT; // +0.5h avant et +0.5h après

  // Helper : calculer position d'une heure
  const getHourPosition = (timeString: string) => {
    const hour = parseInt(timeString.split(':')[0]);
    const minutes = parseInt(timeString.split(':')[1] || '0');
    
    let hoursSinceStart = hour - globalStartHour;
    
    // Si après minuit
    if (hour < globalStartHour) {
      hoursSinceStart = (24 - globalStartHour) + hour;
    }
    
    const minutesSinceStart = hoursSinceStart * 60 + minutes;
    return MARGIN_LEFT + (minutesSinceStart * MINUTE_WIDTH); // Avec marge de 0.5h
  };

  // Helper : calculer l'amplitude horaire d'un jour
  const getDayAmplitude = (day: EventDay) => {
    const openPos = getHourPosition(day.open_time || '18:00:00');
    const closePos = getHourPosition(day.close_time || '02:00:00');
    
    return {
      left: openPos,
      width: closePos - openPos,
    };
  };

  // Helper : calculer position d'une performance
  const getPerformancePosition = (performance: Performance) => {
    const perfHour = parseInt(performance.performance_time.split(':')[0]);
    const perfMin = parseInt(performance.performance_time.split(':')[1]);
    
    let hoursSinceStart = perfHour - globalStartHour;
    
    // Si après minuit
    if (perfHour < globalStartHour) {
      hoursSinceStart = (24 - globalStartHour) + perfHour;
    }
    
    const minutesSinceStart = hoursSinceStart * 60 + perfMin;
    const left = MARGIN_LEFT + (minutesSinceStart * MINUTE_WIDTH); // Avec marge de 0.5h
    const width = performance.duration * MINUTE_WIDTH;
    
    return { left, width };
  };

  const handleDragStart = (event: DragStartEvent) => {
    const performance = performances.find(p => p.id === event.active.id);
    setActiveId(event.active.id as string);
    setActivePerformance(performance || null);
    // Initialiser avec l'heure actuelle
    if (performance) {
      setDraggedTime(performance.performance_time.substring(0, 5));
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { delta, active } = event;
    
    if (!active || !activePerformance) return;
    
    // Calculer la nouvelle heure en temps réel pendant le drag
    const currentMinutes = hhmmToMin(activePerformance.performance_time.substring(0, 5));
    const deltaMinutes = Math.round(delta.x / MINUTE_WIDTH);
    let newMinutes = currentMinutes + deltaMinutes;
    
    // Snap à 5 minutes
    newMinutes = snapTo5(newMinutes);
    
    // Convertir en HH:MM
    const newTime = minToHHMM(newMinutes);
    
    // Mettre à jour l'heure affichée
    setDraggedTime(newTime);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;

    if (!over) {
      // Réinitialiser immédiatement si pas de drop valide
      setActiveId(null);
      setActivePerformance(null);
      setDraggedTime(null);
      return;
    }

    const performance = performances.find(p => p.id === active.id);
    if (!performance) {
      setActiveId(null);
      setActivePerformance(null);
      setDraggedTime(null);
      return;
    }

    const overData = over.data.current;
    if (!overData) {
      setActiveId(null);
      setActivePerformance(null);
      setDraggedTime(null);
      return;
    }

    const { event_day_id, event_stage_id } = overData;

    // Calculer la nouvelle heure basée sur le delta horizontal
    let newTime = performance.performance_time;
    
    // Convertir l'heure actuelle en minutes depuis minuit
    const currentMinutes = hhmmToMin(performance.performance_time.substring(0, 5));
    
    // Calculer le déplacement en minutes basé sur le delta (arrondi immédiatement pour éviter l'accumulation d'erreurs)
    const deltaMinutes = Math.round(delta.x / MINUTE_WIDTH);
    
    // Nouvelle position en minutes
    let newMinutes = currentMinutes + deltaMinutes;
    
    // Snap à 5 minutes AVANT de wrapper (pour éviter les erreurs)
    newMinutes = snapTo5(newMinutes);
    
    // Convertir en HH:MM (minToHHMM gère maintenant les valeurs négatives et >24h)
    newTime = minToHHMM(newMinutes);

    // Réinitialiser IMMÉDIATEMENT les états avant d'appeler onCardDrop
    // Utiliser flushSync pour forcer le re-render synchrone
    flushSync(() => {
      setActiveId(null);
      setActivePerformance(null);
      setDraggedTime(null);
    });

    // Appeler onCardDrop (qui fait la mise à jour optimiste)
    onCardDrop({
      id: performance.id,
      event_day_id,
      event_stage_id,
      performance_time: newTime,
    });
  };

  const handleCellClick = (day: EventDay, stage: EventStage, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clientX = event.clientX - rect.left;
    const minutesSinceStart = (clientX - MARGIN_LEFT) / MINUTE_WIDTH; // Soustraire la marge
    const snappedMinutes = snapTo5(minutesSinceStart);
    
    // Convertir les minutes depuis le début de la timeline en minutes absolues depuis minuit
    const absoluteMinutes = snappedMinutes + (globalStartHour * 60);
    const defaultTime = minToHHMM(absoluteMinutes);

    onCellCreate({
      event_day_id: day.id,
      stage_id: stage.id,
      default_time: defaultTime,
      default_duration: 60,
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div ref={containerRef} className="w-full">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          
          {/* CORPS: Pour chaque JOUR (heures répétées par jour) */}
          {days.map((day) => (
            <div key={day.id} className="border-b-4 border-violet-200 dark:border-violet-800">
              {/* Titre du jour avec heures */}
              <div className="flex bg-violet-50 dark:bg-violet-900/20 border-b-2 border-violet-200 dark:border-violet-700">
                {/* Jour et date */}
                <div className="border-r-2 border-gray-200 dark:border-gray-700 px-4 py-2 shrink-0 flex items-center gap-2" style={{ width: STAGE_COLUMN_WIDTH }}>
                  <div className="text-sm font-bold text-violet-900 dark:text-violet-100 uppercase tracking-wide">
                    {new Date(day.date).toLocaleDateString('fr-FR', { 
                      weekday: 'long' 
                    })}
                  </div>
                  <div className="text-xs text-violet-700 dark:text-violet-300">
                    {new Date(day.date).toLocaleDateString('fr-FR', { 
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                
                {/* Bande horaire pour ce jour */}
                <div className="relative bg-violet-50 dark:bg-violet-900/20 flex-1" style={{ width: totalWidth, minHeight: '40px' }}>
                  {/* Labels d'heures seulement (pas de lignes ni fond contrasté) */}
                  {timelineHours.map(({ hour, label, left }) => (
                    <div
                      key={`${day.id}-hour-${hour}`}
                      className="absolute top-0 h-full text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center justify-center pointer-events-none"
                      style={{ 
                        left: left - 24,
                        width: 48 
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pour chaque SCÈNE de ce jour */}
          {sortedStages.map((stage) => {
            const perfsForThisCell = performances.filter(
              p => p.event_day_id === day.id && p.stage_id === stage.id
            );

                return (
                  <div key={`${day.id}-${stage.id}`} className="flex border-b border-gray-200 dark:border-gray-700">
                    {/* Nom de la scène */}
                    <div className="border-r-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 flex items-center px-4 shrink-0" style={{ width: STAGE_COLUMN_WIDTH, height: ROW_HEIGHT }}>
                      <div className="w-1 h-8 bg-violet-400 dark:bg-violet-500 rounded-full mr-3"></div>
                      <div className="overflow-hidden flex-1">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {stage.name}
                        </div>
                        {stage.type && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                            {stage.type.replace(/_/g, ' ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Zone de performances (droppable) */}
                    <DroppableCell
                      id={`cell-${day.id}-${stage.id}`}
                      data={{ 
                        event_day_id: day.id, 
                        event_stage_id: stage.id 
                      }}
                      className="
                        relative cursor-pointer 
                        hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-200
                        flex-1
                      "
                      style={{ width: totalWidth, height: ROW_HEIGHT }}
                      onClick={(e) => handleCellClick(day, stage, e)}
                    >
                      {/* Zone d'amplitude horaire (fond contrasté) */}
                      {(() => {
                        const amplitude = getDayAmplitude(day);
                        return (
                          <div
                            className="absolute top-0 h-full bg-violet-100/50 dark:bg-violet-900/10"
                            style={{ 
                              left: amplitude.left, 
                              width: amplitude.width 
                            }}
                          />
                        );
                      })()}
                      
                      {/* Ligne très épaisse pour open_time */}
                      <div
                        className="absolute top-0 h-full border-r-4 border-violet-500 dark:border-violet-400"
                        style={{ left: getHourPosition(day.open_time || '18:00:00') }}
                      />
                      
                      {/* Ligne très épaisse pour close_time */}
                      <div
                        className="absolute top-0 h-full border-r-4 border-violet-500 dark:border-violet-400"
                        style={{ left: getHourPosition(day.close_time || '02:00:00') }}
                      />

                      {/* Grille verticale (heures) - alignée avec le header */}
                      {timelineHours.map(({ hour, left }) => (
                        <div
                          key={hour}
                          className="absolute top-0 h-full border-r border-violet-200 dark:border-violet-800/50"
                          style={{ left }}
                        />
                      ))}

                      {/* Placeholder à l'ancienne position (si en train de drag depuis cette cellule) */}
                      {activePerformance && activePerformance.event_day_id === day.id && activePerformance.stage_id === stage.id && (
                        (() => {
                          // Calculer la position du placeholder basée sur l'ancienne position (performance_time d'origine)
                          const originalTime = activePerformance.performance_time.substring(0, 5);
                          const originalHour = parseInt(originalTime.split(':')[0]);
                          const originalMin = parseInt(originalTime.split(':')[1]);
                          
                          let hoursSinceStart = originalHour - globalStartHour;
                          if (originalHour < globalStartHour) {
                            hoursSinceStart = (24 - globalStartHour) + originalHour;
                          }
                          
                          const minutesSinceStart = hoursSinceStart * 60 + originalMin;
                          const placeholderLeft = MARGIN_LEFT + (minutesSinceStart * MINUTE_WIDTH);
                          const placeholderWidth = activePerformance.duration * MINUTE_WIDTH;
                          
                          return (
                            <div
                              className="absolute pointer-events-none"
                              style={{ left: placeholderLeft, width: placeholderWidth, top: 4, height: ROW_HEIGHT - 8 }}
                            >
                              <div className="w-full h-full rounded-xl border-2 border-dashed border-violet-400 bg-violet-100/20 dark:bg-violet-900/20" />
                            </div>
                          );
                        })()
                      )}
                      
                      {/* Performances */}
                      {perfsForThisCell.map((perf) => {
                        const { left, width } = getPerformancePosition(perf);
                        const isBeingDragged = activeId === perf.id;
                        
                        // Clé unique incluant la position pour forcer le re-render lors des déplacements
                        const uniqueKey = `${perf.id}-${perf.event_day_id}-${perf.stage_id}-${perf.performance_time}`;
                        
                        return (
                          <div
                            key={uniqueKey}
                            className="absolute transition-all duration-200"
                            style={{ left, width, top: 4, height: ROW_HEIGHT - 8 }}
                          >
                            <PerformanceCard
                              performance={perf}
                              day={day}
                              stage={stage}
                              stageIndex={0}
                              onEdit={() => onCardEdit(perf)}
                              onDelete={() => onCardDelete(perf)}
                              onOpenTimePicker={() => onOpenTimePicker(perf)}
                              isDragging={isBeingDragged}
                            />
                          </div>
                        );
                      })}
                    </DroppableCell>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Drag Overlay pour un rendu fluide pendant le drag */}
      <DragOverlay dropAnimation={null} style={{ zIndex: 99999 }}>
        {activePerformance && activeId && draggedTime ? (
          <div 
            style={{ 
              backgroundColor: '#8b5cf6',
              borderRadius: '4px',
              border: '2px solid white',
              padding: '4px 8px',
              color: 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              cursor: 'grabbing',
              pointerEvents: 'none',
              fontSize: '13px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              width: '52px',
              textAlign: 'center',
              lineHeight: '1'
            }}
          >
            {draggedTime}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
