import type { PermissionActionId } from '@/types/rbac';

export interface PermissionPage {
  id: string;
  label: string;
  description?: string;
  actions?: PermissionActionId[];
  /**
   * Page Paramètres automatiquement accordée lorsque la page dispose
   * de droits d'édition (create/update).
   */
  settingsScope?: string;
}

export interface PermissionModule {
  id: string;
  label: string;
  pages: PermissionPage[];
}

export const DEFAULT_PERMISSION_ACTIONS: PermissionActionId[] = [
  'read',
  'create',
  'update',
  'delete',
];

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    pages: [
      {
        id: 'dashboard.overview',
        label: 'Vue d’ensemble',
        description: 'KPIs et widgets en page d’accueil',
        settingsScope: 'settings.general',
      },
    ],
  },
  {
    id: 'artists',
    label: 'Artistes',
    pages: [
      {
        id: 'artists.list',
        label: 'Base artistes',
        description: 'Fiches, dossiers et suivis',
        settingsScope: 'settings.artists',
      },
      {
        id: 'artists.lineup',
        label: 'Lineup',
        description: 'Programmation et ordre de passage',
        settingsScope: 'settings.artists',
      },
      {
        id: 'artists.contracts',
        label: 'Contrats artistes',
        description: 'Documents juridiques et signatures',
        settingsScope: 'settings.artists',
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    pages: [
      {
        id: 'admin.overview',
        label: 'Vue d’ensemble',
        description: 'Synthèse administrative',
        settingsScope: 'settings.admin',
      },
      {
        id: 'admin.booking',
        label: 'Booking',
        description: 'Options, offres et rétroplanning',
        settingsScope: 'settings.booking',
      },
      {
        id: 'admin.contracts',
        label: 'Contrats',
        description: 'Contrats prestataires et partenaires',
        settingsScope: 'settings.admin',
      },
      {
        id: 'admin.finances',
        label: 'Finances',
        description: 'Devis, factures, règlements',
        settingsScope: 'settings.admin',
      },
      {
        id: 'admin.sales',
        label: 'Ventes & reporting',
        description: 'Ventes billetterie, merch, etc.',
        settingsScope: 'settings.admin',
      },
    ],
  },
  {
    id: 'contacts',
    label: 'Contacts',
    pages: [
      {
        id: 'contacts.people',
        label: 'Personnes',
        description: 'Carnet d’adresses individuel',
        settingsScope: 'settings.contacts',
      },
      {
        id: 'contacts.companies',
        label: 'Entreprises',
        description: 'Fiches sociétés et correspondants',
        settingsScope: 'settings.contacts',
      },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    pages: [
      {
        id: 'production.overview',
        label: 'Vue d’ensemble',
        description: 'Synthèse production & briefs',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.timetable',
        label: 'Timetable',
        description: 'Planification horaire détaillée',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.travel',
        label: 'Travel',
        description: 'Trajets, vols et transferts',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.ground',
        label: 'Ground / transport',
        description: 'Missions chauffeurs & véhicules',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.ground.missions',
        label: 'Missions Ground',
        description: 'Planification des missions terrain',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.ground.drivers',
        label: 'Chauffeurs',
        description: 'Gestion des chauffeurs',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.ground.vehicles',
        label: 'Véhicules',
        description: 'Parc véhicules et fiches techniques',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.ground.schedules',
        label: 'Horaires Ground',
        description: 'Plannings et créneaux',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.hospitality',
        label: 'Hospitality',
        description: 'Catering, hôtels, backstage',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.hospitality.backstage',
        label: 'Backstage',
        description: 'Loges et accès backstage',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.hospitality.catering',
        label: 'Catering',
        description: 'Menus, régimes et commandes',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.hospitality.hotels',
        label: 'Hôtels',
        description: 'Réservations et rooming',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.hospitality.partycrew',
        label: 'Party Crew',
        description: 'Gestion équipes hospitality / bénévoles',
        settingsScope: 'settings.production',
      },
      {
        id: 'production.technique',
        label: 'Technique',
        description: 'Fiches techniques & équipes',
        settingsScope: 'settings.production',
      },
    ],
  },
  {
    id: 'events',
    label: 'Événements',
    pages: [
      {
        id: 'events.overview',
        label: 'Vue globale événement',
        description: 'Détails d’un événement et status',
        settingsScope: 'settings.production',
      },
      {
        id: 'events.staffing',
        label: 'Staff & bénévoles',
        description: 'Planning, affectations et suivi',
        settingsScope: 'settings.production',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Paramètres',
    pages: [
      {
        id: 'settings.profile',
        label: 'Profil utilisateur',
        description: 'Informations personnelles',
      },
      {
        id: 'settings.security',
        label: 'Sécurité',
        description: 'Mot de passe, MFA, connexions',
      },
      {
        id: 'settings.general',
        label: 'Général',
        description: 'Paramètres globaux de l’application',
      },
      {
        id: 'settings.artists',
        label: 'Paramètres Artistes',
        description: 'Champs, statuts et options artistes',
      },
      {
        id: 'settings.booking',
        label: 'Paramètres Booking',
        description: 'Workflows et options booking',
      },
      {
        id: 'settings.admin',
        label: 'Paramètres Administration',
        description: 'Budgets, devis et documents',
      },
      {
        id: 'settings.production',
        label: 'Paramètres Production',
        description: 'Référentiels missions, hospitality, etc.',
      },
      {
        id: 'settings.presse',
        label: 'Paramètres Presse',
        description: 'Champs et workflows presse',
      },
      {
        id: 'settings.contacts',
        label: 'Paramètres Contacts',
        description: 'Rôles, statuts et tags CRM',
      },
      {
        id: 'settings.staff',
        label: 'Référentiels staff',
        description: 'Roles bénévoles, statuts, etc.',
      },
      {
        id: 'settings.account',
        label: 'COMPTE',
        description: 'Gestion des autorisations et fonctions',
      },
    ],
  },
];

export function getPageActions(page: PermissionPage): PermissionActionId[] {
  return page.actions ?? DEFAULT_PERMISSION_ACTIONS;
}

export function buildPermissionKey(
  pageId: string,
  action: PermissionActionId
): string {
  return `${pageId}:${action}`;
}

export function getAllPermissionKeys(): string[] {
  const keys: string[] = [];
  PERMISSION_MODULES.forEach((module) => {
    module.pages.forEach((page) => {
      getPageActions(page).forEach((action) => {
        keys.push(buildPermissionKey(page.id, action));
      });
    });
  });
  return keys;
}




