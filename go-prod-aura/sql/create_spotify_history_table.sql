-- Table pour stocker l'historique des données Spotify
-- Permet de suivre l'évolution des followers et de la popularité dans le temps

CREATE TABLE IF NOT EXISTS spotify_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  
  -- Données Spotify à suivre
  followers INTEGER,
  popularity INTEGER,
  
  -- Métadonnées
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Index pour optimiser les requêtes
  CONSTRAINT spotify_history_artist_recorded_unique UNIQUE (artist_id, recorded_at)
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_spotify_history_artist_id ON spotify_history(artist_id);
CREATE INDEX IF NOT EXISTS idx_spotify_history_recorded_at ON spotify_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_spotify_history_artist_recorded ON spotify_history(artist_id, recorded_at DESC);

-- Commentaires pour la documentation
COMMENT ON TABLE spotify_history IS 'Historique des statistiques Spotify (followers, popularité) pour suivre l''évolution dans le temps';
COMMENT ON COLUMN spotify_history.artist_id IS 'Référence vers l''artiste';
COMMENT ON COLUMN spotify_history.followers IS 'Nombre de followers Spotify à ce moment';
COMMENT ON COLUMN spotify_history.popularity IS 'Score de popularité Spotify (0-100) à ce moment';
COMMENT ON COLUMN spotify_history.recorded_at IS 'Date et heure de l''enregistrement des données';

-- RLS (Row Level Security) pour la sécurité multi-tenant
ALTER TABLE spotify_history ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs authentifiés peuvent voir l'historique
-- Note: Ajustez cette politique selon votre système d'authentification
CREATE POLICY "Users can view history"
ON spotify_history
FOR SELECT
USING (auth.role() = 'authenticated');

-- Politique : Système peut insérer l'historique (pour le cron)
CREATE POLICY "System can insert history"
ON spotify_history
FOR INSERT
WITH CHECK (true);

-- Vue pour obtenir les dernières statistiques avec variation
CREATE OR REPLACE VIEW spotify_stats_with_change AS
SELECT 
  a.id as artist_id,
  a.name,
  sd.followers as current_followers,
  sd.popularity as current_popularity,
  sd.updated_at as last_update,
  
  -- Dernière entrée historique (avant aujourd'hui)
  (
    SELECT followers 
    FROM spotify_history 
    WHERE artist_id = a.id 
      AND recorded_at < CURRENT_DATE
    ORDER BY recorded_at DESC 
    LIMIT 1
  ) as previous_followers,
  
  (
    SELECT popularity 
    FROM spotify_history 
    WHERE artist_id = a.id 
      AND recorded_at < CURRENT_DATE
    ORDER BY recorded_at DESC 
    LIMIT 1
  ) as previous_popularity,
  
  -- Calcul des variations
  CASE 
    WHEN (SELECT followers FROM spotify_history WHERE artist_id = a.id AND recorded_at < CURRENT_DATE ORDER BY recorded_at DESC LIMIT 1) IS NOT NULL
    THEN sd.followers - (SELECT followers FROM spotify_history WHERE artist_id = a.id AND recorded_at < CURRENT_DATE ORDER BY recorded_at DESC LIMIT 1)
    ELSE NULL
  END as followers_change,
  
  CASE 
    WHEN (SELECT popularity FROM spotify_history WHERE artist_id = a.id AND recorded_at < CURRENT_DATE ORDER BY recorded_at DESC LIMIT 1) IS NOT NULL
    THEN sd.popularity - (SELECT popularity FROM spotify_history WHERE artist_id = a.id AND recorded_at < CURRENT_DATE ORDER BY recorded_at DESC LIMIT 1)
    ELSE NULL
  END as popularity_change
  
FROM artists a
INNER JOIN spotify_data sd ON sd.artist_id = a.id
WHERE sd.followers IS NOT NULL;

COMMENT ON VIEW spotify_stats_with_change IS 'Vue combinant les stats actuelles avec les variations par rapport à la veille';

