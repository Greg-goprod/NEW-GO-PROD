-- =============================================================================
-- MIGRATION MODULE FACTURATION (INVOICES & PAYMENTS)
-- Date : 2026-01-28
-- Description : Création des tables pour le système de facturation
--               Compatible multi-tenant (company_id + event_id)
-- =============================================================================

-- =============================================================================
-- 1. TABLE INVOICE_CATEGORIES (Catégories de factures)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_invoice_categories_company_id ON public.invoice_categories(company_id);

CREATE OR REPLACE TRIGGER trg_invoice_categories_updated_at
BEFORE UPDATE ON public.invoice_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.invoice_categories IS 'Catégories de factures par tenant';

-- =============================================================================
-- 2. TABLE INVOICES (Factures)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  
  -- Fournisseur (crm_companies avec is_supplier = true)
  supplier_id UUID NOT NULL REFERENCES public.crm_companies(id) ON DELETE RESTRICT,
  
  -- Référence facture
  reference VARCHAR(255) NOT NULL,
  
  -- Montants
  amount_excl DECIMAL(12,2),              -- Montant HT (optionnel)
  amount_incl DECIMAL(12,2) NOT NULL,     -- Montant TTC
  currency VARCHAR(3) DEFAULT 'EUR' CHECK (currency IN ('EUR', 'CHF', 'USD', 'GBP')),
  
  -- Échéance
  due_date DATE NOT NULL,
  
  -- Traitement fiscal
  tax_treatment VARCHAR(20) DEFAULT 'net' CHECK (tax_treatment IN ('net', 'subject_to_tax')),
  
  -- Relations optionnelles
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.invoice_categories(id) ON DELETE SET NULL,
  
  -- Notes
  notes TEXT,
  
  -- Statuts
  status VARCHAR(20) DEFAULT 'to_pay' CHECK (status IN ('draft', 'pending', 'approved', 'to_pay', 'partial', 'paid', 'canceled')),
  external_status VARCHAR(20) CHECK (external_status IN ('approved', 'pending', 'rejected')),
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte unicité : pas de doublon de facture par fournisseur
  UNIQUE(company_id, event_id, supplier_id, reference)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_event_id ON public.invoices(event_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON public.invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_artist_id ON public.invoices(artist_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

CREATE OR REPLACE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.invoices IS 'Factures fournisseurs par événement';
COMMENT ON COLUMN public.invoices.amount_excl IS 'Montant hors taxes (optionnel)';
COMMENT ON COLUMN public.invoices.amount_incl IS 'Montant TTC';
COMMENT ON COLUMN public.invoices.tax_treatment IS 'net = exonéré, subject_to_tax = soumis à TVA';

-- =============================================================================
-- 3. TABLE PAYMENTS (Paiements)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  
  -- Données paiement
  payment_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR' CHECK (currency IN ('EUR', 'CHF', 'USD', 'GBP')),
  
  -- Type de paiement
  payment_type VARCHAR(30) NOT NULL CHECK (payment_type IN ('virement_bancaire', 'cash', 'carte', 'cheque', 'other')),
  
  -- Notes et preuve
  notes TEXT,
  pop_url TEXT,                           -- URL preuve de paiement (POP)
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_event_id ON public.payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

CREATE OR REPLACE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.payments IS 'Paiements associés aux factures';
COMMENT ON COLUMN public.payments.pop_url IS 'URL vers la preuve de paiement (PDF/image)';

-- =============================================================================
-- 4. TABLE INVOICE_FILES (Fichiers attachés aux factures)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  
  -- Type de fichier
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('invoice', 'credit', 'receipt', 'other')),
  
  -- Chemin dans Supabase Storage
  file_path TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_files_invoice_id ON public.invoice_files(invoice_id);

COMMENT ON TABLE public.invoice_files IS 'Fichiers PDF attachés aux factures';
COMMENT ON COLUMN public.invoice_files.kind IS 'invoice=facture, credit=avoir, receipt=reçu, other=autre';

-- =============================================================================
-- 5. TABLE INVOICE_ACTIVITY_LOG (Journal d'activité)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  
  -- Action
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'payment_added', 'payment_updated', 'payment_deleted', 'file_uploaded', 'file_deleted', 'status_changed')),
  
  -- Données additionnelles
  meta JSONB,
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_activity_log_invoice_id ON public.invoice_activity_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_activity_log_company_id ON public.invoice_activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_activity_log_event_id ON public.invoice_activity_log(event_id);
CREATE INDEX IF NOT EXISTS idx_invoice_activity_log_created_at ON public.invoice_activity_log(created_at DESC);

COMMENT ON TABLE public.invoice_activity_log IS 'Journal des actions sur les factures';

-- =============================================================================
-- 6. STORAGE BUCKETS
-- =============================================================================
-- Bucket pour les factures PDF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les preuves de paiement
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 7. STORAGE POLICIES (RLS désactivé en dev, à activer en prod)
-- =============================================================================
-- Policy pour bucket invoices - authenticated users can manage
CREATE POLICY "Authenticated users can upload invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can view invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can update invoices"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can delete invoices"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'invoices');

-- Policy pour bucket payment-proofs
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated users can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated users can update payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated users can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');

-- =============================================================================
-- FIN DE LA MIGRATION
-- =============================================================================
