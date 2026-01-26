# 🔧 CORRECTIONS MODULE PRODUCTION - ANALYSE COMPLÈTE

**Date** : 2025-11-14  
**Status** : CORRECTIONS CRITIQUES IDENTIFIÉES

---

## 🚨 INCOHÉRENCES CRITIQUES DÉTECTÉES

### 1. **TYPES DE STATUTS - MISSIONS** ❌ CRITIQUE

#### Problème
La documentation mentionne des statuts différents de l'implémentation :

**Documentation** :
```typescript
status: 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
```

**Implémentation actuelle** (`src/types/production.ts`) :
```typescript
export type MissionStatus = 'unplanned' | 'draft' | 'planned' | 'dispatched';
```

#### Impact
- ❌ Code dashboard utilise `'confirmed'` qui n'existe pas
- ❌ Documentation obsolète
- ❌ Confusion dans les workflows

#### ✅ Solution
**Harmoniser avec l'implémentation** - Les statuts actuels sont :
- `unplanned` : Mission non planifiée
- `draft` : Brouillon
- `planned` : Planifiée
- `dispatched` : Dispatchée (équivalent à 'ASSIGNED')

---

### 2. **TABLES MANQUANTES** ❌ CRITIQUE

#### Tables documentées mais NON créées :

| Table | Documentation | Implémentation | Impact |
|-------|---------------|----------------|--------|
| `travel_details` | ✅ Mentionnée | ❌ NON créée | Migrations échoueront |
| `bases` | ✅ Mentionnée | ❌ NON créée | Relations FK cassées |
| `waiting_time` | ✅ Mentionnée | ❌ NON créée | Calculs horaires impossibles |
| `hotel_rooms` | ✅ Structure complexe | ❌ Simplifiée | Divergence majeure |
| `hotel_room_prices` | ✅ Structure complexe | ❌ Simplifiée | Divergence majeure |
| `staff_assignments` | ✅ Mentionnée | ✅ Créée | ✅ OK |
| `vehicle_check_logs` | ✅ Créée | ✅ Créée | ✅ OK |
| `shift_drivers` | ✅ Créée | ✅ Créée | ✅ OK |

#### ✅ Solution
Ajouter ces tables manquantes dans la migration SQL

---

### 3. **FOREIGN KEYS CASSÉES** ❌ CRITIQUE

#### Problème
La table `missions` référence `bases.id` mais la table `bases` n'existe pas :

```sql
-- Dans missions
base_id UUID REFERENCES bases(id),  -- ❌ Table bases n'existe pas
```

#### ✅ Solution
Créer la table `bases` :

```sql
CREATE TABLE IF NOT EXISTS bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4. **STRUCTURE ARTIST_TOURING_PARTY** ⚠️ IMPORTANTE

#### Problème
Documentation mentionne `performance_date DATE` mais le schéma actuel ne l'a pas inclus :

**Documentation** :
```sql
performance_date DATE,
UNIQUE(event_id, artist_id, performance_date)
```

**Implémentation** :
```sql
-- Manque performance_date
UNIQUE(event_id, artist_id)
```

#### Impact
- ❌ Un artiste ne peut avoir qu'une seule entrée par événement
- ❌ Si plusieurs performances → impossible de différencier

#### ✅ Solution
Ajouter la colonne `performance_date` et modifier la contrainte UNIQUE

---

### 5. **FONCTIONS SQL MANQUANTES** ⚠️ IMPORTANTE

#### Fonctions documentées mais NON créées :

| Fonction | Documentation | Implémentation | Impact |
|----------|---------------|----------------|--------|
| `calculate_mission_start_at()` | ✅ Détaillée | ❌ NON créée | Calculs horaires manuels |
| `assign_mission_driver()` | ✅ Détaillée | ❌ NON créée | Dispatch manuel |
| `get_artist_touring_party_by_event()` | ✅ Détaillée | ❌ NON créée | Queries manuelles |
| `update_updated_at_column()` | ✅ Détaillée | ✅ Créée dans migration | ✅ OK |

#### ✅ Solution
Ajouter ces fonctions SQL dans la migration

---

### 6. **CONTRAINTES CHECK MANQUANTES** ⚠️ IMPORTANTE

#### Problème
Documentation mentionne plusieurs contraintes CHECK non implémentées :

**Manquantes** :
```sql
-- Travels : XOR artist_id ou contact_id
ALTER TABLE travels ADD CONSTRAINT chk_travels_person CHECK (
  (artist_id IS NOT NULL AND contact_id IS NULL) OR
  (artist_id IS NULL AND contact_id IS NOT NULL)
);

