import { createContext, useContext, useState, useEffect, type ReactNode, type ReactElement } from "react";

type Lang = "fr" | "en" | "de";
type Dict = Record<Lang, Record<string, string>>;

const dict: Dict = {
  fr: {
    search_placeholder: "Rechercher artistes, bookings, projets…",
    sign_out: "Déconnexion",
    profile: "Mon profil",
    security: "Sécurité",
    permissions: "Compte",
    notifications: "Notifications",
    see_all: "Voir tout",
    all: "Toutes",
    unread: "Non lues",
    admin_only: "Réservé aux administrateurs",
    language: "Langue",
    // Sections principales
    dashboard: "Dashboard",
    artists: "Artistes",
    administration: "Administration",
    production: "Production",
    press: "Presse",
    contacts: "Contacts",
    staff: "Staff",
    settings: "Paramètres",
    // Artistes
    list: "Liste",
    lineup: "Lineup",
    // Common
    search: "Rechercher",
    loading: "Chargement...",
    previous: "Précédent",
    next: "Suivant",
    of: "sur",
    showing: "Affichage de",
    // Artists page
    "artists.title": "Artistes",
    "artists.addArtist": "Ajouter un artiste",
    "artists.artist": "Artiste",
    "artists.status": "Statut",
    "artists.followers": "Abonnés",
    "artists.noArtists": "Aucun artiste trouvé",
    "artists.addFirst": "Ajoutez votre premier artiste pour commencer",
    "artists.total": "total",
    // Administration
    booking: "Booking",
    artistic_budget: "Budget artistique",
    contracts: "Contrats",
    finances: "Finances",
    sales: "Ventes",
    // Production
    touring_party: "Touring Party",
    travel: "Travel",
    ground: "Ground",
    hospitality: "Hospitality",
    technique: "Technique",
    timetable: "Timetable",
    party_crew: "Party Crew",
    missions: "Missions",
    drivers: "Chauffeurs",
    vehicles: "Véhicules",
    schedules: "Horaires",
    backstage: "Backstage",
    catering: "Catering",
    hotels: "Hôtels",
    // Contacts
    people: "Personnes",
    companies: "Entreprises",
    // Settings
    overview: "Vue d'ensemble",
  },
  en: {
    search_placeholder: "Search artists, bookings, projects…",
    sign_out: "Sign out",
    profile: "My profile",
    security: "Security",
    permissions: "Account",
    notifications: "Notifications",
    see_all: "See all",
    all: "All",
    unread: "Unread",
    admin_only: "Admin only",
    language: "Language",
    // Main sections
    dashboard: "Dashboard",
    artists: "Artists",
    administration: "Administration",
    production: "Production",
    press: "Press",
    contacts: "Contacts",
    staff: "Staff",
    settings: "Settings",
    // Artists
    list: "List",
    lineup: "Lineup",
    // Common
    search: "Search",
    loading: "Loading...",
    previous: "Previous",
    next: "Next",
    of: "of",
    showing: "Showing",
    // Artists page
    "artists.title": "Artists",
    "artists.addArtist": "Add Artist",
    "artists.artist": "Artist",
    "artists.status": "Status",
    "artists.followers": "Followers",
    "artists.noArtists": "No artists found",
    "artists.addFirst": "Add your first artist to get started",
    "artists.total": "total",
    // Administration
    booking: "Booking",
    artistic_budget: "Artistic Budget",
    contracts: "Contracts",
    finances: "Finances",
    sales: "Sales",
    // Production
    touring_party: "Touring Party",
    travel: "Travel",
    ground: "Ground",
    hospitality: "Hospitality",
    technique: "Technical",
    timetable: "Timetable",
    party_crew: "Party Crew",
    missions: "Missions",
    drivers: "Drivers",
    vehicles: "Vehicles",
    schedules: "Schedules",
    backstage: "Backstage",
    catering: "Catering",
    hotels: "Hotels",
    // Contacts
    people: "People",
    companies: "Companies",
    // Settings
    overview: "Overview",
  },
  de: {
    search_placeholder: "Suche nach Artists, Bookings, Projekten…",
    sign_out: "Abmelden",
    profile: "Mein Profil",
    security: "Sicherheit",
    permissions: "Konto",
    notifications: "Benachrichtigungen",
    see_all: "Alle anzeigen",
    all: "Alle",
    unread: "Ungelesen",
    admin_only: "Nur Admin",
    language: "Sprache",
    // Hauptbereiche
    dashboard: "Dashboard",
    artists: "Künstler",
    administration: "Verwaltung",
    production: "Produktion",
    press: "Presse",
    contacts: "Kontakte",
    staff: "Personal",
    settings: "Einstellungen",
    // Künstler
    list: "Liste",
    lineup: "Lineup",
    // Common
    search: "Suchen",
    loading: "Laden...",
    previous: "Zurück",
    next: "Weiter",
    of: "von",
    showing: "Anzeige von",
    // Artists page
    "artists.title": "Künstler",
    "artists.addArtist": "Künstler hinzufügen",
    "artists.artist": "Künstler",
    "artists.status": "Status",
    "artists.followers": "Follower",
    "artists.noArtists": "Keine Künstler gefunden",
    "artists.addFirst": "Fügen Sie Ihren ersten Künstler hinzu",
    "artists.total": "gesamt",
    // Verwaltung
    booking: "Booking",
    artistic_budget: "Künstlerbudget",
    contracts: "Verträge",
    finances: "Finanzen",
    sales: "Verkäufe",
    // Produktion
    touring_party: "Touring Party",
    travel: "Reise",
    ground: "Ground",
    hospitality: "Hospitality",
    technique: "Technik",
    timetable: "Zeitplan",
    party_crew: "Party Crew",
    missions: "Missionen",
    drivers: "Fahrer",
    vehicles: "Fahrzeuge",
    schedules: "Zeitpläne",
    backstage: "Backstage",
    catering: "Catering",
    hotels: "Hotels",
    // Kontakte
    people: "Personen",
    companies: "Unternehmen",
    // Einstellungen
    overview: "Übersicht",
  },
};

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "fr",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }): ReactElement {
  const [lang, setLangState] = useState<Lang>(() => {
    // Safe localStorage access
    try {
      const saved = localStorage.getItem("lang");
      if (saved && ["fr", "en", "de"].includes(saved)) {
        return saved as Lang;
      }
    } catch (e) {
      console.warn("Failed to load language from localStorage:", e);
    }
    return "fr";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch (e) {
      console.warn("Failed to save language to localStorage:", e);
    }
    document.documentElement.setAttribute("lang", l);
  };

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const t = (key: string) => dict[lang]?.[key] ?? key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export type { Lang };

