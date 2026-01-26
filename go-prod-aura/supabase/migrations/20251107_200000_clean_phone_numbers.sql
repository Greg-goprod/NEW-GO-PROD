-- =============================================================================
-- Migration: Nettoyage et Standardisation des Numéros de Téléphone
-- Date: 2025-11-07
-- Description: Convertir tous les numéros au format E.164
-- =============================================================================

-- Fonction pour nettoyer un numéro de téléphone au format E.164
CREATE OR REPLACE FUNCTION clean_phone_number(
  phone_number text,
  default_country text DEFAULT 'CH'
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned text;
BEGIN
  -- Si le numéro est NULL ou vide, retourner NULL
  IF phone_number IS NULL OR trim(phone_number) = '' THEN
    RETURN NULL;
  END IF;

  -- Retirer tous les espaces, tirets, points, parenthèses
  cleaned := regexp_replace(phone_number, '[^0-9+]', '', 'g');
  
  -- Si le numéro ne commence pas par +, ajouter le préfixe du pays par défaut
  IF NOT cleaned ~ '^\+' THEN
    -- Détecter et ajouter le bon préfixe selon le format du numéro
    CASE
      -- Numéros suisses (0XX XXX XX XX)
      WHEN cleaned ~ '^0[0-9]{9}$' AND default_country = 'CH' THEN
        cleaned := '+41' || substring(cleaned from 2);
      
      -- Numéros français (0X XX XX XX XX)
      WHEN cleaned ~ '^0[0-9]{9}$' AND default_country = 'FR' THEN
        cleaned := '+33' || substring(cleaned from 2);
      
      -- Numéros UK (0XX XXXX XXXX)
      WHEN cleaned ~ '^0[0-9]{10}$' AND default_country = 'GB' THEN
        cleaned := '+44' || substring(cleaned from 2);
      
      -- Numéros US/CA (XXX XXX XXXX)
      WHEN cleaned ~ '^[0-9]{10}$' AND default_country IN ('US', 'CA') THEN
        cleaned := '+1' || cleaned;
      
      -- Numéros allemands (0XXX XXXXXXX)
      WHEN cleaned ~ '^0[0-9]{10,11}$' AND default_country = 'DE' THEN
        cleaned := '+49' || substring(cleaned from 2);
      
      -- Numéros italiens (0XX XXXX XXXX)
      WHEN cleaned ~ '^0[0-9]{9,10}$' AND default_country = 'IT' THEN
        cleaned := '+39' || substring(cleaned from 2);
      
      -- Numéros espagnols (XXX XXX XXX)
      WHEN cleaned ~ '^[0-9]{9}$' AND default_country = 'ES' THEN
        cleaned := '+34' || cleaned;
      
      -- Numéros belges (04XX XX XX XX)
      WHEN cleaned ~ '^0[0-9]{9}$' AND default_country = 'BE' THEN
        cleaned := '+32' || substring(cleaned from 2);
      
      -- Numéros néerlandais (0X XXXX XXXX)
      WHEN cleaned ~ '^0[0-9]{9}$' AND default_country = 'NL' THEN
        cleaned := '+31' || substring(cleaned from 2);
      
      -- Si aucun pattern ne correspond, essayer avec le pays par défaut (CH)
      WHEN cleaned ~ '^0[0-9]{9}$' THEN
        cleaned := '+41' || substring(cleaned from 2);
      
      ELSE
        -- Si le format n'est pas reconnu, retourner NULL (numéro invalide)
        RETURN NULL;
    END CASE;
  END IF;
  
  -- Valider que le numéro commence par + et a au moins 10 chiffres
  IF cleaned ~ '^\+[0-9]{10,15}$' THEN
    RETURN cleaned;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- =============================================================================
-- Nettoyage des numéros de téléphone dans crm_contacts
-- =============================================================================

DO $$
DECLARE
  v_total_contacts integer;
  v_contacts_with_phone integer;
  v_contacts_cleaned integer;
  v_contacts_failed integer;
  rec RECORD;
BEGIN
  -- Compter le total de contacts
  SELECT COUNT(*) INTO v_total_contacts FROM public.crm_contacts;
  
  -- Compter les contacts avec un numéro de téléphone
  SELECT COUNT(*) INTO v_contacts_with_phone 
  FROM public.crm_contacts 
  WHERE phone_mobile IS NOT NULL AND trim(phone_mobile) != '';
  
  RAISE NOTICE '======================================';
  RAISE NOTICE 'NETTOYAGE DES NUMÉROS DE TÉLÉPHONE';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Total de contacts: %', v_total_contacts;
  RAISE NOTICE 'Contacts avec téléphone: %', v_contacts_with_phone;
  RAISE NOTICE '';
  
  -- Nettoyer les numéros de téléphone mobile
  UPDATE public.crm_contacts
  SET phone_mobile = clean_phone_number(phone_mobile, 'CH')
  WHERE phone_mobile IS NOT NULL 
    AND trim(phone_mobile) != ''
    AND phone_mobile !~ '^\+[0-9]+$'; -- Seulement si pas déjà au format E.164
  
  -- Compter les numéros nettoyés avec succès
  SELECT COUNT(*) INTO v_contacts_cleaned 
  FROM public.crm_contacts 
  WHERE phone_mobile IS NOT NULL 
    AND phone_mobile ~ '^\+[0-9]{10,15}$';
  
  -- Compter les numéros qui n'ont pas pu être nettoyés
  SELECT COUNT(*) INTO v_contacts_failed 
  FROM public.crm_contacts 
  WHERE phone_mobile IS NOT NULL 
    AND trim(phone_mobile) != ''
    AND phone_mobile !~ '^\+[0-9]{10,15}$';
  
  RAISE NOTICE 'RÉSULTATS:';
  RAISE NOTICE '  ✓ Numéros nettoyés: %', v_contacts_cleaned;
  RAISE NOTICE '  ✗ Numéros invalides: %', v_contacts_failed;
  RAISE NOTICE '';
  
  -- Afficher les numéros qui n'ont pas pu être nettoyés (pour vérification manuelle)
  IF v_contacts_failed > 0 THEN
    RAISE NOTICE 'Numéros invalides nécessitant une correction manuelle:';
    FOR rec IN (
      SELECT id, first_name, last_name, phone_mobile 
      FROM public.crm_contacts 
      WHERE phone_mobile IS NOT NULL 
        AND trim(phone_mobile) != ''
        AND phone_mobile !~ '^\+[0-9]{10,15}$'
      LIMIT 20
    ) LOOP
      RAISE NOTICE '  - % % : %', rec.first_name, rec.last_name, rec.phone_mobile;
    END LOOP;
    
    IF v_contacts_failed > 20 THEN
      RAISE NOTICE '  ... et % autres', v_contacts_failed - 20;
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '======================================';
END $$;

-- =============================================================================
-- Nettoyage des numéros dans crm_companies (si applicable)
-- =============================================================================

DO $$
DECLARE
  v_total_companies integer;
  v_companies_with_phone integer;
  v_companies_cleaned integer;
  v_companies_failed integer;
  rec RECORD;
BEGIN
  -- Vérifier si la table crm_companies existe et a des colonnes de téléphone
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'crm_companies' 
      AND column_name = 'phone_main'
  ) THEN
    -- Compter le total d'entreprises
    SELECT COUNT(*) INTO v_total_companies FROM public.crm_companies;
    
    -- Compter les entreprises avec un numéro
    SELECT COUNT(*) INTO v_companies_with_phone 
    FROM public.crm_companies 
    WHERE phone_main IS NOT NULL AND trim(phone_main) != '';
    
    RAISE NOTICE '======================================';
    RAISE NOTICE 'NETTOYAGE DES NUMÉROS (ENTREPRISES)';
    RAISE NOTICE '======================================';
    RAISE NOTICE 'Total d''entreprises: %', v_total_companies;
    RAISE NOTICE 'Entreprises avec téléphone: %', v_companies_with_phone;
    RAISE NOTICE '';
    
    -- Nettoyer les numéros principaux
    UPDATE public.crm_companies
    SET phone_main = clean_phone_number(phone_main, 'CH')
    WHERE phone_main IS NOT NULL 
      AND trim(phone_main) != ''
      AND phone_main !~ '^\+[0-9]+$';
    
    -- Compter les résultats
    SELECT COUNT(*) INTO v_companies_cleaned 
    FROM public.crm_companies 
    WHERE phone_main IS NOT NULL 
      AND phone_main ~ '^\+[0-9]{10,15}$';
    
    SELECT COUNT(*) INTO v_companies_failed 
    FROM public.crm_companies 
    WHERE phone_main IS NOT NULL 
      AND trim(phone_main) != ''
      AND phone_main !~ '^\+[0-9]{10,15}$';
    
    RAISE NOTICE 'RÉSULTATS:';
    RAISE NOTICE '  ✓ Numéros nettoyés: %', v_companies_cleaned;
    RAISE NOTICE '  ✗ Numéros invalides: %', v_companies_failed;
    RAISE NOTICE '';
    RAISE NOTICE '======================================';
  END IF;
END $$;

-- =============================================================================
-- Commentaires
-- =============================================================================

COMMENT ON FUNCTION clean_phone_number IS 'Nettoie et standardise un numéro de téléphone au format E.164 (+41791234567)';

-- =============================================================================
-- Fin de la migration
-- =============================================================================