-- Shifts : Dates cohérentes
ALTER TABLE shifts ADD CONSTRAINT chk_shifts_dates CHECK (
  end_datetime > start_datetime
);

-- Hotel reservations : Dates cohérentes
ALTER TABLE hotel_reservations ADD CONSTRAINT chk_hotel_dates CHECK (
  check_out_date > check_in_date
);
```

#### ✅ Solution
Ajouter ces contraintes dans la migration

---

### 7. **HOTEL STRUCTURE** ⚠️ IMPORTANTE

#### Problème
La documentation décrit une structure complexe avec 4 tables :
- `hotels`
- `hotel_rooms`
- `hotel_room_prices`
- `hotel_reservations`

L'implémentation a créé seulement :
- `hotels`
- `hotel_room_types`
- `hotel_reservations`

#### Impact
- ⚠️ Structure simplifiée différente de la doc
- ⚠️ Tarification moins flexible
- ⚠️ Migration de données future complexe

#### ✅ Solution
**Option A** : Mettre à jour la documentation pour refléter la structure simple  
**Option B** : Implémenter la structure complexe  
**Recommandation** : Option A (structure simple suffit pour V1)

---

### 8. **INDEX MANQUANTS** ⚠️ PERFORMANCE

#### Problème
Certains index mentionnés dans la doc ne sont pas créés :

**Manquants** :
```sql
-- Missions
CREATE INDEX idx_missions_pickup_type ON missions(pickup_type);
CREATE INDEX idx_missions_drop_type ON missions(drop_type);

-- Travels
CREATE INDEX idx_travels_type ON travels(travel_type);

-- Catering
CREATE INDEX idx_catering_vouchers_ticket ON catering_vouchers(ticket_number);
```

#### Impact
- ⚠️ Requêtes moins performantes
- ⚠️ Scans de table complets

#### ✅ Solution
Ajouter ces index dans la migration

---

### 9. **TYPES TYPESCRIPT INCOHÉRENTS** ❌ CRITIQUE

#### Problème
Les types TypeScript créés ne matchent pas la documentation :

**Exemple 1 - MissionStatus** :
```typescript
// Documentation
'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'

// Implémentation
'unplanned' | 'draft' | 'planned' | 'dispatched'
```

**Exemple 2 - TravelType** :
```typescript
// Documentation
'PLANE' | 'TRAIN' | 'CAR' | 'VAN' | 'BUS' | 'TAXI' | 'OTHER'

// Implémentation (plus simple)
'flight' | 'train' | 'bus' | 'private_car' | 'other'
```

#### ✅ Solution
Harmoniser les types avec l'implémentation réelle

---

### 10. **RLS NON IMPLÉMENTÉ** ⚠️ SÉCURITÉ

#### Problème
Documentation mentionne :
> ⚠️ RLS désactivé sur la plupart des tables (à activer en production)

Mais **aucune** table n'a RLS activé dans la migration actuelle.

#### Impact
- 🚨 **SÉCURITÉ CRITIQUE** : Toutes les données accessibles sans filtrage
- 🚨 Pas d'isolation multitenant
- 🚨 Risque de fuite de données

#### ✅ Solution
Activer RLS sur TOUTES les tables avec policies basées sur `company_id`

---

## 📋 PLAN DE CORRECTION PROPOSÉ

### Phase 1 : Corrections Critiques (URGENT)

1. ✅ **Créer tables manquantes**
   - `bases`
   - `travel_details`
   - `waiting_time`

2. ✅ **Ajouter contraintes CHECK**
   - `travels` : XOR artist_id/contact_id
   - `shifts` : dates cohérentes
   - `hotel_reservations` : dates cohérentes

3. ✅ **Corriger types TypeScript**
   - Harmoniser avec implémentation réelle
   - Supprimer types obsolètes

4. ✅ **Ajouter colonne `performance_date`**
   - Table `artist_touring_party`
   - Modifier contrainte UNIQUE

### Phase 2 : Améliorations Performance

5. ⚠️ **Ajouter index manquants**
   - Tous les index listés dans la doc

6. ⚠️ **Créer fonctions SQL**
   - `calculate_mission_start_at()`
   - `assign_mission_driver()`
   - `get_artist_touring_party_by_event()`

### Phase 3 : Sécurité (CRITIQUE PROD)

7. 🚨 **Activer RLS**
   - Policies sur toutes les tables
   - Filtrage par `company_id`

8. 🚨 **Tester isolation**
   - Vérifier multitenant
   - Tests sécurité

### Phase 4 : Documentation

9. 📝 **Mettre à jour documentation**
   - Corriger types de statuts
   - Corriger structure tables
   - Marquer tables simplifiées

10. 📝 **Ajouter notes implémentation**
    - Différences volontaires
    - Simplifications appliquées
    - Roadmap futures évolutions

---

## 🔧 MIGRATIONS CORRECTIVES À CRÉER

### 1. `20251114_150000_add_missing_tables.sql`

```sql
-- Table bases
CREATE TABLE IF NOT EXISTS bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'CH',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bases_company ON bases(company_id);

