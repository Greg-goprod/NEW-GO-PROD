/**
 * Composant dynamique pour afficher les champs spécifiques à un pays
 * S'adapte automatiquement au pays sélectionné
 */

import { useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/aura/Input';
import { fetchCountryFields, validateCountryData } from '@/api/countryFieldsApi';
import type { CountryFieldConfig } from '@/types/countryFields';
import { AlertCircle } from 'lucide-react';

// Champs fiscaux/identification par pays (premier champ = numéro d'identification fiscale)
const FISCAL_FIELDS: { [countryCode: string]: string[] } = {
  CH: ['uid'],           // Numéro UID suisse
  FR: ['siret', 'siren'], // SIRET et SIREN français
  GB: ['company_number', 'vat_number'], // Company Number et VAT UK
  US: ['ein'],           // EIN américain
  DE: ['handelsregister', 'ust_idnr', 'steuernummer'], // Numéros allemands
  BE: ['enterprise_number'], // Numéro d'entreprise belge
  ES: ['cif'],           // CIF espagnol
  IT: ['partita_iva', 'codice_fiscale'], // Partita IVA et Codice Fiscale italiens
};

interface CountrySpecificFieldsProps {
  country: string | null | undefined;
  data: { [key: string]: string };
  onChange: (data: { [key: string]: string }) => void;
  showValidation?: boolean;
  /** 'fiscal' = uniquement les champs fiscaux, 'other' = tous sauf fiscaux, 'all' = tous */
  filter?: 'fiscal' | 'other' | 'all';
  /** Masquer le titre */
  hideTitle?: boolean;
}

export function CountrySpecificFields({
  country,
  data,
  onChange,
  showValidation = false,
  filter = 'all',
  hideTitle = false,
}: CountrySpecificFieldsProps) {
  const [allFields, setAllFields] = useState<CountryFieldConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Filtrer les champs selon le mode
  const fields = useMemo(() => {
    if (!country || allFields.length === 0) return [];
    
    const fiscalKeys = FISCAL_FIELDS[country] || [];
    
    if (filter === 'fiscal') {
      return allFields.filter(f => fiscalKeys.includes(f.field_key));
    } else if (filter === 'other') {
      return allFields.filter(f => !fiscalKeys.includes(f.field_key));
    }
    return allFields;
  }, [allFields, country, filter]);

  // Charger les champs quand le pays change
  useEffect(() => {
    if (!country) {
      setAllFields([]);
      return;
    }

    const loadFields = async () => {
      setLoading(true);
      const countryFields = await fetchCountryFields(country);
      setAllFields(countryFields);
      setLoading(false);
    };

    loadFields();
  }, [country]);

  // Valider les données si demandé
  useEffect(() => {
    if (showValidation && fields.length > 0) {
      const validation = validateCountryData(country || '', data, fields);
      setValidationErrors(validation.errors);
    } else {
      setValidationErrors([]);
    }
  }, [country, data, fields, showValidation]);

  // Si pas de pays sélectionné
  if (!country) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        Sélectionnez un pays pour afficher les champs spécifiques
      </div>
    );
  }

  // Si chargement
  if (loading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
        Chargement des champs pour {country}...
      </div>
    );
  }

  // Si pas de champs configurés pour ce pays
  if (fields.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        Aucun champ spécifique configuré pour ce pays
      </div>
    );
  }

  // Rendu des champs
  return (
    <div className="space-y-4">
      {/* Titre avec indicateur du pays */}
      {!hideTitle && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            {filter === 'fiscal' ? 'Identification fiscale' : filter === 'other' ? 'Informations complémentaires' : 'Informations spécifiques'} - {getCountryName(country)}
          </h4>
          {validationErrors.length > 0 && (
            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.length} erreur(s)
            </span>
          )}
        </div>
      )}

      {/* Grille de champs (2 colonnes) */}
      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.field_key} className={field.field_type === 'text' && field.help_text ? 'col-span-2' : ''}>
            {field.field_type === 'select' ? (
              // Champ select
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {field.field_label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                  value={data[field.field_key] || ''}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      [field.field_key]: e.target.value,
                    })
                  }
                  className="h-[42px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  title={field.help_text || undefined}
                >
                  <option value="">Sélectionner...</option>
                  {field.select_options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {field.help_text && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.help_text}</span>
                )}
              </div>
            ) : (
              // Champ input
              <Input
                label={field.field_label + (field.is_required ? ' *' : '')}
                type={field.field_type === 'number' ? 'number' : 'text'}
                placeholder={field.placeholder || undefined}
                value={data[field.field_key] || ''}
                onChange={(e) =>
                  onChange({
                    ...data,
                    [field.field_key]: e.target.value,
                  })
                }
                helperText={field.help_text || undefined}
                error={
                  showValidation && field.is_required && !data[field.field_key]
                    ? `${field.field_label} est requis`
                    : undefined
                }
              />
            )}
          </div>
        ))}
      </div>

      {/* Messages de validation */}
      {showValidation && validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                Erreurs de validation :
              </p>
              <ul className="text-xs text-red-700 dark:text-red-300 list-disc list-inside space-y-0.5">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper pour obtenir le nom complet du pays
 */
function getCountryName(code: string): string {
  const countries: { [key: string]: string } = {
    CH: 'Suisse',
    FR: 'France',
    GB: 'Royaume-Uni',
    US: 'États-Unis',
    DE: 'Allemagne',
    BE: 'Belgique',
    ES: 'Espagne',
    IT: 'Italie',
    NL: 'Pays-Bas',
    AT: 'Autriche',
    PT: 'Portugal',
    SE: 'Suède',
    DK: 'Danemark',
    NO: 'Norvège',
    FI: 'Finlande',
  };
  return countries[code] || code;
}







