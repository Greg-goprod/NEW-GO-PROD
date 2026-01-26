-- Migration: Ajouter les champs pour le modal de performance
-- Phase 1 - Option B (Recommandé)
-- 
-- Champs ajoutés:
-- - rejection_reason: Raison du rejet d'une offre
-- - rejection_date: Date du rejet
-- - notes: Notes internes pour l'équipe
-- - is_confirmed: Artiste a confirmé sa présence
-- - confirmed_at: Date de confirmation

DO $$
BEGIN
    -- 1. Ajouter rejection_reason
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.artist_performances
        ADD COLUMN rejection_reason TEXT NULL;
        
        RAISE NOTICE '✅ Colonne rejection_reason ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne rejection_reason existe déjà';
    END IF;

    -- 2. Ajouter rejection_date
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'rejection_date'
    ) THEN
        ALTER TABLE public.artist_performances
        ADD COLUMN rejection_date TIMESTAMPTZ NULL;
        
        RAISE NOTICE '✅ Colonne rejection_date ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne rejection_date existe déjà';
    END IF;

    -- 3. Ajouter notes
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.artist_performances
        ADD COLUMN notes TEXT NULL;
        
        RAISE NOTICE '✅ Colonne notes ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne notes existe déjà';
    END IF;

    -- 4. Ajouter is_confirmed
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'is_confirmed'
    ) THEN
        ALTER TABLE public.artist_performances
        ADD COLUMN is_confirmed BOOLEAN DEFAULT false NOT NULL;
        
        RAISE NOTICE '✅ Colonne is_confirmed ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne is_confirmed existe déjà';
    END IF;

    -- 5. Ajouter confirmed_at
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'confirmed_at'
    ) THEN
        ALTER TABLE public.artist_performances
        ADD COLUMN confirmed_at TIMESTAMPTZ NULL;
        
        RAISE NOTICE '✅ Colonne confirmed_at ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne confirmed_at existe déjà';
    END IF;

    RAISE NOTICE '🎉 Migration terminée avec succès !';
END $$;

-- Vérification finale : afficher la structure de la table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'artist_performances'
  AND column_name IN (
    'rejection_reason',
    'rejection_date',
    'notes',
    'is_confirmed',
    'confirmed_at'
  )
ORDER BY column_name;

