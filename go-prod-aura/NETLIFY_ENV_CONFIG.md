# 🔧 Configuration Variables Netlify

## ⚠️ PROBLÈME DÉTECTÉ

Certaines variables **ne doivent PAS** être disponibles pendant le build frontend, seulement pour les Functions.

### Variables détectées dans le bundle (à corriger)
- `SUPABASE_DATABASE_URL` ❌ (accès direct DB - dangereux !)
- `SUPABASE_JWT_SECRET` ❌ (secret de signature JWT)
- `SUPABASE_SERVICE_ROLE_KEY` ❌ (bypass RLS)

Ces variables donnent un accès administrateur complet à votre base de données !

## ✅ SOLUTION : Scopes des Variables

Dans Netlify Dashboard → Site settings → Environment variables, vous devez définir le **scope** de chaque variable :

### Variables pour BUILD + FUNCTIONS (publiques)
**Scope :** `Builds` + `Functions` + `Post processing`

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SPOTIFY_CLIENT_ID
VITE_SPOTIFY_CLIENT_SECRET
VITE_RAPIDAPI_KEY
VITE_TWILIO_ACCOUNT_SID
VITE_TWILIO_AUTH_TOKEN
VITE_TWILIO_WHATSAPP_NUMBER
NODE_VERSION=22
```

### Variables pour FUNCTIONS UNIQUEMENT (privées)
**Scope :** `Functions` SEULEMENT (décocher `Builds`)

```
SUPABASE_SERVICE_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DATABASE_URL
SUPABASE_JWT_SECRET
OPENAI_API_KEY
SONGSTATS_API_KEY
RATE_DELAY_MS=600
```

## 📋 Checklist de Configuration

### 1. Aller dans Netlify Dashboard
```
Site → Site configuration → Environment variables
```

### 2. Pour chaque variable PRIVÉE
- [ ] Cliquer sur la variable (ex: `SUPABASE_DATABASE_URL`)
- [ ] Cliquer sur "Options" → "Edit"
- [ ] **Décocher** `Builds`
- [ ] **Cocher uniquement** `Functions`
- [ ] Save

### 3. Vérifier le scope
Après configuration, vous devriez voir :

**Variables avec scope `Builds` :**
- Toutes les `VITE_*` ✅
- `NODE_VERSION` ✅

**Variables avec scope `Functions` uniquement :**
- `SUPABASE_SERVICE_KEY` ✅
- `SUPABASE_DATABASE_URL` ✅
- `SUPABASE_JWT_SECRET` ✅
- `OPENAI_API_KEY` ✅
- `SONGSTATS_API_KEY` ✅

## 🔍 Pourquoi c'est important ?

### Scope "Builds"
Les variables avec scope `Builds` sont disponibles pendant `npm run build` et peuvent se retrouver dans le bundle JavaScript final.

**Risque :** Si une clé privée a le scope `Builds`, elle sera visible dans le code source du navigateur ! 🚨

### Scope "Functions"
Les variables avec scope `Functions` sont **uniquement** disponibles dans `/netlify/functions/**` au runtime.

**Sécurité :** Ces variables ne sont jamais exposées au navigateur. ✅

## 🧪 Test

Après configuration, relancez le build. Vous ne devriez plus voir d'erreur de secrets scanning.

Si vous voyez encore une erreur, vérifiez que la variable est bien **décochée** du scope `Builds`.

## 📖 Documentation Netlify

[Environment variables scopes](https://docs.netlify.com/environment-variables/overview/#scopes)

## ⚡ Raccourci temporaire (non recommandé)

Si vous voulez juste débloquer le build rapidement (mais c'est moins sécurisé), ces variables sont whitelistées dans `netlify.toml` via `SECRETS_SCAN_OMIT_KEYS`.

**Recommandation :** Configurez correctement les scopes plutôt que de vous fier uniquement à la whitelist.

