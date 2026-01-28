import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/utils/slug';
import type {
  EventRow,
  EventCore,
  EventWithCounts,
  EventDayInput,
  EventDayRow,
  EventStageInput,
  EventStageRow,
  FullEvent,
  CreateEventPayload,
  UpdateEventPayload,
} from '@/types/event';

// Re-export des types pour compatibilité
export type {
  EventRow,
  EventCore,
  EventWithCounts,
  EventDayInput,
  EventDayRow,
  EventStageInput,
  EventStageRow,
  FullEvent,
  CreateEventPayload,
  UpdateEventPayload,
};

/**
 * Génère un slug via RPC ou fallback client
 */
export async function generateSlugServerSide(name: string): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('generate_slug', { input_text: name });
    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('RPC generate_slug non disponible, utilisation du fallback client:', err);
  }
  // Fallback
  return slugify(name);
}

/**
 * Récupère tous les évènements d'une entreprise
 */
export async function fetchEventsByCompany(companyId: string): Promise<EventRow[]> {
  if (!companyId) {
    throw new Error('company_id requis');
  }
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur fetchEventsByCompany:', error);
    throw error;
  }
  return data || [];
}

/**
 * Charge un évènement complet (event + days + stages)
 */
export async function loadFullEvent(eventId: string): Promise<FullEvent> {
  if (!eventId) {
    throw new Error('event_id requis');
  }

  // Event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError) {
    console.error('Erreur loadFullEvent (event):', eventError);
    throw eventError;
  }

  // Days
  const { data: days, error: daysError } = await supabase
    .from('event_days')
    .select('*')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true });

  if (daysError) {
    console.error('Erreur loadFullEvent (days):', daysError);
    throw daysError;
  }

  // Stages
  const { data: stages, error: stagesError } = await supabase
    .from('event_stages')
    .select('*')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true });

  if (stagesError) {
    console.error('Erreur loadFullEvent (stages):', stagesError);
    throw stagesError;
  }

  return {
    event: event as EventRow,
    days: (days || []) as EventDayRow[],
    stages: (stages || []) as EventStageRow[],
  };
}

/**
 * Crée un nouvel évènement
 */
export async function createEvent(data: Partial<EventRow>): Promise<string> {
  if (!data.company_id) {
    throw new Error('company_id requis');
  }
  if (!data.name) {
    throw new Error('name requis');
  }

  // Convertir '' → null
  const payload = {
    ...data,
    notes: data.notes || null,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    status: data.status || 'planned',
  };

  const { data: inserted, error } = await supabase
    .from('events')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('❌ Erreur createEvent:', error);
    console.error('📋 Payload envoyé:', payload);
    throw new Error(error.message || 'Erreur lors de la création de l\'événement');
  }

  return inserted.id;
}

/**
 * Met à jour un évènement existant
 */
export async function updateEvent(id: string, data: Partial<EventRow>): Promise<void> {
  if (!id) {
    throw new Error('id requis');
  }

  // Convertir '' → null
  const payload = {
    ...data,
    notes: data.notes || null,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
  };

  const { error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('Erreur updateEvent:', error);
    throw error;
  }
}

/**
 * Synchronise les jours d'un évènement (préserve les IDs existants pour garder les FK)
 * - Met à jour les jours existants (par date)
 * - Ajoute les nouveaux jours
 * - Supprime les jours qui ne sont plus dans la liste
 */
export async function replaceEventDays(eventId: string, days: EventDayInput[]): Promise<void> {
  if (!eventId) {
    throw new Error('event_id requis');
  }

  // 1. Récupérer les jours existants
  const { data: existingDays, error: fetchError } = await supabase
    .from('event_days')
    .select('id, date')
    .eq('event_id', eventId);

  if (fetchError) {
    console.error('Erreur replaceEventDays (fetch):', fetchError);
    throw fetchError;
  }

  // Créer un map date -> id des jours existants
  const existingDaysMap = new Map<string, string>();
  (existingDays || []).forEach((day) => {
    if (day.date) {
      existingDaysMap.set(day.date, day.id);
    }
  });

  // Dates des nouveaux jours
  const newDates = new Set(days.map((d) => d.date).filter(Boolean));

  // 2. Identifier les jours à supprimer (dates qui ne sont plus présentes)
  const daysToDelete: string[] = [];
  existingDaysMap.forEach((id, date) => {
    if (!newDates.has(date)) {
      daysToDelete.push(id);
    }
  });

  // 3. Supprimer les jours obsolètes
  if (daysToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('event_days')
      .delete()
      .in('id', daysToDelete);

    if (deleteError) {
      console.error('Erreur replaceEventDays (delete):', deleteError);
      throw deleteError;
    }
  }

  // 4. Mettre à jour ou insérer les jours
  for (let index = 0; index < days.length; index++) {
    const day = days[index];
    const existingId = day.date ? existingDaysMap.get(day.date) : null;

    const payload = {
      event_id: eventId,
      date: day.date || null,
      open_time: day.open_time || null,
      close_time: day.close_time || null,
      is_closing_day: day.is_closing_day || false,
      notes: day.notes || null,
      display_order: index + 1,
    };

    if (existingId) {
      // Mettre à jour le jour existant (préserve l'ID)
      const { error: updateError } = await supabase
        .from('event_days')
        .update(payload)
        .eq('id', existingId);

      if (updateError) {
        console.error('Erreur replaceEventDays (update):', updateError);
        throw updateError;
      }
    } else {
      // Insérer un nouveau jour
      const { error: insertError } = await supabase
        .from('event_days')
        .insert(payload);

      if (insertError) {
        console.error('Erreur replaceEventDays (insert):', insertError);
        throw insertError;
      }
    }
  }
}

