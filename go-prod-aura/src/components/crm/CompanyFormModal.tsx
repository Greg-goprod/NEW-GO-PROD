/**
 * Modal de création/édition de société CRM
 * Composant réutilisable pour créer ou modifier une entreprise
 * Peut être utilisé par-dessus d'autres modals (zIndex configurable)
 */

import { useState, useEffect, useCallback } from 'react';
import { FileText, CreditCard } from 'lucide-react';
import { Modal } from '@/components/aura/Modal';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { PhoneInput } from '@/components/aura/PhoneInput';
import { Accordion } from '@/components/ui/Accordion';
import { CountrySpecificFields } from '@/components/crm/CountrySpecificFields';
import { useActiveCRMLookups } from '@/hooks/useCRMLookups';
import { createCRMCompany, updateCRMCompany } from '@/api/crmCompaniesApi';
import { useToast } from '@/components/aura/ToastProvider';
import type { CRMCompanyInput, CRMLookup } from '@/types/crm';

// Liste des pays ordonnée
const COUNTRIES = [
  { value: 'Suisse', label: 'Suisse' },
  { value: 'France', label: 'France' },
  { value: 'Royaume-Uni', label: 'Royaume-Uni' },
  { value: 'États-Unis', label: 'États-Unis' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Australie', label: 'Australie' },
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
  'Canada': 'CA',
  'Australie': 'AU',
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

export interface CompanyFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Callback appelé après création/mise à jour réussie */
  onSuccess?: (companyId: string, companyName: string) => void;
  /** Données pré-remplies pour le formulaire */
  prefillData?: Partial<CRMCompanyInput> | null;
  /** ID de l'entreprise à éditer (si mode édition) */
  editingCompanyId?: string | null;
  /** ID du tenant */
  companyId: string;
  /** zIndex du modal (défaut: 600 pour passer au-dessus d'autres modals) */
  zIndex?: number;
}

export function CompanyFormModal({
  open,
  onClose,
  onSuccess,
  prefillData,
  editingCompanyId,
  companyId,
  zIndex = 600,
}: CompanyFormModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const { lookups: companyTypes } = useActiveCRMLookups('company_types');
  
  const isEdit = !!editingCompanyId;
  
  // État du formulaire
  const [formData, setFormData] = useState<Partial<CRMCompanyInput>>({
    company_name: '',
    is_supplier: true,
    is_client: false,
  });
  const [saving, setSaving] = useState(false);

  // Initialiser le formulaire avec les données pré-remplies
  useEffect(() => {
    if (open) {
      if (prefillData) {
        setFormData({
          company_name: '',
          is_supplier: true,
          is_client: false,
          ...prefillData,
        });
      } else {
        setFormData({
          company_name: '',
          is_supplier: true,
          is_client: false,
        });
      }
    }
  }, [open, prefillData]);

  // Sauvegarder
  const handleSave = useCallback(async () => {
    if (!formData.company_name?.trim()) {
      toastError('Le nom de la société est requis');
      return;
    }

    setSaving(true);
    try {
      const dataToSave: CRMCompanyInput = {
        company_id: companyId,
        company_name: formData.company_name.trim(),
        brand_name: formData.brand_name || undefined,
        company_type_id: formData.company_type_id || undefined,
        is_supplier: formData.is_supplier ?? true,
        is_client: formData.is_client ?? false,
        status_label: formData.status_label || 'actif',
        main_phone: formData.main_phone || undefined,
        main_email: formData.main_email || undefined,
        website_url: formData.website_url || undefined,
        address_line1: formData.address_line1 || undefined,
        address_line2: formData.address_line2 || undefined,
        zip_code: formData.zip_code || undefined,
        city: formData.city || undefined,
        country: formData.country || undefined,
        notes_access: formData.notes_access || undefined,
        billing_name: formData.billing_name || undefined,
        billing_address_line1: formData.billing_address_line1 || undefined,
        billing_address_line2: formData.billing_address_line2 || undefined,
        billing_zip_code: formData.billing_zip_code || undefined,
        billing_city: formData.billing_city || undefined,
        billing_country: formData.billing_country || undefined,
        tax_id: formData.tax_id || undefined,
        registration_number: formData.registration_number || undefined,
        payment_terms: formData.payment_terms || undefined,
        currency_preferred: formData.currency_preferred || undefined,
        iban: formData.iban || undefined,
        swift_bic: formData.swift_bic || undefined,
        finance_email: formData.finance_email || undefined,
        country_specific_data: formData.country_specific_data || undefined,
      };

      let resultId: string;
      
      if (isEdit && editingCompanyId) {
        await updateCRMCompany(editingCompanyId, dataToSave);
        resultId = editingCompanyId;
        toastSuccess('Société mise à jour');
      } else {
        const result = await createCRMCompany(dataToSave);
        resultId = result.id;
        toastSuccess('Société créée');
      }

      onSuccess?.(resultId, dataToSave.company_name);
      onClose();
    } catch (e: any) {
      toastError(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [formData, companyId, isEdit, editingCompanyId, onSuccess, onClose, toastSuccess, toastError]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier la société' : 'Nouvelle société'}
      size="xl"
      zIndex={zIndex}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
          </Button>
        </>
      }
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
                    />
                    <div className="flex flex-col">
                      <label className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        Type de société
                      </label>
                      <select
                        value={formData.company_type_id || ''}
                        onChange={(e) => setFormData({ ...formData, company_type_id: e.target.value || undefined })}
                        className="input"
                      >
                        <option value="">-</option>
                        {(companyTypes || []).map((type: CRMLookup) => (
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
                    />
                    <Input
                      label="Site web"
                      value={formData.website_url || ''}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    />
                    <PhoneInput
                      label="Téléphone"
                      value={formData.main_phone || ''}
                      onChange={(value) => setFormData({ ...formData, main_phone: value })}
                      defaultCountry={formData.country ? COUNTRY_TO_ISO[formData.country] as any : 'CH'}
                    />
                  </div>

                  {/* Ligne 3 : Adresse */}
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="Adresse"
                      value={formData.address_line1 || ''}
                      onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    />
                    <Input
                      label="Code postal"
                      value={formData.zip_code || ''}
                      onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    />
                    <Input
                      label="Ville"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  {/* Ligne 4 : Pays */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      Pays
                    </label>
                    <select
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="input"
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

                  {/* Champs fiscaux spécifiques au pays */}
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
                  />

                  {/* Adresse facturation */}
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="Adresse facturation"
                      value={formData.billing_address_line1 || ''}
                      onChange={(e) => setFormData({ ...formData, billing_address_line1: e.target.value })}
                    />
                    <Input
                      label="Code postal"
                      value={formData.billing_zip_code || ''}
                      onChange={(e) => setFormData({ ...formData, billing_zip_code: e.target.value })}
                    />
                    <Input
                      label="Ville"
                      value={formData.billing_city || ''}
                      onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      Pays facturation
                    </label>
                    <select
                      value={formData.billing_country || ''}
                      onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })}
                      className="input"
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
                    />
                    <Input
                      label="SWIFT/BIC"
                      value={formData.swift_bic || ''}
                      onChange={(e) => setFormData({ ...formData, swift_bic: e.target.value })}
                    />
                  </div>

                  {/* Autres infos finance */}
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="Email finance"
                      type="email"
                      value={formData.finance_email || ''}
                      onChange={(e) => setFormData({ ...formData, finance_email: e.target.value })}
                    />
                    <Input
                      label="Conditions de paiement"
                      value={formData.payment_terms || ''}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    />
                    <Input
                      label="Devise préférée"
                      value={formData.currency_preferred || ''}
                      onChange={(e) => setFormData({ ...formData, currency_preferred: e.target.value })}
                    />
                  </div>

                  {/* Champs complémentaires spécifiques au pays */}
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
      </div>
    </Modal>
  );
}

export default CompanyFormModal;
