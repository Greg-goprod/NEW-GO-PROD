import * as React from 'react'
import { Calendar, Clock } from 'lucide-react'
import { DatePickerAura } from '../DatePickerAura'
import { TimePickerCircular24 } from '../TimePickerCircular24'

type DateTimePickerPopupProps = {
  value?: Date | null
  onChange: (date: Date | null) => void
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function DateTimePickerPopup({
  value,
  onChange,
  label,
  placeholder = 'Sélectionner date et heure',
  error,
  disabled,
  className,
}: DateTimePickerPopupProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [tempDate, setTempDate] = React.useState<Date | null>(value ?? null)
  const [tempTime, setTempTime] = React.useState<string | null>(
    value ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}` : null
  )

  React.useEffect(() => {
    setTempDate(value ?? null)
    if (value) {
      setTempTime(`${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`)
    } else {
      setTempTime(null)
    }
  }, [value])

  const handleConfirm = () => {
    if (tempDate && tempTime) {
      const [hours, minutes] = tempTime.split(':').map(Number)
      const newDate = new Date(tempDate)
      newDate.setHours(hours, minutes, 0, 0)
      onChange(newDate)
    } else if (tempDate) {
      onChange(tempDate)
    } else {
      onChange(null)
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempDate(null)
    setTempTime(null)
    onChange(null)
    setIsOpen(false)
  }

  const handleClear = () => {
    setTempDate(null)
    setTempTime(null)
  }

  const formatDateTime = (date: Date | null) => {
    if (!date) return ''
    const dateStr = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    return `${dateStr} à ${timeStr}`
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

  if (!isOpen) {
    return (
      <label className="flex flex-col gap-2">
        {label ? <span className="text-sm text-[var(--text-muted)]">{label}</span> : null}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          className={`input flex items-center justify-between ${className || ''}`}
          style={{
            textAlign: 'left',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <span style={{ color: value ? 'inherit' : 'var(--text-muted)' }}>
            {value ? formatDateTime(value) : placeholder}
          </span>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </div>
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
          className={`input flex items-center justify-between ${className || ''}`}
          style={{
            textAlign: 'left',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <span style={{ color: value ? 'inherit' : 'var(--text-muted)' }}>
            {value ? formatDateTime(value) : placeholder}
          </span>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </div>
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
          {/* Conteneur principal */}
          <div
            style={{
              width: '630px',
              height: '380px',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              border: '1px solid color-mix(in oklab, var(--color-border) 80%, transparent)',
            }}
          >
            {/* TOP BAR unique */}
            <div className="px-4 py-3" style={{ backgroundColor: 'var(--color-primary)' }}>
              <span className="text-white text-sm font-medium">Sélectionner date et heure</span>
            </div>

            {/* CONTENU : 2 colonnes */}
            <div className="flex-1 flex" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
              {/* Colonne gauche : DatePicker */}
              <div
                style={{
                  width: '330px',
                  height: '100%',
                  borderRight: '1px solid var(--border-default)',
                  overflow: 'hidden',
                }}
              >
                <DatePickerAura
                  value={tempDate}
                  onChange={setTempDate}
                  onClose={() => {}}
                  className="border-0 rounded-none"
                />
              </div>

              {/* Colonne droite : TimePicker */}
              <div
                style={{
                  width: '300px',
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                <TimePickerCircular24
                  value={tempTime}
                  onChange={setTempTime}
                  onClose={() => {}}
                  className="border-0 rounded-none"
                />
              </div>
            </div>

            {/* FOOTER unique */}
            <div
              className="px-4 py-3 flex items-center justify-between gap-2"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <button
                className="text-white text-sm font-medium hover:bg-white/10 px-3 py-1 rounded transition-colors"
                onClick={handleCancel}
                type="button"
              >
                Annuler
              </button>
              <button
                className="text-white text-sm font-medium hover:bg-white/10 px-3 py-1 rounded transition-colors"
                onClick={handleClear}
                type="button"
              >
                Effacer
              </button>
              <button
                className="bg-white text-sm font-semibold px-4 py-1.5 rounded transition-colors"
                style={{ color: 'var(--color-primary)' }}
                onClick={handleConfirm}
                type="button"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
