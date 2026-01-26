import React, { useMemo } from "react";
import { PerformanceCard } from "./PerformanceCard";
import type { EventDay, EventStage, Performance } from "../timelineApi";
import { minutesSinceOpen, calculateDayDuration, snapTo5, minToHHMM } from "../timelineApi";

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

const HOUR_WIDTH = 130;
const MINUTE_WIDTH = HOUR_WIDTH / 60;
const ROW_HEIGHT = 72;

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

  // Calculer les heures d'affichage pour chaque jour
  const dayHours = useMemo(() => {
    return days.map(day => {
      const openMin = parseInt(day.open_time.split(':')[0]) * 60 + parseInt(day.open_time.split(':')[1]);
      const closeMin = parseInt(day.close_time.split(':')[0]) * 60 + parseInt(day.close_time.split(':')[1]);
      
      const hours = [];
      let currentMin = openMin;
      
      while (currentMin < closeMin) {
        const hour = Math.floor(currentMin / 60);
        hours.push({
          hour: hour % 24,
          label: `${hour % 24}:00`,
          left: (currentMin - openMin) * MINUTE_WIDTH,
        });
        currentMin += 60;
      }
      
      return {
        day,
        hours,
        totalWidth: calculateDayDuration(day.open_time, day.close_time) * MINUTE_WIDTH,
      };
    });
  }, [days]);

  // Grouper les performances par jour et scène
  const performancesByDayStage = useMemo(() => {
    const grouped: Record<string, Record<string, Performance[]>> = {};
    
    days.forEach(day => {
      grouped[day.id] = {};
      stages.forEach(stage => {
        grouped[day.id][stage.id] = performances.filter(
          p => p.event_day_id === day.id && p.stage_id === stage.id
        );
      });
    });
    
    return grouped;
  }, [days, stages, performances]);

  const handleCellClick = (day: EventDay, stage: EventStage, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clientX = event.clientX - rect.left;
    const minutesSinceOpen = clientX / MINUTE_WIDTH;
    const snappedMinutes = snapTo5(minutesSinceOpen);
    const defaultTime = minToHHMM(snappedMinutes);

    onCellCreate({
      event_day_id: day.id,
      stage_id: stage.id,
      default_time: defaultTime,
      default_duration: 60,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header avec jours et heures */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          {/* Colonne scènes */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="h-12 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300">
              Scènes
            </div>
          </div>
          
          {/* Colonnes jours */}
          {dayHours.map(({ day, hours, totalWidth }) => (
            <div key={day.id} className="border-r border-gray-200 dark:border-gray-700" style={{ width: totalWidth }}>
              {/* Titre du jour */}
              <div className="h-12 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                {new Date(day.date).toLocaleDateString('fr-FR', { 
                  weekday: 'short', 
                  day: '2-digit', 
                  month: '2-digit' 
                })}
              </div>
              
              {/* Bande horaire */}
              <div className="relative h-8 bg-gray-100 dark:bg-gray-800">
                {hours.map(({ hour, label, left }) => (
                  <div
                    key={hour}
                    className="absolute top-0 h-full border-r border-gray-300 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 flex items-center px-1"
                    style={{ left, width: HOUR_WIDTH }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grille des scènes */}
      <div className="flex">
        {/* Colonne scènes */}
        <div className="w-48 border-r border-gray-200 dark:border-gray-700">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="h-18 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 text-sm font-medium text-gray-700 dark:text-gray-300"
              style={{ height: ROW_HEIGHT }}
            >
              {stage.name}
            </div>
          ))}
        </div>
        
        {/* Colonnes performances */}
        {dayHours.map(({ day, totalWidth }) => (
          <div key={day.id} className="border-r border-gray-200 dark:border-gray-700 relative" style={{ width: totalWidth }}>
            {stages.map((stage, stageIndex) => (
              <div
                key={`${day.id}-${stage.id}`}
                className="absolute border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                style={{
                  top: stageIndex * ROW_HEIGHT,
                  height: ROW_HEIGHT,
                  width: totalWidth,
                }}
                onClick={(e) => handleCellClick(day, stage, e)}
                data-day-id={day.id}
                data-stage-id={stage.id}
              >
                {/* Performances pour cette scène/jour */}
                {performancesByDayStage[day.id]?.[stage.id]?.map((performance) => (
                  <PerformanceCard
                    key={performance.id}
                    performance={performance}
                    day={day}
                    stage={stage}
                    stageIndex={stageIndex}
                    onEdit={() => onCardEdit(performance)}
                    onDelete={() => onCardDelete(performance)}
                    onOpenTimePicker={() => onOpenTimePicker(performance)}
                    isDragging={false}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

