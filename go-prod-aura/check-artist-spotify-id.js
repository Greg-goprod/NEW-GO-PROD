// Script pour vérifier si un artiste a un spotify_id
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pqadxycamvtfvyqbbpqb.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY non trouvée dans .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const artistName = process.argv[2] || 'BIGFLO & OLI'

console.log(`🔍 Recherche de l'artiste: ${artistName}\n`)

const { data: artists, error } = await supabase
  .from('artists')
  .select('id, name, spotify_data')
  .ilike('name', `%${artistName}%`)
  .limit(1)

if (error) {
  console.error('❌ Erreur:', error.message)
  process.exit(1)
}

if (!artists || artists.length === 0) {
  console.log('❌ Artiste non trouvé')
  process.exit(1)
}

const artist = artists[0]
console.log('✅ Artiste trouvé:')
console.log(`   Nom: ${artist.name}`)
console.log(`   ID: ${artist.id}`)

if (!artist.spotify_data) {
  console.log('\n❌ PAS DE DONNÉES SPOTIFY')
  console.log('\n💡 Solution: Ajoutez le spotify_id avec cette commande SQL:')
  console.log(`\nUPDATE artists`)
  console.log(`SET spotify_data = jsonb_set(`)
  console.log(`  COALESCE(spotify_data, '{}'::jsonb),`)
  console.log(`  '{spotify_id}',`)
  console.log(`  '"SPOTIFY_ID_ICI"'`)
  console.log(`)`)
  console.log(`WHERE id = '${artist.id}';`)
  console.log('\n📝 Pour trouver le Spotify ID:')
  console.log('   1. Allez sur https://open.spotify.com')
  console.log('   2. Cherchez "Bigflo & Oli"')
  console.log('   3. Cliquez sur l\'artiste')
  console.log('   4. Copiez l\'ID depuis l\'URL: https://open.spotify.com/artist/SPOTIFY_ID_ICI')
  process.exit(0)
}

const spotifyId = artist.spotify_data.spotify_id

if (!spotifyId) {
  console.log('\n❌ spotify_data existe mais PAS DE spotify_id')
  console.log('   Données actuelles:', JSON.stringify(artist.spotify_data, null, 2))
  console.log('\n💡 Solution: Ajoutez le spotify_id:')
  console.log(`\nUPDATE artists`)
  console.log(`SET spotify_data = jsonb_set(`)
  console.log(`  spotify_data,`)
  console.log(`  '{spotify_id}',`)
  console.log(`  '"SPOTIFY_ID_ICI"'`)
  console.log(`)`)
  console.log(`WHERE id = '${artist.id}';`)
  process.exit(0)
}

console.log(`\n✅ Spotify ID trouvé: ${spotifyId}`)
console.log('\n🎉 L\'artiste est prêt pour Songstats !')
console.log(`\n🔗 Spotify URL: https://open.spotify.com/artist/${spotifyId}`)





