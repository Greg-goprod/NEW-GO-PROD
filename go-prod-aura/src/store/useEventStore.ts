import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EventCore } from '@/api/eventsApi';

interface EventStore {
  // State
  currentEvent: EventCore | null;
  
  // Actions
  setCurrentEvent: (event: EventCore | null) => void;
  hydrateFromLocalStorage: () => void;
  clearCurrentEvent: () => void;
}

// Clés localStorage
const SELECTED_EVENT_ID_KEY = 'selected_event_id';
const CURRENT_EVENT_SNAPSHOT_KEY = 'current_event_snapshot';

export const useEventStore = create<EventStore>()(
  persist(
    (set) => ({
      // State initial
      currentEvent: null,

      // Actions
      setCurrentEvent: (event: EventCore | null) => {
        set({ currentEvent: event });
        
        if (event) {
          // Persister l'ID de l'évènement
          localStorage.setItem(SELECTED_EVENT_ID_KEY, event.id);
          
          // Persister un snapshot minimal pour l'affichage immédiat
          const snapshot = {
            id: event.id,
            name: event.name,
            color_hex: event.color_hex,
            start_date: event.start_date,
            end_date: event.end_date,
          };
          localStorage.setItem(CURRENT_EVENT_SNAPSHOT_KEY, JSON.stringify(snapshot));
          
          // Déclencher l'évènement global
          window.dispatchEvent(new CustomEvent('event-changed', {
            detail: { eventId: event.id, event }
          }));
          
          console.log('🎯 Évènement courant mis à jour:', event.name);
        } else {
          // Nettoyer localStorage si pas d'évènement
          localStorage.removeItem(SELECTED_EVENT_ID_KEY);
          localStorage.removeItem(CURRENT_EVENT_SNAPSHOT_KEY);
          
          // Déclencher l'évènement global
          window.dispatchEvent(new CustomEvent('event-changed', {
            detail: { eventId: null, event: null }
          }));
          
          console.log('🎯 Évènement courant effacé');
        }
      },

      hydrateFromLocalStorage: () => {
        try {
          const eventId = localStorage.getItem(SELECTED_EVENT_ID_KEY);
          const snapshotStr = localStorage.getItem(CURRENT_EVENT_SNAPSHOT_KEY);
          
          if (eventId && snapshotStr) {
            const snapshot = JSON.parse(snapshotStr);
            
            // Créer un EventCore minimal à partir du snapshot
            const eventCore: EventCore = {
              id: snapshot.id,
              company_id: '', // Sera rempli par l'API
              name: snapshot.name,
              slug: null,
              color_hex: snapshot.color_hex,
              start_date: snapshot.start_date,
              end_date: snapshot.end_date,
              notes: null,
              contact_artist_id: null,
              contact_tech_id: null,
              contact_press_id: null,
            };
            
            set({ currentEvent: eventCore });
            console.log('🔄 Évènement restauré depuis localStorage:', eventCore.name);
          } else {
            set({ currentEvent: null });
            console.log('🔄 Aucun évènement en localStorage');
          }
        } catch (error) {
          console.error('❌ Erreur lors de la restauration depuis localStorage:', error);
          set({ currentEvent: null });
        }
      },

      clearCurrentEvent: () => {
        set({ currentEvent: null });
        localStorage.removeItem(SELECTED_EVENT_ID_KEY);
        localStorage.removeItem(CURRENT_EVENT_SNAPSHOT_KEY);
        
        window.dispatchEvent(new CustomEvent('event-changed', {
          detail: { eventId: null, event: null }
        }));
        
        console.log('🎯 Évènement courant effacé');
      },
    }),
    {
      name: 'event-store',
      // Ne pas persister automatiquement le currentEvent complet
      // On gère manuellement avec hydrateFromLocalStorage
      partialize: () => ({}),
    }
  )
);

// Hook helper pour accéder facilement au store
export const useCurrentEvent = () => {
  const store = useEventStore();
  
  return {
    currentEvent: store.currentEvent,
    eventId: store.currentEvent?.id || null,
    companyId: store.currentEvent?.company_id || null,
    setCurrentEvent: store.setCurrentEvent,
    clearCurrentEvent: store.clearCurrentEvent,
    hydrateFromLocalStorage: store.hydrateFromLocalStorage,
  };
};
