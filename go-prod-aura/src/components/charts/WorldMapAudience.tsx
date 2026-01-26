import { useState, useMemo } from "react";
import { Globe, MapPin } from "lucide-react";

type CountryData = {
  code: string;
  total: number;
  rank: number;
};

export type MapMode = "world" | "europe";
export type DataType = "listeners" | "followers" | "streams";

type Props = {
  data: CountryData[];
  maxTotal: number;
  highlightCountry?: string;
  mode?: MapMode;
  onModeChange?: (mode: MapMode) => void;
  dataType?: DataType;
  onDataTypeChange?: (type: DataType) => void;
};

// Sources pour les ecoutes (streams/listeners)
export const LISTENER_SOURCES = new Set([
  "spotify", "spotify_cities",
  "apple_music_albums", "apple_music_tracks",
  "amazon_albums", "amazon_tracks",
  "deezer_albums", "deezer_tracks",
  "itunes_albums", "itunes_tracks",
  "shazam_city_charts",
  "radio_cities", "radio_countries",
  "soundcloud"
]);

// Sources pour les followers
export const FOLLOWER_SOURCES = new Set([
  "instagram_followers", "instagram_creators",
  "tiktok_followers", "tiktok_creators", "tiktok",
  "soundcloud_followers", "soundcloud_reposts",
  "spotify_city_charts", "spotify_country_charts"
]);

// Sources pour les streams Spotify mensuels
export const STREAMS_SOURCES = new Set([
  "spotify", "spotify_cities"
]);

// Liste des pays europeens (pour filtrer les donnees)
export const EUROPEAN_COUNTRIES = new Set([
  "FR", "DE", "GB", "IT", "ES", "PT", "NL", "BE", "CH", "AT", "PL", "CZ", "SK",
  "HU", "RO", "BG", "GR", "HR", "SI", "RS", "BA", "ME", "AL", "MK", "UA", "BY", "MD", "LT",
  "LV", "EE", "FI", "SE", "NO", "DK", "IE", "IS", "LU", "TR", "CY", "RU"
]);

// Noms des pays en français (liste complete)
const COUNTRY_NAMES: Record<string, string> = {
  // Amerique du Nord
  US: "États-Unis", CA: "Canada", MX: "Mexique",
  // Amerique Centrale & Caraibes
  GT: "Guatemala", CR: "Costa Rica", PA: "Panama", CU: "Cuba",
  JM: "Jamaïque", HT: "Haïti", DO: "République Dominicaine", PR: "Porto Rico",
  // Amerique du Sud
  BR: "Brésil", AR: "Argentine", CL: "Chili", CO: "Colombie", PE: "Pérou",
  VE: "Venezuela", EC: "Équateur", BO: "Bolivie", PY: "Paraguay", UY: "Uruguay",
  // Europe de l'Ouest
  GB: "Royaume-Uni", FR: "France", DE: "Allemagne", ES: "Espagne", IT: "Italie",
  PT: "Portugal", NL: "Pays-Bas", BE: "Belgique", CH: "Suisse", AT: "Autriche",
  IE: "Irlande", LU: "Luxembourg",
  // Europe du Nord
  NO: "Norvège", SE: "Suède", DK: "Danemark", FI: "Finlande", IS: "Islande",
  EE: "Estonie", LV: "Lettonie", LT: "Lituanie",
  // Europe de l'Est
  PL: "Pologne", CZ: "Tchéquie", SK: "Slovaquie", HU: "Hongrie",
  SI: "Slovénie", HR: "Croatie", RS: "Serbie", RO: "Roumanie", BG: "Bulgarie",
  UA: "Ukraine", BY: "Biélorussie", MD: "Moldavie",
  // Balkans
  GR: "Grèce", AL: "Albanie", MK: "Macédoine du Nord",
  BA: "Bosnie-Herzégovine", ME: "Monténégro", XK: "Kosovo",
  // Russie
  RU: "Russie",
  // Moyen-Orient
  TR: "Turquie", CY: "Chypre", SY: "Syrie", LB: "Liban", IL: "Israël",
  JO: "Jordanie", IQ: "Irak", IR: "Iran", KW: "Koweït", SA: "Arabie Saoudite",
  AE: "Émirats Arabes Unis", QA: "Qatar", OM: "Oman", YE: "Yémen",
  // Afrique du Nord
  MA: "Maroc", DZ: "Algérie", TN: "Tunisie", LY: "Libye", EG: "Égypte",
  // Afrique Sub-Saharienne
  SN: "Sénégal", ML: "Mali", CI: "Côte d'Ivoire", GH: "Ghana", NG: "Nigeria",
  CM: "Cameroun", CD: "RD Congo", ET: "Éthiopie", KE: "Kenya", TZ: "Tanzanie",
  ZA: "Afrique du Sud",
  // Asie Centrale
  KZ: "Kazakhstan", UZ: "Ouzbékistan",
  // Asie du Sud
  PK: "Pakistan", IN: "Inde", NP: "Népal", BD: "Bangladesh", LK: "Sri Lanka",
  // Asie du Sud-Est
  MM: "Myanmar", TH: "Thaïlande", VN: "Vietnam", KH: "Cambodge",
  MY: "Malaisie", SG: "Singapour", ID: "Indonésie", PH: "Philippines",
  // Asie de l'Est
  MN: "Mongolie", CN: "Chine", HK: "Hong Kong", TW: "Taïwan",
  KR: "Corée du Sud", KP: "Corée du Nord", JP: "Japon",
  // Oceanie
  AU: "Australie", NZ: "Nouvelle-Zélande", PG: "Papouasie-Nouvelle-Guinée",
};

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTÈME DE PROJECTION GÉOGRAPHIQUE
// Basé sur 7 points de calibration extraits du SVG
// viewBox : 0 0 4567 3250
// ═══════════════════════════════════════════════════════════════════════════════

