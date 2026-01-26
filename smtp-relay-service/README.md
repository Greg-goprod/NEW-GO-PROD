# SMTP Relay Service - Go-Prod

Microservice sécurisé pour relayer les emails SMTP. Permet aux utilisateurs de Go-Prod d'envoyer des emails via leur propre serveur SMTP.

## Déploiement sur Fly.io (Recommandé)

Fly.io autorise les connexions SMTP sortantes sur le port 587.

### Prérequis
- Compte Fly.io (https://fly.io)
- Fly CLI installé (`curl -L https://fly.io/install.sh | sh`)

### Étapes

1. **Se connecter à Fly.io**
   ```bash
   fly auth login
   ```

2. **Créer l'application** (depuis le dossier smtp-relay-service)
   ```bash
   fly launch --no-deploy --name go-prod-smtp-relay --region cdg
   ```

3. **Configurer les secrets**
   ```bash
   fly secrets set API_SECRET_KEY="GoProd2026SmtpRelaySecureKey847"
   fly secrets set ENCRYPTION_KEY="GoProdEncrypt32CharKeyChange!!"
   ```

4. **Déployer**
   ```bash
   fly deploy
   ```

5. **Vérifier**
   ```bash
   curl https://go-prod-smtp-relay.fly.dev/health
   ```

### URL du service
Après déploiement : `https://go-prod-smtp-relay.fly.dev`

## Déploiement sur Railway (Ports SMTP bloqués sauf Pro)

⚠️ Railway bloque les ports SMTP (25, 465, 587) sur les plans gratuits et Hobby.

## Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `API_SECRET_KEY` | Clé API pour authentification | `GoProd2026SmtpRelaySecureKey847` |
| `ENCRYPTION_KEY` | Clé pour déchiffrer les mots de passe | `GoProdEncrypt32CharKeyChange!!` |
| `PORT` | Port d'écoute (défaut: 8080) | `8080` |

## Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/health` | Vérification de l'état du service |
| `POST` | `/send` | Envoyer un email via SMTP |
| `POST` | `/test-connection` | Tester la connexion SMTP |

## Sécurité

- Authentification par clé API (header `X-API-Key`)
- Rate limiting (100 req/min)
- Headers de sécurité (Helmet)
- CORS restrictif
- Chiffrement des mots de passe SMTP

## Mise à jour Supabase

Après déploiement sur Fly.io, mettez à jour les secrets Supabase :

```bash
npx supabase secrets set SMTP_RELAY_URL="https://go-prod-smtp-relay.fly.dev"
npx supabase secrets set SMTP_RELAY_API_KEY="GoProd2026SmtpRelaySecureKey847"
```
