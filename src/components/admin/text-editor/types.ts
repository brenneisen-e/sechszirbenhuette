// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface FontSizeResponsive {
  mobile: string;
  desktop: string;
}

export interface ContentText {
  id: number;
  text_key: string;
  content: string;
  font_family: string | null;
  font_size: string | null; // Can be JSON string for responsive sizes
  color: string | null;
  padding: string | null;
  section: string;
  text_type: string;
  updated_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero (Startbereich)',
  introtext: 'Einleitungstexte',
  ferienhaus: 'Ausstattung & Komfort',
  galerie: 'Galerie',
  location: 'Anfahrt & Lage',
  umgebung: 'Umgebung & Aktivitäten',
  buchung: 'Buchung & Preise',
  bewertungen: 'Bewertungen',
  footer: 'Footer',
};

export const TEXT_KEY_LABELS: Record<string, string> = {
  // Hero
  hero_title: 'Hauptüberschrift',
  hero_subtitle: 'Untertitel',
  hero_description: 'Beschreibungstext',
  // Introtext
  introtext_main_heading: 'Hauptüberschrift (Retro)',
  introtext_heading_1: 'Überschrift - Wandern & Skifahren',
  introtext_text_1: 'Text - Wandern & Skifahren',
  introtext_heading_2: 'Überschrift - Heidi Alm',
  introtext_text_2: 'Text - Heidi Alm',
  introtext_heading_3: 'Überschrift - Winterurlaub',
  introtext_text_3: 'Text - Winterurlaub',
  // Ferienhaus
  ferienhaus_title: 'Titel',
  ferienhaus_subtitle: 'Untertitel',
  ferienhaus_grundriss_title: 'Grundriss - Titel',
  ferienhaus_grundriss_description: 'Grundriss - Beschreibung',
  ferienhaus_wohnflaeche: 'Wohnfläche',
  ferienhaus_etagen: 'Etagen',
  // Galerie
  galerie_title: 'Titel',
  galerie_subtitle: 'Untertitel',
  // Location
  location_title: 'Titel',
  location_subtitle: 'Untertitel',
  location_maps_button: 'Google Maps Button',
  location_address_title: 'Adresse - Titel',
  location_directions_title: 'Anfahrt - Titel',
  location_directions_1: 'Anfahrt - Schritt 1',
  location_directions_2: 'Anfahrt - Schritt 2',
  location_directions_3: 'Anfahrt - Schritt 3',
  location_chains_warning: 'Schneeketten-Hinweis',
  location_contact_title: 'Kontakt - Titel',
  // Umgebung
  umgebung_title: 'Titel',
  umgebung_subtitle: 'Untertitel',
  // Buchung
  buchung_title: 'Titel',
  buchung_subtitle: 'Untertitel',
  buchung_preise_title: 'Preise - Titel',
  buchung_preise_base: 'Preise - Basispreis',
  buchung_nebensaison: 'Nebensaison',
  buchung_hauptsaison: 'Hauptsaison',
  buchung_mindestaufenthalt: 'Mindestaufenthalt',
  buchung_extras_title: 'Extras - Titel',
  buchung_extra_person: 'Extra - Person',
  buchung_extra_hund: 'Extra - Hund',
  buchung_extra_waesche: 'Extra - Wäsche',
  buchung_inklusive_title: 'Inklusive - Titel',
  buchung_kontakt_title: 'Kontakt - Titel',
  buchung_form_title: 'Formular - Titel',
  buchung_form_intro: 'Formular - Einleitung',
  buchung_check_button: 'Verfügbarkeit Button',
  // Bewertungen
  bewertungen_title: 'Titel',
  bewertungen_subtitle: 'Untertitel',
  // Footer
  footer_company: 'Firmenname',
  footer_description: 'Beschreibung',
  footer_contact_title: 'Kontakt - Titel',
  footer_legal_title: 'Rechtliches - Titel',
  footer_social_title: 'Social Media - Titel',
  footer_copyright: 'Copyright',
};

// Font options including GitHub fonts
export const FONT_OPTIONS = [
  { value: 'FeelingPassionate', label: 'FeelingPassionate (Handschrift)' },
  { value: 'Autography', label: 'Autography (Signatur)' },
  { value: 'BrittanySignature', label: 'Brittany Signature' },
  { value: 'RetroSignature', label: 'Retro Signature' },
  { value: 'AdleryPro', label: 'Adlery Pro' },
  { value: 'system-ui', label: 'System (Standard)' },
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Georgia', label: 'Georgia (Serif)' },
  { value: 'Arial', label: 'Arial (Sans-Serif)' },
];

export const HEADING_SIZE_OPTIONS = [
  { value: '18', label: '18px' },
  { value: '20', label: '20px' },
  { value: '22', label: '22px' },
  { value: '24', label: '24px' },
  { value: '28', label: '28px' },
  { value: '32', label: '32px' },
  { value: '36', label: '36px' },
  { value: '42', label: '42px' },
  { value: '48', label: '48px' },
  { value: '56', label: '56px' },
  { value: '64', label: '64px' },
  { value: '72', label: '72px' },
  { value: '80', label: '80px' },
  { value: '96', label: '96px' },
];

export const BODY_SIZE_OPTIONS = [
  { value: '12', label: '12px' },
  { value: '14', label: '14px' },
  { value: '16', label: '16px' },
  { value: '18', label: '18px' },
  { value: '20', label: '20px' },
  { value: '22', label: '22px' },
  { value: '24', label: '24px' },
];

export interface EditingTextValues {
  content: string;
  font_family: string;
  font_size: string;
  font_size_mobile: string;
  font_size_desktop: string;
  color: string;
  padding: string;
}
