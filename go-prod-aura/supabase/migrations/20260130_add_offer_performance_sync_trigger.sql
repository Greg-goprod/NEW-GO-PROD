-- Migration: Ajout du trigger de synchronisation offers -> artist_performances
-- Date: 2026-01-30
-- Description: 
--   Cette migration ajoute un système de synchronisation automatique entre les tables
--   'offers' et 'artist_performances' via un trigger PostgreSQL.
--   
--   Avant: Les données financières devaient être synchronisées manuellement par le code JS
--   Après: Le trigger DB garantit la cohérence des données automatiquement
--
-- Champs synchronisés:
--   - fee_amount (depuis amount_display)
--   - fee_currency (depuis currency)
--   - commission_percentage (depuis agency_commission_pct)
--   - fee_is_net (depuis amount_is_net)
--   - subject_to_withholding_tax
--   - prod_fee_amount, backline_fee_amount, buyout_hotel_amount, etc.
--   - booking_status (mappé depuis le status de l'offre)

-- 1. Ajouter la colonne performance_id dans offers (FK vers artist_performances)
ALTER TABLE offers ADD COLUMN IF NOT EXISTS performance_id UUID REFERENCES artist_performances(id) ON DELETE SET NULL;

-- 2. Créer la fonction de synchronisation
CREATE OR REPLACE FUNCTION sync_performance_from_offer()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne synchroniser que si performance_id est défini
  IF NEW.performance_id IS NOT NULL THEN
    UPDATE artist_performances SET
      fee_amount = NEW.amount_display,
      fee_currency = NEW.currency,
      commission_percentage = NEW.agency_commission_pct,
      fee_is_net = NEW.amount_is_net,
      subject_to_withholding_tax = NEW.subject_to_withholding_tax,
      prod_fee_amount = NEW.prod_fee_amount,
      backline_fee_amount = NEW.backline_fee_amount,
      buyout_hotel_amount = NEW.buyout_hotel_amount,
      buyout_meal_amount = NEW.buyout_meal_amount,
      flight_contribution_amount = NEW.flight_contribution_amount,
      technical_fee_amount = NEW.technical_fee_amount,
      -- Mettre à jour le booking_status selon le statut de l'offre
      booking_status = CASE 
        WHEN NEW.status = 'draft' THEN 'offre_a_faire'::booking_status
        WHEN NEW.status = 'ready_to_send' THEN 'offre_envoyee'::booking_status
        WHEN NEW.status = 'sent' THEN 'offre_envoyee'::booking_status
        WHEN NEW.status = 'accepted' THEN 'offre_acceptee'::booking_status
        WHEN NEW.status = 'rejected' THEN 'offre_rejetee'::booking_status
        ELSE booking_status -- Garder le statut actuel si non reconnu
      END,
      updated_at = NOW()
    WHERE id = NEW.performance_id;
    
    RAISE NOTICE '[TRIGGER] Performance % synchronisée depuis offre %', NEW.performance_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Créer le trigger
DROP TRIGGER IF EXISTS trigger_sync_offer_to_performance ON offers;

CREATE TRIGGER trigger_sync_offer_to_performance
AFTER INSERT OR UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION sync_performance_from_offer();

-- 4. Lier les offres existantes à leurs performances (one-time migration)
-- Note: Cette requête lie les offres aux performances basées sur artist_id + event_id
UPDATE offers o
SET performance_id = ap.id
FROM artist_performances ap
WHERE o.artist_id = ap.artist_id 
  AND o.event_id = ap.event_id
  AND o.performance_id IS NULL;

-- 5. Index pour améliorer les performances des jointures
CREATE INDEX IF NOT EXISTS idx_offers_performance_id ON offers(performance_id);

COMMENT ON COLUMN offers.performance_id IS 'FK vers artist_performances - synchronisé automatiquement par trigger';
COMMENT ON FUNCTION sync_performance_from_offer() IS 'Synchronise les données financières de offers vers artist_performances';
