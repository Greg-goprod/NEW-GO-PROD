# 🔐 Guide de Sécurité - GO-PROD AURA

## ⚠️ RÈGLES CRITIQUES

### ✅ AUTORISÉ (Public - Frontend)
Les variables **VITE_*** peuvent être exposées dans le navigateur :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (clé anonyme publique)
- `VITE_SPOTIFY_CLIENT_ID`
- `VITE_SPOTIFY_CLIENT_SECRET` (note: peut être public pour OAuth flow)
- `VITE_RAPIDAPI_KEY`
- `VITE_TWILIO_*`

> **💡 Note importante :** Ces variables **DOIVENT** être présentes dans le bundle JavaScript final (dist/). C'est le comportement normal de Vite. Netlify peut les détecter comme "secrets" mais c'est un faux positif - elles sont conçues pour être publiques.
>
> **Configuration Netlify :** Le fichier `netlify.toml` contient `SECRETS_SCAN_OMIT_KEYS` pour dire à Netlify d'ignorer ces variables publiques.

### ❌ INTERDIT (Privé - Backend uniquement)
Ces clés ne doivent **JAMAIS** être dans le code client :
- `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `SONGSTATS_API_KEY`
- Toute clé commençant par `sk-`, `service_role`, etc.

## 📁 Structure des Variables

```
┌─────────────────────────────────────────┐
│  Frontend (Navigateur)                  │
│  ✅ Peut contenir VITE_* publiques      │
│  ❌ JAMAIS de clés privées              │
└─────────────────────────────────────────┘
           ↓ fetch()
┌─────────────────────────────────────────┐
│  Netlify Functions                      │
│  ✅ Accès aux clés privées              │
│  ✅ process.env.SUPABASE_SERVICE_KEY    │
│  ✅ process.env.OPENAI_API_KEY          │
└─────────────────────────────────────────┘
           ↓ API calls
┌─────────────────────────────────────────┐
│  Services externes                      │
│  (Supabase, OpenAI, Songstats, etc.)   │
└─────────────────────────────────────────┘
```

## 🛠️ Configuration des Variables

### 1. Netlify Dashboard

**Site settings → Environment variables**

#### Variables pour le Build (Frontend)
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_SPOTIFY_CLIENT_ID=xxxxx
VITE_SPOTIFY_CLIENT_SECRET=xxxxx
VITE_RAPIDAPI_KEY=xxxxx
VITE_TWILIO_ACCOUNT_SID=xxxxx
VITE_TWILIO_AUTH_TOKEN=xxxxx
VITE_TWILIO_WHATSAPP_NUMBER=whatsapp:+xxxxx
```

#### Variables pour les Functions (Backend)
```env
SUPABASE_SERVICE_KEY=eyJhbGciOi...
OPENAI_API_KEY=sk-xxxxx
SONGSTATS_API_KEY=xxxxx
RATE_DELAY_MS=600
```

### 2. Supabase Edge Functions

```bash
# Configurer les secrets pour Edge Functions
supabase secrets set SUPABASE_SERVICE_KEY=eyJhbGciOi...
supabase secrets set OPENAI_API_KEY=sk-xxxxx
supabase secrets set SONGSTATS_API_KEY=xxxxx
supabase secrets set RATE_DELAY_MS=600
```

### 3. Développement Local

```bash
# 1. Copier le template
cp .env.example .env

# 2. Remplir avec vos vraies clés
nano .env

# 3. JAMAIS commiter .env
git status  # .env ne doit PAS apparaître
```

## 🔒 Utilisation Sécurisée des Clés Privées

### ❌ MAUVAIS - Clé privée côté client
```typescript
// ❌ INTERDIT : exposé dans le navigateur
const openai = new OpenAI({
  apiKey: "sk-xxxxx"  // Visible dans le bundle !
});
```

### ✅ BON - Via Netlify Function
```typescript
// netlify/functions/openai-chat.ts
import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!  // ✅ Côté serveur
});

export const handler: Handler = async (event) => {
  const { messages } = JSON.parse(event.body || '{}');
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
  });
  return {
    statusCode: 200,
    body: JSON.stringify(resp),
  };
};
```

```typescript
// Frontend - Appel sécurisé
const response = await fetch('/.netlify/functions/openai-chat', {
  method: 'POST',
  body: JSON.stringify({ messages })
});
const data = await response.json();
```

## 🧪 Vérification avant Deploy

```bash
# 1. Build local
npm run build

# 2. Chercher des secrets dans dist/
cd dist
grep -RIn "sk-\|service_role\|OPENAI_API_KEY" . || echo "✅ Aucun secret trouvé"

# 3. Vérifier .gitignore
cat .gitignore | grep -E "\.env|dist" || echo "⚠️ Ajouter .env et dist au .gitignore"
```

## 🚨 En cas de Fuite de Clé

### 1. Révoquer immédiatement
- **Supabase** : Project Settings → API → Reset service_role key
- **OpenAI** : Dashboard → API keys → Revoke
- **Songstats** : Dashboard → Régénérer la clé

### 2. Nettoyer l'historique Git

```bash
# Installer git-filter-repo
pip install git-filter-repo

# Créer le fichier de remplacement
cat > replacements.txt <<'EOF'
regex:sk-[A-Za-z0-9_\-]{20,}==>REDACTED_OPENAI_KEY
regex:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+==>REDACTED_JWT
regex:service_role[A-Za-z0-9_\-]{10,}==>REDACTED_SERVICE_KEY
EOF

# Purger l'historique
git filter-repo --replace-text replacements.txt

# Force push (⚠️ coordonner avec l'équipe)
git push --force-with-lease
```

### 3. Mettre à jour partout
- Netlify Environment Variables
- Supabase Edge Function Secrets
- `.env` local (ne pas commiter)

## 📋 Checklist de Sécurité

- [ ] `.env` est dans `.gitignore`
- [ ] Aucun fichier `.env*` n'est commité
- [ ] `dist/` est dans `.gitignore`
- [ ] Toutes les clés privées sont dans Netlify Dashboard
- [ ] Les Functions utilisent `process.env.*` (jamais de valeurs hard-codées)
- [ ] Build local réussi sans secrets dans `dist/`
- [ ] `.env.example` est à jour avec toutes les variables nécessaires
- [ ] Les clés Supabase utilisent le bon niveau : `anon` (public) vs `service_role` (privé)

## 🔗 Ressources

- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)

## ⚡ Règle d'or

> **Si une clé donne accès à des ressources payantes ou privées, elle ne doit JAMAIS être dans le code client.**

Utilisez toujours une Function serverless comme proxy sécurisé.

