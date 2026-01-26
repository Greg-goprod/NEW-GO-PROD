-- Migration: Ajouter le champ commission à artist_performances
-- 
-- Champ ajouté:
-- - commission_percentage: Pourcentage de commission (0-100)

DO $$
BEGIN
    -- Ajouter commission_percentage
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'commission_percentage'
    ) THEN
        ALTER TABLE public.artist_performances
        ADD COLUMN commission_percentage NUMERIC(5,2) NULL
        CHECK (commission_percentage >= 0 AND commission_percentage <= 100);
        
        RAISE NOTICE '✅ Colonne commission_percentage ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne commission_percentage existe déjà';
    END IF;

    RAISE NOTICE '🎉 Migration terminée avec succès !';
END $$;

-- Vérification finale
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'artist_performances'
  AND column_name = 'commission_percentage'
ORDER BY column_name;

