import { useState, useEffect } from 'react';
import { Hotel, Plus, Edit2, Trash2, Search, Calendar } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import {
  fetchReservationsByEvent,
  createReservation,
  updateReservation,
  deleteReservation,
  confirmReservation,
  fetchAllHotels
} from '@/api/hotelsApi';
import { fetchAllArtists } from '@/api/artistsApi';
import { fetchCRMContacts } from '@/api/crmContactsApi';
import type { HotelReservationWithRelations, HotelReservationFormData } from '@/types/production';
import { Button } from '@/components/aura/Button';
import { PageHeader } from '@/components/aura/PageHeader';
import { Input } from '@/components/aura/Input';
import { Modal } from '@/components/aura/Modal';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { DatePickerPopup } from '@/components/ui/pickers/DatePickerPopup';

export default function HotelsPage() {
  const { t } = useI18n();
  const { currentEvent } = useCurrentEvent();
  
  const [reservations, setReservations] = useState<HotelReservationWithRelations[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any | null>(null);
  const [formData, setFormData] = useState<Partial<HotelReservationFormData>>({
    number_of_rooms: 1,
    number_of_guests: 1
  });
  
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
      const [reservationsData, hotelsData, artistsData, contactsData] = await Promise.all([
        fetchReservationsByEvent(currentEvent.id),
        fetchAllHotels(),
        fetchAllArtists(),
        fetchCRMContacts()
      ]);
      setReservations(reservationsData);
      setHotels(hotelsData);
      setArtists(artistsData);
      setContacts(contactsData);
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (reservation?: any) => {
    if (reservation) {
      setEditingReservation(reservation);
      setFormData(reservation);
    } else {
      setEditingReservation(null);
      setFormData({
        number_of_rooms: 1,
        number_of_guests: 1
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReservation(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    if (!currentEvent?.id) return;
    try {
      if (editingReservation) {
        await updateReservation(editingReservation.id, formData);
      } else {
        await createReservation(currentEvent.id, formData as HotelReservationFormData);
      }
      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Error saving reservation:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReservation(deleteId);
      setDeleteId(null);
      loadData();
    } catch (error) {
      console.error('Error deleting reservation:', error);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await confirmReservation(id);
      loadData();
    } catch (error) {
      console.error('Error confirming reservation:', error);
    }
  };

  const filteredReservations = reservations.filter(res =>
    res.hotel_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.artist_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
        icon={Hotel}
        title="HÔTELS"
        actions={
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-1" />
            Nouvelle réservation
          </Button>
        }
      />

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher une réservation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredReservations.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          Aucune réservation trouvée
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hôtel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Personne</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Chambres/Pers</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReservations.map((res) => (
                <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{res.hotel_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {res.artist_name || res.contact_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(res.check_in_date).toLocaleDateString('fr-FR')} → {new Date(res.check_out_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {res.number_of_rooms} ch. / {res.number_of_guests} pers.
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      res.status === 'confirmed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : res.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {res.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    {res.status === 'pending' && (
                      <button
                        onClick={() => handleConfirm(res.id)}
                        className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        title="Confirmer"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenModal(res)}
                      className="p-1 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(res.id)}
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
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingReservation ? 'Modifier la réservation' : 'Nouvelle réservation'}
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Hôtel</label>
            <select
              value={formData.hotel_id || ''}
              onChange={(e) => setFormData({ ...formData, hotel_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Sélectionner...</option>
              {hotels.map(hotel => (
                <option key={hotel.id} value={hotel.id}>{hotel.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Personne</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!!formData.artist_id}
                  onChange={() => setFormData({ ...formData, artist_id: '', contact_id: undefined })}
                />
                <span className="text-sm">Artiste</span>
              </label>
              {formData.artist_id !== undefined && (
                <select
                  value={formData.artist_id || ''}
                  onChange={(e) => setFormData({ ...formData, artist_id: e.target.value, contact_id: undefined })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Sélectionner...</option>
                  {artists.map(artist => (
                    <option key={artist.id} value={artist.id}>{artist.name}</option>
                  ))}
                </select>
              )}
              
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!!formData.contact_id}
                  onChange={() => setFormData({ ...formData, contact_id: '', artist_id: undefined })}
                />
                <span className="text-sm">Contact</span>
              </label>
              {formData.contact_id !== undefined && (
                <select
                  value={formData.contact_id || ''}
                  onChange={(e) => setFormData({ ...formData, contact_id: e.target.value, artist_id: undefined })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Sélectionner...</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>{contact.first_name} {contact.last_name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePickerPopup
              label="Check-in"
              value={formData.check_in_date ? new Date(formData.check_in_date) : null}
              onChange={(date) => setFormData({ ...formData, check_in_date: date ? date.toISOString().split('T')[0] : '' })}
            />
            <DatePickerPopup
              label="Check-out"
              value={formData.check_out_date ? new Date(formData.check_out_date) : null}
              onChange={(date) => setFormData({ ...formData, check_out_date: date ? date.toISOString().split('T')[0] : '' })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Nombre de chambres</label>
              <Input
                type="number"
                min="1"
                value={formData.number_of_rooms || 1}
                onChange={(e) => setFormData({ ...formData, number_of_rooms: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Nombre de personnes</label>
              <Input
                type="number"
                min="1"
                value={formData.number_of_guests || 1}
                onChange={(e) => setFormData({ ...formData, number_of_guests: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="ghost" onClick={handleCloseModal}>Annuler</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!formData.check_in_date || !formData.check_out_date || (!formData.artist_id && !formData.contact_id)}
            >
              {editingReservation ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer la réservation"
        message="Êtes-vous sûr de vouloir supprimer cette réservation ? Cette action est irréversible."
        variant="danger"
      />
    </div>
  );
}
