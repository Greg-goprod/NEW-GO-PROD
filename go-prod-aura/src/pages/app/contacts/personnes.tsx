/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Mail, Phone, Building2, Edit2, Trash2, List, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { PhoneInput } from '@/components/aura/PhoneInput';
import { Modal } from '@/components/aura/Modal';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { useToast } from '@/components/aura/ToastProvider';
import { getCurrentCompanyId } from '@/lib/tenant';
import { supabase } from '@/lib/supabaseClient';
import { fetchContacts, createContact, updateContact, deleteContact } from '@/api/crmContactsApi';
import { PhotoUploader } from '@/components/crm/PhotoUploader';
import { ArtistSelector } from '@/components/crm/ArtistSelector';
import { CompanySelector } from '@/components/crm/CompanySelector';
import { RoleSelector } from '@/components/crm/RoleSelector';
import { ContactDetailsModal } from '@/components/crm/ContactDetailsModal';
import { fetchContactArtists, linkContactToArtists } from '@/api/artistsApi';
import { fetchContactCompanyIds, linkContactToCompanies } from '@/api/crmContactCompanyLinksApi';
import { fetchContactRoleIds, linkContactToRoles } from '@/api/crmContactRoleLinksApi';
import { fetchDepartments } from '@/api/crmLookupsApi';
import { formatPhoneNumber, getWhatsAppLink } from '@/utils/phoneUtils';
import type { CRMContactWithRelations, CRMContactInput, Department } from '@/types/crm';

