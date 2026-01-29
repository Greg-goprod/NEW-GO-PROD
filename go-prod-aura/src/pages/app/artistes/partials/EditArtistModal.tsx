import { useState } from "react";
import { Music, Search, Bug } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/aura/Modal";
import SpotifySearchModal from "./SpotifySearchModal";
import { supabase } from "../../../../lib/supabaseClient";

interface SpotifyArtist {
  id: string;
  name: string;
  external_urls: { spotify: string };
  images: Array<{ url: string; height: number; width: number }>;
  popularity: number;
  genres: string[];
  followers: { total: number };
}

interface Artist {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  spotify_data?: {
    image_url?: string;
    followers?: number;
    popularity?: number;
    external_url?: string;
    spotify_id?: string;
    genres?: string[];
  };
}

type Props = {
  artist: Artist;
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditArtistModal({ artist, companyId, onClose, onSaved }: Props) {
  const [name, setName] = useState(artist.name);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [selectedSpotifyArtist, setSelectedSpotifyArtist] = useState<SpotifyArtist | null>(null);

  const canSave = name.trim().length > 0;

  const handleSpotifySearch = () => {
    if (!name.trim()) {
      setErr("Veuillez d'abord saisir un nom d'artiste");
      return;
    }
    setShowSpotifySearch(true);
  };

  const handleSpotifySelect = (spotifyArtist: SpotifyArtist) => {
    setSelectedSpotifyArtist(spotifyArtist);
    setName(spotifyArtist.name); // Mettre à jour le nom avec celui de Spotify
  };

  const handleDebug = async () => {
    console.log("🐛 === DÉBUT DIAGNOSTIC ===");
    console.log("Environment:", import.meta.env);
    console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
    console.log("Company ID:", companyId);
    
    // Diagnostic des données Spotify
    console.log("🎵 === DIAGNOSTIC SPOTIFY ===");
    try {
      const { data: artists, error } = await supabase
        .from('artists')
        .select('*, spotify_data(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error("❌ Erreur lors de la récupération des artistes:", error);
      } else {
        console.log("✅ Artistes récupérés:", artists);
        artists?.forEach(artist => {
          console.log(`🎤 ${artist.name}:`, {
            hasSpotifyData: !!artist.spotify_data,
            spotifyData: artist.spotify_data
          });
        });
      }
    } catch (err) {
      console.error("❌ Erreur diagnostic Spotify:", err);
    }
    
    console.log("🐛 === FIN DIAGNOSTIC ===");
  };

  const onSubmit = async () => {
    console.log("🚀 Début de la modification d'artiste");
    console.log("📝 Données:", { 
      name, 
      companyId, 
      selectedSpotifyArtist: !!selectedSpotifyArtist,
      selectedSpotifyArtistData: selectedSpotifyArtist 
    });
    
    setErr(null);
    if (!canSave) {
      console.log("❌ Validation échouée: nom requis");
      return;
    }
    setLoading(true);

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    console.log("🔗 Slug généré:", slug);

    try {
      // Vérifie existence (company_id + name ilike) pour un autre artiste
      console.log("🔍 Vérification de l'existence d'un autre artiste...");
      const { data: exists, error: existsErr } = await supabase
        .from("artists")
        .select("id")
        .eq("company_id", companyId)
        .ilike("name", name.trim())
        .neq("id", artist.id)
        .maybeSingle();
      
      if (existsErr) {
        console.error("❌ Erreur lors de la vérification d'existence:", existsErr);
        setErr(existsErr.message);
        setLoading(false);
        return;
      }
      
      if (exists?.id) {
        console.log("❌ Un autre artiste avec ce nom existe:", exists.id);
        setErr("Un autre artiste portant ce nom existe déjà pour cette société.");
        setLoading(false);
        return;
      }

      console.log("✅ Aucun doublon trouvé, mise à jour de l'artiste...");
      
      // Mettre à jour l'artiste
      const { data: artistData, error: artistErr } = await supabase
        .from("artists")
        .update({
          name: name.trim(),
          slug
        })
        .eq("id", artist.id)
        .select('id')
        .single();

      if (artistErr) {
        console.error("❌ Erreur lors de la mise à jour de l'artiste:", artistErr);
        throw artistErr;
      }

      console.log("✅ Artiste mis à jour avec succès:", artistData);

      // Si un artiste Spotify est sélectionné, mettre à jour ses données
      if (selectedSpotifyArtist && artistData?.id) {
        console.log("🎵 Mise à jour des données Spotify...");
        console.log("🎵 Artiste sélectionné:", selectedSpotifyArtist);
        console.log("🎵 ID de l'artiste:", artistData.id);
        
        const spotifyPayload = {
          artist_id: artistData.id,
          spotify_id: selectedSpotifyArtist.id,
          external_url: selectedSpotifyArtist.external_urls.spotify,
          image_url: selectedSpotifyArtist.images[0]?.url || null,
          popularity: selectedSpotifyArtist.popularity,
          followers: selectedSpotifyArtist.followers.total,
          genres: selectedSpotifyArtist.genres,
          updated_at: new Date().toISOString()
        };

        console.log("📊 Payload Spotify:", spotifyPayload);

        const { data: spotifyData, error: spotifyErr } = await supabase
          .from("spotify_data")
          .upsert([spotifyPayload])
          .select();

        if (spotifyErr) {
          console.error("❌ Erreur lors de la mise à jour des données Spotify:", spotifyErr);
          setErr(`Erreur Spotify: ${spotifyErr.message}`);
        } else {
          console.log("✅ Données Spotify mises à jour avec succès:", spotifyData);
        }
      } else {
        console.log("⚠️ Aucun artiste Spotify sélectionné ou ID artiste manquant");
        console.log("⚠️ selectedSpotifyArtist:", !!selectedSpotifyArtist);
        console.log("⚠️ artistData?.id:", artistData?.id);
      }

      console.log("🎉 Modification d'artiste terminée avec succès");
      setLoading(false);
      onSaved();
    } catch (error) {
      console.error("💥 Erreur lors de la modification de l'artiste:", error);
      setErr(error instanceof Error ? error.message : "Erreur lors de la modification de l'artiste");
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        open={true}
        onClose={onClose}
        title="Modifier l'artiste"
        size="sm"
        footer={
          <>
            {err && <div className="text-xs text-red-400 mr-auto">{err}</div>}
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              variant="primary" 
              onClick={onSubmit} 
              disabled={!canSave || loading}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm font-sans" style={{color: 'var(--text-secondary)'}}>
          Modifiez les informations de l'artiste. Vous pouvez rechercher sur Spotify pour enrichir automatiquement les données.
        </p>
        
        <div className="space-y-4">
          {/* Champ nom */}
          <div>
            <label className="block text-xs font-medium mb-2 font-sans">Nom de l'artiste *</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Nom de l'artiste"
              className="input h-10 text-sm"
            />
          </div>

          {/* Bouton recherche Spotify */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handleSpotifySearch}
              disabled={!name.trim()}
              className="btn btn-secondary btn-sm flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Rechercher sur Spotify
            </Button>
            
            <Button
              type="button"
              onClick={handleDebug}
              className="btn btn-secondary btn-sm flex items-center gap-2"
            >
              <Bug className="w-4 h-4" />
              Diagnostic
            </Button>
            
            {selectedSpotifyArtist && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Music className="w-4 h-4" />
                <span>Données Spotify sélectionnées</span>
              </div>
            )}
          </div>

          {/* Informations sur l'artiste sélectionné */}
          {selectedSpotifyArtist && (
            <div className="p-3 rounded-lg border" style={{borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-secondary)'}}>
              <div className="flex items-center gap-3">
                {selectedSpotifyArtist.images[0] && (
                  <img
                    src={selectedSpotifyArtist.images[0].url}
                    alt={selectedSpotifyArtist.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{selectedSpotifyArtist.name}</h4>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedSpotifyArtist.followers.total.toLocaleString()} followers • 
                    Popularité: {selectedSpotifyArtist.popularity}/100
                    {selectedSpotifyArtist.genres.length > 0 && (
                      <span> • {selectedSpotifyArtist.genres[0]}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal de recherche Spotify */}
      <SpotifySearchModal
        isOpen={showSpotifySearch}
        onClose={() => setShowSpotifySearch(false)}
        onSelect={handleSpotifySelect}
        searchQuery={name}
      />
    </>
  );
}