// 7 Points de calibration avec coordonnées géographiques réelles
const CALIBRATION_POINTS = [
  { code: "US", lat: 37.0902, lng: -95.7129, x: 926, y: 1453 },      // USA
  { code: "BR", lat: -14.235, lng: -51.9253, x: 1533, y: 2146 },     // Brésil
  { code: "FR", lat: 46.2276, lng: 2.2137, x: 2167, y: 1329 },       // France
  { code: "ZA", lat: -30.5595, lng: 22.9375, x: 2406, y: 2350 },     // Afrique du Sud
  { code: "JP", lat: 36.2048, lng: 138.2529, x: 3803, y: 1481 },     // Japon
  { code: "AU", lat: -25.2744, lng: 133.7751, x: 3743, y: 2295 },    // Australie
  { code: "IS", lat: 64.9631, lng: -19.0208, x: 1911, y: 1006 },     // Islande
];

// Coordonnées géographiques de tous les pays (lat, lng)
const COUNTRY_GEO: Record<string, { lat: number; lng: number }> = {
  // 7 Points de calibration
  US: { lat: 37.0902, lng: -95.7129 },
  BR: { lat: -14.235, lng: -51.9253 },
  FR: { lat: 46.2276, lng: 2.2137 },
  ZA: { lat: -30.5595, lng: 22.9375 },
  JP: { lat: 36.2048, lng: 138.2529 },
  AU: { lat: -25.2744, lng: 133.7751 },
  IS: { lat: 64.9631, lng: -19.0208 },
  
  // Amérique du Nord
  CA: { lat: 56.1304, lng: -106.3468 },
  MX: { lat: 23.6345, lng: -102.5528 },
  
  // Amérique Centrale & Caraïbes
  GT: { lat: 15.7835, lng: -90.2308 },
  CR: { lat: 9.7489, lng: -83.7534 },
  PA: { lat: 8.538, lng: -80.7821 },
  CU: { lat: 21.5218, lng: -77.7812 },
  JM: { lat: 18.1096, lng: -77.2975 },
  HT: { lat: 18.9712, lng: -72.2852 },
  DO: { lat: 18.7357, lng: -70.1627 },
  PR: { lat: 18.2208, lng: -66.5901 },
  
  // Amérique du Sud
  VE: { lat: 6.4238, lng: -66.5897 },
  CO: { lat: 4.5709, lng: -74.2973 },
  EC: { lat: -1.8312, lng: -78.1834 },
  PE: { lat: -9.19, lng: -75.0152 },
  BO: { lat: -16.2902, lng: -63.5887 },
  PY: { lat: -23.4425, lng: -58.4438 },
  UY: { lat: -32.5228, lng: -55.7658 },
  AR: { lat: -38.4161, lng: -63.6167 },
  CL: { lat: -35.6751, lng: -71.543 },
  
  // Europe de l'Ouest
  IE: { lat: 53.1424, lng: -7.6921 },
  GB: { lat: 55.3781, lng: -3.436 },
  PT: { lat: 39.3999, lng: -8.2245 },
  ES: { lat: 40.4637, lng: -3.7492 },
  BE: { lat: 50.5039, lng: 4.4699 },
  NL: { lat: 52.1326, lng: 5.2913 },
  LU: { lat: 49.8153, lng: 6.1296 },
  CH: { lat: 46.8182, lng: 8.2275 },
  DE: { lat: 51.1657, lng: 10.4515 },
  AT: { lat: 47.5162, lng: 14.5501 },
  IT: { lat: 41.8719, lng: 12.5674 },
  
  // Europe du Nord
  NO: { lat: 60.472, lng: 8.4689 },
  SE: { lat: 60.1282, lng: 18.6435 },
  DK: { lat: 56.2639, lng: 9.5018 },
  FI: { lat: 61.9241, lng: 25.7482 },
  EE: { lat: 58.5953, lng: 25.0136 },
  LV: { lat: 56.8796, lng: 24.6032 },
  LT: { lat: 55.1694, lng: 23.8813 },
  
  // Europe de l'Est
  PL: { lat: 51.9194, lng: 19.1451 },
  CZ: { lat: 49.8175, lng: 15.473 },
  SK: { lat: 48.669, lng: 19.699 },
  HU: { lat: 47.1625, lng: 19.5033 },
  SI: { lat: 46.1512, lng: 14.9955 },
  HR: { lat: 45.1, lng: 15.2 },
  RS: { lat: 44.0165, lng: 21.0059 },
  RO: { lat: 45.9432, lng: 24.9668 },
  BG: { lat: 42.7339, lng: 25.4858 },
  UA: { lat: 48.3794, lng: 31.1656 },
  BY: { lat: 53.7098, lng: 27.9534 },
  MD: { lat: 47.4116, lng: 28.3699 },
  
  // Balkans
  GR: { lat: 39.0742, lng: 21.8243 },
  AL: { lat: 41.1533, lng: 20.1683 },
  MK: { lat: 41.5124, lng: 21.7453 },
  
  // Russie
  RU: { lat: 61.524, lng: 105.3188 },
  
  // Moyen-Orient
  TR: { lat: 38.9637, lng: 35.2433 },
  CY: { lat: 35.1264, lng: 33.4299 },
  SY: { lat: 34.8021, lng: 38.9968 },
  LB: { lat: 33.8547, lng: 35.8623 },
  IL: { lat: 31.0461, lng: 34.8516 },
  JO: { lat: 30.5852, lng: 36.2384 },
  IQ: { lat: 33.2232, lng: 43.6793 },
  IR: { lat: 32.4279, lng: 53.688 },
  KW: { lat: 29.3117, lng: 47.4818 },
  SA: { lat: 23.8859, lng: 45.0792 },
  AE: { lat: 23.4241, lng: 53.8478 },
  QA: { lat: 25.3548, lng: 51.1839 },
  OM: { lat: 21.4735, lng: 55.9754 },
  YE: { lat: 15.5527, lng: 48.5164 },
  
  // Afrique du Nord
  MA: { lat: 31.7917, lng: -7.0926 },
  DZ: { lat: 28.0339, lng: 1.6596 },
  TN: { lat: 33.8869, lng: 9.5375 },
  LY: { lat: 26.3351, lng: 17.2283 },
  EG: { lat: 26.8206, lng: 30.8025 },
  
  // Afrique Sub-Saharienne
  SN: { lat: 14.4974, lng: -14.4524 },
  ML: { lat: 17.5707, lng: -3.9962 },
  CI: { lat: 7.54, lng: -5.5471 },
  GH: { lat: 7.9465, lng: -1.0232 },
  NG: { lat: 9.082, lng: 8.6753 },
  CM: { lat: 7.3697, lng: 12.3547 },
  CD: { lat: -4.0383, lng: 21.7587 },
  ET: { lat: 9.145, lng: 40.4897 },
  KE: { lat: -0.0236, lng: 37.9062 },
  TZ: { lat: -6.369, lng: 34.8888 },
  
  // Asie Centrale
  KZ: { lat: 48.0196, lng: 66.9237 },
  UZ: { lat: 41.3775, lng: 64.5853 },
  
  // Asie du Sud
  PK: { lat: 30.3753, lng: 69.3451 },
  IN: { lat: 20.5937, lng: 78.9629 },
  NP: { lat: 28.3949, lng: 84.124 },
  BD: { lat: 23.685, lng: 90.3563 },
  LK: { lat: 7.8731, lng: 80.7718 },
  
  // Asie du Sud-Est
  MM: { lat: 21.9162, lng: 95.956 },
  TH: { lat: 15.87, lng: 100.9925 },
  VN: { lat: 14.0583, lng: 108.2772 },
  KH: { lat: 12.5657, lng: 104.991 },
  MY: { lat: 4.2105, lng: 101.9758 },
  SG: { lat: 1.3521, lng: 103.8198 },
  ID: { lat: -0.7893, lng: 113.9213 },
  PH: { lat: 12.8797, lng: 121.774 },
  
  // Asie de l'Est
  MN: { lat: 46.8625, lng: 103.8467 },
  CN: { lat: 35.8617, lng: 104.1954 },
  HK: { lat: 22.3193, lng: 114.1694 },
  TW: { lat: 23.6978, lng: 120.9605 },
  KR: { lat: 35.9078, lng: 127.7669 },
  KP: { lat: 40.3399, lng: 127.5101 },
  
  // Océanie
  NZ: { lat: -40.9006, lng: 174.886 },
  PG: { lat: -6.315, lng: 143.9555 },
};

