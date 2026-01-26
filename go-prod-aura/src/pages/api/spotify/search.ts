// Fonction utilitaire pour la recherche Spotify
// À utiliser avec une Edge Function Supabase ou un endpoint personnalisé

interface SpotifyArtist {
  id: string;
  name: string;
  external_urls: { spotify: string };
  images: Array<{ url: string; height: number; width: number }>;
  popularity: number;
  genres: string[];
  followers: { total: number };
}

interface SpotifySearchResponse {
  artists: {
    items: SpotifyArtist[];
  };
}

export async function searchSpotifyArtists(query: string): Promise<SpotifyArtist[]> {
  console.log("🎵 Fonction searchSpotifyArtists appelée avec:", query);
  
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    console.error("❌ Query invalide:", query);
    throw new Error('Query is required');
  }

  try {
    // Récupérer le token d'accès Spotify
    console.log("🔑 Récupération des credentials Spotify...");
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

    console.log("🔑 Client ID présent:", !!clientId);
    console.log("🔑 Client Secret présent:", !!clientSecret);

    if (!clientId || !clientSecret) {
      console.error("❌ Credentials Spotify manquants");
      throw new Error('Spotify credentials not configured');
    }

    console.log("🌐 Demande du token d'accès Spotify...");
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    console.log("🔑 Réponse token:", tokenResponse.status, tokenResponse.statusText);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ Erreur token Spotify:", errorText);
      throw new Error('Failed to get Spotify access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log("✅ Token d'accès obtenu");

    // Rechercher les artistes
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=8`;
    console.log("🔍 URL de recherche:", searchUrl);
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log("🔍 Réponse recherche:", searchResponse.status, searchResponse.statusText);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("❌ Erreur recherche Spotify:", errorText);
      throw new Error('Failed to search Spotify');
    }

    const searchData: SpotifySearchResponse = await searchResponse.json();
    console.log("✅ Données Spotify reçues:", searchData.artists.items.length, "artistes");
    return searchData.artists.items;
  } catch (error) {
    console.error('💥 Spotify search error:', error);
    throw new Error('Erreur lors de la recherche Spotify');
  }
}
