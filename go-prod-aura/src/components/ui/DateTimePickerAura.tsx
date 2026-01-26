import * as React from 'react'
import cn from 'classnames'
import { DatePickerAura } from './DatePickerAura'
import { TimePickerCircular24 } from './TimePickerCircular24'
import { Input } from './Input'

/**
 * @deprecated Préférer DateTimePickerPopup pour usage en formulaire.
 * Ce composant est utilisé en interne par DateTimePickerPopup.
 * Import: `import { DateTimePickerPopup } from '@/components/ui/pickers'`
 * @see {@link DateTimePickerPopup}
 */
type DateTimePickerProps = {
  value?: Date | null
  onChange: (date: Date | null) => void
  className?: string
}

/**
 * @deprecated Préférer DateTimePickerPopup pour usage en formulaire.
 * @see {@link DateTimePickerPopup}
 */
export function DateTimePickerAura({ value, onChange, className }: DateTimePickerProps) {
  const [internal, setInternal] = React.useState<Date | null>(value ?? null)

  React.useEffect(() => {
    setInternal(value ?? null)
  }, [value])

  const timeValue = internal 
    ? `${String(internal.getHours()).padStart(2, '0')}:${String(internal.getMinutes()).padStart(2, '0')}`
    : null

  const handleDateChange = (newDate: Date | null) => {
    if (!newDate) {
      setInternal(null)
      onChange(null)
      return
    }
    // Combiner la nouvelle date avec l'heure actuelle (ou 00:00 si pas d'heure)
    const combined = internal 
      ? new Date(
          newDate.getFullYear(),
          newDate.getMonth(),
          newDate.getDate(),
          internal.getHours(),
          internal.getMinutes(),
          0,
          0
        )
      : new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 0, 0, 0, 0)
    setInternal(combined)
    onChange(combined)
  }

  const handleTimeChange = (time: string | null) => {
    if (!time) {
      setInternal(null)
      onChange(null)
      return
    }
    const [hh, mm] = time.split(':').map(Number)
    const base = internal || new Date()
    const combined = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      hh,
      mm ?? 0,
      0,
      0
    )
    setInternal(combined)
    onChange(combined)
  }

  const displayValue = internal 
    ? `${String(internal.getDate()).padStart(2, '0')}.${String(internal.getMonth() + 1).padStart(2, '0')}.${internal.getFullYear()} ${String(internal.getHours()).padStart(2, '0')}:${String(internal.getMinutes()).padStart(2, '0')}`
    : ''

  return (
    <div className={cn('card-surface rounded-2xl p-6', className)}>
      <div className="mb-4">
        <label className="text-sm text-[var(--text-muted)] mb-1 block">Date & Heure</label>
        <Input value={displayValue} placeholder="DD.MM.YYYY HH:mm" readOnly />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 rounded-xl" style={{ background: 'rgba(21,23,43,0.4)', border: '1px solid var(--border-default)' }}>
        <DatePickerAura value={internal ?? undefined} onChange={handleDateChange} />
        <TimePickerCircular24 value={timeValue ?? undefined} onChange={handleTimeChange} placeholder="Sélection par pas de 5 minutes" />
      </div>
      <div className="flex items-center justify-end gap-2 mt-6">
        <button className="btn btn-secondary btn-md" onClick={() => onChange(null)} type="button">
          Effacer
        </button>
        <button className="btn btn-primary btn-md" onClick={() => onChange(internal)} type="button">
          Valider
        </button>
      </div>
    </div>
  )
}





