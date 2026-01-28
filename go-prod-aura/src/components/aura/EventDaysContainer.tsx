import { useEffect, useState } from "react";
import { fetchEventDays, type EventDay } from "@/features/timeline/timelineApi";

interface EventDaysContainerProps {
  eventId: string;
  emptyMessage?: string;
  children?: (day: EventDay, index: number) => React.ReactNode;
}

/**
 * Composant qui affiche les containers de jours d'un événement
 * Même si aucune donnée n'est associée aux jours
 */
export function EventDaysContainer({ 
  eventId, 
  emptyMessage = "Aucune donnée pour ce jour",
  children 
}: EventDaysContainerProps) {
  const [days, setDays] = useState<EventDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setDays([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchEventDays(eventId)
      .then((data) => {
        setDays(data || []);
      })
      .catch((err) => {
        console.error("Erreur chargement jours:", err);
        setDays([]);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const formatDisplayDateLong = (value: string) => {
    if (!value) return "—";
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Chargement...
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Aucun jour configuré pour cet événement
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {days.map((day, index) => (
        <div
          key={day.id}
          className="rounded-2xl border border-violet-100 dark:border-violet-800/50 bg-white dark:bg-gray-900 overflow-hidden shadow-sm"
        >
          {/* Header du jour */}
          <div className="px-5 py-3 bg-gradient-to-r from-violet-50 to-violet-100/50 dark:from-violet-900/30 dark:to-violet-800/20 border-b border-violet-100 dark:border-violet-800/50">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">
              {formatDisplayDateLong(day.date)}
            </h3>
          </div>

          {/* Contenu du jour */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {children ? (
              children(day, index)
            ) : (
              <div className="px-5 py-4 text-center text-sm text-gray-400 dark:text-gray-500 italic">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default EventDaysContainer;
