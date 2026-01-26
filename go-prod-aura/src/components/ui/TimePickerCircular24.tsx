import * as React from 'react'
import cn from 'classnames'

/**
 * @deprecated Préférer TimePickerPopup pour usage en formulaire.
 * Ce composant est utilisé en interne par TimePickerPopup.
 * Import: `import { TimePickerPopup } from '@/components/ui/pickers'`
 * @see {@link TimePickerPopup}
 */
type TimePickerProps = {
  value?: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  className?: string
  onClose?: () => void
}

// 0-23 heures (0 = minuit/00h, 12 = midi)
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

function polarToCartesian(radiusPos: number, angle: number, centerSize: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  const x = centerSize + radiusPos * Math.cos(rad)
  const y = centerSize + radiusPos * Math.sin(rad)
  return { x, y }
}

function getHourPosition(index: number, inner: boolean, centerSize: number) {
  const angle = (360 / 12) * index
  const radius = inner ? (centerSize * 0.45) : (centerSize * 0.75)
  return polarToCartesian(radius, angle, centerSize)
}

function getMinutePosition(index: number, centerSize: number) {
  const angle = (360 / 12) * index
  const radius = centerSize * 0.75
  return polarToCartesian(radius, angle, centerSize)
}

/**
 * @deprecated Préférer TimePickerPopup pour usage en formulaire.
 * @see {@link TimePickerPopup}
 */
export function TimePickerCircular24({ value, onChange, placeholder, className, onClose }: TimePickerProps) {
  const [mode, setMode] = React.useState<'hours' | 'minutes'>('hours')
  const [internal, setInternal] = React.useState<string | null>(value ?? null)

  React.useEffect(() => {
    setInternal(value ?? null)
  }, [value])

  const [hours, minutes] = internal ? internal.split(':').map(Number) : [null, null]

  const handleHourClick = (hour: number) => {
    setMode('minutes')
    const next = `${String(hour).padStart(2, '0')}:${String(minutes ?? 0).padStart(2, '0')}`
    setInternal(next)
    onChange(next)
  }

  const handleMinuteClick = (minute: number) => {
    if (hours == null) return
    const next = `${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    setInternal(next)
    onChange(next)
  }

  const circleSize = 250 // Taille du cercle pour popup 300px (agrandi pour mieux occuper l'espace)
  const centerSize = circleSize / 2

  return (
    <div 
      className={cn('rounded-xl', className)} 
      style={{ 
        width: '300px', 
        height: '380px', 
        display: 'flex', 
        flexDirection: 'column',
        border: '1px solid color-mix(in oklab, var(--color-border) 80%, transparent)',
        borderRadius: '0.75rem',
        overflow: 'hidden',
      }}
    >
      {/* TOP BAR avec couleur AURA primary */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--color-primary)' }}>
        <span className="text-white text-sm font-medium">
          {mode === 'hours' ? 'Sélectionner l\'heure' : 'Sélectionner les minutes'}
        </span>
        <div 
          className="flex items-center gap-1 text-white text-xl font-bold" 
          style={{ fontFamily: 'Manrope, Inter, sans-serif', letterSpacing: '0.05em' }}
        >
          <span>{hours != null ? String(hours).padStart(2, '0') : '00'}</span>
          <span>:</span>
          <span>{minutes != null ? String(minutes).padStart(2, '0') : '00'}</span>
        </div>
      </div>

      {/* CONTENU CENTRAL */}
      <div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
      {/* MODE SELECTOR */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-center gap-2">
        <button 
          className={cn(
            'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
            mode === 'hours' 
              ? 'text-white' 
              : 'opacity-60 hover:opacity-80'
          )} 
          style={mode === 'hours' ? { backgroundColor: 'var(--color-primary)' } : {}}
          onClick={() => setMode('hours')} 
          type="button"
        >
          Heures
        </button>
        <button 
          className={cn(
            'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
            mode === 'minutes' 
              ? 'text-white' 
              : 'opacity-60 hover:opacity-80'
          )} 
          style={mode === 'minutes' ? { backgroundColor: 'var(--color-primary)' } : {}}
          onClick={() => setMode('minutes')} 
          type="button"
        >
          Minutes
        </button>
      </div>
      <div className="flex justify-center mb-2">
        <div className="clock-circle-compact" style={{ width: circleSize, height: circleSize }}>
          <div className="clock-center-compact" />
          {mode === 'hours'
            ? HOURS.map((hour) => {
                // Cercle EXTÉRIEUR : 12-23 (12h-23h/midi-minuit)
                // Cercle INTÉRIEUR : 0-11 (00h-11h/minuit-midi)
                const inner = hour < 12  // 0-11 = intérieur, 12-23 = extérieur
                // Position sur le cadran : 12 en haut (index 0)
                const displayHour = hour === 0 ? 12 : hour  // Afficher 12 pour minuit
                const actualHour = hour % 12  // Position angulaire (0-11)
                const pos = getHourPosition(actualHour, inner, centerSize)
                const selected = hours === hour
                return (
                  <button
                    key={hour}
                    className={cn('clock-number-compact', { selected, inner })}
                    style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    onClick={() => handleHourClick(hour)}
                    type="button"
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                )
              })
            : MINUTES.map((minute, index) => {
                const pos = getMinutePosition(index, centerSize)
                const selected = minutes === minute
                return (
                  <button
                    key={minute}
                    className={cn('clock-number-compact', { selected })}
                    style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    onClick={() => handleMinuteClick(minute)}
                    type="button"
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                )
              })}
        </div>
      </div>
      </div>

      {/* FOOTER avec couleur AURA primary */}
      <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ backgroundColor: 'var(--color-primary)' }}>
        <button 
          className="text-white text-sm font-medium hover:bg-white/10 px-3 py-1 rounded transition-colors" 
          onClick={() => {
            setInternal(null)
            onChange(null)
            onClose?.()
          }} 
          type="button"
        >
          Annuler
        </button>
        <button 
          className="text-white text-sm font-medium hover:bg-white/10 px-3 py-1 rounded transition-colors" 
          onClick={() => {
            setInternal(null)
            onChange(null)
          }} 
          type="button"
        >
          Effacer
        </button>
        <button 
          className="bg-white text-sm font-semibold px-4 py-1.5 rounded transition-colors" 
          style={{ color: 'var(--color-primary)' }}
          onClick={() => onClose?.()} 
          type="button"
        >
          OK
        </button>
      </div>
    </div>
  )
}

