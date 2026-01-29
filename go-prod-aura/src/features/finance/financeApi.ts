/**
 * API pour la gestion des factures
 * Toutes les opérations sont filtrées par company_id et event_id
 */

import { supabase } from '@/lib/supabaseClient';
import type {
  Invoice,
  InvoiceWithRelations,
  InvoiceFormData,
  InvoiceCategory,
  InvoiceCategoryFormData,
  InvoiceFile,
  InvoiceFilters,
  InvoiceSort,
  FinanceKpis,
  DailyFinanceKpis,
  FinanceSelectOptions,
  CurrencyCode,
  InvoiceStatus,
} from './financeTypes';

// =============================================================================
// FACTURES - CRUD
// =============================================================================

/**
 * Récupère la liste des factures avec les données jointes
 */
export async function fetchInvoices(params: {
  companyId: string;
  eventId: string;
  filters?: InvoiceFilters;
  sort?: InvoiceSort;
}): Promise<InvoiceWithRelations[]> {
  const { companyId, eventId, filters, sort } = params;

  // 1. Récupérer les factures existantes
  let query = supabase
    .from('invoices')
    .select(`
      *,
      supplier:crm_companies!supplier_id(id, company_name),
      artist:artists!artist_id(id, name),
      booking:offers!booking_id(id, artist_name, date_time),
      category:invoice_categories!category_id(id, name),
      payments(amount),
      invoice_files(id)
    `)
    .eq('company_id', companyId)
    .eq('event_id', eventId);

  // Appliquer les filtres (sauf pour to_receive qui inclut les virtuelles)
  const filteringToReceive = filters?.status === 'to_receive';
  
  if (filters) {
    if (filters.status && filters.status !== 'all' && !filteringToReceive) {
      query = query.eq('status', filters.status);
    }
    if (filters.artist_id && filters.artist_id !== 'all') {
      query = query.eq('artist_id', filters.artist_id);
    }
    if (filters.supplier_id && filters.supplier_id !== 'all') {
      query = query.eq('supplier_id', filters.supplier_id);
    }
    if (filters.category_id && filters.category_id !== 'all') {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.currency && filters.currency !== 'all') {
      query = query.eq('currency', filters.currency);
    }
    if (filters.overdue_only) {
      const today = new Date().toISOString().split('T')[0];
      query = query.lt('due_date', today).not('status', 'in', '("paid","canceled")');
    }
    if (filters.search) {
      query = query.or(`reference.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }
  }

  // Appliquer le tri
  if (sort) {
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });
  } else {
    query = query.order('due_date', { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erreur fetchInvoices:', error);
    throw new Error(error.message);
  }

  // 2. Récupérer les offres acceptées pour créer des lignes virtuelles "À recevoir"
  const { data: acceptedOffers, error: offersError } = await supabase
    .from('offers')
    .select(`
      id,
      artist_id,
      artist_name,
      amount_gross,
      currency,
      booking_agency_id,
      date_time
    `)
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .eq('status', 'accepted');

  if (offersError) {
    console.error('Erreur fetch accepted offers:', offersError);
    // Ne pas bloquer, continuer sans les virtuelles
  }

  // 3. Identifier les offres qui ont déjà une facture associée
  const invoiceBookingIds = new Set(
    (data || [])
      .filter((inv: any) => inv.booking_id)
      .map((inv: any) => inv.booking_id)
  );

  // 4. Créer les lignes virtuelles pour les offres acceptées sans facture
  const virtualInvoices: InvoiceWithRelations[] = (acceptedOffers || [])
    .filter((offer) => !invoiceBookingIds.has(offer.id))
    .map((offer) => ({
      // ID virtuel basé sur l'offer_id pour permettre l'identification
      id: `virtual-${offer.id}`,
      company_id: companyId,
      event_id: eventId,
      supplier_id: offer.booking_agency_id || '',
      reference: '',
      amount_excl: null,
      amount_incl: offer.amount_gross || 0,
      currency: (offer.currency || 'EUR') as CurrencyCode,
      due_date: '', // Pas de date d'échéance pour une facture non reçue
      tax_treatment: 'net' as const,
      artist_id: offer.artist_id || null,
      booking_id: offer.id,
      category_id: null,
      notes: null,
      status: 'to_receive' as InvoiceStatus,
      external_status: null,
      created_at: undefined,
      updated_at: undefined,
      // Données calculées
      supplier_name: '',
      artist_name: offer.artist_name || null,
      booking_name: offer.artist_name || null,
      category_name: null,
      payments_sum: 0,
      outstanding_amount: offer.amount_gross || 0,
      has_invoice_file: false,
      virtual: true, // Marqueur pour identifier les lignes virtuelles
      // Date de l'offre pour le groupement par jour
      offer_date: offer.date_time ? offer.date_time.split('T')[0] : null,
    }));

  // 5. Transformer les factures existantes
  const realInvoices: InvoiceWithRelations[] = (data || []).map((invoice: any) => {
    const paymentsSum = (invoice.payments || []).reduce(
      (sum: number, p: { amount: number }) => sum + (p.amount || 0),
      0
    );

    // Extraire la date de l'offre liée si disponible
    const offerDateTime = invoice.booking?.date_time;
    const offerDate = offerDateTime ? offerDateTime.split('T')[0] : null;

    return {
      ...invoice,
      supplier_name: invoice.supplier?.company_name || 'Inconnu',
      artist_name: invoice.artist?.name || null,
      booking_name: invoice.booking?.artist_name || null,
      category_name: invoice.category?.name || null,
      payments_sum: paymentsSum,
      outstanding_amount: (invoice.amount_incl || 0) - paymentsSum,
      has_invoice_file: (invoice.invoice_files || []).length > 0,
      virtual: false,
      // Date de l'offre pour le groupement par jour
      offer_date: offerDate,
      // Nettoyer les relations
      supplier: undefined,
      artist: undefined,
      booking: undefined,
      category: undefined,
      payments: undefined,
      invoice_files: undefined,
    };
  });

  // 6. Combiner et filtrer si nécessaire
  let result = [...virtualInvoices, ...realInvoices];

  // Si on filtre par to_receive, ne garder que les virtuelles et les to_receive réelles
  if (filteringToReceive) {
    result = result.filter((inv) => inv.status === 'to_receive');
  }

  // Appliquer la recherche aux virtuelles aussi
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter((inv) =>
      inv.virtual
        ? inv.artist_name?.toLowerCase().includes(searchLower)
        : true // Les réelles sont déjà filtrées par la requête
    );
  }

  // Appliquer le filtre artiste aux virtuelles
  if (filters?.artist_id && filters.artist_id !== 'all') {
    result = result.filter((inv) =>
      inv.virtual
        ? inv.artist_id === filters.artist_id
        : true
    );
  }

  return result;
}

/**
 * Récupère une facture par son ID
 */
export async function fetchInvoiceById(invoiceId: string): Promise<InvoiceWithRelations | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      supplier:crm_companies!supplier_id(id, company_name),
      artist:artists!artist_id(id, name),
      booking:offers!booking_id(id, artist_name),
      category:invoice_categories!category_id(id, name),
      payments(amount),
      invoice_files(id, kind, file_path)
    `)
    .eq('id', invoiceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }

  if (!data) return null;

  const paymentsSum = (data.payments || []).reduce(
    (sum: number, p: { amount: number }) => sum + (p.amount || 0),
    0
  );

  return {
    ...data,
    supplier_name: data.supplier?.company_name || 'Inconnu',
    artist_name: data.artist?.name || null,
    booking_name: data.booking?.artist_name || null,
    category_name: data.category?.name || null,
    payments_sum: paymentsSum,
    outstanding_amount: (data.amount_incl || 0) - paymentsSum,
    has_invoice_file: (data.invoice_files || []).length > 0,
  };
}

/**
 * Crée une nouvelle facture
 */
export async function createInvoice(params: {
  companyId: string;
  eventId: string;
  data: InvoiceFormData;
  file?: File | null;
}): Promise<Invoice> {
  const { companyId, eventId, data, file } = params;

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      company_id: companyId,
      event_id: eventId,
      ...data,
    })
    .select()
    .single();

  if (error) {
    console.error('Erreur createInvoice:', error);
    throw new Error(error.message);
  }

  // Upload du fichier PDF si fourni
  if (file && invoice) {
    await uploadInvoiceFile(invoice.id, file, 'invoice');
  }

  // Log de l'action
  await logInvoiceActivity({
    invoiceId: invoice.id,
    companyId,
    eventId,
    action: 'created',
    meta: { reference: data.reference },
  });

  return invoice;
}

