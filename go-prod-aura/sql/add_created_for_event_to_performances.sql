-- Migration: Ajouter created_for_event_id à la table artist_performances
-- Cette colonne permet de tracker l'événement d'origine pour chaque performance

DO $$
BEGIN
    -- Vérifier si la colonne existe déjà
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'created_for_event_id'
    ) THEN
        -- Ajouter la colonne created_for_event_id
        ALTER TABLE public.artist_performances
        ADD COLUMN created_for_event_id UUID NULL;

        -- Ajouter une contrainte de clé étrangère vers la table events
        ALTER TABLE public.artist_performances
        ADD CONSTRAINT fk_performance_created_for_event
        FOREIGN KEY (created_for_event_id)
        REFERENCES public.events(id)
        ON DELETE SET NULL;

        -- Créer un index pour optimiser les recherches
        CREATE INDEX IF NOT EXISTS idx_performances_created_for_event_id 
        ON public.artist_performances(created_for_event_id);

        -- Initialiser avec l'event_id actuel pour les performances existantes
        -- (via la relation event_day_id -> event_days -> event_id)
        UPDATE public.artist_performances ap
        SET created_for_event_id = ed.event_id
        FROM public.event_days ed
        WHERE ap.event_day_id = ed.id
          AND ap.created_for_event_id IS NULL;

        RAISE NOTICE '✅ Colonne created_for_event_id ajoutée à artist_performances avec FK, index et données migrées.';
    ELSE
        RAISE NOTICE '⚠️ Colonne created_for_event_id existe déjà dans artist_performances.';
    END IF;
END $$;

-- Vérification
SELECT 
    COUNT(*) as total_performances,
    COUNT(created_for_event_id) as with_tracking
FROM public.artist_performances;