// Fonction de projection géographique vers SVG
// Utilise une régression linéaire basée sur les 7 points de calibration
// X dépend principalement de la longitude, Y dépend principalement de la latitude

// Calculer les coefficients de régression linéaire une seule fois
function calculateRegressionCoefficients() {
  const n = CALIBRATION_POINTS.length;
  
  // Pour X = a_lng * lng + b_lng
  let sumLng = 0, sumX = 0, sumLngX = 0, sumLng2 = 0;
  // Pour Y = a_lat * lat + b_lat
  let sumLat = 0, sumY = 0, sumLatY = 0, sumLat2 = 0;
  
  for (const p of CALIBRATION_POINTS) {
    sumLng += p.lng;
    sumX += p.x;
    sumLngX += p.lng * p.x;
    sumLng2 += p.lng * p.lng;
    
    sumLat += p.lat;
    sumY += p.y;
    sumLatY += p.lat * p.y;
    sumLat2 += p.lat * p.lat;
  }
  
  // Régression pour X en fonction de lng
  const a_lng = (n * sumLngX - sumLng * sumX) / (n * sumLng2 - sumLng * sumLng);
  const b_lng = (sumX - a_lng * sumLng) / n;
  
  // Régression pour Y en fonction de lat (inversé car lat augmente vers le nord mais Y augmente vers le bas)
  const a_lat = (n * sumLatY - sumLat * sumY) / (n * sumLat2 - sumLat * sumLat);
  const b_lat = (sumY - a_lat * sumLat) / n;
  
  return { a_lng, b_lng, a_lat, b_lat };
}

