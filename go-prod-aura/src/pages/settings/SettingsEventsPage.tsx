import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, X } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Badge } from '@/components/aura/Badge';
import { useToast } from '@/components/aura/ToastProvider';
import { useEventStore } from '@/store/useEventStore';
import { EventForm } from '@/features/settings/events/EventForm';
import { StageEnumsManager } from '@/features/settings/events/StageEnumsManager';
import { EventStagesManager } from '@/features/settings/events/EventStagesManager';
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

  // Recuperer le company_id au montage
  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        setCurrentCompanyId(cid);
      } catch (e) {
        console.error('Erreur recuperation company_id:', e);
        toastError('Erreur lors de la recuperation de l\'entreprise');
      }
    })();
  }, []);

  // Charger les evenements
  const loadEvents = async () => {
    if (!currentCompanyId) {
      return;
    }
    setLoading(true);
    try {
      const data = await fetchEventsByCompany(currentCompanyId);
      setEvents(data);

      // Verifier si l'evenement actuel existe encore
      if (currentEvent && !data.find(e => e.id === currentEvent.id)) {
        clearCurrentEvent();
        toastError('L\'evenement actuel a ete supprime de la base de donnees');
      }
    } catch (err: any) {
      console.error('Erreur chargement evenements:', err);
      toastError('Erreur lors du chargement des evenements');
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
      toastSuccess(`Evenement "${deletingEvent.name}" supprime avec succes`);
      loadEvents();
      setDeletingEvent(null);
    } catch (err: any) {
      console.error('Erreur suppression evenement:', err);
      toastError(err.message || 'Erreur lors de la suppression de l\'evenement');
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
    if (!date) return 'Non defini';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Si le companyId n'est pas encore charge
  if (!currentCompanyId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
          <span className="ml-3" style={{ color: 'var(--text-muted)' }}>Chargement de l'entreprise...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Gestion des evenements
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Creez et gerez vos evenements, jours et scenes
          </p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={handleAddEvent}>
          Ajouter un evenement
        </Button>
      </div>

      {/* Evenement actuel (si defini) */}
      {currentEvent && (
        <div 
          className="rounded-xl p-6"
          style={{ 
            background: 'var(--color-bg-elevated)',
            border: '2px solid var(--primary)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div
                className="w-4 h-4 rounded-full mt-1"
                style={{ backgroundColor: currentEvent.color_hex || '#713DFF' }}
              />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                    {currentEvent.name}
                  </h3>
                  <Badge color="violet">Evenement actuel</Badge>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(currentEvent.start_date)} - {formatDate(currentEvent.end_date)}
                </p>
                {currentEvent.notes && (
                  <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                    {currentEvent.notes}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleEditEvent(currentEvent.id)}
                title="Modifier l'evenement"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  clearCurrentEvent();
                  toastSuccess('Evenement deselectionne');
                }}
                title="Deselectionner l'evenement"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des evenements */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-400" />
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Evenements
            </h3>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Aucun evenement
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color_hex || '#713DFF' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {event.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(event.start_date)} - {formatDate(event.end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEditEvent(event.id)}
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id, event.name)}
                      className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Grille 3 colonnes: Scenes, Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {/* Scenes de l'evenement courant */}
        <EventStagesManager 
          eventId={currentEvent?.id || null} 
          companyId={currentCompanyId} 
        />

        {/* Configuration des types/specificites de scenes */}
        <StageEnumsManager companyId={currentCompanyId} />
      </div>

      {/* Modal EventForm */}
      <EventForm
        open={showEventForm}
        onClose={handleFormClose}
        companyId={currentCompanyId}
        editingEventId={editingEventId}
      />

      {/* Modal de confirmation de suppression */}
      <ConfirmDeleteModal
        isOpen={!!deletingEvent}
        onClose={() => setDeletingEvent(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer l'evenement"
        message="Etes-vous sur de vouloir supprimer cet evenement ?"
        itemName={deletingEvent?.name}
        loading={deleting}
      />
    </div>
  );
}

export default SettingsEventsPage;
