import { useState, useEffect } from 'react';
import { Plane, Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import { 
  fetchTravelsByEvent, 
  createTravel, 
  deleteTravel 
} from '@/api/travelsApi';
import { fetchAllArtists } from '@/api/artistsApi';
import { fetchCRMContacts } from '@/api/crmContactsApi';
import type { TravelWithRelations, TravelType, TravelFormData } from '@/types/production';
import { Button } from '@/components/aura/Button';
import { PageHeader } from '@/components/aura/PageHeader';
import { Input } from '@/components/aura/Input';
import { Modal } from '@/components/aura/Modal';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { TravelStepper } from '@/components/production/TravelStepper';
import { DateTimePickerPopup } from '@/components/ui/pickers/DateTimePickerPopup';

const TRAVEL_TYPES: { value: TravelType; label: string; isVehicle: boolean }[] = [
  { value: 'PLANE', label: 'Avion', isVehicle: false },
  { value: 'TRAIN', label: 'Train', isVehicle: false },
  { value: 'CAR', label: 'Voiture', isVehicle: true },
  { value: 'VAN', label: 'Van', isVehicle: true },
  { value: 'VAN_TRAILER', label: 'Van + Remorque', isVehicle: true },
  { value: 'TOURBUS', label: 'Tour Bus', isVehicle: true },
  { value: 'TOURBUS_TRAILER', label: 'Tour Bus + Remorque', isVehicle: true },
  { value: 'TRUCK', label: 'Camion', isVehicle: true },
  { value: 'TRUCK_TRAILER', label: 'Camion + Remorque', isVehicle: true },
  { value: 'SEMI_TRAILER', label: 'Semi-remorque', isVehicle: true }
];

export default function TravelPage() {
  useI18n(); // Required for locale reactivity
  const { currentEvent } = useCurrentEvent();
  
  const [travels, setTravels] = useState<TravelWithRelations[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal Stepper
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form data
  const [selectedType, setSelectedType] = useState<TravelType | null>(null);
  const [selectedPersonType, setSelectedPersonType] = useState<'artist' | 'contact' | null>(null);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [isArrival, setIsArrival] = useState(true);
  const [formData, setFormData] = useState<Partial<TravelFormData>>({});
  
  // Delete confirmation
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
      const [travelsData, artistsData, contactsData] = await Promise.all([
        fetchTravelsByEvent(currentEvent.id),
        fetchAllArtists(),
        fetchCRMContacts()
      ]);
      
      setTravels(travelsData);
      setArtists(artistsData);
      setContacts(contactsData);
    } catch (error) {
      console.error('Error loading travels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedType(null);
    setSelectedPersonType(null);
    setSelectedArtists([]);
    setSelectedContact(null);
    setIsArrival(true);
    setFormData({});
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!currentEvent?.id) return;
    
    try {
      // Créer un travel par artiste sélectionné
      if (selectedPersonType === 'artist' && selectedArtists.length > 0) {
        for (const artistId of selectedArtists) {
          const payload: TravelFormData = {
            travel_type: selectedType!,
            artist_id: artistId,
            is_arrival: isArrival,
            scheduled_datetime: formData.scheduled_datetime!,
            departure_location: formData.departure_location,
            arrival_location: formData.arrival_location,
            reference_number: formData.reference_number,
            passenger_count: formData.passenger_count || 1,
            notes: formData.notes
          };
          
          await createTravel(currentEvent.id, payload);
        }
      } else if (selectedPersonType === 'contact' && selectedContact) {
        const payload: TravelFormData = {
          travel_type: selectedType!,
          contact_id: selectedContact,
          is_arrival: isArrival,
          scheduled_datetime: formData.scheduled_datetime!,
          departure_location: formData.departure_location,
          arrival_location: formData.arrival_location,
          reference_number: formData.reference_number,
          passenger_count: formData.passenger_count || 1,
          notes: formData.notes
        };
        
        await createTravel(currentEvent.id, payload);
      }
      
      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Error creating travel:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deleteTravel(deleteId);
      setDeleteId(null);
      loadData();
    } catch (error) {
      console.error('Error deleting travel:', error);
    }
  };

  const steps = [
    { id: 1, label: 'Type de voyage', completed: currentStep > 1 },
    { id: 2, label: 'Personne', completed: currentStep > 2 },
    { id: 3, label: 'Direction', completed: currentStep > 3 },
    { id: 4, label: 'Détails', completed: currentStep > 4 }
  ];

  const canProceedStep1 = selectedType !== null;
  const canProceedStep2 = 
    (selectedPersonType === 'artist' && selectedArtists.length > 0) ||
    (selectedPersonType === 'contact' && selectedContact !== null);
  const canSubmit = formData.scheduled_datetime !== undefined;

  const selectedTypeConfig = TRAVEL_TYPES.find(t => t.value === selectedType);

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
      {/* Header */}
      <PageHeader
        icon={Plane}
        title="TRAVELS"
        actions={
          <Button variant="primary" onClick={handleOpenModal}>
            <Plus className="w-4 h-4 mr-1" />
            Nouveau voyage
          </Button>
        }
      />

      {/* Liste des travels */}
      {travels.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          Aucun voyage enregistré
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Personne
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Direction
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Date/Heure
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Lieux
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Référence
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {travels.map((travel) => (
                <tr
                  key={travel.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {TRAVEL_TYPES.find(t => t.value === travel.travel_type)?.label || travel.travel_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {travel.artist_name || travel.contact_name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {travel.is_arrival ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <ArrowRight className="w-3 h-3" />
                        Arrivée
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                        <ArrowLeft className="w-3 h-3" />
                        Départ
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(travel.scheduled_datetime).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {travel.departure_location && travel.arrival_location
                      ? `${travel.departure_location} → ${travel.arrival_location}`
                      : travel.departure_location || travel.arrival_location || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {travel.reference_number || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeleteId(travel.id)}
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

      {/* Modal Stepper */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title="Nouveau voyage"
        size="lg"
      >
        <div className="p-6">
          <TravelStepper currentStep={currentStep} steps={steps} />

          {/* Étape 1 : Type de voyage */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Sélectionnez le type de voyage
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {TRAVEL_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-all
                      ${
                        selectedType === type.value
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'
                      }
                    `}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {type.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {type.isVehicle ? 'Véhicule' : 'Transport public'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Étape 2 : Personne */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Qui voyage ?
              </h3>
              
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => {
                    setSelectedPersonType('artist');
                    setSelectedContact(null);
                  }}
                  className={`
                    flex-1 p-4 rounded-lg border-2 transition-all
                    ${
                      selectedPersonType === 'artist'
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }
                  `}
                >
                  Artiste(s)
                </button>
                <button
                  onClick={() => {
                    setSelectedPersonType('contact');
                    setSelectedArtists([]);
                  }}
                  className={`
                    flex-1 p-4 rounded-lg border-2 transition-all
                    ${
                      selectedPersonType === 'contact'
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }
                  `}
                >
                  Contact
                </button>
              </div>

              {selectedPersonType === 'artist' && (
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  {artists.map((artist) => (
                    <label
                      key={artist.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedArtists.includes(artist.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedArtists([...selectedArtists, artist.id]);
                          } else {
                            setSelectedArtists(selectedArtists.filter(id => id !== artist.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {artist.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {selectedPersonType === 'contact' && (
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  {contacts.map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="contact"
                        checked={selectedContact === contact.id}
                        onChange={() => setSelectedContact(contact.id)}
                        className="w-4 h-4 border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {contact.first_name} {contact.last_name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Étape 3 : Direction */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Direction du voyage
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setIsArrival(true)}
                  className={`
                    p-6 rounded-lg border-2 transition-all
                    ${
                      isArrival
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ArrowRight className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-900 dark:text-white">Arrivée</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Vers l'événement
                  </div>
                </button>
                <button
                  onClick={() => setIsArrival(false)}
                  className={`
                    p-6 rounded-lg border-2 transition-all
                    ${
                      !isArrival
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ArrowLeft className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-gray-900 dark:text-white">Départ</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Depuis l'événement
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Étape 4 : Détails */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Détails du voyage
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Lieu de départ
                  </label>
                  <Input
                    type="text"
                    value={formData.departure_location || ''}
                    onChange={(e) => setFormData({ ...formData, departure_location: e.target.value })}
                    placeholder="Genève Aéroport..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Lieu d'arrivée
                  </label>
                  <Input
                    type="text"
                    value={formData.arrival_location || ''}
                    onChange={(e) => setFormData({ ...formData, arrival_location: e.target.value })}
                    placeholder="Lausanne Gare..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DateTimePickerPopup
                  label="Date et heure *"
                  value={formData.scheduled_datetime ? new Date(formData.scheduled_datetime) : null}
                  onChange={(date) => setFormData({ ...formData, scheduled_datetime: date ? date.toISOString() : '' })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Nombre de passagers
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.passenger_count || 1}
                    onChange={(e) => setFormData({ ...formData, passenger_count: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              {!selectedTypeConfig?.isVehicle && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Numéro de référence (vol, train...)
                  </label>
                  <Input
                    type="text"
                    value={formData.reference_number || ''}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="LX2345, TGV 9234..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informations complémentaires..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            {currentStep > 1 ? (
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Retour
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !canProceedStep1) ||
                  (currentStep === 2 && !canProceedStep2)
                }
              >
                Suivant
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                Créer le(s) voyage(s)
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer le voyage"
        message="Êtes-vous sûr de vouloir supprimer ce voyage ? Cette action est irréversible."
        variant="danger"
      />
    </div>
  );
}
