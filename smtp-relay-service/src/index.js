/**
 * SMTP Relay Service - Ultra Secure
 * 
 * Ce microservice reçoit des requêtes HTTP sécurisées et envoie des emails via SMTP.
 * Conçu pour être déployé sur Railway/Render.
 */

const express = require('express');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// Configuration sécurité
// =============================================================================

// Clé API secrète (à définir dans les variables d'environnement Railway)
const API_SECRET_KEY = process.env.API_SECRET_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-key-change-this!';

// Domaines autorisés (Supabase Edge Functions)
const ALLOWED_ORIGINS = [
  'https://alhoefdrjbwdzijizrxc.supabase.co',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean);

// =============================================================================
// Middlewares de sécurité
// =============================================================================

// Helmet - Headers de sécurité
app.use(helmet());

// CORS restrictif
app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (Edge Functions)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origin refusée: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Rate limiting - Max 100 requêtes par minute par IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { success: false, error: 'Trop de requêtes, réessayez plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// JSON parser avec limite de taille (augmentée pour les pièces jointes)
app.use(express.json({ limit: '25mb' }));

// =============================================================================
// Middleware d'authentification
// =============================================================================

function authenticateRequest(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  // Debug logging
  console.log('[AUTH] Checking API key...');
  console.log('[AUTH] API_SECRET_KEY defined:', !!API_SECRET_KEY);
  console.log('[AUTH] API_SECRET_KEY length:', API_SECRET_KEY ? API_SECRET_KEY.length : 0);
  console.log('[AUTH] Received key length:', apiKey ? apiKey.length : 0);
  
  if (!API_SECRET_KEY) {
    console.error('[AUTH] API_SECRET_KEY non configurée !');
    return res.status(500).json({ success: false, error: 'Configuration serveur incorrecte' });
  }
  
  if (!apiKey) {
    console.warn('[AUTH] Requête sans API key');
    return res.status(401).json({ success: false, error: 'API key manquante' });
  }
  
  // Comparaison simple pour debug
  if (apiKey === API_SECRET_KEY) {
    console.log('[AUTH] API key valide (match exact)');
    return next();
  }
  
  // Log des premiers caractères pour debug
  console.warn('[AUTH] API key mismatch');
  console.warn('[AUTH] Expected first 10:', API_SECRET_KEY.substring(0, 10));
  console.warn('[AUTH] Received first 10:', apiKey.substring(0, 10));
  
  return res.status(401).json({ success: false, error: 'API key invalide' });
}

// =============================================================================
// Fonctions de chiffrement
// =============================================================================

function decryptPassword(encryptedPassword) {
  try {
    // Format: iv:encrypted (hex)
    const [ivHex, encryptedHex] = encryptedPassword.split(':');
    
    if (!ivHex || !encryptedHex) {
      // Pas chiffré, retourner tel quel (pour les tests)
      return encryptedPassword;
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[DECRYPT] Erreur:', error.message);
    // Retourner tel quel si échec (mot de passe non chiffré)
    return encryptedPassword;
  }
}

// =============================================================================
// Validation des entrées
// =============================================================================

function validateEmailRequest(body) {
  const errors = [];
  
  // SMTP Config
  if (!body.smtp?.host) errors.push('smtp.host requis');
  if (!body.smtp?.port) errors.push('smtp.port requis');
  if (!body.smtp?.username) errors.push('smtp.username requis');
  if (!body.smtp?.password) errors.push('smtp.password requis');
  
  // Email content
  if (!body.email?.to) errors.push('email.to requis');
  if (!body.email?.subject) errors.push('email.subject requis');
  if (!body.email?.from) errors.push('email.from requis');
  
  // Validation format email basique
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (body.email?.to) {
    const toList = Array.isArray(body.email.to) ? body.email.to : [body.email.to];
    for (const email of toList) {
      if (!emailRegex.test(email)) {
        errors.push(`Format email invalide: ${email}`);
      }
    }
  }
  
  if (body.email?.from && !emailRegex.test(body.email.from)) {
    errors.push(`Format email from invalide: ${body.email.from}`);
  }
  
  // Limites de sécurité
  if (body.email?.html && body.email.html.length > 500000) {
    errors.push('Contenu HTML trop volumineux (max 500KB)');
  }
  
  // Validation des pièces jointes
  if (body.email?.attachments) {
    if (!Array.isArray(body.email.attachments)) {
      errors.push('attachments doit être un tableau');
    } else {
      let totalSize = 0;
      for (const att of body.email.attachments) {
        if (!att.filename) errors.push('Chaque pièce jointe doit avoir un filename');
        if (!att.content) errors.push('Chaque pièce jointe doit avoir un content (base64)');
        if (att.content) totalSize += att.content.length;
      }
      // Limite ~20MB en base64 (base64 augmente la taille de ~33%)
      if (totalSize > 25000000) {
        errors.push('Pièces jointes trop volumineuses (max 20MB total)');
      }
    }
  }
  
  return errors;
}

// =============================================================================
// Route principale : Envoi d'email
// =============================================================================

app.post('/send', authenticateRequest, async (req, res) => {
  const startTime = Date.now();
  const requestId = crypto.randomBytes(4).toString('hex');
  
  console.log(`[${requestId}] Nouvelle requête d'envoi`);
  
  try {
    // Validation
    const validationErrors = validateEmailRequest(req.body);
    if (validationErrors.length > 0) {
      console.warn(`[${requestId}] Validation échouée:`, validationErrors);
      return res.status(400).json({ 
        success: false, 
        error: 'Données invalides', 
        details: validationErrors 
      });
    }
    
    const { smtp, email } = req.body;
    
    // Déchiffrer le mot de passe si nécessaire
    const password = decryptPassword(smtp.password);
    
    // Créer le transporteur SMTP
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: parseInt(smtp.port, 10),
      secure: smtp.port === 465, // true pour 465, false pour autres ports
      auth: {
        user: smtp.username,
        pass: password,
      },
      // Timeout de 30 secondes
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      // TLS
      tls: {
        rejectUnauthorized: true, // Vérifier les certificats SSL
        minVersion: 'TLSv1.2',
      },
    });
    
    // Préparer le message
    const mailOptions = {
      from: email.fromName ? `"${email.fromName}" <${email.from}>` : email.from,
      to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
      subject: email.subject,
      html: email.html || undefined,
      text: email.text || undefined,
      replyTo: email.replyTo || undefined,
    };
    
    // Ajouter CC/BCC si présents
    if (email.cc) {
      mailOptions.cc = Array.isArray(email.cc) ? email.cc.join(', ') : email.cc;
    }
    if (email.bcc) {
      mailOptions.bcc = Array.isArray(email.bcc) ? email.bcc.join(', ') : email.bcc;
    }
    
    // Ajouter les pièces jointes si présentes
    if (email.attachments && Array.isArray(email.attachments)) {
      mailOptions.attachments = email.attachments.map(att => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType || 'application/octet-stream',
      }));
      console.log(`[${requestId}] ${email.attachments.length} pièce(s) jointe(s)`);
    }
    
    // Envoyer l'email
    console.log(`[${requestId}] Connexion à ${smtp.host}:${smtp.port}...`);
    const info = await transporter.sendMail(mailOptions);
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Email envoyé en ${duration}ms - MessageId: ${info.messageId}`);
    
    // Fermer la connexion
    transporter.close();
    
    return res.json({
      success: true,
      messageId: info.messageId,
      duration,
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Erreur après ${duration}ms:`, error.message);
    
    // Messages d'erreur user-friendly
    let userMessage = 'Erreur lors de l\'envoi';
    
    if (error.code === 'ECONNREFUSED') {
      userMessage = 'Connexion au serveur SMTP refusée. Vérifiez l\'hôte et le port.';
    } else if (error.code === 'EAUTH' || error.message.includes('authentication')) {
      userMessage = 'Authentification SMTP échouée. Vérifiez l\'identifiant et le mot de passe.';
    } else if (error.code === 'ETIMEDOUT') {
      userMessage = 'Timeout de connexion au serveur SMTP.';
    } else if (error.message.includes('certificate')) {
      userMessage = 'Erreur de certificat SSL du serveur SMTP.';
    } else if (error.responseCode === 550) {
      userMessage = 'Email rejeté par le serveur (adresse invalide ou bloquée).';
    } else if (error.responseCode === 553) {
      userMessage = 'Adresse d\'expéditeur non autorisée par le serveur SMTP.';
    }
    
    return res.status(500).json({
      success: false,
      error: userMessage,
      code: error.code || 'UNKNOWN',
    });
  }
});

