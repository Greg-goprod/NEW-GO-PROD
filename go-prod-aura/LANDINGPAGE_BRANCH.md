# 🚀 Branche LANDINGPAGE - Nouvelle Landing Page Go-Prod v2.0

## ✅ Ce qui a été créé

Une toute **nouvelle landing page** pour Go-Prod, inspirée du prompt fourni et adaptée avec tous les liens désactivés (vitrine statique).

### 📦 Branche séparée

**Branche :** `LANDINGPAGE`

Cette branche contient la nouvelle landing page Go-Prod v2.0 sans affecter la branche `main`.

---

## 🎯 Contenu de la branche LANDINGPAGE

### 📁 Structure créée

```
src/
  components/
    landing/
      ├── Navbar.tsx           ✅ Navigation avec smooth scroll
      ├── Hero.tsx             ✅ Section hero + mockup
      ├── Why.tsx              ✅ Pourquoi Go-Prod
      ├── Modules.tsx          ✅ 6 modules métiers
      ├── Personas.tsx         ✅ 5 personas production
      ├── Dashboard.tsx        ✅ Vision 360°
      ├── Security.tsx         ✅ Sécurité entreprise
      ├── Pricing.tsx          ✅ 3 plans tarifaires
      ├── Testimonials.tsx     ✅ 3 témoignages
      ├── Tech.tsx             ✅ Stack technique
      ├── FinalCta.tsx         ✅ CTA final
      └── Footer.tsx           ✅ Footer 4 colonnes
  
  pages/
    landing/
      └── LandingPage.tsx      ✅ Page principale (importe tous les composants)
  
  App.tsx                      ✅ Modifié pour utiliser la nouvelle landing
```

---

## 🎨 Design & Fonctionnalités

### Design System AURA
- **Background :** `#0B1020` (dark-mode-first)
- **Couleur principale :** Indigo 500 (`#6366F1`)
- **Bordures :** `border-white/10` (subtiles)
- **Typographie :** Font semibold/bold, tracking tight
- **Composants :** Rounded-2xl, padding généreux, grilles responsive

### Sections

| Section | Description | Éléments clés |
|---------|-------------|---------------|
| **Hero** | Titre principal + mockup | CTA "Essai gratuit 14 jours" + "Voir la démo" |
| **Why** | Remplacer Excel par un cockpit | 3 avantages clés |
| **Modules** | 6 modules métiers | Artistes, Logistique, Hospitality, Timetable, Finances, Presse |
| **Personas** | 5 rôles production | Tableau avec bénéfices |
| **Dashboard** | Vision 360° | Mockup grand format |
| **Security** | Sécurité entreprise | 2FA, RGPD, Audit, Chiffrement |
| **Pricing** | 3 plans tarifaires | Starter (CHF 29), Pro (CHF 99), Enterprise (sur devis) |
| **Testimonials** | 3 témoignages clients | Directeur production, Régisseur, Booking |
| **Tech** | Stack moderne | Supabase, React, Tailwind, Netlify, API |
| **Final CTA** | Appel à l'action | CTA "Essai gratuit" + "Planifier une démo" |
| **Footer** | 4 colonnes + copyright | Produit, Entreprise, Ressources, Légal |

### Navigation
- **Navbar :** Liens smooth scroll vers `#features`, `#modules`, `#pricing`, `#tech`
- **Footer :** Liens vers sections (fonctionnels) + liens désactivés (gris)
- **Mobile :** Menu hamburger responsive

### Éléments désactivés (vitrine statique)
- ❌ Tous les boutons CTA (opacité 50%, cursor-not-allowed)
- ❌ Liens "Se connecter", "Commencer", "Essai gratuit", "Démarrer l'essai"
- ❌ Liens footer externes (Blog, Carrières, Documentation, etc.)
- ✅ Navigation interne (scroll vers sections) fonctionne

---

## 🔄 Comment utiliser cette branche

### 1. Voir la landing page localement

```bash
# Basculer vers la branche LANDINGPAGE
git checkout LANDINGPAGE

# Installer les dépendances (si nécessaire)
npm install

# Lancer le serveur de développement
npm run dev
```

La landing page sera visible sur `http://localhost:5173`

### 2. Tester le build

```bash
npm run build
```

**Build time :** ~10s  
**Bundle size :** Similaire à l'ancienne version (~367 kB gzipped)

### 3. Merger dans main (quand prêt)

```bash
# Revenir sur main
git checkout main

# Merger la branche LANDINGPAGE
git merge LANDINGPAGE

# Pousser sur GitHub
git push origin main
```

