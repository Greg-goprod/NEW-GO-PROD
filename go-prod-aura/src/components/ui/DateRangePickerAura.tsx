import * as React from 'react';
import cn from 'classnames';
import dayjs from 'dayjs';
import { Icon } from './Icon';
import { parseDateLocal } from '@/config/timezone';

type DateRangePickerAuraProps = {
  startDate: string | null; // Format "YYYY-MM-DD"
  endDate: string | null;   // Format "YYYY-MM-DD"
  onChange: (startDate: string | null, endDate: string | null) => void;
  onConfirm: (startDate: string | null, endDate: string | null) => void;
  onClose?: () => void;
  className?: string;
};

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

function getDaysGrid(current: dayjs.Dayjs) {
  const startOfMonth = current.startOf('month');
  const startWeekDay = (startOfMonth.day() + 6) % 7;
  const daysInMonth = current.daysInMonth();
  const days: Array<{ date: dayjs.Dayjs; isCurrentMonth?: boolean }> = [];

  // Jours du mois précédent (sélectionnables)
  for (let i = 0; i < startWeekDay; i++) {
    days.push({ date: startOfMonth.subtract(startWeekDay - i, 'day'), isCurrentMonth: false });
  }
  // Jours du mois courant
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: startOfMonth.date(i), isCurrentMonth: true });
  }
  // Jours du mois suivant (sélectionnables)
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    days.push({ date: last.add(1, 'day'), isCurrentMonth: false });
  }
  return days;
}

