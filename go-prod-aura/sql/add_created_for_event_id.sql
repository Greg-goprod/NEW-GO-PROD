-- ============================================
-- AJOUT DE created_for_event_id AUX ENTITÉS
-- ============================================
-- Ce script ajoute la colonne created_for_event_id à la table artists
-- pour tracker l'événement d'origine lors de la création.
-- La colonne est nullable pour les entités créées avant cette modification.

-- ============================================
-- 1. Ajouter la colonne created_for_event_id à artists
-- ============================================
DO $$
BEGIN
    -- Vérifier si la colonne n'existe pas déjà
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'artists' 
        AND column_name = 'created_for_event_id'
    ) THEN
        ALTER TABLE public.artists 
            ADD COLUMN created_for_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Colonne created_for_event_id ajoutée à la table artists';
    ELSE
        RAISE NOTICE '⚠️  La colonne created_for_event_id existe déjà dans artists';
    END IF;
END $$;

-- ============================================
-- 2. Créer un index pour améliorer les performances
-- ============================================
CREATE INDEX IF NOT EXISTS idx_artists_created_for_event_id 
ON public.artists(created_for_event_id);

-- ============================================
-- 3. Ajouter un commentaire explicatif
-- ============================================
COMMENT ON COLUMN public.artists.created_for_event_id IS 
'ID de l''événement dans lequel cet artiste a été créé initialement. NULL si créé avant cette fonctionnalité ou sans contexte événementiel. L''artiste reste réutilisable pour tous les événements de la company.';

-- ============================================
-- 4. Résumé des modifications
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Migration terminée avec succès';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Modifications appliquées:';
    RAISE NOTICE '  - Colonne created_for_event_id ajoutée à artists';
    RAISE NOTICE '  - Index créé sur created_for_event_id';
    RAISE NOTICE '  - Commentaire ajouté pour documentation';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Notes:';
    RAISE NOTICE '  - La colonne est nullable (pour compatibilité)';
    RAISE NOTICE '  - Les artistes restent réutilisables pour tous les événements';
    RAISE NOTICE '  - Seul l''événement d''origine est tracké';
END $$;


