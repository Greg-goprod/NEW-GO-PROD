# SMTP Relay Service - Go-Prod

Service sécurisé d'envoi d'emails via SMTP pour Go-Prod.

## Déploiement sur Railway

### 1. Créer un compte Railway
- Aller sur https://railway.app
- Se connecter avec GitHub

### 2. Nouveau projet
- Cliquer sur "New Project"
- Choisir "Deploy from GitHub repo"
- Sélectionner ce repository (ou "Empty Project" puis upload)

### 3. Variables d'environnement
Dans les settings du service, ajouter :

```
API_SECRET_KEY=votre-cle-secrete-tres-longue-et-complexe
ENCRYPTION_KEY=une-autre-cle-de-32-caracteres!
ALLOWED_ORIGIN=https://alhoefdrjbwdzijizrxc.supabase.co
```

### 4. Récupérer l'URL
Une fois déployé, Railway fournit une URL du type :
`https://smtp-relay-service-production-xxxx.up.railway.app`

### 5. Configurer Supabase
Ajouter cette URL et l'API_SECRET_KEY dans les secrets Supabase Edge Functions.

## Sécurité

- **API Key** : Chaque requête doit inclure `X-API-Key` header
- **Rate Limiting** : Max 100 requêtes/minute par IP
- **CORS** : Seules les origines autorisées peuvent appeler
- **Helmet** : Headers de sécurité HTTP
- **TLS 1.2+** : Connexions SMTP chiffrées
- **Validation** : Toutes les entrées sont validées

## Endpoints

### POST /send
Envoie un email via SMTP.

```json
{
  "smtp": {
    "host": "mail.example.com",
    "port": 587,
    "username": "user@example.com",
    "password": "encrypted-or-plain-password"
  },
  "email": {
    "from": "sender@example.com",
    "fromName": "Sender Name",
    "to": "recipient@example.com",
    "subject": "Subject",
    "html": "<p>HTML content</p>",
    "replyTo": "reply@example.com"
  }
}
```

### POST /test-connection
Teste la connexion SMTP sans envoyer d'email.

### GET /health
Vérifie l'état du service.
