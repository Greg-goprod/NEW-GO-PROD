import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import {
  fetchShiftsByEvent,
  createShift,
  updateShift,
  deleteShift
} from '@/api/shiftsApi';
import type { Shift, ShiftFormData } from '@/types/production';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { Modal } from '@/components/aura/Modal';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';

export default function CreneauxPage() {
  const { t } = useI18n();
  const { currentEvent } = useCurrentEvent();
  
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState<Partial<ShiftFormData>>({});
  
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (currentEvent?.id) {
      loadData();
    }
  }, [currentEvent?.id]);

  const loadData = async () => {
    if (!currentEvent?.id) return;
    setIsLoading(true);
    try {
      const data = await fetchShiftsByEvent(currentEvent.id);
      setShifts(data);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      setFormData(shift);
    } else {
      setEditingShift(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingShift(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    if (!currentEvent?.id) return;
    try {
      if (editingShift) {
        await updateShift(editingShift.id, formData);
      } else {
        await createShift(currentEvent.id, formData as ShiftFormData);
      }
      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Error saving shift:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteShift(deleteId);
      setDeleteId(null);
      loadData();
    } catch (error) {
      console.error('Error deleting shift:', error);
    }
  };

  const filteredShifts = shifts.filter(shift =>
    shift.shift_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (time: string) => {
    return time.substring(0, 5); // HH:MM
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
        </div>
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 dark:text-gray-400 py-12">
          Aucun événement sélectionné
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">CRÉNEAUX HORAIRES</h1>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-1" />
          Nouveau créneau
        </Button>
      </header>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un créneau..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredShifts.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          Aucun créneau trouvé
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Horaires</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredShifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {shift.shift_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(shift.shift_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {shift.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenModal(shift)}
                      className="p-1 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(shift.id)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingShift ? 'Modifier le créneau' : 'Nouveau créneau'}
        widthClass="max-w-2xl"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Nom du créneau <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.shift_name || ''}
              onChange={(e) => setFormData({ ...formData, shift_name: e.target.value })}
              placeholder="Matin, Après-midi, Soirée..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={formData.shift_date || ''}
              onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Heure de début <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                value={formData.start_time || ''}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Heure de fin <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                value={formData.end_time || ''}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description du créneau..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="ghost" onClick={handleCloseModal}>Annuler</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!formData.shift_name || !formData.shift_date || !formData.start_time || !formData.end_time}
            >
              {editingShift ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer le créneau"
        message="Êtes-vous sûr de vouloir supprimer ce créneau ? Cette action est irréversible."
        variant="danger"
      />
    </div>
  );
}

