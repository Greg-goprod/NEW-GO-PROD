import * as React from 'react';
import { Calendar } from 'lucide-react';
import { DateRangePickerAura } from '../DateRangePickerAura';

type DateRangePickerPopupProps = {
  startDate: string | null; // Format "YYYY-MM-DD"
  endDate: string | null;   // Format "YYYY-MM-DD"
  onChange: (startDate: string | null, endDate: string | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'sm';
};

export function DateRangePickerPopup({
  startDate,
  endDate,
  onChange,
  label,
  placeholder = 'Sélectionner les dates',
  error,
  disabled,
  className,
  size = 'sm',
}: DateRangePickerPopupProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (start: string | null, end: string | null) => {
    onChange(start, end);
  };

  const handleConfirm = (start: string | null, end: string | null) => {
    onChange(start, end);
    setIsOpen(false);
  };

  const formatRange = () => {
    if (!startDate && !endDate) return '';
    
    if (startDate && !endDate) {
      return formatDate(startDate);
    }
    
    if (startDate && endDate) {
      return `${formatDate(startDate)} → ${formatDate(endDate)}`;
    }
    
    return '';
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  // Empêcher le scroll quand le popup est ouvert
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Fermer avec Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const inputClass = size === 'sm' ? 'input-sm' : 'input';

  if (!isOpen) {
    return (
      <label className="flex flex-col gap-2">
        {label ? <span className="text-sm text-[var(--text-muted)]">{label}</span> : null}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          className={`${inputClass} flex items-center justify-between ${className || ''}`}
          style={{
            textAlign: 'left',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <span style={{ color: (startDate || endDate) ? 'inherit' : 'var(--text-muted)' }}>
            {formatRange() || placeholder}
          </span>
          <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </button>
        {error ? <span className="text-sm text-[var(--error)]">{error}</span> : null}
      </label>
    );
  }

  return (
    <>
      <label className="flex flex-col gap-2">
        {label ? <span className="text-sm text-[var(--text-muted)]">{label}</span> : null}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          className={`${inputClass} flex items-center justify-between ${className || ''}`}
          style={{
            textAlign: 'left',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <span style={{ color: (startDate || endDate) ? 'inherit' : 'var(--text-muted)' }}>
            {formatRange() || placeholder}
          </span>
          <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </button>
        {error ? <span className="text-sm text-[var(--error)]">{error}</span> : null}
      </label>

      {/* Overlay transparent pour fermeture au clic extérieur */}
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 1000,
        }}
        onClick={() => setIsOpen(false)}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          }}
        >
          <DateRangePickerAura 
            startDate={startDate}
            endDate={endDate}
            onChange={handleSelect}
            onConfirm={handleConfirm}
            onClose={() => setIsOpen(false)}
          />
        </div>
      </div>
    </>
  );
}


