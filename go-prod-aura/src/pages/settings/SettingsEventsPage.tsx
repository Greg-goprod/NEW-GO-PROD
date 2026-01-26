import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/aura/ToastProvider';
import { useEventStore } from '@/store/useEventStore';
import { EventForm } from '@/features/settings/events/EventForm';
import { StageEnumsManager } from '@/features/settings/events/StageEnumsManager';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { fetchEventsByCompany, deleteEvent, type EventRow } from '@/api/eventsApi';
import { getCurrentCompanyId } from '@/lib/tenant';
import { supabase } from '@/lib/supabaseClient';

export function SettingsEventsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const currentEvent = useEventStore((state) => state.currentEvent);
  const clearCurrentEvent = useEventStore((state) => state.clearCurrentEvent);

  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Récupérer le company_id au montage
  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        setCurrentCompanyId(cid);
        console.log('✅ Company ID récupéré:', cid);
      } catch (e) {
        console.error('Erreur récupération company_id:', e);
        toastError('Erreur lors de la récupération de l\'entreprise');
      }
    })();
  }, []);

  // Charger les évènements
  const loadEvents = async () => {
    if (!currentCompanyId) {
      return;
    }
    setLoading(true);
    try {
      const data = await fetchEventsByCompany(currentCompanyId);
      setEvents(data);

      // Vérifier si l'événement actuel existe encore
      if (currentEvent && !data.find(e => e.id === currentEvent.id)) {
        console.warn('⚠️ L\'évènement actuel n\'existe plus dans la base de données');
        clearCurrentEvent();
        toastError('L\'évènement actuel a été supprimé de la base de données');
      }
    } catch (err: any) {
      console.error('Erreur chargement évènements:', err);
      toastError('Erreur lors du chargement des évènements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentCompanyId]);

  const handleAddEvent = () => {
    setEditingEventId(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (eventId: string) => {
    setEditingEventId(eventId);
    setShowEventForm(true);
  };

  const handleDeleteEvent = (eventId: string, eventName: string) => {
    setDeletingEvent({ id: eventId, name: eventName });
  };

  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;

    setDeleting(true);
    try {
      await deleteEvent(deletingEvent.id);
      toastSuccess(`Évènement "${deletingEvent.name}" supprimé avec succès`);
      loadEvents();
      setDeletingEvent(null);
    } catch (err: any) {
      console.error('Erreur suppression évènement:', err);
      toastError(err.message || 'Erreur lors de la suppression de l\'évènement');
    } finally {
      setDeleting(false);
    }
  };

  const handleFormClose = () => {
    setShowEventForm(false);
    setEditingEventId(null);
    loadEvents();
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Non défini';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Si le companyId n'est pas encore chargé
  if (!currentCompanyId) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement de l'entreprise...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Gestion des évènements
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Créez et gérez vos évènements, jours et scènes
          </p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={handleAddEvent}>
          Ajouter un évènement
        </Button>
      </div>

      {/* Évènement actuel (si défini) */}
      {currentEvent && (
        <Card className="p-6 border-2 border-primary-500 dark:border-primary-400">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div
                className="w-4 h-4 rounded-full mt-1"
                style={{ backgroundColor: currentEvent.color_hex || '#3b82f6' }}
              />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {currentEvent.name}
                  </h3>
                  <Badge color="primary">Évènement actuel</Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(currentEvent.start_date)} - {formatDate(currentEvent.end_date)}
                </p>
                {currentEvent.notes && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {currentEvent.notes}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="w-8 h-8 p-1"
                onClick={() => handleEditEvent(currentEvent.id)}
                title="Modifier l'évènement"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                className="w-8 h-8 p-1"
                onClick={() => {
                  clearCurrentEvent();
                  toastSuccess('Évènement désélectionné');
                }}
                title="Désélectionner l'évènement"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Liste des évènements */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : events.length === 0 ? (
        <Card className="p-6">
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Aucun évènement
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Créez votre premier évènement pour commencer
            </p>
            <Button leftIcon={<Plus size={16} />} onClick={handleAddEvent}>
              Créer un évènement
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <Card key={event.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: event.color_hex || '#3b82f6' }}
                  />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {event.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    className="w-8 h-8 p-1"
                    onClick={() => handleEditEvent(event.id)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-8 h-8 p-1"
                    onClick={() => handleDeleteEvent(event.id, event.name)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {formatDate(event.start_date)} - {formatDate(event.end_date)}
              </p>
              {event.notes && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {event.notes}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Gestion des types et spécificités de scènes */}
      {currentCompanyId && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Configuration des scènes
          </h2>
          <StageEnumsManager companyId={currentCompanyId} />
        </div>
      )}

      {/* Modal EventForm */}
      {currentCompanyId && (
        <EventForm
          open={showEventForm}
          onClose={handleFormClose}
          companyId={currentCompanyId}
          editingEventId={editingEventId}
        />
      )}

      {/* Modal de confirmation de suppression */}
      <ConfirmDeleteModal
        isOpen={!!deletingEvent}
        onClose={() => setDeletingEvent(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer l'évènement"
        message="Êtes-vous sûr de vouloir supprimer cet évènement ?"
        itemName={deletingEvent?.name}
        loading={deleting}
      />
    </div>
  );
}


export default SettingsEventsPage;