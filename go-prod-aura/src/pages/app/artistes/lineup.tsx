import React, { useEffect, useState, useCallback } from "react";
import { ListMusic } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { Card } from "../../../components/aura/Card";
import { EmptyState } from "../../../components/aura/EmptyState";
import { useToast } from "../../../components/aura/ToastProvider";
import { useCurrentEvent } from "../../../hooks/useCurrentEvent";
import { ReadOnlyTimelineGrid } from "../../../features/timeline/components/ReadOnlyTimelineGrid";
import {
  fetchEventDays,
  fetchEventStages,
  fetchPerformances,
  type EventDay,
  type EventStage,
  type Performance,
} from "../../../features/timeline/timelineApi";

export default function LineupPage() {
  const { t } = useI18n();
  const { currentEvent, companyId } = useCurrentEvent();
  const { toastError } = useToast();

  const [days, setDays] = useState<EventDay[]>([]);
  const [stages, setStages] = useState<EventStage[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  const eventId = currentEvent?.id || null;
  const hasEvent = Boolean(eventId);

  // Charger les données - Réagit directement au changement d'eventId
  useEffect(() => {
    const loadData = async () => {
      console.log('🔄 LineupPage - eventId changed:', eventId);
      
      if (!eventId) {
        setDays([]);
        setStages([]);
        setPerformances([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log('📅 Chargement données lineup pour event:', eventId);

        // Charger les jours, scènes et performances en parallèle
        const [daysData, stagesData, performancesData] = await Promise.all([
          fetchEventDays(eventId),
          fetchEventStages(eventId),
          fetchPerformances(eventId),
        ]);

        console.log('✅ Données chargées:', {
          days: daysData.length,
          stages: stagesData.length,
          performances: performancesData.length,
        });

        // Filtrer uniquement les performances avec statut "offre_validee"
        const validatedPerformances = performancesData.filter(
          (p) => p.booking_status === 'offre_validee'
        );

        console.log('✅ Performances validées:', validatedPerformances.length);

        setDays(daysData);
        setStages(stagesData);
        setPerformances(validatedPerformances);
      } catch (err) {
        console.error('❌ Erreur chargement lineup:', err);
        toastError('Erreur lors du chargement du lineup');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, toastError]); // Dépendance directe sur eventId

  if (loading) {
    return (
      <div className="p-6">
        <header className="flex items-center gap-2 mb-6">
          <ListMusic className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('lineup').toUpperCase()}
          </h1>
        </header>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
        </div>
      </div>
    );
  }

  if (!hasEvent) {
    return (
      <div className="p-6">
        <header className="flex items-center gap-2 mb-6">
          <ListMusic className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('lineup').toUpperCase()}
          </h1>
        </header>
        <EmptyState
          icon={<ListMusic className="w-12 h-12" />}
          title="Aucun événement sélectionné"
          description="Sélectionnez un événement pour voir le lineup"
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ListMusic className="w-5 h-5 text-violet-400" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('lineup').toUpperCase()}
            </h1>
            {currentEvent && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {currentEvent.name}
              </p>
            )}
          </div>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {performances.length > 0 ? (
            <>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {performances.length}
              </span>{' '}
              {performances.length > 1 ? 'artistes confirmés' : 'artiste confirmé'}
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-500">
              Aucun artiste confirmé
            </span>
          )}
        </div>
      </header>

      {/* Grille Timeline en lecture seule */}
      <Card className="p-4">
        <ReadOnlyTimelineGrid
          days={days}
          stages={stages}
          performances={performances}
        />
      </Card>
    </div>
  );
}
