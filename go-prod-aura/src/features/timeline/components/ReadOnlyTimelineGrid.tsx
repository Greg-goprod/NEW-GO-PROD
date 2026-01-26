import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { ReadOnlyPerformanceCard } from "./ReadOnlyPerformanceCard";
import type { EventDay, EventStage, Performance } from "../timelineApi";

interface ReadOnlyTimelineGridProps {
  days: EventDay[];
  stages: EventStage[];
  performances: Performance[];
}

const STAGE_COLUMN_WIDTH = 240;
const ROW_HEIGHT = 110;

export function ReadOnlyTimelineGrid({
  days,
  stages,
  performances,
}: ReadOnlyTimelineGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // 1. CALCULER LA LARGEUR DISPONIBLE DYNAMIQUEMENT
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    
    setTimeout(updateWidth, 100);
    
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 2. TRIER LES SCÈNES PAR CAPACITÉ (plus grande → plus petite)
  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
  }, [stages]);

  // 3. CALCULER L'AMPLITUDE HORAIRE GLOBALE
  const { globalStartHour, totalHours } = useMemo(() => {
    if (days.length === 0) return { globalStartHour: 17, globalEndHour: 5, totalHours: 12 };

    let minHour = 24;
    let maxHour = 0;

    days.forEach(day => {
      const openHour = parseInt(day.open_time?.split(':')[0] || '18');
      const closeHour = parseInt(day.close_time?.split(':')[0] || '4');
      
      minHour = Math.min(minHour, openHour);
      
      if (closeHour < openHour) {
        maxHour = Math.max(maxHour, closeHour + 24);
      } else {
        maxHour = Math.max(maxHour, closeHour);
      }
    });

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
    if (containerWidth === 0 || totalHours === 0) return 130;
    
    const availableWidth = containerWidth - STAGE_COLUMN_WIDTH - 32;
    const totalHoursWithMargins = totalHours + 1;
    const calculatedWidth = Math.max(availableWidth / totalHoursWithMargins, 80);
    
    return calculatedWidth;
  }, [containerWidth, totalHours]);

  const MARGIN_LEFT = HOUR_WIDTH / 2;
  const MARGIN_RIGHT = HOUR_WIDTH / 2;
  const totalWidth = MARGIN_LEFT + totalHours * HOUR_WIDTH + MARGIN_RIGHT;

  const marginLeftPercent = totalWidth === 0 ? 0 : (MARGIN_LEFT / totalWidth) * 100;
  const marginRightPercent = totalWidth === 0 ? 0 : (MARGIN_RIGHT / totalWidth) * 100;
  const contentWidthPercent = Math.max(100 - marginLeftPercent - marginRightPercent, 0);
  const totalTimelineMinutes = Math.max(totalHours * 60, 60);
  const minutePercent = contentWidthPercent / totalTimelineMinutes;

  const getTimePercent = useCallback((time?: string) => {
    if (!time) return marginLeftPercent;
    const [h = "0", m = "0"] = time.split(":");
    let hour = parseInt(h, 10);
    const minutes = parseInt(m, 10);
    if (Number.isNaN(hour)) hour = 0;
    let hoursSinceStart = hour - globalStartHour;
    if (hoursSinceStart < 0) {
      hoursSinceStart += 24;
    }
    const totalMinutesSinceStart = hoursSinceStart * 60 + (Number.isNaN(minutes) ? 0 : minutes);
    return marginLeftPercent + totalMinutesSinceStart * minutePercent;
  }, [globalStartHour, marginLeftPercent, minutePercent]);

  // 5. GÉNÉRER LA BANDE HORAIRE (en pourcentage)
  const timelineHours = useMemo(() => {
    const hours = [];
    for (let i = 0; i <= totalHours; i++) {
      const hour = (globalStartHour + i) % 24;
      hours.push({
        hour,
        label: `${hour.toString().padStart(2, "0")}:00`,
        position: getTimePercent(`${hour.toString().padStart(2, "0")}:00`),
      });
    }
    return hours;
  }, [globalStartHour, totalHours, getTimePercent]);

  // Helpers pour position en pourcentage
  const getDayAmplitude = (day: EventDay) => {
    const openPos = getTimePercent(day.open_time);
    const closePos = getTimePercent(day.close_time);
    return { openPos, closePos };
  };

  // Filtrer performances par jour et scène
  const getPerformancesForDayAndStage = (dayId: string, stageId: string) => {
    return performances.filter(
      (p) => p.event_day_id === dayId && p.stage_id === stageId
    );
  };

  if (days.length === 0 || stages.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Aucune donnée à afficher
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <div className="relative w-full rounded-3xl border border-[#ECE6FF] bg-white p-0 shadow-sm">
        {days.map((day) => {
          const dayDate = new Date(day.date);
          const dayName = dayDate.toLocaleDateString("fr-FR", { weekday: "long" }).toUpperCase();
          const dayNumber = dayDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
          const amplitude = getDayAmplitude(day);

          return (
            <div key={day.id} className="border-b border-[#EAE2FF] last:border-b-0">
              <div
                style={{ gridTemplateColumns: `${STAGE_COLUMN_WIDTH}px 1fr` }}
                className="grid border-b border-[#EEE4FF]"
              >
                <div className="border-r border-[#EEE4FF] px-6 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7F56D9]">
                    {dayName}
                  </div>
                  <div className="text-sm font-medium text-gray-900">{dayNumber}</div>
                </div>

                <div className="relative h-16 bg-[#F8F5FF]">
                  {timelineHours.map((th) => (
                    <div
                      key={`${day.id}-hour-${th.hour}`}
                      style={{ left: `${th.position}%` }}
                      className="absolute top-0 bottom-0 flex w-12 -translate-x-1/2 flex-col items-center justify-center text-[11px] font-semibold uppercase tracking-widest text-[#8E84B8]"
                    >
                      {th.label}
                    </div>
                  ))}
                </div>
              </div>

              {sortedStages.map((stage) => {
                const stagePerformances = getPerformancesForDayAndStage(day.id, stage.id);

                return (
                  <div
                    key={`${day.id}-${stage.id}`}
                    style={{ gridTemplateColumns: `${STAGE_COLUMN_WIDTH}px 1fr` }}
                    className="grid"
                  >
                    <div className="border-r border-[#EEE4FF] px-6 py-5">
                      <div className="text-sm font-semibold uppercase tracking-[0.1em] text-gray-900">
                        {stage.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {stage.type ? stage.type.replace(/_/g, " ") : "Stage"}
                      </div>
                    </div>

                    <div className="relative h-[120px] bg-[#FBF8FF]">
                      <div
                        className="absolute inset-y-4 rounded-2xl border border-[#E8DEFF] bg-white/70"
                        style={{
                          left: `${amplitude.openPos}%`,
                          width: `${amplitude.closePos - amplitude.openPos}%`,
                        }}
                      />

                      {timelineHours.map((th) => (
                        <div
                          key={`${day.id}-${stage.id}-grid-${th.hour}`}
                          style={{ left: `${th.position}%` }}
                          className="absolute top-4 bottom-4 w-px bg-[#E6DBFF]"
                        />
                      ))}

                      <div
                        style={{ left: `${amplitude.openPos}%` }}
                        className="absolute top-3 bottom-3 w-[3px] rounded-full bg-[#7F56D9]"
                      />
                      <div
                        style={{ left: `${amplitude.closePos}%` }}
                        className="absolute top-3 bottom-3 w-[3px] rounded-full bg-[#7F56D9]"
                      />

                      {stagePerformances.map((performance) => (
                        <ReadOnlyPerformanceCard
                          key={performance.id}
                          performance={performance}
                          leftPercent={getTimePercent(performance.performance_time)}
                          widthPercent={performance.duration * minutePercent}
                          rowHeight={120}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

