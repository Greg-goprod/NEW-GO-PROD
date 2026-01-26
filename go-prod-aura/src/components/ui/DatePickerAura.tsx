import * as React from 'react'
import cn from 'classnames'
import dayjs from 'dayjs'
import { Icon } from './Icon'

/**
 * @deprecated Préférer DatePickerPopup pour usage en formulaire.
 * Ce composant est utilisé en interne par DatePickerPopup.
 * Import: `import { DatePickerPopup } from '@/components/ui/pickers'`
 * @see {@link DatePickerPopup}
 */
type DatePickerProps = {
  value?: Date | null
  onChange: (date: Date | null) => void
  className?: string
  disabledDates?: (date: Date) => boolean
  onClose?: () => void
}

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

function getDaysGrid(current: dayjs.Dayjs) {
  const startOfMonth = current.startOf('month')
  const startWeekDay = (startOfMonth.day() + 6) % 7
  const daysInMonth = current.daysInMonth()
  const days: Array<{ date: dayjs.Dayjs; disabled?: boolean }> = []

  for (let i = 0; i < startWeekDay; i++) {
    days.push({ date: startOfMonth.subtract(startWeekDay - i, 'day'), disabled: true })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: startOfMonth.date(i) })
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date
    days.push({ date: last.add(1, 'day'), disabled: true })
  }
  return days
}

/**
 * @deprecated Préférer DatePickerPopup pour usage en formulaire.
 * @see {@link DatePickerPopup}
 */
export function DatePickerAura({ value, onChange, className, disabledDates, onClose }: DatePickerProps) {
  const [viewDate, setViewDate] = React.useState(() => dayjs(value ?? new Date()))
  const [mode, setMode] = React.useState<'days' | 'months' | 'years'>('days')
  const [yearPage, setYearPage] = React.useState(() => Math.floor(dayjs().year() / 12) * 12)
  const [tempSelectedDate, setTempSelectedDate] = React.useState<Date | null>(value ?? null)

  const days = React.useMemo(() => getDaysGrid(viewDate), [viewDate])

  const isSelected = (date: dayjs.Dayjs) => (tempSelectedDate ? dayjs(tempSelectedDate).isSame(date, 'day') : false)

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
  const years = Array.from({ length: 12 }, (_, i) => yearPage + i)

  const handleMonthSelect = (monthIndex: number) => {
    setViewDate(viewDate.month(monthIndex))
    setMode('days')
  }

  const handleYearSelect = (year: number) => {
    setViewDate(viewDate.year(year))
    setMode('months')
  }

  const handleDayClick = (dayjsDate: dayjs.Dayjs) => {
    // Créer une Date correcte en fuseau Paris (sans problème timezone)
    const year = dayjsDate.year();
    const month = dayjsDate.month(); // 0-indexed
    const day = dayjsDate.date();
    
    // Créer la Date en local (fuseau Paris)
    const localDate = new Date(year, month, day);
    setTempSelectedDate(localDate);
  }

  const handleConfirm = () => {
    if (tempSelectedDate) {
      onChange(tempSelectedDate)
    }
    onClose?.()
  }

  const handleCancel = () => {
    setTempSelectedDate(null)
    onChange(null)
    onClose?.()
  }

  const handleClear = () => {
    setTempSelectedDate(null)
  }

  return (
    <div 
      className={cn('rounded-xl', className)} 
      style={{ 
        width: '330px', 
        height: '380px', 
        display: 'flex', 
        flexDirection: 'column',
        border: '1px solid color-mix(in oklab, var(--color-border) 80%, transparent)',
        borderRadius: '0.75rem',
        overflow: 'hidden',
      }}
    >
      {/* TOP BAR avec couleur AURA primary */}
      <div className="px-4 py-3" style={{ backgroundColor: 'var(--color-primary)' }}>
        <span className="text-white text-sm font-medium">
          Sélectionner une date
        </span>
      </div>

      {/* CONTENU sans scroll */}
      <div className="flex-1 p-3 flex flex-col justify-center" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
      {/* HEADER avec navigation */}
      <div className="flex items-center justify-between mb-1.5">
        {mode === 'days' && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewDate((prev) => prev.subtract(1, 'month'))} type="button">
              <Icon name="ChevronLeft" size={16} />
            </button>
            <button 
              className="text-sm font-semibold hover:text-purple-400 transition-colors cursor-pointer"
              onClick={() => setMode('months')}
              type="button"
            >
              {viewDate.format('MMMM YYYY')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewDate((prev) => prev.add(1, 'month'))} type="button">
              <Icon name="ChevronRight" size={16} />
            </button>
          </>
        )}
        {mode === 'months' && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewDate((prev) => prev.subtract(1, 'year'))} type="button">
              <Icon name="ChevronLeft" size={16} />
            </button>
            <button 
              className="text-sm font-semibold hover:text-purple-400 transition-colors cursor-pointer"
              onClick={() => {
                setYearPage(Math.floor(viewDate.year() / 12) * 12)
                setMode('years')
              }}
              type="button"
            >
              {viewDate.format('YYYY')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewDate((prev) => prev.add(1, 'year'))} type="button">
              <Icon name="ChevronRight" size={16} />
            </button>
          </>
        )}
        {mode === 'years' && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setYearPage(yearPage - 12)} type="button">
              <Icon name="ChevronLeft" size={16} />
            </button>
            <div className="text-sm font-semibold">
              {yearPage} - {yearPage + 11}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setYearPage(yearPage + 12)} type="button">
              <Icon name="ChevronRight" size={16} />
            </button>
          </>
        )}
      </div>

      {/* CONTENU selon mode */}
      {mode === 'days' && (
        <>
          <div className="grid grid-cols-7 gap-1 mb-0.5">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-[9px] font-semibold py-0.5 text-[var(--text-muted)]">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(({ date, disabled }) => {
              // Créer une Date locale pour disabledDates
              const localDate = new Date(date.year(), date.month(), date.date());
              const isDisabled = disabled || disabledDates?.(localDate);
              return (
                <button
                  key={date.format('YYYY-MM-DD')}
                  className={cn('calendar-day-round', {
                    disabled: isDisabled,
                    selected: isSelected(date),
                  })}
                  onClick={() => !isDisabled && handleDayClick(date)}
                  disabled={isDisabled}
                  type="button"
                >
                  {date.date()}
                </button>
              )
            })}
          </div>
        </>
      )}

      {mode === 'months' && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {months.map((month, index) => {
            const isCurrentMonth = viewDate.month() === index
            return (
              <button
                key={month}
                className={cn(
                  'py-2 px-3 text-xs font-medium rounded-lg transition-colors',
                  isCurrentMonth
                    ? 'bg-purple-500 text-white'
                    : 'hover:bg-purple-500/10 text-[var(--text-default)]'
                )}
                onClick={() => handleMonthSelect(index)}
                type="button"
              >
                {month}
              </button>
            )
          })}
        </div>
      )}

      {mode === 'years' && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {years.map((year) => {
            const isCurrentYear = viewDate.year() === year
            return (
              <button
                key={year}
                className={cn(
                  'py-2 px-3 text-xs font-medium rounded-lg transition-colors',
                  isCurrentYear
                    ? 'bg-purple-500 text-white'
                    : 'hover:bg-purple-500/10 text-[var(--text-default)]'
                )}
                onClick={() => handleYearSelect(year)}
                type="button"
              >
                {year}
              </button>
            )
          })}
        </div>
      )}

      </div>

      {/* FOOTER avec couleur AURA primary */}
      <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ backgroundColor: 'var(--color-primary)' }}>
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
  )
}





