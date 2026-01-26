import { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, Users, MapPin, Edit2, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { DatePickerPopup } from '@/components/ui/pickers/DatePickerPopup';
import { TimePickerPopup } from '@/components/ui/pickers/TimePickerPopup';
import { useToast } from '@/components/aura/ToastProvider';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCompanyId } from '@/lib/tenant';
import { fetchShiftsByEvent, createShift, updateShift, deleteShift } from '@/api/staffShiftsApi';
import type { StaffShiftWithRelations, StaffShiftInput } from '@/types/staff';

type ShiftFormData = {
  event_id: string;
  title: string;
  description: string;
  shift_date: Date | null;
  start_time: string | null;
  end_time: string | null;
  places_total: number;
  unlimited_places: boolean;
  notes_public: string;
  notes_internal: string;
};

const emptyFormData: ShiftFormData = {
  event_id: '',
  title: '',
  description: '',
  shift_date: null,
  start_time: null,
  end_time: null,
  places_total: 10,
  unlimited_places: false,
  notes_public: '',
  notes_internal: '',
};

type EventRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
};

export default function StaffPlanningPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [shifts, setShifts] = useState<StaffShiftWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal création/édition
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<StaffShiftWithRelations | null>(null);
  const [formData, setFormData] = useState<ShiftFormData>(emptyFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Confirmation suppression
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    shift: StaffShiftWithRelations | null;
  }>({ open: false, shift: null });

  const { success, error: toastError } = useToast();

  // Charger company_id
  useEffect(() => {
    (async () => {
      try {
        const cid = await getCurrentCompanyId(supabase);
        setCompanyId(cid);
      } catch (e) {
        console.error('❌ Erreur récupération company_id:', e);
      }
    })();
  }, []);

  // Charger la liste des événements
  useEffect(() => {
    if (!companyId) return;
    loadEvents();
  }, [companyId]);

  const loadEvents = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, start_date, end_date, status')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      setEvents(data || []);
      // Sélectionner le premier événement par défaut
      if (data && data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (err: any) {
      console.error('Erreur chargement événements:', err);
      toastError('Erreur lors du chargement des événements');
    }
  };

  // Charger les shifts quand un événement est sélectionné
  useEffect(() => {
    if (selectedEventId) {
      loadShifts();
    } else {
      setShifts([]);
    }
  }, [selectedEventId]);

  const loadShifts = async () => {
    if (!selectedEventId) return;
    
    setLoading(true);
    try {
      const data = await fetchShiftsByEvent(selectedEventId);
      setShifts(data);
    } catch (err: any) {
      console.error('Erreur chargement shifts:', err);
      toastError('Erreur lors du chargement des shifts');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingShift(null);
    setFormData({ ...emptyFormData, event_id: selectedEventId });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (shift: StaffShiftWithRelations) => {
    setEditingShift(shift);
    setFormData({
      event_id: shift.event_id,
      title: shift.title,
      description: shift.description || '',
      shift_date: shift.shift_date ? new Date(shift.shift_date) : null,
      start_time: shift.start_time || null,
      end_time: shift.end_time || null,
      places_total: shift.places_total || 10,
      unlimited_places: shift.places_total === 9999,
      notes_public: shift.notes_public || '',
      notes_internal: shift.notes_internal || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingShift(null);
    setFormData(emptyFormData);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.event_id) errors.event_id = 'Événement requis';
    if (!formData.title.trim()) errors.title = 'Titre requis';
    if (!formData.shift_date) errors.shift_date = 'Date requise';
    if (!formData.start_time) errors.start_time = 'Heure de début requise';
    if (!formData.end_time) errors.end_time = 'Heure de fin requise';
    
    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      errors.end_time = 'L\'heure de fin doit être après l\'heure de début';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !companyId) return;

    try {
      const input: StaffShiftInput = {
        event_id: formData.event_id,
        title: formData.title,
        description: formData.description,
        shift_date: formData.shift_date!,
        start_time: formData.start_time!,
        end_time: formData.end_time!,
        places_total: formData.unlimited_places ? 9999 : formData.places_total,
        unlimited_places: formData.unlimited_places,
        notes_public: formData.notes_public,
        notes_internal: formData.notes_internal,
      };

      if (editingShift) {
        await updateShift(editingShift.id, input);
        success('Shift modifié');
      } else {
        await createShift(input);
        success('Shift créé');
      }

      closeModal();
      loadShifts();
    } catch (err: any) {
      console.error('Erreur sauvegarde shift:', err);
      toastError('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteClick = (shift: StaffShiftWithRelations) => {
    setDeleteConfirm({ open: true, shift });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.shift) return;

    try {
      await deleteShift(deleteConfirm.shift.id);
      success('Shift supprimé');
      setDeleteConfirm({ open: false, shift: null });
      loadShifts();
    } catch (err: any) {
      console.error('Erreur suppression shift:', err);
      toastError('Erreur lors de la suppression');
    }
  };

  const formatTime = (time: string) => time.substring(0, 5); // HH:MM

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(new Date(dateStr));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            STAFF • PLANNING
          </h1>
        </div>
        <Button
          onClick={openCreateModal}
          disabled={!selectedEventId}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Créer un shift
        </Button>
      </header>

      {/* Sélecteur d'événement */}
      <div className="mb-6">
        <Select
          label="Événement"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          options={[
            { value: '', label: 'Sélectionner un événement' },
            ...events.map((ev) => ({ value: ev.id, label: ev.name })),
          ]}
        />
      </div>

      {/* Liste des shifts */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      ) : !selectedEventId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Sélectionnez un événement pour voir les shifts
          </p>
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Aucun shift pour cet événement
          </p>
          <Button onClick={openCreateModal} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Créer le premier shift
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-violet-400 dark:hover:border-violet-500 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {shift.title}
                    </h3>
                    {shift.is_active ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Actif
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                        Inactif
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(shift.shift_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {shift.places_filled || 0} / {shift.places_total === 9999 ? '∞' : shift.places_total}
                    </div>
                  </div>

                  {shift.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {shift.description}
                    </p>
                  )}
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(shift)}
                    className="p-2 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/20 transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(shift)}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal création/édition */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingShift ? 'Modifier le shift' : 'Créer un shift'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Événement */}
          <Select
            label="Événement"
            value={formData.event_id}
            onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
            options={[
              { value: '', label: 'Sélectionner un événement' },
              ...events.map((ev) => ({ value: ev.id, label: ev.name })),
            ]}
            error={formErrors.event_id}
            disabled={!!editingShift}
          />

          {/* Titre */}
          <Input
            label="Titre du shift"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Accueil VIP, Montage scène..."
            error={formErrors.title}
          />

          {/* Description */}
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description du shift..."
            rows={3}
          />

          {/* Date */}
          <DatePickerPopup
            label="Date"
            value={formData.shift_date}
            onChange={(date) => setFormData({ ...formData, shift_date: date })}
            error={formErrors.shift_date}
          />

          {/* Horaires */}
          <div className="grid grid-cols-2 gap-4">
            <TimePickerPopup
              label="Heure de début"
              value={formData.start_time}
              onChange={(time) => setFormData({ ...formData, start_time: time })}
              error={formErrors.start_time}
            />
            <TimePickerPopup
              label="Heure de fin"
              value={formData.end_time}
              onChange={(time) => setFormData({ ...formData, end_time: time })}
              error={formErrors.end_time}
            />
          </div>

          {/* Places */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.unlimited_places}
                  onChange={(e) =>
                    setFormData({ ...formData, unlimited_places: e.target.checked })
                  }
                  className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Places illimitées
                </span>
              </label>
            </div>
            {!formData.unlimited_places && (
              <Input
                label="Nombre de places"
                type="number"
                value={formData.places_total.toString()}
                onChange={(e) =>
                  setFormData({ ...formData, places_total: parseInt(e.target.value) || 0 })
                }
                min="1"
              />
            )}
          </div>

          {/* Notes */}
          <Textarea
            label="Notes publiques (visibles par les bénévoles)"
            value={formData.notes_public}
            onChange={(e) => setFormData({ ...formData, notes_public: e.target.value })}
            placeholder="Informations pour les bénévoles..."
            rows={2}
          />

          <Textarea
            label="Notes internes (privées)"
            value={formData.notes_internal}
            onChange={(e) => setFormData({ ...formData, notes_internal: e.target.value })}
            placeholder="Notes internes pour l'organisation..."
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={closeModal}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            {editingShift ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </Modal>

      {/* Confirmation suppression */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, shift: null })}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le shift"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm.shift?.title}" ?\n\nToutes les affectations seront également supprimées.\n\nCette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
}


