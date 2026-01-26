-- Fix pour la synchronisation Spotify
-- Ce script corrige le problème de colonne manquante

-- Option 1: Ajouter la colonne spotify_updated_at si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'spotify_data' 
        AND column_name = 'spotify_updated_at'
    ) THEN
        ALTER TABLE spotify_data ADD COLUMN spotify_updated_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Option 2: Mettre à jour le RPC pour utiliser updated_at (déjà fait dans rpc_artists_for_spotify_sync.sql)
-- Le RPC utilise maintenant sd.updated_at au lieu de sd.spotify_updated_at

-- Vérification que la fonction existe
SELECT artists_for_spotify_sync('00000000-0000-0000-0000-000000000000'::uuid, 1);



