-- Migration: Ajouter les frais additionnels à artist_performances
-- 
-- Champs ajoutés:
-- - prod_fee_amount: Montant PROD FEE
-- - backline_fee_amount: Montant BACKLINE FEE
-- - buyout_hotel_amount: Montant BUY OUT HOTEL
-- - buyout_meal_amount: Montant BUY OUT MEAL
-- - flight_contribution_amount: Montant FLIGHT CONTRIBUTION
-- - technical_fee_amount: Montant TECHNICAL FEE

DO $$
BEGIN
    -- 1. Ajouter prod_fee_amount
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'prod_fee_amount'
    ) THEN
        ALTER TABLE public.artist_performances
        ADD COLUMN prod_fee_amount NUMERIC(12,2) NULL;
        
        RAISE NOTICE '✅ Colonne prod_fee_amount ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne prod_fee_amount existe déjà';
    END IF;

    -- 2. Ajouter backline_fee_amount
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'backline_fee_amount'
    ) THEN
        ALTER TABLE public.artist_performances
        ADD COLUMN backline_fee_amount NUMERIC(12,2) NULL;
        
        RAISE NOTICE '✅ Colonne backline_fee_amount ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne backline_fee_amount existe déjà';
    END IF;

    -- 3. Ajouter buyout_hotel_amount
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'buyout_hotel_amount'
    ) THEN
        ALTER TABLE public.artist_performances
        ADD COLUMN buyout_hotel_amount NUMERIC(12,2) NULL;
        
        RAISE NOTICE '✅ Colonne buyout_hotel_amount ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne buyout_hotel_amount existe déjà';
    END IF;

    -- 4. Ajouter buyout_meal_amount
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'buyout_meal_amount'
    ) THEN
        ALTER TABLE public.artist_performances
        ADD COLUMN buyout_meal_amount NUMERIC(12,2) NULL;
        
        RAISE NOTICE '✅ Colonne buyout_meal_amount ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne buyout_meal_amount existe déjà';
    END IF;

    -- 5. Ajouter flight_contribution_amount
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'flight_contribution_amount'
    ) THEN
        ALTER TABLE public.artist_performances
        ADD COLUMN flight_contribution_amount NUMERIC(12,2) NULL;
        
        RAISE NOTICE '✅ Colonne flight_contribution_amount ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne flight_contribution_amount existe déjà';
    END IF;

    -- 6. Ajouter technical_fee_amount
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'artist_performances' 
          AND column_name = 'technical_fee_amount'
    ) THEN
        ALTER TABLE public.artist_performances
        ADD COLUMN technical_fee_amount NUMERIC(12,2) NULL;
        
        RAISE NOTICE '✅ Colonne technical_fee_amount ajoutée';
    ELSE
        RAISE NOTICE '⚠️ Colonne technical_fee_amount existe déjà';
    END IF;

    RAISE NOTICE '🎉 Migration terminée avec succès !';
END $$;

-- Vérification finale : afficher la structure des nouvelles colonnes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'artist_performances'
  AND column_name IN (
    'prod_fee_amount',
    'backline_fee_amount',
    'buyout_hotel_amount',
    'buyout_meal_amount',
    'flight_contribution_amount',
    'technical_fee_amount'
  )
ORDER BY column_name;




