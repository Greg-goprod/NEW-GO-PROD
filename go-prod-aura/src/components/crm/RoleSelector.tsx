import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useActiveCRMLookups } from '@/hooks/useCRMLookups';

interface RoleSelectorProps {
  companyId: string;
  selectedRoleIds: string[];
  onChange: (roleIds: string[]) => void;
}

export function RoleSelector({ companyId: _companyId, selectedRoleIds, onChange }: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { lookups: roles, loading } = useActiveCRMLookups('contact_roles');

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleRole = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      onChange(selectedRoleIds.filter(id => id !== roleId));
    } else {
      onChange([...selectedRoleIds, roleId]);
    }
  };

  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        Fonction
      </label>
      
      <div className="relative" ref={dropdownRef}>
        {/* Dropdown trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-[42px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent flex items-center justify-between text-left"
        >
          <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
            {selectedRoleIds.length === 0 ? '-' : `${selectedRoleIds.length} sélectionnée(s)`}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-auto">
            {loading ? (
              <div className="p-3 text-sm text-gray-500 text-center">Chargement...</div>
            ) : roles.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">Aucune fonction disponible</div>
            ) : (
              <>
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => handleToggleRole(role.id)}
                      className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{role.label}</span>
                  </label>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

