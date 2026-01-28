import * as React from 'react'
import { Clock } from 'lucide-react'
import { TimePickerCircular24 } from '../TimePickerCircular24'

type TimePickerPopupProps = {
  value?: string | null
  onChange: (time: string | null) => void
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
  size?: 'default' | 'sm'
}

export function TimePickerPopup({
  value,
  onChange,
  label,
  placeholder = 'Sélectionner une heure',
  error,
  disabled,
  className,
  size = 'sm',
}: TimePickerPopupProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleSelect = (time: string | null) => {
    onChange(time)
  }

  // Normaliser l'affichage en HH:MM (supprimer les secondes si présentes)
  const displayValue = React.useMemo(() => {
    if (!value) return null
    // Si format HH:MM:SS, ne garder que HH:MM
    const parts = value.split(':')
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`
    }
    return value
  }, [value])

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

  const buttonElement = (
    <button
      type="button"
      onClick={() => !disabled && setIsOpen(true)}
      disabled={disabled}
      className={`flex items-center gap-2 ${className || ''}`}
      style={{
        textAlign: 'left',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        minHeight: 'auto',
        lineHeight: 'normal',
      }}
    >
      <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
      <span style={{ color: displayValue ? 'inherit' : 'var(--text-muted)' }}>
        {displayValue || placeholder}
      </span>
    </button>
  );

  if (!isOpen) {
    // Si pas de label ni d'erreur, retourner directement le bouton
    if (!label && !error) {
      return buttonElement;
    }

    // Sinon, wrapper avec div pour label/erreur
    return (
      <div className="flex flex-col">
        {label ? <span className="text-sm text-[var(--text-muted)] mb-2">{label}</span> : null}
        {buttonElement}
        {error ? <span className="text-sm text-[var(--error)] mt-1">{error}</span> : null}
      </div>
    )
  }

  // Quand le popup est ouvert
  const modalContent = (
    <>
      {/* Si pas de label ni d'erreur, retourner directement le bouton */}
      {!label && !error ? (
        buttonElement
      ) : (
        <div className="flex flex-col">
          {label ? <span className="text-sm text-[var(--text-muted)] mb-2">{label}</span> : null}
          {buttonElement}
          {error ? <span className="text-sm text-[var(--error)] mt-1">{error}</span> : null}
        </div>
      )}
      {/* Overlay transparent pour fermeture au clic extérieur */}
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 1200,
        }}
        onClick={() => setIsOpen(false)}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          }}
        >
          <TimePickerCircular24
            value={value}
            onChange={handleSelect}
            placeholder={placeholder}
            onClose={() => setIsOpen(false)}
          />
        </div>
      </div>
    </>
  );

  return modalContent;
}

