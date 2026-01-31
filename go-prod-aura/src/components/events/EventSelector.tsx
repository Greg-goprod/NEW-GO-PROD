import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/aura/ToastProvider';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import { listEvents } from '@/api/eventsApi';
import type { EventWithCounts } from '@/api/eventsApi';
import { EventForm } from '@/features/settings/events/EventForm';
import { useCompanyId } from '@/hooks/useCompanyId';

export function EventSelector() {
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const { error: toastError } = useToast();
  const { companyId } = useCompanyId();
  
  const { eventId, setCurrentEvent } = useCurrentEvent();

  // Charger la liste des évènements
  const loadEvents = useCallback(async () => {
    if (!companyId) {
      return;
    }

    setLoading(true);
    try {
      const eventsList = await listEvents(companyId);
      setEvents(eventsList);

      // Vérifier si l'événement actuellement sélectionné existe encore
      if (eventId && !eventsList.find(e => e.id === eventId)) {
        console.warn('⚠️ L\'évènement sélectionné n\'existe plus, nettoyage automatique');
        setCurrentEvent(null);
        toastError('L\'évènement sélectionné a été supprimé');
      }
      
      // Auto-sélectionner le premier événement si aucun n'est sélectionné
      // et qu'il y a des événements disponibles
      if (!eventId && eventsList.length > 0) {
        console.log('🎯 Auto-sélection du premier événement:', eventsList[0].name);
        setCurrentEvent(eventsList[0]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement évènements:', error);
      toastError('Erreur lors du chargement des évènements');
    } finally {
      setLoading(false);
    }
  }, [companyId, eventId, setCurrentEvent, toastError]);

  // Charger les évènements au montage et quand companyId change
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Écouter les changements d'évènement pour recharger la liste
  useEffect(() => {
    const handleEventChange = () => {
      loadEvents();
    };

    window.addEventListener('event-changed', handleEventChange);
    return () => window.removeEventListener('event-changed', handleEventChange);
  }, [loadEvents]);

  // Gérer le changement d'évènement
  const handleEventChange = (newEventId: string) => {
    // Ne rien faire si c'est le même événement (ou si les deux sont "vides")
    if (newEventId === (eventId || '')) return;
    
    // Si l'utilisateur sélectionne l'option vide "Sélectionner un évènement"
    if (!newEventId) {
      setCurrentEvent(null);
      setTimeout(() => {
        window.location.reload();
      }, 100);
      return;
    }
    
    const selectedEvent = events.find(e => e.id === newEventId);
    if (selectedEvent) {
      setCurrentEvent(selectedEvent);
      
      // Forcer un refresh de la page pour recharger les données avec le nouvel événement
      // Le store est déjà mis à jour, mais certaines pages lisent depuis localStorage
      // qui est synchronisé dans setCurrentEvent
      // Délai court pour permettre au store de se mettre à jour
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };


  // Si pas de companyId (profil non chargé ou utilisateur sans organisation)
  if (!companyId) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <Calendar className="w-4 h-4 text-yellow-500" />
        <span className="text-sm text-yellow-400">Chargement de votre organisation...</span>
      </div>
    );
  }

  // Formater le range de dates au format "DD au DD. MM.YYYY"
  const formatDateRange = (startDateStr: string | null, endDateStr: string | null) => {
    if (!startDateStr || !endDateStr) return '';
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    const startDay = String(startDate.getDate()).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');
    const month = String(endDate.getMonth() + 1).padStart(2, '0');
    const year = endDate.getFullYear();
    
    return `${startDay} au ${endDay}. ${month}.${year}`;
  };

  // Si pas d'évènements
  if (!loading && events.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg min-w-[300px]">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-500">Aucun évènement</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Sélecteur d'évènement */}
        <div className="relative">
          <select
            value={eventId || ''}
            onChange={(e) => handleEventChange(e.target.value)}
            disabled={loading}
            className="appearance-none bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[350px]"
          >
            <option value="">Sélectionner un évènement</option>
            {events.map((event) => {
              const dateRange = formatDateRange(event.start_date, event.end_date);
              const displayText = dateRange ? `${event.name} (${dateRange})` : event.name;
              
              return (
                <option key={event.id} value={event.id}>
                  {displayText}
                </option>
              );
            })}
          </select>
          
          {/* Icône dropdown */}
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Modal de création */}
      {companyId && (
        <EventForm
          open={showQuickCreate}
          onClose={() => {
            setShowQuickCreate(false);
            loadEvents();
          }}
          companyId={companyId}
        />
      )}
    </>
  );
}