/**
 * Met à jour une facture existante
 */
export async function updateInvoice(params: {
  invoiceId: string;
  companyId: string;
  eventId: string;
  data: Partial<InvoiceFormData>;
}): Promise<Invoice> {
  const { invoiceId, companyId, eventId, data } = params;

  const { data: invoice, error } = await supabase
    .from('invoices')
    .update(data)
    .eq('id', invoiceId)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) {
    console.error('Erreur updateInvoice:', error);
    throw new Error(error.message);
  }

  // Log de l'action
  await logInvoiceActivity({
    invoiceId,
    companyId,
    eventId,
    action: 'updated',
    meta: { changes: Object.keys(data) },
  });

  return invoice;
}

/**
 * Supprime une facture
 */
export async function deleteInvoice(params: {
  invoiceId: string;
  companyId: string;
  eventId: string;
}): Promise<void> {
  const { invoiceId, companyId, eventId: _eventId } = params;
  void _eventId; // Parameter kept for API consistency

  // Récupérer les fichiers avant suppression
  const { data: files } = await supabase
    .from('invoice_files')
    .select('file_path')
    .eq('invoice_id', invoiceId);

  // Supprimer les fichiers du storage
  if (files && files.length > 0) {
    const paths = files.map((f) => f.file_path);
    await supabase.storage.from('invoices').remove(paths);
  }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('company_id', companyId);

  if (error) {
    console.error('Erreur deleteInvoice:', error);
    throw new Error(error.message);
  }
}

