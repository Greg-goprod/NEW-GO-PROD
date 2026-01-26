import * as React from 'react'
import { Calendar } from 'lucide-react'
import { DatePickerAura } from '../DatePickerAura'

type DatePickerPopupProps = {
  value?: Date | null
  onChange: (date: Date | null) => void
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
  size?: 'default' | 'sm'
}

export function DatePickerPopup({
  value,
  onChange,
  label,
  placeholder = 'Sélectionner une date',
  error,
  disabled,
  className,
  size = 'sm',
}: DatePickerPopupProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleSelect = (date: Date | null) => {
    onChange(date)
    setIsOpen(false)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  }

  // Empêcher le scroll quand le popup est ouvert
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Fermer avec Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

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
          <span style={{ color: value ? 'inherit' : 'var(--text-muted)' }}>
            {value ? formatDate(value) : placeholder}
          </span>
          <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </button>
        {error ? <span className="text-sm text-[var(--error)]">{error}</span> : null}
      </label>
    )
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
          <span style={{ color: value ? 'inherit' : 'var(--text-muted)' }}>
            {value ? formatDate(value) : placeholder}
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
          <DatePickerAura 
            value={value} 
            onChange={handleSelect} 
            onClose={() => setIsOpen(false)}
          />
        </div>
      </div>
    </>
  )
}