// =============================================================================
// Route de test de connexion SMTP
// =============================================================================

app.post('/test-connection', authenticateRequest, async (req, res) => {
  const requestId = crypto.randomBytes(4).toString('hex');
  console.log(`[${requestId}] Test de connexion SMTP`);
  
  try {
    const { smtp } = req.body;
    
    if (!smtp?.host || !smtp?.port || !smtp?.username || !smtp?.password) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres SMTP incomplets',
      });
    }
    
    const password = decryptPassword(smtp.password);
    
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: parseInt(smtp.port, 10),
      secure: smtp.port === 465,
      auth: {
        user: smtp.username,
        pass: password,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });
    
    // Vérifier la connexion
    await transporter.verify();
    transporter.close();
    
    console.log(`[${requestId}] Connexion SMTP réussie`);
    
    return res.json({
      success: true,
      message: 'Connexion SMTP réussie',
    });
    
  } catch (error) {
    console.error(`[${requestId}] Test échoué:`, error.message);
    
    let userMessage = 'Connexion échouée';
    
    if (error.code === 'ECONNREFUSED') {
      userMessage = 'Connexion refusée. Vérifiez l\'hôte et le port.';
    } else if (error.code === 'EAUTH') {
      userMessage = 'Authentification échouée. Vérifiez les identifiants.';
    } else if (error.code === 'ETIMEDOUT') {
      userMessage = 'Timeout de connexion.';
    }
    
    return res.status(400).json({
      success: false,
      error: userMessage,
    });
  }
});

// =============================================================================
// Route de santé
// =============================================================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'smtp-relay',
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// Gestion des erreurs
// =============================================================================

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, error: 'Erreur serveur interne' });
});

// Route 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route non trouvée' });
});

// =============================================================================
// Démarrage du serveur
// =============================================================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           SMTP Relay Service - Go-Prod                       ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                   ║
║  Sécurité: API Key + Rate Limiting + Helmet                  ║
║  Endpoints:                                                  ║
║    POST /send           - Envoyer un email                   ║
║    POST /test-connection - Tester la connexion SMTP          ║
║    GET  /health         - Vérifier l'état du service         ║
╚══════════════════════════════════════════════════════════════╝
  `);
  
  if (!API_SECRET_KEY) {
    console.warn('⚠️  ATTENTION: API_SECRET_KEY non définie !');
  }
});
