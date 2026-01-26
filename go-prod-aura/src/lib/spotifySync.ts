export async function triggerSpotifySync(
  _supabase: any,
  companyId: string,
  limit = 100
): Promise<{ ok: boolean; message?: string }> {
  // En mode développement, utiliser la clé anon au lieu de l'access token
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Utiliser l'URL complète de Supabase
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/spotify_enrich_batch`;

  console.log("🔗 URL Edge Function:", functionUrl);
  console.log("🔑 Anon Key présent:", !!anonKey);
  console.log("📊 Payload:", { company_id: companyId, limit });

  const res = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ company_id: companyId, limit }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ok: false, message: `EdgeFunction error: ${res.status} ${txt}` };
  }
  const json = await res.json().catch(() => ({}));
  return { ok: true, message: json?.message ?? "Spotify sync triggered" };
}
