# 🗺️ Carte des routes GO-PROD

## 📍 Routes principales

### Dashboard
```
http://localhost:5174/app
```
- **Page** : Dashboard principal
- **Icône** : `LayoutDashboard`
- **Description** : Vue d'ensemble des KPIs et activités

---

## 🎵 Artistes

### Liste des artistes
```
http://localhost:5174/app/artistes
```
- **Icône** : `Music`
- **Description** : Gestion de la base d'artistes

### Lineup
```
http://localhost:5174/app/artistes/lineup
```
- **Icône** : `ListMusic`
- **Description** : Programmation et ordre de passage

---

## 🎬 Production

### Vue d'ensemble
```
http://localhost:5174/app/production
```
- **Icône** : `Clapperboard`
- **Description** : Vue d'ensemble de la production

### Timetable
```
http://localhost:5174/app/production/timetable
```
- **Icône** : `Calendar`
- **Description** : Planning horaire détaillé

### Technique
```
http://localhost:5174/app/production/technique
```
- **Icône** : `Wrench`
- **Description** : Gestion du matériel et setup technique

### Travel
```
http://localhost:5174/app/production/travel
```
- **Icône** : `Plane`
- **Description** : Gestion des voyages (vols, trains)

---

## 🚛 Production → Ground

### Vue d'ensemble Ground
```
http://localhost:5174/app/production/ground
```
- **Icône** : `Truck`
- **Description** : Transport terrestre

### Missions
```
http://localhost:5174/app/production/ground/missions
```
- **Icône** : `MapPin`
- **Description** : Missions de transport

### Chauffeurs
```
http://localhost:5174/app/production/ground/chauffeurs
```
- **Icône** : `UserRound`
- **Description** : Gestion des chauffeurs

### Véhicules
```
http://localhost:5174/app/production/ground/vehicules
```
- **Icône** : `Bus`
- **Description** : Gestion de la flotte de véhicules

### Horaires
```
http://localhost:5174/app/production/ground/horaires
```
- **Icône** : `Clock`
- **Description** : Planning des horaires de transport

---

## ☕ Production → Hospitality

### Vue d'ensemble Hospitality
```
http://localhost:5174/app/production/hospitality
```
- **Icône** : `Coffee`
- **Description** : Hospitalité et accueil

### Backstage
```
http://localhost:5174/app/production/hospitality/backstage
```
- **Icône** : `DoorOpen`
- **Description** : Gestion du backstage (loges, accès)

### Catering
```
http://localhost:5174/app/production/hospitality/catering
```
- **Icône** : `UtensilsCrossed`
- **Description** : Gestion du catering et riders

### Hôtels
```
http://localhost:5174/app/production/hospitality/hotels
```
- **Icône** : `Hotel`
- **Description** : Réservations d'hôtels

### Party Crew
```
http://localhost:5174/app/production/hospitality/partycrew
```
- **Icône** : `Users`
- **Description** : Gestion de l'équipe événementielle

---

## 💼 Administration

### Vue d'ensemble
```
http://localhost:5174/app/administration
```
- **Icône** : `Briefcase`
- **Description** : Vue administrative

### Booking
```
http://localhost:5174/app/administration/booking
```
- **Icône** : `Calendar`
- **Description** : Gestion administrative des bookings

### Contrats
```
http://localhost:5174/app/administration/contrats
```
- **Icône** : `FileText`
- **Description** : Gestion des contrats

### Finances
```
http://localhost:5174/app/administration/finances
```
- **Icône** : `Wallet`
- **Description** : Gestion financière (factures, paiements)

### Ventes
```
http://localhost:5174/app/administration/ventes
```
- **Icône** : `ShoppingCart`
- **Description** : Gestion des ventes (billetterie, merchandising)

---

## ⚙️ Paramètres

### Vue d'ensemble
```
http://localhost:5174/app/settings
```
- **Icône** : `Settings`
- **Description** : Paramètres généraux

### Profil
```
http://localhost:5174/app/settings/profile
```
- **Icône** : `UserRound`
- **Description** : Profil utilisateur

### Sécurité
```
http://localhost:5174/app/settings/security
```
- **Icône** : `Lock`
- **Description** : Paramètres de sécurité

### Permissions
```
http://localhost:5174/app/settings/permissions
```
- **Icône** : `Shield`
- **Description** : Gestion des permissions

---

## 🔐 Authentification

### Connexion
```
http://localhost:5174/auth/signin
```
- **Description** : Page de connexion (placeholder)

### Inscription
```
http://localhost:5174/auth/signup
```
- **Description** : Page d'inscription (placeholder)

---

## 🌍 Public

### Landing Page
```
http://localhost:5174/landing
```
- **Description** : Page d'accueil publique

---

## 📊 Récapitulatif

| Module | Nombre de pages |
|--------|----------------|
| Dashboard | 1 |
| Artistes | 2 |
| Production | 4 |
| Production → Ground | 5 |
| Production → Hospitality | 5 |
| Administration | 5 |
| Settings | 4 |
| **Total** | **26** |

## 🚀 Accès rapide

### Développement
```bash
npm run dev
# Serveur démarre sur http://localhost:5174/
```

### Production
```bash
npm run build
npm run preview
```

## 📱 Navigation

Toutes les pages sont accessibles via :
- **Sidebar** : Navigation principale
- **Topbar** : Recherche globale
- **URL directe** : Copier-coller les routes ci-dessus

---

**Dernière mise à jour** : 22 octobre 2024
**Version** : 1.0.0