/**
 * Met à jour le statut d'une facture
 */
export async function updateInvoiceStatus(params: {
  invoiceId: string;
  companyId: string;
  eventId: string;
  status: InvoiceStatus;
}): Promise<void> {
  const { invoiceId, companyId, eventId, status } = params;

  const { error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', invoiceId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(error.message);
  }

  await logInvoiceActivity({
    invoiceId,
    companyId,
    eventId,
    action: 'status_changed',
    meta: { new_status: status },
  });
}

// =============================================================================
// FICHIERS DE FACTURES
// =============================================================================

/**
 * Upload un fichier de facture
 */
export async function uploadInvoiceFile(
  invoiceId: string,
  file: File,
  kind: 'invoice' | 'credit' | 'receipt' | 'other' = 'invoice'
): Promise<InvoiceFile> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${invoiceId}/${kind}_${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(fileName, file);

  if (uploadError) {
    console.error('Erreur upload fichier:', uploadError);
    throw new Error(uploadError.message);
  }

  const { data: invoiceFile, error: dbError } = await supabase
    .from('invoice_files')
    .insert({
      invoice_id: invoiceId,
      kind,
      file_path: fileName,
    })
    .select()
    .single();

  if (dbError) {
    // Supprimer le fichier uploadé en cas d'erreur DB
    await supabase.storage.from('invoices').remove([fileName]);
    throw new Error(dbError.message);
  }

  return invoiceFile;
}

/**
 * Récupère l'URL signée d'un fichier de facture
 */
export async function getInvoiceFileUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('invoices')
    .createSignedUrl(filePath, 3600); // 1 heure

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

/**
 * Supprime un fichier de facture
 */
export async function deleteInvoiceFile(fileId: string): Promise<void> {
  const { data: file } = await supabase
    .from('invoice_files')
    .select('file_path')
    .eq('id', fileId)
    .single();

  if (file) {
    await supabase.storage.from('invoices').remove([file.file_path]);
  }

  await supabase.from('invoice_files').delete().eq('id', fileId);
}

/**
 * Liste les fichiers d'une facture
 */
