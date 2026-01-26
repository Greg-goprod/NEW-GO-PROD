/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Search, Mail, Phone, Edit2, Trash2, FileText, CreditCard, Users } from 'lucide-react';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { PhoneInput } from '@/components/aura/PhoneInput';
import { Modal } from '@/components/aura/Modal';
import { ConfirmDialog } from '@/components/aura/ConfirmDialog';
import { Accordion } from '@/components/ui/Accordion';
import { useToast } from '@/components/aura/ToastProvider';
import { getCurrentCompanyId } from '@/lib/tenant';
import { supabase } from '@/lib/supabaseClient';
import { fetchCRMCompanies, createCRMCompany, updateCRMCompany, deleteCRMCompany } from '@/api/crmCompaniesApi';
import { useActiveCRMLookups } from '@/hooks/useCRMLookups';
import { ContactSelector } from '@/components/crm/ContactSelector';
import { CountrySpecificFields } from '@/components/crm/CountrySpecificFields';
import { fetchCompanyContactIds, linkCompanyToContacts } from '@/api/crmContactCompanyLinksApi';
import { formatPhoneNumber } from '@/utils/phoneUtils';
import { preloadMainCountriesFields } from '@/api/countryFieldsApi';
import type { CRMCompanyWithRelations, CRMCompanyInput } from '@/types/crm';

// Liste des pays ordonnée
const COUNTRIES = [
  { value: 'Suisse', label: 'Suisse' },
  { value: 'France', label: 'France' },
  { value: 'Royaume-Uni', label: 'Royaume-Uni' },
  { value: 'États-Unis', label: 'États-Unis' },
  { value: '---', label: '────────────', disabled: true },
  { value: 'Allemagne', label: 'Allemagne' },
  { value: 'Autriche', label: 'Autriche' },
  { value: 'Belgique', label: 'Belgique' },
  { value: 'Espagne', label: 'Espagne' },
  { value: 'Italie', label: 'Italie' },
  { value: 'Luxembourg', label: 'Luxembourg' },
  { value: 'Pays-Bas', label: 'Pays-Bas' },
  { value: 'Portugal', label: 'Portugal' },
  { value: '---2', label: '────────────', disabled: true },
  { value: 'Danemark', label: 'Danemark' },
  { value: 'Finlande', label: 'Finlande' },
  { value: 'Irlande', label: 'Irlande' },
  { value: 'Norvège', label: 'Norvège' },
  { value: 'Pologne', label: 'Pologne' },
  { value: 'République tchèque', label: 'République tchèque' },
  { value: 'Suède', label: 'Suède' },
];

// Mapping pays → code ISO pour champs spécifiques
const COUNTRY_TO_ISO: { [key: string]: string } = {
  'Suisse': 'CH',
  'France': 'FR',
  'Royaume-Uni': 'GB',
  'États-Unis': 'US',
  'Allemagne': 'DE',
  'Belgique': 'BE',
  'Espagne': 'ES',
  'Italie': 'IT',
  'Pays-Bas': 'NL',
  'Autriche': 'AT',
  'Portugal': 'PT',
  'Suède': 'SE',
  'Danemark': 'DK',
  'Norvège': 'NO',
  'Finlande': 'FI',
  'Irlande': 'IE',
  'Luxembourg': 'LU',
  'Pologne': 'PL',
  'République tchèque': 'CZ',
};