const REGRESSION = calculateRegressionCoefficients();

function geoToSvg(lat: number, lng: number): { x: number; y: number } {
  // Calcul linéaire basé sur la régression
  const x = Math.round(REGRESSION.a_lng * lng + REGRESSION.b_lng);
  const y = Math.round(REGRESSION.a_lat * lat + REGRESSION.b_lat);
  
  return { x, y };
}

// Générer les positions SVG pour tous les pays
function generateCountryPositions(): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  
  for (const [code, geo] of Object.entries(COUNTRY_GEO)) {
    positions[code] = geoToSvg(geo.lat, geo.lng);
  }
  
  return positions;
}

// Positions calculées automatiquement pour la carte du monde
const COUNTRY_POSITIONS_WORLD = generateCountryPositions();

// ═══════════════════════════════════════════════════════════════════════════════
// POSITIONS EUROPE - viewBox: 0 0 3505 2913
// Coordonnées EXACTES extraites du fichier vecteezy_grayscale-vector-europe-POINTS.svg
// Mapping vérifié visuellement avec l'image PNG de référence
// ═══════════════════════════════════════════════════════════════════════════════
const COUNTRY_POSITIONS_EUROPE: Record<string, { x: number; y: number }> = {
  // === SCANDINAVIE / NORD ===
  IS: { x: 328.723, y: 587.065 },     // Cercle 1 - ISLANDE
  NO: { x: 1707.588, y: 865.521 },    // Cercle 4 - NORVEGE
  SE: { x: 2064.435, y: 715.96 },     // Cercle 38 - SUEDE
  FI: { x: 2567.408, y: 727.859 },    // Cercle 39 - FINLANDE
  DK: { x: 1715.965, y: 1293.067 },   // Cercle 37 - DANEMARK
  
  // === ILES BRITANNIQUES ===
  IE: { x: 841.71, y: 1474.26 },      // Cercle 3 - IRLANDE
  GB: { x: 1178.858, y: 1515.916 },   // Cercle 2 - ROYAUME-UNI
  
  // === BENELUX ===
  NL: { x: 1527.807, y: 1585.055 },   // Cercle 35 - PAYS-BAS
  BE: { x: 1497.543, y: 1672.787 },   // Cercle 36 - BELGIQUE
  LU: { x: 1559.111, y: 1734.613 },   // Cercle 6 - LUXEMBOURG
  
  // === FRANCE / ALLEMAGNE / EUROPE CENTRALE ===
  // Correction basée sur feedback: FR→DE, DE→CZ, AT→SK, SI→AT
  FR: { x: 1370.825, y: 1899.864 },   // Cercle 7 - FRANCE (décalé ouest)
  DE: { x: 1771.066, y: 1637.98 },    // Cercle 5 - ALLEMAGNE (ex-FR)
  CZ: { x: 1995.336, y: 1729.772 },   // Cercle 10 - REP TCHEQUE (ex-DE)
  
  // === PENINSULE IBERIQUE ===
  PT: { x: 832.233, y: 2406.037 },    // Cercle 29 - PORTUGAL
  ES: { x: 1099.574, y: 2346.433 },   // Cercle 28 - ESPAGNE
  
  // === EUROPE CENTRALE ===
  CH: { x: 1664.455, y: 1923.987 },   // Cercle 8 - SUISSE
  AT: { x: 1983.437, y: 1884.534 },   // Cercle 9 - AUTRICHE (ex-SI)
  SK: { x: 2201.607, y: 1806.336 },   // Cercle 12 - SLOVAQUIE (ex-AT)
  HU: { x: 2206.951, y: 1914.778 },   // Cercle 13 - HONGRIE (ex-RS, plus au nord)
  PL: { x: 2209.424, y: 1562.973 },   // Cercle 11 - POLOGNE
  
  // === PAYS BALTES / EST ===
  EE: { x: 2530.502, y: 1083.43 },    // Cercle 30 - ESTONIE
  LV: { x: 2506.704, y: 1217.772 },   // Cercle 31 - LETTONIE
  LT: { x: 2440.343, y: 1352.096 },   // Cercle 32 - LITUANIE
  BY: { x: 2639.161, y: 1456.25 },    // Cercle 33 - BIELORUSSIE
  UA: { x: 2827.24, y: 1758.52 },     // Cercle 34 - UKRAINE
  RU: { x: 3100, y: 1300 },           // Interpolé - RUSSIE (partie européenne, décalé est)
  MD: { x: 2668.813, y: 1890.981 },   // Cercle 21 - MOLDAVIE
  
  // === ITALIE ===
  IT: { x: 1860.634, y: 2151.577 },   // Cercle 27 - ITALIE
  
  // === BALKANS ===
  // Correction: RS↔HU inversés, GR→MK→ME décalés vers le sud
  SI: { x: 1972.298, y: 1983.995 },   // Cercle 18 - SLOVENIE
  HR: { x: 2069.785, y: 2007.793 },   // Cercle 17 - CROATIE
  BA: { x: 2140.288, y: 2109.248 },   // Cercle 16 - BOSNIE
  RS: { x: 2282.958, y: 2121.147 },   // Cercle 14 - SERBIE (ex-HU)
  ME: { x: 2192.661, y: 2199.023 },   // Cercle 19 - MONTENEGRO (ex-MK)
  AL: { x: 2235.707, y: 2309.009 },   // Cercle 26 - ALBANIE
  MK: { x: 2317.474, y: 2266.729 },   // Cercle 15 - MACEDOINE (ex-GR)
  
  // === SUD-EST ===
  RO: { x: 2452.178, y: 1968.441 },   // Cercle 20 - ROUMANIE
  BG: { x: 2483.136, y: 2203.974 },   // Cercle 22 - BULGARIE
  GR: { x: 2343.339, y: 2400.581 },   // Cercle 25 - GRECE (le plus au sud)
  TR: { x: 2999.514, y: 2424.379 },   // Cercle 23 - TURQUIE
  CY: { x: 2896.199, y: 2665.223 },   // Cercle 24 - CHYPRE
};

