import { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Filter,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/aura/PageHeader';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/aura/Modal';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { PhoneInput } from '@/components/aura/PhoneInput';
import { formatPhoneNumber } from '@/utils/phoneUtils';
import { useToast } from '@/components/aura/ToastProvider';
import { useStaffVolunteers } from '@/hooks/useStaffVolunteers';
import {
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
} from '@/api/staffVolunteersApi';
import { useStaffLookups } from '@/hooks/useStaffLookups';
import type {
  StaffVolunteerWithRelations,
  StaffVolunteerInput,
} from '@/types/staff';

export default function StaffPage() {
  const { success, error: toastError } = useToast();

  // États
  const { volunteers, loading, load } = useStaffVolunteers();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] =
    useState<StaffVolunteerWithRelations | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    volunteer: StaffVolunteerWithRelations | null;
  }>({ open: false, volunteer: null });
  const [saving, setSaving] = useState(false);

  // Lookups
  const { statuses, departments, sectors } = useStaffLookups();

  // Formulaire
  const [formData, setFormData] = useState<Partial<StaffVolunteerInput>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status_id: undefined,
    department_ids: [],
    sector_ids: [],
    notes_internal: '',
    is_active: true,
  });

  // Filtrage local
  const filteredVolunteers = volunteers.filter((v) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      v.first_name?.toLowerCase().includes(term) ||
      v.last_name?.toLowerCase().includes(term) ||
      v.email?.toLowerCase().includes(term)
    );
  });

  // Handlers
  const handleAdd = () => {
    setEditingVolunteer(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      status_id: statuses[0]?.id,
      department_ids: [],
      sector_ids: [],
      notes_internal: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (volunteer: StaffVolunteerWithRelations) => {
    setEditingVolunteer(volunteer);
    setFormData({
      first_name: volunteer.first_name,
      last_name: volunteer.last_name,
      email: volunteer.email || '',
      phone: volunteer.phone || '',
      status_id: volunteer.status_id,
      department_ids: volunteer.department_ids || [],
      sector_ids: volunteer.sector_ids || [],
      notes_internal: volunteer.notes_internal || '',
      is_active: volunteer.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.status_id) {
      toastError('Le prénom, nom et statut sont obligatoires');
      return;
    }

    try {
      setSaving(true);

      if (editingVolunteer) {
        await updateVolunteer(editingVolunteer.id, formData);
        success('Bénévole mis à jour');
      } else {
        await createVolunteer(formData as StaffVolunteerInput);
        success('Bénévole créé');
      }

      setIsModalOpen(false);
      load();
    } catch (err: unknown) {
      console.error('Erreur sauvegarde bénévole:', err);
      toastError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (volunteer: StaffVolunteerWithRelations) => {
    setDeleteConfirm({ open: true, volunteer });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.volunteer) return;

    try {
      await deleteVolunteer(deleteConfirm.volunteer.id);
      success('Bénévole supprimé');
      setDeleteConfirm({ open: false, volunteer: null });
      load();
    } catch (err: unknown) {
      console.error('Erreur suppression bénévole:', err);
      toastError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="p-6">
      {/* En-tête */}
      <PageHeader
        icon={Users}
        title="STAFF BENEVOLES"
        actions={
          <Button variant="primary" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un bénévole
          </Button>
        }
      />

      {/* Barre de recherche & filtres */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher par nom, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="secondary">
          <Filter className="w-4 h-4 mr-2" />
          Filtres
        </Button>
        <Button variant="secondary">
          <Download className="w-4 h-4 mr-2" />
          Exporter
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total bénévoles
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {volunteers.length}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Actifs</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {volunteers.filter((v) => v.is_active).length}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Départements
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {departments.length}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Secteurs
          </p>
          <p className="text-2xl font-bold text-violet-600 mt-1">
            {sectors.length}
          </p>
        </div>
      </div>

      {/* Liste bénévoles */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      ) : filteredVolunteers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm
              ? 'Aucun bénévole trouvé'
              : 'Aucun bénévole enregistré'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Départements
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  État
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredVolunteers.map((volunteer) => (
                <tr
                  key={volunteer.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-violet-600 dark:text-violet-300 font-semibold">
                        {volunteer.first_name[0]}
                        {volunteer.last_name[0]}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {volunteer.first_name} {volunteer.last_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-300">
                      {volunteer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          {volunteer.email}
                        </div>
                      )}
                      {volunteer.phone && (
                        <div className="flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {formatPhoneNumber(volunteer.phone)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {volunteer.status && (
                      <span 
                        className="px-2 py-1 text-xs font-medium rounded-full"
                        style={{
                          backgroundColor: `${volunteer.status.color}20`,
                          color: volunteer.status.color,
                        }}
                      >
                        {volunteer.status.name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {volunteer.departments?.slice(0, 2).map((dept) => (
                        <span
                          key={dept.id}
                          className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        >
                          {dept.name}
                        </span>
                      ))}
                      {(volunteer.departments?.length || 0) > 2 && (
                        <span className="text-xs text-gray-500">
                          +{(volunteer.departments?.length || 0) - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      {volunteer.is_active ? (
                        <span className="text-green-600 dark:text-green-400">●</span>
                      ) : (
                        <span className="text-gray-400">●</span>
                      )}
                      <span>{volunteer.is_active ? 'Actif' : 'Inactif'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(volunteer)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(volunteer)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal CRUD Bénévole */}
      <Modal
        open={isModalOpen}
        onClose={() => !saving && setIsModalOpen(false)}
        title={
          editingVolunteer ? 'Modifier le bénévole' : 'Nouveau bénévole'
        }
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom *"
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              disabled={saving}
            />
            <Input
              label="Nom *"
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              disabled={saving}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            disabled={saving}
          />

          <PhoneInput
            label="Téléphone"
            value={formData.phone || ''}
            onChange={(value) =>
              setFormData({ ...formData, phone: value })
            }
            disabled={saving}
            defaultCountry="CH"
            placeholder="+41 79 123 45 67"
          />

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
              Statut
            </label>
            <select
              value={formData.status_id || ''}
              onChange={(e) =>
                setFormData({ ...formData, status_id: e.target.value })
              }
              disabled={saving}
              className="input w-full"
            >
              <option value="">Sélectionner un statut</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
              Notes internes
            </label>
            <textarea
              value={formData.notes_internal || ''}
              onChange={(e) =>
                setFormData({ ...formData, notes_internal: e.target.value })
              }
              disabled={saving}
              rows={3}
              className="input w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              disabled={saving}
              className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-600 dark:text-gray-400">
              Bénévole actif
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsModalOpen(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving
              ? 'Enregistrement...'
              : editingVolunteer
              ? 'Mettre à jour'
              : 'Créer'}
          </Button>
        </div>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, volunteer: null })}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le bénévole"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm.volunteer?.first_name} ${deleteConfirm.volunteer?.last_name}" ?\n\nCette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
}
