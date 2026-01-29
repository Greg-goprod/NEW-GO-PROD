import { useState, useEffect } from 'react';
import { Bus, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import {
  fetchVehiclesByEvent,
  createVehicle,
  updateVehicle,
  deleteVehicle
} from '@/api/vehiclesApi';
import type { Vehicle, VehicleFormData } from '@/types/production';
import { Button } from '@/components/aura/Button';
import { PageHeader } from '@/components/aura/PageHeader';
import { Input } from '@/components/aura/Input';
import { Modal } from '@/components/aura/Modal';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';

export default function VehiculesPage() {
  useI18n(); // Required for locale reactivity
  const { currentEvent } = useCurrentEvent();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<Partial<VehicleFormData>>({});
  
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
      const data = await fetchVehiclesByEvent(currentEvent.id);
      setVehicles(data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData(vehicle);
    } else {
      setEditingVehicle(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    if (!currentEvent?.id) return;
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, formData);
      } else {
        await createVehicle(currentEvent.id, formData as VehicleFormData);
      }
      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Error saving vehicle:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteVehicle(deleteId);
      setDeleteId(null);
      loadData();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    `${vehicle.brand} ${vehicle.model}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <PageHeader
        icon={Bus}
        title="VÉHICULES"
        actions={
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-1" />
            Nouveau véhicule
          </Button>
        }
      />

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un véhicule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          Aucun véhicule trouvé
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Véhicule</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Immatriculation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Capacité</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {vehicle.brand} {vehicle.model}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{vehicle.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{vehicle.registration_number || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {vehicle.passenger_capacity || '-'} pax
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      vehicle.status === 'available'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : vehicle.status === 'assigned'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenModal(vehicle)}
                      className="p-1 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(vehicle.id)}
                      className="p-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
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
        open={isModalOpen}
        onClose={handleCloseModal}
        title={editingVehicle ? 'Modifier le véhicule' : 'Nouveau véhicule'}
        size="md"
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Marque <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Modèle <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.type || ''}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="Van, Bus..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Immatriculation</label>
              <Input
                value={formData.registration_number || ''}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Fournisseur</label>
              <Input
                value={formData.supplier || ''}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Capacité passagers</label>
              <Input
                type="number"
                value={formData.passenger_capacity || ''}
                onChange={(e) => setFormData({ ...formData, passenger_capacity: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Capacité bagages</label>
              <Input
                type="number"
                value={formData.luggage_capacity || ''}
                onChange={(e) => setFormData({ ...formData, luggage_capacity: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="ghost" onClick={handleCloseModal}>Annuler</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!formData.brand || !formData.model || !formData.type}
            >
              {editingVehicle ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer le véhicule"
        message="Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible."
        variant="danger"
      />
    </div>
  );
}