export function WorldMapAudience({ 
  data, 
  maxTotal, 
  highlightCountry = "CH",
  mode: externalMode,
  onModeChange,
  dataType: externalDataType,
  onDataTypeChange
}: Props) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [internalMode, setInternalMode] = useState<MapMode>("world");
  const [internalDataType, setInternalDataType] = useState<DataType>("listeners");
  
  // Utiliser le mode externe si fourni, sinon le mode interne
  const mapMode = externalMode ?? internalMode;
  const dataType = externalDataType ?? internalDataType;
  
  const handleModeChange = (newMode: MapMode) => {
    if (onModeChange) {
      onModeChange(newMode);
    } else {
      setInternalMode(newMode);
    }
  };
  
  const handleDataTypeChange = (newType: DataType) => {
    if (onDataTypeChange) {
      onDataTypeChange(newType);
    } else {
      setInternalDataType(newType);
    }
  };
  
  // Couleurs selon le type de donnees
  const primaryColor = dataType === "listeners" ? "#10b981" : dataType === "streams" ? "#1DB954" : "#8b5cf6"; // vert, vert spotify, ou violet
  const primaryColorDark = dataType === "listeners" ? "#059669" : dataType === "streams" ? "#1aa34a" : "#7c3aed";
  const primaryColorLight = dataType === "listeners" ? "#34d399" : dataType === "streams" ? "#1ed760" : "#a78bfa";

  // Creer un map pour acces rapide (utilise les donnees deja filtrees/triees par le parent)
  const dataMap = useMemo(() => {
    const map: Record<string, CountryData> = {};
    data.forEach(d => { map[d.code] = d; });
    return map;
  }, [data]);

  // Max pour le mode actuel
  const currentMaxTotal = useMemo(() => {
    if (data.length === 0) return maxTotal;
    return Math.max(...data.map(d => d.total));
  }, [data, maxTotal]);

  // Calculer la taille du cercle basee sur le total
  const getCircleSize = (total: number, mode: MapMode) => {
    const ratio = total / currentMaxTotal;
    if (mode === "europe") {
      // Tailles pour la carte Europe (viewBox 3505x2913)
      return Math.max(30, Math.min(120, ratio * 120 + 30));
    }
    // Tailles pour la carte monde (viewBox 4567x3250)
    return Math.max(25, Math.min(150, ratio * 150 + 25));
  };

  // Positions selon le mode
  const currentPositions = mapMode === "europe" ? COUNTRY_POSITIONS_EUROPE : COUNTRY_POSITIONS_WORLD;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const hoveredData = hoveredCountry ? dataMap[hoveredCountry] : null;

  // Configuration selon le mode
  const mapConfig = {
    world: {
      viewBox: "0 0 4567 3250",
      aspectRatio: "4567 / 3250",
      imageSrc: "/worldmap.svg",
      labelSize: 40,
      strokeWidth: { normal: 6, hover: 12 },
      labelThreshold: 80,
    },
    europe: {
      viewBox: "0 0 3505 2913",
      aspectRatio: "3505 / 2913",
      imageSrc: "/europemap.svg",
      labelSize: 30,
      strokeWidth: { normal: 5, hover: 10 },
      labelThreshold: 60,
    }
  };

  const config = mapConfig[mapMode];

  return (
    <div className="relative" onMouseMove={handleMouseMove}>
      {/* Toggles: Region + Type de donnees */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mb-4">
        {/* Toggle Monde/Europe */}
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 shadow-inner">
          <button
            onClick={() => handleModeChange("world")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              mapMode === "world"
                ? "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-md"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Globe size={16} />
            Monde
          </button>
          <button
            onClick={() => handleModeChange("europe")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              mapMode === "europe"
                ? "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-md"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <MapPin size={16} />
            Europe
          </button>
        </div>
        
        {/* Toggle Ecoutes/Followers */}
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 shadow-inner">
          <button
            onClick={() => handleDataTypeChange("listeners")}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              dataType === "listeners"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-md"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            Ecoutes
          </button>
          <button
            onClick={() => handleDataTypeChange("followers")}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              dataType === "followers"
                ? "bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-md"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-violet-500"></span>
            Followers
          </button>
          <button
            onClick={() => handleDataTypeChange("streams")}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              dataType === "streams"
                ? "bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-md"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#1DB954" }}></span>
            Monthly Listeners
          </button>
        </div>
      </div>

      {/* Container avec ratio d'aspect de la carte SVG - hauteur limitee */}
      <div 
        className="relative w-full rounded-lg overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
        style={{ aspectRatio: config.aspectRatio, maxHeight: "600px" }}
      >
        {/* Image de fond - carte */}
        <img 
          src={config.imageSrc}
          alt={mapMode === "world" ? "World Map" : "Europe Map"}
          className="absolute inset-0 w-full h-full opacity-25 dark:opacity-15 dark:invert"
        />
        
        {/* Overlay SVG pour les cercles interactifs */}
        <svg 
          viewBox={config.viewBox}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Cercles des pays avec donnees */}
          {data.map((country) => {
            const pos = currentPositions[country.code];
            if (!pos) return null;
            
            const size = getCircleSize(country.total, mapMode);
            const isHighlight = country.code === highlightCountry;
            const isHovered = hoveredCountry === country.code;
            
            // Calculer l'opacite basee sur le rang (plus transparent pour voir les pays)
            const baseOpacity = Math.max(0.4, 0.7 - (country.rank / data.length) * 0.3);
            const opacity = isHovered ? 0.85 : baseOpacity;
            
            return (
              <g key={country.code}>
                {/* Cercle principal */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isHovered ? size * 1.3 : size}
                  fill={isHighlight ? "#ef4444" : primaryColor}
                  fillOpacity={opacity}
                  stroke={isHovered ? "#fff" : isHighlight ? "#dc2626" : primaryColorDark}
                  strokeWidth={isHovered ? config.strokeWidth.hover : config.strokeWidth.normal}
                  className="cursor-pointer transition-all duration-200"
                  style={{ filter: isHovered ? "drop-shadow(0 8px 16px rgba(0,0,0,0.4))" : "drop-shadow(0 4px 6px rgba(0,0,0,0.15))" }}
                  onMouseEnter={() => setHoveredCountry(country.code)}
                  onMouseLeave={() => setHoveredCountry(null)}
                />
                {/* Label pour les gros cercles */}
                {size > config.labelThreshold && !isHovered && (
                  <text
                    x={pos.x}
                    y={pos.y + (mapMode === "europe" ? 4 : 15)}
                    textAnchor="middle"
                    className="font-bold fill-white pointer-events-none"
                    style={{ fontSize: `${config.labelSize}px`, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                  >
                    {country.code}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredCountry && hoveredData && (
        <div
          className="absolute pointer-events-none z-50 bg-white dark:bg-slate-800 shadow-xl rounded-lg px-4 py-3 border border-slate-200 dark:border-slate-700 min-w-[180px]"
          style={{
            left: mousePos.x > 500 ? mousePos.x - 200 : mousePos.x + 15,
            top: Math.max(10, mousePos.y - 40),
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <img 
              src={`https://flagcdn.com/w40/${hoveredCountry.toLowerCase()}.png`}
              alt={hoveredCountry}
              className="w-6 h-auto rounded shadow"
            />
            <span className="font-bold text-slate-900 dark:text-white text-lg">
              {COUNTRY_NAMES[hoveredCountry] || hoveredCountry}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Rang:</span>
              <span className={`font-bold ${hoveredCountry === highlightCountry ? "text-red-500" : "text-slate-700 dark:text-slate-300"}`}>
                #{hoveredData.rank}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Auditeurs:</span>
              <span className="font-bold text-violet-600 dark:text-violet-400">
                {hoveredData.total.toLocaleString('de-CH')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legende */}
      <div className="absolute bottom-3 right-3 bg-white/95 dark:bg-slate-800/95 rounded-lg px-3 py-2 text-xs shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: primaryColor, opacity: 0.7 }}
            ></div>
            <span className="text-slate-600 dark:text-slate-400">
              {dataType === "listeners" ? "Ecoutes" : dataType === "streams" ? "Monthly Listeners" : "Followers"} ({data.length} pays)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" style={{ opacity: 0.7 }}></div>
            <span className="text-slate-600 dark:text-slate-400">CH</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {dataType === "listeners" 
              ? "Spotify, Apple Music, Deezer, Shazam"
              : dataType === "streams"
                ? "Spotify Monthly Listeners"
                : "Instagram, TikTok, SoundCloud"
            }
          </span>
        </div>
      </div>
    </div>
  );
}