export async function fetchInvoiceFiles(invoiceId: string): Promise<InvoiceFile[]> {
  const { data, error } = await supabase
    .from('invoice_files')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

// =============================================================================
// CATEGORIES
// =============================================================================

/**
 * Récupère les catégories de factures
 */
export async function fetchInvoiceCategories(companyId: string): Promise<InvoiceCategory[]> {
  const { data, error } = await supabase
    .from('invoice_categories')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Crée une catégorie de facture
 */
export async function createInvoiceCategory(params: {
  companyId: string;
  data: InvoiceCategoryFormData;
}): Promise<InvoiceCategory> {
  const { companyId, data } = params;

  const { data: category, error } = await supabase
    .from('invoice_categories')
    .insert({
      company_id: companyId,
      ...data,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return category;
}

// =============================================================================
// KPIs
// =============================================================================

/**
 * Calcule les KPIs financiers pour un événement
 * Inclut les offres acceptées sans facture comme "À recevoir"
 */
export async function fetchFinanceKpis(params: {
  companyId: string;
  eventId: string;
}): Promise<FinanceKpis> {
  const { companyId, eventId } = params;

  // 1. Récupérer les factures existantes
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      amount_incl,
      currency,
      status,
      due_date,
      booking_id,
      payments(amount)
    `)
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .not('status', 'eq', 'canceled');

  if (error) {
    throw new Error(error.message);
  }

  // 2. Récupérer les offres acceptées sans facture
  const { data: acceptedOffers } = await supabase
    .from('offers')
    .select('id, amount_gross, currency')
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .eq('status', 'accepted');

  // Identifier les offres qui ont déjà une facture
  const invoiceBookingIds = new Set(
    (invoices || [])
      .filter((inv: any) => inv.booking_id)
      .map((inv: any) => inv.booking_id)
  );

  // Offres acceptées sans facture = virtuelles "À recevoir"
  const virtualOffers = (acceptedOffers || []).filter(
    (offer) => !invoiceBookingIds.has(offer.id)
  );

  const today = new Date().toISOString().split('T')[0];

  const kpis: FinanceKpis = {
    toReceiveCount: 0,
    paidCount: 0,
    toPayCount: 0,
    partialCount: 0,
    overdueCount: 0,
    totalsByCurrency: {},
    toReceiveTotalsByCurrency: {},
    paidTotalsByCurrency: {},
    toPayTotalsByCurrency: {},
    overdueTotalsByCurrency: {},
  };

  // 3. Comptabiliser les offres virtuelles "À recevoir"
  for (const offer of virtualOffers) {
    const currency = (offer.currency || 'EUR') as CurrencyCode;
    const amount = offer.amount_gross || 0;

    kpis.toReceiveCount++;
    kpis.totalsByCurrency[currency] = (kpis.totalsByCurrency[currency] || 0) + amount;
    kpis.toReceiveTotalsByCurrency[currency] = (kpis.toReceiveTotalsByCurrency[currency] || 0) + amount;
  }

  // 4. Comptabiliser les factures existantes
  for (const invoice of invoices || []) {
    const currency = invoice.currency as CurrencyCode;
    const amount = invoice.amount_incl || 0;
    const paymentsSum = (invoice.payments || []).reduce(
      (sum: number, p: { amount: number }) => sum + (p.amount || 0),
      0
    );
    const outstanding = amount - paymentsSum;
    const isOverdue = invoice.due_date < today && invoice.status !== 'paid' && invoice.status !== 'to_receive';

    // Totaux globaux
    kpis.totalsByCurrency[currency] = (kpis.totalsByCurrency[currency] || 0) + amount;

    // Par statut
    if (invoice.status === 'to_receive') {
      kpis.toReceiveCount++;
      kpis.toReceiveTotalsByCurrency[currency] = (kpis.toReceiveTotalsByCurrency[currency] || 0) + amount;
    } else if (invoice.status === 'paid') {
      kpis.paidCount++;
      kpis.paidTotalsByCurrency[currency] = (kpis.paidTotalsByCurrency[currency] || 0) + amount;
    } else if (invoice.status === 'partial') {
      kpis.partialCount++;
      kpis.toPayTotalsByCurrency[currency] = (kpis.toPayTotalsByCurrency[currency] || 0) + outstanding;
    } else {
      // to_pay
      kpis.toPayCount++;
      kpis.toPayTotalsByCurrency[currency] = (kpis.toPayTotalsByCurrency[currency] || 0) + outstanding;
    }

    // En retard (uniquement pour to_pay et partial, pas pour to_receive)
    if (isOverdue) {
      kpis.overdueCount++;
      kpis.overdueTotalsByCurrency[currency] = (kpis.overdueTotalsByCurrency[currency] || 0) + outstanding;
    }
  }

  return kpis;
}

/**
 * Récupère les KPIs par jour d'événement
 */
export async function fetchDailyFinanceKpis(params: {
  companyId: string;
  eventId: string;
}): Promise<DailyFinanceKpis[]> {
  const { companyId, eventId } = params;

  // Récupérer les jours de l'événement
  const { data: event } = await supabase
    .from('events')
    .select('event_date')
    .eq('id', eventId)
    .single();

  if (!event) return [];

  // Récupérer les factures avec artiste
  const { data: _invoices } = await supabase
    .from('invoices')
    .select(`
      id,
      amount_incl,
      currency,
      status,
      due_date,
      artist_id,
      payments(amount)
    `)
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .not('status', 'eq', 'canceled')
    .not('artist_id', 'is', null);

  // TODO: Implémenter la logique par jour si nécessaire
  // Pour l'instant, retourner un tableau vide
  return [];
}

// =============================================================================
// OPTIONS POUR SELECTS
// =============================================================================

/**
 * Récupère toutes les options pour les formulaires
 */
export async function fetchSelectOptions(params: {
  companyId: string;
  eventId: string;
}): Promise<FinanceSelectOptions> {
  const { companyId, eventId } = params;

  // Fournisseurs (crm_companies avec is_supplier = true)
  const { data: suppliers } = await supabase
    .from('crm_companies')
    .select('id, company_name')
    .eq('company_id', companyId)
    .eq('is_supplier', true)
    .order('company_name');

  // Artistes liés à l'événement (via event_artists)
  const { data: eventArtists } = await supabase
    .from('event_artists')
    .select('artist:artists(id, name)')
    .eq('event_id', eventId);

  // Bookings (offers) pour l'événement
  const { data: bookings } = await supabase
    .from('offers')
    .select('id, artist_id, artist_name')
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .order('artist_name');

  // Récupérer aussi les artistes depuis les offres (au cas où event_artists est vide)
  const offerArtistIds = (bookings || [])
    .filter((b) => b.artist_id)
    .map((b) => b.artist_id);
  
  let offerArtists: { id: string; name: string }[] = [];
  if (offerArtistIds.length > 0) {
    const { data: artistsFromOffers } = await supabase
      .from('artists')
      .select('id, name')
      .in('id', offerArtistIds);
    offerArtists = artistsFromOffers || [];
  }

  // Catégories
  const { data: categories } = await supabase
    .from('invoice_categories')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  // Combiner les artistes de event_artists et des offres
  const artistsFromEventArtists = (eventArtists || [])
    .map((ea: any) => ea.artist)
    .filter(Boolean)
    .map((a: any) => ({ id: a.id, name: a.name }));
  
  // Fusionner et dédupliquer
  const allArtistsMap = new Map<string, { id: string; name: string }>();
  [...artistsFromEventArtists, ...offerArtists].forEach((a) => {
    if (a && a.id && !allArtistsMap.has(a.id)) {
      allArtistsMap.set(a.id, a);
    }
  });
  const allArtists = Array.from(allArtistsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    suppliers: (suppliers || []).map((s) => ({ id: s.id, name: s.company_name })),
    artists: allArtists,
    bookings: (bookings || []).map((b) => ({ id: b.id, name: b.artist_name || 'Sans nom' })),
    categories: categories || [],
    currencies: ['EUR', 'CHF', 'USD', 'GBP'],
  };
}

// =============================================================================
// ACTIVITY LOG
// =============================================================================

/**
 * Enregistre une action dans le journal d'activité
 */
async function logInvoiceActivity(params: {
  invoiceId: string;
  companyId: string;
  eventId: string;
  action: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const { invoiceId, companyId, eventId, action, meta } = params;

  try {
    await supabase.from('invoice_activity_log').insert({
      invoice_id: invoiceId,
      company_id: companyId,
      event_id: eventId,
      action,
      meta,
    });
  } catch (err) {
    // Log silencieux - ne pas bloquer l'opération principale
    console.error('Erreur log activité:', err);
  }
}

/**
 * Récupère l'historique d'activité d'une facture
 */
export async function fetchInvoiceActivityLog(invoiceId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('invoice_activity_log')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