export default function EntreprisesPage() {
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
  const [companies, setCompanies] = useState<CRMCompanyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTypeId, setFilterTypeId] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string>('company_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CRMCompanyWithRelations | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; company: CRMCompanyWithRelations | null }>({
    open: false,
    company: null
  });
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  
  // Lookups
  const { lookups: companyTypes } = useActiveCRMLookups('company_types');

  // Formulaire
  const [formData, setFormData] = useState<Partial<CRMCompanyInput>>({
    company_name: '',
    company_type_id: undefined,
    is_supplier: false,
    is_client: false,
    status_label: 'actif',
    main_email: '',
    main_phone: '',
    website_url: '',
    address_line1: '',
    city: '',
    country: '',
    tax_id: '',
    notes_access: '',
    country_specific_data: {},
  });

  // Précharger les configurations de champs pays
  useEffect(() => {
    preloadMainCountriesFields();
  }, []);

  // Charger les sociétés
  const loadCompanies = useCallback(async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const data = await fetchCRMCompanies(companyId);
      setCompanies(data);
    } catch (err) {
      console.error('Erreur lors du chargement des sociétés:', err);
      toastError('Erreur lors du chargement des sociétés');
    } finally {
      setLoading(false);
    }
  }, [companyId, toastError]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Fonction de tri
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filtrer et trier les sociétés
  const filteredCompanies = companies
    .filter(company => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        company.company_name?.toLowerCase().includes(searchLower) ||
        company.main_email?.toLowerCase().includes(searchLower) ||
        company.city?.toLowerCase().includes(searchLower)
      );
      
      const matchesType = filterTypeId === 'all' || company.company_type_id === filterTypeId;
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      if (sortColumn === 'company_name') {
        aVal = a.company_name?.toLowerCase() || '';
        bVal = b.company_name?.toLowerCase() || '';
      } else if (sortColumn === 'type') {
        aVal = a.company_type?.label?.toLowerCase() || '';
        bVal = b.company_type?.label?.toLowerCase() || '';
      } else if (sortColumn === 'email') {
        aVal = a.main_email?.toLowerCase() || '';
        bVal = b.main_email?.toLowerCase() || '';
      } else if (sortColumn === 'location') {
        aVal = `${a.city || ''} ${a.country || ''}`.toLowerCase();
        bVal = `${b.city || ''} ${b.country || ''}`.toLowerCase();
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
    setEditingCompany(null);
    setFormData({
      company_name: '',
      company_type_id: undefined,
      is_supplier: false,
      is_client: false,
      status_label: 'actif',
      main_email: '',
      main_phone: '',
      website_url: '',
      address_line1: '',
      city: '',
      country: '',
      tax_id: '',
      notes_access: '',
      country_specific_data: {},
    });
    setSelectedContactIds([]);
    setIsModalOpen(true);
  };

  const handleEdit = async (company: CRMCompanyWithRelations) => {
    setEditingCompany(company);
    setFormData({
      company_name: company.company_name,
      company_type_id: company.company_type_id,
      is_supplier: company.is_supplier,
      is_client: company.is_client,
      status_label: company.status_label,
      main_email: company.main_email || '',
      main_phone: company.main_phone || '',
      website_url: company.website_url || '',
      address_line1: company.address_line1 || '',
      city: company.city || '',
      country: company.country || '',
      tax_id: company.tax_id || '',
      notes_access: company.notes_access || '',
      country_specific_data: company.country_specific_data || {},
    });
    
    // Charger les contacts associés
    try {
      const contactIds = await fetchCompanyContactIds(company.id);
      setSelectedContactIds(contactIds);
    } catch (err) {
      console.error('Erreur chargement contacts:', err);
      setSelectedContactIds([]);
    }
    
    setIsModalOpen(true);
  };

  // Sauvegarder
  const handleSave = async () => {
    if (!companyId || !formData.company_name) {
      toastError('Le nom de la société est obligatoire');
      return;
    }

    try {
      let companyCrmId: string;
      
      if (editingCompany) {
        await updateCRMCompany(editingCompany.id, formData);
        companyCrmId = editingCompany.id;
        success('Société mise à jour');
      } else {
        const newCompany = await createCRMCompany({ 
          ...formData, 
          company_id: companyId,
          is_supplier: formData.is_supplier || false,
          is_client: formData.is_client || false,
          status_label: formData.status_label || 'actif'
        } as CRMCompanyInput);
        companyCrmId = newCompany.id;
        success('Société créée');
      }
      
      // Sauvegarder les associations de contacts
      if (selectedContactIds.length > 0 || editingCompany) {
        await linkCompanyToContacts(companyCrmId, companyId, selectedContactIds);
      }
      
      setIsModalOpen(false);
      loadCompanies();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      toastError('Erreur lors de la sauvegarde');
    }
  };

  // Ouvrir le dialogue de confirmation de suppression
  const handleDeleteClick = (company: CRMCompanyWithRelations) => {
    setDeleteConfirm({ open: true, company });
  };

  // Confirmer la suppression
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.company) return;
    
    try {
      await deleteCRMCompany(deleteConfirm.company.id);
      success('Société supprimée avec succès');
      loadCompanies();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      toastError('Erreur lors de la suppression');
    }
  };

  return (
    <div className="p-6">
      {/* En-tête */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">ENTREPRISES</h1>
        </div>
        <Button variant="primary" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Ajouter une société
        </Button>
      </header>

      {/* Barre de recherche et filtres */}
      <div className="mb-6 space-y-4">
        {/* Ligne unique : recherche + filtre */}
        <div className="flex gap-4">
          {/* Barre de recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher une société..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtre Type de société */}
          <select
            value={filterTypeId}
            onChange={(e) => setFilterTypeId(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors min-w-[200px]"
          >
            <option value="all">Tous les types</option>
            {companyTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Badge compteur et réinitialisation */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {filteredCompanies.length} société{filteredCompanies.length > 1 ? 's' : ''}
          </span>
          {(searchTerm || filterTypeId !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterTypeId('all');
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
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || filterTypeId !== 'all' ? 'Aucune société trouvée' : 'Aucune société'}
          </p>
          {!searchTerm && filterTypeId === 'all' && (
            <Button variant="secondary" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" />
              Créer votre première société
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-violet-400 transition-colors select-none"
                  onClick={() => handleSort('company_name')}
                >
                  <div className="flex items-center gap-2">
                    Nom
                    <span className={sortColumn === 'company_name' ? 'text-violet-400' : 'text-gray-400 dark:text-gray-500'}>
                      {sortColumn === 'company_name' && sortDirection === 'asc' ? '▲' : '▼'}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-violet-400 transition-colors select-none"
                  onClick={() => handleSort('location')}
                >
                  <div className="flex items-center gap-2">
                    Localisation
                    <span className={sortColumn === 'location' ? 'text-violet-400' : 'text-gray-400 dark:text-gray-500'}>
                      {sortColumn === 'location' && sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCompanies.map((company) => (
                <tr 
                  key={company.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {company.company_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {company.company_type?.label || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {company.main_email && (
                        <div className="flex items-center mb-1">
                          <Mail className="w-3 h-3 mr-1" />
                          {company.main_email}
                        </div>
                      )}
                      {company.main_phone && (
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {formatPhoneNumber(company.main_phone)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {company.city && company.country ? `${company.city}, ${company.country}` : company.city || company.country || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      {company.is_supplier && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Fournisseur
                        </span>
                      )}
                      {company.is_client && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Client
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(company)}
                        className="p-1 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(company)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
        title={editingCompany ? 'Modifier la société' : 'Nouvelle société'}
        widthClass="max-w-6xl"
      >
        <div className="space-y-4">
          <Accordion
            defaultOpenId="general"
            className="space-y-2"
            items={[
              {
                id: 'general',
                title: (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-500" />
                    <span>Informations générales</span>
                  </div>
                ),
                content: (
                  <div className="space-y-4 pt-4">
                    {/* Ligne 1 : Nom, Type */}
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Nom de la société *"
                        value={formData.company_name || ''}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        placeholder="Acme Corp"
                      />
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Type de société
                        </label>
                        <select
                          value={formData.company_type_id || ''}
                          onChange={(e) => setFormData({ ...formData, company_type_id: e.target.value || undefined })}
                          className="h-[42px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        >
                          <option value="">-</option>
                          {companyTypes.map((type) => (
                            <option key={type.id} value={type.id}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Ligne 2 : Email, Site web, Téléphone */}
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Email"
                        type="email"
                        value={formData.main_email || ''}
                        onChange={(e) => setFormData({ ...formData, main_email: e.target.value })}
                        placeholder="contact@acme.com"
                      />
                      <Input
                        label="Site web"
                        value={formData.website_url || ''}
                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        placeholder="https://acme.com"
                      />
                      <PhoneInput
                        label="Téléphone"
                        value={formData.main_phone || ''}
                        onChange={(value) => setFormData({ ...formData, main_phone: value })}
                        placeholder="+41 21 123 45 67"
                        defaultCountry="CH"
                      />
                    </div>

                    {/* Ligne 3 : Adresse */}
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Adresse"
                        value={formData.address_line1 || ''}
                        onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                        placeholder="123 Rue de..."
                      />
                      <Input
                        label="Code postal"
                        value={formData.zip_code || ''}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                        placeholder="1200"
                      />
                      <Input
                        label="Ville"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Genève"
                      />
                    </div>

                    {/* Ligne 4 : Pays */}
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Pays
                      </label>
                      <select
                        value={formData.country || ''}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="h-[42px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner un pays</option>
                        {COUNTRIES.map((country) => (
                          <option 
                            key={country.value} 
                            value={country.value}
                            disabled={country.disabled}
                          >
                            {country.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Champs fiscaux spécifiques au pays (UID, SIRET, etc.) */}
                    {formData.country && (
                      <CountrySpecificFields
                        country={COUNTRY_TO_ISO[formData.country] || null}
                        data={formData.country_specific_data || {}}
                        onChange={(data) => setFormData({ ...formData, country_specific_data: data })}
                        showValidation={false}
                        filter="fiscal"
                        hideTitle
                      />
                    )}

                    {/* Tags */}
                    <div className="flex items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_supplier || false}
                          onChange={(e) => setFormData({ ...formData, is_supplier: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">Fournisseur</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_client || false}
                          onChange={(e) => setFormData({ ...formData, is_client: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">Client</span>
                      </label>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Notes d'accès
                      </label>
                      <textarea
                        value={formData.notes_access || ''}
                        onChange={(e) => setFormData({ ...formData, notes_access: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="Informations d'accès, parking, code porte..."
                      />
                    </div>
                  </div>
                )
              },
              {
                id: 'contacts',
                title: (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-500" />
                    <span>Contacts associés</span>
                  </div>
                ),
                content: (
                  <div className="pt-4">
                    {companyId && (
                      <ContactSelector
                        companyId={companyId}
                        selectedContactIds={selectedContactIds}
                        onChange={setSelectedContactIds}
                      />
                    )}
                  </div>
                )
              },
              {
                id: 'billing',
                title: (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-violet-500" />
                    <span>Facturation & Finance</span>
                  </div>
                ),
                content: (
                  <div className="space-y-4 pt-4">
                    {/* Nom facturation */}
                    <Input
                      label="Nom de facturation"
                      value={formData.billing_name || ''}
                      onChange={(e) => setFormData({ ...formData, billing_name: e.target.value })}
                      placeholder="Acme Corporation SA"
                    />

                    {/* Adresse facturation */}
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Adresse facturation"
                        value={formData.billing_address_line1 || ''}
                        onChange={(e) => setFormData({ ...formData, billing_address_line1: e.target.value })}
                        placeholder="456 Avenue..."
                      />
                      <Input
                        label="Code postal"
                        value={formData.billing_zip_code || ''}
                        onChange={(e) => setFormData({ ...formData, billing_zip_code: e.target.value })}
                        placeholder="1200"
                      />
                      <Input
                        label="Ville"
                        value={formData.billing_city || ''}
                        onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                        placeholder="Genève"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Pays facturation
                      </label>
                      <select
                        value={formData.billing_country || ''}
                        onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })}
                        className="h-[42px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner un pays</option>
                        {COUNTRIES.map((country) => (
                          <option 
                            key={country.value} 
                            value={country.value}
                            disabled={country.disabled}
                          >
                            {country.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Coordonnées bancaires */}
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="IBAN"
                        value={formData.iban || ''}
                        onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                        placeholder="CH93 0076 2011 6238 5295 7"
                      />
                      <Input
                        label="SWIFT/BIC"
                        value={formData.swift_bic || ''}
                        onChange={(e) => setFormData({ ...formData, swift_bic: e.target.value })}
                        placeholder="POFICHBEXXX"
                      />
                    </div>

                    {/* Autres infos finance */}
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Email finance"
                        type="email"
                        value={formData.finance_email || ''}
                        onChange={(e) => setFormData({ ...formData, finance_email: e.target.value })}
                        placeholder="compta@acme.com"
                      />
                      <Input
                        label="Conditions de paiement"
                        value={formData.payment_terms || ''}
                        onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                        placeholder="30 jours"
                      />
                      <Input
                        label="Devise préférée"
                        value={formData.currency_preferred || ''}
                        onChange={(e) => setFormData({ ...formData, currency_preferred: e.target.value })}
                        placeholder="CHF"
                      />
                    </div>

                    {/* Champs complémentaires spécifiques au pays (Canton, forme juridique, etc.) */}
                    {formData.country && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
                        <CountrySpecificFields
                          country={COUNTRY_TO_ISO[formData.country] || null}
                          data={formData.country_specific_data || {}}
                          onChange={(data) => setFormData({ ...formData, country_specific_data: data })}
                          showValidation={false}
                          filter="other"
                        />
                      </div>
                    )}
                  </div>
                )
              }
            ]}
          />

          {/* Boutons d'action */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingCompany ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dialogue de confirmation de suppression */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, company: null })}
        onConfirm={handleDeleteConfirm}
        title="Supprimer la société"
        message={`Êtes-vous sûr de vouloir supprimer la société "${deleteConfirm.company?.company_name}" ?\n\nCette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
}