export function DateRangePickerAura({ 
  startDate, 
  endDate, 
  onChange, 
  onConfirm,
  onClose, 
  className 
}: DateRangePickerAuraProps) {
  const [viewDate, setViewDate] = React.useState(() => {
    if (startDate) {
      return dayjs(parseDateLocal(startDate));
    }
    return dayjs();
  });

  const [mode, setMode] = React.useState<'days' | 'months' | 'years'>('days');
  const [yearPage, setYearPage] = React.useState(() => Math.floor(dayjs().year() / 12) * 12);
  const [tempStart, setTempStart] = React.useState<string | null>(startDate);
  const [tempEnd, setTempEnd] = React.useState<string | null>(endDate);

  const days = React.useMemo(() => getDaysGrid(viewDate), [viewDate]);
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const years = Array.from({ length: 12 }, (_, i) => yearPage + i);

  // Vérifier si une date est sélectionnée
  const isSelected = (date: dayjs.Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return dateStr === tempStart || dateStr === tempEnd;
  };

  // Vérifier si une date est dans le range
  const isInRange = (date: dayjs.Dayjs) => {
    if (!tempStart || !tempEnd) return false;
    const dateStr = date.format('YYYY-MM-DD');
    return dateStr > tempStart && dateStr < tempEnd;
  };

  // Sélection de mois
  const handleMonthSelect = (monthIndex: number) => {
    setViewDate(viewDate.month(monthIndex));
    setMode('days');
  };

  // Sélection d'année
  const handleYearSelect = (year: number) => {
    setViewDate(viewDate.year(year));
    setMode('months');
  };

  // Gestion du clic sur un jour
  const handleDayClick = (dayjsDate: dayjs.Dayjs) => {
    const dateStr = dayjsDate.format('YYYY-MM-DD');

    // Si aucune date n'est sélectionnée, ou si les deux sont déjà sélectionnées, on recommence
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd(null);
      onChange(dateStr, null);
    } 
    // Si on a déjà une date de début, on définit la fin
    else if (tempStart && !tempEnd) {
      // S'assurer que la fin est après le début
      if (dateStr >= tempStart) {
        setTempEnd(dateStr);
        onChange(tempStart, dateStr);
      } else {
        // Si on clique avant le début, inverser
        setTempStart(dateStr);
        setTempEnd(tempStart);
        onChange(dateStr, tempStart);
      }
    }
  };

  const handleConfirm = () => {
    onConfirm(tempStart, tempEnd);
  };

  const handleCancel = () => {
    setTempStart(null);
    setTempEnd(null);
    onChange(null, null);
    onClose?.();
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    onChange(null, null);
  };

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
          Sélectionner les dates
        </span>
      </div>

      {/* CONTENU sans scroll */}
      <div className="flex-1 p-3 flex flex-col justify-center" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
        {/* HEADER avec navigation */}
        <div className="flex items-center justify-between mb-1.5">
          {mode === 'days' && (
            <>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setViewDate((prev) => prev.subtract(1, 'month'))} 
                type="button"
              >
                <Icon name="ChevronLeft" size={16} />
              </button>
              <button 
                className="text-sm font-semibold hover:text-purple-400 transition-colors cursor-pointer"
                onClick={() => setMode('months')}
                type="button"
              >
                {viewDate.format('MMMM YYYY')}
              </button>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setViewDate((prev) => prev.add(1, 'month'))} 
                type="button"
              >
                <Icon name="ChevronRight" size={16} />
              </button>
            </>
          )}
          {mode === 'months' && (
            <>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setViewDate((prev) => prev.subtract(1, 'year'))} 
                type="button"
              >
                <Icon name="ChevronLeft" size={16} />
              </button>
              <button 
                className="text-sm font-semibold hover:text-purple-400 transition-colors cursor-pointer"
                onClick={() => {
                  setYearPage(Math.floor(viewDate.year() / 12) * 12);
                  setMode('years');
                }}
                type="button"
              >
                {viewDate.format('YYYY')}
              </button>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setViewDate((prev) => prev.add(1, 'year'))} 
                type="button"
              >
                <Icon name="ChevronRight" size={16} />
              </button>
            </>
          )}
          {mode === 'years' && (
            <>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setYearPage(yearPage - 12)} 
                type="button"
              >
                <Icon name="ChevronLeft" size={16} />
              </button>
              <div className="text-sm font-semibold">
                {yearPage} - {yearPage + 11}
              </div>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setYearPage(yearPage + 12)} 
                type="button"
              >
                <Icon name="ChevronRight" size={16} />
              </button>
            </>
          )}
        </div>

        {/* Instruction (seulement en mode days) */}
        {mode === 'days' && (
          <div className="text-[10px] text-center mb-2 text-[var(--text-muted)]">
            {!tempStart && "1er clic : date de début"}
            {tempStart && !tempEnd && "2ème clic : date de fin"}
            {tempStart && tempEnd && "Sélection terminée"}
          </div>
        )}

        {/* CONTENU selon mode */}
        {mode === 'days' && (
          <>
            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 gap-1 mb-0.5">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center text-[9px] font-semibold py-0.5 text-[var(--text-muted)]">
                  {day}
                </div>
              ))}
            </div>

            {/* Grille des jours */}
            <div className="grid grid-cols-7 gap-1">
              {days.map(({ date, isCurrentMonth }) => {
                const selected = isSelected(date);
                const inRange = isInRange(date);

                return (
                  <button
                    key={date.format('YYYY-MM-DD')}
                    className={cn(
                      'calendar-day-round',
                      {
                        'selected': selected,
                        'in-range': inRange,
                      }
                    )}
                    style={{
                      backgroundColor: inRange 
                        ? 'var(--color-primary-alpha-10)' 
                        : selected 
                        ? 'var(--color-primary)' 
                        : undefined,
                      color: selected ? 'white' : !isCurrentMonth ? 'var(--text-muted)' : undefined,
                      opacity: !isCurrentMonth ? 0.5 : 1,
                    }}
                    onClick={() => handleDayClick(date)}
                    type="button"
                  >
                    {date.date()}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {mode === 'months' && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {months.map((month, index) => {
              const isCurrentMonth = viewDate.month() === index;
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
              );
            })}
          </div>
        )}

        {mode === 'years' && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {years.map((year) => {
              const isCurrentYear = viewDate.year() === year;
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
              );
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
          disabled={!tempStart}
        >
          OK
        </button>
      </div>
    </div>
  );
}

