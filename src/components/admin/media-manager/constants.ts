// ============================================================================
// CONSTANTS
// ============================================================================

// Gallery categories that support multiple selection
export const GALLERY_CATEGORIES = ['aussen', 'wohnen', 'schlafen', 'kueche', 'bad', 'umgebung', 'extras'];

// Category configuration matching the gallery on the website
export const CATEGORIES = [
  // Haupt (nicht in Galerie)
  { value: 'hero', label: 'Hero (Startseite)', description: 'Hauptvideo/Bild auf der Startseite', supportsVideo: true, maxItems: 1, group: 'Haupt' },
  { value: 'hero-1080p', label: 'Hero Video 1080p', description: 'Full HD Qualität (1920x1080)', supportsVideo: true, maxItems: 1, group: 'Hero Videos' },
  { value: 'hero-720p', label: 'Hero Video 720p', description: 'HD Qualität (1280x720)', supportsVideo: true, maxItems: 1, group: 'Hero Videos' },
  { value: 'hero-480p', label: 'Hero Video 480p', description: 'SD Qualität (854x480)', supportsVideo: true, maxItems: 1, group: 'Hero Videos' },
  { value: 'hero-360p', label: 'Hero Video 360p', description: 'Mobil Qualität (640x360)', supportsVideo: true, maxItems: 1, group: 'Hero Videos' },
  { value: 'hero-thumbnail', label: 'Hero Vorschaubild', description: 'Standbild für Video', supportsVideo: false, maxItems: 1, group: 'Hero Videos' },
  { value: 'header', label: 'Header Hintergrund', description: 'Hintergrundbild im Header-Bereich', supportsVideo: false, maxItems: 1, group: 'Haupt' },
  // Galerie-Kategorien (wie auf Website)
  { value: 'aussen', label: 'Außenbereich', description: 'Außenansichten der Hütte', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'wohnen', label: 'Wohnbereich', description: 'Wohnzimmer, Essbereich', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'schlafen', label: 'Schlafzimmer', description: 'Schlafräume und Betten', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'kueche', label: 'Küche', description: 'Küchenbilder', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'bad', label: 'Bad & Sauna', description: 'Badezimmer, Sauna, Wellness', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'umgebung', label: 'Umgebung', description: 'Landschaft und Natur', supportsVideo: true, maxItems: null, group: 'Galerie' },
  { value: 'extras', label: 'Extras', description: 'Sonstige Ausstattung', supportsVideo: true, maxItems: null, group: 'Galerie' },
  // Ausstattungskarten (für Ferienhaus-Kacheln)
  { value: 'card-living', label: 'Karte: Wohnbereich', description: 'Bild für Ausstattungskarte Wohnen', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-kitchen', label: 'Karte: Küche', description: 'Bild für Ausstattungskarte Küche', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-rooms', label: 'Karte: Schlafzimmer', description: 'Bild für Ausstattungskarte Schlafzimmer', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-sauna', label: 'Karte: Sauna', description: 'Bild für Ausstattungskarte Sauna', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-bathroom', label: 'Karte: Bad', description: 'Bild für Ausstattungskarte Badezimmer', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-outdoor', label: 'Karte: Außenbereich', description: 'Bild für Ausstattungskarte Außen', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-equipment', label: 'Karte: Ausstattung', description: 'Bild für Ausstattungskarte Equipment', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
  { value: 'card-location', label: 'Karte: Lage', description: 'Bild für Ausstattungskarte Lage', supportsVideo: false, maxItems: 1, group: 'Ausstattungskarten' },
];

// Group categories by group
export const groupedCategories = CATEGORIES.reduce((acc, cat) => {
  if (!acc[cat.group]) acc[cat.group] = [];
  acc[cat.group].push(cat);
  return acc;
}, {} as Record<string, typeof CATEGORIES>);