export default function PersonnesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Charger le companyId au démarrage
  useEffect(() => {
    (async () => {
      const cid = await getCurrentCompanyId(supabase);
      setCompanyId(cid);
    })();
  }, []);
  const { success, error: toastError } = useToast();
  
  // États
  const [contacts, setContacts] = useState<CRMContactWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CRMContactWithRelations | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; contact: CRMContactWithRelations | null }>({
    open: false,
    contact: null
  });
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedContactForDetails, setSelectedContactForDetails] = useState<CRMContactWithRelations | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('last_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  // Formulaire
  const [formData, setFormData] = useState<Partial<CRMContactInput>>({
    first_name: '',
    last_name: '',
    email_primary: '',
    phone_mobile: '',
    linkedin_url: '',
    notes_internal: '',
    is_primary_for_company_billing: false,
    is_night_contact: false,
    is_signatory: false,
    is_internal: false,
    photo_url: undefined,
  });
  
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Charger les départements
  useEffect(() => {
    if (!companyId) return;
    fetchDepartments(companyId).then(setDepartments).catch(console.error);
  }, [companyId]);

  // Charger les contacts
  const loadContacts = useCallback(async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const data = await fetchContacts(companyId);
      setContacts(data);
    } catch (err) {
      console.error('Erreur lors du chargement des contacts:', err);
      toastError('Erreur lors du chargement des contacts');
    } finally {
      setLoading(false);
    }
  }, [companyId, toastError]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Fonction de tri
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Extraire les fonctions (roles) et entreprises uniques pour les filtres
  const availableRoles = Array.from(
    new Set(
      contacts.flatMap(contact => 
        contact.roles?.map(role => JSON.stringify({ id: role.id, label: role.label })) || []
      )
    )
  ).map(str => JSON.parse(str));

  const availableCompanies = Array.from(
    new Set(
      contacts.flatMap(contact => {
        const companies: string[] = [];
        // Ajouter l'entreprise principale
        if (contact.main_company) {
          companies.push(JSON.stringify({ id: contact.main_company.id, name: contact.main_company.company_name }));
        }
        // Ajouter les entreprises liées
        if (contact.linked_companies) {
          contact.linked_companies.forEach((company: any) => {
            companies.push(JSON.stringify({ id: company.id, name: company.company_name }));
          });
        }
        return companies;
      })
    )
  ).map(str => JSON.parse(str));

  // Filtrer et trier les contacts
  const filteredContacts = contacts
    .filter(contact => {
      // Filtre par recherche textuelle
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        contact.first_name?.toLowerCase().includes(searchLower) ||
        contact.last_name?.toLowerCase().includes(searchLower) ||
        contact.email_primary?.toLowerCase().includes(searchLower) ||
        contact.phone_mobile?.toLowerCase().includes(searchLower)
      );

      // Filtre par fonction (role)
      const matchesRole = roleFilter === 'all' || 
        contact.roles?.some(role => role.id === roleFilter);

      // Filtre par entreprise (main_company ou linked_companies)
      const matchesCompany = companyFilter === 'all' || 
        contact.main_company?.id === companyFilter ||
        contact.linked_companies?.some((company: any) => company.id === companyFilter);

      return matchesSearch && matchesRole && matchesCompany;
    })
    .sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      if (sortColumn === 'name') {
        aVal = `${a.last_name} ${a.first_name}`.toLowerCase();
        bVal = `${b.last_name} ${b.first_name}`.toLowerCase();
      } else if (sortColumn === 'email') {
        aVal = a.email_primary?.toLowerCase() || '';
        bVal = b.email_primary?.toLowerCase() || '';
      } else if (sortColumn === 'phone') {
        aVal = a.phone_mobile || '';
        bVal = b.phone_mobile || '';
      } else if (sortColumn === 'company') {
        // Tri par nom de l'entreprise principale ou première entreprise liée
        const aCompany = a.main_company?.company_name || a.linked_companies?.[0]?.company_name || '';
        const bCompany = b.main_company?.company_name || b.linked_companies?.[0]?.company_name || '';
        aVal = aCompany.toLowerCase();
        bVal = bCompany.toLowerCase();
      } else if (sortColumn === 'department') {
        // Tri par nom du département
        aVal = (a.department?.label || '').toLowerCase();
        bVal = (b.department?.label || '').toLowerCase();
      } else if (sortColumn === 'type') {
        // Tri par type (interne/externe) - internes en premier si asc
        aVal = a.is_internal ? 'a' : 'b';
        bVal = b.is_internal ? 'a' : 'b';
      } else {
        aVal = (a as any)[sortColumn] || '';
        bVal = (b as any)[sortColumn] || '';
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Ouvrir le modal
  const handleAdd = () => {
    setEditingContact(null);
    setFormData({
      first_name: '',
      last_name: '',
      email_primary: '',
      phone_mobile: '',
      department_id: undefined,
      seniority_level_id: undefined,
      status_id: undefined,
      linkedin_url: '',
      notes_internal: '',
      is_primary_for_company_billing: false,
      is_night_contact: false,
      is_signatory: false,
      is_internal: false,
      photo_url: undefined,
    });
    setSelectedArtistIds([]);
    setSelectedCompanyIds([]);
    setSelectedRoleIds([]);
    setIsModalOpen(true);
  };

  const handleEdit = async (contact: CRMContactWithRelations) => {
    setEditingContact(contact);
    setFormData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email_primary: contact.email_primary || '',
      phone_mobile: contact.phone_mobile || '',
      department_id: contact.department_id,
      seniority_level_id: contact.seniority_level_id,
      status_id: contact.status_id,
      linkedin_url: contact.linkedin_url || '',
      notes_internal: contact.notes_internal || '',
      is_primary_for_company_billing: contact.is_primary_for_company_billing,
      is_night_contact: contact.is_night_contact,
      is_signatory: contact.is_signatory,
      is_internal: contact.is_internal,
      photo_url: contact.photo_url || undefined,
    });
    
    // Charger les artistes associés
    try {
      const artists = await fetchContactArtists(contact.id);
      setSelectedArtistIds(artists.map(a => a.id));
    } catch (err) {
      console.error('Erreur chargement artistes:', err);
      setSelectedArtistIds([]);
    }
    
    // Charger les entreprises associées
    try {
      const companyIds = await fetchContactCompanyIds(contact.id);
      setSelectedCompanyIds(companyIds);
    } catch (err) {
      console.error('Erreur chargement entreprises:', err);
      setSelectedCompanyIds([]);
    }
    
    // Charger les rôles associés
    try {
      const roleIds = await fetchContactRoleIds(contact.id);
      setSelectedRoleIds(roleIds);
    } catch (err) {
      console.error('Erreur chargement rôles:', err);
      setSelectedRoleIds([]);
    }
    
    setIsModalOpen(true);
  };

  // Sauvegarder
  const handleSave = async () => {
    if (!companyId || !formData.first_name || !formData.last_name) {
      toastError('Le prénom et le nom sont obligatoires');
      return;
    }

    try {
      let contactId: string;
      
      if (editingContact) {
        await updateContact(editingContact.id, formData);
        contactId = editingContact.id;
        success('Contact mis à jour');
      } else {
        const newContact = await createContact({ ...formData, company_id: companyId } as CRMContactInput);
        contactId = newContact.id;
        success('Contact créé');
      }
      
      // Sauvegarder les associations d'artistes
      if (selectedArtistIds.length > 0 || editingContact) {
        await linkContactToArtists(contactId, companyId, selectedArtistIds);
      }
      
      // Sauvegarder les associations d'entreprises
      if (selectedCompanyIds.length > 0 || editingContact) {
        await linkContactToCompanies(contactId, companyId, selectedCompanyIds);
      }
      
      // Sauvegarder les associations de rôles
      if (selectedRoleIds.length > 0 || editingContact) {
        await linkContactToRoles(contactId, companyId, selectedRoleIds);
      }
      
      setIsModalOpen(false);
      loadContacts();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      toastError('Erreur lors de la sauvegarde');
    }
  };

  // Ouvrir le dialogue de confirmation de suppression
  const handleDeleteClick = (contact: CRMContactWithRelations) => {
    setDeleteConfirm({ open: true, contact });
  };

  // Ouvrir le modal de détails du contact
  const handleShowContactDetails = (contact: CRMContactWithRelations) => {
    setSelectedContactForDetails(contact);
    setDetailsModalOpen(true);
  };

  // Confirmer la suppression
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.contact) return;
    
    try {
      await deleteContact(deleteConfirm.contact.id);
      success('Contact supprimé avec succès');
      loadContacts();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      toastError('Erreur lors de la suppression');
    }
  };

  // Générer les initiales d'un contact
  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.trim() || '';
    const last = lastName?.trim() || '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '??';
  };
  
  return (
    <div className="p-6">
      {/* En-tête */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">PERSONNES</h1>
        </div>
        <Button variant="primary" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Ajouter un contact
        </Button>
      </header>

      {/* Barre de recherche et filtres */}
      <div className="mb-6 space-y-4">
        {/* Ligne unique : recherche + filtres + toggle vue */}
        <div className="flex gap-4">
          {/* Barre de recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtre par fonction */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors min-w-[200px]"
          >
            <option value="all">Toutes les fonctions</option>
            {availableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>

          {/* Filtre par entreprise */}
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors min-w-[200px]"
          >
            <option value="all">Toutes les entreprises</option>
            {availableCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          
          {/* Toggle vue liste/grille */}
          <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 shadow">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-violet-500 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Vue liste"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-violet-500 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Vue grille"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Badge compteur et réinitialisation */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {filteredContacts.length} contact{filteredContacts.length > 1 ? 's' : ''}
          </span>
          {(roleFilter !== 'all' || companyFilter !== 'all') && (
            <button
              onClick={() => {
                setRoleFilter('all');
                setCompanyFilter('all');
              }}
              className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium whitespace-nowrap"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <p className="text-center text-gray-500 py-8">Chargement...</p>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Aucun contact trouvé' : 'Aucun contact'}
          </p>
          {!searchTerm && (
            <Button variant="secondary" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" />
              Créer votre premier contact
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Vue Grille */
        <div className="grid grid-cols-4 gap-4">
          {filteredContacts.map((contact) => {
            const whatsappLink = getWhatsAppLink(contact.phone_mobile);
            
            return (
              <div
                key={contact.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-4 flex flex-col items-center text-center relative group"
              >
                {/* Actions en hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={() => handleEdit(contact)}
                    className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(contact)}
                    className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Photo ou initiales */}
                <div 
                  className="mb-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleShowContactDetails(contact)}
                  title="Voir les détails"
                >
                  {contact.photo_url ? (
                    <img
                      src={contact.photo_url}
                      alt={`${contact.first_name} ${contact.last_name}`}
                      className="w-16 h-16 rounded-full object-cover border-2 border-violet-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg border-2 border-violet-500">
                      {getInitials(contact.first_name, contact.last_name)}
                    </div>
                  )}
                </div>

                {/* Nom */}
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {contact.first_name} {contact.last_name}
                </h3>

                {/* Fonction(s) / Rôle(s) */}
                {contact.roles && contact.roles.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mb-2">
                    {contact.roles.map((role) => (
                      <span key={role.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200">
                        {role.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Société */}
                {contact.main_company && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <Building2 className="w-3 h-3" />
                    <span className="truncate">{contact.main_company.company_name}</span>
                  </div>
                )}

                {/* Téléphone et Email sur la même ligne */}
                <div className="w-full space-y-2">
                  {/* Ligne : Téléphone + Email */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Téléphone */}
                    {contact.phone_mobile ? (
                      whatsappLink ? (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors py-1.5 px-2 bg-green-50 dark:bg-green-900/20 rounded hover:bg-green-100 dark:hover:bg-green-900/30"
                          title="Ouvrir dans WhatsApp"
                        >
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{formatPhoneNumber(contact.phone_mobile)}</span>
                        </a>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-xs text-gray-600 dark:text-gray-400 py-1.5 px-2">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{formatPhoneNumber(contact.phone_mobile)}</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 py-1.5">
                        <Phone className="w-3 h-3" />
                      </div>
                    )}

                    {/* Email */}
                    {contact.email_primary ? (
                      <a
                        href={`mailto:${contact.email_primary}`}
                        className="flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors py-1.5 px-2 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        title="Envoyer un email"
                      >
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{contact.email_primary}</span>
                      </a>
                    ) : (
                      <div className="flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 py-1.5">
                        <Mail className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vue Liste */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                  Photo
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-violet-400 transition-colors select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Nom
                    <span className={sortColumn === 'name' ? 'text-violet-400' : 'text-gray-400 dark:text-gray-500'}>
                      {sortColumn === 'name' && sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-violet-400 transition-colors select-none"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-2">
                    Type
                    <span className={sortColumn === 'type' ? 'text-violet-400' : 'text-gray-400 dark:text-gray-500'}>
                      {sortColumn === 'type' && sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-violet-400 transition-colors select-none"
                  onClick={() => handleSort('department')}
                >
                  <div className="flex items-center gap-2">
                    Département
                    <span className={sortColumn === 'department' ? 'text-violet-400' : 'text-gray-400 dark:text-gray-500'}>
                      {sortColumn === 'department' && sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fonction
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-violet-400 transition-colors select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-2">
                    Email
                    <span className={sortColumn === 'email' ? 'text-violet-400' : 'text-gray-400 dark:text-gray-500'}>
                      {sortColumn === 'email' && sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-violet-400 transition-colors select-none"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center gap-2">
                    Téléphone
                    <span className={sortColumn === 'phone' ? 'text-violet-400' : 'text-gray-400 dark:text-gray-500'}>
                      {sortColumn === 'phone' && sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-violet-400 transition-colors select-none"
                  onClick={() => handleSort('company')}
                >
                  <div className="flex items-center gap-2">
                    Entreprises
                    <span className={sortColumn === 'company' ? 'text-violet-400' : 'text-gray-400 dark:text-gray-500'}>
                      {sortColumn === 'company' && sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredContacts.map((contact) => (
                <tr 
                  key={contact.id} 
                  style={{ transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover-row)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  {/* Photo */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div 
                      className="cursor-pointer hover:opacity-80 transition-opacity inline-block"
                      onClick={() => handleShowContactDetails(contact)}
                      title="Voir les détails"
                    >
                      {contact.photo_url ? (
                        <img
                          src={contact.photo_url}
                          alt={`${contact.first_name} ${contact.last_name}`}
                          className="w-10 h-10 rounded-full object-cover border border-violet-500"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm border border-violet-500">
                          {getInitials(contact.first_name, contact.last_name)}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Nom */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {contact.first_name} {contact.last_name}
                    </div>
                  </td>
                  
                  {/* Type */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      contact.is_internal 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {contact.is_internal ? 'Interne' : 'Externe'}
                    </span>
                  </td>
                  
                  {/* Département */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {contact.department?.label || '-'}
                    </div>
                  </td>
                  
                  {/* Fonction */}
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {contact.roles && contact.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contact.roles.map((role) => (
                            <span key={role.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200">
                              {role.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      {contact.email_primary && (
                        <>
                          <Mail className="w-4 h-4 mr-1" />
                          {contact.email_primary}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      {contact.phone_mobile && (
                        <>
                          <Phone className="w-4 h-4 mr-1" />
                          {formatPhoneNumber(contact.phone_mobile)}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {(contact.main_company || (contact.linked_companies && contact.linked_companies.length > 0)) ? (
                        <div className="flex flex-wrap gap-1">
                          {contact.main_company && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              <Building2 className="w-3 h-3" />
                              {contact.main_company.company_name}
                            </span>
                          )}
                          {contact.linked_companies?.map((company) => (
                            <span key={company.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              <Building2 className="w-3 h-3" />
                              {company.company_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(contact)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(contact)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de création/édition */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContact ? 'Modifier le contact' : 'Nouveau contact'}
      >
        <div className="space-y-4">
          {/* Ligne 1 : Prénom, Nom, Email */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Prénom *"
              value={formData.first_name || ''}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="Jean"
            />
            <Input
              label="Nom *"
              value={formData.last_name || ''}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Dupont"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email_primary || ''}
              onChange={(e) => setFormData({ ...formData, email_primary: e.target.value })}
              placeholder="jean@example.com"
            />
          </div>

          {/* Ligne 2 : Département, Fonction */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Département
              </label>
              <select
                value={formData.department_id || ''}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value || undefined })}
                className="w-full h-[42px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="">-</option>
                {departments.filter(d => d.active).map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>
            {companyId && (
              <RoleSelector
                companyId={companyId}
                selectedRoleIds={selectedRoleIds}
                onChange={setSelectedRoleIds}
              />
            )}
          </div>

          {/* Ligne 3 : Type de contact + Options */}
          <div className="flex items-center gap-6 flex-wrap">
            {/* Type de contact (radio buttons) */}
            <div className="flex items-center gap-4 pr-4 border-r border-gray-300 dark:border-gray-600">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type :</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contact_type"
                  checked={formData.is_internal === false}
                  onChange={() => setFormData({ ...formData, is_internal: false })}
                  className="w-4 h-4 border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Externe</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contact_type"
                  checked={formData.is_internal === true}
                  onChange={() => setFormData({ ...formData, is_internal: true })}
                  className="w-4 h-4 border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Interne</span>
              </label>
            </div>

            {/* Options (checkboxes) */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_night_contact || false}
                onChange={(e) => setFormData({ ...formData, is_night_contact: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-gray-900 dark:text-gray-100">Contact de nuit</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_primary_for_company_billing || false}
                onChange={(e) => setFormData({ ...formData, is_primary_for_company_billing: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-gray-900 dark:text-gray-100">Contact facturation</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_signatory || false}
                onChange={(e) => setFormData({ ...formData, is_signatory: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-gray-900 dark:text-gray-100">Signataire</span>
            </label>
          </div>

          {/* Ligne 4 : Téléphone, LinkedIn */}
          <div className="grid grid-cols-2 gap-3">
            <PhoneInput
              label="Téléphone"
              value={formData.phone_mobile || ''}
              onChange={(value) => setFormData({ ...formData, phone_mobile: value })}
              placeholder="+41 79 123 45 67"
              defaultCountry="CH"
            />
            <Input
              label="LinkedIn"
              value={formData.linkedin_url || ''}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          {/* Ligne 4 : Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Notes internes
            </label>
            <textarea
              value={formData.notes_internal || ''}
              onChange={(e) => setFormData({ ...formData, notes_internal: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Notes internes..."
            />
          </div>

          {/* Ligne 7 : Entreprises et Artistes */}
          {companyId && (
            <div className="grid grid-cols-2 gap-4">
              <CompanySelector
                companyId={companyId}
                selectedCompanyIds={selectedCompanyIds}
                onChange={setSelectedCompanyIds}
              />
              <ArtistSelector
                companyId={companyId}
                selectedArtistIds={selectedArtistIds}
                onChange={setSelectedArtistIds}
              />
            </div>
          )}

          {/* Ligne 8 : Photo centrée */}
          <div className="flex justify-center pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="w-64">
              <PhotoUploader
                currentPhotoUrl={formData.photo_url}
                onPhotoChange={(url) => setFormData({ ...formData, photo_url: url || undefined })}
                contactId={editingContact?.id}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingContact ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dialogue de confirmation de suppression */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, contact: null })}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le contact"
        message={`Êtes-vous sûr de vouloir supprimer le contact "${deleteConfirm.contact?.first_name} ${deleteConfirm.contact?.last_name}" ?\n\nCette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />

      {/* Modal de détails du contact */}
      <ContactDetailsModal
        contact={selectedContactForDetails}
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedContactForDetails(null);
        }}
      />
    </div>
  );
}