---

## 📊 Différences avec l'ancienne landing

| Critère | Ancienne Landing | Nouvelle Landing (LANDINGPAGE) |
|---------|------------------|-------------------------------|
| **Focus** | Marketplace d'artistes | **Gestion événementielle complète** |
| **Modules** | 6 features génériques | **6 modules métiers détaillés** |
| **Personas** | 2 (Agences & Startups) | **5 personas production** |
| **Pricing** | 3 plans | **3 plans (CHF adapté)** |
| **Design** | AURA violet/cyan | **AURA indigo (#0B1020)** |
| **Sections** | 8 sections | **11 sections complètes** |
| **Composants** | 1 fichier monolithique | **12 composants modulaires** |
| **Navigation** | Smooth scroll basique | **Navbar sticky + menu mobile** |
| **SEO** | H1 marketplace | **H1 gestion événementielle** |

---

## 🎯 Contenu marketing

### Texte principal (H1)
> "La plateforme tout-en-un pour piloter vos événements"

### Sous-titre
> "Centralisez artistes, contrats, logistique, planning et finances dans un seul outil. Conçu pour les festivals, productions et agences culturelles exigeantes."

### CTA principal
> "Essai gratuit 14 jours" + "Sans carte de crédit — Hébergé en Suisse"

### 6 Modules métiers
1. **Artistes & Contrats** - Profils enrichis, offres, contrats, signatures
2. **Ground & Logistique** - Chauffeurs, véhicules, missions, plannings
3. **Hospitality & Backstage** - Hôtels, catering, accréditations
4. **Timetable & Régie** - Planning technique, scènes, changeovers
5. **Finances & Administration** - Budgets, paiements, factures, reporting
6. **Presse & Communication** - Contacts médias, accréditations, communiqués

### 5 Personas
1. Directeur·trice de Production
2. Régisseur·se Général·e
3. Responsable Booking
4. Chargé·e de Production
5. Technicien·ne / Crew

---

## 🔒 Sécurité & Conformité

- Authentification multi-facteurs (2FA)
- Chiffrement des données au repos et en transit
- Rôles et permissions granulaires
- Hébergement en Europe (conforme RGPD)
- Journaux d'audit complets

---

## 🚀 Déploiement

### Sur Netlify

La branche peut être déployée sur Netlify en configurant :

**Branch to deploy :** `LANDINGPAGE`  
**Build command :** `npm run build`  
**Publish directory :** `dist`

### Variables d'environnement

Aucune variable d'environnement nécessaire pour cette landing page statique.

---

## 📝 Prochaines étapes

### Pour activer les CTA (quand prêt)

1. Créer les pages `/signup`, `/login`, `/contact`
2. Remplacer les `button disabled` par des `Link` ou `a href`
3. Retirer `opacity-50` et `cursor-not-allowed`
4. Ajouter les vraies routes dans `App.tsx`

### Pour améliorer le SEO

1. Ajouter les meta tags dans `index.html`
2. Créer un `sitemap.xml`
3. Ajouter `robots.txt`
4. Configurer Google Analytics
5. Remplacer les mockups par de vraies captures d'écran

### Pour ajouter des interactions

1. Formulaire de contact fonctionnel
2. Newsletter Mailchimp/Tally
3. Vidéo démo intégrée
4. Chat en direct (Intercom, Crisp)

---

## 📚 Commit de la branche

**Commit :** `a00e983`  
**Message :**
```
feat: Nouvelle Landing Page Go-Prod v2.0 - Design AURA complet

- 12 composants modulaires
- Focus : Gestion événementielle complète
- Dark-mode-first (#0B1020)
- Tous les boutons CTA désactivés (vitrine statique)
- Navigation smooth scroll
- Responsive design complet
- 6 modules métiers détaillés
- 5 personas production
- 3 plans tarifaires
- Build vérifié : 10.11s
```

---

## 🔗 Liens utiles

- **Branche GitHub :** https://github.com/Greg-goprod/GO-PROD_AURA/tree/LANDINGPAGE
- **Pull Request :** https://github.com/Greg-goprod/GO-PROD_AURA/pull/new/LANDINGPAGE
- **Documentation main :** `LANDING_MODE.md`

---

**Version actuelle branche main :** Landing page ancienne (marketplace d'artistes, tous liens désactivés)  
**Version branche LANDINGPAGE :** Nouvelle landing Go-Prod v2.0 (gestion événementielle, design AURA complet)

Pour toute question, consultez `LANDING_MODE.md` ou `SECURITY_GUIDE.md`.

