import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building2, X } from 'lucide-react';
import { fetchCRMCompanies } from '@/api/crmCompaniesApi';
import type { CRMCompanyWithRelations } from '@/types/crm';
import { useToast } from '@/components/aura/ToastProvider';

interface CompanySelectorProps {
  companyId: string; // tenant ID
  selectedCompanyIds: string[];
  onChange: (companyIds: string[]) => void;
}

export function CompanySelector({ companyId, selectedCompanyIds, onChange }: CompanySelectorProps) {
  const [companies, setCompanies] = useState<CRMCompanyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { error: toastError } = useToast();

  // Charger les entreprises
  useEffect(() => {
    if (!companyId) return;
    
    const loadCompanies = async () => {
      try {
        setLoading(true);
        const data = await fetchCRMCompanies(companyId);
        setCompanies(data);
      } catch (err) {
        console.error('Erreur chargement entreprises:', err);
        toastError('Erreur lors du chargement des entreprises');
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, [companyId, toastError]);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (crmCompanyId: string) => {
    if (selectedCompanyIds.includes(crmCompanyId)) {
      onChange(selectedCompanyIds.filter(id => id !== crmCompanyId));
    } else {
      onChange([...selectedCompanyIds, crmCompanyId]);
    }
  };

  const handleRemove = (crmCompanyId: string) => {
    onChange(selectedCompanyIds.filter(id => id !== crmCompanyId));
  };

  const selectedCompanies = companies.filter(c => selectedCompanyIds.includes(c.id));

  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        Entreprises associées <span className="text-gray-400">(optionnel)</span>
      </label>

      {/* Tags des entreprises sélectionnées */}
      {selectedCompanies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 max-h-20 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          {selectedCompanies.map(company => (
            <span
              key={company.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm"
            >
              <Building2 className="w-3 h-3" />
              {company.company_name}
              <button
                type="button"
                onClick={() => handleRemove(company.id)}
                className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="w-full h-[42px] flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors disabled:opacity-50"
        >
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {loading ? 'Chargement...' : `Sélectionner des entreprises (${selectedCompanyIds.length})`}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Liste déroulante */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {companies.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                Aucune entreprise disponible
              </div>
            ) : (
              <div className="py-1">
                {companies.map(company => (
                  <label
                    key={company.id}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanyIds.includes(company.id)}
                      onChange={() => handleToggle(company.id)}
                      className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {company.company_name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}