-- Table travel_details (optionnelle, peut être fusionnée dans travels)
CREATE TABLE IF NOT EXISTS travel_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_id UUID NOT NULL REFERENCES travels(id) ON DELETE CASCADE,
  reference_number TEXT,
  departure_location TEXT,
  arrival_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_travel_details_travel ON travel_details(travel_id);

-- Table waiting_time
CREATE TABLE IF NOT EXISTS waiting_time (
  place_type VARCHAR(32) PRIMARY KEY,
  minutes SMALLINT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO waiting_time (place_type, minutes, description) VALUES
  ('airport', 45, 'Temps d''attente standard pour aéroports'),
  ('hotel', 10, 'Temps d''attente standard pour hôtels'),
  ('train_station', 15, 'Temps d''attente standard pour gares'),
  ('venue', 10, 'Temps d''attente lieu événement'),
  ('other', 10, 'Temps d''attente par défaut')
ON CONFLICT (place_type) DO NOTHING;
```

### 2. `20251114_150100_add_constraints.sql`

```sql
-- Travels : XOR artist_id ou contact_id
ALTER TABLE travels ADD CONSTRAINT chk_travels_person CHECK (
  (artist_id IS NOT NULL AND contact_id IS NULL) OR
  (artist_id IS NULL AND contact_id IS NOT NULL)
);

-- Shifts : Dates cohérentes
ALTER TABLE shifts ADD CONSTRAINT chk_shifts_dates CHECK (
  end_datetime > start_datetime
);

-- Hotel reservations : Dates cohérentes  
ALTER TABLE hotel_reservations ADD CONSTRAINT chk_hotel_dates CHECK (
  check_out_date > check_in_date
);

-- Missions : passenger_count > 0
ALTER TABLE missions ADD CONSTRAINT chk_missions_passenger_count CHECK (
  passenger_count > 0
);
```

### 3. `20251114_150200_add_performance_date.sql`

```sql
-- Ajouter performance_date à artist_touring_party
ALTER TABLE artist_touring_party 
  ADD COLUMN IF NOT EXISTS performance_date DATE;

-- Supprimer ancienne contrainte UNIQUE
DROP INDEX IF EXISTS uq_touring_party_artist_event;

-- Créer nouvelle contrainte UNIQUE avec performance_date
CREATE UNIQUE INDEX IF NOT EXISTS uq_touring_party_artist_date_event 
  ON artist_touring_party(artist_id, performance_date, event_id)
  WHERE performance_date IS NOT NULL;
```

### 4. `20251114_150300_add_indexes.sql`

```sql
-- Missions
CREATE INDEX IF NOT EXISTS idx_missions_pickup_type ON missions(pickup_type);
CREATE INDEX IF NOT EXISTS idx_missions_drop_type ON missions(drop_type);

-- Travels
CREATE INDEX IF NOT EXISTS idx_travels_type ON travels(travel_type);

-- Catering
CREATE INDEX IF NOT EXISTS idx_catering_vouchers_ticket ON catering_vouchers(ticket_number);

-- Drivers
CREATE INDEX IF NOT EXISTS idx_drivers_name ON drivers(last_name, first_name);
```

### 5. `20251114_150400_add_sql_functions.sql`

```sql
-- Fonction calcul start_at
CREATE OR REPLACE FUNCTION calculate_mission_start_at(
  p_flight_arrival TIMESTAMPTZ,
  p_base_to_pickup_duration INTEGER
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  IF p_flight_arrival IS NULL OR p_base_to_pickup_duration IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN p_flight_arrival - (p_base_to_pickup_duration || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Fonction dispatch mission
CREATE OR REPLACE FUNCTION assign_mission_driver(
  p_mission_id UUID,
  p_vehicle_id UUID,
  p_driver_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE missions 
  SET 
    vehicle_id = p_vehicle_id,
    driver_id = p_driver_id,
    status = 'dispatched',
    updated_at = NOW()
  WHERE id = p_mission_id 
    AND status IN ('draft', 'planned');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Fonction récupération touring party
CREATE OR REPLACE FUNCTION get_artist_touring_party_by_event(event_id_param UUID)
RETURNS TABLE (
  id UUID,
  event_id UUID,
  artist_id UUID,
  artist_name TEXT,
  performance_date DATE,
  group_size INTEGER,
  vehicles JSONB,
  notes TEXT,
  special_requirements TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    atp.id,
    atp.event_id,
    atp.artist_id,
    a.name as artist_name,
    atp.performance_date,
    atp.group_size,
    atp.vehicles,
    atp.notes,
    atp.special_requirements,
    atp.status,
    atp.created_at,
    atp.updated_at
  FROM artist_touring_party atp
  JOIN artists a ON atp.artist_id = a.id
  WHERE atp.event_id = event_id_param
  ORDER BY atp.performance_date, a.name;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 PRIORITÉS D'IMPLÉMENTATION

### 🔴 CRITIQUE (À faire MAINTENANT)
1. Créer tables manquantes (`bases`, `waiting_time`)
2. Ajouter contraintes CHECK
3. Corriger les types TypeScript dans le code
4. Corriger le bug dashboard (statut 'confirmed' inexistant)

### 🟡 IMPORTANT (Cette semaine)
5. Ajouter colonne `performance_date`
6. Créer fonctions SQL
7. Ajouter index manquants

### 🟢 AMÉLIORATION (Prochaine sprint)
8. Activer RLS (avant production !)
9. Mettre à jour documentation
10. Tests sécurité multitenant

---

## 📝 MODIFICATIONS DOCUMENTATION

### Fichiers à corriger :

1. **PRODUCTION_SYSTEM_RELATIONS.md**
   - ✅ Corriger MissionStatus
   - ✅ Marquer `hotel_rooms` comme simplifié
   - ✅ Ajouter note sur `travel_details` (optionnel)

2. **PRODUCTION_SYSTEM_ARCHITECTURE.md**
   - ✅ Corriger statuts missions
   - ✅ Mettre à jour structure hotels

3. **PRODUCTION_SYSTEM_WORKFLOW.md**
   - ✅ Corriger workflows dispatch (status 'dispatched' pas 'ASSIGNED')

4. **PRODUCTION_INDEX.md**
   - ✅ Mettre à jour gestion des statuts

---

## ✅ CONCLUSION

**Total incohérences détectées** : 10 majeures

**Corrections critiques** : 4  
**Corrections importantes** : 4  
**Améliorations** : 2  

**Temps estimé corrections** :
- Critiques : 2-3 heures
- Importantes : 4-5 heures
- Améliorations : 8-10 heures
- **TOTAL** : ~15-18 heures

**Risque si non corrigé** :
- 🚨 **CRITIQUE** : Application ne fonctionnera pas correctement
- 🚨 **SÉCURITÉ** : Fuite de données multitenant
- ⚠️ **PERFORMANCE** : Requêtes lentes
- ⚠️ **MAINTENANCE** : Documentation obsolète

**Recommandation** : **Appliquer PHASE 1 immédiatement avant tout test utilisateur**

---

**Rapport généré le** : 2025-11-14  
**Par** : Analyse automatique IA





