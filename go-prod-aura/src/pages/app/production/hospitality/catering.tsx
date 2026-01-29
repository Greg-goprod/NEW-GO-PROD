import { useState, useEffect } from 'react';
import { UtensilsCrossed, Plus, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import {
  fetchCateringRequirementsByEvent,
  createCateringRequirement,
  deleteCateringRequirement
} from '@/api/cateringApi';
import { fetchAllArtists } from '@/api/artistsApi';
import type { CateringRequirementWithArtist, MealType } from '@/types/production';
import { Button } from '@/components/aura/Button';
import { PageHeader } from '@/components/aura/PageHeader';
import { Input } from '@/components/aura/Input';
import { Modal } from '@/components/aura/Modal';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Petit-déjeuner' },
  { value: 'lunch', label: 'Déjeuner' },
  { value: 'dinner', label: 'Dîner' },
  { value: 'snack', label: 'Snack' },
  { value: 'drinks', label: 'Boissons' }
];

export default function CateringPage() {
  const { t } = useI18n();
  const { currentEvent } = useCurrentEvent();
  
  const [requirements, setRequirements] = useState<CateringRequirementWithArtist[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [count, setCount] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (currentEvent?.id) {
      loadData();
    }
  }, [currentEvent?.id]);

  const loadData = async () => {
    if (!currentEvent?.id) return;
    setIsLoading(true);
    try {
      const [requirementsData, artistsData] = await Promise.all([
        fetchCateringRequirementsByEvent(currentEvent.id),
        fetchAllArtists()
      ]);
      setRequirements(requirementsData);
      setArtists(artistsData);
    } catch (error) {
      console.error('Error loading catering:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setSelectedArtist(null);
    setSelectedMealType(null);
    setCount(1);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!currentEvent?.id || !selectedArtist || !selectedMealType) return;
    try {
      await createCateringRequirement(
        currentEvent.id,
        selectedArtist,
        selectedMealType,
        count,
        [],
        notes
      );
      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Error creating requirement:', error);
    }
  };

  const filteredRequirements = requirements.filter(req =>
    req.artist_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouper par type de repas
  const grouped = filteredRequirements.reduce((acc, req) => {
    if (!acc[req.meal_type]) acc[req.meal_type] = [];
    acc[req.meal_type].push(req);
    return acc;
  }, {} as Record<MealType, CateringRequirementWithArtist[]>);

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
        icon={UtensilsCrossed}
        title="CATERING"
        actions={
          <Button variant="primary" onClick={handleOpenModal}>
            <Plus className="w-4 h-4 mr-1" />
            Nouveau besoin
          </Button>
        }
      />

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          Aucun besoin catering enregistré
        </div>
      ) : (
        <div className="space-y-6">
          {MEAL_TYPES.map(({ value, label }) => {
            const items = grouped[value] || [];
            if (items.length === 0) return null;

            const total = items.reduce((sum, item) => sum + item.count, 0);

            return (
              <div key={value}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {label}
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Total : {total} repas
                  </span>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Artiste</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantité</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {items.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {req.artist_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {req.count}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {req.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Nouveau besoin catering"
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Artiste <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedArtist || ''}
              onChange={(e) => setSelectedArtist(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Sélectionner...</option>
              {artists.map(artist => (
                <option key={artist.id} value={artist.id}>{artist.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Type de repas <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedMealType || ''}
              onChange={(e) => setSelectedMealType(e.target.value as MealType)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Sélectionner...</option>
              {MEAL_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Quantité
            </label>
            <Input
              type="number"
              min="1"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Régimes alimentaires spéciaux, allergies..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="ghost" onClick={handleCloseModal}>Annuler</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!selectedArtist || !selectedMealType}
            >
              Créer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