/**
 * Remplace toutes les scènes d'un évènement (delete + insert)
 */
export async function replaceEventStages(eventId: string, stages: EventStageInput[]): Promise<void> {
  if (!eventId) {
    throw new Error('event_id requis');
  }

  // 1. Supprimer les anciennes scènes
  const { error: deleteError } = await supabase
    .from('event_stages')
    .delete()
    .eq('event_id', eventId);

  if (deleteError) {
    console.error('Erreur replaceEventStages (delete):', deleteError);
    throw deleteError;
  }

  // 2. Insérer les nouvelles scènes
  if (stages.length === 0) {
    return; // Pas de scènes à insérer
  }

  const payload = stages.map((stage, index) => ({
    event_id: eventId,
    name: stage.name,
    type: stage.type || null,
    specificity: stage.specificity || null,
    capacity: stage.capacity || null,
    display_order: index + 1,
  }));

  const { error: insertError } = await supabase
    .from('event_stages')
    .insert(payload);

  if (insertError) {
    console.error('Erreur replaceEventStages (insert):', insertError);
    throw insertError;
  }
}

/**
 * Supprime un évènement et toutes ses dépendances
 */
export async function deleteEvent(eventId: string): Promise<void> {
  if (!eventId) {
    throw new Error('event_id requis');
  }

  // Supprimer les jours et scènes (cascade devrait gérer, mais on le fait explicitement)
  await supabase.from('event_days').delete().eq('event_id', eventId);
  await supabase.from('event_stages').delete().eq('event_id', eventId);

  // Supprimer l'évènement
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error('Erreur deleteEvent:', error);
    throw error;
  }
}

/**
 * Liste tous les événements d'une compagnie avec compteurs
 * Wrapper vers la vue v_events_selector (utilisé par EventSelector)
 */
export async function listEvents(companyId?: string): Promise<EventWithCounts[]> {
  if (!companyId || String(companyId).trim() === '') {
    console.warn('⚠️ listEvents: companyId manquant');
    return [];
  }

  const { data, error } = await supabase
    .from('v_events_selector')
    .select('*')
    .eq('company_id', companyId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('❌ Erreur listEvents:', error);
    throw error;
  }

  return data || [];
}

/**
 * Récupère un événement par son ID (wrapper vers vue v_events_overview)
 * Utilisé par EventSelector pour récupérer les détails d'un événement
 */
export async function getEventById(id: string): Promise<EventCore | null> {
  if (!id || String(id).trim() === '') {
    console.warn('⚠️ getEventById: id manquant');
    return null;
  }

  const { data, error } = await supabase
    .from('v_events_overview')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ Erreur getEventById:', error);
    throw error;
  }

  return data;
}

/**
 * Crée un événement avec ses jours et scènes en une seule transaction
 * Alternative atomique à createEvent + replaceEventDays + replaceEventStages
 */
export async function createEventWithChildren(payload: CreateEventPayload): Promise<string> {
  if (!payload.company_id || String(payload.company_id).trim() === '') {
    throw new Error('company_id requis pour créer un événement');
  }

  if (!payload.name || String(payload.name).trim() === '') {
    throw new Error('Le nom de l\'événement est requis');
  }

  // 1. Créer l'événement principal
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .insert({
      company_id: payload.company_id,
      name: payload.name.trim(),
      slug: payload.slug || null,
      color_hex: payload.color_hex || '#3b82f6',
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      notes: payload.notes || null,
      status: payload.status || 'planned',
      contact_artist_id: payload.contact_artist_id || null,
      contact_tech_id: payload.contact_tech_id || null,
      contact_press_id: payload.contact_press_id || null,
    })
    .select('id')
    .single();

  if (eventError) {
    console.error('❌ Erreur création événement:', eventError);
    throw eventError;
  }

  const eventId = eventData.id;

  // 2. Créer les jours si fournis
  if (payload.days && payload.days.length > 0) {
    const daysToInsert = payload.days.map((day, index) => ({
      event_id: eventId,
      date: day.date || null,
      open_time: day.open_time || null,
      close_time: day.close_time || null,
      is_closing_day: day.is_closing_day || false,
      notes: day.notes || null,
      display_order: index + 1,
    }));

    const { error: daysError } = await supabase
      .from('event_days')
      .insert(daysToInsert);

    if (daysError) {
      console.error('❌ Erreur création jours:', daysError);
      throw daysError;
    }
  }

  // 3. Créer les scènes si fournies
  if (payload.stages && payload.stages.length > 0) {
    const stagesToInsert = payload.stages.map((stage, index) => ({
      event_id: eventId,
      name: stage.name.trim(),
      type: stage.type || null,
      specificity: stage.specificity || null,
      capacity: stage.capacity || null,
      display_order: stage.display_order ?? index + 1,
    }));

    const { error: stagesError } = await supabase
      .from('event_stages')
      .insert(stagesToInsert);

    if (stagesError) {
      console.error('❌ Erreur création scènes:', stagesError);
      throw stagesError;
    }
  }

  return eventId;
}

/**
 * Récupère les artistes programmés pour un événement
 */
export async function fetchEventArtists(eventId: string) {
  const { data, error } = await supabase
    .from('event_artists')
    .select(`
      *,
      artist_id,
      performance_date,
      artists (
        id,
        name
      ),
      event_days (
        id,
        name,
        date
      )
    `)
    .eq('event_id', eventId)
    .order('performance_date', { ascending: true });

  if (error) throw error;
  
  return data.map((item: any) => ({
    ...item,
    artist_name: item.artists?.name || 'Unknown Artist'
  }));
}

