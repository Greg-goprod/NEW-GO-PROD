import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import { useToast } from '@/components/aura/ToastProvider';

export function useEventContext() {
  const { currentEvent, eventId, companyId, hasEvent } = useCurrentEvent();
  const { error: toastError } = useToast();

  const requireEvent = () => {
    if (!hasEvent) {
      toastError('Aucun évènement sélectionné. Veuillez sélectionner un évènement pour continuer.');
      throw new Error('NO_EVENT_SELECTED');
    }
    return true;
  };

  return {
    currentEvent,
    eventId,
    companyId,
    hasEvent,
    requireEvent,
  };
}

