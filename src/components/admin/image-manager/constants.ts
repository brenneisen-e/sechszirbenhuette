import { CategoryOption } from './types';

export const MAX_FILE_SIZE = 15 * 1024 * 1024;
export const COMPRESSED_MAX_SIZE = 2 * 1024 * 1024;
export const MAX_WIDTH = 1920;
export const MAX_HEIGHT = 1080;
export const HASH_SIZE = 16;

export const CATEGORIES: CategoryOption[] = [
  { value: 'hero', label: 'Hero' },
  { value: 'aussen', label: 'Außen' },
  { value: 'wohnen', label: 'Wohnbereich' },
  { value: 'schlafen', label: 'Schlafzimmer' },
  { value: 'kueche', label: 'Küche' },
  { value: 'bad', label: 'Bad & Sauna' },
  { value: 'umgebung', label: 'Umgebung' },
  { value: 'sommer', label: 'Sommer' },
  { value: 'winter', label: 'Winter' },
  { value: 'extras', label: 'Extras' },
  { value: 'gastgeber', label: 'Gastgeber' },
  { value: 'galerie', label: 'Galerie' },
  { value: 'blog', label: 'Blog' },
];

export const SUMMER_ACTIVITY_NAMES = [
  'Badeseen',
  'Wandern',
  'Nordic Walking',
  'Golf',
  'Nockbike',
  'Heidialm Falkert',
];

export const WINTER_ACTIVITY_NAMES = [
  'Skigebiet Falkert',
  'Turracher Höhe',
  'Bad Kleinkirchheim',
  'Langlauf',
  'Rodeln',
  'Winterwandern',
];
