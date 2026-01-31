import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/aura/Button';
import { useToast } from '@/components/aura/ToastProvider';
import { useCompanyId } from '@/hooks/useCompanyId';
import { useEventStore } from '@/store/useEventStore';
import { listEvents, type EventWithCounts } from '@/api/eventsApi';
import { EventForm } from '@/features/settings/events/EventForm';

export default function SelectEventPage() {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const { companyId, loading: companyLoading } = useCompanyId();
  const setCurrentEvent = useEventStore((state) => state.setCurrentEvent);

  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Charger les événements du tenant
  useEffect(() => {
    if (!companyId) return;

    setLoading(true);
    listEvents(companyId)
      .then((data) => {
        setEvents(data);
        // Si aucun événement, ouvrir directement le modal de création
        if (data.length === 0) {
          setShowCreateModal(true);
        }
      })
      .catch((err) => {
        console.error('Erreur chargement événements:', err);
        toastError('Erreur lors du chargement des événements');
      })
      .finally(() => setLoading(false));
  }, [companyId, toastError]);

  // Sélectionner un événement
  const handleSelectEvent = (event: EventWithCounts) => {
    // Sauvegarder dans le store et localStorage
    setCurrentEvent(event);
    localStorage.setItem('selected_event_id', event.id);
    
    toastSuccess(`Événement "${event.name}" sélectionné`);
    
    // Rediriger vers le dashboard
    navigate('/app');
  };

  // Formater l'année en gras
  const formatEventDates = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startDay = start.getDate();
    const endDay = end.getDate();
    const month = end.toLocaleDateString('fr-FR', { month: 'long' });
    const year = end.getFullYear();
    
    return {
      dates: `${startDay} - ${endDay} ${month}`,
      year: year.toString(),
    };
  };

  // Callback après création d'événement
  const handleEventCreated = () => {
    setShowCreateModal(false);
    // Recharger la liste
    if (companyId) {
      listEvents(companyId).then(setEvents);
    }
  };

  if (companyLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Chargement des événements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">GO-PROD</h1>
          <p className="text-gray-400">Sélectionnez un événement pour commencer</p>
        </div>

        {/* Liste des événements */}
        {events.length > 0 ? (
          <div className="space-y-4 mb-8">
            {events.map((event) => {
              const dateInfo = formatEventDates(event.start_date, event.end_date);
              
              return (
                <button
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  className="w-full p-6 rounded-xl border border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-violet-500/50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Indicateur couleur */}
                      <div
                        className="w-3 h-12 rounded-full"
                        style={{ backgroundColor: event.color_hex || '#8B5CF6' }}
                      />
                      
                      <div>
                        {/* Nom de l'événement */}
                        <h2 className="text-xl font-semibold text-white group-hover:text-violet-400 transition-colors">
                          {event.name}
                        </h2>
                        
                        {/* Dates */}
                        {dateInfo && (
                          <p className="text-gray-400 mt-1">
                            <Calendar className="w-4 h-4 inline-block mr-2" />
                            {dateInfo.dates}{' '}
                            <span className="font-bold text-white">{dateInfo.year}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Flèche */}
                    <ChevronRight className="w-6 h-6 text-gray-500 group-hover:text-violet-400 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Message si aucun événement */
          <div className="text-center py-16 px-8 rounded-xl border border-dashed border-gray-700 bg-gray-800/30 mb-8">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Aucun événement
            </h2>
            <p className="text-gray-400 mb-6">
              Créez votre premier événement pour commencer à utiliser GO-PROD
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="mx-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer mon premier événement
            </Button>
          </div>
        )}

        {/* Bouton créer (si des événements existent) */}
        {events.length > 0 && (
          <div className="text-center">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer un nouvel événement
            </Button>
          </div>
        )}
      </div>

      {/* Modal de création */}
      {companyId && (
        <EventForm
          open={showCreateModal}
          onClose={handleEventCreated}
          companyId={companyId}
        />
      )}
    </div>
  );
}
