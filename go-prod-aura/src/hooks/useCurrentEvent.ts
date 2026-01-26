import { useEffect, useCallback } from 'react';
import { useEventStore } from '@/store/useEventStore';

export interface CurrentEventHelpers {
  currentEvent: any;
  eventId: string | null;
  companyId: string | null;
  hasEvent: boolean;
  setCurrentEvent: (event: any) => void;
  clearCurrentEvent: () => void;
  requireEventGuard: () => void;
  onEventChange: (callback: (eventId: string | null) => void) => () => void;
}

/**
 * Hook principal pour gérer l'évènement courant
 * Fournit tous les helpers nécessaires pour les modules métiers
 */
export function useCurrentEvent(): CurrentEventHelpers {
  const currentEvent = useEventStore((state) => state.currentEvent);
  const setCurrentEvent = useEventStore((state) => state.setCurrentEvent);
  const clearCurrentEvent = useEventStore((state) => state.clearCurrentEvent);
  
  const eventId = currentEvent?.id || null;
  
  // Récupérer le companyId depuis localStorage (fallback)
  const companyId = currentEvent?.company_id || 
    localStorage.getItem('company_id') || 
    localStorage.getItem('auth_company_id') || 
    null;

  const hasEvent = Boolean(eventId);

  /**
   * Garde qui lève une erreur si pas d'évènement
   * Utilisé par les pages métiers pour afficher EmptyState
   */
  const requireEventGuard = useCallback(() => {
    if (!hasEvent) {
      throw new Error('NO_EVENT_SELECTED');
    }
  }, [hasEvent]);

  /**
   * Écoute les changements d'évènement
   * Retourne une fonction de nettoyage
   */
  const onEventChange = useCallback((callback: (eventId: string | null) => void) => {
    const handleEventChange = (event: CustomEvent) => {
      callback(event.detail.eventId);
    };

    window.addEventListener('event-changed', handleEventChange as EventListener);
    
    // Retourner la fonction de nettoyage
    return () => {
      window.removeEventListener('event-changed', handleEventChange as EventListener);
    };
  }, []);

  return {
    currentEvent,
    eventId,
    companyId,
    hasEvent,
    setCurrentEvent,
    clearCurrentEvent,
    requireEventGuard,
    onEventChange,
  };
}

/**
 * Hook spécialisé pour les modules métiers (Booking, Timeline, etc.)
 * Applique automatiquement le guard et gère les erreurs
 */
export function useEventRequired() {
  const { currentEvent, eventId, companyId, hasEvent, requireEventGuard } = useCurrentEvent();

  useEffect(() => {
    try {
      requireEventGuard();
    } catch (error) {
      // L'erreur sera gérée par les composants qui utilisent ce hook
      console.warn('⚠️ Module métier utilisé sans évènement sélectionné');
    }
  }, [requireEventGuard]);

  return {
    currentEvent,
    eventId,
    companyId,
    hasEvent,
    requireEventGuard,
  };
}

/**
 * Hook pour écouter les changements d'évènement
 * Utile pour recharger les données quand l'évènement change
 */
export function useEventChangeListener(callback: (eventId: string | null) => void) {
  const { onEventChange } = useCurrentEvent();

  useEffect(() => {
    const cleanup = onEventChange(callback);
    return cleanup;
  }, [onEventChange, callback]);
}
