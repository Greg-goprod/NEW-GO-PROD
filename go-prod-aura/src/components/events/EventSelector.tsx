import { useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw } from 'lucide-react';
import { useEventStore } from '@/store/useEventStore';

export function EventSelector() {
  const navigate = useNavigate();
  const currentEvent = useEventStore((state) => state.currentEvent);

  // Formater le range de dates
  const formatDateRange = (startDateStr: string | null | undefined, endDateStr: string | null | undefined) => {
    if (!startDateStr || !endDateStr) return '';
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    const startDay = String(startDate.getDate()).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');
    const month = String(endDate.getMonth() + 1).padStart(2, '0');
    const year = endDate.getFullYear();
    
    return `${startDay} au ${endDay}.${month}.${year}`;
  };

  // Aller à la page de sélection d'événement
  const handleChangeEvent = () => {
    navigate('/app/select-event');
  };

  // Si aucun événement sélectionné
  if (!currentEvent) {
    return (
      <button
        onClick={handleChangeEvent}
        className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/20 transition-colors"
      >
        <Calendar className="w-4 h-4 text-yellow-500" />
        <span className="text-sm text-yellow-400">Sélectionner un événement</span>
      </button>
    );
  }

  const dateRange = formatDateRange(currentEvent.start_date, currentEvent.end_date);

  return (
    <button
      onClick={handleChangeEvent}
      className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
    >
      {/* Indicateur couleur */}
      <div
        className="w-2 h-8 rounded-full flex-shrink-0"
        style={{ backgroundColor: currentEvent.color_hex || '#8B5CF6' }}
      />
      
      {/* Info événement */}
      <div className="text-left">
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {currentEvent.name}
        </div>
        {dateRange && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {dateRange}
          </div>
        )}
      </div>
      
      {/* Icône changement */}
      <RefreshCw className="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors ml-2" />
    </button>
  );
}
