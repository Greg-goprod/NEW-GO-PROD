import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { getCountries } from 'libphonenumber-js/max';
import type { CountryCode } from 'libphonenumber-js/max';
import {
  cleanPhoneNumber,
  validatePhoneNumber,
  formatPhoneNumber,
  detectCountry,
  getCountryFlag,
  getCountryName,
  PRIMARY_COUNTRIES,
} from '@/utils/phoneUtils';

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultCountry?: CountryCode;
  required?: boolean;
  disabled?: boolean;
}

export function PhoneInput({
  label,
  value,
  onChange,
  placeholder = '+41 79 123 45 67',
  defaultCountry = 'CH',
  required = false,
  disabled = false,
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [searchCountry, setSearchCountry] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Détecter le pays du numéro si déjà rempli
  useEffect(() => {
    if (value && value.startsWith('+')) {
      const detected = detectCountry(value);
      if (detected) {
        setSelectedCountry(detected);
      }
    }
  }, [value]);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
        setSearchCountry('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Obtenir tous les pays disponibles
  const allCountries = getCountries();
  
  // Séparer pays principaux et autres
  const primaryCountriesList = PRIMARY_COUNTRIES.filter(c => allCountries.includes(c));
  const otherCountries = allCountries.filter(c => !PRIMARY_COUNTRIES.includes(c));
  
  // Filtrer les pays selon la recherche
  const filteredPrimaryCountries = primaryCountriesList.filter(country =>
    getCountryName(country).toLowerCase().includes(searchCountry.toLowerCase())
  );
  const filteredOtherCountries = otherCountries.filter(country =>
    getCountryName(country).toLowerCase().includes(searchCountry.toLowerCase())
  );

  // Valider le numéro
  const isValid = value ? validatePhoneNumber(value, selectedCountry) : null;

  // Gérer le changement de pays
  const handleCountryChange = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsCountryDropdownOpen(false);
    setSearchCountry('');
    
    // Si un numéro existe, le reformater avec le nouveau pays
    if (value) {
      const cleaned = cleanPhoneNumber(value, country);
      if (cleaned) {
        onChange(cleaned);
      }
    }
    
    // Focus sur l'input après sélection
    inputRef.current?.focus();
  };

  // Gérer le changement de valeur
  const handleValueChange = (newValue: string) => {
    onChange(newValue);
    
    // Détecter automatiquement le pays si le numéro commence par +
    if (newValue.startsWith('+')) {
      const detected = detectCountry(newValue);
      if (detected) {
        setSelectedCountry(detected);
      }
    }
  };

  // Nettoyer le numéro au blur
  const handleBlur = () => {
    setIsFocused(false);
    
    if (value) {
      const cleaned = cleanPhoneNumber(value, selectedCountry);
      if (cleaned) {
        onChange(cleaned);
      }
    }
  };

  // Obtenir la classe de validation
  const getValidationClass = () => {
    if (!value || !isFocused) return '';
    if (isValid) return 'ring-green-500 border-green-500';
    if (isValid === false) return 'ring-red-500 border-red-500';
    return '';
  };

  return (
    <div className="flex flex-col gap-2 mb-2">
      {label && (
        <label className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex gap-2">
        {/* Sélecteur de pays */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => !disabled && setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            disabled={disabled}
            className={`h-[42px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent flex items-center gap-2 min-w-[160px] ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-sm font-medium truncate">{getCountryName(selectedCountry)}</span>
            <ChevronDown className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
          </button>

          {/* Dropdown des pays */}
          {isCountryDropdownOpen && (
            <div className="absolute z-50 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
              {/* Recherche */}
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={searchCountry}
                  onChange={(e) => setSearchCountry(e.target.value)}
                  placeholder="Rechercher un pays..."
                  className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  autoFocus
                />
              </div>

              {/* Liste des pays */}
              <div className="max-h-64 overflow-y-auto">
                {/* Pays principaux */}
                {filteredPrimaryCountries.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 sticky top-0">
                      Pays principaux
                    </div>
                    {filteredPrimaryCountries.map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() => handleCountryChange(country)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                      >
                        <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                          {getCountryName(country)}
                        </span>
                        {selectedCountry === country && (
                          <Check className="w-4 h-4 text-indigo-500" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Autres pays */}
                {filteredOtherCountries.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 sticky top-0">
                      Autres pays
                    </div>
                    {filteredOtherCountries.map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() => handleCountryChange(country)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                      >
                        <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                          {getCountryName(country)}
                        </span>
                        {selectedCountry === country && (
                          <Check className="w-4 h-4 text-indigo-500" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Aucun résultat */}
                {filteredPrimaryCountries.length === 0 && filteredOtherCountries.length === 0 && (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    Aucun pays trouvé
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input du numéro */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="tel"
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full h-[42px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${getValidationClass()} ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />

          {/* Indicateur de validation */}
          {value && isFocused && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <X className="w-5 h-5 text-red-500" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message de validation */}
      {value && isFocused && isValid === false && (
        <p className="mt-1 text-xs text-red-500">
          Numéro de téléphone invalide pour {getCountryName(selectedCountry)}
        </p>
      )}
      
      {/* Affichage formaté */}
      {value && isValid && !isFocused && (
        <p className="mt-1 text-xs text-gray-500">
          Format international : {formatPhoneNumber(value, 'INTERNATIONAL')}
        </p>
      )}
    </div>
  );
}




