import { useState, useEffect, useRef } from 'react';
import { ChevronDown, User, X } from 'lucide-react';
import { fetchContacts } from '@/api/crmContactsApi';
import type { CRMContactWithRelations } from '@/types/crm';
import { useToast } from '@/components/aura/ToastProvider';

interface ContactSelectorProps {
  companyId: string; // tenant ID
  selectedContactIds: string[];
  onChange: (contactIds: string[]) => void;
}

export function ContactSelector({ companyId, selectedContactIds, onChange }: ContactSelectorProps) {
  const [contacts, setContacts] = useState<CRMContactWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { error: toastError } = useToast();

  // Charger les contacts
  useEffect(() => {
    if (!companyId) return;
    
    const loadContacts = async () => {
      try {
        setLoading(true);
        const data = await fetchContacts(companyId);
        setContacts(data);
      } catch (err) {
        console.error('Erreur chargement contacts:', err);
        toastError('Erreur lors du chargement des contacts');
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
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

  const handleToggle = (contactId: string) => {
    if (selectedContactIds.includes(contactId)) {
      onChange(selectedContactIds.filter(id => id !== contactId));
    } else {
      onChange([...selectedContactIds, contactId]);
    }
  };

  const handleRemove = (contactId: string) => {
    onChange(selectedContactIds.filter(id => id !== contactId));
  };

  const selectedContacts = contacts.filter(c => selectedContactIds.includes(c.id));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        Contacts associés <span className="text-gray-400">(optionnel)</span>
      </label>

      {/* Tags des contacts sélectionnés */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 max-h-24 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          {selectedContacts.map(contact => (
            <span
              key={contact.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm"
            >
              <User className="w-3 h-3" />
              {contact.first_name} {contact.last_name}
              <button
                type="button"
                onClick={() => handleRemove(contact.id)}
                className="ml-1 hover:text-green-900 dark:hover:text-green-100"
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
          className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 dark:hover:border-green-500 transition-colors disabled:opacity-50"
        >
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {loading ? 'Chargement...' : `Sélectionner des contacts (${selectedContactIds.length})`}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Liste déroulante */}
        {isOpen && (
          <div className="absolute z-[600] mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {contacts.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                Aucun contact disponible
              </div>
            ) : (
              <div className="py-1">
                {contacts.map(contact => (
                  <label
                    key={contact.id}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContactIds.includes(contact.id)}
                      onChange={() => handleToggle(contact.id)}
                      className="w-4 h-4 text-green-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:focus:ring-green-400"
                    />
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {contact.first_name} {contact.last_name}
                      {contact.email_primary && (
                        <span className="text-xs text-gray-500 ml-2">({contact.email_primary})</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Vous pouvez associer plusieurs contacts à cette entreprise
      </p>
    </div>
  );
}





